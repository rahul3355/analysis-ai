import { loadEnvConfig } from "@next/env";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnvConfig(join(__dirname, "..", "apps/web"));

async function main() {
  const { orchestrate } = await import("../apps/web/src/core/pipeline/orchestrator.ts");
  const r = await orchestrate({message: "The campaign brief targets 8,000 units of The North Face Nuptse Jacket. How many units of this jacket were actually sold in BigQuery?"});
  console.log("REPLY:", r.reply);
  for (const c of r.citations) {
    console.log("TYPE:", c.type, "| SRC:", c.sourceId);
    if (c.excerpt) console.log("  ", c.excerpt.substring(0, 200));
  }
}
main().catch(e => { console.error(e); process.exit(1); });
