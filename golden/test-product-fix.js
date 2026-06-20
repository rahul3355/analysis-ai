/**
 * Quick test: verify the product name LIKE fix
 * Tests the 4 affected questions + 5 controls
 */
import { loadEnvConfig } from "@next/env";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnvConfig(join(__dirname, "..", "apps/web"));

const tests = [
  // Affected (product name splitting)
  { id: "bq-11", q: "What is the current stock level and reorder point of The North Face Nuptse Jacket at the Glasgow distribution center?", expect: ["350", "100"] },
  { id: "bq-24", q: "Which distribution center stores the Hoka Clifton 9, and what is its stock level?", expect: ["Glasgow", "600"] },
  { id: "hyb-04", q: "The Back to School campaign brief targets 45,000 pairs of Nike Air Force 1 Low. How many pairs of this shoe were actually sold in BigQuery?", expect: ["3"] },
  { id: "hyb-23", q: "The running category deep dive targets expanding Hoka distribution to 200 stores. What is the reorder point of Hoka Clifton 9 at Glasgow DC?", expect: ["100"] },
  // Controls
  { id: "bq-16", q: "What is the retail price (RRP) and cost price of the Hoka Clifton 9?", expect: ["130", "72"] },
  { id: "bq-17", q: "What is the retail price (RRP) and cost price of The North Face Nuptse Jacket?", expect: ["265", "145"] },
  { id: "bq-13", q: "What is the stock level and reorder point for ASICS Gel Kayano 31 at the Glasgow distribution center?", expect: ["300", "80"] },
  { id: "bq-23", q: "Which distribution center stores the Nike Air Force 1 Low, and what is its stock level?", expect: ["Manchester", "2000"] },
  { id: "bq-04", q: "What is the total quantity of products sold in delivered and shipped orders?", expect: ["18"] },
];

async function main() {
  const { orchestrate } = await import("../apps/web/src/core/pipeline/orchestrator.ts");

  let pass = 0, fail = 0;
  for (const t of tests) {
    process.stdout.write(`${t.id}... `);
    try {
      const r = await orchestrate({ message: t.q });
      const lower = (r.reply || "").toLowerCase();
      const hasBq = r.citations.some(c => c.type === "bigquery");
      const hasDoc = r.citations.some(c => c.type === "document");
      const allFound = t.expect.every(e => lower.includes(e.toLowerCase()));
      const status = allFound && hasBq ? "✅" : "❌";
      if (allFound && hasBq) pass++; else fail++;
      console.log(`${status} reply="${(r.reply || "").substring(0, 80)}" bq=${hasBq} doc=${hasDoc}`);
      if (hasBq) {
        const c = r.citations.find(c => c.type === "bigquery");
        if (c) console.log(`   sql: ${(c.excerpt || "").substring(0, 120)}`);
      }
    } catch (err) {
      console.log(`❌ ERROR: ${err.message.substring(0, 80)}`);
      fail++;
    }
  }
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
