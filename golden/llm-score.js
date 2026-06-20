/**
 * LLM-based scoring for Golden 100
 *
 * Uses an LLM to judge whether the app's reply correctly answers
 * each question when compared against the verified ground truth.
 *
 * Usage:
 *   cd apps/web
 *   npx tsx ../../golden/llm-score.js
 *
 * Output:
 *   golden/results-100/llm-scores.json       — per-question verdicts
 *   golden/results-100/llm-REPORT.md         — summary report
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnvConfig } from "@next/env";
import { NullWriter } from "./test-helpers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const APP = join(ROOT, "apps/web");
const GOLDEN_FILE = join(__dirname, "golden-100.json");
const TRACES_DIR = join(__dirname, "results-100", "traces");
const OUTPUT = join(__dirname, "results-100", "llm-scores.json");
const REPORT = join(__dirname, "results-100", "llm-REPORT.md");

loadEnvConfig(APP);

const API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL = "https://openrouter.ai/api/v1";
const MODEL = "deepseek/deepseek-v4-flash"; // or "openai/gpt-4o-mini" if needed

async function judge(question, groundTruth, reply) {
  // Truncate reply if too long
  const truncatedReply = reply && reply.length > 2000
    ? reply.substring(0, 2000) + "... [truncated]"
    : reply || "(empty)";

  const system = `You are evaluating a BI assistant's answer against a verified ground truth. Be fair but strict.

Rules:
- PASS = Reply correctly answers the question. Core facts/numbers are accurate even if formatting differs (e.g. "$530" vs "GBP 530.00", "16.9%" vs "16.90%").
- PARTIAL = Reply has some correct info but is incomplete, missing key numbers, or has minor inaccuracies.
- FAIL = Reply is incorrect, hallucinated, says "No relevant data found" when data exists, or gives wrong numbers.
- FAIL also = Reply gives data that does not exist in ground truth (hallucination).

Respond with exactly one line: PASS | PARTIAL | FAIL then a colon and 1-sentence reason.`;

  const user = `Question: ${question}\n\nGround Truth: ${groundTruth}\n\nAssistant Reply: ${truncatedReply}`;

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-OpenRouter-Title": "Golden 100 LLM Scorer",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.1,
      max_tokens: 150,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${text.substring(0, 200)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim() || "";
  return parseVerdict(content);
}

function parseVerdict(text) {
  const firstLine = text.split("\n")[0].trim();
  if (firstLine.startsWith("PASS")) return { verdict: "PASS", reason: firstLine.replace(/^PASS:\s*/i, "").replace(/^PASS\s*/i, "") };
  if (firstLine.startsWith("PARTIAL")) return { verdict: "PARTIAL", reason: firstLine.replace(/^PARTIAL:\s*/i, "").replace(/^PARTIAL\s*/i, "") };
  if (firstLine.startsWith("FAIL")) return { verdict: "FAIL", reason: firstLine.replace(/^FAIL:\s*/i, "").replace(/^FAIL\s*/i, "") };
  return { verdict: "FAIL", reason: `Could not parse: ${text.substring(0, 100)}` };
}

function loadTraces() {
  const golden = JSON.parse(readFileSync(GOLDEN_FILE, "utf-8"));
  const tests = golden.tests;
  const traces = {};
  const files = [
    ...Array.from({ length: 25 }, (_, i) => `doc-${String(i + 1).padStart(2, "0")}.md`),
    ...Array.from({ length: 25 }, (_, i) => `bq-${String(i + 1).padStart(2, "0")}.md`),
    ...Array.from({ length: 25 }, (_, i) => `hyb-${String(i + 1).padStart(2, "0")}.md`),
    ...Array.from({ length: 25 }, (_, i) => `oos-${String(i + 1).padStart(2, "0")}.md`),
  ];
  for (const f of files) {
    const content = readFileSync(join(TRACES_DIR, f), "utf-8");
    traces[f.replace(".md", "")] = content;
  }
  return { tests, traces };
}

function extractReply(traceContent) {
  const match = traceContent.match(/^## App Reply\n\n([\s\S]*?)\n\n---\n\n## Citations/m);
  return match ? match[1].trim() : "(could not parse)";
}

async function main() {
  console.log(`\n  Golden 100 — LLM Scorer`);
  console.log(`  Model: ${MODEL}`);
  console.log(`  ${"=".repeat(50)}\n`);

  const { tests, traces } = loadTraces();
  const results = [];

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    const trace = traces[test.id];
    const reply = extractReply(trace);
    const pct = ((i + 1) / tests.length * 100).toFixed(0);

    process.stdout.write(`  [${pct}%] ${test.id}... `);

    try {
      const { verdict, reason } = await judge(test.question, test.ground_truth, reply);

      results.push({
        id: test.id,
        category: test.category,
        question: test.question.substring(0, 80),
        verdict,
        reason,
        ground_truth: test.ground_truth,
        reply: reply.substring(0, 200),
      });

      const icon = verdict === "PASS" ? "✅" : verdict === "PARTIAL" ? "🟡" : "❌";
      console.log(`${icon} ${verdict} — ${reason.substring(0, 60)}`);

    } catch (err) {
      console.log(`❌ ERROR — ${err.message.substring(0, 60)}`);
      results.push({
        id: test.id,
        category: test.category,
        question: test.question.substring(0, 80),
        verdict: "FAIL",
        reason: `Scoring error: ${err.message}`,
        ground_truth: test.ground_truth,
        reply: "",
      });
    }
  }

  // Save raw results
  writeFileSync(OUTPUT, JSON.stringify(results, null, 2), "utf-8");

  // Write report
  const passed = results.filter(r => r.verdict === "PASS").length;
  const partial = results.filter(r => r.verdict === "PARTIAL").length;
  const failed = results.filter(r => r.verdict === "FAIL").length;

  const byCat = {};
  for (const r of results) {
    if (!byCat[r.category]) byCat[r.category] = { pass: 0, partial: 0, fail: 0, total: 0 };
    byCat[r.category].total++;
    if (r.verdict === "PASS") byCat[r.category].pass++;
    else if (r.verdict === "PARTIAL") byCat[r.category].partial++;
    else byCat[r.category].fail++;
  }

  const lines = [
    `# Golden 100 — LLM-Based Scoring Report`,
    ``,
    `**Model:** ${MODEL}`,
    `**Total Questions:** ${results.length}`,
    ``,
    `---`,
    ``,
    `## Overall Results`,
    ``,
    `| Verdict | Count | % |`,
    `|---------|-------|---|`,
    `| ✅ PASS | ${passed} | ${(passed / results.length * 100).toFixed(1)}% |`,
    `| 🟡 PARTIAL | ${partial} | ${(partial / results.length * 100).toFixed(1)}% |`,
    `| ❌ FAIL | ${failed} | ${(failed / results.length * 100).toFixed(1)}% |`,
    ``,
    `---`,
    ``,
    `## By Category`,
    ``,
    `| Category | ✅ PASS | 🟡 PARTIAL | ❌ FAIL | Total |`,
    `|----------|---------|-----------|--------|-------|`,
  ];

  for (const [cat, d] of Object.entries(byCat)) {
    const pctPass = (d.pass / d.total * 100).toFixed(0);
    lines.push(`| ${cat} | ${d.pass} | ${d.partial} | ${d.fail} | ${d.total} |`);
  }

  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Per-Question Verdicts`);
  lines.push(``);
  lines.push(`| ID | Category | Verdict | Reason |`);
  lines.push(`|----|----------|---------|--------|`);

  for (const r of results) {
    const icon = r.verdict === "PASS" ? "✅" : r.verdict === "PARTIAL" ? "🟡" : "❌";
    lines.push(`| ${r.id} | ${r.category} | ${icon} ${r.verdict} | ${r.reason.substring(0, 90)} |`);
  }

  lines.push(``);
  writeFileSync(REPORT, lines.join("\n"), "utf-8");

  console.log(`\n  ${"=".repeat(50)}`);
  console.log(`  ✅ PASS:    ${passed} (${(passed / results.length * 100).toFixed(1)}%)`);
  console.log(`  🟡 PARTIAL: ${partial} (${(partial / results.length * 100).toFixed(1)}%)`);
  console.log(`  ❌ FAIL:    ${failed} (${(failed / results.length * 100).toFixed(1)}%)`);
  console.log(`  Report: llm-REPORT.md`);
  console.log(`  Scores: llm-scores.json`);
  console.log(`  ${"=".repeat(50)}\n`);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
