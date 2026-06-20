import { Pinecone } from "@pinecone-database/pinecone";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv(filepath: string): Record<string, string> {
  const content = readFileSync(filepath, "utf-8");
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    env[trimmed.substring(0, eqIdx).trim()] = trimmed.substring(eqIdx + 1).trim();
  }
  return env;
}

const env = loadEnv(resolve(__dirname, "../apps/web/.env.local"));
const INDEX_NAME = env.PINECONE_INDEX_NAME || "analysis-ai";
const INDEX_HOST = env.PINECONE_INDEX_HOST!;
const API_KEY = env.PINECONE_API_KEY!;
const DIMS = Number(env.EMBEDDING_DIMENSIONS) || 1536;
const NAMESPACE = "intent-routing-cache";

async function main() {
  console.log(`Connecting to Pinecone index "${INDEX_NAME}"...`);
  const pc = new Pinecone({ apiKey: API_KEY });
  const index = pc.index({ name: INDEX_NAME, host: INDEX_HOST });

  // 1. Index stats
  const stats = await index.describeIndexStats();
  console.log("\n=== Index Stats ===");
  console.log(`  Total vectors: ${stats.totalRecordCount}`);
  console.log(`  Total namespaces: ${Object.keys(stats.namespaces ?? {}).length}`);
  for (const [ns, info] of Object.entries(stats.namespaces ?? {})) {
    console.log(`  Namespace "${ns}": ${info.recordCount ?? 0} vectors`);
  }

  // 2. Check cache namespace
  const nsStats = stats.namespaces?.[NAMESPACE];
  if (!nsStats || (nsStats.recordCount ?? 0) === 0) {
    console.log(`\nNamespace "${NAMESPACE}" is empty. No cached intents.`);
    return;
  }

  const count = nsStats.recordCount!;
  console.log(`\n=== Namespace "${NAMESPACE}" has ${count} vectors ===`);

  // 3. Query to see what's in the cache
  // Pinecone doesn't list vectors, so we query with a near-zero vector
  // and high topK to try to see most of them
  const target = index.namespace(NAMESPACE);
  const queryVector = new Array(DIMS).fill(0);
  queryVector[0] = 0.0001; // Tiny non-zero to avoid potential edge cases

  console.log(`\nQuerying cache namespace (topK=${Math.min(count, 50)})...`);
  const result = await target.query({
    vector: queryVector,
    topK: Math.min(count, 50),
    includeMetadata: true,
    includeValues: false,
  });

  const matches = result.matches ?? [];
  console.log(`Returned ${matches.length} matches\n`);

  // Sort by intent for readability
  const sorted = [...matches].sort((a, b) => {
    const intentA = (a.metadata as any)?.intent ?? "";
    const intentB = (b.metadata as any)?.intent ?? "";
    return intentA.localeCompare(intentB) || (b.score ?? 0) - (a.score ?? 0);
  });

  for (const m of sorted) {
    const meta = m.metadata as Record<string, any> | undefined;
    const text = meta?.chunkText ?? "";
    const intent = meta?.intent ?? "N/A";
    const cachedAt = meta?.cachedAt ?? "";
    console.log(`[${intent}] (score: ${(m.score ?? 0).toFixed(4)}) id=${m.id}`);
    console.log(`  Q: ${text.substring(0, 150)}`);
    console.log(`  Cached: ${cachedAt}`);
    console.log();
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
