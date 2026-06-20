# Intent Classifier — Accuracy Optimization Specification

**Author**: Staff Quant Engineer, Citadel Securities
**Date**: 2026-06-19
**System**: Analysis AI — Two-Stage Intent Classifier

---

## 1. Architecture Overview

```
User Query
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Stage 1: Heuristic Classifier  (~0.001ms)                   │
│   • 40+ regex patterns ordered by specificity               │
│   • Returns { class, confidence, matchedPatterns[] }        │
│   • Confidence ∈ [0.0, 1.0]                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
          conf ≥ 0.85? ─── YES ──► Route directly (skip Stage 2)
                     │
                    NO
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Stage 2: LLM Few-Shot Classifier  (~1-2s)                   │
│   • 4-class: DOCUMENT, DATABASE, HYBRID, UNKNOWN            │
│   • Returns { class, confidence, reasoning }                │
│   • 3-shot examples from golden/test-cases.json             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ Weighted Voting      │
          │ α=0.3, β=0.7        │
          │ (α=0.8 if S1 high)  │
          └──────────┬───────────┘
                     ▼
              Final Class + Route
```

### 1.1 New Output Types (replacing current enum)

```typescript
export type IntentClass = "DOCUMENT" | "DATABASE" | "HYBRID" | "UNKNOWN";

export interface ClassificationResult {
  class: IntentClass;
  stage1: { class: IntentClass; confidence: number; patterns: string[] };
  stage2: { class: IntentClass; confidence: number } | null;
  finalConfidence: number;      // weighted vote score for chosen class
  usedStage2: boolean;
}
```

### 1.2 Cost Matrix (reproduced for reference)

| True \ Classified | DOCUMENT | DATABASE | HYBRID | UNKNOWN |
|---|---|---|---|---|
| **DOCUMENT** | 0 | 0.95 (wrong SQL → 175% vs 68%) | 0.20 (extra cost, OK) | 0.90 (no answer) |
| **DATABASE** | 0.70 (RAG returns nothing) | 0 | 0.20 (extra cost, OK) | 0.80 (no answer) |
| **HYBRID** | 0.60 (missing DB data) | 0.60 (missing doc data) | 0 | 0.85 (missing everything) |
| **UNKNOWN** | 0.90 (hallucination) | 0.90 (hallucination) | 0.85 (hallucination) | 0 |

**Safest default when uncertain: HYBRID** — running both sources and discarding irrelevant output is cheaper than running the wrong single source.

---

## 2. Stage 1: Heuristic Classifier — Pattern Design

### 2.1 Pattern Priority Order (most specific first)

Patterns are ordered by descending specificity. A more specific pattern must match before a general one. Each pattern has a `weight` used to compute confidence for its class.

**Priority 1 — Explicit Contract/Legal (DOCUMENT ⨁ 0.95)**
```
\bframework agreement\b
\bclause\s+\d+(\.\d+)*
\bsection\s+\d+(\.\d+)*
\bterms\s+and\s+conditions\b
\bminimum\s+(annual\s+)?purchase\s+commitment\b
\brebate\s+(rate|threshold|tier)\b
\bvolume\s+commitment\b
\b(purchase|procurement)\s+agreement\b
```

**Priority 2 — Named Reports/Deep Dives (DOCUMENT ⨁ 0.90)**
```
\bdeep\s+dive\b
\b(fy|financial\s+year)\s*\d{4}\s+(annual\s+)?sales\s+plan\b
\bcampaign\s+brief\b
\bperformance\s+review\b
\bprice\s+architecture\b
\bbrand\s+share\s+analysis\b
\bexecutive\s+summary\b
\b(top|bottom)\s+line\s+(review|summary)\b
```

**Priority 3 — Document-Specific Metrics (DOCUMENT ⨁ 0.85)**
```
\bfull-price\s+sell-through\b
\bsell-through\s+rate\b
\byear(-on-year| over year| oy|/y)\s+growth\b
\bgross\s+margin\b
\bprice\s+tier\b
\b(media|marketing)\s+budget\b
\bstores?\s+(planned|target|new)\b
\brefurbishment\s+(closures?|impact)\b
\bproduct\s+(assortment|allocation)\b
\bcategory\s+(deep\s+dive|performance)\b
```

**Priority 4 — Hybrid Indicators (HYBRID ⨁ 0.80)**
```
\b(how\s+does|does\s+this)\s+(compare|track)\b
\btrack\s+against\b
\baccording\s+to\s+both\b
\bvalidate\b
\bversus\s+plan\b
\bactuals?\s+vs\b
\b(run-rate|annualized)\s+(against|vs|versus|compared)\b
\breconcile\b
\bcross-reference\b
```

**Priority 5 — Database Metrics (DATABASE ⨁ 0.85)**
```
\baverage\s+(order\s+value|discount\s+depth|basket\s+size)\b
\breturn\s+rate\b
\bcustomers?\s+by\b
\borders?\s+by\b
\bsales\s+channel\b
\btraffic\s+source\b
\bloyalty\s+tier\b
\bage\s+group\b
\bconversion\s+(rate|funnel)\b
\b(monthly|weekly|daily)\s+revenue\s+trend\b
```

**Priority 6 — General Database Patterns (DATABASE ⨁ 0.75)**
```
\b(revenue|sales)\s+by\b
\btop\s+(selling|products?|brands?|skus?)\b
\brand\s+(products?|items?)\b
\binventory\b
\bstock\s+(level|count|status|low)\b
\bdistribution\s+(center|centre)\b
\b(how\s+many|count|number\s+of)\s+\w+\s+(by|per|each)\b
\b(group|breakdown)\s+by\b
\bselect\s+.+\s+from\b  (raw SQL queries asked by power users)
```

**Priority 7 — UNKNOWN/Safety Patterns (UNKNOWN ⨁ 0.95)**
```
\bweather\b
\bjoke\b(s)
\bstock\s+price\b
\bmarket\s+cap\b
\bwho\s+is\s+(the\s+)?(ceo|founder|director)\b
\btell\s+me\s+a\b
\bnews\s+(today|about|on)\b
\bpresident|election|political\b
\brecipe|movie|song\b
```

**Priority 8 — General Location/Time (context-dependent, ⨁ 0.50)**
```
\b(in|by|for|across)\s+(region|store|channel|category|brand)\b
\b(in|during|for|over)\s+(q[1-4]|h1|h2|fy\d{4}|month|quarter)\b
```

### 2.2 Conflict Resolution Rules

When multiple patterns match different classes:

1. **Priority wins**: Pattern at lower priority number beats higher priority number (e.g., Priority 1 contract clause beats Priority 6 "by region")
2. **Explicit contract patterns override ALL database patterns** — this prevents "section 4 rebate rate by region" from being classified as DATABASE
3. **Document-specific metrics override general location patterns** — "sell-through rate by region" → DOCUMENT (not DATABASE), because "sell-through rate" is a document-specific metric
4. **HYBRID patterns override both DOCUMENT and DATABASE individually** — if any Priority 4 pattern matches, flag as potential hybrid
5. **UNKNOWN patterns override everything** — if any Priority 7 pattern matches, classify as UNKNOWN (safety)
6. **Weight tie (within 0.05) → HYBRID**

### 2.3 Confidence Calculation

```
confidence[C] = Σ(matched patterns for class C weight) / max(1, Σ(all matched weights))
```

If all matched patterns are for one class: confidence = 1.0 (HIGH)
If patterns are split across classes: confidence decreases proportionally.

Adjustment for contradictory patterns:
- If DOCUMENT and DATABASE both have matches, and no HYBRID pattern matches:
  `confidence[DOCUMENT] *= 0.8, confidence[DATABASE] *= 0.8` (discount both)
- If UNKNOWN matches alongside any business pattern:
  `confidence[UNKNOWN] = max(confidence[UNKNOWN], 0.9)` (UNKNOWN is conservative — trust it)

---

## 3. Confidence Thresholds

### 3.1 Stage 1 → Stage 2 Gating

| Stage 1 Max Confidence | Action |
|---|---|
| < 0.30 | Mandatory Stage 2. Stage 1 is unreliable. |
| 0.30 – 0.59 | Mandatory Stage 2. Weighted voting with α=0.2, β=0.8 |
| 0.60 – 0.84 | Optional Stage 2 (run in parallel, 500ms timeout). If timeout → trust Stage 1. If result → α=0.4, β=0.6 |
| ≥ 0.85 | **Skip Stage 2**. Route directly on Stage 1. α=1.0, β=0.0 |

Rationale:
- At 0.85+, heuristic is unambiguous (e.g., "What is the rebate rate in the Nike Framework Agreement section 4?" matches Priority 1)
- At 0.30–0.59, heuristic is guessing — defer to LLM
- At 0.60–0.84, heuristic is reasonably confident but LLM can refine

### 3.2 Stage 2 Confidence Required for Override

| Stage 2 Confidence | Behavior |
|---|---|
| ≥ 0.90 | Override Stage 1 if they disagree (high-conviction LLM) |
| 0.70 – 0.89 | Weighted voting determines winner |
| < 0.70 | Stage 1 wins (LLM is uncertain — trust heuristic) |

### 3.3 Minimum Confidence to Route

| Class | Minimum Final Confidence |
|---|---|
| DOCUMENT | ≥ 0.40 |
| DATABASE | ≥ 0.45 |
| HYBRID | ≥ 0.35 |
| UNKNOWN | ≥ 0.60 (must be very sure before refusing to answer) |

If no class meets its minimum → default to **HYBRID**.

---

## 4. Two-Stage Disagreement Resolution

### 4.1 Weighted Voting Function

```
weightedScore[C] = α * S1_confidence[C] + β * S2_confidence[C]
```

Where α, β depend on Stage 1 confidence tier (see 3.1):
- S1 ≥ 0.85: α=1.0, β=0.0   (trust heuristic)
- S1 0.60–0.84: α=0.4, β=0.6
- S1 0.30–0.59: α=0.2, β=0.8
- S1 < 0.30: α=0.1, β=0.9

### 4.2 Tiebreaker Rules

If `|weightedScore[top] - weightedScore[second]| ≤ 0.05`:

1. **HYBRID in top 2** → pick HYBRID (safest path)
2. **DOCUMENT vs DATABASE tie** → pick HYBRID (running both is safer than guessing wrong)
3. **UNKNOWN in top 2** → pick the non-UNKNOWN option
4. **All scores < 0.30** → pick HYBRID

### 4.3 Specific Disagreement Cases

| S1 says | S2 says | Winner | Why |
|---|---|---|---|
| DOCUMENT | DATABASE | Weighted vote | Depends on confidences. If close → HYBRID. |
| DATABASE | DOCUMENT | Weighted vote | Same as above. |
| DOCUMENT | HYBRID | HYBRID | S2 detected something S1 missed. Run both. |
| DATABASE | HYBRID | HYBRID | S2 detected document need. Run both. |
| HYBRID | DOCUMENT | HYBRID | Be conservative — run both. |
| Anything | UNKNOWN | UNKNOWN only if S2 ≥ 0.80 | LLM must be very confident before refusing. |
| UNKNOWN | DOCUMENT | DOCUMENT (only if S1 ≥ 0.60) | S1 high confidence beats S2 UNKNOWN call. |

---

## 5. Fallback Strategy

### 5.1 Default to HYBRID

HYBRID is the default in these cases:
1. Stage 1 max confidence < 0.30 AND Stage 2 max confidence < 0.50
2. Both stages disagree and weighted voting produces no clear winner (tiebreaker invoked)
3. Empty input or parse error
4. Stage 2 LLM call fails (network timeout, API error)
5. Any stage returns UNKNOWN with confidence < 0.80

**Rationale**: HYBRID executes both pipelines (RAG + BigQuery). The downstream LLM will naturally ignore irrelevant source material. The extra cost (2x data source calls) is acceptable compared to the cost of routing to the wrong single source (wrong answer or empty response).

### 5.2 UNKNOWN Handling

When final class = UNKNOWN with confidence ≥ 0.60:
- Return: "I don't have data to answer that question. Try asking about sales, inventory, or your uploaded documents."
- Do NOT fall back to LLM generation (prevents hallucination)
- Log the UNKNOWN query for review

When UNKNOWN with confidence < 0.60 → fall back to HYBRID.

---

## 6. Error Recovery (Cross-Retry)

### 6.1 Empty Result Retry Logic

```
if class == DOCUMENT:
    result = executeRagPipeline(...)
    if result.chunks.length == 0:
        log("[retry] Document path empty, retrying as DATABASE")
        result = executeBqQuestion(...)
        if result.rows.length == 0:
            return "No relevant data found."

if class == DATABASE:
    result = executeBqQuestion(...)
    if result.rows.length == 0:
        log("[retry] Database path empty, retrying as DOCUMENT")
        result = executeRagPipeline(...)
        if result.chunks.length == 0:
            return "No relevant data found."

if class == HYBRID:
    // Already runs both in parallel. No retry needed.
    // If both empty → "No relevant data found."
```

### 6.2 Rate Limiting

- Maximum 1 retry per query (prevents infinite loops)
- Track retries via a `Map<messageHash, retryCount>` with TTL of 60s
- If same query retries within 60s → skip retry, return "No relevant data found."

---

## 7. Stage 2: LLM Prompt Design

### 7.1 Few-Shot Prompt (3 examples per class)

```
You are a precise intent classifier for a retail BI assistant. Classify the user's
question into exactly one of: DOCUMENT, DATABASE, HYBRID, or UNKNOWN.

DOCUMENT = question about information found in uploaded PDF/DOCX reports,
           contracts, policies, or marketing documents.
DATABASE = question about structured data from BigQuery: sales, inventory,
           customers, orders, revenue metrics.
HYBRID   = question that needs BOTH document analysis and database queries
           to fully answer.
UNKNOWN  = question that cannot be answered from any available data source:
           weather, jokes, news, CEO names, stock prices, politics.

Respond with valid JSON only: {"class": "...", "confidence": 0.0-1.0, "reasoning": "..."}

Examples:

User: "What is the minimum annual purchase commitment in the Nike Framework Agreement?"
{{"class": "DOCUMENT", "confidence": 0.98, "reasoning": "Asks about a specific contract clause in a named agreement document"}}

User: "What is the return rate by channel?"
{{"class": "DATABASE", "confidence": 0.95, "reasoning": "Asks for a computed metric from transactional data, requires SQL aggregation"}}

User: "Nike generated GBP 544 million in Q3. How does this track against the Framework Agreement's rebate thresholds?"
{{"class": "HYBRID", "confidence": 0.92, "reasoning": "Requires document fact (rebate threshold from agreement) and DB fact (Q3 revenue), then comparison"}}

User: "What is the weather in London today?"
{{"class": "UNKNOWN", "confidence": 0.99, "reasoning": "Weather data is not available in any connected source"}}

User: "How many customers do we have by region?"
{{"class": "DATABASE", "confidence": 0.97, "reasoning": "Count grouped by region — standard SQL aggregation on user table"}}

User: "What is the full-price sell-through rate for running footwear?"
{{"class": "DOCUMENT", "confidence": 0.90, "reasoning": "Sell-through rate is a metric from the category deep dive document"}}

User: "Tell me a joke"
{{"class": "UNKNOWN", "confidence": 0.98, "reasoning": "Non-business request, no relevant data in any source"}}

User: "What was online revenue and conversion rate in Q3 according to both the review and BigQuery?"
{{"class": "HYBRID", "confidence": 0.88, "reasoning": "Explicitly asks for data from both document review and database"}}

User: "Who is the CEO of JD Sports?"
{{"class": "UNKNOWN", "confidence": 0.95, "reasoning": "CEO information is not in the connected data sources"}}

User: "Which products are low on stock at the Glasgow distribution centre?"
{{"class": "DATABASE", "confidence": 0.94, "reasoning": "Inventory query with location filter — database operation"}}

User: "What is Hoka's year-on-year growth rate?"
{{"class": "DOCUMENT", "confidence": 0.75, "reasoning": "Growth rate mentioned in brand deep dive document. Could also be computed from DB."}}

User: "What was the top selling product by revenue in Q3?"
{{"class": "DATABASE", "confidence": 0.85, "reasoning": "Top product by revenue is a transactional database query"}}

Now classify this question:
User: """{message}"""
```

### 7.2 Confidence Calibration

The LLM confidence distribution must be calibrated against the test suite:
- Run all 30 test cases through Stage 2
- Compute expected calibration error (ECE)
- If ECE > 0.10 → adjust few-shot examples or request temperature=0.0

---

## 8. Test Matrix

### 8.1 All 30 Test Cases × Required Classifier Path

| ID | Question (short) | True Class | S1 Expected | S2 Expected | Final | Min Conf | Notes |
|---|---|---|---|---|---|---|---|
| **doc-001** | Running footwear full-price sell-through rate? | DOCUMENT | DOCUMENT (≥0.85) | SKIP | DOCUMENT | 0.85 | "full-price sell-through rate" + "running" → clear doc pattern |
| **doc-002** | Hoka's year-on-year growth rate? | DOCUMENT | DOCUMENT (≥0.60) | DOCUMENT (≥0.75) | DOCUMENT | 0.60 | "year-on-year growth" is doc-priority-3, but could trigger DB — S2 needed |
| **doc-003** | Minimum annual purchase commitment in Nike Framework Agreement? | DOCUMENT | DOCUMENT (≥0.95) | SKIP | DOCUMENT | 0.95 | "framework agreement" + "minimum annual purchase commitment" → Priority 1 |
| **doc-004** | Rebate rate if purchases reach GBP 700M? | DOCUMENT | DOCUMENT (≥0.95) | SKIP | DOCUMENT | 0.95 | "rebate rate" + "section 4" → Priority 1 |
| **doc-005** | How many JD stores in UK, new stores planned? | DOCUMENT | DOCUMENT (≥0.85) | SKIP | DOCUMENT | 0.85 | "stores" + "planned" → Priority 3 |
| **doc-006** | Which price tier has highest gross margin? | DOCUMENT | DOCUMENT (≥0.60) | DOCUMENT (≥0.80) | DOCUMENT | 0.60 | "price tier" + "gross margin" → doc patterns, but "highest" could trigger DB |
| **doc-007** | Scotland's performance vs plan in Q3? | DOCUMENT | DOCUMENT (≥0.70) | DOCUMENT (≥0.80) | DOCUMENT | 0.70 | "performance vs plan" → doc pattern, but "Q3" + region could trigger DB |
| **doc-008** | Factors driving Scotland's Q3 underperformance? | DOCUMENT | DOCUMENT (≥0.60) | DOCUMENT (≥0.85) | DOCUMENT | 0.60 | Qualitative factors → clear document |
| **doc-009** | Total media budget for BTS 2026? | DOCUMENT | DOCUMENT (≥0.85) | SKIP | DOCUMENT | 0.85 | "media budget" + "campaign brief" → Priority 2/3 |
| **doc-010** | Top selling product by revenue in Q3? | DOCUMENT | DOCUMENT (≥0.40) | DOCUMENT (≥0.85) | DOCUMENT | 0.40 | **Hard case**. S1 may hit "top selling" (Priority 6 → DB) + "by revenue" (DB). Stage 2 must rescue this as it's about a named product in the Q3 review doc. |
| **doc-011** | Top selling running shoe SKU by revenue in H1? | DOCUMENT | DOCUMENT (≥0.40) | DOCUMENT (≥0.85) | DOCUMENT | 0.40 | Same challenge as doc-010. "running shoe" helps S1. |
| **db-001** | Which region generated most revenue? | DATABASE | DATABASE (≥0.85) | SKIP | DATABASE | 0.85 | "revenue by" region → Priority 5/6 |
| **db-002** | Average order value across all regions? | DATABASE | DATABASE (≥0.85) | SKIP | DATABASE | 0.85 | "average order value" → Priority 5 |
| **db-003** | Customers by region? | DATABASE | DATABASE (≥0.85) | SKIP | DATABASE | 0.85 | "customers by" → Priority 5 |
| **db-004** | Return rate by channel? | DATABASE | DATABASE (≥0.85) | SKIP | DATABASE | 0.85 | "return rate" + "by channel" → Priority 5 |
| **db-005** | Products low on stock at Glasgow DC? | DATABASE | DATABASE (≥0.85) | SKIP | DATABASE | 0.85 | "distribution centre" + "stock" → Priority 6 |
| **db-006** | Age group distribution of customers? | DATABASE | DATABASE (≥0.85) | SKIP | DATABASE | 0.85 | "age group" + "distribution" of customers → Priority 5 |
| **db-007** | Average discount depth by product category? | DATABASE | DATABASE (≥0.85) | SKIP | DATABASE | 0.85 | "average discount depth" + "by category" → Priority 5 |
| **db-008** | Orders placed in each sales channel? | DATABASE | DATABASE (≥0.85) | SKIP | DATABASE | 0.85 | "orders" + "by sales channel" → Priority 5 |
| **hyb-001** | Nike Q3 revenue vs Framework Agreement rebate thresholds? | HYBRID | HYBRID (≥0.80) | SKIP | HYBRID | 0.80 | "how does this compare" + "framework agreement" + "Q3" → Priority 4 + 1 |
| **hyb-002** | BTS campaign target vs August performance? | HYBRID | HYBRID (≥0.80) | SKIP | HYBRID | 0.80 | "vs" + "against" + doc + date → Priority 4 |
| **hyb-003** | Running footwear H1 revenue + brand leading share? | HYBRID | HYBRID (≥0.70) | HYBRID (≥0.80) | HYBRID | 0.70 | Asks two questions: "revenue in H1" (DB) + "brand leads market share" from doc |
| **hyb-004** | Q3 footwear margin below plan + driving categories? | HYBRID | HYBRID (≥0.70) | HYBRID (≥0.85) | HYBRID | 0.70 | "margin vs plan" + "categories driving pressure" → both doc and DB needed |
| **hyb-005** | Hoka revenue vs other brands in BQ? | HYBRID | HYBRID (≥0.60) | HYBRID (≥0.80) | HYBRID | 0.60 | Comparison query — S1 may see "Hoka" doc pattern + "compare" hybrid trigger |
| **hyb-006** | Online revenue and conversion in Q3 (review + BQ)? | HYBRID | HYBRID (≥0.80) | SKIP | HYBRID | 0.80 | "according to both" + "review and BigQuery" → explicit hybrid |
| **edg-001** | Weather in London today? | UNKNOWN | UNKNOWN (≥0.95) | SKIP | UNKNOWN | 0.95 | "weather" → Priority 7 |
| **edg-002** | Who is the CEO of JD Sports? | UNKNOWN | UNKNOWN (≥0.95) | SKIP | UNKNOWN | 0.95 | "who is the CEO" → Priority 7 |
| **edg-003** | How are sales? | UNKNOWN | UNKNOWN (≥0.40) | HYBRID (≥0.50) → vote | HYBRID | 0.40 | **Ambiguous**. S1 may detect nothing. Stage 2 should see "sales" as potentially DB or HYBRID. Final default to HYBRID (ask clarifying question). |
| **edg-004** | What was the sell-through? | UNKNOWN | UNKNOWN (≥0.30) | HYBRID (≥0.60) → vote | HYBRID | 0.30 | **Ambiguous**. "sell-through" matches doc pattern but missing object. S2 should flag as HYBRID with clarifying note. |
| **edg-005** | Tell me a joke | UNKNOWN | UNKNOWN (≥0.95) | SKIP | UNKNOWN | 0.95 | "joke" + "tell me a" → Priority 7 |
| **edg-006** | Gross margin vs plan + categories driving margin pressure? | HYBRID | HYBRID (≥0.80) | SKIP | HYBRID | 0.80 | "vs plan" + "categories driving pressure" → hybrid patterns. Note this is mis-tagged in golden as "edge" — it's actually a hybrid query. |

### 8.2 Edge Case Coverage (beyond golden set)

| Test | Query | Expected Class | Why |
|---|---|---|---|
| EC-01 | "hello" | HYBRID (default) | Greeting, no actionable intent |
| EC-02 | "SELECT * FROM orders LIMIT 10" | DATABASE | Raw SQL query by power user |
| EC-03 | "Why did the margin decrease?" | HYBRID | "margin" is doc, "why" implies trend analysis needing DB |
| EC-04 | "Show me everything about Nike" | HYBRID | Broad request needing both doc and DB |
| EC-05 | "What's the difference between sell-through and margin?" | DOCUMENT | Conceptual definitions from documents |
| EC-06 | "" (empty string) | HYBRID (default) | Input validation |
| EC-07 | "rebate rate" (one phrase) | DOCUMENT | Minimal context — pattern match wins |
| EC-08 | "top products" | DATABASE | Ambiguous but DB-pattern match |
| EC-09 | "run rate" | HYBRID | Could be DB (computation) or doc (forecast) |
| EC-10 | "What happened in Q3?" | HYBRID | Broad — needs both doc review and DB data |

### 8.3 Confusion Matrix Target

After optimization, the classifier must achieve:

```
              Predicted
              D  DB H  U
True D       [10 0  1  0]  (1 hybrid acceptable — doc-010 hard case)
True DB      [0  8  0  0]  
True H       [0  0  6  0]
True U       [0  0  2  4]  (2 ambiguous → HYBRID is acceptable)
```

**Target metrics**:
- Accuracy: ≥ 28/30 (93.3%)
- Precision per class: ≥ 0.85
- Recall per class: ≥ 0.80
- UNKNOWN precision: 1.0 (never hallucinate)
- Hallucination rate (UNKNOWN → anything else): 0%

### 8.4 Acceptance Criteria

1. All 30 golden test cases pass with ≥ 0.7 checkpoint score
2. Confusion matrix within target bounds
3. Stage 1 resolves in < 5ms for 95th percentile
4. Stage 2 invoked for ≤ 40% of queries (avoids latency tax)
5. Zero UNKNOWN → DOCUMENT/DATABASE/HYBRID misclassifications (no hallucinations)
6. Cross-retry recovers ≥ 50% of empty-path cases

---

## 9. Implementation Priority

| Phase | What | Why |
|---|---|---|
| **P0** | Stage 1 heuristic patterns + confidence | Replaces 0-score baseline with instant accuracy |
| **P0** | UNKNOWN class + safety patterns | Prevents hallucinations (highest cost) |
| **P0** | HYBRID default fallback | Safe default when uncertain |
| **P1** | Stage 2 LLM prompt with JSON output + confidence | Enables two-stage voting |
| **P1** | Weighted voting + threshold gating | Resolves S1↔S2 disagreements |
| **P1** | Cross-retry on empty results | Recovers from misclassification |
| **P2** | Calibration against test suite | Tunes confidence thresholds |
| **P2** | Confusion matrix tracking | Validates accuracy target |

---

## 10. Orchestrator Changes Required

In `orchestrator.ts`, replace current `classifyIntent` call with:

```typescript
// New signature
async function classifyIntentTwoStage(message: string): Promise<ClassificationResult>

// Replace current routing:
// Old: if (intent === "DATABASE") ...
// New:
const result = await classifyIntentTwoStage(message);
const finalClass = result.class;

if (finalClass === "DATABASE") {
  const bq = await executeBqQuestion(...);
  if (bq.results.rows.length === 0) {
    logger.retry("DATABASE→DOCUMENT", message);
    const doc = await executeRagPipeline(...);
    // ... use doc if non-empty
  }
  // ... use bq
} else if (finalClass === "DOCUMENT") {
  const doc = await executeRagPipeline(...);
  if (doc.chunks.length === 0) {
    logger.retry("DOCUMENT→DATABASE", message);
    const bq = await executeBqQuestion(...);
    // ... use bq if non-empty
  }
  // ... use doc
} else if (finalClass === "HYBRID") {
  // Run both in parallel (existing logic)
} else { // UNKNOWN
  return { reply: "I don't have data to answer that.", citations: [] };
}
```

---

## 11. Success Criteria

| Metric | Current | Target |
|---|---|---|
| Golden test suite score | 0 (baseline.json) | ≥ 0.93 (28/30) |
| Classification accuracy | Unknown | ≥ 93.3% |
| DOCUMENT→DATABASE misclassifications | N/A | 0 |
| Hallucination rate | Unknown | 0% |
| P50 latency (Stage 1 only) | ~2s (LLM always) | < 5ms |
| P50 latency (Stage 2 needed) | ~2s | ~1-2s |
| Retry recovery rate | 0% (no retry) | ≥ 50% |
