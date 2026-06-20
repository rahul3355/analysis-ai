import { BigQuery } from "@google-cloud/bigquery";
import { getBigQueryConfig } from "@/server/config/bigquery";

export interface BigQueryResult {
  rows: Record<string, unknown>[];
  schema: { name: string; type: string }[];
  rowCount: number;
  executedQuery: string;
  latencyMs: number;
}

const MAX_RESULTS = 1000;

let cachedClient: BigQuery | null = null;

function createBqClient(): BigQuery {
  const config = getBigQueryConfig();

  if (process.env.BQ_KEY_CONTENT) {
    return new BigQuery({
      projectId: config.projectId,
      credentials: JSON.parse(process.env.BQ_KEY_CONTENT),
    });
  }

  if (config.keyFile) {
    return new BigQuery({
      projectId: config.projectId,
      keyFilename: config.keyFile,
    });
  }

  throw new Error("BigQuery credentials not configured. Set BQ_KEY_CONTENT or BQ_KEY_FILE.");
}

function getClient(): BigQuery {
  if (cachedClient) return cachedClient;
  cachedClient = createBqClient();
  return cachedClient;
}

export async function executeQuery(sql: string): Promise<BigQueryResult> {
  const client = getClient();
  const startTime = Date.now();

  const [rows] = await client.query({ query: sql, maxResults: MAX_RESULTS });
  const rawRows = rows as Record<string, unknown>[];

  const elapsed = Date.now() - startTime;

  const schema = rawRows.length > 0
    ? Object.keys(rawRows[0]).map((name) => ({ name, type: typeof rawRows[0][name] }))
    : [];

  return {
    rows: rawRows,
    schema,
    rowCount: rawRows.length,
    executedQuery: sql,
    latencyMs: elapsed,
  };
}
