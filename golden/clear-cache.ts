import { Pinecone } from "@pinecone-database/pinecone";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

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

const env = loadEnv(resolve("apps/web/.env.local"));
const INDEX_NAME = env.PINECONE_INDEX_NAME || "analysis-ai";
const INDEX_HOST = env.PINECONE_INDEX_HOST!;
const API_KEY = env.PINECONE_API_KEY!;
const DIMS = Number(env.EMBEDDING_DIMENSIONS) || 1536;
const NAMESPACE = "intent-routing-cache";

async function main() {
  const action = process.argv[2] || "list";
  const pc = new Pinecone({ apiKey: API_KEY });
  const index = pc.index({ name: INDEX_NAME, host: INDEX_HOST });
  const target = index.namespace(NAMESPACE);

  const stats = await index.describeIndexStats();
  const nsStats = stats.namespaces?.[NAMESPACE];
  const count = nsStats?.recordCount ?? 0;
  console.log(`Namespace "${NAMESPACE}": ${count} vectors`);

  // ── LIST all cached entries ────────────────────────────────────────
  if (action === "list") {
    const queryVector = new Array(DIMS).fill(0);
    queryVector[0] = 0.0001;
    const result = await target.query({
      vector: queryVector,
      topK: Math.min(count, 200),
      includeMetadata: true,
      includeValues: false,
    });
    console.log(`\nCached entries (${result.matches?.length ?? 0} returned):\n`);
    for (const m of result.matches ?? []) {
      const meta = m.metadata as Record<string, any> | undefined;
      const intent = meta?.intent ?? "?";
      const text = (meta?.chunkText ?? "").substring(0, 120);
      console.log(`  [${intent}] ${text}`);
    }

    // Summary
    const breakdown: Record<string, number> = {};
    for (const m of result.matches ?? []) {
      const i = (m.metadata as any)?.intent ?? "unknown";
      breakdown[i] = (breakdown[i] ?? 0) + 1;
    }
    console.log("\nBreakdown by intent:");
    for (const [intent, c] of Object.entries(breakdown)) {
      console.log(`  ${intent}: ${c}`);
    }
  }

  // ── CLEAR the entire cache namespace ───────────────────────────────
  else if (action === "clear") {
    console.log(`\nDeleting ALL vectors in "${NAMESPACE}"...`);
    await target.deleteAll();
    console.log("Done. Verifying...");
    const s2 = await index.describeIndexStats();
    const remaining = s2.namespaces?.[NAMESPACE]?.recordCount ?? 0;
    console.log(`Remaining vectors: ${remaining}`);
  }

  // ── DELETE by intent type ──────────────────────────────────────────
  else if (action === "delete-intent") {
    const targetIntent = process.argv[3]?.toUpperCase();
    if (!["DATABASE", "DOCUMENT", "HYBRID", "UNKNOWN"].includes(targetIntent)) {
      console.error("Usage: npx tsx golden/clear-cache.ts delete-intent <DATABASE|DOCUMENT|HYBRID|UNKNOWN>");
      process.exit(1);
    }
    console.log(`Deleting all "${targetIntent}" cached intents...`);
    await target.deleteMany({ filter: { intent: { "$eq": targetIntent } } });
    console.log("Done. Verifying...");
    const s2 = await index.describeIndexStats();
    const remaining = s2.namespaces?.[NAMESPACE]?.recordCount ?? 0;
    console.log(`Remaining vectors: ${remaining}`);
  }

  // ── DELETE by specific vector IDs ──────────────────────────────────
  else if (action === "delete-ids") {
    const ids = process.argv.slice(3);
    if (ids.length === 0) {
      console.error("Usage: npx tsx golden/clear-cache.ts delete-ids <id1> <id2> ...");
      process.exit(1);
    }
    console.log(`Deleting ${ids.length} specific vectors...`);
    await target.deleteMany({ ids });
    console.log("Done.");
  }

  // ── RESET: clear all + re-seed only the correct HYBRIDs ────────────
  else if (action === "reset") {
    console.log("\n=== INTENT CACHE RESET ===");
    console.log("Clearing entire intent-routing-cache namespace...");
    await target.deleteAll();
    const s2 = await index.describeIndexStats();
    console.log(`Confirmed: ${s2.namespaces?.[NAMESPACE]?.recordCount ?? 0} vectors remaining`);
    console.log("\nRecommendation: Re-run the golden-100 test suite to rebuild the cache with correct classifications.");
  }

  else {
    console.log(`
Usage: npx tsx golden/clear-cache.ts <command>

Commands:
  list                       List all cached intents (metadata only)
  clear                      DELETE ALL vectors in intent-routing-cache
  delete-intent <TYPE>       Delete vectors with specific intent type
  delete-ids <id1> <id2>...  Delete specific vectors by ID
  reset                      Clear entire cache (safe to run)
`);
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
