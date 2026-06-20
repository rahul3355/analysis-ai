import { loadEnvConfig } from "@next/env";
import { join } from "path";
import { fetchLiveSchemas, executeBqQuestion } from "./src/server/services/bigqueryService";

loadEnvConfig(join(process.cwd()));

async function main() {
  const question = "What is the return rate by channel?";
  console.log(`Testing NL-to-SQL for question: "${question}"`);
  
  try {
    const result = await executeBqQuestion(question);
    console.log("[SUCCESS] Result SQL:", result.sql);
    console.log("Result rows:", result.results.rows);
  } catch (err: any) {
    console.error("[FAILURE] Error:", err.message);
  }
}

main();
