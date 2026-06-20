# Post-Mortem: Hybrid Question Failures

**Date:** 2026-06-20
**Analyst:** Agent B (post-mortem analysis)
**Scope:** 12 hybrid failures (hyb-02, hyb-06, hyb-10, hyb-13, hyb-15, hyb-16, hyb-18, hyb-20, hyb-21, hyb-22, hyb-24, hyb-25)

---

## Failure Classification

| Type | Pattern | Count | Questions |
|------|---------|-------|-----------|
| **A** | SQL generation failed or produced wrong/empty result | 10 | hyb-02, hyb-10, hyb-13, hyb-15, hyb-16, hyb-18, hyb-20, hyb-21, hyb-22, hyb-24 |
| **B** | SQL correct but LLM ignored it | 1 | hyb-06 |
| **C** | Context merge failure (LLM conflates sources) | 1 | hyb-25 |
| **D** | Classification wrong (only one pipeline ran) | 0 | — |

---

## Per-Question Analysis

### hyb-02 — "Nike planned margin 46.8%. Actual margin in BQ?"

**Type:** A (wrong SQL logic)

**SQL executed:**
```sql
SELECT p.brand, ROUND(((SUM(p.rrp) - SUM(p.cost_price)) / SUM(p.rrp)) * 100, 2) AS gross_margin_pct
FROM jd_sports.products p WHERE p.brand = 'Nike' AND p.is_active = TRUE GROUP BY p.brand
```

**BQ returned:** `{brand: Nike, gross_margin_pct: 47.64}` (1 row)

**Ground truth:** 45.37% = Gross Profit GBP 245 / Revenue GBP 540

**Root cause:** The SQL computes margin from **product catalog** (RRP and cost_price from `products` table) instead of **actual sales** (sale_price from `order_items`). Product-level margin: `SUM(rrp)=445, SUM(cost_price)=233, (445-233)/445=47.64%`. Actual margin from order_items: revenue=540, cost=295, (540-295)/540=45.37%. The SQL generator does not distinguish "product catalog pricing" from "transaction-level financials." The SQL rule set says "When aggregating revenue, sales, or orders, ALWAYS filter by o.status" but doesn't say "for financial metrics, join to order_items."

**Fix:** Add rule to SQL generator: "For gross margin or profit calculations, ALWAYS use sale_price and cost from order_items joined to orders with status in ('delivered','shipped'), NOT product catalog prices."

---

### hyb-06 — "Scotland Q3: 92.5% of plan. How many orders in Scotland in BQ?"

**Type:** B (SQL correct, LLM ignored)

**SQL executed:**
```sql
SELECT COUNT(DISTINCT o.order_id) AS order_count FROM jd_sports.orders o
WHERE o.region = 'Scotland' AND o.status IN ('delivered', 'shipped')
```

**BQ returned:** `{order_count: 6}` (1 row)

**Ground truth:** 6 orders (most of any region)

**Root cause:** The SQL is correct and BQ returned the right answer (6). But the LLM replied "No relevant data found." The trace has a BQ citation in its raw JSON, but the scorer says "No BigQuery citation found for database/hybrid question" — meaning the LLM's reply didn't reference the BQ citation index. The system prompt instructs: "If no source answers the question, say 'No relevant data found.'" The LLM apparently decided that `order_count: 6` didn't adequately answer "How many delivered and shipped orders were placed in Scotland" — perhaps because the document context didn't reinforce it, or the LLM's refusal threshold is too low.

**Fix:** The `summarizeRow` function (orchestrator.ts:22) truncates to 4 columns. Here it's fine (1 column), but the LLM needs stronger system prompt phrasing to trust BQ results. Change preamble to: "The BigQuery source contains verified transactional data. If BigQuery returned results with N>0 rows, those results ARE relevant and should be used."

---

### hyb-10 — "25k UA Backpacks target. How many sold/returned in BQ?"

**Type:** A (SQL generation failed)

**No citations returned.** Both `docContext` and `bqText` were empty → early return at orchestrator.ts:160.

**Ground truth:** 2 sold, 1 returned

**Root cause:** Product name mismatch. DB has `"Under Armour Backpack"` (singular), question says `"Under Armour Backpacks"` (plural). The SQL generator rule says: "For product name matching, use p.product_name LIKE '%keyword%' with the full product name from the question." With the full question string `"Under Armour Backpacks"`, `LIKE '%Under Armour Backpacks%'` does NOT match `"Under Armour Backpack"` — the trailing 's' breaks the match. BQ returns 0 rows, `hasActualData` is false, and bqText becomes "0 records found matching the criteria." If doc context is also below relevance threshold, both contexts empty → "No relevant data found."

**Fix:** Strip trailing 's' and common pluralization suffixes before product name matching, or use a more flexible matching strategy (stemming, OR conditions for singular/plural).

---

### hyb-13 — "NB 18% YoY growth. How many NB530 sold, stock at Manchester?"

**Type:** A (BQ failed) + hallucination

**Citations:** Only document citation (Q3 review). No BQ citation.

**SQL likely:** Could not find "New Balance 530" in products, or the query failed.

**Ground truth:** 2 units sold, stock 900 at Manchester DC.

**Root cause:** BQ query generation failed (Type A), so the LLM only had document context. The document chunk (relevance 0.0025) mentions Adidas revenue but the LLM found "176,000" somewhere in the doc context (from an unrelated Adidas section) and hallucinated it as New Balance 530 sales. **This is the most dangerous failure pattern** — the LLM fabricates numbers from unrelated document context when BQ data is missing.

**Fix:** 
1. Add product name fuzzy matching for "New Balance 530" → DB has `"New Balance 530"`. The match should work, so the actual SQL failure needs debugging.
2. When BQ fails and doc context is the only source, instruct the LLM to say "I don't have BQ data for this" rather than fabricating numbers from unrelated document sections.

---

### hyb-15 — "Scotland returns in BQ by brand?"

**Type:** A (wrong SQL — NULL AS brand)

**SQL executed:**
```sql
SELECT NULL AS brand, COUNT(*) AS return_count FROM jd_sports.orders o
WHERE o.status = 'returned' AND o.region = 'Scotland'
```

**BQ returned:** `{brand: null, return_count: 1}` (1 row)

**Ground truth:** Under Armour Backpack (1 return)

**Root cause:** The SQL selects `NULL AS brand` instead of joining to `order_items` and `products` to get the actual brand name. The SQL generator failed to understand that to answer "which brand has returns", it needs to join through order_items to get product brand. The `hasActualData` check passes (return_count=1 is not null), but the LLM sees `brand: null` — effectively useless for answering the question.

**Fix:** Add SQL generator rule: "When the question asks for a dimension (brand, product, category) alongside a metric, ALWAYS join through order_items → products to get the dimension values. Never use NULL AS <dimension>."

---

### hyb-16 — "Running GM 44% in doc. Actual GM in BQ?"

**Type:** A (SQL generation failed)

**No citations returned.**

**Ground truth:** 44.92% (GP GBP 420 on Revenue GBP 935)

**Root cause:** The SQL generator cannot identify "Running" as a category in the products table. The products table has a `category` column with values like 'Running', 'Lifestyle', 'Accessories' etc., but the schema description or golden examples may not document this clearly. The SQL generator likely attempted a query that failed (e.g., using `category` in a non-standard way) or couldn't join orders correctly with category filter.

**Verify:** Running products in order_items give revenue=935, cost=515, margin=420/935=44.92%. The formula is:
```sql
SELECT ROUND((SUM(oi.sale_price * oi.quantity) - SUM(oi.cost * oi.quantity)) / SUM(oi.sale_price * oi.quantity) * 100, 2)
FROM jd_sports.order_items oi
JOIN jd_sports.products p ON oi.product_id = p.product_id
JOIN jd_sports.orders o ON oi.order_id = o.order_id
WHERE p.category = 'Running' AND o.status IN ('delivered', 'shipped')
```

**Fix:** Document the `category` column in the schema description with allowed values in `bigqueryHelpers.ts`. Add a golden example for computing GM by category.

---

### hyb-18 — "28k Converse target. Sold and stock in BQ?"

**Type:** A (SQL generation failed)

**No citations returned.**

**Ground truth:** 1 pair sold, stock 2,500 at Manchester DC

**Root cause:** Product name mismatch. DB has `"Converse Chuck Taylor"` (no "All Star"), question asks about `"Converse Chuck Taylor All Star"`. The `LIKE '%Converse Chuck Taylor All Star%'` fails to match `"Converse Chuck Taylor"`. Same pattern as hyb-10.

**Fix:** Use product name fuzzy matching with stemmed/simplified names. Strip common suffixes like "All Star", "OG", etc.

---

### hyb-20 — "Accessories GM target 51%. Actual in BQ?"

**Type:** A (SQL generation failed)

**No citations returned.**

**Ground truth:** 51.11% (GP GBP 46 on Revenue GBP 90)

**Root cause:** SQL generator couldn't formulate a correct query to compute GM by category. The `category` column exists in products with value 'Accessories'. The only product in Accessories is Under Armour Backpack (2 items × 45 = 90 revenue, 2 × 22 = 44 cost, margin = 46/90 = 51.11%). The SQL generator likely lacked schema knowledge about the `category` column or how to join orders → order_items → products with a category filter.

**Fix:** Add `category` with allowed values [Running, Lifestyle, Accessories, Training, Outerwear] to the schema prompt. Add golden example for "gross margin by category."

---

### hyb-21 — "ASICS Kayano GBP 5.6M in doc. Sold and stock in BQ?"

**Type:** A (SQL is semantically wrong — back-calculates from document number)

**SQL executed:**
```sql
SELECT p.product_name, ROUND(5600000 / p.rrp, 2) AS pairs_sold, i.stock_level AS glasgow_stock_level
FROM jd_sports.products p JOIN jd_sports.inventory_items i ON p.product_id = i.product_id
WHERE p.product_name LIKE '%ASICS Gel Kayano 31%' AND p.brand = 'ASICS' AND i.distribution_center = 'Glasgow'
```

**BQ returned:** `{product_name: ASICS Gel Kayano 31, pairs_sold: 36129.03, glasgow_stock_level: 300}` (1 row)

**Ground truth:** 1 pair sold, stock 300 at Glasgow DC

**Root cause:** The SQL copies the document's stated revenue (GBP 5.6M) and back-calculates `pairs_sold = 5600000 / rrp(155) = 36129.03` instead of querying actual sales from `order_items`. This is the **most egregious SQL error** — the SQL generator conflates document data with the BQ query and invents a formula that looks plausible but is completely wrong. It never joins to `order_items` or `orders`.

The `summarizeRow` function truncates to 4 columns, so the LLM sees all 3 columns which fits. The LLM then reports "36,129.03 pairs sold" as if it's actual BQ data.

**Fix:** Add a hard rule in the SQL generator: "NEVER use numbers from the user's question as input values in SQL calculations. Only use column values from the database." Also: "For sales quantity, ALWAYS use SUM(oi.quantity) from order_items joined to orders."

---

### hyb-22 — "32k Dunk Low target. Sold and stock in BQ?"

**Type:** A (SQL generation failed)

**No citations returned.**

**Ground truth:** 0 pairs sold (only order is "processing"), stock 1,200 at Manchester DC

**Root cause:** The SQL generator likely failed to generate a valid query. Nike Dunk Low (PROD-011) exists in products, Manchester stock = 1200. The only order for Dunk Low is ORD-007 with status `"processing"` — correctly excluded by the `status IN ('delivered', 'shipped')` rule. So a correct SQL should return `sold: 0` and `stock: 1200`. But the SQL generator apparently couldn't combine these two metrics (sales + inventory) in one query.

**Fix:** Ensure SQL generator has golden examples for "sold + stock" combination queries. The join pattern needed is: products → order_items (for sales) + products → inventory_items (for stock) as separate subqueries or a LEFT JOIN + COUNT with conditional aggregation.

---

### hyb-24 — "38k Gazelle target. Sold and reorder point?"

**Type:** A (SQL generation failed)

**No citations returned.**
LLM reply: "No relevant data found. The sources do not reference 'BQ' as a period or location..."

**Ground truth:** 1 pair sold, reorder point 250 at Manchester DC

**Root cause:** "Adidas Gazelle" (PROD-006) exists in products. ORD-006 has 1 Gazelle sold (delivered). Manchester stock = 1500, reorder_point = 250. The SQL generator should handle this but failed. Note that the LLM's reply specifically mentions not finding "BQ" as a term — this suggests the LLM was confused by the question using "BQ" as an abbreviation and couldn't reconcile it with the sources. The document context might not mention "BQ" anywhere.

**Fix:** The system prompt should instruct the LLM that "BQ" is an abbreviation for BigQuery (the database).

---

### hyb-25 — "Meta ROAS 5.0x. Orders via Meta/social?"

**Type:** C (context merge failure)

**SQL executed:**
```sql
SELECT COUNT(DISTINCT o.order_id) AS orders_from_meta FROM jd_sports.orders o
JOIN jd_sports.events e ON o.user_id = e.user_id
WHERE e.event_type = 'purchase' AND e.traffic_source = 'social' AND o.status IN ('delivered', 'shipped')
```

**BQ returned:** `{orders_from_meta: 1}` (1 row)

**Ground truth:** 1 purchase from social traffic (EVT-018, USR-007). No 'Meta' traffic source exists; 'social' is the closest.

**Root cause:** The LLM says "1 order was placed via Meta [1]. No relevant data found for social media." This is contradictory and wrong. The BQ query used `traffic_source = 'social'` (because 'Meta' isn't an allowed value), but the LLM's reply says "via Meta" in the first sentence and then denies social media data in the second. The LLM conflates the document's "Meta ROAS 5.0x" target with the BQ's "social traffic source" result. It also misattributes the citation `[1]` to the document source instead of the BQ source (which should be `[39]` or whatever the bqIndex is).

**Fix:** The system prompt should clarify: "When a BigQuery query filters by an allowed value (e.g., traffic_source = 'social'), use that exact value in your reply. Do not substitute with related terms from the document. If the BQ source says 'social', answer 'social', not 'Meta'."

---

## Pattern Summary

### Pattern 1: Product Name Mismatch (3 failures: hyb-10, hyb-18, possibly hyb-13)
The SQL generator performs exact substring matching with `p.product_name LIKE '%<full question text>%'`. When the question uses a different form (plural, missing/extra words), the match fails and returns 0 rows.

**Code location:** `bigquerySqlGenerator.ts:76` — SQL generator rule: "For product name matching, use p.product_name LIKE '%keyword%' with the full product name from the question."

### Pattern 2: Wrong SQL Semantics (2 failures: hyb-02, hyb-21)
The SQL generator writes syntactically valid SQL that computes the wrong thing:
- hyb-02: Uses catalog prices instead of transaction data for gross margin
- hyb-21: Back-calculates sales from document revenue instead of querying order_items

**Code location:** `bigquerySqlGenerator.ts:52-76` — The system prompt for SQL generation lacks rules about distinguishing catalog vs transactional data.

### Pattern 3: Missing Schema/Dimension Knowledge (3 failures: hyb-16, hyb-20, hyb-15)
The SQL generator doesn't know about:
- `products.category` column (hyb-16, hyb-20)
- How to join order_items for dimensional breakdowns (hyb-15)

**Code location:** `bigqueryHelpers.ts` and `bigquerySqlGenerator.ts` — schema descriptions and allowed values don't include `products.category`.

### Pattern 4: Multi-metric Query Failure (2 failures: hyb-22, hyb-24)
The SQL generator can't produce queries that combine sales metrics with inventory metrics (stock, reorder point) in a single query.

**Code location:** `bigquerySqlGenerator.ts` — no golden examples or schema hints for combining sales + inventory queries.

### Pattern 5: LLM Ignores BQ Data (1 failure: hyb-06)
SQL is correct, BQ returns data, but the LLM says "No relevant data found."

**Code location:** `orchestrator.ts:169` — The system prompt preamble doesn't include instructions to trust BQ results.

### Pattern 6: Hallucination from Document (1 failure: hyb-13)
When BQ fails and only document context is available, the LLM fabricates numbers from unrelated document sections.

**Code location:** `orchestrator.ts:169` — No safeguard against hallucination when only one data source is available.

### Pattern 7: Context Conflation (1 failure: hyb-25)
The LLM confuses document terms with BQ values, substituting document terminology for BQ query filter values.

**Code location:** `orchestrator.ts:169` — The merged context mixing document and BQ sources confuses the LLM.

---

## Specific Code-Level Fixes

### Fix 1: Product name fuzzy matching in SQL generator
**File:** `bigquerySqlGenerator.ts:76`
Replace: `p.product_name LIKE '%keyword%' with the full product name from the question`
With: Use LIKE for each word fragment, OR multiple `LIKE '%fragment%'` conditions. Strip trailing 's', hyphens, and common suffixes.

### Fix 2: Gross margin must use order_items
**File:** `bigquerySqlGenerator.ts:73`
Add: "For gross margin or profit calculations: ALWAYS join to order_items. Use oi.sale_price and oi.cost from order_items. NEVER compute margin from product catalog prices (p.rrp, p.cost_price)."

### Fix 3: Never back-calculate from document numbers
**File:** `bigquerySqlGenerator.ts`
Add rule: "NEVER use constants from the user's question as input values in SQL formulas. All values must come from database columns only."

### Fix 4: Add products.category to schema documentation
**File:** `bigqueryHelpers.ts`
Add `products.category` to `ALLOWED_VALS` or `HEADER_DESC` with description "Product category" and allowed values [Running, Lifestyle, Accessories, Training, Outerwear].

### Fix 5: Strengthen BQ trust in system prompt
**File:** `orchestrator.ts:169`
Current: "If no source answers the question, say 'No relevant data found.' Do not make up information."
Add: "The BigQuery source contains verified transactional data. If BigQuery returned N>0 rows, those results ARE relevant and should be used as the answer. Only say 'No relevant data found' when all sources are empty."

### Fix 6: Guard against hallucination with single-source context
**File:** `orchestrator.ts:169`
Add: "If only document sources are available (no BigQuery results), do NOT use document numbers to answer BigQuery-specific questions. State that BQ data is unavailable."

### Fix 7: Clarify "BQ" abbreviation for the LLM
**File:** `orchestrator.ts:169`
Add: "The term 'BQ' in questions refers to BigQuery, the database source."

### Fix 8: Combined sales + inventory golden examples
**File:** `bigqueryService.ts` → `retrieveGoldenExamples()`
Add golden examples for queries that combine sales metrics (from order_items) with stock metrics (from inventory_items) in a single query using subqueries or condition aggregation.

---

## Research-Backed Recommendations

### 1. SQL Guardrails (from NL2SQL best practices)
- **Schema linking**: Ensure every column mentioned in a golden example or allowed-values list is explicitly documented in the schema prompt. Missing columns (like `products.category`) are the #1 cause of SQL failure in NL2SQL systems.
- **Query decomposition**: For multi-metric questions (sold + stock), decompose into sub-queries rather than forcing one complex SQL. The orchestrator could run two parallel BQ queries and merge results.

### 2. Context Merging (RAG + DB hybrid pattern)
- **Source separation**: Number document sources sequentially [1..N] and BQ source as [BQ] instead of [N+1]. This helps the LLM distinguish source types.
- **Structured format**: Format BQ results as structured data (JSON or markdown table) rather than comma-separated key:value pairs, which improves LLM comprehension:
  ```
  [BQ] BigQuery Result:
  | Field | Value |
  |-------|-------|
  | brand | Nike |
  | gross_margin_pct | 47.64 |
  ```
- **Row completeness**: The `summarizeRow` function (`orchestrator.ts:22`) truncates to 4 columns. This is too aggressive. Increase to 8-10 columns or show all columns. SQL that returns 5+ columns gets silently truncated.

### 3. LLM Instruction Following
- **BQ trust priming**: The LLM currently has equal trust in document text (which may be aspirational/planned) and BQ data (which is transactional/actual). Add explicit priority: "BigQuery data takes precedence over document data for factual metrics."
- **Contradiction handling**: When BQ and documents disagree, the LLM should explicitly flag the discrepancy rather than silently choosing one.

### 4. Validation Layer
- **Post-hoc checking**: After the LLM generates a reply, check that:
  - The reply references the BQ citation index (if BQ returned data)
  - The reply does NOT contain numbers from the document context that contradict BQ results
  - The reply doesn't say "no data" when BQ returned N>0 rows
- **Retry on contradiction**: If the LLM's answer contradicts BQ results, re-prompt with a correction.

### 5. SQL Generator Improvements
- **Retry with explicit hint**: When BQ returns 0 rows after a product name search, retry with progressive name relaxation (remove trailing 's', remove last word, try brand-only search).
- **Allowed values enforcement**: The `traffic_source` column has allowed values [organic, paid, referral, social, email]. The question mentions "Meta" which doesn't exist. The SQL generator correctly mapped to 'social', but the LLM didn't. The system prompt should clarify the mapping.

---

## Appendix: Pipeline Code References

| Component | File | Line(s) | Relevance |
|-----------|------|---------|-----------|
| Intent classification | `orchestrator.ts` | 40-51 | Routes to HYBRID path |
| Parallel execution (HYBRID) | `orchestrator.ts` | 112 | Both doc + BQ run together |
| `hasActualData` check | `orchestrator.ts` | 145-147 | Rejects all-null rows |
| `summarizeRow` (4-col truncation) | `orchestrator.ts` | 22-24 | Truncates BQ results |
| BQ text formatting | `orchestrator.ts` | 142-157 | Builds BQ context block |
| Context merge | `orchestrator.ts` | 164-167 | docContext + "\n\n" + bqText |
| System prompt preamble | `orchestrator.ts` | 169 | LLM instructions |
| Fallback to "No data" | `orchestrator.ts` | 160-162 | Early return when both empty |
| SQL generation prompt | `bigquerySqlGenerator.ts` | 52-76 | NL2SQL rules |
| Product name matching rule | `bigquerySqlGenerator.ts` | 76 | `LIKE '%keyword%'` |
| Schema descriptions | `bigqueryHelpers.ts` | 7-16 | `HEADER_DESC`, `ALLOWED_VALS` |
