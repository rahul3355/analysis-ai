# Golden Dataset — Analysis AI

## What

A curated set of 30 question-answer test cases that define "correct" behavior for the BI assistant.
Every case references specific facts from the mock documents in `apps/web/public/mock-docs/`.

## How to Run

```bash
cd apps/web
npx tsx ../golden/run.js
```

This calls the orchestrator for each question, scores the reply against expected checkpoints, and prints a report.

## How It Works

1. Each test case has a `question`, the mock `documents` to use, and `expected` facts
2. The runner calls `orchestrate({ message, documentIds })` — same path as the real app
3. It checks: does the reply contain each expected fact? (case-insensitive substring)
4. Output: pass/fail per case, overall score, regression vs baseline

## How to Check Accuracy

Every case shows:
- `source` — which document it comes from
- `expected[]` — the exact facts (copy-pasted from the source markdown)
- `disallowed[]` — things that should NOT appear (common hallucinations)

To verify a case, open the source markdown file and search for the fact.
## Files

| File | Purpose |
|------|---------|
| `test-cases.json` | 30 existing test cases with expected answers (original golden set) |
| `golden-100.json` | **NEW** Complete 100-question dataset (25×4 categories) with corrected ground truth |
| `baseline.json` | Baseline scores for regression detection |
| `run.js` | Simple Node.js runner (no compilation needed) |
| `bq-ground-truth.json` | Agent A: 25 BQ-only questions recomputed against live BQ |
| `hybrid-ground-truth.json` | Agent B: 25 hybrid questions with doc sources + BQ results |
| `bq-verification.json` | Agent C: independent re-run verifying Agent A's results |
| `d-verification.json` | Agent D: verification of hybrid, doc-only, and out-of-scope |
| `REPORT.md` | Full verification report |
| `README.md` | This file |

## 100-Question Dataset

The `golden-100.json` file contains 100 questions across 4 categories of 25 each:

| Category | Count | Description |
|----------|-------|-------------|
| document | 25 | Questions answerable from uploaded PDFs |
| bigquery | 25 | Questions answered via BigQuery SQL |
| hybrid | 25 | Questions needing both documents + SQL |
| out_of_scope | 25 | Questions with no relevant data found |

All BQ values verified against live `analysis-ai-499819.jd_sports` database. All document facts verified against source markdown files with exact line numbers. Every SQL query independently re-run by 2 agents with 100% agreement. Confidence scores assigned to every question.

## Scoring

Each case checks:
- **Checkpoints**: does the reply contain required facts? (70% of score)
- **Disallowed terms**: does the reply avoid wrong facts? (30% of score)
- **Citations**: does the reply cite the correct sources? (bonus/pass-fail)

A case passes if overall >= 0.7 and all required citations are present.
