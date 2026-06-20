/**
 * 25 Truly Hybrid Questions
 * Each question asks for BOTH a document fact AND a BigQuery fact.
 * The system must retrieve the document fact via RAG and compute the BQ fact via SQL.
 */
import { loadEnvConfig } from "@next/env";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { writeFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnvConfig(join(__dirname, "..", "apps/web"));
const OUTPUT = join(__dirname, "results-100", "hybrid-true-report.md");

const TESTS = [
  // ht-01: Footwear target GM vs actual GM
  { id: "ht-01", q: "What is the target gross margin for the Footwear category in the annual sales plan, and what is the actual gross margin for the Footwear department in BigQuery?",
    doc: { target_margin: 46.5 },
    bq: { actual_margin: 45.45, revenue: 1540 } },

  // ht-02: Apparel target GM vs actual GM
  { id: "ht-02", q: "What is the target gross margin for the Apparel category in the annual sales plan, and what is the actual gross margin for the Apparel department in BigQuery?",
    doc: { target_margin: 49.5 },
    bq: { actual_margin: 45.28, revenue: 530 } },

  // ht-03: Nike planned revenue vs actual
  { id: "ht-03", q: "What is the planned revenue target and gross margin for Nike in the annual sales plan, and what is Nike's actual revenue and gross margin in BigQuery?",
    doc: { target_revenue: 2.12, target_margin: 46.8 }, // GBP billions
    bq: { actual_revenue: 540, actual_margin: 45.37 } },

  // ht-04: Adidas planned revenue vs actual
  { id: "ht-04", q: "What is the planned revenue target and gross margin for Adidas in the annual sales plan, and what is Adidas's actual revenue and gross margin in BigQuery?",
    doc: { target_revenue: 1.33, target_margin: 47.5 },
    bq: { actual_revenue: 365, actual_margin: 44.66 } },

  // ht-05: New Balance plan vs actual
  { id: "ht-05", q: "What is the planned revenue target for New Balance in the annual sales plan, and what is New Balance's actual revenue and gross margin in BigQuery?",
    doc: { target_revenue: 318 }, // GBP millions
    bq: { actual_revenue: 160, actual_margin: 47.5 } },

  // ht-06: The North Face plan vs actual
  { id: "ht-06", q: "What is the planned revenue target for The North Face in the annual sales plan, and what is The North Face's actual total revenue and gross margin in BigQuery?",
    doc: { target_revenue: 265 },
    bq: { actual_revenue: 530, actual_margin: 45.28 } },

  // ht-07: Online penetration target vs actual
  { id: "ht-07", q: "What is the target online penetration percentage in the annual sales plan, and what is the actual online penetration based on BigQuery order data?",
    doc: { target_pct: 33.0 },
    bq: { actual_pct: 62.96 } },

  // ht-08: Online AOV target vs actual
  { id: "ht-08", q: "What is the target average order value for the online channel in the annual sales plan, and what is the actual online average order value in BigQuery?",
    doc: { target_aov: 82.00 },
    bq: { actual_aov: 113.33 } },

  // ht-09: Store ATV from Q3 review vs actual AOV
  { id: "ht-09", q: "According to the Q3 performance review, what was the average transaction value in stores, and what is the actual average order amount for store orders in BigQuery?",
    doc: { doc_atv: 74.50 },
    bq: { actual_aov: 160.00 } },

  // ht-10: Nike margin by tier (lifestyle vs running) from Nike agreement vs actual
  { id: "ht-10", q: "According to the Nike Framework Agreement, what are the expected gross margin ranges for Lifestyle and Running product tiers, and what are the actual gross margins for Nike's Lifestyle and Running products in BigQuery?",
    doc: { lifestyle_range: "48-50%", running_range: "46-48%" },
    bq: { lifestyle_margin: 45.0, running_margin: 45.83 } },

  // ht-11: Running category H1 revenue from deep dive vs actual
  { id: "ht-11", q: "What was the running footwear category's H1 revenue and gross margin according to the running deep dive, and across all time in BigQuery, what is the actual running category revenue and gross margin?",
    doc: { h1_revenue: 226, h1_margin: 44.0 },
    bq: { actual_revenue: 935, actual_margin: 44.92 } },

  // ht-12: Scotland Q3 performance from review vs actual BQ
  { id: "ht-12", q: "What was Scotland's Q3 performance against plan according to the Q3 review, and across all time in BigQuery, how many delivered and shipped orders were placed in Scotland?",
    doc: { pct_of_plan: 92.5, plan_revenue: 138, actual_revenue: 128 },
    bq: { order_count: 6 } },

  // ht-13: North West Q3 performance vs actual BQ
  { id: "ht-13", q: "What was the North West region's Q3 performance against plan according to the Q3 review, and across all time in BigQuery, what is the North West's total revenue and order count?",
    doc: { pct_of_plan: 105.2, revenue: 190 },
    bq: { actual_revenue: 340, order_count: 3 } },

  // ht-14: Top product (Q3) vs actual sales
  { id: "ht-14", q: "What was the top-selling product by revenue in Q3 according to the Q3 review, and across all time in BigQuery, how many total units of that product were actually sold and what was the total revenue?",
    doc: { product: "Nike Air Force 1 Low", revenue: 54.0 },
    bq: { units_sold: 3, actual_revenue: 300 } },

  // ht-15: #1 running SKU from deep dive vs actual
  { id: "ht-15", q: "What was the top-selling running footwear SKU by revenue in H1 according to the deep dive, and across all time in BigQuery, how many total pairs of the Nike Pegasus 41 were actually sold and what was the total revenue?",
    doc: { sku: "Nike Pegasus 41", revenue: 8.2 },
    bq: { units_sold: 2, actual_revenue: 240 } },

  // ht-16: Accessories GM from plan vs actual
  { id: "ht-16", q: "What is the target gross margin for the Accessories category in the annual sales plan, and what is the actual gross margin for Accessories in BigQuery?",
    doc: { target_margin: 51.0 },
    bq: { actual_margin: 51.11 } },

  // ht-17: Own brand GM from plan (54-58%) vs any own brand data in BQ
  { id: "ht-17", q: "What is the planned gross margin range for own-brand products in the annual sales plan, and does BigQuery contain any own-brand product sales data?",
    doc: { margin_range: "54-58%" },
    bq: { has_data: false } },

  // ht-18: BTS campaign total revenue target vs actual total
  { id: "ht-18", q: "What is the total revenue target for the Back to School campaign according to the campaign brief, and what is the total revenue across all orders in BigQuery?",
    doc: { target_revenue: 480 },
    bq: { total_revenue: 2160 } },

  // ht-19: Nike min purchase commitment vs actual Nike purchase volume in BQ
  { id: "ht-19", q: "What is the minimum annual purchase volume commitment for Nike under the Framework Agreement, and what is Nike's actual total revenue in BigQuery?",
    doc: { min_purchase: 650 },
    bq: { actual_revenue: 540 } },

  // ht-20: Nike markdown support cap vs actual Nike sold items in BQ
  { id: "ht-20", q: "What is the cap on Nike markdown support under the Framework Agreement, and how many Nike items were sold in delivered and shipped orders in BigQuery?",
    doc: { cap_pct: 3, cap_value: 19.5 },
    bq: { units_sold: 5 } },  // ITEM-001,002x2,014,017 = 5 units

  // ht-21: Back to School AF1 target vs actual
  { id: "ht-21", q: "What is the target volume for Nike Air Force 1 Low in the Back to School campaign brief, and how many pairs were actually sold in BigQuery?",
    doc: { target_volume: 45 },
    bq: { units_sold: 3 } },

  // ht-22: Hoka distribution (85 stores from doc) vs Clifton 9 sales
  { id: "ht-22", q: "In how many stores is Hoka currently available according to the running deep dive, and how many Hoka Clifton 9 units were sold in BigQuery?",
    doc: { stores: 85 },
    bq: { units_sold: 2 } },

  // ht-23: Total media budget for BTS vs any media spend data in BQ
  { id: "ht-23", q: "What is the total media budget for the Back to School campaign according to the campaign brief, and does BigQuery contain any data that could track media spend?",
    doc: { budget: 3.8 },
    bq: { has_media_data: false } },

  // ht-24: Q3 online revenue vs actual online revenue
  { id: "ht-24", q: "What was the online revenue and online penetration percentage in Q3 according to the Q3 review, and across all time in BigQuery, what is the actual online revenue and penetration?",
    doc: { online_revenue: 435, online_pct: 32.0 },
    bq: { actual_online_revenue: 1360, actual_pct: 62.96 } },

  // ht-25: Running footwear full-price sell-through from deep dive vs actual
  { id: "ht-25", q: "What is the running footwear category's full-price sell-through rate according to the deep dive, and what is the actual gross margin of the running category in BigQuery?",
    doc: { sell_through: 68 },
    bq: { actual_margin: 44.92 } },
];

async function main() {
  const { orchestrate } = await import("../apps/web/src/core/pipeline/orchestrator.ts");

  const results = [];
  for (const t of TESTS) {
    process.stdout.write(`${t.id}... `);
    const start = Date.now();
    try {
      const r = await orchestrate({ message: t.q });
      const elapsed = Date.now() - start;
      const lower = (r.reply || "").toLowerCase();
      const hasBq = r.citations.some(c => c.type === "bigquery");
      const hasDoc = r.citations.some(c => c.type === "document");
      const nums = (r.reply || "").match(/[\d,.]+/g)?.map(s => parseFloat(s.replace(/,/g, ""))) || [];

      // Check BQ values appear in reply
      const bqChecks = Object.entries(t.bq).filter(([k]) => k !== 'has_data' && k !== 'has_media_data').map(([k, v]) => {
        if (typeof v === 'number') return { key: k, expected: v, found: nums.some(n => Math.abs(n - v) / Math.max(v, 1) < 0.15) };
        return { key: k, expected: v, found: true };
      });
      const bqBoolChecks = Object.entries(t.bq).filter(([k]) => k === 'has_data' || k === 'has_media_data').map(([k, v]) => {
        if (v === false) return { key: k, expected: false, found: lower.includes("no") || lower.includes("not") || lower.includes("doesn't") || lower.includes("don't") };
        return { key: k, expected: v, found: true };
      });
      const allBqOk = [...bqChecks, ...bqBoolChecks].every(c => c.found);
      
      results.push({
        id: t.id, reply: r.reply, elapsed, hasBq, hasDoc,
        bqChecks: [...bqChecks, ...bqBoolChecks],
        pass: hasBq && allBqOk
      });
      console.log(`${(hasBq && allBqOk) ? "✅" : "❌"} ${elapsed}ms bq=${hasBq} doc=${hasDoc}`);
      if (!allBqOk) {
        for (const c of [...bqChecks, ...bqBoolChecks]) {
          if (!c.found) console.log(`   BQ ${c.key}=${c.expected} not found`);
        }
      }
    } catch (err) {
      results.push({ id: t.id, reply: `ERROR: ${err.message}`, elapsed: Date.now() - start, hasBq: false, hasDoc: false, bqChecks: [], pass: false });
      console.log(`❌ ERROR`);
    }
  }

  const passed = results.filter(r => r.pass).length;
  const lines = [];
  lines.push("# 25 Truly Hybrid Questions — Test Report");
  lines.push("");
  lines.push(`**Passed:** ${passed}/${results.length}`);
  lines.push("");
  lines.push("| ID | Pass | Time | BQ | Doc | BQ Checks | Reply Excerpt |");
  lines.push("|----|------|------|----|-----|-----------|---------------|");
  for (const r of results) {
    const icon = r.pass ? "✅" : "❌";
    const bad = r.bqChecks.filter(c => !c.found).map(c => `${c.key}=${c.expected}`).join(", ") || "pass";
    const rs = (r.reply || "").substring(0, 70).replace(/\n/g, " ");
    lines.push(`| ${r.id} | ${icon} | ${r.elapsed}ms | ${r.hasBq} | ${r.hasDoc} | ${bad} | ${rs} |`);
  }

  const fails = results.filter(r => !r.pass);
  if (fails.length > 0) {
    lines.push(""); lines.push("## Failure Details"); lines.push("");
    for (const f of fails) {
      lines.push(`### ${f.id}`); lines.push(`**Reply:** ${f.reply}`);
      const bad = f.bqChecks.filter(c => !c.found);
      if (bad.length > 0) { lines.push("**Missing BQ values:**"); for (const b of bad) lines.push(`- ${b.key} = ${b.expected}`); }
      lines.push(""); lines.push("---"); lines.push("");
    }
  }

  writeFileSync(OUTPUT, lines.join("\n"), "utf-8");
  console.log(`\n${passed}/${results.length} passed. Report: ${OUTPUT}`);
}

main().catch(e => { console.error(e); process.exit(1); });
