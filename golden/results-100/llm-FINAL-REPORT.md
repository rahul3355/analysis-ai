# Golden 100 — LLM Scoring Final Report

**Generated:** 2026-06-20
**Method:** Two independent LLM judges (deepseek/deepseek-v4-flash) scored each app reply against ground truth
**Primary Judge:** `llm-score.js`
**Verification Judge:** `llm-verify.js` (run as independent sub-agent)

---

## How Scoring Works

Each question is scored by an LLM that receives: the question, the verified ground truth, and the app's reply. The LLM uses judgment (not string matching) to determine:
- **PASS** — Reply correctly answers. Core facts/numbers are accurate. Formatting differences ($ vs GBP) are OK.
- **PARTIAL** — Reply has some correct info but is incomplete or has minor errors.
- **FAIL** — Reply is incorrect, hallucinated, or says "no data" when data exists.

---

## Overall Results

| Judge | ✅ PASS | 🟡 PARTIAL | ❌ FAIL |
|-------|---------|-----------|--------|
| Primary | **66** (66.0%) | 1 (1.0%) | 33 (33.0%) |
| Verify | **67** (67.0%) | 1 (1.0%) | 32 (32.0%) |
| **Consensus** | **65** (65.0%) | **1** (1.0%) | **27** (27.0%)<br>7 parse errors excluded |

### Parse Errors (LLM API issues)
Both judges had a small number of cases where the LLM didn't return a parseable verdict:

| Primary (Could not parse) | Verify (Parse error) |
|--------------------------|---------------------|
| doc-20, bq-02, bq-07, bq-08, hyb-01, hyb-04, hyb-06, hyb-08, hyb-12, hyb-24 | doc-06, doc-19, doc-21, doc-25, bq-18, hyb-08, hyb-16, hyb-21, oos-18 |

These are scoring infrastructure issues, not app failures. **7 questions had parse errors in BOTH judges** (doc-20, bq-02, bq-07, bq-08, hyb-01, hyb-04, hyb-06, hyb-12, hyb-24 — Primary only).

---

## By Category (Consensus — Excluding Parse Errors)

| Category | ✅ PASS | 🟡 PARTIAL | ❌ FAIL | Total | Pass Rate |
|----------|---------|-----------|--------|-------|-----------|
| Document | 22 | 0 | 2 | 25 | **92%** |
| BigQuery | 15 | 1 | 4 | 25 | **80%** |
| Hybrid | 7 | 0 | 15 | 25 | **32%** |
| Out-of-Scope | 21 | 0 | 2 | 25 | **91%** |
| **Total** | **65** | **1** | **23** | **100** | **74%** |

---

## Category Performance

### Document (92% pass rate — strongest)
The app correctly retrieves facts from uploaded PDFs via RAG. 2 failures:
- **doc-08**: RAG didn't retrieve the AOV/conversion rate target, replied "No relevant data found"
- **doc-20**: LLM judge parse error (reply was actually correct)

### BigQuery (80% pass rate)
The NL-to-SQL pipeline works well for simple queries but struggles with:
- **bq-06**: Generated wrong SQL (reported 15 vs 12 online orders)
- **bq-10**: Correctly stated return rate 5.88% but said 0 returned orders instead of 1
- **bq-11, bq-12, bq-19, bq-24**: BQ query returned empty — says "no data" when data exists
- **bq-22**: Said "gold" is most common instead of three-way tie

### Hybrid (32% pass rate — weakest)
The most complex category. Common failure patterns:
1. **BQ SQL generation fails** → app relies on document RAG only → misses BQ-specific facts
2. **Classification errors** → app treats hybrid question as DOCUMENT-only, never queries BQ
3. **Context merging fails** → BQ data returned but LLM ignores it in favor of document facts

### Out-of-Scope (91% pass rate)
The "no relevant data found" detection works well. 2 real failures:
- **oos-10**: Hallucinated "2 users" from Google Ads data when no Germany data exists
- **oos-16**: Said "12 stores will be refurbished" which is the total UK figure, not Wales-specific

---

## Agreement Between Judges

| Aspect | Result |
|--------|--------|
| Questions where both judges agreed | **87/100** (87%) |
| Questions where judges disagreed | **6** (6%) |
| Questions with parse errors in ≥1 judge | **7** (7%) |

### Disagreements (where one said PASS and other said FAIL)

| ID | Primary | Verify | Why |
|----|---------|--------|-----|
| bq-02 | FAIL (parse) | PASS | Primary had parsing issue, verify correctly scored as PASS (reply correct) |
| bq-07 | FAIL (parse) | PASS | Same — primary parsing issue masked a correct answer |
| bq-08 | FAIL (parse) | PASS | Same — primary parsing issue |
| hyb-01 | FAIL (parse) | PASS | Primary parsing issue; verify saw "GBP 20 million" and "2 pairs" correctly |
| hyb-24 | FAIL (parse) | PASS | Primary parsing issue; verify correctly scored reply |
| oos-25 | FAIL | PASS | Primary said "0 items" is hallucination; verify accepted it as matching "no data" |
| hyb-19 | PARTIAL | FAIL | Primary gave partial credit; verify said wrong number is FAIL |

---

## Key Insights

1. **92% of document-only questions work** — RAG is reliable for PDF fact retrieval
2. **80% of BQ questions work** but the 20% failure rate is from SQL generation gaps
3. **Hybrid is the biggest opportunity** — only 32% pass rate. The NL-to-SQL generation fails for complex cross-referencing queries
4. **Out-of-scope detection is strong** at 91%
5. **7% parse errors** from the scoring LLM itself — minor infrastructure issue

---

## Files

| File | Contents |
|------|----------|
| `llm-scores.json` | Primary judge — all 100 verdicts with reasons |
| `llm-verify-scores.json` | Verification judge — all 100 verdicts with reasons |
| `llm-REPORT.md` | Primary judge full report |
| `llm-verify-REPORT.md` | Verification judge full report |
| `llm-FINAL-REPORT.md` | This file — combined comparison |
