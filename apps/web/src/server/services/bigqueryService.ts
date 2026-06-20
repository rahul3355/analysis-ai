import { BigQuery } from "@google-cloud/bigquery";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { executeQuery, BigQueryResult } from "@/server/clients/bigqueryClient";
import { getBigQueryConfig, BQ_DATASET_ID } from "@/server/config/bigquery";
import { embed } from "@/server/clients/embeddingClient";
import { ServiceError } from "@/server/services/chatService";
import { ALL_TABLE_NAMES, formatBqContext, validateSql } from "./bigqueryHelpers";
import { selectTablesSemantic, retrieveGoldenExamples } from "./bigquerySemantic";
import { llmGenerateSql } from "./bigquerySqlGenerator";
import { getCachedSql, addCachedSql } from "./semanticCache";

export { ALL_TABLE_NAMES, buildSchemaDescription, injectAllowedValues, validateSql, formatBqContext } from "./bigqueryHelpers";
export { selectTablesSemantic, retrieveGoldenExamples } from "./bigquerySemantic";

const cachePath = join(process.cwd(), "schema-cache.json");
let cachedLiveSchemas: Map<string, { name: string; type: string }[]> | null = null;

export async function fetchLiveSchemas(): Promise<Map<string, { name: string; type: string }[]>> {
  if (cachedLiveSchemas) return cachedLiveSchemas;

  if (existsSync(cachePath)) {
    try {
      const cacheContent = readFileSync(cachePath, "utf-8");
      const parsed = JSON.parse(cacheContent) as Record<string, { name: string; type: string }[]>;
      cachedLiveSchemas = new Map(Object.entries(parsed));
      console.log(`[schema-cache] Loaded schemas from cache in 0ms`);
      return cachedLiveSchemas;
    } catch (err) {
      console.warn("[schema-cache] Failed to read schema cache file:", err);
    }
  }

  const config = getBigQueryConfig();
  const bq = process.env.BQ_KEY_CONTENT
    ? new BigQuery({ projectId: config.projectId, credentials: JSON.parse(process.env.BQ_KEY_CONTENT) })
    : new BigQuery({ projectId: config.projectId, keyFilename: config.keyFile });
  const live = new Map<string, { name: string; type: string }[]>();

  const fetchTable = async (tableName: string): Promise<[string, { name: string; type: string }[]]> => {
    try {
      const [meta] = await bq.dataset(BQ_DATASET_ID).table(tableName).getMetadata();
      const fields = (meta.schema?.fields ?? []) as Array<{ name: string; type: string }>;
      return [tableName, fields.map((f) => ({ name: f.name, type: f.type }))];
    } catch {
      return [tableName, []];
    }
  };

  const results = await Promise.all(ALL_TABLE_NAMES.map(fetchTable));
  for (const [tableName, fields] of results) {
    live.set(tableName, fields);
  }

  try {
    const obj = Object.fromEntries(live.entries());
    writeFileSync(cachePath, JSON.stringify(obj, null, 2), "utf-8");
  } catch (err) {
    console.warn("[schema-cache] Failed to write schema cache file:", err);
  }

  cachedLiveSchemas = live;
  return live;
}

export async function generateSql(question: string, tables: string[]): Promise<string> {
  const [liveSchemas, goldenExamples] = await Promise.all([
    fetchLiveSchemas(),
    retrieveGoldenExamples(question),
  ]);
  return llmGenerateSql(question, tables, liveSchemas, goldenExamples);
}

export async function executeBqQuestion(
  question: string,
  queryEmbedding?: number[]
): Promise<{ sql: string; results: BigQueryResult; context: string }> {
  const embedding = queryEmbedding || (await embed([question]))[0];

  try {
    const cachedSql = await getCachedSql(embedding);
    if (cachedSql) {
      console.log(`[semantic-cache] Hit! Reusing SQL: ${cachedSql}`);
      const results = await executeQuery(cachedSql);
      const context = formatBqContext(results);
      return { sql: cachedSql, results, context };
    }
  } catch (err) {
    console.warn("[semantic-cache] Failed executing cached SQL, generating new SQL:", err);
  }

  const [tables, goldenExamples] = await Promise.all([
    selectTablesSemantic(question, embedding),
    retrieveGoldenExamples(question, embedding),
  ]);

  const maxRetries = 3;
  const liveSchemas = await fetchLiveSchemas();

  const models = ["cohere/north-mini-code:free", "deepseek/deepseek-v4-flash"];
  let lastError = "";

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      let sql = "";
      try {
        sql = await llmGenerateSql(question, tables, liveSchemas, goldenExamples, attempt > 1 ? lastError : undefined, model);
      } catch (err) {
        lastError = `SQL gen failed with ${model}: ${err instanceof Error ? err.message : String(err)}`;
        if (model === models[models.length - 1] && attempt === 2) {
          throw new ServiceError("BQ_ERROR", lastError, 502);
        }
        continue;
      }
      validateSql(sql);
      console.log(`[BigQuery] [${model}] Attempt ${attempt}:`, sql.substring(0, 120));

      try {
        const results = await executeQuery(sql);
        const context = formatBqContext(results);
        await addCachedSql(question, embedding, sql);
        return { sql, results, context };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.log(`[BigQuery] [${model}] Attempt ${attempt} failed: ${lastError.substring(0, 100)}`);
      }
    }
  }

  throw new ServiceError("BQ_ERROR", `SQL generation failed: all models exhausted. Last error: ${lastError}`, 502);
}
