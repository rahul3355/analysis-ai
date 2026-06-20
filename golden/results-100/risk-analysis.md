# Risk Analysis: Proposed Fixes for Post-Mortem Reports

**Analyzed:** 2026-06-20
**Dataset:** golden-100.json (100 tests across 4 categories)
**Source post-mortems:** postmortem-bq.md, postmortem-hybrid.md, postmortem-hallucination.md

---

## Fix 1: Remove `"returned"` from `orders.status` allowedValues

**What it changes:** `frontend/src/server/config/bigquery.ts:46` — remove `"returned"` from the `orders.status` enum.

**Affected tests:** None. Searched all 100 tests — none filter by `orders.status = 'returned'`. The ground-truth SQL for `bq-10` and `hyb-15` both use `order_items.returned = true`, not `orders.status`. The database has zero rows with `status = 'returned'` (confirmed by post-mortem BQ verification: statuses are delivered(15), shipped(2), processing(2), cancelled(1)).

**Regression?** No. Removing a phantom allowed value that doesn't exist in data can't break any working query.

**Risk: Low** — safe to apply unconditionally.

---

## Fix 2: Improve `order_items.returned` description

**What it changes:** `frontend/src/server/config/bigquery.ts:71` — change "Whether item was returned" to "Whether item was returned — THIS IS THE CANONICAL column for return tracking. Use this with WHERE o.status IN ('delivered', 'shipped') for return rate calculations."

**Affected tests:** The description change only affects the NL-to-SQL model's schema prompt. No test relies on a specific schema description string. The added text guides the model toward the correct column, away from the wrong `orders.status = 'returned'` path.

**Could it over-prioritize returns?** No. The description clarifies the canonical column for *return tracking*. It doesn't add any new SQL or change behavior — it's metadata only.

**Regression?** No.

**Risk: Low** — safe. This is a metadata improvement that only affects SQL generation quality.

---

## Fix 3: Include SQL query in non-empty BQ results

**What it changes:** `frontend/src/core/pipeline/orchestrator.ts:150` — adds `\n\nQuery: ${bqRaw.sql}` to the `bqText` format for non-empty results.

**Affected tests:** All BQ/hybrid tests that receive non-empty BQ results. The SQL query (~100-200 chars) is added to the LLM prompt, increasing token count by ~30-50 tokens per response. Given modern LLM context windows (32K+ tokens), this is negligible.

**Could context overflow occur?** No. The added tokens are tiny. The real risk is the opposite — this fix prevents "No relevant data found" hallucinations documented in `bq-08` and `bq-12`.

**Regression?** No. More context never harms — it only helps the LLM verify SQL filters.

**Risk: Low** — safe. Token increase is minimal. This fixes `bq-08` and `bq-12` by letting the LLM see WHERE/ORDER BY clauses.

**Note:** Fix 3 and Fix 12 are **redundant alternative solutions** to the same problem. If Fix 12 is applied (using `bqRaw.context`), Fix 3 becomes unnecessary because `formatBqContext` already includes the SQL. See conflicts section below.

---

## Fix 4: Strengthen the answer-present rule

**What it changes:** `frontend/src/core/pipeline/orchestrator.ts:169` — prompt preamble change from "If no source answers the question, say 'No relevant data found.'" to "If BigQuery returned data, that data IS the answer. Only say 'No relevant data found' when ALL sources are empty."

**Affected tests:**

| Test | Current behavior | With fix | Risk |
|------|-----------------|----------|------|
| `bq-08`, `bq-12` | LLM says "No relevant data found" despite correct BQ data | LLM trusts BQ and answers | **FIXES** the bug |
| `oos-06` (global profit) | LLM answers "986" with UK-only data | Same (or more confidently wrong) | **REGRESSION** — LLM becomes more confident answering wrong data |
| `oos-12` (Nike returns England) | LLM says "0 returns for Nike" (SQL missing England filter) | Same (or more confidently wrong) | **REGRESSION** — strengthens false confidence |
| `hyb-06` (Scotland orders) | LLM says "No relevant data found" despite correct 6 orders | LLM should now answer correctly | FIXES |

**The problem:** This fix doesn't distinguish between "BQ returned correct data that answers the question" and "BQ returned partially relevant data." For `oos-06`, BQ returns UK profit (986.0) while the question asks for "global profit." The LLM currently says "986" — with the strengthened rule, it would say "986" even more confidently, not questioning scope.

**Regression?** Probably — `oos-06` and `oos-12` could become more confidently wrong instead of self-correcting.

**Mitigation:** Pair this fix with a scope-awareness check. Add: "If the question contains geographic scope terms (global, England, Germany, etc.) that are NOT reflected in the SQL filters, note the data limitation." Or implement scope-detection at the classification layer (as recommended in post-mortem-hallucination.md §6).

**Risk: Medium** — beneficial for `bq-08`, `bq-12`, `hyb-06` but risks making `oos-06` and `oos-12` more confidently wrong. Do not apply without also adding scope-detection patterns.

---

## Fix 5: Add `\b[Bb][Qq]\b` to DATABASE heuristic pattern

**What it changes:** `frontend/src/core/pipeline/classifierHeuristics.ts:90` — regex from `/bigquery|sql query|database/i` to `/\b(bigquery|sql query|database|bq)\b/i`.

**Affected tests:** Searched all 100 test questions for standalone `bq` or `BQ`:

| Question | Contains "BQ"? | Current classification | With fix |
|----------|---------------|----------------------|----------|
| `hyb-02` | "in BigQuery?" | HYBRID (via LLM classifier) | HYBRID + DATABASE |
| `hyb-03` | "in BigQuery?" | HYBRID | No change |
| `hyb-07` | "in BigQuery?" | HYBRID | No change |
| `hyb-08` | "in BQ?" | DATABASE/HYBRID (LLM) | DATABASE (via heuristic) |
| `hyb-09` | "in BQ?" | DATABASE/HYBRID (LLM) | DATABASE (via heuristic) |
| `hyb-14` | "in BQ?" | DATABASE/HYBRID (LLM) | DATABASE (via heuristic) |
| `hyb-20` | "in BQ?" | DOCUMENT (wrong!) | DATABASE (now matches "bq") |
| `hyb-21` | "in BQ?" | DOCUMENT (wrong!) | DATABASE (now matches "bq") |
| `hyb-24` | "in BQ?" | DOCUMENT (wrong!) | DATABASE (now matches "bq") |

The `\b` word boundary ensures only standalone "BQ" matches, not "BQ" as a substring. No document-only or OOS question contains standalone "bq" or "BQ".

**Regression?** No — all matches are legitimate BQ/hybrid questions.

**Risk: Low** — safe. The word boundary prevents false positives. This is a targeted fix for the `hyb-20`/`hyb-21`/`hyb-24` classification bug.

---

## Fix 6: Add "in BQ" HYBRID pattern

**What it changes:** `frontend/src/core/pipeline/classifierHeuristics.ts` — add `{ regex: /in\s+BQ\b/i, intent: "HYBRID", weight: 0.92 }`.

**Affected tests:** Questions containing "in BQ":

| Question | Contains "in BQ"? | Current | With fix |
|----------|------------------|---------|----------|
| `hyb-08` | "generated in BQ" | LLM → HYBRID | HYBRID via heuristic |
| `hyb-09` | "sold in BQ" | LLM → HYBRID | HYBRID via heuristic |
| `hyb-14` | "percentage in BQ" | LLM → HYBRID | HYBRID via heuristic |
| `hyb-20` | "gross margin in BQ" | DOCUMENT (wrong) | HYBRID (fixes it) |
| `hyb-21` | "sold in BQ" | DOCUMENT (wrong) | HYBRID (fixes it) |
| `hyb-24` | "sold in BQ" | DOCUMENT (wrong) | HYBRID (fixes it) |

Searched all document and OOS questions — none contain "in BQ" as a phrase.

**Regresion?** No — zero false positives in golden-100.

**Risk: Low** — safe. This is the correct fix for `hyb-20`/`hyb-21`/`hyb-24`.

**⚠ Conflict alert:** Fix 6 (HYBRID, 0.92) competes with Fix 8 (DOCUMENT, 0.95) on questions containing both "campaign brief" AND "in BQ" (e.g., `hyb-24`: "The campaign brief targets 38,000 Adidas Gazelle pairs. How many pairs were sold in BQ..."). If Fix 8's DOCUMENT weight (0.95) beats Fix 6's HYBRID weight (0.92), BQ won't run. **Fix 6's weight must be higher than Fix 8's weight**, or the tie-breaking logic must prefer HYBRID. See conflicts section.

---

## Fix 7: Add tie-handling rule to SQL generator

**What it changes:** `frontend/src/server/services/bigquerySqlGenerator.ts:76` — add DENSE_RANK / no-LIMIT rule for "most common" / "highest" / "top" questions.

**Affected tests:** All tests using superlative patterns:

| Test | Superlative | Current SQL | With fix | Regression? |
|------|------------|------------|----------|-------------|
| `bq-02` | "most revenue" | `ORDER BY revenue DESC LIMIT 1` | DENSE_RANK / no LIMIT | No — unique winner |
| `bq-09` | "highest revenue" | `ORDER BY revenue DESC LIMIT 1` | DENSE_RANK / no LIMIT | No — unique winner |
| `bq-12` | "highest stock" | `ORDER BY stock_level DESC LIMIT 1` | DENSE_RANK / no LIMIT | No — unique winner |
| `bq-15` | "most...orders" | `ORDER BY count DESC LIMIT 1` | DENSE_RANK / no LIMIT | No — unique winner |
| `bq-19` | "lowest-priced" | `ORDER BY rrp ASC LIMIT 1` | DENSE_RANK / no LIMIT | No — unique winner |
| `bq-20` | "highest-priced" | `ORDER BY rrp DESC LIMIT 1` | DENSE_RANK / no LIMIT | No — unique winner |
| `bq-22` | "most common" | `ORDER BY count DESC LIMIT 1` | DENSE_RANK / no LIMIT | **FIXES** — returns all 3 tied tiers |
| `bq-01` | "top 3" | `LIMIT 3` | Unchanged (not a "most"/"highest" pattern) | No |

For unique-winner cases, `DENSE_RANK() WHERE rnk = 1` produces the same result as `LIMIT 1`. The extra DENSE_RANK complexity doesn't change the answer — it just generates slightly more complex SQL.

The instruction says "check for ties" — the NL-to-SQL model might interpret this in unexpected ways. For `bq-02` (Nike, unique revenue leader), adding tie-checking shouldn't change output, but it adds a code path where the model could make a mistake (e.g., using wrong partition by clause).

**Regression?** No for this specific set. The DENSE_RANK approach is logically equivalent for unique winners.

**Risk: Low** — but monitor for NL-to-SQL model misinterpreting the tie rule. The prompt instruction is nuanced and the model might over-apply it.

---

## Fix 8: Add "campaign brief" DOCUMENT pattern

**What it changes:** `frontend/src/core/pipeline/classifierHeuristics.ts` — add `{ regex: /\bcampaign\s+brief\b/i, intent: "DOCUMENT", weight: 0.95 }`.

**Affected tests:**

| Question | Has "campaign brief"? | Current classification | With fix alone | Correct? |
|----------|----------------------|----------------------|----------------|----------|
| `hyb-04` | "Back to School campaign brief" | DOCUMENT (via back-to-school pattern) | DOCUMENT | ✅ should be **HYBRID** |
| `hyb-05` | "campaign brief" | DOCUMENT (via doc-heuristic) | DOCUMENT | ✅ should be **HYBRID** |
| `hyb-10` | "campaign brief" | DOCUMENT (via doc-heuristic) | DOCUMENT | ✅ should be **HYBRID** |
| `hyb-11` | "campaign brief" | DOCUMENT (via doc-heuristic) | DOCUMENT | ✅ should be **HYBRID** |
| `hyb-18` | "campaign brief" | DOCUMENT (via doc-heuristic) | DOCUMENT | ✅ should be **HYBRID** |
| `hyb-19` | "campaign brief" | DOCUMENT (via doc-heuristic) | DOCUMENT | ✅ should be **HYBRID** |
| `hyb-22` | "campaign brief" | DATABASE (via stock-patterns) | **DOCUMENT now!** | ❌ **REGRESSION** |
| `hyb-24` | "campaign brief" | DOCUMENT (via doc-heuristic) | DOCUMENT | ✅ should be **HYBRID** |
| `hyb-25` | "campaign brief" | DOCUMENT (via doc-heuristic) | DOCUMENT | ✅ should be **HYBRID** |

**Critical finding: `hyb-22` is a regression.** Currently, `hyb-22` ("Nike Dunk Low targets 32,000 pairs in the campaign brief. How many pairs were sold and what is the stock level at Manchester DC?") is classified as DATABASE because it doesn't match "Back to School" prefix but matches DATABASE patterns like "stock level" (0.95) and "how many.{0,30}pairs" (0.90). Adding Fix 8 alone would re-classify it to DOCUMENT (0.95), preventing BQ from running — making an already-failing test worse (currently fails due to multi-part SQL; with Fix 8, it fails because BQ isn't even called).

**The conflict:** Fix 8 (DOCUMENT, 0.95) competes with:
- Fix 6 (HYBRID, 0.92) for questions containing both "campaign brief" and "in BQ" (e.g., `hyb-24`)
- Existing DATABASE patterns for questions where "campaign brief" appears alongside BQ keywords (e.g., `hyb-22`)

**Mitigation:** Either:
1. Lower Fix 8's weight below HYBRID weight (make it 0.80, below Fix 6's 0.92), or
2. Add a separate "campaign brief" → HYBRID pattern instead of DOCUMENT, or
3. Implement orchestrator-level fallback: if classified as DOCUMENT but question also contains BQ-related terms, run BQ as well

**Risk: Medium** — Fix 8 alone causes regression on `hyb-22`. Must be paired with weight adjustments and/or the "in BQ" HYBRID pattern (Fix 6).

⚠ **Conflict alert:** See conflicts section (Fixes 5, 6, 8).

---

## Fix 9: Add pluralization handling for product name LIKE matching

**What it changes:** `frontend/src/server/services/bigquerySqlGenerator.ts:76` — strip trailing 's' and common plural suffixes before LIKE matching.

**Affected tests:** All tests that match product names.

**Products ending in 's' in the database (risk of incorrect stemming):**

| Product name | Ends in 's'? | Question | Strip trailing 's'? | Match result |
|-------------|-------------|----------|-------------------|--------------|
| **ASICS Gel Kayano 31** | Yes — "ASICS" | `hyb-21`: "ASICS Gel Kayano 31" | "ASIC Gel Kayano 31" | **BROKEN** — no match |
| **ASICS Gel Kayano 31** | Yes — "ASICS" | `bq-13`: "ASICS Gel Kayano 31" | "ASIC Gel Kayano 31" | **BROKEN** — no match |
| The North Face Nuptse Jacket | No | `bq-11`, `hyb-05` | No change | OK |
| Nike Air Force 1 Low | No | `bq-23`, `hyb-04` | No change | OK |
| Converse Chuck Taylor | No | `bq-12`, `hyb-18` | No change | OK |
| Under Armour Backpack(s) | Slight | `hyb-10`: "Backpacks" | "Backpack" | **FIXES** — matches |
| Adidas Gazelle | No | `hyb-11`, `hyb-24` | No change | OK |
| Hoka Clifton 9 | No | `bq-24`, `hyb-01`, `hyb-09`, `hyb-23` | No change | OK |
| New Balance 530 | No | `hyb-13` | No change | OK |
| Nike Pegasus 41 | **Yes** — "Pegasus" | `hyb-12`: "Nike Pegasus 41" | "Nike Pegasu 41" | **BROKEN** — no match |
| Nike Dunk Low | No | `hyb-22` | No change | OK |
| Nike Air | No | — | No change | OK |
| Nike Tech Fleece Hoodie | No | `hyb-19` | No change | OK |

**Risk analysis:**
- Blind `s`-stripping would break `bq-13`, `hyb-21` (ASICS → ASIC), and `hyb-12` (Pegasus → Pegasu)
- For `hyb-10` (Under Armour Backpacks → Backpack), it would fix the product name match
- For `hyb-18` (Converse Chuck Taylor All Star), the issue is not pluralization but extra words — stripping 's' won't help

**The fix needs to be smarter than blind trailing-s stripping.** Options:
1. Only strip when the DB product name ends in a letter followed by 's' that is NOT a proper noun
2. Use a well-known word list of exceptions (ASICS, Pegasus, etc.)
3. Use OR-based matching: `LIKE '%Backpack%' OR LIKE '%Backpacks%'`
4. Use brand-level fallback when product name fails

**Regression?** Yes — `bq-13`, `hyb-21`, and `hyb-12` would fail with a naive implementation.

**Mitigation:** Use OR-based matching (option 3) instead of blind stemming, or maintain an exception list.

**Risk: Medium** — simple trailing-s stripping will break ASICS and Pegasus queries. Implementation must handle exceptions.

---

## Fix 10: Add SQL rule: "Never use constants from question in SQL"

**What it changes:** `frontend/src/server/services/bigquerySqlGenerator.ts` — add rule: "NEVER use numbers from the user's question as input values in SQL formulas. All values must come from database columns only."

**Affected tests:** Searched all golden-100 tests for queries using constants from questions:

| Test | Question number | Used in SQL? | Current behavior | With fix |
|------|----------------|-------------|-----------------|----------|
| `hyb-21` | 5600000 (GBP 5.6M) | `ROUND(5600000 / p.rrp, 2)` | Back-calculates sales | **FIXES** — would use SUM(oi.quantity) |
| `hyb-04` | 45000 | No — doc-only target | Correct | No change |
| `hyb-05` | 8000 | No | Correct | No change |
| `hyb-18` | 28000 | No | Correct | No change |
| `hyb-22` | 32000 | No | Correct | No change |
| `hyb-24` | 38000 | No | Correct | No change |

No golden-100 test LEGITIMATELY uses a number from the user's question as a SQL input. All the "target" numbers from campaign briefs are document facts, not SQL parameters.

**What about time filters?** "Last 30 days" — the SQL generator would use `DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)`. The "30" is generated by the SQL generator's knowledge, not extracted from the user's question. No regression.

**What about revenue thresholds?** No golden test uses revenue thresholds with user-supplied numbers. If a future question says "show products worth more than 100", the fix would prevent legitimate use of "100" in the SQL WHERE clause.

**Regression?** No — current golden set doesn't have any test that needs user-supplied numbers in SQL.

**Risk: Low** — safe for current tests. Monitor if future golden examples add threshold-based or filter-based questions.

---

## Fix 11: Raise MIN_RELEVANCE_SCORE from 0.001 to 0.3

**What it changes:** `frontend/src/core/pipeline/orchestrator.ts:10` — threshold constant from 0.001 to 0.3.

**Affected tests:** All document and hybrid tests that depend on document chunk retrieval. Relevance scores from post-mortem evidence:

| Test | Relevance score | Current (0.001) | With 0.3 | Impact |
|------|----------------|-----------------|----------|--------|
| `oos-13` | 0.00266 | Included → correctly rejected | **Excluded** | Same (no data → "no data") |
| `oos-18` | 0.003-0.004 | Included → correctly rejected | **Excluded** | Same (no data → "no data") |
| `oos-20` | 0.022 | Included → correctly rejected | **Excluded** | Same (no data → "no data") |
| `doc-*` series | Unknown (likely 0.5+) | Included | Included | Probably OK |
| `hyb-*` doc chunks | Unknown | Included | **Unknown** | **HIGH RISK** |

**The problem:** We don't know the relevance scores for legitimate document matches. For hybrid questions like `hyb-02` ("Nike's planned gross margin is 46.8% in the sales plan"), the document chunk about Nike's planned gross margin needs to be retrieved. If the embedding model assigns a score of, say, 0.15 because the question is 50% about BQ data and 50% about document data, raising the threshold to 0.3 would silently drop the document context.

| Hybrid question | Document needed | Risk if doc dropped |
|----------------|----------------|-------------------|
| `hyb-02` | Nike planned GM 46.8% | LLM would only see BQ actual 45.37%, lose planned-vs-actual comparison |
| `hyb-03` | Online penetration 33% target | Same — lose target context |
| `hyb-04` | BTS target 45,000 pairs | Same |
| All 25 hybrid tests | Document targets/plans | Same — every hybrid test needs BOTH sources |

A 0.3 threshold is **300× higher** than the current 0.001. That's aggressive. Even good semantic matches often score between 0.1 and 0.3.

**Regression?** Probably — unknown but significant risk that legitimate document chunks for hybrid questions fall below 0.3, causing the LLM to only see BQ data without document context.

**Mitigation:** 
1. First, measure actual relevance scores for all 25 hybrid questions and 25 document questions in the golden set
2. Set the threshold based on empirical data (suggested: 0.05-0.1 as a starting point, not 0.3)
3. For hybrid intent, use a LOWER threshold (0.05) than for document-only (0.1)

**Risk: High** — raising from 0.001 to 0.3 is a 300× increase without empirical evidence that all legitimate document matches score ≥0.3. Could silently break every hybrid test and some document-only tests.

---

## Fix 12: Use `formatBqContext` instead of `summarizeRow`

**What it changes:** `frontend/src/core/pipeline/orchestrator.ts:150` — replace `summarizeRow` + manual `bqText` with `bqRaw.context`.

**Affected tests:** All BQ and hybrid tests that receive non-empty BQ results.

**What `formatBqContext` returns:**
```
BigQuery results (N rows, Xms):
  col1: val1, col2: val2
  col1: val3, col2: val4

Query: SELECT ... FROM ... WHERE ...
```

**What current code returns:**
```
[N] BigQuery: N rows:
  col1: val1, col2: val2
```

**Differences:**
1. `formatBqContext` includes latency (Xms) → beneficial, helps LLM trust data
2. `formatBqContext` includes the SQL query → **critical fix** for bq-08/bq-12
3. `formatBqContext` does NOT prepend `[${bqIndex}]` → needs to be added in the orchestrator

**Risk: Is `bqRaw.context` always populated?** From `bigqueryService.ts:110`: `const context = formatBqContext(results); return { sql, results, context };` — the `context` field is always computed, even for empty results. It always returns a string. No null/undefined risk.

**What if context is empty?** `formatBqContext` has two branches:
- Empty rows: returns "BigQuery returned no matches..." (always non-empty string)
- Non-empty rows: returns the formatted header + rows + query (always non-empty string)

So `bqRaw.context` is always a non-empty string when `bqRaw` is defined.

**Regression?** No — the format is strictly richer (adds latency, SQL query). The index prefix `[${bqIndex}]` needs to be preserved.

**Risk: Low** — this fix uses existing tested functionality (`formatBqContext` is already used in `bigqueryService.ts` and returned as the `context` field). The orchestrator just needs to use it instead of re-formatting.

---

## Conflicts Between Fixes

### Conflict 1: Fixes 3 and 12 — Redundant solutions to the same problem

**Both target `orchestrator.ts:150`.** Fix 3 manually appends SQL to the existing `summarizeRow` format. Fix 12 replaces the entire formatting with `bqRaw.context` (which already includes SQL).

If both are applied: duplicate SQL in prompt. `bqRaw.context` already ends with `\n\nQuery: ${results.executedQuery}`. If Fix 3 then appends another `\n\nQuery: ${bqRaw.sql}`, the prompt would show the query twice.

**Resolution:** Apply Fix 12 only (it's the cleaner solution) — Fix 12 subsumes Fix 3.

### Conflict 2: Fixes 5, 6, 8 — Classification weight priority

**All modify `classifierHeuristics.ts` with different weight patterns:**

| Fix | Pattern | Intent | Weight | Competes on | Question example |
|-----|---------|--------|--------|-------------|-----------------|
| Fix 5 | `\b(bq)\b` | DATABASE | 0.85 | Any `bq` mention | "in BQ?" |
| Fix 6 | `in\s+BQ\b` | HYBRID | 0.92 | "in BQ" explicitly | "gross margin in BQ?" |
| Fix 8 | `\bcampaign\s+brief\b` | DOCUMENT | 0.95 | "campaign brief" | "campaign brief targets... in BQ?" |

**Scenarios where fixes conflict:**

1. **`hyb-24`**: "The campaign brief targets 38,000 Adidas Gazelle pairs. How many pairs were sold **in BQ**..."
   - Fix 8 matches: DOCUMENT (0.95)
   - Fix 6 matches: HYBRID (0.92)
   - **Fix 8 wins** → BQ doesn't run → regression for `hyb-24`

2. **`hyb-22`**: "Nike Dunk Low targets 32,000 pairs in the campaign brief. How many pairs were sold and what is **stock level**..."
   - Fix 8 matches: DOCUMENT (0.95)
   - Existing DATABASE pattern matches: "stock level" (0.95)
   - Tie → depends on implementation, but either is wrong (should be HYBRID)

3. **`hyb-20`**: "The sales plan targets Accessories gross margin of 51.0%. What is the actual Accessories **gross margin in BQ**?"
   - Fix 6 matches: HYBRID (0.92)
   - Existing DOCUMENT patterns match: "annual sales plan" (0.99), "gross margin" (0.95)
   - DOCUMENT (0.99) wins → BQ doesn't run → regression for `hyb-20`

**Resolution:** The weight ordering MUST be: HYBRID > DOCUMENT for questions containing both "document-like" and "BQ-like" keywords. Options:
- Make Fix 6 weight Higher than Fix 8 (e.g., HYBRID 0.96, DOCUMENT 0.90)
- Use multiple-match tiebreaker that prefers HYBRID when both HYBRID and DOCUMENT patterns match
- Add a special rule: "if both DOCUMENT and HYBRID/DATABASE patterns match, prefer HYBRID"

**Current risk:** Without weight adjustment, Fix 8 at 0.95 beats Fix 6 at 0.92, causing regressions on `hyb-20`, `hyb-24`.

### Conflict 3: Fix 4 vs Fix 8 — Opposing directions

Fix 4 tells the LLM "trust BQ data, it IS the answer." Fix 8 makes the classifier prefer DOCUMENT over HYBRID/DATABASE (preventing BQ from running). These work in opposite directions — Fix 4 assumes BQ data is always available, while Fix 8 sometimes blocks BQ.

**Resolution:** If Fix 8 is applied with high weight, Fix 4's BQ trust directive becomes less useful (BQ won't run for many hybrid questions). These fixes should be coordinated: either always run BQ for hybrid-ish questions, or lower Fix 8's weight.

---

## Summary Table

| Fix | File | Change | Risk | Regression potential | Conflicts with |
|-----|------|--------|------|---------------------|---------------|
| 1 | `bigquery.ts:46` | Remove "returned" from orders.status | **Low** | None | — |
| 2 | `bigquery.ts:71` | Improve order_items.returned description | **Low** | None | — |
| 3 | `orchestrator.ts:150` | Include SQL in non-empty results | **Low** | None | Fix 12 (redundant) |
| 4 | `orchestrator.ts:169` | Strengthen answer-present rule | **Medium** | oos-06, oos-12 (more confident wrong answers) | Fix 8 (opposing directions) |
| 5 | `classifierHeuristics.ts:90` | Add `\b[Bb][Qq]\b` to DATABASE | **Low** | None | Fix 6, Fix 8 (weight priority) |
| 6 | `classifierHeuristics.ts` | Add "in BQ" HYBRID pattern | **Low** | None (alone) | Fix 8 (weight conflict on hyb-24) |
| 7 | `bigquerySqlGenerator.ts:76` | Tie-handling for superlatives | **Low** | None (DENSE_RANK equivalent to LIMIT 1 for unique cases) | — |
| 8 | `classifierHeuristics.ts` | Add "campaign brief" DOCUMENT pattern | **Medium** | hyb-22 (re-classifies DATABASE→DOCUMENT, BQ not run) | Fix 5, Fix 6 (weight priority) |
| 9 | `bigquerySqlGenerator.ts:76` | Pluralization for product LIKE | **Medium** | bq-13, hyb-21 (ASICS→ASIC), hyb-12 (Pegasus→Pegasu) | — |
| 10 | `bigquerySqlGenerator.ts` | Never use question constants | **Low** | None (no golden test needs it) | — |
| 11 | `orchestrator.ts:10` | Raise MIN_RELEVANCE_SCORE to 0.3 | **High** | All hybrid tests (doc chunks below 0.3) | — |
| 12 | `orchestrator.ts:150` | Use `formatBqContext` | **Low** | None (uses existing tested function) | Fix 3 (redundant) |

---

## Recommended Implementation Order

### Phase 1 — Safe fixes (apply immediately, no regressions)
1. **Fix 1** — Remove "returned" from orders.status
2. **Fix 2** — Improve order_items.returned description
3. **Fix 12** — Use `formatBqContext` (subsumes Fix 3)
4. **Fix 5** — Add `\b[Bb][Qq]\b` to DATABASE pattern
5. **Fix 6** — Add "in BQ" HYBRID pattern
6. **Fix 10** — Never use question constants in SQL

### Phase 2 — Need verification (test after Phase 1)
7. **Fix 7** — Tie-handling rule (verify DENSE_RANK doesn't break unique winners)
8. **Fix 9** — Pluralization (must use exception list for ASICS/Pegasus)
9. **Fix 4** — Strengthen answer-present rule (must pair with scope-awareness)

### Phase 3 — Needs measurement/data (do not apply without evidence)
10. **Fix 11** — MIN_RELEVANCE_SCORE to 0.3 (need empirical relevance scores first)

### Needs weight adjustment before applying
11. **Fix 8** — Must reduce weight to ≤0.85 OR combine with scope-based fallback OR pair with "if both patterns match, prefer HYBRID" logic

---

## Key Recommendations

1. **Do NOT apply Fix 8 without lowering its weight below Fix 6's weight.** Or change Fix 8's intent from DOCUMENT to HYBRID.

2. **Do NOT apply Fix 11 without measuring actual relevance scores** for all 25 hybrid questions and 25 document questions. A 300× increase is guesswork.

3. **Apply Fix 12 instead of Fix 3** — they solve the same problem, Fix 12 is cleaner.

4. **Fix 9 needs an exception list.** "ASICS" and "Pegasus" are proper names ending in 's' — blind stemming breaks them. Use OR-based matching (`LIKE '%Backpack%' OR LIKE '%Backpacks%'`) instead of strip-and-match.

5. **Fix 4 needs a scope-awareness safeguard.** Without it, `oos-06` (global profit) and `oos-12` (Nike returns England) produce more confidently wrong answers instead of declining.
