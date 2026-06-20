# Post-Mortem: BigQuery SQL Logic Failures

**Date:** 2026-06-20  
**Author:** Agent A — Post-Mortem Analysis  
**Scope:** bq-10, bq-12, bq-22, hyb-15, hyb-20, hyb-22, hyb-24 (bq-13 excluded — actually PASSES)

---

## Failure 1: bq-10 — Wrong column for returns

### What happened
- **Question:** "How many orders were returned in total, and what is the overall return rate percentage in delivered and shipped orders?"
- **App reply:** "0 returned orders, 0% return rate"
- **Ground truth:** "1 order returned (ORD-020). Return rate is 5.88%."

### Pipeline evidence
```sql
-- Generated SQL (WRONG):
SELECT SUM(IF(o.status = 'returned', 1, 0)) AS total_returned_orders, ...
FROM jd_sports.orders o
WHERE o.status IN ('delivered', 'shipped', 'returned');

-- BQ result: total_returned_orders = 0, return_rate_pct = 0.0

-- Correct SQL:
SELECT COUNTIF(oi.returned = true) as returned_count,
       COUNT(*) as total,
       ROUND(COUNTIF(oi.returned = true) * 100.0 / COUNT(*), 2) as return_rate_pct
FROM jd_sports.order_items oi
JOIN jd_sports.orders o ON oi.order_id = o.order_id
WHERE o.status IN ('delivered', 'shipped');
```

**BQ confirmation:**
- `orders.status` has NO rows with value `'returned'` — statuses are: delivered(15), shipped(2), processing(2), cancelled(1)
- `order_items.returned = true` has exactly 1 row: ORD-020, item returned = `not_as_expected`
- ORD-020 has `orders.status = 'delivered'`, but `order_items.returned = true` — returns happen at item level

### Root cause
`bigquery.ts:46` lists `"returned"` as an allowed value for `orders.status`. This is **wrong** — no orders have `status = 'returned'`. Returns are tracked via `order_items.returned` (BOOL). The schema description for `order_items.returned` at `bigquery.ts:71` is just "Whether item was returned" — too brief to signal it's the canonical return indicator.

Additionally, no golden example in `golden-queries.json` demonstrates return-rate counting using `order_items.returned`.

### Research-backed fix

**1. Schema fix** (`bigquery.ts:46`):
```
- Remove "returned" from orders.status allowedValues
- Change order_items.returned description from "Whether item was returned" to 
  "Whether item was returned — THIS IS THE CANONICAL column for return tracking. 
   Use this with WHERE o.status IN ('delivered', 'shipped') for return rate calculations."
```

**2. Add golden example** (`golden-queries.json`):
```json
{
  "id": "gq-023",
  "question": "how many returned orders and return rate",
  "sql": "SELECT COUNTIF(oi.returned = true) as total_returned, COUNT(*) as total_items, ROUND(COUNTIF(oi.returned = true) * 100.0 / COUNT(*), 2) as return_rate_pct FROM jd_sports.order_items oi JOIN jd_sports.orders o ON oi.order_id = o.order_id WHERE o.status IN ('delivered', 'shipped')"
}
```

**3. Prompt rule** (`bigquerySqlGenerator.ts:76`):
Add: `- IMPORTANT: Returns are tracked in order_items.returned (BOOL), NOT in orders.status. Always join order_items and filter by oi.returned = true.`

### Code location
- `frontend/src/server/config/bigquery.ts:46,71` — schema descriptions
- `frontend/src/server/services/bigquerySqlGenerator.ts:76` — prompt rules
- `golden/golden-queries.json` — add golden example gq-023

---

## Failure 2: bq-12 — Correct BQ data ignored by LLM

### What happened
- **Question:** "Which product has the highest stock level at the Manchester distribution center, and what is the quantity?"
- **App reply:** "No relevant data found."
- **Ground truth:** "Converse Chuck Taylor (2,500 units)."

### Pipeline evidence
```sql
-- Generated SQL (CORRECT):
SELECT p.product_name, i.stock_level 
FROM jd_sports.inventory_items i 
JOIN jd_sports.products p ON i.product_id = p.product_id 
WHERE i.distribution_center = 'Manchester' 
ORDER BY i.stock_level DESC LIMIT 1;
```

**BQ result (confirmed):** `product_name: Converse Chuck Taylor, stock_level: 2500` (1 row)

The trace shows the BQ citation with excerpt `"Returned 1 rows."` and the correct SQL. The data was:
- In the BQ result (`rows[0]` = `{product_name: "Converse Chuck Taylor", stock_level: 2500}`)
- Formatted into `bqText` via `summarizeRow` → `[1] BigQuery: 1 rows:\n  product_name: Converse Chuck Taylor, stock_level: 2500`
- Included in the LLM system prompt as a source

Yet the LLM replied "No relevant data found."

### Root cause
`orchestrator.ts:169` — The system prompt says: *"If no source answers the question, say 'No relevant data found.' Do not make up information."* The `deepseek/deepseek-v4-flash` model misinterprets this as a blanket permission to say "No relevant data found" even when a source IS relevant. The format `[1] BigQuery: 1 rows:\n  product_name: Converse Chuck Taylor, stock_level: 2500` lacks semantic context — the LLM doesn't understand that "stock_level: 2500" answers "what is the quantity."

Two related issues:
1. `summarizeRow()` at `orchestrator.ts:22-24` strips column context: `"  product_name: Converse Chuck Taylor, stock_level: 2500"` — fine for a human, but the LLM needs more signal.
2. The orchestrator re-formats BQ results independently (`orchestrator.ts:150-151`) instead of using the `context` field already computed by `formatBqContext` in `bigqueryHelpers.ts:46-57`, which adds `BigQuery results (1 rows, Xms):` prefix with latency, making the result look more like an authoritative query output.

### Research-backed fix

**1. Strengthen the answer-present rule** (`orchestrator.ts:169`):
Change the prompt preamble to:
```
"If a source directly answers the question, ALWAYS answer using that source. 
 Only say 'No relevant data found' if NO source contains any relevant numbers or facts. 
 If BigQuery returned rows with data, at least one of those rows is the answer."
```

**2. Use `formatBqContext` instead of re-formatting** (`orchestrator.ts:150-151`):
Replace the orchestrator's manual `summarizeRow` + `bqText` construction with:
```
bqText = bqRaw.context;  // Already formatted by formatBqContext in bigqueryHelpers.ts
// Format: "BigQuery results (1 rows, 123ms):\n  product_name: Converse Chuck Taylor, stock_level: 2500\n\nQuery: ..."
```
This provides richer context (latency, row count header) that helps the LLM trust the data.

**3. Add instruction about zero rows** (`bigquerySqlGenerator.ts`):
The existing instruction says "If a database query successfully returned 0 rows, state that no records match the criteria" — this is fine but also add: "If a database query returned 1 or more rows, those rows ARE the data — use them to answer."

### Code location
- `frontend/src/core/pipeline/orchestrator.ts:22-24` — `summarizeRow()` function
- `frontend/src/core/pipeline/orchestrator.ts:150-151` — manual bqText construction
- `frontend/src/core/pipeline/orchestrator.ts:169-170` — prompt preamble

---

## Failure 3: bq-22 — LIMIT 1 hides ties

### What happened
- **Question:** "What is the most common loyalty tier among our registered users?"
- **App reply:** "gold" only
- **Ground truth:** Three-way tie: Gold(3), Silver(3), Standard(3), Platinum(1)

### Pipeline evidence
```sql
-- Generated SQL:
SELECT u.loyalty_tier, COUNT(*) as customer_count 
FROM jd_sports.users u 
GROUP BY u.loyalty_tier 
ORDER BY customer_count DESC LIMIT 1;

-- BQ result: gold(3), silver(3), standard(3), platinum(1)
-- LIMIT 1 returns only: gold(3)

-- Correct SQL (no LIMIT):
SELECT u.loyalty_tier, COUNT(*) as customer_count 
FROM jd_sports.users u 
GROUP BY u.loyalty_tier 
ORDER BY customer_count DESC;
```

**BQ confirmation:** Without LIMIT 1: gold(3), silver(3), standard(3), platinum(1). Three-way tie at count=3.

### Root cause
`bigquerySqlGenerator.ts:66` says `"Aim for under 50 result rows"` — this subtly encourages LIMIT usage without mentioning ties. The golden example `gq-018` ("loyalty tier breakdown of customers") correctly uses no LIMIT, but the NL-to-SQL model overrides the example and adds `LIMIT 1` because the question says "most common" (superlative).

The model generates `LIMIT 1` for any "most/highest/lowest" pattern without checking for ties. There's no prompt rule or golden example teaching the model to handle ties with `DENSE_RANK()` or to remove LIMIT when counts tie.

### Research-backed fix

**1. Add tie-handling golden example** (`golden-queries.json`):
```json
{
  "id": "gq-024",
  "question": "most common loyalty tier",
  "sql": "WITH tier_counts AS (SELECT u.loyalty_tier, COUNT(*) as customer_count, DENSE_RANK() OVER (ORDER BY COUNT(*) DESC) as rnk FROM jd_sports.users u GROUP BY u.loyalty_tier) SELECT loyalty_tier, customer_count FROM tier_counts WHERE rnk = 1"
}
```

**2. Add prompt rule** (`bigquerySqlGenerator.ts:76`):
```
- IMPORTANT: For "most common" / "highest" / "top" questions, use DENSE_RANK() or do 
  not LIMIT to 1 — check for ties. If multiple rows share the same count/value, 
  return ALL tied rows.
```

### Code location
- `golden/golden-queries.json` — add golden example gq-024
- `frontend/src/server/services/bigquerySqlGenerator.ts:66` — "Aim for under 50" rule
- `frontend/src/server/services/bigquerySqlGenerator.ts:76` — add tie-handling rule

---

## Failure 4: hyb-15 — Wrong SQL (NULL brand + wrong return column)

### What happened
- **Question:** "Scotland was the weakest region in Q3 (92.5% of plan). Which brand has returns in Scotland in BQ and what is the return count?"
- **App reply:** "No relevant data found."
- **Ground truth:** "Document: Scotland was the weakest region; BigQuery Scotland returns: Under Armour Backpack (1 return)."

### Pipeline evidence
```sql
-- Generated SQL (WRONG × 2):
SELECT NULL AS brand, COUNT(*) AS return_count 
FROM jd_sports.orders o 
WHERE o.status = 'returned' AND o.region = 'Scotland';

-- BQ result: brand: NULL, return_count: 0

-- Correct SQL:
SELECT p.brand, p.product_name, COUNT(*) as return_count
FROM jd_sports.order_items oi
JOIN jd_sports.orders o ON oi.order_id = o.order_id
JOIN jd_sports.products p ON oi.product_id = p.product_id
WHERE oi.returned = true AND o.region = 'Scotland'
GROUP BY p.brand, p.product_name;
-- BQ result: Under Armour, Under Armour Backpack, 1
```

### Root cause
Two compounding bugs:

1. **Wrong return column** (same as bq-10): `orders.status = 'returned'` instead of `order_items.returned = true`. The BQ result returns 0 because no orders have `status = 'returned'`.

2. **No join to products**: `SELECT NULL AS brand` shows the model doesn't know to join `orders → order_items → products` to find the brand name for returns. The SQL only queries the `orders` table.

The `orders.status` schema at `bigquery.ts:46` lists "returned" as an allowed value, misleading the model. Additionally, the `order_items.returned` description at `bigquery.ts:71` is too brief.

### Research-backed fix

(Same schema fix as bq-10 — remove "returned" from `orders.status` allowedValues + improve `order_items.returned` description.)

**Add golden example for returns by region/brand** (`golden-queries.json`):
```json
{
  "id": "gq-025",
  "question": "returns by region and brand",
  "sql": "SELECT o.region, p.brand, p.product_name, COUNT(*) as return_count FROM jd_sports.order_items oi JOIN jd_sports.orders o ON oi.order_id = o.order_id JOIN jd_sports.products p ON oi.product_id = p.product_id WHERE oi.returned = true AND o.status IN ('delivered', 'shipped') GROUP BY o.region, p.brand, p.product_name"
}
```

### Code location
- `frontend/src/server/config/bigquery.ts:46,71` — schema descriptions
- `golden/golden-queries.json` — add golden example gq-025

---

## Failure 5: hyb-20 — Intent classifier skips BQ execution

### What happened
- **Question:** "The sales plan targets Accessories gross margin of 51.0%. What is the actual Accessories gross margin in BQ?"
- **App reply:** "No relevant data found." (no citations)
- **Ground truth:** "Planned: 51.0%; Actual: 51.11% (Gross Profit GBP 46.00 on Revenue GBP 90.00)."

### Pipeline evidence
No citations at all — BQ was never called. The BQ SQL would have been:
```sql
SELECT p.department, 
  ROUND((SUM(oi.sale_price * oi.quantity) - SUM(oi.cost * oi.quantity)) 
    / NULLIF(SUM(oi.sale_price * oi.quantity), 0) * 100, 2) as gross_margin_pct
FROM jd_sports.order_items oi
JOIN jd_sports.products p ON oi.product_id = p.product_id
JOIN jd_sports.orders o ON oi.order_id = o.order_id
WHERE o.status IN ('delivered', 'shipped') AND p.department = 'Accessories'
GROUP BY p.department;
-- BQ result: Accessories, 51.11%
```

### Root cause
`classifierHeuristics.ts:24` matches `/annual (sales )?plan/i` → DOCUMENT (weight 0.99)  
`classifierHeuristics.ts:27` matches `/gross|operating) margin/i` → DOCUMENT (weight 0.95)  

The DATABASE pattern `/bigquery|sql query|database/i` at line 90 does NOT match because "BQ" ≠ "bigquery" (the regex is case-insensitive but requires the full word). So:

1. Heuristic returns DOCUMENT with confidence 0.99
2. Confidence > 0.85 → LLM classifier is skipped entirely (`classifier.ts:47`)
3. Orchestrator runs only RAG pipeline (`orchestrator.ts:96`)
4. Document chunks are found (contain the sales plan with 51.0% target)
5. `isDocEmpty = false` → BQ fallback is NOT triggered (`orchestrator.ts:107`)
6. LLM receives only doc context → says "No relevant data found" because docs don't contain BQ actuals

### Research-backed fix

**1. Add "BQ" alias to DATABASE pattern** (`classifierHeuristics.ts:90`):
```diff
- { regex: /bigquery|sql query|database/i, intent: "DATABASE", ... },
+ { regex: /\b(bigquery|sql query|database|bq)\b/i, intent: "DATABASE", ... },
```

**2. Add HYBRID pattern for "X in BQ" questions** (`classifierHeuristics.ts:55-62`):
```javascript
{ regex: /in\s+BQ\b/i, intent: "HYBRID", weight: 0.92, name: "in-bq" },
```

This ensures questions ending with "in BQ" are classified as HYBRID regardless of document-heavy prefixes.

**3. Always run BQ for HYBRID intent** (orchestrator already does this — no code change needed, just ensure classification is correct).

### Code location
- `frontend/src/core/pipeline/classifierHeuristics.ts:90` — add "BQ" alias
- `frontend/src/core/pipeline/classifierHeuristics.ts:55-62` — add "in BQ" HYBRID pattern

---

## Failure 6: hyb-22 — Multi-part SQL + classification failure

### What happened
- **Question:** "Nike Dunk Low targets 32,000 pairs in the campaign brief. How many pairs were sold and what is the stock level at Manchester DC?"
- **App reply:** "No relevant data found." (no citations)
- **Ground truth:** "Target: 32,000; BigQuery sold: 0 pairs; Manchester DC stock level: 1,200 units."

### Pipeline evidence
No citations in trace — BQ either wasn't called or the SQL failed.

**Correct SQL for each part:**
```sql
-- Part 1: Sales
SELECT SUM(oi.quantity) as pairs_sold 
FROM jd_sports.order_items oi 
JOIN jd_sports.orders o ON oi.order_id = o.order_id 
JOIN jd_sports.products p ON oi.product_id = p.product_id 
WHERE o.status IN ('delivered', 'shipped') 
  AND p.product_name LIKE '%Nike Dunk Low%';
-- BQ result: NULL (0 pairs sold)

-- Part 2: Stock level
SELECT i.stock_level 
FROM jd_sports.inventory_items i 
JOIN jd_sports.products p ON i.product_id = p.product_id 
WHERE p.product_name LIKE '%Nike Dunk Low%' 
  AND i.distribution_center = 'Manchester';
-- BQ result: 1200
```

### Root cause
The question asks TWO independent questions ("pairs sold" + "stock level") that require separate SQL queries against different tables (`order_items` for sales, `inventory_items` for stock). The NL-to-SQL model generates a single SQL query that either:
- Joins `order_items` + `inventory_items` in one query (double-counting rows)
- Fails with a GROUP BY error
- Returns 0 rows due to join mismatch

Additionally, the heuristics may classify as DATABASE (matches `/how many.{0,30}pairs`, `/stock level`) and BQ runs but fails on the complex multi-part query. If BQ throws an error, the orchestrator's `execBq` catches it (rejected status), and both docContext + bqText are empty → "No relevant data found."

### Research-backed fix

**1. Split multi-part questions** — Add a prompt rule in `bigquerySqlGenerator.ts:76`:
```
- IMPORTANT: If the question asks for two independent facts (e.g., sales count AND stock level), 
  generate two separate SQL queries joined with a semicolon or use WITH clauses.
  Sales data comes from order_items joined with orders filtered by o.status IN ('delivered', 'shipped').
  Stock data comes from inventory_items joined with products.
  NEVER join order_items with inventory_items in the same query — they are independent.
```

**2. Remove word boundaries for "campaign brief"** — The question mentions "campaign brief" but the only matching DOCUMENT pattern is `/back to school (campaign|brief)/i` which requires "Back to School" prefix. Add a generic pattern:
```javascript
{ regex: /\bcampaign\s+brief\b/i, intent: "DOCUMENT", weight: 0.95, name: "campaign-brief" },
```

**3. Handle multi-part queries on the orchestrator level** — In `executeBqQuestion`, detect multi-part questions and make two separate `llmGenerateSql` calls, then merge the results.

### Code location
- `frontend/src/server/services/bigquerySqlGenerator.ts:76` — add multi-part query rule
- `frontend/src/core/pipeline/classifierHeuristics.ts` — add "campaign brief" pattern

---

## Failure 7: hyb-24 — Same multi-part + classification failure as hyb-22

### What happened
- **Question:** "The campaign brief targets 38,000 Adidas Gazelle pairs. How many pairs were sold in BQ, and what is its reorder point in Manchester DC?"
- **App reply:** "No relevant data found. The sources do not reference 'BQ' as a period or location, nor do they provide a reorder point for the Adidas Gazelle at Manchester DC."
- **Ground truth:** "Target: 38,000; BigQuery sold: 1 pair; Manchester DC reorder point: 250 units."

### Pipeline evidence
No citations in trace. The reply mentions "sources" which suggests document context WAS present but BQ wasn't.

**Correct SQL for each part:**
```sql
-- Part 1: Sales
SELECT SUM(oi.quantity) as pairs_sold 
FROM jd_sports.order_items oi 
JOIN jd_sports.orders o ON oi.order_id = o.order_id 
JOIN jd_sports.products p ON oi.product_id = p.product_id 
WHERE o.status IN ('delivered', 'shipped') 
  AND p.product_name LIKE '%Adidas Gazelle%';
-- BQ result: 1

-- Part 2: Reorder point
SELECT i.reorder_point 
FROM jd_sports.inventory_items i 
JOIN jd_sports.products p ON i.product_id = p.product_id 
WHERE p.product_name LIKE '%Adidas Gazelle%' 
  AND i.distribution_center = 'Manchester';
-- BQ result: 250
```

### Root cause
Same as hyb-22 — multi-part query (sales + reorder point) in one SQL query fails. The LLM reply "The sources do not reference 'BQ' as a period or location" confirms doc context was included (LLM responded to "BQ" mention from something in the context) but BQ data was absent.

### Research-backed fix
Same as hyb-22 — split multi-part queries. The reply reveals a secondary issue: the LLM hallucinates "BQ as a period or location" — this is a hallucination caused by the prompt telling it to not make up information. It tries to explain WHY no data was found and fabricates a reason. The prompt at `orchestrator.ts:169` should add:
```
"Do not speculate about why data is missing. If data exists in a source, use it. If not, simply say 'No relevant data found.'"
```

### Code location
- `frontend/src/server/services/bigquerySqlGenerator.ts:76` — add multi-part query rule
- `frontend/src/core/pipeline/orchestrator.ts:169` — add "don't speculate" rule

---

## Summary: Cross-cutting root causes

| Root Cause | Affected IDs | Fix Location |
|---|---|---|
| **orders.status "returned" misleads model** | bq-10, hyb-15 | `bigquery.ts:46` — remove "returned" from allowedValues |
| **order_items.returned description too brief** | bq-10, hyb-15 | `bigquery.ts:71` — expand description |
| **LLM ignores present data** | bq-12 | `orchestrator.ts:169` — strengthen answer-present rules |
| **orchestrator re-formats instead of reusing formatBqContext** | bq-12 | `orchestrator.ts:150` — use `bqRaw.context` |
| **No tie-handling pattern for superlative queries** | bq-22 | `bigquerySqlGenerator.ts:76` + golden example |
| **"BQ" not matched as DATABASE keyword** | hyb-20, hyb-22, hyb-24 | `classifierHeuristics.ts:90` — add `\b(BQ|bq)\b` |
| **"in BQ" not matched as HYBRID pattern** | hyb-20 | `classifierHeuristics.ts` — add HYBRID pattern for "in BQ" |
| **Multi-part questions produce single broken SQL** | hyb-22, hyb-24 | `bigquerySqlGenerator.ts:76` — split rule |
| **No "campaign brief" DOCUMENT pattern** | hyb-22, hyb-24 | `classifierHeuristics.ts` — add campaign brief pattern |
| **Missing golden examples for returns and ties** | bq-10, bq-22, hyb-15 | `golden-queries.json` — add gq-023, gq-024, gq-025 |

## Priority order for fixes

1. **P0 — Wrong answers** (bq-10, bq-22): Fix schema descriptions + add golden examples. These produce confidently wrong answers ("0 returned" when 1 exists, "gold" when it's a 3-way tie).

2. **P1 — Missing data** (hyb-15, hyb-20, hyb-22, hyb-24): Fix intent classification patterns so BQ is actually called for BQ questions. Fix multi-part SQL generation.

3. **P2 — LLM ignores data** (bq-12): Improve prompt to prevent "No relevant data found" when data is present.
