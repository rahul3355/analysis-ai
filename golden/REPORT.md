# Golden Dataset Verification Report

**Date:** 2026-06-20  
**Project:** Analysis AI — JD Sports UK BI Assistant  
**Data Sources:** 5 mock PDF documents (markdown) + BigQuery (analysis-ai-499819.jd_sports)  
**Verification Method:** 4-agent parallel computation + 2-agent cross-verification (all queries re-run independently)

---

## Summary

| Category | Total | ✅ Correct | ❌ Needed Fix |
|----------|-------|-----------|--------------|
| Document-only | 25 | 25 | 0 |
| BigQuery-only | 25 | 7 | 18 |
| Hybrid | 25 | 8 | 17 |
| Out-of-Scope | 25 | 25 | 0 |
| **Total** | **100** | **65** | **35** |

All 35 incorrect answers have been corrected with values verified against the live BigQuery database.

---

## BQ Data Snapshot (Actual)

| Metric | Value |
|--------|-------|
| Total orders (delivered + shipped) | 17 |
| Total revenue | GBP 2,160.00 |
| Total items sold (quantity sum) | 18 |
| Online orders | 12 |
| Store orders | 5 |
| Online revenue | GBP 1,360.00 |
| Store revenue | GBP 800.00 |
| Return rate | 5.88% (1/17) |
| Most orders by region | Scotland (6) |
| Highest revenue by region | London (GBP 655.00) |
| Top brand by revenue | Nike (GBP 540.00) |

---

## Root Cause of Discrepancies

The original 100-question golden test suite was authored assuming **18 delivered/shipped orders** generating **GBP 2,280.00 total revenue**. The actual BigQuery mock database contains **17 delivered/shipped orders** generating **GBP 2,160.00 total revenue** (1 fewer order / GBP 120 less — the difference of one Nike Pegasus 41 that appears to have been excluded from the final dataset).

This single discrepancy cascaded into 35 incorrect answers across BQ-only and Hybrid categories.

---

## Agent Verification Results

| Agent | Task | Status | Cross-Verification |
|-------|------|--------|-------------------|
| **A** | Recompute 25 BQ-only questions | ✅ Complete | Verified by Agent C |
| **B** | Recompute 25 Hybrid questions | ✅ Complete | Verified by Agent D |
| **C** | Verify BQ-only (re-run all SQL) | ✅ 25/25 match Agent A | — |
| **D** | Verify Hybrid + Doc-only + OOS | ✅ All pass | — |

### Cross-Verification Summary

- **Agent A vs Agent C:** 25/25 queries matched. Zero discrepancies.
- **Agent B vs Agent D:** 25/25 hybrid queries matched. All BQ results identical. All document source citations verified with correct line numbers.

### Files Generated

| File | Contents |
|------|----------|
| `golden-100.json` | All 100 questions with corrected ground truth, SQL, doc sources, confidence scores |
| `bq-ground-truth.json` | Agent A: 25 BQ-only questions with SQL + corrected values |
| `hybrid-ground-truth.json` | Agent B: 25 hybrid questions with doc sources + BQ results |
| `bq-verification.json` | Agent C: independent re-run of all 25 BQ queries |
| `d-verification.json` | Agent D: verification of hybrid, doc-only, and out-of-scope |

---

## Confidence Scores

All 100 questions received a confidence score:

- **High (99/100):** Ground truth directly verified against live BQ data (all SQL re-run independently by 2 agents) AND/OR verified against document markdown sources with exact line numbers.
- **Medium (1/100):** Question hyb-25 (Meta/social orders) — BQ has a `social` traffic source but no explicit `Meta` source. The answer correctly reports the closest available data.

---

## Files Updated

- `golden/test-cases.json` — Added `confidence` field to all 30 existing cases
- `golden/golden-100.json` — NEW: Complete 100-question dataset with corrected values
- `golden/baseline.json` — Updated with 100-question metadata
- `golden/bq-ground-truth.json` — Agent A output (corrected BQ values)
- `golden/hybrid-ground-truth.json` — Agent B output (corrected hybrid values)
- `golden/bq-verification.json` — Agent C verification
- `golden/d-verification.json` — Agent D verification
- `golden/REPORT.md` — This file
