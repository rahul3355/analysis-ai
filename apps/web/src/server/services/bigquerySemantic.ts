import { getPineconeClient, getIndexConfig } from "@/server/config/pinecone";
import { embed } from "@/server/clients/embeddingClient";
import { BQ_TABLE_SCHEMAS } from "@/server/config/bigquery";
import { ALL_TABLE_NAMES, buildSchemaDescription } from "./bigqueryHelpers";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const SCHEMA_NS = "bq-schemas";
const GOLDEN_NS = "golden-queries";

let schemaIndexed = false;
let goldenIndexed = false;
let schemaIndexing = false;
let goldenIndexing = false;

async function ensureSchemaIndex(): Promise<void> {
  if (!process.env.PINECONE_API_KEY) return;
  if (schemaIndexed || schemaIndexing) return;
  schemaIndexing = true;
  try {
    const pc = getPineconeClient();
    const { host, indexName } = getIndexConfig();
    const index = pc.index({ name: indexName, host });
    const stats = await index.describeIndexStats();
    const nsStats = stats.namespaces?.[SCHEMA_NS];
    if (nsStats && nsStats.recordCount && nsStats.recordCount >= 6) {
      schemaIndexed = true;
      schemaIndexing = false;
      return;
    }
    const descriptions = BQ_TABLE_SCHEMAS.map((t) => buildSchemaDescription(t));
    const embeddings = await embed(descriptions);
    await index.namespace(SCHEMA_NS).upsert({
      records: descriptions.map((desc, i) => ({
        id: `schema-${BQ_TABLE_SCHEMAS[i].table}`,
        values: embeddings[i],
        metadata: { tableName: BQ_TABLE_SCHEMAS[i].table, description: desc.slice(0, 500) },
      })),
    });
    schemaIndexed = true;
  } catch (err) {
    console.warn("[schema] Indexing failed:", err instanceof Error ? err.message : String(err));
    schemaIndexed = true;
  } finally {
    schemaIndexing = false;
  }
}

async function ensureGoldenIndex(): Promise<void> {
  if (!process.env.PINECONE_API_KEY) return;
  if (goldenIndexed || goldenIndexing) return;
  goldenIndexing = true;
  const queries = loadGoldenQueries();
  if (queries.length === 0) { goldenIndexed = true; return; }
  try {
    const pc = getPineconeClient();
    const { host, indexName } = getIndexConfig();
    const index = pc.index({ name: indexName, host });
    const stats = await index.describeIndexStats();
    const nsStats = stats.namespaces?.[GOLDEN_NS];
    if (nsStats && nsStats.recordCount && nsStats.recordCount >= queries.length) {
      goldenIndexed = true;
      goldenIndexing = false;
      return;
    }
    const questions = queries.map((q) => q.question);
    const embeddings = await embed(questions);
    await index.namespace(GOLDEN_NS).upsert({
      records: queries.map((q, i) => ({
        id: q.id,
        values: embeddings[i],
        metadata: { question: q.question, sql: q.sql.slice(0, 500) },
      })),
    });
    goldenIndexed = true;
  } catch (err) {
    console.warn("[golden] Indexing failed:", err instanceof Error ? err.message : String(err));
    goldenIndexed = true;
  } finally {
    goldenIndexing = false;
  }
}

export async function selectTablesSemantic(question: string, queryEmbedding?: number[]): Promise<string[]> {
  await ensureSchemaIndex();
  if (!schemaIndexed) return ALL_TABLE_NAMES;
  try {
    const pc = getPineconeClient();
    const { host, indexName } = getIndexConfig();
    const index = pc.index({ name: indexName, host });
    const queryEmb = queryEmbedding || (await embed([question]))[0];
    const result = await index.namespace(SCHEMA_NS).query({
      vector: queryEmb,
      topK: 3,
      includeMetadata: true,
    });
    const tables = (result.matches ?? [])
      .filter((m) => (m.score ?? 0) > 0.3)
      .map((m) => (m.metadata as { tableName?: string })?.tableName ?? "")
      .filter(Boolean);
    return tables.length > 0 ? tables : ALL_TABLE_NAMES;
  } catch {
    return ALL_TABLE_NAMES;
  }
}

interface GoldenQuery {
  id: string;
  question: string;
  sql: string;
}

let goldenQueries: GoldenQuery[] = [];

function loadGoldenQueries(): GoldenQuery[] {
  if (goldenQueries.length > 0) return goldenQueries;
  const candidates = [
    join(process.cwd(), "golden", "golden-queries.json"),
    join(process.cwd(), "..", "golden", "golden-queries.json"),
    join(process.cwd(), "..", "..", "golden", "golden-queries.json"),
  ];
  const path = candidates.find((p) => existsSync(p)) || candidates[0];
  if (!existsSync(path)) return [];
  try {
    goldenQueries = JSON.parse(readFileSync(path, "utf-8"));
  } catch (err) {
    console.error("[golden] Failed to load golden queries:", err);
  }
  return goldenQueries;
}

export async function retrieveGoldenExamples(question: string, queryEmbedding?: number[]): Promise<string> {
  await ensureGoldenIndex();
  if (!goldenIndexed) return "";
  try {
    const pc = getPineconeClient();
    const { host, indexName } = getIndexConfig();
    const index = pc.index({ name: indexName, host });
    const queryEmb = queryEmbedding || (await embed([question]))[0];
    const result = await index.namespace(GOLDEN_NS).query({
      vector: queryEmb,
      topK: 2,
      includeMetadata: true,
    });
    const matches = (result.matches ?? []).filter((m) => (m.score ?? 0) > 0.4);
    if (matches.length === 0) return "";
    return matches.map((m) => {
      const meta = m.metadata as { question?: string; sql?: string };
      return `-- Example for: ${meta.question ?? "?"}\n${meta.sql ?? ""}`;
    }).join("\n\n");
  } catch {
    return "";
  }
}
