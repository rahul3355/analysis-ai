# Deep Analysis: Golden 100 Test Failures

**Generated:** 2026-06-20  
**Method:** 3 subagents independently traced each failed question through the pipeline, re-ran SQL queries, read orchestrator source code, and identified root causes.  
**Scope:** 26 questions that failed both LLM judges' consensus (after excluding parse errors).

---

## Failure Overview

| Category | Failures | Pass Rate | 
|----------|----------|-----------|
| Document-only | 2 | 92% |
| BigQuery-only | 7 | 72% |
| Hybrid | 16 | 36% |
| Out-of-Scope | 3 | 88% |
| **Total** | **28** | **72%** |

---

## Root Cause Taxonomy

Every failure maps to exactly one of 6 root causes:

| # | Root Cause | Questions | % of Failures |
|---|------------|-----------|--------------|
| **RC1** | Intent cache poisoning | hyb-05, -09, -10, -12, -13, -16, -18, -19, -20, -22, -23 | **11 (39%)** |
| **RC2** | Product name splitting in SQL | bq-11, bq-24, hyb-04, hyb-23 | **4 (14%)** |
| **RC3** | LLM ignores correct BQ results | bq-12, bq-19, hyb-06 | **3 (11%)** |
| **RC4** | SQL logic error (wrong column/filter/LIMIT) | bq-06, bq-10, bq-22, hyb-19 | **4 (14%)** |
| **RC5** | Context merging failure (doc overwhelms BQ) | hyb-02, hyb-21 | **2 (7%)** |
| **RC6** | No abstention mechanism (hallucination) | doc-08, oos-10, oos-16 | **3 (11%)** |
| *RC7* | *SQL generation failure (complex multi-table)* | *hyb-15* | *1 (4%) — a subtype of RC4* |

---

## Deep Dive: Each Root Cause

### RC1 — Intent Cache Poisoning (39% of failures)

**What happens:** The Pinecone intent cache at `apps/web/src/server/services/intentCacheService.ts:19-43` stores the intent classification result for each question. Once cached, all subsequent runs return the cached intent with `stage: "cache"` and `confidence: 0.95`, bypassing both heuristic and LLM classifiers entirely.

**The loop:**
```
Initial run → heuristic returns wrong intent (e.g., DOCUMENT for a hybrid question)
  → cached in Pinecone at namespace intent-routing-cache
  → all future runs return the cached wrong intent
  → orchestrator only runs that pipeline branch
  → BQ never queried (if cached as DOCUMENT)
  → document never searched (if cached as DATABASE)
```

**Why the heuristic gets it wrong:** The classifier at `classifierHeuristics.ts` checks HYBRID patterns first (lines 113-115), but the patterns are too narrow. For example:
- `/how many.{0,30}(stores|store)/i` → DOCUMENT (0.97) fires before HYBRID
- `/bigquery/i` → DATABASE (0.92) fires before HYBRID  
- `/gross margin/i` → DOCUMENT (0.95) fires before HYBRID

The "conflicting-patterns" resolution (lines 129-133) correctly identifies HYBRID only when two patterns from different categories both score >= 0.7 — but many hybrid questions don't trigger the HYBRID pattern at all.

**Fix needed:** Add TTL (time-to-live) to Pinecone cache entries, or validate cached intents against heuristic before returning. A 24-hour TTL would force re-classification after any pipeline changes.

---

### RC2 — Product Name Splitting in SQL (14% of failures)

**What happens:** The NL-to-SQL model (`cohere/north-mini-code:free` via OpenRouter at `bigquerySqlGenerator.ts:72`) generates SQL that **splits** "Brand Product Name" into separate `brand` and `product_name` filters:

```
Question mentions: "The North Face Nuptse Jacket"
SQL generated:     WHERE p.brand = 'The North Face' AND p.product_name = 'Nuptse Jacket'
DB has:            product_name = 'The North Face Nuptse Jacket'  ← no match
```

**Verified against BQ:**
```sql
-- App SQL (broken):
SELECT * FROM products WHERE brand = 'Hoka' AND product_name = 'Clifton 9'
-- Returns: [] (empty)

-- Correct SQL:
SELECT * FROM products WHERE product_name = 'Hoka Clifton 9'
-- Returns: PROD-005, Hoka Clifton 9, 130.00
```

**Evidence from sql-cache.json:** The semantic cache at `apps/web/src/server/config/sql-cache.json` contains many cached SQL queries. The full product names in the DB are: "Nike Air Force 1 Low", "Hoka Clifton 9", "The North Face Nuptse Jacket", "ASICS Gel Kayano 31", etc. All include the brand prefix. But the LLM consistently strips it.

**Fix needed:** The SQL generation prompt must include explicit instructions: "product_name is the FULL product title including the brand. Do NOT split into brand + fragment. Use `LIKE '%keyword%'` if unsure about exact name."

---

### RC3 — LLM Ignores Correct BQ Results (11% of failures)

**What happens:** The SQL is **correct**. BigQuery returns the right data. The citation shows "Returned 1 rows". But the LLM outputs "No relevant data found."

**Verified examples:**

| Question | SQL Result | LLM Said |
|----------|-----------|----------|
| bq-12: Highest stock at Manchester DC | Converse Chuck Taylor, 2500 units | "No relevant data found" |
| bq-19: Lowest-priced active product | Under Armour Backpack, GBP 45.00 | "Norelevant data found" (typo) |
| hyb-06: Orders in Scotland | order_count: 6 | "No relevant data found" |

The "Norelevant" typo (missing space) is evidence that the LLM is pattern-matching on a condition and short-circuiting. The system prompt at `orchestrator.ts:169-170` says:
> "If a database query successfully returned 0 rows, state that no records match the criteria... If no source answers the question, say No relevant data found."

The LLM is incorrectly interpreting "the question mentions BigQuery" as "no source answers this" — possibly confused by the question structure.

**Fix needed:** A pipeline-level guard: if BQ returned 1+ rows, force the LLM to use them. Options:
1. Prepend "The database returned data — answer from it." to the LLM prompt
2. Retry the LLM call if reply contains "no relevant data found" but BQ had data
3. Add a boolean flag `bqHadData` to the context that the LLM can check

---

### RC4 — SQL Logic Errors (14% of failures)

Four distinct sub-patterns:

| Sub-pattern | Example | Impact |
|------------|---------|--------|
| **Missing status filter** | bq-06: Counts all 15 online orders instead of 12 delivered/shipped | Overcount by 25% |
| **Wrong column** | bq-10: Queries `orders.status = 'returned'` (doesn't exist) instead of `order_items.returned` | Counts 0 returns instead of 1 |
| **LIMIT 1 hides ties** | bq-22: Three tiers tied at 3 users, but LIMIT 1 shows only "gold" | Masks three-way tie |
| **LEFT JOIN includes cancelled** | hyb-19: LEFT JOIN on orders includes cancelled order; SUM returns 1 instead of 0 | Overcount by 1 |

**bq-10 is the most instructive**: The generated SQL has TWO CTEs. The first CTE checks `orders.status = 'returned'` — but the `orders` table has NO 'returned' status (verified: `SELECT DISTINCT status` returns only delivered, shipped, processing, cancelled). Returns are tracked as a boolean `returned` on each row of `order_items`. The second CTE correctly computes the return rate as 5.88%, but the first CTE returns 0. The SQL generator tried to count "returned orders" (distinct orders with a returned item) but used the wrong table.

**Fix needed:**
1. Add golden examples to the SQL generator prompt showing the `returned` column in `order_items`
2. Replace `LIMIT 1` with `DENSE_RANK()` or remove LIMIT for "most common" questions
3. Use INNER JOIN instead of LEFT JOIN when order status filtering matters

---

### RC5 — Context Merging Failure (7% of failures)

**What happens:** Both RAG and BQ execute successfully. The orchestrator merges them at line 169:
```typescript
const mergedContext = parts.join("\n\n");
```
The LLM receives document chunks AND BQ results. But the document chunks dominate because:
1. Documents provide pre-computed numbers ("Nike gross margin is 46.8%") vs. BQ providing raw data ("revenue: 540, cost: 295") that requires arithmetic
2. The LLM defaults to the pre-computed number instead of deriving it
3. When both sources are present, there is no priority signal telling the LLM "BQ is the authoritative source for actuals"

**hyb-02 evidence**: The document says "Nike planned gross margin 46.8%". BQ returns revenue=540, cost=295. The LLM should compute 245/540=45.37% but instead outputs "46.8%" — defaulting to the document figure.

**hyb-21 evidence**: The document has rich context (GBP 5.6M, 36,000 pairs). BQ returns 1 pair sold, stock 300. The LLM ignores BQ and says "no data."

**Fix needed:** The merging prompt must explicitly rank sources: "BigQuery data takes priority for actual/computed figures. Document data provides context, targets, and descriptive information."

---

### RC6 — No Abstention Mechanism (11% of failures)

**What happens:** The system has no way to say "I cannot answer this" at any stage of the pipeline. Each component tries its best to produce an answer:

- **Classifier** (doc-08): Sees `average order value` → DATABASE, ignoring that the question asks for "target"
- **SQL Generator** (oos-10): Sees `Google Ads` → maps to `traffic_source = 'paid'`, ignoring that Germany has no data
- **RAG** (oos-16): Retrieves a chunk scored at 0.037 (just above the 0.001 threshold) that contains the "12 stores" fact, and the LLM includes it even though it doesn't answer the question
- **Answer Generator** (oos-10): Receives "2 users" from a query that counts ALL paid users (not Google Ads in Germany) and uses it verbatim

**The threshold problem**: `MIN_RELEVANCE_SCORE = 0.001` at `orchestrator.ts:10` is functionally zero. Pinecone similarity scores for relevant documents typically range 0.3-0.8. A threshold of 0.001 means ANY chunk passes, even ones scored at 0.03 (oos-16). This should be raised to at least 0.3.

**Fix needed:** Three architectural changes:
1. Raise relevance threshold from 0.001 to at least 0.3
2. Add an abstention path in the SQL generator: if the question references entities not in the schema, return empty instead of making imprecise mappings
3. Add post-retrieval verification: after getting BQ results, check whether the SQL actually answers the question (e.g., does it filter by the entities mentioned?)

---

## Architectural Patterns

### Pattern A: Classification-First Gating (All Categories)

The orchestrator gates everything on `classifyIntentFull()` output:
- DATABASE → only BQ
- DOCUMENT → only RAG
- HYBRID → both
- UNKNOWN → no data

This works perfectly when classification is correct, which it is ~72% of the time. But when it's wrong (especially for hybrid questions), the wrong pipeline branch runs and the right data source is never consulted. The fallback at lines 91-94 only catches the case where BQ returns empty — it does NOT catch the case where BQ returns *wrong* data.

**The design assumption:** Intent classification is a solved problem. **Evidence suggests otherwise** — 39% of failures are classification errors.

### Pattern B: NL-to-SQL Without Abstention (BQ + Hybrid)

The SQL generator at `bigquerySqlGenerator.ts` has only two output paths:
1. Valid SQL
2. Error/exception

There is no "I cannot generate SQL that matches the question" path. When the question mentions entities not in the schema ("Google Ads", "Germany"), the LLM maps them to the closest available values rather than abstaining. This produces plausible-looking SQL that returns real data for a *different* question.

### Pattern C: Empty-Result Ambiguity (BQ + Hybrid)

The orchestrator's `hasActualData` check at line 145:
```typescript
const hasActualData = rows.length > 0 && !rows.every((row) =>
  Object.values(row).every((val) => val === null || val === undefined || val === "")
);
```

This cannot distinguish between:
- "No matching records" (SQL is correct, data genuinely doesn't exist)
- "SQL was wrong" (WHERE clause didn't match, but data exists)
- "SUM of empty set returned NULL" (SQL ran but returned a NULL row)

All three cases produce the same "0 records found" message. For hyb-04, the SQL returned 1 row with `total_sold: null` — the system treated this as "no data" when actually the SQL just had the wrong product name.

---

## Summary of Recommended Fixes

| Priority | Fix | Affected Root Causes | Est. Impact |
|----------|-----|---------------------|-------------|
| **P0** | Add TTL/validation to Pinecone intent cache | RC1 (39%) | Recovers 11/28 failures |
| **P0** | Add pipeline guard: if BQ returned data, force LLM to use it | RC3 (11%) | Recovers 3/28 failures |
| **P0** | Raise relevance threshold from 0.001 to 0.3+ | RC6 (partially) | Reduces false positives |
| **P1** | Fix SQL prompt to not split product names | RC2 (14%) | Recovers 4/28 failures |
| **P1** | Add golden examples for `returned` column, `INNER JOIN` | RC4 (14%) | Recovers 4/28 failures |
| **P1** | Add abstention path in SQL generator for out-of-schema entities | RC6 | Prevents hallucinations |
| **P1** | Add source priority in context merging prompt | RC5 (7%) | Recovers 2/28 failures |
| **P2** | Replace LIMIT 1 with window functions for tie detection | RC4 (bq-22) | Recovers 1/28 failures |
| **P2** | Always run both pipelines (hybrid-first architecture) | RC1, RC5, RC6 | Architectural change |

---

## Files

| File | Agent | Contents |
|------|-------|----------|
| `analysis-bq.md` | A | 7 BQ failures analyzed with SQL, evidence, root cause |
| `analysis-hybrid.md` | B | 16 hybrid failures: cache poisoning, SQL errors, context merging |
| `analysis-doc-oos.md` | C | 3 doc/OOS failures: classification, abstention, thresholds |
| `DEEP-ANALYSIS.md` | Consolidated | This file |
