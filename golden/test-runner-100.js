/**
 * Golden 100 — End-to-End Test Runner
 *
 * Calls the app's orchestrate() function for each of 100 questions,
 * captures the full response (reply + citations), writes every
 * interaction as a .md trace file, and compares against ground truth.
 *
 * Usage:
 *   cd apps/web
 *   npx tsx ../../golden/test-runner-100.mjs
 *
 * Output:
 *   golden/results-100/traces/<id>.md   — one per question, full JSON + markdown
 *   golden/results-100/REPORT.md         — comparison summary
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnvConfig } from "@next/env";
import { NullWriter } from "./test-helpers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const APP = join(ROOT, "apps/web");
const GOLDEN_FILE = join(__dirname, "golden-100.json");
const OUTPUT_DIR = join(__dirname, "results-100");
const TRACES_DIR = join(OUTPUT_DIR, "traces");

// ─── 1. Load environment ───────────────────────────────────────────────

loadEnvConfig(APP);
console.log("[runner] Env loaded. PROJECT_ID:", process.env.GOOGLE_PROJECT_ID);
console.log("[runner] OPENROUTER_API_KEY:", process.env.OPENROUTER_API_KEY ? "SET" : "NOT SET");

const GOLDEN = JSON.parse(readFileSync(GOLDEN_FILE, "utf-8"));
const TESTS = GOLDEN.tests;

if (!existsSync(TRACES_DIR)) mkdirSync(TRACES_DIR, { recursive: true });

// ─── 2. Scoring helpers ────────────────────────────────────────────────

function extractCheckpoints(groundTruth) {
  // Pull out numbers (including currency), percentages, and key terms
  const re = /(?:GBP\s*)?[\d,]+(?:\.\d+)?%?|million|billion|pairs?|units?|orders?/gi;
  const matches = new Set();
  let m;
  while ((m = re.exec(groundTruth)) !== null) {
    matches.add(m[0].toLowerCase().replace(/,/g, ""));
  }
  // Also add sentences ending in numbers
  const sentences = groundTruth.split(/[.?!]\s*/).filter(s => s.trim());
  for (const s of sentences) {
    const trimmed = s.trim();
    if (trimmed.length > 10 && trimmed.length < 120) {
      matches.add(trimmed.toLowerCase().replace(/[^a-z0-9\s£%]/g, ""));
    }
  }
  // Brand names and product names
  const brands = ["nike", "adidas", "hoka", "asics", "new balance", "the north face",
    "converse", "under armour", "puma", "vans", "jd sports"];
  for (const b of brands) {
    if (groundTruth.toLowerCase().includes(b)) matches.add(b);
  }
  const products = ["pegasus", "clifton", "gazelle", "nuptse", "air force 1",
    "dunk low", "chuck taylor", "ultraboost", "gel kayano", "backpack"];
  for (const p of products) {
    if (groundTruth.toLowerCase().includes(p)) matches.add(p);
  }
  return [...matches].filter(Boolean);
}

function scoreReply(reply, test) {
  const lower = reply.toLowerCase();
  const gt = test.ground_truth.toLowerCase();

  // Out-of-scope: must say no relevant data
  if (test.category === "out_of_scope") {
    const noData = ["no relevant data found", "cannot answer", "i don't have",
      "not available", "no data", "can't answer", "not found", "unable to",
      "i do not have", "does not contain"];
    const foundNoData = noData.some(p => lower.includes(p));
    const answered = !foundNoData && reply.length > 20;
    return {
      pass: foundNoData,
      checkpointsFound: foundNoData ? 1 : 0,
      checkpointsTotal: 1,
      errors: foundNoData ? [] : ["Answered rather than declining"],
      score: foundNoData ? 1.0 : 0.0,
    };
  }

  // Normal: extract checkpoints from ground truth
  const checkpoints = extractCheckpoints(test.ground_truth);
  const results = checkpoints.map(cp => ({
    checkpoint: cp,
    found: lower.includes(cp),
  }));
  const found = results.filter(r => r.found).length;
  const total = results.length;
  const score = total > 0 ? found / total : 0;
  const errors = results.filter(r => !r.found).map(r => `Missing checkpoint: "${r.checkpoint}"`);

  // Citation check
  const hasCitations = test.category === "bigquery"
    ? reply.toLowerCase().includes("bigquery") || reply.toLowerCase().includes("bq")
    : test.category === "hybrid"
    ? reply.toLowerCase().includes("bigquery") || reply.toLowerCase().includes("table")
    : true;

  if (!hasCitations) {
    errors.push("No BigQuery citation found for database/hybrid question");
  }

  // Adjust score for citations
  const finalScore = hasCitations ? score : score * 0.7;
  const pass = finalScore >= 0.5 && (test.category !== "out_of_scope");

  return {
    pass,
    score: Math.round(finalScore * 100) / 100,
    checkpointsFound: found,
    checkpointsTotal: total,
    hasCitations,
    errors,
    results,
  };
}

// ─── 3. Trace file formatter ──────────────────────────────────────────

function formatTrace(testId, test, result, scoring) {
  const now = new Date().toISOString();
  const lines = [
    `# Trace: ${testId}`,
    ``,
    `**Generated:** ${now}`,
    `**Category:** ${test.category}`,
    `**Question:** ${test.question}`,
    ``,
    `---`,
    ``,
    `## Ground Truth`,
    ``,
    `\`\`\``,
    test.ground_truth,
    `\`\`\``,
    ``,
    `---`,
    ``,
    `## App Reply`,
    ``,
    result.reply || "(empty reply)",
    ``,
    `---`,
    ``,
    `## Citations`,
    ``,
  ];

  if (result.citations && result.citations.length > 0) {
    for (const c of result.citations) {
      lines.push(`### ${c.label || c.sourceId}`);
      lines.push(``);
      lines.push(`- **Source:** ${c.sourceId}`);
      lines.push(`- **Type:** ${c.type}`);
      lines.push(`- **Relevance:** ${c.relevanceScore ?? "N/A"}`);
      lines.push(`- **Confidence:** ${c.confidence ?? "N/A"}`);
      if (c.documentName) lines.push(`- **Document:** ${c.documentName}`);
      if (c.excerpt) lines.push(`- **Excerpt:** ${c.excerpt.substring(0, 300)}`);
      lines.push(``);
    }
  } else {
    lines.push(`No citations returned.`);
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(``);
  lines.push(`## Scoring`);
  lines.push(``);
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Pass | ${scoring.pass} |`);
  lines.push(`| Score | ${scoring.score} |`);
  lines.push(`| Checkpoints Found | ${scoring.checkpointsFound}/${scoring.checkpointsTotal} |`);
  lines.push(`| Has Citations | ${scoring.hasCitations} |`);
  lines.push(`| Confidence | ${test.confidence} |`);
  lines.push(``);

  if (scoring.errors.length > 0) {
    lines.push(`### Errors`);
    lines.push(``);
    for (const e of scoring.errors) {
      lines.push(`- ${e}`);
    }
    lines.push(``);
  }

  if (scoring.results && scoring.results.length > 0) {
    lines.push(`### Checkpoint Details`);
    lines.push(``);
    lines.push(`| Checkpoint | Found |`);
    lines.push(`|------------|-------|`);
    for (const r of scoring.results) {
      lines.push(`| ${r.checkpoint} | ${r.found ? "✅" : "❌"} |`);
    }
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(``);
  lines.push(`## Raw JSON`);
  lines.push(``);
  lines.push(`\`\`\`json`);
  lines.push(JSON.stringify({ reply: result.reply, citations: result.citations, scoring }, null, 2));
  lines.push(`\`\`\``);
  lines.push(``);

  return lines.join("\n");
}

// ─── 4. Summary report formatter ──────────────────────────────────────

function formatSummary(results, duration) {
  const total = results.length;
  const passed = results.filter(r => r.scoring.pass).length;
  const failed = total - passed;
  const avgScore = results.reduce((s, r) => s + r.scoring.score, 0) / total;

  const byCat = {};
  for (const r of results) {
    if (!byCat[r.category]) byCat[r.category] = { total: 0, passed: 0, scores: [] };
    byCat[r.category].total++;
    byCat[r.category].scores.push(r.scoring.score);
    if (r.scoring.pass) byCat[r.category].passed++;
  }

  const lines = [
    `# Golden 100 — End-to-End Test Report`,
    ``,
    `**Date:** ${new Date().toISOString()}`,
    `**Duration:** ${(duration / 1000).toFixed(1)}s`,
    `**Total Questions:** ${total}`,
    ``,
    `---`,
    ``,
    `## Overall Results`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Passed | ${passed}/${total} |`,
    `| Failed | ${failed} |`,
    `| Average Score | ${(avgScore * 100).toFixed(1)}% |`,
    ``,
    `---`,
    ``,
    `## By Category`,
    ``,
    `| Category | Passed | Total | Avg Score |`,
    `|----------|--------|-------|-----------|`,
  ];

  for (const [cat, data] of Object.entries(byCat)) {
    const avg = data.scores.reduce((s, v) => s + v, 0) / data.scores.length;
    lines.push(`| ${cat} | ${data.passed}/${data.total} | ${data.total} | ${(avg * 100).toFixed(1)}% |`);
  }

  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Per-Question Breakdown`);
  lines.push(``);
  lines.push(`| ID | Category | Pass | Score | Errors |`);
  lines.push(`|----|----------|------|-------|--------|`);

  for (const r of results) {
    const icon = r.scoring.pass ? "✅" : "❌";
    const errSummary = r.scoring.errors.length > 0 ? r.scoring.errors[0].substring(0, 60) : "-";
    lines.push(`| ${r.id} | ${r.category} | ${icon} | ${(r.scoring.score * 100).toFixed(0)}% | ${errSummary} |`);
  }

  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // Failures detail
  const failures = results.filter(r => !r.scoring.pass);
  if (failures.length > 0) {
    lines.push(`## Failure Details`);
    lines.push(``);
    for (const f of failures) {
      lines.push(`### ${f.id}: ${f.question.substring(0, 80)}`);
      lines.push(``);
      lines.push(`**Ground Truth:** ${f.ground_truth}`);
      lines.push(``);
      lines.push(`**Reply:** ${f.reply}`);
      lines.push(``);
      for (const e of f.scoring.errors) {
        lines.push(`- Error: ${e}`);
      }
      lines.push(``);
    }
  }

  lines.push(``);
  lines.push(`---`);
  lines.push(`*Each individual trace file is in \`traces/\` directory.*`);
  lines.push(``);

  return lines.join("\n");
}

// ─── 5. Main ─────────────────────────────────────────────────────────

async function main() {
  console.log(`\n  Golden 100 — End-to-End Test Runner`);
  console.log(`  Questions: ${TESTS.length}`);
  console.log(`  ${"=".repeat(50)}\n`);

  const start = Date.now();
  const mod = await import("../apps/web/src/core/pipeline/orchestrator.ts");
  const results = [];

  for (let i = 0; i < TESTS.length; i++) {
    const test = TESTS[i];
    const pct = ((i + 1) / TESTS.length * 100).toFixed(0);
    process.stdout.write(`  [${pct}%] ${test.id}... `);

    try {
      const writer = new NullWriter();
      let reply = "";
      let citations = [];
      writer.textDelta = (t) => { reply += t; };
      writer.citations = (d) => { citations = d.citations || []; };
      await mod.orchestrate({
        message: test.question,
        documentIds: test.category === "document" || test.category === "hybrid"
          ? ["doc-jd-1", "doc-jd-2", "doc-jd-3", "doc-jd-4", "doc-jd-5"]
          : undefined,
      }, writer);
      const result = { reply, citations };

      const scoring = scoreReply(result.reply, test);
      const trace = formatTrace(test.id, test, result, scoring);

      writeFileSync(join(TRACES_DIR, `${test.id}.md`), trace, "utf-8");

      results.push({
        id: test.id,
        category: test.category,
        question: test.question,
        ground_truth: test.ground_truth,
        reply: result.reply,
        citations: result.citations,
        scoring,
      });

      console.log(scoring.pass ? `PASS (${(scoring.score * 100).toFixed(0)}%)` : `FAIL (${(scoring.score * 100).toFixed(0)}%)`);

    } catch (err) {
      console.log(`ERROR: ${err.message || err}`);
      const scoring = { pass: false, score: 0, checkpointsFound: 0, checkpointsTotal: 0, hasCitations: false, errors: [`Orchestrator threw: ${err.message || err}`] };
      results.push({
        id: test.id,
        category: test.category,
        question: test.question,
        ground_truth: test.ground_truth,
        reply: `ERROR: ${err.message || err}`,
        citations: [],
        scoring,
      });
    }
  }

  const duration = Date.now() - start;
  const summary = formatSummary(results, duration);
  writeFileSync(join(OUTPUT_DIR, "REPORT.md"), summary, "utf-8");

  const passed = results.filter(r => r.scoring.pass).length;
  const avgScore = results.reduce((s, r) => s + r.scoring.score, 0) / results.length;

  console.log(`\n  ${"=".repeat(50)}`);
  console.log(`  Complete: ${passed}/${results.length} passed`);
  console.log(`  Avg Score: ${(avgScore * 100).toFixed(1)}%`);
  console.log(`  Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log(`  Report: ${OUTPUT_DIR}\\REPORT.md`);
  console.log(`  Traces: ${TRACES_DIR}\\`);
  console.log(`  ${"=".repeat(50)}\n`);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
