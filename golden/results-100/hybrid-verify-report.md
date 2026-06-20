# Hybrid-25 True — Independent Verification Report

**Verifier:** Agent audit (read-only)
**Date:** 2026-06-20
**Source Report:** `hybrid-true-report.md` (18/25 pass)
**My Assessment:** 20/25 pass (80%)

---

## Score Comparison Table

| ID | Primary Report | My Score | Disagree? |
|----|---------------|----------|-----------|
| ht-01 | ❌ FAIL | ✅ PASS | **YES** — false negative |
| ht-02 | ❌ FAIL | ✅ PASS | **YES** — false negative |
| ht-03 | ✅ PASS | ✅ PASS | |
| ht-04 | ✅ PASS | ✅ PASS | |
| ht-05 | ✅ PASS | ✅ PASS | |
| ht-06 | ✅ PASS | ✅ PASS | |
| ht-07 | ✅ PASS | ✅ PASS | |
| ht-08 | ✅ PASS | ✅ PASS | |
| ht-09 | ✅ PASS | ✅ PASS | |
| ht-10 | ✅ PASS | ✅ PASS | |
| ht-11 | ❌ FAIL | ❌ FAIL | |
| ht-12 | ✅ PASS | ✅ PASS | |
| ht-13 | ❌ FAIL | ❌ FAIL | |
| ht-14 | ❌ FAIL | ❌ FAIL | |
| ht-15 | ❌ FAIL | ❌ FAIL | |
| ht-16 | ✅ PASS | ✅ PASS | |
| ht-17 | ✅ PASS | ✅ PASS | |
| ht-18 | ✅ PASS | ✅ PASS | |
| ht-19 | ✅ PASS | ✅ PASS | |
| ht-20 | ✅ PASS | ✅ PASS | |
| ht-21 | ✅ PASS | ✅ PASS | |
| ht-22 | ✅ PASS | ✅ PASS | |
| ht-23 | ✅ PASS | ✅ PASS | |
| ht-24 | ❌ FAIL | ❌ FAIL | |
| ht-25 | ✅ PASS | ✅ PASS | |

---

## Disputed Questions — Detailed Analysis

### ht-01: Footwear target GM vs actual GM

**Question:** "What is the target gross margin for the Footwear category in the annual sales plan, and what is the actual gross margin for the Footwear department in BigQuery?"

**Primary report: FAIL** — BQ check `revenue=1540` not found in reply.

**App reply:** Correctly stated target Gross Margin = **46.5%** (Doc [1]) and actual Gross Margin = **45.45%** (BQ [39]).

**My judgement: PASS**

**Why this is a false negative:** The question asks for two things:
1. Target gross margin for Footwear → answered: 46.5% ✓
2. Actual gross margin for Footwear → answered: 45.45% ✓

The test script also checks for `revenue=1540` in the reply. But **the question never asks about revenue**. The BQ revenue value (1540) is an internal test fixture field that is not part of the query. The app correctly answered both parts of the question asked. The revenue check is a spurious extra condition.

---

### ht-02: Apparel target GM vs actual GM

**Question:** "What is the target gross margin for the Apparel category in the annual sales plan, and what is the actual gross margin for the Apparel department in BigQuery?"

**Primary report: FAIL** — BQ check `revenue=530` not found in reply.

**App reply:** Correctly stated target Gross Margin = **49.5%** (Doc [1]) and actual Gross Margin = **45.28%** (BQ [39]).

**My judgement: PASS**

**Why this is a false negative:** Identical pattern to ht-01. The question only asks for target GM and actual GM. The `revenue=530` check is an extraneous fixture field not asked about. Both actual question parts are answered correctly.

---

## Agreed Failures — Root Causes

These 5 questions are genuine failures where the BQ pipeline returned empty or wrong data:

### ht-11: Running category H1 revenue vs actual

**Root cause:** The BQ query returned **0 records** for the running category. The test expected `actual_revenue=935` and `actual_margin=44.92`. Data exists in the products/orders tables (the running category has products with order data), but the query filter must have been wrong (possibly filtering by wrong category label or applying incorrect date range).

### ht-13: North West region Q3 performance vs actual

**Root cause:** The BQ query used **"July 2024 and September 2024"** as the date filter. The Q3 2026 review covers **August to October 2026** (Periods 7-9). The query returned 0 orders because it was searching the wrong year. This is a date-handling bug in the SQL generation pipeline.

### ht-14: Top product (Nike Air Force 1 Low) units sold

**Root cause:** BQ returned **1 unit sold** instead of the expected **3 units**. The mock data shows ORD-002 has quantity 2 and ORD-014 has quantity 1 of AF1 Low, totaling 3. The app's BQ query returned only 1, suggesting a filter or aggregation issue (possibly filtering on wrong status or missing an order).

### ht-15: Top running SKU (Nike Pegasus 41) units sold

**Root cause:** The app asked BQ for the **"top-selling running footwear SKU by revenue"** instead of directly querying the Pegasus 41. BQ returned **Adidas Ultraboost Light** (GBP 280, 2 units) as the top seller. The question asks "how many pairs of **that SKU** [Pegasus 41] were actually sold" — the app should have queried BQ for Pegasus 41 specifically, not the general top SKU.

### ht-24: Q3 online revenue and penetration vs actual

**Root cause:** BQ returned **null** for both `actual_online_revenue` and `actual_pct`. The correct query (visible in the `hyb-03` trace) returns `62.96%` and `GBP 1,360`. The ht-24 query apparently had a different filter or calculation that resulted in NULL — likely a division-by-zero or filtering issue in the SQL generation.

---

## Overall Assessment of the 18/25 Pass Rate Claim

The primary report's **18/25 (72%)** pass rate is **too conservative**. After correcting for 2 false negatives:

**Corrected pass rate: 20/25 (80%)**

The two false negatives (ht-01, ht-02) were caused by the test script checking for `revenue` values that were **never part of the question**. The questions only asked about gross margin percentages. The app provided both the document margin and the BQ margin correctly in both cases.

Of the 5 genuine failures, all are **BQ pipeline issues** — not document retrieval issues. The document RAG system correctly answered the document portion of every question. The BQ SQL generation pipeline has problems with:
- Date range construction (ht-13)
- Category/entity matching (ht-11)
- Aggregation logic (ht-14)
- Query interpretation (ht-15 asked for wrong thing)
- NULL handling (ht-24)

**Summary table:**

| Category | Count |
|----------|-------|
| Genuine PASS | 20 |
| False negatives (should be PASS) | 2 |
| Genuine BQ failures | 5 |
| Document retrieval failures | 0 |
| **True pass rate** | **80% (20/25)** |
