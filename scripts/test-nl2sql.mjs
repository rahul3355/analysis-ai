/**
 * NL-to-SQL Real Query Test Harness
 * Tests golden queries and NL-generated SQL against live BigQuery
 */

import { BigQuery } from "@google-cloud/bigquery";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Load env
const envPath = join(ROOT, "apps", "web", ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (t && !t.startsWith("#")) {
      const i = t.indexOf("=");
      if (i > 0) process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
    }
  }
}

const KEY_PATH = process.env.BQ_KEY_FILE || "C:/Users/rahul/AppData/Local/Temp/bq-key.json";
const PROJECT = process.env.GOOGLE_PROJECT_ID || "analysis-ai-499819";
const DATASET = process.env.BQ_DATASET_ID || "jd_sports";
const OR_KEY = process.env.OPENROUTER_API_KEY;

const bq = new BigQuery({ projectId: PROJECT, keyFilename: KEY_PATH });

async function runQuery(sql) {
  const start = Date.now();
  try {
    const [rows] = await bq.query({ query: sql, maxResults: 1000 });
    return { ok: true, n: rows.length, data: rows.slice(0, 3), ms: Date.now() - start };
  } catch (e) {
    return { ok: false, err: e.message, ms: Date.now() - start };
  }
}

function buildSchemaText() {
  const path = join(ROOT, "apps", "web", "src", "server", "config", "bigquery.ts");
  const src = readFileSync(path, "utf-8");

  // Extract table names and columns using regex (simpler than evaluating TS)
  const tables = [
    { table: "products", columns: ["product_id (STRING)", "product_name (STRING)", "category (STRING)", "subcategory (STRING)", "brand (STRING)", "department (STRING)", "rrp (FLOAT)", "cost_price (FLOAT)", "vendor_id (STRING)", "is_active (BOOL)", "launched_at (DATE)"], joins: ["order_items via product_id", "inventory_items via product_id"] },
    { table: "orders", columns: ["order_id (STRING)", "user_id (STRING)", "status (STRING)", "region (STRING)", "channel (STRING)", "store_id (STRING)", "created_at (DATE)", "shipped_at (DATE)", "delivered_at (DATE)", "total_amount (FLOAT)"], joins: ["order_items via order_id", "users via user_id"] },
    { table: "order_items", columns: ["item_id (STRING)", "order_id (STRING)", "product_id (STRING)", "quantity (INT64)", "sale_price (FLOAT)", "cost (FLOAT)", "discount_pct (FLOAT)", "returned (BOOL)", "return_reason (STRING)", "created_at (DATE)"], joins: ["orders via order_id", "products via product_id"] },
    { table: "users", columns: ["user_id (STRING)", "state (STRING)", "city (STRING)", "age_group (STRING)", "gender (STRING)", "traffic_source (STRING)", "loyalty_tier (STRING)", "acquired_at (DATE)", "is_active (BOOL)"], joins: ["orders via user_id", "events via user_id"] },
    { table: "inventory_items", columns: ["product_id (STRING)", "distribution_center (STRING)", "stock_level (INT64)", "reorder_point (INT64)", "lead_time_days (INT64)", "last_restocked_at (DATE)"], joins: ["products via product_id"] },
    { table: "events", columns: ["event_id (STRING)", "user_id (STRING)", "session_id (STRING)", "event_type (STRING)", "page (STRING)", "traffic_source (STRING)", "created_at (TIMESTAMP)"], joins: ["users via user_id"] },
  ];

  return tables.map((t) => {
    const cols = t.columns.map((c) => `  - ${c}`).join("\n");
    const joins = t.joins.map((j) => `  - Joins to ${j}`).join("\n");
    return `${DATASET}.${t.table}:\n${cols}\n${joins}`;
  }).join("\n\n");
}

async function genSql(question, retryErr) {
  if (!OR_KEY) return { ok: false, err: "No API key" };
  const schemaTxt = buildSchemaText();
  const hint = retryErr ? `\n\nPrevious SQL failed: "${retryErr}". Fix it.` : "";
  const start = Date.now();
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OR_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [
          { role: "system", content: `BigQuery SQL for ${DATASET}. Only output SQL.\n\n${schemaTxt}\n\nRules:\n- Output ONLY the SQL query, no explanations\n- Always use \`${DATASET}.table_name\`\n- Use SUM, COUNT, AVG, ROUND with GROUP BY\n- NEVER invent column names\n- NEVER use SELECT *\n- SELECT only${hint}` },
          { role: "user", content: question },
        ],
        temperature: 0.1,
        max_tokens: 5000,
      }),
    });
    const d = await r.json();
    let sql = d?.choices?.[0]?.message?.content?.trim() || "";
    sql = sql.replace(/^```(?:sql)?\s*/i, "").replace(/\s*```$/i, "").trim().replace(/\s+/g, " ");
    return { ok: true, sql, ms: Date.now() - start };
  } catch (e) {
    return { ok: false, err: e.message, ms: Date.now() - start };
  }
}

async function main() {
  console.log("=".repeat(80));
  console.log("  NL-to-SQL REAL QUERY TEST —", PROJECT + "/" + DATASET);
  console.log("=".repeat(80));

  const goldenPath = join(ROOT, "golden", "golden-queries.json");
  const allQueries = JSON.parse(readFileSync(goldenPath, "utf-8")).slice(0, 22);
  const testQs = allQueries.filter((_, i) => i % 4 === 0).slice(0, 6);

  // Phase 1: Test golden queries
  console.log("\n\u2500 PHASE 1: GOLDEN QUERIES (ground truth)");
  let gPass = 0;
  for (const q of allQueries) {
    const r = await runQuery(q.sql);
    if (r.ok) gPass++;
    process.stdout.write(r.ok ? "\u2705" : "\u274c");
  }
  console.log(`\n  Golden: ${gPass}/${allQueries.length} (${(gPass/allQueries.length*100).toFixed(0)}%)`);

  // Phase 2: NL-generated SQL
  console.log("\n\u2500 PHASE 2: NL-GENERATED SQL (Gemini 3.5 Flash)\n");

  const results = [];
  for (const q of testQs) {
    console.log(`\n  Q: "${q.question}"`);

    // Generate
    const gen = await genSql(q.question);
    if (!gen.ok) { console.log(`  \u274c Gen failed: ${gen.err}`); continue; }
    console.log(`  \u2699 Gen: ${gen.ms}ms`);
    console.log(`  SQL: ${gen.sql.slice(0, 150)}`);

    // Execute
    const exec = await runQuery(gen.sql);
    if (exec.ok) {
      console.log(`  \u2705 Exec: ${exec.n} rows, ${exec.ms}ms`);
      if (exec.data.length) console.log(`  Sample: ${JSON.stringify(exec.data[0])}`);
      results.push({ q, gen, exec, pass: true });
    } else {
      console.log(`  \u274c Exec: ${exec.err.slice(0, 100)}`);

      // Self-correction
      const retry = await genSql(q.question, exec.err);
      if (retry.ok) {
        console.log(`  \u2699 Retry gen: ${retry.ms}ms`);
        console.log(`  SQL: ${retry.sql.slice(0, 150)}`);
        const rexec = await runQuery(retry.sql);
        if (rexec.ok) {
          console.log(`  \u2705 Retry exec: ${rexec.n} rows, ${rexec.ms}ms`);
          results.push({ q, gen: retry, exec: rexec, pass: true });
        } else {
          console.log(`  \u274c Retry exec: ${rexec.err.slice(0, 100)}`);
          results.push({ q, gen, exec, retry, rexec, pass: false });
        }
      } else {
        console.log(`  \u274c Retry gen failed`);
        results.push({ q, gen, exec, pass: false });
      }
    }
  }

  // Summary
  console.log("\n" + "\u2500".repeat(40));
  console.log("  SUMMARY");
  console.log("\u2500".repeat(40));
  const pass = results.filter((r) => r.pass).length;
  console.log(`  NL accuracy: ${pass}/${results.length} (${(pass/results.length*100).toFixed(0)}%)`);
  if (results.length > 0) {
    const avgGen = results.reduce((s, r) => s + r.gen.ms, 0) / results.length;
    const avgExec = results.filter((r) => r.exec?.ms).reduce((s, r) => s + r.exec.ms, 0) / results.length;
    console.log(`  Avg generate: ${avgGen.toFixed(0)}ms`);
    console.log(`  Avg execute:  ${avgExec.toFixed(0)}ms`);
    console.log(`  Avg total:    ${(avgGen + avgExec).toFixed(0)}ms`);
  }

  let n = 1;
  for (const r of results) {
    const s = r.pass ? "\u2705" : "\u274c";
    console.log(`  ${s} [${n++}] ${r.q.question.slice(0, 55).padEnd(57)} ${r.gen.ms}ms`);
  }
  console.log();
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
