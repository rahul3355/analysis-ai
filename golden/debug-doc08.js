import { loadEnvConfig } from "@next/env";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync, writeFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnvConfig(join(__dirname, "..", "apps/web"));

async function main() {
  const { orchestrate } = await import("../apps/web/src/core/pipeline/orchestrator.ts");
  
  const r = await orchestrate({
    message: "What are the target average order value (AOV) and conversion rate for the online channel in the sales plan?"
  });
  
  const output = {
    reply: r.reply,
    citations: r.citations.map(c => ({
      type: c.type,
      sourceId: c.sourceId,
      label: c.label,
      excerpt: (c.excerpt || "").substring(0, 400),
      documentName: c.documentName,
    }))
  };
  
  console.log(JSON.stringify(output, null, 2));
  
  // Also check the semantic cache for what SQL was stored
  const { getCachedSql, addCachedSql } = await import("../apps/web/src/server/services/semanticCache.ts");
  const { embed } = await import("../apps/web/src/server/clients/embeddingClient.ts");
  const emb = await embed(["What are the target average order value (AOV) and conversion rate for the online channel in the sales plan?"]);
  const cached = await getCachedSql(emb[0]);
  console.log("\n=== SEMANTIC CACHE HIT ===");
  console.log(cached || "(miss)");
}

main().catch(e => { console.error(e); process.exit(1); });
