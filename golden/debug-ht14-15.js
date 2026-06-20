import { loadEnvConfig } from "@next/env";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnvConfig(join(__dirname, "..", "apps/web"));

async function main() {
  const { orchestrate } = await import("../apps/web/src/core/pipeline/orchestrator.ts");
  
  const tests = [
    ["ht-14", "What was the top-selling product by revenue in Q3 according to the Q3 review, and across all time in BigQuery, how many total units of that product were actually sold and what was the total revenue?"],
    ["ht-15", "What was the top-selling running footwear SKU by revenue in H1 according to the deep dive, and across all time in BigQuery, how many total pairs of the Nike Pegasus 41 were actually sold and what was the total revenue?"],
  ];

  for (const [id, q] of tests) {
    console.log(`\n=== ${id} ===`);
    console.log("Q:", q.substring(0, 120));
    const r = await orchestrate({ message: q });
    console.log("R:", r.reply);
    for (const c of r.citations) {
      if (c.type === "bigquery") {
        console.log("BQ SQL:", (c.excerpt || "").substring(0, 200));
      }
    }
  }
}
main().catch(e => { console.error(e); process.exit(1); });
