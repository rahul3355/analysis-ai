/**
 * Golden Dataset Runner — Analysis AI
 *
 * Usage:
 *   node golden/run.js                          # run all cases
 *   node golden/run.js --mode=document          # document-only
 *   node golden/run.js --mode=database          # database-only
 *   node golden/run.js --mode=hybrid            # hybrid only
 *   node golden/run.js --mode=edge              # edge only
 *   node golden/run.js --mode=edge --verbose    # verbose output
 *
 * How it works:
 *   1. Loads test cases from test-cases.json
 *   2. For each, calls orchestrate() — same path as the real app
 *   3. Checks reply for expected checkpoints (case-insensitive substring)
 *   4. Checks reply does NOT contain disallowed terms
 *   5. Checks citations include required sources
 *   6. Reports pass/fail with details
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { loadEnvConfig } from "@next/env";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envRes = loadEnvConfig(join(__dirname, "../apps/web"));
console.log("[run.js] Loaded env files:", envRes.loadedEnvFiles.map(f => f.path));
console.log("[run.js] GOOGLE_PROJECT_ID:", process.env.GOOGLE_PROJECT_ID);
console.log("[run.js] OPENROUTER_API_KEY:", process.env.OPENROUTER_API_KEY ? "SET" : "NOT SET");

import { NullWriter, callOrchestrate } from "./test-helpers.js";
const CASES = JSON.parse(readFileSync(join(__dirname, "test-cases.json"), "utf-8"));
const BASELINE_PATH = join(__dirname, "baseline.json");

function loadBaseline() {
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, "utf-8"));
  } catch {
    return null;
  }
}

function saveBaseline(report) {
  const baseline = {
    generated: new Date().toISOString(),
    cases: report.total,
    score: report.overall,
    threshold: 0.7,
    perCase: Object.fromEntries(report.results.map(r => [r.id, r.score])),
  };
  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2));
}

function checkExpected(reply, expected) {
  const clean = (s) => s.toLowerCase().replace(/-/g, " ").replace(/\.0%/g, "%").trim();
  const cleanReply = clean(reply);
  return expected.map(fact => {
    const cleanFact = clean(fact);
    const found = cleanReply.includes(cleanFact) || reply.toLowerCase().includes(fact.toLowerCase());
    return { fact, found };
  });
}

function checkDisallowed(reply, disallowed) {
  const lower = reply.toLowerCase();
  return disallowed.map(term => {
    const found = lower.includes(term.toLowerCase());
    return { term, found };
  });
}

function checkCitations(reply, citations, mustCite, mustCiteBq) {
  const lowerReply = reply.toLowerCase();
  const results = [];

  for (const docId of mustCite) {
    const hasDocCitation = citations.some(c =>
      c.sourceId?.toLowerCase().includes(docId.toLowerCase())
    );
    if (!hasDocCitation) {
      results.push({ source: docId, found: false, reason: `No citation for ${docId}` });
    }
  }

  if (mustCiteBq) {
    const hasBq = citations.some(c => c.type === "bigquery") || lowerReply.includes("bigquery");
    if (!hasBq) {
      results.push({ source: "bigquery", found: false, reason: "No BigQuery citation" });
    }
  }

  return results;
}

function scoreCase(reply, citations, tc) {
  const checkpointResults = checkExpected(reply, tc.expected);
  const disallowedResults = checkDisallowed(reply, tc.disallowed);
  const citationResults = checkCitations(reply, citations, tc.mustCite || [], tc.mustCiteBq || false);

  const checkpointsFound = checkpointResults.filter(r => r.found).length;
  const checkpointsTotal = checkpointResults.length;
  const checkpointScore = checkpointsTotal > 0 ? checkpointsFound / checkpointsTotal : 1;

  const disallowedFound = disallowedResults.filter(r => r.found).length;
  const disallowedScore = disallowedFound === 0 ? 1 : 0;

  const citationFailures = citationResults.filter(r => !r.found).length;
  const citationTotal = citationResults.length;
  const citationScore = citationTotal > 0 ? (citationTotal - citationFailures) / citationTotal : 1;

  const overall = checkpointScore * 0.5 + disallowedScore * 0.3 + citationScore * 0.2;

  const errors = [];
  for (const r of checkpointResults) { if (!r.found) errors.push(`Missing: "${r.fact}"`); }
  for (const r of disallowedResults) { if (r.found) errors.push(`Has disallowed: "${r.term}"`); }
  for (const r of citationResults) { if (!r.found) errors.push(r.reason); }

  const passed = overall >= 0.7 && citationFailures === 0;

  const verbose = {
    id: tc.id,
    category: tc.category,
    passed,
    score: Math.round(overall * 100) / 100,
    errors,
    checkpoints: checkpointResults,
    disallowed: disallowedResults,
    citations: citationResults,
    question: tc.question.substring(0, 60),
  };
  if (tc.note) verbose.note = tc.note;

  return verbose;
}

async function main() {
  const args = process.argv.slice(2);
  const modeFlag = args.find(a => a.startsWith("--mode="));
  const mode = modeFlag ? modeFlag.split("=")[1] : "all";
  const verbose = args.includes("--verbose");

  let filtered = CASES;
  if (mode !== "all") {
    filtered = CASES.filter(tc => tc.category === mode);
  }

  console.log(`\n  Analysis AI — Golden Dataset Runner`);
  console.log(`  Mode: ${mode} (${filtered.length} cases)`);
  console.log(`  ${"=".repeat(50)}\n`);

  const results = [];
  for (const tc of filtered) {
    // skip multi-turn for now
    process.stdout.write(`  ${tc.id}... `);

    try {
      const result = await callOrchestrate(tc.question, tc.documents.length > 0 ? tc.documents : undefined);

      const score = scoreCase(result.reply, result.citations, tc);
      results.push(score);

      if (score.passed) {
        console.log(`PASS (${score.score})`);
      } else {
        console.log(`FAIL (${score.score})`);
      }

      if (verbose && !score.passed) {
        console.log(`         Reply: "${result.reply}"`);
        for (const err of score.errors) {
          console.log(`         ${err}`);
        }
      }
    } catch (err) {
      console.log(`ERROR: ${err.stack || err.message || err}`);
      results.push({
        id: tc.id,
        category: tc.category,
        passed: false,
        score: 0,
        errors: [`Orchestrator threw: ${err.message}`],
      });
    }
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const avgScore = results.reduce((s, r) => s + r.score, 0) / results.length;

  const baseline = loadBaseline();
  let regression = null;
  if (baseline && baseline.score > 0) {
    const delta = avgScore - baseline.score;
    regression = {
      previous: baseline.score,
      current: avgScore,
      delta: Math.round(delta * 100) / 100,
      isRegression: delta < -0.05,
    };
  }

  console.log(`\n  ${"=".repeat(50)}`);
  console.log(`  Score:     ${(avgScore * 100).toFixed(1)}%`);
  console.log(`  Passed:    ${passed}/${results.length}`);
  console.log(`  Failed:    ${failed}`);

  // by category
  const byCat = {};
  for (const r of results) {
    if (!byCat[r.category]) byCat[r.category] = { total: 0, passed: 0, scores: [] };
    byCat[r.category].total++;
    byCat[r.category].scores.push(r.score);
    if (r.passed) byCat[r.category].passed++;
  }
  console.log(`\n  By category:`);
  for (const [cat, data] of Object.entries(byCat)) {
    const avg = data.scores.reduce((s, v) => s + v, 0) / data.scores.length;
    const status = data.passed === data.total ? "✓" : "✗";
    console.log(`    ${status} ${cat.padEnd(12)} ${(avg * 100).toFixed(1)}%  (${data.passed}/${data.total})`);
  }

  if (regression) {
    console.log(`\n  Regression vs baseline:`);
    console.log(`    Previous: ${(regression.previous * 100).toFixed(1)}%`);
    console.log(`    Current:  ${(regression.current * 100).toFixed(1)}%`);
    console.log(`    Delta:    ${regression.delta > 0 ? "+" : ""}${(regression.delta * 100).toFixed(1)}%`);
    if (regression.isRegression) {
      console.log(`    ⚠ REGRESSION DETECTED (delta < -5%)`);
    } else {
      console.log(`    ✓ No regression`);
    }
  }

  // save baseline on first successful full run
  if (failed === 0 && results.length === CASES.length && !baseline) {
    saveBaseline({ total: results.length, overall: avgScore, results });
    console.log(`\n  Baseline saved.`);
  }

  console.log(`\n  ${"=".repeat(50)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
