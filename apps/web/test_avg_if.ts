import { loadEnvConfig } from "@next/env";
import { join } from "path";
import { BigQuery } from "@google-cloud/bigquery";

loadEnvConfig(join(process.cwd()));

const KEY_PATH = process.env.BQ_KEY_FILE;
const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
const DATASET_ID = process.env.BQ_DATASET_ID || "jd_sports";

const bq = new BigQuery({ projectId: PROJECT_ID, keyFilename: KEY_PATH });

async function run(sql: string, label: string) {
  try {
    const [rows] = await bq.query({ query: sql });
    console.log(`[PASS] ${label}:`, rows);
  } catch (err: any) {
    console.error(`[FAIL] ${label}:`, err.message);
  }
}

async function main() {
  // Test 1: AVG(IF(returned, 1, 0))
  await run(
    `SELECT o.channel, AVG(IF(oi.returned, 1, 0)) as ret_rate FROM \`${PROJECT_ID}.${DATASET_ID}.order_items\` oi JOIN \`${PROJECT_ID}.${DATASET_ID}.orders\` o ON oi.order_id = o.order_id GROUP BY o.channel`,
    "AVG(IF(returned, 1, 0))"
  );

  // Test 2: COUNTIF(oi.returned)
  await run(
    `SELECT o.channel, COUNTIF(oi.returned) / COUNT(*) as ret_rate FROM \`${PROJECT_ID}.${DATASET_ID}.order_items\` oi JOIN \`${PROJECT_ID}.${DATASET_ID}.orders\` o ON oi.order_id = o.order_id GROUP BY o.channel`,
    "COUNTIF(oi.returned)"
  );
}

main();
