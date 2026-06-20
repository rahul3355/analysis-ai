# BigQuery SQL Generation Failure Analysis

> Generated: 2026-06-20
> Methodology: For each failed trace, the app's SQL was re-run on BigQuery verbatim,
> then compared against the ground truth SQL from `bq-ground-truth.json`.

---

## bq-06: "How many orders were placed via the online channel?"

### What happened
| Aspect | Detail |
|--------|--------|
| App replied | 15 |
| Ground truth | 12 |
| Pass | ❌ (score 0.35) |

### Pipeline trace
- **Classification**: DATABASE (correct)
- **SQL generated**:
  ```sql
  SELECT COUNT(*) AS online_order_count FROM jd_sports.orders o WHERE o.channel = 'online'
  ```
- **BQ result**: 15

### Root cause
**SQL completeness bug — missing status filter.** The ground truth SQL includes
`AND status IN ('delivered', 'shipped')` but the generated SQL does not.

Online order status breakdown (run against BQ):

| status | count |
|--------|-------|
| delivered | 11 |
| processing | 2 |
| cancelled | 1 |
| shipped | 1 |

The query counts ALL online-channel orders (including processing + cancelled),
not just completed orders. The question "How many orders were placed" implies
successfully placed/concluded orders — 12 (delivered + shipped), not 15.

### Evidence
**App SQL result:**
```json
[{"online_order_count":"15"}]
```
**Ground truth SQL result:**
```json
[{"count":"12"}]
```

### Fix
The SQL generator must add `AND o.status IN ('delivered', 'shipped')` when
counting orders, or the golden examples in the prompt need to reinforce this pattern.

---

## bq-10: "How many orders were returned in total, and what is the overall return rate percentage in delivered and shipped orders?"

### What happened
| Aspect | Detail |
|--------|--------|
| App replied | "0 returned orders, overall return rate 5.88%" |
| Ground truth | "1 order returned (ORD-020). Return rate is 5.88%." |
| Pass | ❌ (score 0.35) |

### Pipeline trace
- **Classification**: DATABASE (correct)
- **SQL generated**:
  ```sql
  WITH returned_orders AS (
    SELECT COUNT(DISTINCT order_id) AS total_returned_orders
    FROM jd_sports.orders WHERE status = 'returned'
  ),
  return_rate_calc AS (
    SELECT COUNTIF(oi.returned) AS returned_items, COUNT(*) AS total_items
    FROM jd_sports.orders o
    JOIN jd_sports.order_items oi ON o.order_id = oi.order_id
    WHERE o.status IN ('delivered', 'shipped')
  )
  SELECT ro.total_returned_orders,
    ROUND(rc.returned_items / rc.total_items * 100, 2) AS overall_return_rate_pct
  FROM returned_orders ro CROSS JOIN return_rate_calc rc;
  ```
- **BQ result**: `{total_returned_orders: 0, overall_return_rate_pct: 5.88}`

### Root cause
**SQL logic error — wrong approach for returned-order counting.** The `returned_orders`
CTE checks `orders.status = 'returned'` but **there is no 'returned' status in the
orders table**. Verified against BQ:

```sql
SELECT DISTINCT status FROM jd_sports.orders
-- Result: ["delivered", "shipped", "processing", "cancelled"]
```

Returns are tracked at the **item level** via `order_items.returned` (boolean).
Order ORD-020 has `status = 'delivered'` but has a returned item:
```json
[{"order_id":"ORD-020","status":"delivered","returned":"true","return_reason":"not_as_expected"}]
```

The `return_rate_calc` CTE correctly uses `COUNTIF(oi.returned)` which counts 1
returned item out of 17 total items = 5.88%. So the return rate is correct, but
the "total returned orders" count is wrong because it looked at the wrong column.

**Ground truth SQL** correctly uses only the `order_items` table:
```sql
SELECT COUNTIF(returned = true) as returned_count, ...
FROM order_items oi JOIN orders o ON oi.order_id = o.order_id
WHERE o.status IN ('delivered', 'shipped')
```

### Fix
The SQL generator must learn that `returned` is a per-item boolean in
`order_items`, not a status on the `orders` table. The golden examples should
include this pattern.

---

## bq-11: "What is the current stock level and reorder point of The North Face Nuptse Jacket at the Glasgow distribution center?"

### What happened
| Aspect | Detail |
|--------|--------|
| App replied | "No relevant data found. The database query returned zero records." |
| Ground truth | "Stock level: 350; Reorder point: 100." |
| Pass | ❌ (score 0.18) |

### Pipeline trace
- **Classification**: DATABASE (correct)
- **SQL generated**:
  ```sql
  SELECT i.stock_level, i.reorder_point
  FROM jd_sports.inventory_items i
  JOIN jd_sports.products p ON i.product_id = p.product_id
  WHERE p.brand = 'The North Face'
    AND p.product_name = 'Nuptse Jacket'
    AND i.distribution_center = 'Glasgow'
  ```
- **BQ result**: `[]` (empty)

### Root cause
**LLM SQL generation error — incorrect product_name.** The LLM split the full product
name "The North Face Nuptse Jacket" into separate `brand` and `product_name` filters.
The product_name in the DB is the **full** name:

```json
[{"product_id":"PROD-003","product_name":"The North Face Nuptse Jacket","brand":"The North Face"}]
```

The WHERE clause `p.product_name = 'Nuptse Jacket'` matches nothing because no product
has that exact name. The brand filter `p.brand = 'The North Face'` is redundant since
the brand is embedded in the product_name.

**Ground truth SQL** (correct):
```sql
SELECT i.stock_level, i.reorder_point
FROM inventory_items i JOIN products p ON i.product_id = p.product_id
WHERE p.product_name = 'The North Face Nuptse Jacket'
  AND i.distribution_center = 'Glasgow'
```

**Ground truth BQ result:**
```json
[{"stock_level":"350","reorder_point":"100"}]
```

### Fix
The SQL generator must not split product_name. If it receives a name like
"The North Face Nuptse Jacket", it should use the full string as
`product_name` — not split into `brand` + a fragment. The brand column exists
but should be used as a secondary/alternative filter, not as a replacement
for the product_name.

---

## bq-12: "Which product has the highest stock level at the Manchester distribution center, and what is the quantity?"

### What happened
| Aspect | Detail |
|--------|--------|
| App replied | "No relevant data found." |
| Ground truth | "Converse Chuck Taylor (2,500 units)." |
| Pass | ❌ (score 0) |

### Pipeline trace
- **Classification**: DATABASE (correct)
- **SQL generated**:
  ```sql
  SELECT p.product_name, i.stock_level
  FROM jd_sports.inventory_items i
  JOIN jd_sports.products p ON i.product_id = p.product_id
  WHERE i.distribution_center = 'Manchester'
  ORDER BY i.stock_level DESC LIMIT 1
  ```
- **BQ result** (correct, 1 row):
  ```json
  [{"product_name":"Converse Chuck Taylor","stock_level":"2500"}]
  ```

### Root cause
**LLM final answer hallucination.** The SQL was **correct** — it returned the
right product and stock level. The citation in the trace confirms "Returned 1 rows."
The BQ data was fed into the LLM context as:

```
[1] BigQuery: 1 rows:
  product_name: Converse Chuck Taylor, stock_level: 2500
```

Despite having the correct data, the LLM replied "No relevant data found." This is
a pure instruction-following failure — the LLM either ignored the context or
misinterpreted the instruction "If no source answers the question, say No relevant
data found."

### Evidence
**App SQL executed on BQ returned the correct result:**
```json
[{"product_name":"Converse Chuck Taylor","stock_level":"2500"}]
```

### Fix
This is not an SQL bug — it's an LLM reliability issue. Potential mitigations:
1. Add explicit guardrails: if BigQuery returned ≥1 rows, prepend "The database
   returned data — answer the question from it."
2. Retry the LLM call if the reply contains "No relevant data found" but BQ had data.
3. Increase LLM temperature or switch model for final answer generation.

---

## bq-19: "Which brand has the lowest-priced active product, and what is the product name and price?"

### What happened
| Aspect | Detail |
|--------|--------|
| App replied | "Norelevant data found." (typo — missing space) |
| Ground truth | "Under Armour; Under Armour Backpack at GBP 45.00." |
| Pass | ❌ (score 0) |

### Pipeline trace
- **Classification**: DATABASE (correct)
- **SQL generated**:
  ```sql
  SELECT brand, product_name, rrp FROM jd_sports.products
  WHERE is_active = TRUE ORDER BY rrp ASC LIMIT 1
  ```
- **BQ result** (correct, 1 row):
  ```json
  [{"brand":"Under Armour","product_name":"Under Armour Backpack","rrp":"45.0"}]
  ```

### Root cause
**LLM final answer hallucination** — identical pattern to bq-12. The SQL was
correct and returned valid data. The citation confirms "Returned 1 rows."
But the LLM output `"Norelevant data found."` (with a typo "Norelevant" — missing
space). This strongly suggests the LLM is pattern-matching on some condition
and short-circuiting to the "No relevant data found" response.

All 12 products in the `products` table are active (`is_active = TRUE`), so the
filter is correct.

### Evidence
**App SQL executed on BQ returns correct result:**
```json
[{"brand":"Under Armour","product_name":"Under Armour Backpack","rrp":"45.0"}]
```

### Fix
Same as bq-12. The LLM consistently fails to answer even when BQ returns data.
This needs a pipeline-level guard: if BQ returned rows, force the LLM to use them.

---

## bq-22: "What is the most common loyalty tier among our registered users?"

### What happened
| Aspect | Detail |
|--------|--------|
| App replied | "The most common loyalty tier is **gold**, with 3 users." |
| Ground truth | "Three-way tie: Gold, Silver, and Standard (each has exactly 3 users)." |
| Pass | ❌ (score 0.35) |

### Pipeline trace
- **Classification**: DATABASE (correct)
- **SQL generated**:
  ```sql
  SELECT u.loyalty_tier, COUNT(*) as user_count
  FROM jd_sports.users u
  GROUP BY u.loyalty_tier
  ORDER BY user_count DESC LIMIT 1
  ```
- **BQ result**:
  ```json
  [{"loyalty_tier":"gold","user_count":"3"}]
  ```

### Root cause
**SQL logic error — `LIMIT 1` masks ties.** The SQL correctly groups and counts
users by loyalty tier, but `LIMIT 1` only returns a single row even when there
are ties. The actual distribution is:

| loyalty_tier | count |
|-------------|-------|
| gold | 3 |
| silver | 3 |
| standard | 3 |
| platinum | 1 |

Gold, Silver, and Standard are in a three-way tie with 3 users each. BigQuery
returns gold first (alphabetical tiebreaker), but the LLM only sees `gold: 3`
and cannot detect the tie.

**Ground truth SQL** drops `LIMIT 1`:
```sql
SELECT loyalty_tier, COUNT(*) as count
FROM analysis-ai-499819.jd_sports.users
GROUP BY loyalty_tier ORDER BY count DESC
```

This returns all 4 rows, allowing the LLM to detect the three-way tie at count=3.

### Fix
Do not use `LIMIT 1` for "most common" / "highest" questions. Either:
1. Use `DENSE_RANK()` or `RANK()` window function to detect ties, or
2. Return all rows and let the LLM handle tie detection, or
3. Add a second query that checks if there are other rows with the same count.

---

## bq-24: "Which distribution center stores the Hoka Clifton 9, and what is its stock level?"

### What happened
| Aspect | Detail |
|--------|--------|
| App replied | "No relevant data found." |
| Ground truth | "Glasgow DC; stock level: 600 units." |
| Pass | ❌ (score 0) |

### Pipeline trace
- **Classification**: DATABASE (correct)
- **SQL generated**:
  ```sql
  SELECT i.distribution_center, i.stock_level
  FROM jd_sports.inventory_items i
  JOIN jd_sports.products p ON i.product_id = p.product_id
  WHERE p.brand = 'Hoka'
    AND p.product_name = 'Clifton 9'
  ```
- **BQ result**: `[]` (empty)

### Root cause
**LLM SQL generation error — incorrect product_name** (identical to bq-11).
The LLM split "Hoka Clifton 9" into `brand = 'Hoka'` and `product_name = 'Clifton 9'`.
In the DB, `product_name` is `'Hoka Clifton 9'`:

```json
[{"product_id":"PROD-005","product_name":"Hoka Clifton 9","brand":"Hoka"}]
```

The WHERE clause `p.product_name = 'Clifton 9'` matches nothing.

**Ground truth SQL** (correct):
```sql
SELECT i.distribution_center, i.stock_level
FROM inventory_items i JOIN products p ON i.product_id = p.product_id
WHERE p.product_name = 'Hoka Clifton 9'
```

**Ground truth BQ result:**
```json
[{"distribution_center":"Glasgow","stock_level":"600"}]
```

### Fix
Same as bq-11. The SQL generator must not split product names that include the
brand prefix. The LLM prompt needs to emphasize that `product_name` is the full
product title and should be matched as-is.

---

## Cross-cutting Patterns

| Pattern | Affected questions |
|---------|-------------------|
| **Product name splitting** — LLM splits "Brand Product" into brand + name fragment filters | bq-11, bq-24 |
| **LLM final answer hallucination** — SQL correct, BQ returns data, LLM says "No relevant data found" | bq-12, bq-19 |
| **Missing status filter** — SQL counts all orders regardless of completion status | bq-06 |
| **Wrong column for returns** — queries `orders.status = 'returned'` instead of `order_items.returned` | bq-10 |
| **LIMIT 1 hides ties** — single-row result masks tied values | bq-22 |

### Severity assessment

| Question | Root cause category | Severity | Fix scope |
|----------|-------------------|----------|-----------|
| bq-06 | SQL generation (missing filter) | High | Golden examples + prompt |
| bq-10 | SQL generation (wrong column) | High | Schema understanding + golden examples |
| bq-11 | SQL generation (name splitting) | High | Prompt engineering |
| bq-12 | LLM answer (hallucination) | Critical | Pipeline-level guard |
| bq-19 | LLM answer (hallucination) | Critical | Pipeline-level guard |
| bq-22 | SQL generation (LIMIT 1) | Medium | Prompt engineering |
| bq-24 | SQL generation (name splitting) | High | Prompt engineering |

### Recommended actions

1. **Pipeline guard for hallucination**: If `bqRaw.results.rowCount > 0` and the
   LLM reply contains "no relevant data found" (case-insensitive), retry the
   LLM call with an even more directive prompt or simply format the BQ results
   directly as the answer without an LLM call.
2. **Product name prompt**: Add explicit instruction in the SQL generation prompt:
   "Use the full product_name string as-is from the question. Do not split the
   product name into brand and name fragments."
3. **Status filter golden example**: Ensure bq-06 type questions always include
   `status IN ('delivered', 'shipped')` in golden examples.
4. **Returns golden example**: Add a `COUNTIF(returned = true)` pattern to golden
   examples so the LLM learns returns are in `order_items.returned`, not
   `orders.status`.
5. **Tie detection**: Replace `LIMIT 1` with window functions for "most common"
   style questions, or remove the limit and let the LLM handle ties.
