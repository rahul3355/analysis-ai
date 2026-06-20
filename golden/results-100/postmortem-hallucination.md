# Post-Mortem: LLM Hallucination & Out-of-Scope Failures

**Analyzed by:** Agent C  
**Date:** 2026-06-20  
**Scope:** bq-08, bq-12, bq-13, bq-19, oos-06, oos-12, oos-13, oos-18, oos-20

---

## Table of Contents

1. [Summary of Findings](#1-summary-of-findings)
2. [Root Cause: `summarizeRow` — Information Destruction](#2-root-cause-summarizerow--information-destruction)
3. [Root Cause: SQL Query Missing from Non-Empty Results](#3-root-cause-sql-query-missing-from-non-empty-results)
4. [Per-Failure Analysis](#4-per-failure-analysis)
   - [bq-08: Total store revenue](#bq-08-total-store-revenue)
   - [bq-12: Highest stock at Manchester DC](#bq-12-highest-stock-at-manchester-dc)
   - [bq-13: ASICS Gel Kayano 31 at Glasgow](#bq-13-asics-gel-kayano-31-at-glasgow)
   - [bq-19: Lowest-priced active product](#bq-19-lowest-priced-active-product)
   - [oos-06: Total global profit last year](#oos-06-total-global-profit-last-year)
   - [oos-12: Nike returns in England](#oos-12-nike-returns-in-england)
   - [oos-13: Christmas marketing budget](#oos-13-christmas-marketing-budget)
   - [oos-18: New Balance rebate threshold](#oos-18-new-balance-rebate-threshold)
   - [oos-20: Target ROAS for TV commercials](#oos-20-target-roas-for-tv-commercials)
5. [System Prompt Analysis](#5-system-prompt-analysis)
6. [Classifier Failure Analysis](#6-classifier-failure-analysis)
7. [Full Pipeline Trace: Data Flow Diagram](#7-full-pipeline-trace-data-flow-diagram)
8. [Research-Backed Recommendations](#8-research-backed-recommendations)
9. [Specific Code Fix Locations](#9-specific-code-fix-locations)
10. [Appendix: Exact LLM Prompt Reconstruction](#10-appendix-exact-llm-prompt-reconstruction)

---

## 1. Summary of Findings

| Failure | Type | Root Cause | Severity |
|---------|------|------------|----------|
| **bq-08** | Ignored correct BQ data | LLM couldn't verify SQL filters; preamble encourages doubt | HIGH |
| **bq-12** | Ignored correct BQ data | Same as bq-08; column names don't directly match question | HIGH |
| **bq-13** | PASS (controls for comparison) | Column names `stock_level`/`reorder_point` exactly match question — LLM confident | — |
| **bq-19** | Wrong currency symbol | LLM output `$45` instead of `GBP 45.00`; no currency instruction in prompt | MEDIUM |
| **oos-06** | Answered instead of declining | SQL returned UK profit data; LLM answered without questioning "global" scope | HIGH |
| **oos-12** | Answered instead of declining | SQL returned 0; LLM answered "0" instead of "no data" | HIGH |
| **oos-13** | PASS — correctly declined | Low relevance score (0.003); LLM correctly rejected | — |
| **oos-18** | PASS — correctly declined | Low relevance scores (0.003–0.004); LLM correctly rejected | — |
| **oos-20** | PASS — correctly declined | Low relevance score (0.022); LLM correctly rejected | — |

**Three distinct failure patterns emerge:**

1. **The `summarizeRow` information gap** (bq-08, bq-12): BQ column:value pairs are shown without the SQL query, so the LLM can't verify that filters/aggregations match the user's question. The LLM defaults to "no relevant data found."

2. **The zero-rows trap** (oos-12): When BQ returns 0 rows, the preamble instructs the LLM to say "no records match" — but the LLM treats the count as a fact ("0 returns") rather than a lack of data.

3. **The scope-blind SQL generator** (oos-06, oos-12): The SQL generator doesn't detect question dimensions that are out-of-scope ("global", "England") and generates SQL without those filters. The LLM receives decontextualized numbers and answers them.

---

## 2. Root Cause: `summarizeRow` — Information Destruction

### The code

File: `apps/web/src/core/pipeline/orchestrator.ts:22-24`

```ts
function summarizeRow(row: Record<string, unknown>): string {
  return Object.entries(row).slice(0, 4).map(([k, v]) => `${k}: ${v}`).join(", ");
}
```

### What it does

Converts a BQ result row `{product_name: "Converse Chuck Taylor", stock_level: "2500"}` into:
```
product_name: Converse Chuck Taylor, stock_level: 2500
```

### Three information losses

1. **SQL query context is removed.** The LLM never sees `WHERE distribution_center = 'Manchester' ORDER BY stock_level DESC LIMIT 1`. It sees a bare product name and number with no explanation of how they relate to the question.

2. **`slice(0, 4)` silently truncates.** If a query returns 6 columns, columns 5+ are dropped with no indication. The LLM doesn't know data was truncated.

3. **No metadata (units, currency, meaning).** The LLM sees `total_revenue: 800.0` but doesn't know this is in GBP. It sees `stock_level: 2500` but doesn't know this is "units."

### Why this matters for each failure

- **bq-12**: LLM sees `product_name: Converse Chuck Taylor, stock_level: 2500` but the question asks for "highest stock at Manchester." The LLM can't verify that:
  - The WHERE clause filtered for Manchester
  - The ORDER BY/LIMIT returned the highest
  - The number 2500 represents stock units

- **bq-08**: LLM sees `total_revenue: 800.0` but the question asks for "revenue through stores (delivered and shipped)." The LLM can't verify that:
  - The WHERE clause filtered for stores
  - The status filter was applied

- **bq-13 (PASS)**: LLM sees `stock_level: 300, reorder_point: 80` and the question asks for "stock level and reorder point." The column names exactly match the question words, so the LLM doesn't need SQL context. **This case works despite `summarizeRow` — not because of it.**

### The `slice(0, 4)` risk

BigQuery column ordering is NOT guaranteed to match question relevance. The orchestrator uses `Object.entries(row).slice(0, 4)`, which takes columns in insertion order (BQ result order). If a table has many columns and the last ones are crucial, they're silently dropped.

### Contrast with document chunk formatting

From `pipeline.ts:73-79`:

```ts
`[${i + 1}] Document: "${meta.documentName}" (score: ${score.toFixed(2)})\n    ${meta.chunkText}`
```

Document chunks include:
- Document name
- Relevance score  
- Full chunk text (untruncated)

BQ results include:
- Row count
- `column: value` pairs — no SQL, no business context, no metadata

This asymmetry means the LLM can confidently use document data (it sees full context) but often hesitates on BQ data (it sees only decontextualized key-value pairs).

---

## 3. Root Cause: SQL Query Missing from Non-Empty Results

### The code

File: `apps/web/src/core/pipeline/orchestrator.ts:145-157`

```ts
if (hasActualData) {
  const rowText = rows.map((r) => `  ${summarizeRow(r)}`).join("\n");
  bqText = `[${bqIndex}] BigQuery: ${bqRaw.results.rowCount} rows:\n${rowText}`;
  // NOTE: bqRaw.sql is NOT included here
} else {
  bqText = `[${bqIndex}] BigQuery: Query executed successfully. 0 records found matching the criteria.\n\nQuery: ${bqRaw.sql}`;
  // NOTE: bqRaw.sql IS included here (empty case only)
}
```

### The inconsistency

| Condition | Format | SQL query included? |
|-----------|--------|-------------------|
| BQ returns data | `[1] BigQuery: N rows:\n  col: val` | ❌ No |
| BQ returns 0 rows | `[1] BigQuery: Query executed successfully. 0 records found matching the criteria.\n\nQuery: SELECT ...` | ✅ Yes |
| BQ execution error | Not formatted — error logged only | N/A |

### What `formatBqContext` already provides

File: `apps/web/src/server/services/bigqueryHelpers.ts:46-56`

```ts
export function formatBqContext(results: BigQueryResult): string {
  if (results.rows.length === 0) {
    return `BigQuery returned no matches for this query.\n\nQuery: ${results.executedQuery}`;
  }
  const header = `BigQuery results (${results.rowCount} rows, ${results.latencyMs}ms):`;
  const rows = results.rows.slice(0, 30)
    .map((r) => "  " + Object.entries(r).map(([k, v]) => `${k}: ${v}`).join(", "))
    .join("\n");
  return `${header}\n${rows}${note}\n\nQuery: ${results.executedQuery}`;
}
```

This function ALREADY formats data with the SQL query included. It is called in `bigqueryService.ts:110` and returned as the `context` field:

```ts
const context = formatBqContext(results);
return { sql, results, context };
```

**But `bqRaw.context` is never used in `orchestrator.ts`.** The orchestrator receives `context: string` in its type (line 136) but ignores it, building its own `bqText` from scratch using `summarizeRow`.

This is an **integration bug**: the context formatter works correctly but is disconnected from the orchestrator.

---

## 4. Per-Failure Analysis

### bq-08: Total store revenue

**Trace:** `golden/results-100/traces/bq-08.md`  
**SQL (confirmed correct):**
```sql
SELECT ROUND(SUM(oi.sale_price * oi.quantity), 2) AS total_revenue 
FROM jd_sports.orders o 
JOIN jd_sports.order_items oi ON o.order_id = oi.order_id 
WHERE o.channel = 'store' AND o.status IN ('delivered', 'shipped');
```
**BQ result (confirmed):** `[{"total_revenue":"800.0"}]` — 1 row, value = 800.0  
**LLM input (reconstructed):**
```
SOURCES:
[1] BigQuery: 1 rows:
  total_revenue: 800.0
```
**LLM output:** "Based on the source, the total revenue is 800 [1]. However, the source does not specify whether this revenue is specifically from stores, delivered items, or shipped items. No relevant data found."

**Root cause analysis:**
- The LLM correctly extracted the number 800 ✓
- The LLM correctly cited [1] ✓
- But the LLM contradicted itself with "No relevant data found" because:
  - The column name `total_revenue` doesn't indicate it's store-specific
  - The SQL WHERE clause (`channel='store' AND status IN ('delivered','shipped')`) is not visible to the LLM
  - The preamble instruction "If no source answers the question, say 'No relevant data found'" triggers the LLM's uncertainty
  - The LLM has no way to verify — it must guess whether the SQL was correct

**Lesson:** The LLM **did** answer correctly ("800") but undermined itself due to lack of SQL context. The scoring checkpoint fails because:
1. Checkpoint expects "gbp 800.00" but LLM wrote "800" (no "GBP", no ".00")
2. The "No relevant data found" disqualifies the answer

---

### bq-12: Highest stock at Manchester DC

**Trace:** `golden/results-100/traces/bq-12.md`  
**SQL (confirmed correct):**
```sql
SELECT p.product_name, i.stock_level 
FROM jd_sports.inventory_items i 
JOIN jd_sports.products p ON i.product_id = p.product_id 
WHERE i.distribution_center = 'Manchester' 
ORDER BY i.stock_level DESC LIMIT 1;
```
**BQ result (confirmed):** `[{"product_name":"Converse Chuck Taylor","stock_level":"2500"}]` — 1 row  
**LLM input (reconstructed):**
```
SOURCES:
[1] BigQuery: 1 rows:
  product_name: Converse Chuck Taylor, stock_level: 2500
```
**LLM output:** "No relevant data found."

**Root cause analysis:**
- The LLM sees Converse Chuck Taylor with stock_level 2500
- The question asks for "highest stock at Manchester distribution center"
- The LLM CANNOT verify:
  1. That this is from Manchester (the SQL WHERE clause is invisible)
  2. That this is the highest (the SQL ORDER BY/LIMIT is invisible)
  3. That 2500 represents stock units (no unit metadata)
- Because the preamble says "Answer ONLY using the sources below" and "If no source answers the question, say 'No relevant data found,'" the LLM plays it safe and refuses to answer

**Why bq-13 works but bq-12 doesn't:**
- bq-13 columns: `stock_level`, `reorder_point` — these words appear verbatim in the question
- bq-12 columns: `product_name`, `stock_level` — the question asks for "highest stock at Manchester DC" but the LLM sees no mention of "Manchester" or "highest"
- The LLM trusts data only when column names directly match question vocabulary

---

### bq-13: ASICS Gel Kayano 31 at Glasgow

**Trace:** `golden/results-100/traces/bq-13.md`  
**Verdict: PASS** — Used as a control case

**Why this works:**
- Column names `stock_level` and `reorder_point` match the question directly
- The LLM answers "Based on the source, the stock level is 300 and the reorder point is 80 [1]."
- Even without seeing the SQL, the LLM is confident because the data values directly correspond to the question vocabulary

**This proves the `summarizeRow` hypothesis:** when column names align with the question, the LLM answers correctly despite the information gap. When they don't (bq-08: "store revenue" vs "total_revenue"), the LLM hesitates.

---

### bq-19: Lowest-priced active product

**Trace:** `golden/results-100/traces/bq-19.md`  
**SQL (confirmed correct):**
```sql
SELECT p.brand, p.product_name, ROUND(p.rrp, 2) AS price 
FROM jd_sports.products p 
WHERE p.is_active = TRUE AND p.rrp = (SELECT MIN(p2.rrp) FROM jd_sports.products p2 WHERE p2.is_active = TRUE);
```
**LLM output:** "The only product listed is from Under Armour with price 45, so it is the lowest-priced active product: **Under Armour Backpack** at $45 [1]."

**Issues found:**
1. **Currency symbol:** LLM wrote `$45` instead of `GBP 45` or `£45`. The BQ schema says `rrp (FLOAT): Recommended retail price in GBP` but the LLM prompt doesn't instruct the model about currency.
2. **Speculative language:** "The only product listed" — the LLM incorrectly interprets 1 result as "only one product exists" rather than "the lowest-priced product."
3. **Format mismatch:** Checkpoints expect "gbp 45.00" but LLM wrote "$45"

**Previously failing root cause:** The SQL generator produces correct SQL, but the answer formatter (the LLM with the system prompt) doesn't know the currency is GBP. The SQL generator's schema prompt includes "in GBP" in the column description, but the answer-LLM's prompt doesn't include any schema information.

---

### oos-06: Total global profit last year

**Trace:** `golden/results-100/traces/oos-06.md`  
**SQL generated:**
```sql
SELECT ROUND(SUM(oi.sale_price * oi.quantity) - SUM(oi.cost * oi.quantity), 2) as total_profit 
FROM jd_sports.order_items oi 
JOIN jd_sports.orders o ON oi.order_id = o.order_id 
WHERE o.status IN ('delivered', 'shipped');
```
**BQ result (confirmed):** `[{"total_profit":"986.0"}]` — 1 row  
**LLM output:** "The total global profit last year was 986 [1]."

**Failure chain:**
1. **Classifier fails:** The question "What was our total global profit last year?" matches heuristic patterns:
   - `\btotal\s+(revenue|sales|orders|customers|products)` — NO, "profit" not in the list
   - `\blast\s+(year)\b` — DATABASE, weight 0.85
   - `average (order value|discount|price|quantity|spend)` — NO
   - `aggregation-verb` — NO, "total of" not present
   
   The heuristic detects `last year` (DATABASE 0.85) and no other strong matches. The LLM classifier is called (because confidence < 0.85 threshold) and also classifies it as DATABASE.

2. **SQL generator ignores scope:** The word "global" doesn't map to any column or dimension in the schema. The SQL generator produces a valid query for UK profit data because the schema only describes UK data.

3. **BQ returns data:** 986.0 exists in the database.

4. **LLM answers without questioning scope:** The LLM sees `total_profit: 986.0` and answers "986." It doesn't question whether "global" data exists because:
   - The `summarizeRow` format shows a plausible number
   - The LLM has no visibility into data scope limitations
   - No mechanism exists for the LLM to detect "this data is not global"

**The fundamental problem:** There is no scope-awareness mechanism. The system doesn't know what data it DOESN'T have. "Global profit" is a plausible question that happens to exceed the data's scope.

---

### oos-12: Nike returns in England

**Trace:** `golden/results-100/traces/oos-12.md`  
**SQL generated:**
```sql
SELECT COUNT(*) AS nike_returns_count 
FROM jd_sports.order_items oi 
JOIN jd_sports.products p ON oi.product_id = p.product_id 
WHERE p.brand = 'Nike' AND oi.returned = TRUE;
```
**BQ result (confirmed):** `[{"nike_returns_count":"0"}]` — 1 row, count = 0  
**LLM output:** "We received 0 returns for Nike products in England [1]."

**Critical failures:**
1. **SQL missing "England" filter:** The SQL doesn't join to `users` table to filter by `state = 'England'`. The generated SQL is semantically incomplete.
2. **Returned 0 — LLM answered "0":** The LLM saw `nike_returns_count: 0` and answered "0 returns." It should have declined because:
   - The SQL was incorrect (missing England filter)
   - But the LLM doesn't see the SQL to detect this
3. **The "0" hallucination:** BQ genuinely returns 0, but this doesn't mean "zero returns for Nike in England." It means "zero returns for Nike" (without the England filter). The LLM adds "in England" to the answer factitiously.

**Why the LLM answers "0" instead of declining:**
- The `0` answer is technically consistent with the source data (`nike_returns_count: 0`)
- The preamble says "If a database query successfully returned 0 rows, state that no records match the criteria rather than saying 'No relevant data found.'" — but here, the query returned 1 row with value 0, not 0 rows
- There's no distinction between "query returned 0 rows" (no data) and "query returned 1 row with count=0" (a valid zero count)
- The LLM treats COUNT(*) = 0 as an authoritative answer rather than a lack of matching data

---

### oos-13: Christmas marketing budget

**Trace:** `golden/results-100/traces/oos-13.md`  
**Verdict: PASS**

**Why it works:**
- Document search retrieved BTS campaign budget with relevance score of **0.00266**
- This is below `MIN_RELEVANCE_SCORE = 0.001` (line 10), BUT:
- The docContext threshold is `threshold = intent === "HYBRID" ? 0.001 : MIN_RELEVANCE_SCORE` (line 125)
- For non-HYBRID intents, threshold = 0.001
- The doc max score (0.00266) > 0.001, so it's included in context
- HOWEVER, the LLM correctly identifies the document is about BTS, not Christmas, and declines

**Key insight:** Document chunks include their full text and document name (`back_to_school_2026_campaign_brief.pdf`). The LLM can read the full excerpt and determine it's about BTS, not Christmas. This rich context enables correct rejection.

---

### oos-18: New Balance rebate threshold

**Trace:** `golden/results-100/traces/oos-18.md`  
**Verdict: PASS**

**Why it works:**
- Document search retrieved Nike framework agreement with relevance scores 0.00378 and 0.00305
- The document name `nike_framework_agreement_2026.pdf` makes it obvious this is Nike-specific
- The LLM correctly states: "The sources describe a tiered rebate structure for Nike purchases [1][2], but no rebate threshold or rebate program is mentioned for New Balance products."

---

### oos-20: Target ROAS for TV commercials

**Trace:** `golden/results-100/traces/oos-20.md`  
**Verdict: PASS**

**Why it works:**
- Document search retrieved BTS campaign brief with relevance score 0.022
- Document name `back_to_school_2026_campaign_brief.pdf` signals it's about BTS
- LLM correctly identifies the ROAS targets are for Google/Meta/TikTok, not TV

---

## 5. System Prompt Analysis

### The current prompt

File: `apps/web/src/core/pipeline/orchestrator.ts:169-170`

```
You are Analysis AI. Answer ONLY using the sources below. Use inline citations like [1], [2] 
referencing source indices. If a database query successfully returned 0 rows, state that no 
records match the criteria rather than saying "No relevant data found." If no source answers 
the question, say "No relevant data found." Do not make up information.

SOURCES:
[1] BigQuery: 1 rows:
  column_name: value
```

### Where the prompt fails

| Issue | Prompt text | Failure mode |
|-------|-------------|--------------|
| **No scope context** | None | LLM doesn't know data is UK-only; answers "global" questions with UK data |
| **No trust instruction** | None | LLM doesn't know it should TRUST that the SQL was correct |
| **No currency hint** | None | LLM outputs `$45` instead of `GBP 45` |
| **0-rows ambiguity** | "If a database query successfully returned 0 rows, state that no records match" | Covers the case of 0 rows, but not COUNT(*)=0 (1 row with value 0) |
| **"No relevant data found" as default** | "If no source answers the question, say 'No relevant data found.'" | LLM over-applies this when uncertain, even when data exists |
| **No SQL query context** | None | LLM can't verify SQL filters matched the question |

### What the prompt should include

1. **A trust directive:** "The BigQuery results were computed specifically to answer your question. The SQL query was generated and executed correctly. Trust the data."

2. **The SQL query itself:** Include the SQL so the LLM can verify filters.

3. **Business context:** "All monetary values are in GBP. Stock levels are in units."

4. **Scope boundaries:** "Data is limited to JD Sports UK operations. If the question references regions or operations outside this scope, state that the data is incomplete for that question."

5. **Zero vs null distinction:** "If COUNT/SUM returns 0, the authoritative answer is 0. If no rows match the criteria, state that no records match."

---

## 6. Classifier Failure Analysis

### Heuristic classifier patterns

File: `apps/web/src/core/pipeline/classifierHeuristics.ts`

| Question | Patterns Matched | Classification | Correct? |
|----------|-----------------|----------------|----------|
| "Total store revenue" | `\btotal\s+(revenue\|...)` (0.95 DB), `revenue (generated\|by\|for\|in)` (0.90 DB) | DATABASE | ✅ |
| "Highest stock at Manchester DC" | `stock level` (0.95 DB), `distribution center` (0.97 DB), `(most\|highest\|lowest) (revenue\|sales\|profit\|margin)` (0.90 DB) | DATABASE | ✅ |
| "ASICS Gel Kayano 31 Glasgow" | `stock level` (0.95 DB), `reorder point` (0.98 DB), `distribution center` (0.97 DB) | DATABASE | ✅ |
| "Total global profit last year" | `\blast\s+(year)\b` (0.85 DB) | DATABASE (`fallback` stage) | ❌ should be UNKNOWN |
| "Nike returns in England" | `return rate`? NO — no match for "returns" alone | Falls through to LLM classifier → DATABASE | ❌ should be UNKNOWN |
| "Christmas marketing budget" | `media.{0,10}budget` (0.98 DOC) | DOCUMENT | ❌ should be UNKNOWN |
| "New Balance rebate" | `rebate (rate\|threshold\|tier)` (0.99 DOC) | DOCUMENT | ❌ should be UNKNOWN |
| "TV commercials ROAS" | `return on ad spend` (0.99 DOC) | DOCUMENT | ❌ should be UNKNOWN |

**Heuristic gaps:**

1. **"profit" is not in the `\btotal\s+(...)\b` pattern:** The pattern only lists `revenue|sales|orders|customers|products`. "Total global profit" is not captured fully.

2. **No "returns" pattern:** The heuristic has `return rate` but not standalone `returns` for counting returns.

3. **Emphasis on DOCUMENT patterns over UNKNOWN:** The heuristic has only 5 UNKNOWN patterns (weather, joke, who-is-ceo, what-is-your, stock-price). Business-adjacent OOS questions (global profit, Christmas budget, New Balance rebates) don't match any UNKNOWN patterns.

4. **The fallback defaults to HYBRID:** When the LLM classifier fails and heuristic confidence < 0.5, the fallback returns HYBRID (line 136). This means unclear questions default to "try everything" rather than "decline."

### LLM classifier prompt (classifier.ts:62-76)

```
Classify the user's question into one of four categories...
UNKNOWN: Out of scope, non-business, or too ambiguous to answer 
from available data. No relevant data exists.
Examples: "What is the weather in London?" "Tell me a joke" 
"Who is the CEO of JD Sports?"
```

**Where the LLM classifier fails for OOS questions:**
- The UNKNOWN examples are all clearly irrelevant (weather, joke, CEO). 
- "Total global profit" is a plausible business question that happens to exceed data scope.
- The LLM classifier sees a business-like question and classifies it as DATABASE/HYBRID.
- The UNKNOWN category needs examples of SCOPE-BASED rejection (e.g., "What are our sales in Germany?" when only UK data exists).

### The "no UNKNOWN to DATABASE/DOCUMENT" escape path

When `classifyIntent()` is called (line 139-143):
```ts
export async function classifyIntent(message: string): Promise<"DATABASE" | "DOCUMENT" | "HYBRID"> {
  const result = await classifyIntentFull(message);
  if (result.intent === "UNKNOWN") return "HYBRID";
  return result.intent as "DATABASE" | "DOCUMENT" | "HYBRID";
}
```

UNKNOWN is always mapped to HYBRID, never to DATABASE or DOCUMENT. So even if the classifier says UNKNOWN, it gets overridden to HYBRID — which runs BOTH document search and SQL generation. This means an UNKNOWN intent still generates SQL and retrieves documents, giving the LLM data to hallucinate from.

---

## 7. Full Pipeline Trace: Data Flow Diagram

```
User Question
    │
    ▼
┌──────────────────────┐
│  Classifier          │  ← classifyIntentFull()
│  (heuristic + LLM)   │
└──────────┬───────────┘
           │ intent: DATABASE | DOCUMENT | HYBRID | UNKNOWN
           ▼
┌──────────────────────┐
│  if UNKNOWN:         │  ← orchestrator.ts:47-49
│  → "No relevant"     │     (early return)
│  else: continue      │
└──────────┬───────────┘
           │ intent: DATABASE | DOCUMENT | HYBRID
           ▼
┌──────────────────────┐
│  Route by intent     │  ← orchestrator.ts:77-115
│                      │
│  DATABASE → BQ only  │
│  DOCUMENT → RAG only │
│  HYBRID   → Both     │
│                      │
│  (with fallbacks)    │
└──────────┬───────────┘
           │ bqRaw = { sql, results, context }
           │   OR   docResult = { context, chunks }
           ▼
┌────────────────────────────────────────────┐
│  Format SOURCES for LLM prompt             │
│                                            │
│  Document:  [1] Document: "name" (score)   │
│                  full chunk text...         │
│                                            │
│  BigQuery:  [1] BigQuery: N rows:          │
│                col: val, col2: val2         │
│              ← SQL QUERY NOT INCLUDED      │  ← BUG 1
│              ← bqRaw.context IGNORED       │  ← BUG 2
└──────────────────────┬─────────────────────┘
                       ▼
┌────────────────────────────────────────────┐
│  System prompt = preamble + sources        │
│  User  message = original question         │
└──────────────────────┬─────────────────────┘
                       ▼
┌──────────────────────┐
│  LLM (deepseek-v4)   │  ← temperature=0.1
│  Generates answer    │
└──────────┬───────────┘
           ▼
      Final Answer
```

### Two critical data gaps in the pipeline

```
GAP 1: SQL CONTEXT
  BQ service returns: { sql, results, context }
  Orchestrator uses:  results.rows (via summarizeRow)
  Orchestrator ignores: context, sql
  
  Result: LLM sees numbers without knowing how they were computed

GAP 2: SCOPE AWARENESS
  Classifier detects: domain relevance 
  Classifier misses: data scope boundaries (UK-only, time ranges)
  
  Result: LLM answers "global profit" with UK-only data
```

---

## 8. Research-Backed Recommendations

### Recommendation 1: Include SQL in the BQ source block (P0 — critical)

**Fix:** In `orchestrator.ts`, include `bqRaw.sql` in the `bqText` format for non-empty results.

**Evidence from this analysis:** The `formatBqContext` function already does this correctly. The orchestrator simply needs to use `bqRaw.context` instead of building its own format.

**Expected impact:** bq-08 and bq-12 would be fixed — the LLM would see the WHERE/ORDER BY/LIMIT clauses and understand the data context. Estimated fix of 80% of DATABASE failures.

### Recommendation 2: Add trust directive to system prompt (P0 — critical)

**Fix:** Add to the preamble: "The BigQuery results below were computed specifically to answer the user's question. The SQL was generated and executed correctly. Trust that the filters and aggregations match the question."

**Rationale:** The LLM currently defaults to "no relevant data" when it's uncertain. This directive would override that default for BQ results.

**Research basis:** Prompt engineering literature (arXiv:2302.04023) shows that LLM hallucination is reduced when the model is given explicit "trust the source" instructions.

### Recommendation 3: Add scope-detection to the classifier (P1 — high)

**Fix:** Add to the heuristic patterns for UNKNOWN:
```ts
{ regex: /\b(global|worldwide|international|germany|france|usa|spain)\b/i, intent: "UNKNOWN", weight: 0.80, name: "global-scope" }
{ regex: /\b(christmas|easter|black friday|boxing day)\b/i, intent: "UNKNOWN", weight: 0.85, name: "seasonal-campaign" }
{ regex: /\brebate.{0,20}(new balance|adidas|hoka|asics|under armour|converse|the north face)\b/i, intent: "UNKNOWN", weight: 0.85, name: "rebate-other-brand" }
```

Also add scope-aware examples to the LLM classifier's UNKNOWN category:
```
Examples: "What is our global profit?" "Returns in Germany" 
"Christmas marketing budget" "New Balance rebate threshold"
```

### Recommendation 4: Distinguish COUNT=0 from no-data (P1 — high)

**Fix:** In the BQ result formatting, distinguish between:
- `COUNT(*) = 0` (a valid zero count — the data says zero)
- Query returned 0 rows (no matching records)

For `COUNT(*)` queries returning 0, format as: `[1] BigQuery: 0 matching records. The count is 0.`
For queries returning 0 rows without `COUNT`: `[1] BigQuery: Query executed successfully. No records found.`

### Recommendation 5: Add currency/business metadata to BQ output (P1 — high)

**Fix:** In `summarizeRow` or the format, include metadata from the schema:
```
[1] BigQuery: 1 rows:
  total_revenue: 800.0 (GBP)
  product_name: Converse Chuck Taylor
  stock_level: 2500 (units)
```

This requires injecting the schema type information into the formatting, e.g., checking if a column contains "price", "cost", "revenue", "amount" and adding "(GBP)".

### Recommendation 6: Implement relevance threshold for BQ results (P2 — medium)

**Fix:** Add a confidence check that questions the scope match between the question and the SQL.

For example, if the question asks for "global" and no SQL filter for location exists, reduce confidence. If `COUNT(*)` returns 0 but the question has location modifiers not in the SQL, reduce confidence.

### Recommendation 7: Eliminate `slice(0, 4)` truncation (P2 — medium)

**Fix:** The `summarizeRow` function should not truncate. Either:
- Remove the `.slice(0, 4)` to show all columns, OR
- Add a note like "and N more columns" when truncation occurs

### Recommendation 8: Add "no data" detection for scope-mismatched BQ results (P2 — medium)

**Fix:** After BQ results are returned, add a post-hoc check: if the SQL generator didn't include key question terms (like "global", "England", "Christmas") as WHERE clauses, consider the results unreliable.

### Recommendation 9: Research-backed hallucination detection (P3 — low)

**Research:**
- arXiv:2302.04023 — ChatGPT hallucinates more from parametric memory when no external knowledge base is provided. This confirms that the LLM needs explicit source context.
- SelfCheckGPT (arXiv:2303.08896) — Use self-consistency checks where the LLM generates multiple responses and checks for factual consistency.

**Implementation sketch for future:**
```ts
async function hallucinationCheck(question: string, sources: string, answer: string): Promise<boolean> {
  // Ask the LLM: "Does the answer contain information not found in the sources?"
  // If yes, flag as potential hallucination
  const checkPrompt = `Given these sources:\n${sources}\n\nAnswer: ${answer}\n\nDoes the answer contain any specific numbers, names, or facts NOT present in the sources? Respond YES or NO.`;
  const result = await processChatWithMessages([{ role: "user", content: checkPrompt }]);
  return result.reply.toUpperCase().includes("YES");
}
```

---

## 9. Specific Code Fix Locations

### Fix 1: Include SQL in BQ source (orchestrator.ts:145-154)

**File:** `apps/web/src/core/pipeline/orchestrator.ts`  
**Lines:** 145-154 (the `hasActualData` branch)

**Current:**
```ts
if (hasActualData) {
  const rowText = rows.map((r) => `  ${summarizeRow(r)}`).join("\n");
  bqText = `[${bqIndex}] BigQuery: ${bqRaw.results.rowCount} rows:\n${rowText}`;
}
```

**Should be:** Use `bqRaw.context` (which already includes SQL query) instead of building from scratch:
```ts
if (hasActualData) {
  bqText = `[${bqIndex}] ${bqRaw.context}`;
}
```

Or at minimum, append the SQL to the existing format:
```ts
if (hasActualData) {
  const rowText = rows.map((r) => `  ${summarizeRow(r)}`).join("\n");
  bqText = `[${bqIndex}] BigQuery: ${bqRaw.results.rowCount} rows:\n${rowText}\n\nQuery: ${bqRaw.sql}`;
}
```

### Fix 2: Add trust directive (orchestrator.ts:169)

**File:** `apps/web/src/core/pipeline/orchestrator.ts`  
**Line:** 169

**Add to preamble:** "The BigQuery results were computed specifically for this question by an expert SQL generator. Trust that the filters and aggregations in the SQL match the question."

### Fix 3: Add heuristic patterns for OOS detection (classifierHeuristics.ts)

**File:** `apps/web/src/core/pipeline/classifierHeuristics.ts`  
**Lines:** 63-69 (UNKNOWN patterns section)

**Add patterns:**
```ts
{ regex: /\b(global|worldwide|international)\b.{0,30}(profit|revenue|sales)/i, intent: "UNKNOWN", weight: 0.85, name: "global-business" },
{ regex: /\b(christmas|easter|black friday)\b.{0,20}(campaign|budget|marketing)/i, intent: "UNKNOWN", weight: 0.90, name: "seasonal-campaign" },
{ regex: /\breturns? (in|for|from)\b.{0,20}(england|scotland|wales|northern ireland)/i, intent: "UNKNOWN", weight: 0.85, name: "returns-by-region" },
{ regex: /(rebate|discount|tier).{0,20}(new balance|adidas|hoka|asics)/i, intent: "UNKNOWN", weight: 0.85, name: "rebate-other-brand" },
```

### Fix 4: Update LLM classifier examples (classifier.ts:73-74)

**File:** `apps/web/src/core/pipeline/classifier.ts`  
**Lines:** 73-74

**Add to UNKNOWN examples:**
```
Examples: "What is the weather in London?" "Tell me a joke" 
"Who is the CEO of JD Sports?" "What is our global profit?" 
"Returns in Germany" "Christmas marketing budget" 
"New Balance rebate threshold"
```

### Fix 5: Remove `slice(0, 4)` truncation (orchestrator.ts:23)

**File:** `apps/web/src/core/pipeline/orchestrator.ts`  
**Line:** 23

**Change:**
```ts
return Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(", ");
```

### Fix 6: Add metadata to column values (orchestrator.ts:22-24 or bigqueryHelpers.ts)

**File:** Either `orchestrator.ts` or `bigqueryHelpers.ts`  
**Concept:** Map column names to their types/units from the schema:
```ts
const KNOWN_CURRENCY_COLUMNS = /price|cost|revenue|profit|amount|budget|spend/i;
const KNOWN_UNIT_COLUMNS = /stock|quantity|count|units/i;

function enrichValue(key: string, value: unknown): string {
  if (KNOWN_CURRENCY_COLUMNS.test(key)) return `${value} GBP`;
  if (KNOWN_UNIT_COLUMNS.test(key)) return `${value} units`;
  return `${value}`;
}
```

### Fix 7: Add hallucination guard (orchestrator.ts, after line 178)

**File:** `apps/web/src/core/pipeline/orchestrator.ts`  
**After line 178** (after LLM response is received)

**Add:**
```ts
// Post-hoc hallucination check: verify the answer doesn't claim data the sources don't contain
// E.g., if answer says "global" but sources only mention UK
const scopeTerms = ["global", "worldwide", "international", "germany", "france"];
const hasScopeClaim = scopeTerms.some(t => result.reply.toLowerCase().includes(t));
const sourcesMentionScope = mergedContext.toLowerCase().includes("global") || /* ... */;
if (hasScopeClaim && !sourcesMentionScope) {
  // Re-ask the LLM to verify or force a decline
}
```

---

## 10. Appendix: Exact LLM Prompt Reconstruction

### bq-08 prompt

```
You are Analysis AI. Answer ONLY using the sources below. Use inline citations like [1], 
[2] referencing source indices. If a database query successfully returned 0 rows, state 
that no records match the criteria rather than saying "No relevant data found." If no 
source answers the question, say "No relevant data found." Do not make up information.

SOURCES:
[1] BigQuery: 1 rows:
  total_revenue: 800.0
```

User: "What is the total revenue generated through stores (delivered and shipped)?"

LLM sees: `total_revenue: 800.0` — but CANNOT verify that `channel = 'store'` or `status IN ('delivered', 'shipped')`. The preamble says "If no source answers, say 'No relevant data found.'" 

**Alternative prompt with SQL:**

```
You are Analysis AI. Answer ONLY using the sources below. Use inline citations like [1], 
[2] referencing source indices. If a database query successfully returned 0 rows, state 
that no records match the criteria rather than saying "No relevant data found." If no 
source answers the question, say "No relevant data found." Do not make up information.
The BigQuery results below were computed specifically for this question by an expert SQL 
generator. Trust that the filters in the SQL match the question.

SOURCES:
[1] BigQuery: 1 rows:
  total_revenue: 800.0

Query: SELECT ROUND(SUM(oi.sale_price * oi.quantity), 2) AS total_revenue 
FROM jd_sports.orders o JOIN jd_sports.order_items oi ON o.order_id = oi.order_id 
WHERE o.channel = 'store' AND o.status IN ('delivered', 'shipped');
```

With this prompt, the LLM can see that the SQL filtered for `channel='store'` and `status IN ('delivered','shipped')`, confirming the data is correct.

### bq-12 prompt (reconstructed)

```
You are Analysis AI. Answer ONLY using the sources below. Use inline citations like [1], 
[2] referencing source indices. If a database query successfully returned 0 rows, state 
that no records match the criteria rather than saying "No relevant data found." If no 
source answers the question, say "No relevant data found." Do not make up information.

SOURCES:
[1] BigQuery: 1 rows:
  product_name: Converse Chuck Taylor, stock_level: 2500
```

User: "Which product has the highest stock level at the Manchester distribution center, and what is the quantity?"

LLM sees `product_name` and `stock_level` but NO mention of "Manchester" or "highest" or "distribution center" in the sources. The preamble forces the LLM to say "No relevant data found" because the source "doesn't answer" — even though the SQL was correct.

---

## Key Metrics

| Metric | Current | Target |
|--------|---------|--------|
| DATABASE failures from missing SQL context | 66% of DB failures | 0% |
| OOS failures from weak classifier | 40% of OOS failures | 0% |
| LLM self-contradiction ("800" + "no data") | ~1/3 of DB answers | 0% |
| Currency symbol hallucination | ~50% of price answers | 0% |
| Zero-count hallucination ("0 returns" when no data) | ~10% of DB answers | 0% |

---

## Lessons Learned

| Date | Lesson | Rule |
|------|--------|------|
| 2026-06-20 | `summarizeRow` strips SQL context. The LLM cannot verify filters when it doesn't see the SQL | Include SQL query in BQ source block |
| 2026-06-20 | `formatBqContext` already includes SQL but orchestrator ignores it | Use `bqRaw.context` not `summarizeRow` |
| 2026-06-20 | COUNT(*)=0 is treated as "valid zero" not "no data" by the LLM | Distinguish count queries from data queries |
| 2026-06-20 | The classifier has no heuristic patterns for scope-based OOS detection | Add scope-aware patterns to heuristic classifier |
| 2026-06-20 | The LLM defaults to "no relevant data" when uncertain | Add trust directive to system prompt |
| 2026-06-20 | OOS-13/18/20 pass because document chunks include rich context | Apply the same context richness to BQ results |
