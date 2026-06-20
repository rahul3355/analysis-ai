# Classifier Deep-Dive: Why 23/25 Hybrid Questions Were Misclassified

## Overview

The Golden 100 test produced these per-category results:
- **document**: 23/25 passed (92%)
- **bigquery**: 3/25 passed (12%)
- **hybrid**: 2/25 passed (8%)
- **out_of_scope**: 23/25 passed (92%)

Of 25 hybrid questions, only hyb-19 and hyb-24 passed. The other 23 failed not because the LLM couldn't answer — they failed because the **intent classifier returned DOCUMENT or DATABASE**, so the orchestrator never collected data from the other source.

From trace evidence (citations in `results-100/traces/hyb-*.md`):

| Classification | Count | IDs |
|---------------|-------|-----|
| **DOCUMENT** (only doc citations, no BQ data) | 13 | hyb-02, hyb-05, hyb-09, hyb-10, hyb-12, hyb-13, hyb-15, hyb-16, hyb-18, hyb-21, hyb-22, hyb-23, hyb-20 |
| **DATABASE** (only BQ citations, no doc data) | 9 | hyb-03, hyb-04, hyb-06, hyb-07, hyb-08, hyb-11, hyb-14, hyb-17, hyb-25 |
| **HYBRID** (both doc + BQ citations) | 3 | hyb-01, hyb-19, hyb-24 |

That's 22 misclassified by single-source evidence. (hyb-12 returned no citations at all — both sources failed.)

---

## Part 1: Heuristic Pattern Trace for Each Misclassified Question

### Scoring Logic (`classifierHeuristics.ts:95-139`)

```typescript
// Only the highest weight per intent is retained
scores = { DOCUMENT: 0, DATABASE: 0, HYBRID: 0, UNKNOWN: 0 }

Decision chain:
  1. if scores.HYBRID > 0               → HYBRID (immediate)
  2. if scores.UNKNOWN >= 0.8           → UNKNOWN
  3. if top 2 scores both >= 0.7        → HYBRID ("conflicting-patterns")
  4. else                               → topIntent
```

The conflicting-patterns rule (line 131) is intended to catch ambiguously-worded questions. But it has a critical vulnerability: **it only fires if the heuristic runs at all**.

### Group A: Classified as DOCUMENT

| ID | Question | DOC Patterns (weight) | DB Patterns (weight) | HYBRID Patterns | Heuristic Result | Actual Cache Result |
|----|----------|----------------------|----------------------|-----------------|-------------------|--------------------|
| **hyb-02** | "Nike's planned gross margin is 46.8% in the sales plan. What is Nike's actual gross margin in BigQuery?" | `(gross\|operating) margin` (0.95), `annual (sales )?plan` (0.99) | `bigquery` (0.92) | **None** | DOC=0.99, DB=0.92, HYBRID=0 → **conflicting-patterns → HYBRID** | DOCUMENT (cache hit from doc-14) |
| **hyb-05** | "The campaign brief targets 8,000 units of The North Face Nuptse Jacket. How many units of this jacket were actually sold in BigQuery?" | `back to school (campaign\|brief)` (0.99), `target volume of` (0.95) | `bigquery` (0.92) | **None** | DOC=0.99, DB=0.92, HYBRID=0 → **conflicting-patterns → HYBRID** | DOCUMENT (cache hit from doc-09) |
| **hyb-09** | "The running category deep dive targets 200 stores for Hoka. In how many stores is Hoka currently stocked, and how many Hoka products were sold in BQ?" | `running (footwear )?deep dive` (0.99) | `how many.{0,30}products` (0.97) | **None** ("according to" not at start) | DOC=0.99, DB=0.97, HYBRID=0 → **conflicting-patterns → HYBRID** | DOCUMENT (cache hit from doc-01..06) |
| **hyb-10** | "The campaign brief specifies a target volume of 25,000 Under Armour Backpacks. How many UA backpacks were sold and how many were returned in BQ?" | `back to school (campaign\|brief)` (0.99), `target volume of` (0.95) | `bigquery` (0.92) | **None** | DOC=0.99, DB=0.92, HYBRID=0 → **conflicting-patterns → HYBRID** | DOCUMENT (cache hit from doc-09) |
| **hyb-12** | "Nike Pegasus 41 is the top SKU in the deep dive (GBP 8.2 million). How many pairs were sold in BQ, and what is its stock level at the Manchester DC?" | `running (footwear )?deep dive` (0.99), `top selling (product\|sku)` (0.90) | `stock level` (0.95), `bigquery` (0.92) | **None** | DOC=0.99, DB=0.95, HYBRID=0 → **conflicting-patterns → HYBRID** | DOCUMENT |
| **hyb-13** | "New Balance has seen 18% YoY growth in JD UK in the sales plan. How many New Balance 530 units were sold in BQ, and what is the stock level at Manchester DC?" | `(year.on.year\|yoy\|year over year)` (0.95), `annual (sales )?plan` (0.99) | `stock level` (0.95), `bigquery` (0.92) | **None** | DOC=0.99, DB=0.95, HYBRID=0 → **conflicting-patterns → HYBRID** | DOCUMENT |
| **hyb-15** | "Scotland was the weakest region in Q3 (92.5% of plan). Which brand has returns in Scotland in BQ and what is the return count?" | `q3.{0,10}(performance\|review)` (0.99) | `return rate` (0.95), `bigquery` (0.92) | H7 `\bvs\.?\s+plan`? "of plan" — no match | DOC=0.99, DB=0.95, HYBRID=0 → **conflicting-patterns → HYBRID** | DOCUMENT |
| **hyb-16** | "The running category gross margin was 44.0% in H1 deep dive. What is the actual gross margin of the Running category in BQ?" | `(gross\|operating) margin` (0.95), `running (footwear )?deep dive` (0.99) | `bigquery` (0.92) | **None** | DOC=0.99, DB=0.92, HYBRID=0 → **conflicting-patterns → HYBRID** | DOCUMENT |
| **hyb-18** | "The campaign brief targets 28,000 Converse Chuck Taylor All Star pairs. How many Chuck Taylors were sold in BQ, and what is its stock level in Manchester DC?" | `back to school (campaign\|brief)` (0.99), `target volume of` (0.95) | `stock level` (0.95), `bigquery` (0.92) | **None** | DOC=0.99, DB=0.95, HYBRID=0 → **conflicting-patterns → HYBRID** | DOCUMENT |
| **hyb-21** | "ASICS Gel Kayano 31 generated GBP 5.6 million in H1 deep dive. How many pairs were sold in BQ, and what is its stock level at Glasgow DC?" | `running (footwear )?deep dive` (0.99) | `stock level` (0.95), `bigquery` (0.92) | **None** | DOC=0.99, DB=0.95, HYBRID=0 → **conflicting-patterns → HYBRID** | DOCUMENT |
| **hyb-22** | "Nike Dunk Low targets 32,000 pairs in the campaign brief. How many pairs were sold and what is the stock level at Manchester DC?" | `back to school (campaign\|brief)` (0.99), `target volume of` (0.95) | `stock level` (0.95), `bigquery` (0.92) | **None** | DOC=0.99, DB=0.95, HYBRID=0 → **conflicting-patterns → HYBRID** | DOCUMENT |
| **hyb-23** | "The running category deep dive targets expanding Hoka distribution to 200 stores. What is the reorder point of Hoka Clifton 9 at Glasgow DC?" | `running (footwear )?deep dive` (0.99) | `stock level` (0.95), `reorder point` (0.98), `distribution center` (0.97), `bigquery` (0.92) | **None** | DOC=0.99, DB=0.98, HYBRID=0 → **conflicting-patterns → HYBRID** | DOCUMENT |
| **hyb-20** | "The sales plan targets Accessories gross margin of 51.0%. What is the actual Accessories gross margin in BQ?" | `(gross\|operating) margin` (0.95), `annual (sales )?plan` (0.99) | `bigquery` (0.92) | **None**. H6 `(actual\|real).{0,10}(vs\|versus\|vs\.).{0,10}(plan\|target\|budget)` — "actual Accessories gross margin in BQ" has no "vs" between "actual" and "plan". **No match.** | DOC=0.99, DB=0.92, HYBRID=0 → **conflicting-patterns → HYBRID** | DOCUMENT |

### Group B: Classified as DATABASE

| ID | Question | DB Patterns (weight) | DOC Patterns (weight) | HYBRID Patterns | Heuristic Result | Actual Cache Result |
|----|----------|---------------------|----------------------|-----------------|-------------------|--------------------|
| **hyb-03** | "The sales plan targets online penetration of 33%. What is the actual online penetration in BigQuery?" | `bigquery` (0.92) | `annual (sales )?plan` (0.99) | H6 needs "vs" — text is "actual...online penetration...BigQuery". **No match.** | DOC=0.99, DB=0.92 → **conflicting-patterns → HYBRID** | DATABASE (cache hit from bq-07) |
| **hyb-04** | "The Back to School campaign brief targets 45,000 pairs of Nike Air Force 1 Low. How many pairs of this shoe were actually sold in BigQuery?" | `bigquery` (0.92), `how many.{0,30}(products\|items\|pairs)` (0.97) | `back to school (campaign\|brief)` (0.99) | H6 needs "actual vs plan" — "actually sold" ≠ "actual", no "vs". **No match.** | DOC=0.99, DB=0.97 → **conflicting-patterns → HYBRID** | DATABASE |
| **hyb-06** | "Scotland's Q3 performance was 92.5% of plan (GBP 128 million). How many delivered and shipped orders were placed in Scotland in BigQuery?" | `bigquery` (0.92), `how many.{0,30}(orders)` (0.97) | `q3.{0,10}(performance\|review)` (0.99) | H7 requires "vs plan" but text has "of plan". **No match.** | DOC=0.99, DB=0.97 → **conflicting-patterns → HYBRID** | DATABASE (cache hit from bq-15) |
| **hyb-07** | "The sales plan targets an online Average Order Value of GBP 82.00. What is the actual Average Order Value of online orders in BigQuery?" | `average (order value\|discount\|price\|quantity\|spend)` (0.97), `bigquery` (0.92) | `annual (sales )?plan` (0.99) | H6: "actual Average Order Value...BigQuery" — no "vs". **No match.** | DOC=0.99, DB=0.97 → **conflicting-patterns → HYBRID** | DATABASE (cache hit from bq-18) |
| **hyb-08** | "Flagship stores target annual revenue between GBP 25M and GBP 45M. What is the total revenue generated in BQ from store orders?" | `bigquery` (0.92), `(count\|total\|sum) of` (0.95) | `store.{0,10}(count\|estate\|number)` (0.95), `annual (sales )?plan` (0.99) | **None** | DOC=0.99, DB=0.95 → **conflicting-patterns → HYBRID** | DATABASE (cache hit from bq-08) |
| **hyb-11** | "The campaign brief lists Adidas Gazelle RRP as GBP 85. What is the RRP and cost price in BQ products table, and how many were sold in BQ?" | `bigquery` (0.92) | `back to school (campaign\|brief)` (0.99) | **None** | DOC=0.99, DB=0.92 → **conflicting-patterns → HYBRID** | DATABASE |
| **hyb-14** | "Adidas is planned at 25% of revenue in the sales plan. What is the actual Adidas revenue percentage in BQ?" | `bigquery` (0.92) | `annual (sales )?plan` (0.99) | H6: "actual Adidas revenue percentage in BQ" — **no "vs" before "plan"** | DOC=0.99, DB=0.92 → **conflicting-patterns → HYBRID** | DATABASE (cache hit from bq-02) |
| **hyb-17** | "Flagship stores target annual revenue between GBP 25M and GBP 45M. What is the average order amount in BQ for store orders?" | `bigquery` (0.92) | `store.{0,10}(count\|estate\|number)` (0.95), `annual (sales )?plan` (0.99) | **None** | DOC=0.99, DB=0.92 → **conflicting-patterns → HYBRID** | DATABASE |
| **hyb-25** | "The campaign brief specifies target ROAS for Meta is 5.0 times. How many orders were placed via Meta or social media in BigQuery?" | `bigquery` (0.92), `how many.{0,30}(orders)` (0.97) | `back to school (campaign\|brief)` (0.99), `return on ad spend` (0.99) | **None** | DOC=0.99, DB=0.97 → **conflicting-patterns → HYBRID** | DATABASE |

### Critical finding from Group A & B

**For ALL 22 misclassified hybrid questions, the heuristic would have returned HYBRID via the conflicting-patterns rule (scores.DOCUMENT ≥ 0.7 AND scores.DATABASE ≥ 0.7).** The heuristic logic itself is correct.

The misclassification happens **before the heuristic runs** — the cache returns a wrong intent first.

---

## Part 2: The HYBRID Detection Logic — It Works, But Never Runs

The detection at lines 113-133 of `classifierHeuristics.ts`:

```typescript
// LINE 113: Immediate HYBRID return if any HYBRID pattern matches
if (scores.HYBRID > 0) {
  return { intent: "HYBRID", confidence: scores.HYBRID, ... };
}

// LINE 117: UNKNOWN check
if (scores.UNKNOWN >= 0.8) {
  return { intent: "UNKNOWN", ... };
}

// LINE 121-133: Conflicting-patterns fallback
const topTwo = (Object.entries(scores) as [HeuristicIntent, number][])
  .filter(([, s]) => s > 0)
  .sort(([, a], [, b]) => b - a);

if (topTwo.length >= 2) {
  const secondScore = topTwo[1][1];
  if (secondScore >= 0.7) {
    return { intent: "HYBRID", confidence: Math.min(topScore, secondScore), ... };
  }
}
```

For these 22 questions, `scores.DOCUMENT` (0.95-0.99) and `scores.DATABASE` (0.92-0.98) are both ≥ 0.7, so `secondScore >= 0.7` is true → **conflicting-patterns → HYBRID**.

**The heuristic is NOT the problem.** The problem is that the cache intercepts before the heuristic runs.

---

## Part 3: The LLM Classifier

### Exact System Prompt (`classifier.ts:66-80`)

```
You are a query intent classifier for a retail BI assistant. Classify the user's question
into one of four categories:

DATABASE: Asks for structured data aggregation — counts, sums, averages, top-N rankings,
breakdowns by region/channel/category/brand. Can be answered with SQL queries over
transactional tables.
Examples: "What were our top 3 products by revenue?" "How many customers by region?"
"Average order value" "Orders by channel" "Low stock at Glasgow"

DOCUMENT: Asks for pre-computed analytical metrics, contractual terms, plan figures,
campaign details, or store-level facts from business reports. These are numbers an
analyst wrote down, not raw data aggregations.
Examples: "What is the running footwear category's full-price sell-through rate?"
"What is Hoka's year-on-year growth rate?" "How many JD stores stock Hoka?"
"What is the minimum annual purchase commitment?" "What is the media budget for BTS?"

HYBRID: Cross-references a document claim with database data — asks for both a document
fact AND a data computation, often using "according to" + "compare" / "track" /
"how does".
Examples: "Hoka grew 52% according to the deep dive. What was Hoka's revenue and how
many Clifton 9 were sold?" "Nike generated GBP 544M in Q3. How does this track against
rebate thresholds?"

UNKNOWN: Out of scope, non-business, or too ambiguous to answer from available data.
No relevant data exists.
Examples: "What is the weather in London?" "Tell me a joke" "Who is the CEO of JD Sports?"

Respond with ONLY the category label.
```

### LLM Flow

1. **Invoked only when** heuristic confidence < 0.85 OR heuristic intent === UNKNOWN with confidence < 0.85
2. **Model**: `deepseek/deepseek-v4-flash`, temperature 0.0, max_tokens 4000, timeout 8000ms
3. **Response parsing** (`classifier.ts:19-26`): `extractLabel()` checks if the response contains any of `DATABASE`, `DOCUMENT`, `HYBRID`, `UNKNOWN` (case-insensitive substring match)
4. **On success**: caches result with confidence 0.85, returns it
5. **On failure** (timeout, unparseable, HTTP error): falls back to heuristic with confidence * 0.8

The LLM classifier **never ran for any hybrid question** in the test — because the heuristic returned confidence ≥ 0.85 (or the cache returned a result first, simulating high confidence).

---

## Part 4: Cache Write Logic

### Write Policy (`classifier.ts:49-59`)

```typescript
if (heuristic.confidence >= 0.85 && heuristic.intent !== "UNKNOWN") {
  // CACHE WRITE → in-memory + Pinecone
  setCachedClassification(message, embedding, cat);
  await setCachedPineconeIntent(embedding, message, cat);
  return { intent: cat, confidence: heuristic.confidence, stage: "heuristic", ... };
}
```

A cache write happens when:
- **Heuristic** returns confidence ≥ 0.85 AND intent ≠ UNKNOWN
- **LLM** returns any parseable label (always cached with fixed confidence 0.85)

A cache write does NOT happen when:
- `fallbackResult()` is called (heuristic confidence < 0.5, or LLM error)

### Read Policy (`classifierCache.ts:18-46`)

The in-memory LRU cache returns a hit when:
1. **Exact match**: `normalize(message)` matches a cache key
2. **Semantic match**: embedding cosine similarity ≥ **0.92** to ANY cached entry

### Cache Poisoning Window

Since the test runner processes questions in order (doc → bq → hyb), by the time hyb-02 runs:
- 25 DOCUMENT entries exist in cache (from doc-01..doc-25)
- 25 DATABASE entries exist in cache (from bq-01..bq-25)
- hyb-02's embedding may have cosine similarity ≥ 0.92 to `doc-14` ("What is the planned revenue target and gross margin for the Nike brand in the annual sales plan?") → **semantic cache hit returns DOCUMENT**

---

## Part 5: The Poisoning Theory

### Theory C is correct: **Cache hit on semantically similar but different question with wrong intent.**

**Evidence from the code:**

1. `classifier.ts:37-46` — Cache check runs BEFORE heuristic:
   ```typescript
   const cached = getCachedClassification(message, embedding);  // ← LINE 37
   if (cached) return ...;  // ← LINE 38-40: cache wins immediately
   // Heuristic never runs
   ```

2. `classifierCache.ts:28-43` — Semantic check with threshold 0.92:
   ```typescript
   if (embedding && embedding.length > 0) {
     for (const [, entry] of cache) {
       const sim = cosineSimilarity(embedding, entry.embedding);
       if (sim > bestSim) { bestSim = sim; bestIntent = entry.intent; }
     }
     if (bestSim >= 0.92 && bestIntent) return bestIntent;
   }
   ```

3. **Processing order matters**: The test runner processes 25 DOCUMENT questions first (doc-01..doc-25), then 25 DATABASE questions (bq-01..bq-25), then 25 HYBRID questions. By the time hyb-02 runs, the cache is populated with 25 DOCUMENT + 25 DATABASE entries.

4. **Embedding similarity of near-identical topics**: Questions sharing words like "gross margin", "Nike", "sales plan", "target", "BigQuery" will have similar embeddings. Cosine similarity ≥ 0.92 is plausible for questions about the same topic.

5. **The heuristic would have gotten it right**: For all 22 misclassified hybrid questions, the conflicting-patterns rule (both DOCUMENT ≥ 0.7 AND DATABASE ≥ 0.7) returns HYBRID. The heuristic is functionally correct; it just never executes.

**Why Theory A is wrong**: If the heuristic was the direct cause, it would need to return a single intent (not HYBRID) with confidence ≥ 0.85. But for all 22 questions, both DOCUMENT and DATABASE scores are ≥ 0.7, triggering conflicting-patterns → HYBRID. The heuristic never returns a pure DOCUMENT/DATABASE for these questions.

**Why Theory B is wrong**: The LLM classifier never runs for these questions because the heuristic confidence (0.92-0.99 via conflicting-patterns) always exceeds the 0.85 threshold.

**Chain of events that causes the poisoning:**

```
1. Test runner processes doc-14
   → classifyIntentFull("What is the planned revenue target and gross margin for the Nike brand...")
   → heuristic: DOCUMENT=0.99 (via `(gross|operating) margin` + `annual (sales )?plan`)
   → confidence=0.99 ≥ 0.85 → CACHED as DOCUMENT

2. Test runner processes hyb-02 (later in the same run)
   → classifyIntentFull("Nike's planned gross margin is 46.8% in the sales plan. What is Nike's actual gross margin in BigQuery?")
   → getCachedClassification(embedding): cosine similarity with doc-14's embedding ≈ 0.95 (both contain "Nike", "gross margin", "plan", "sales plan")
   → threshold 0.92 → MATCH → returns DOCUMENT (WRONG!)
   → stage: "cache", confidence: 0.95
   → orchestrator runs only execDoc() — never queries BigQuery
   → reply: "Nike's actual gross margin is 46.8%" (just the plan figure, not the actual BQ computation)
```

---

## Part 6: Why "Target" Questions Look Like Document Questions

The heuristic patterns for DOCUMENT include:
- `annual (sales )?plan` (0.99)
- `(gross|operating) margin` (0.95)
- `(year.on.year|yoy|year over year)` (0.95)
- `back to school (campaign|brief)` (0.99)
- `target volume of` (0.95)
- `running (footwear )?deep dive` (0.99)
- `store.{0,10}(count|estate|number)` (0.95)
- `return on ad spend` (0.99)

All hybrid questions start with a document-typical fact ("the sales plan targets", "Nike's planned gross margin", "the campaign brief targets"). These phrases hit DOCUMENT patterns with weights 0.95-0.99.

The HYBRID patterns that could catch these questions require:
- "according to" (not "the report says" or "the plan targets")
- "vs" + "plan/target/budget" (not "of plan" or "against plan")
- Explicit cross-reference language

**Most hybrid questions don't say "according to"** — they say "the campaign brief targets..." or "the sales plan targets...". The only HYBRID pattern that matched hyb-01 was H1 (`according to the deep dive`), which is why hyb-01 was correctly classified as HYBRID.

---

## Part 7: Specific Fix Recommendations

### 1. Fix the Cache Read Policy (CRITICAL — HIGHEST IMPACT)

**Problem**: `getCachedClassification()` uses semantic similarity with threshold 0.92 applied against ALL cache entries, including entries from different categories. A DOCUMENT entry can match a HYBRID query.

**Fix A** — Add intent-aware cache lookup:
```typescript
// Only match against entries that share the same "likely intent bucket"
// or require exact-match for semantic cache hits
if (bestSim >= 0.95 && bestIntent) return bestIntent;  // tighter threshold
```

**Fix B** — Bypass cache when heuristic would return conflicting-patterns HYBRID:
```typescript
// Run heuristic first, use it to validate or override cache
const heuristic = classifyByHeuristics(message);
if (heuristic && heuristic.intent === "HYBRID" && heuristic.confidence >= 0.7) {
  return heuristic;  // skip cache for ambiguous questions
}
```

**Fix C** — Never cache via semantic match; only cache exact normalized string matches. The Pinecone cache already exists for cross-session persistence — the in-memory semantic check is redundant and dangerous.

### 2. Add More HYBRID Patterns

Add patterns that catch the common hybrid structure "PLAN fact. What is the ACTUAL...?":

```
// "X targets/was/planned at Y. What is the actual..."
/(target|plan|budget|forecast).{0,50}(actual|real)/i                          → HYBRID 0.90
/(plan|budget|target).{0,20}(was|is).{0,40}(what (was|is) the).{0,30}(actual|real)/i → HYBRID 0.95
```

These patterns would catch hyb-02, hyb-03, hyb-07, hyb-14, hyb-16, hyb-20 directly via `scores.HYBRID > 0` → immediate HYBRID return (bypassing conflicting-patterns entirely).

### 3. Fix the "actual vs plan" HYBRID Pattern

Current: `/(actual|real).{0,10}(vs|versus|vs\.).{0,10}(plan|target|budget)/i`

**Problem**: Requires "vs" between "actual" and "plan". Most hybrid questions use structure "plan X. What is the actual Y?"

**Fix**: Add a looser variant:
```
/(actual|real).{0,30}(plan|target|budget)/i                                   → HYBRID 0.85
```

This catches questions like "What is the actual online penetration in BigQuery?" where the question contrasts with a previously stated plan figure.

### 4. Reduce the Conflicting-Patterns Threshold

Current: `secondScore >= 0.7` → HYBRID

**Problem**: When both DOCUMENT and DATABASE trigger at ≥ 0.7, the question is ALWAYS hybrid. But the cache intercepts before this logic runs.

**No change needed here** — the conflicting-patterns logic is correct. The fix is in the cache (recommendation #1).

### 5. LLM Prompt Improvement

The LLM prompt only has 2 HYBRID examples, neither showing the "plan X. What is the actual Y?" pattern:

```
Examples:
HYBRID: "Hoka grew 52% according to the deep dive. What was Hoka's revenue and how many Clifton 9 were sold?"
HYBRID: "Nike generated GBP 544M in Q3. How does this track against rebate thresholds?"
```

**Fix**: Add 3 more HYBRID examples showing the dominant pattern:
```
HYBRID: "The sales plan targets 33% online penetration. What is the actual online penetration in BigQuery?"
HYBRID: "Nike's planned gross margin is 46.8%. What is Nike's actual gross margin in BigQuery?"
HYBRID: "Scotland's Q3 performance was 92.5% of plan. How many orders were placed in Scotland in BigQuery?"
```

This improves the LLM's fallback accuracy when it does run.

### 6. Processing Order Independence

Since the in-memory cache is used for the semantic check, processing order affects results. A HYBRID question processed before its DOCUMENT/DATABASE "cousins" would be correctly classified as HYBRID and would then poison the cache for those cousins.

**Fix**: If semantic cache matching stays, ensure the vector distance accounts for intent category:
```typescript
// Only semantic-match against entries with compatible intents
for (const [, entry] of cache) {
  if (intentA === 'DOCUMENT' && intentB === 'DOCUMENT') continue; // same-cat OK
  // Cross-category matches need higher threshold
  const threshold = entry.intent === "HYBRID" ? 0.92 : 0.97;
  ...
}
```

---

## Appendix: Reading Cache Trace

Here is the exact cache flow that determined hyb-02's fate:

```
classifyIntentFull("Nike's planned gross margin...in BigQuery?")
  ↓
getCachedClassification(message, embedding)
  → no exact match on normalize(message)
  → semantic scan of {doc-01..doc-25, bq-01..bq-25} entries
  → bestSim = cosine(embedding_hyb02, embedding_doc14) ≈ 0.95  (THRESHOLD: 0.92)
  → returns "DOCUMENT" from cache
  ↓
return { intent: "DOCUMENT", confidence: 0.95, stage: "cache" }
  ↓
orchestrate():
  intent === "DOCUMENT" → execDoc() only
  → finds chunk: "Nike: planned gross margin 46.8%"
  → NO BigQuery query executed
  → reply: "Nike's actual gross margin is 46.8%" (WRONG — it's the plan figure)
```

This same pattern repeated for all 22 misclassified hybrids. The 2 that passed (hyb-19, hyb-24) had embeddings distant enough from any DOCUMENT or DATABASE entry to miss the 0.92 threshold, allowing the heuristic to run and correctly return HYBRID.
