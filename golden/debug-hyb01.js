import { loadEnvConfig } from "@next/env";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnvConfig(join(__dirname, "..", "apps/web"));

async function main() {
  const { orchestrate } = await import("../apps/web/src/core/pipeline/orchestrator.ts");
  
  const start = Date.now();
  const r = await orchestrate({
    message: "Hoka grew 52% year on year according to the deep dive. What was Hoka's actual revenue in the document and how many Hoka Clifton 9 pairs were sold according to BigQuery?"
  });
  const elapsed = Date.now() - start;
  
  console.log("=== ELAPSED ===", elapsed, "ms");
  console.log("=== REPLY ===");
  console.log(r.reply || "(empty)");
  console.log("=== CITATIONS ===");
  for (const c of r.citations) {
    console.log("Type:", c.type, "| Source:", c.sourceId, "| Label:", c.label);
    if (c.excerpt) console.log("Excerpt:", c.excerpt.substring(0, 250));
    console.log("---");
  }
  
  // Now let's also test the SQL generator directly
  console.log("\n=== TESTING SQL GENERATOR ===");
  try {
    const { executeBqQuestion } = await import("../apps/web/src/server/services/bigqueryService.ts");
    const bqResult = await executeBqQuestion("How many Hoka Clifton 9 pairs were sold?");
    console.log("SQL:", bqResult.sql);
    console.log("Rows:", JSON.stringify(bqResult.results.rows));
  } catch (err) {
    console.log("SQL generator error:", err.message);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
