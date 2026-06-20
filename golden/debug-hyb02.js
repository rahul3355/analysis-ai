import { loadEnvConfig } from "@next/env";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnvConfig(join(__dirname, "..", "apps/web"));

async function main() {
  const { orchestrate } = await import("../apps/web/src/core/pipeline/orchestrator.ts");
  const r = await orchestrate({message: "Nike's planned gross margin is 46.8% in the sales plan. What is Nike's actual gross margin in BigQuery?"});
  console.log("REPLY:", r.reply);
  for (const c of r.citations) {
    console.log("---");
    console.log("TYPE:", c.type);
    if (c.excerpt) console.log("SQL/EXCERPT:", c.excerpt.substring(0, 250));
  }
}
main().catch(e => { console.error(e); process.exit(1); });
