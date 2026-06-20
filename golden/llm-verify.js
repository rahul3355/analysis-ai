/**
 * LLM-based VERIFICATION scorer for Golden 100
 *
 * Independent re-scoring of all 100 questions using an LLM.
 * Writes to llm-verify-scores.json and llm-verify-REPORT.md
 * so results can be compared with the primary llm-score.js run.
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnvConfig } from "@next/env";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP = join(__dirname, "..", "apps/web");
const GOLDEN_FILE = join(__dirname, "golden-100.json");
const TRACES_DIR = join(__dirname, "results-100", "traces");
const OUTPUT = join(__dirname, "results-100", "llm-verify-scores.json");
const REPORT = join(__dirname, "results-100", "llm-verify-REPORT.md");

loadEnvConfig(APP);

const API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL = "https://openrouter.ai/api/v1";
const MODEL = "deepseek/deepseek-v4-flash";

function extractReply(traceContent) {
  const match = traceContent.match(/^## App Reply\n\n([\s\S]*?)\n\n---\n\n## Citations/m);
  return match ? match[1].trim() : "(could not parse)";
}

async function judge(question, groundTruth, reply) {
  const truncatedReply = reply && reply.length > 2000
    ? reply.substring(0, 2000) + "... [truncated]"
    : reply || "(empty)";

  const system = `You are an independent evaluator scoring a BI assistant's answers. Be fair but strict.

Rate each answer as:
- PASS: Reply correctly answers the question. Key facts/numbers are correct. Minor formatting differences ($ vs GBP) are okay.
- PARTIAL: Reply has some correct information but is incomplete, misses key numbers, or has minor inaccuracies.
- FAIL: Reply is incorrect, hallucinated, says "no data" when data exists, or gives fundamentally wrong information.

Output exactly: PASS | PARTIAL | FAIL then a colon and 1-sentence reason. Only one line.`;

  const user = `Question: ${question}\n\nGround Truth: ${groundTruth}\n\nAssistant Reply: ${truncatedReply}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-OpenRouter-Title": "Golden 100 LLM Verifier",
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

      if (response.status === 429 && attempt < 3) {
        const retry = response.headers.get("Retry-After");
        const wait = retry ? parseInt(retry) * 1000 : Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      if (!response.ok) {
        const text = await response.text();
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        throw new Error(`API ${response.status}: ${text.substring(0, 200)}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content?.trim() || "";
      const firstLine = content.split("\n")[0].trim();
      if (firstLine.startsWith("PASS")) return { verdict: "PASS", reason: firstLine.replace(/^PASS:\s*/i, "").replace(/^PASS\s*/i, "") };
      if (firstLine.startsWith("PARTIAL")) return { verdict: "PARTIAL", reason: firstLine.replace(/^PARTIAL:\s*/i, "").replace(/^PARTIAL\s*/i, "") };
      if (firstLine.startsWith("FAIL")) return { verdict: "FAIL", reason: firstLine.replace(/^FAIL:\s*/i, "").replace(/^FAIL\s*/i, "") };
      return { verdict: "FAIL", reason: `Parse error: ${content.substring(0, 80)}` };
    } catch (err) {
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      return { verdict: "FAIL", reason: `Error: ${err.message.substring(0, 80)}` };
    }
  }
}

async function main() {
  console.log(`\n  Golden 100 — LLM VERIFIER (independent re-score)`);
  console.log(`  Model: ${MODEL}`);
  console.log(`  ${"=".repeat(50)}\n`);

  const golden = JSON.parse(readFileSync(GOLDEN_FILE, "utf-8"));
  const tests = golden.tests;
  const idToTrace = {};
  const files = [
    ...Array.from({ length: 25 }, (_, i) => `doc-${String(i + 1).padStart(2, "0")}.md`),
    ...Array.from({ length: 25 }, (_, i) => `bq-${String(i + 1).padStart(2, "0")}.md`),
    ...Array.from({ length: 25 }, (_, i) => `hyb-${String(i + 1).padStart(2, "0")}.md`),
    ...Array.from({ length: 25 }, (_, i) => `oos-${String(i + 1).padStart(2, "0")}.md`),
  ];
  for (const f of files) {
    idToTrace[f.replace(".md", "")] = readFileSync(join(TRACES_DIR, f), "utf-8");
  }

  const results = [];

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    const reply = extractReply(idToTrace[test.id]);
    const pct = ((i + 1) / tests.length * 100).toFixed(0);

    process.stdout.write(`  [${pct}%] ${test.id}... `);

    const { verdict, reason } = await judge(test.question, test.ground_truth, reply);

    results.push({
      id: test.id,
      category: test.category,
      verdict,
      reason,
    });

    const icon = verdict === "PASS" ? "✅" : verdict === "PARTIAL" ? "🟡" : "❌";
    console.log(`${icon} ${verdict} — ${reason.substring(0, 60)}`);
  }

  writeFileSync(OUTPUT, JSON.stringify(results, null, 2), "utf-8");

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
    `# Golden 100 — LLM Verification Report (Independent Re-score)`,
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
    lines.push(`| ${cat} | ${d.pass} | ${d.partial} | ${d.fail} | ${d.total} |`);
  }

  lines.push(``);
  lines.push(`## Per-Question Verdicts`);
  lines.push(``);
  lines.push(`| ID | Verdict | Reason |`);
  lines.push(`|----|---------|--------|`);

  for (const r of results) {
    const icon = r.verdict === "PASS" ? "✅" : r.verdict === "PARTIAL" ? "🟡" : "❌";
    lines.push(`| ${r.id} | ${icon} ${r.verdict} | ${r.reason.substring(0, 90)} |`);
  }

  lines.push(``);
  writeFileSync(REPORT, lines.join("\n"), "utf-8");

  console.log(`\n  ${"=".repeat(50)}`);
  console.log(`  ✅ PASS:    ${passed} (${(passed / results.length * 100).toFixed(1)}%)`);
  console.log(`  🟡 PARTIAL: ${partial} (${(partial / results.length * 100).toFixed(1)}%)`);
  console.log(`  ❌ FAIL:    ${failed} (${(failed / results.length * 100).toFixed(1)}%)`);
  console.log(`  Report: llm-verify-REPORT.md`);
  console.log(`  Scores: llm-verify-scores.json`);
  console.log(`  ${"=".repeat(50)}\n`);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
