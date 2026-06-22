# Verification Report: Data Source Decision Engine

**Date:** 2026-06-22
**Scope:** Every factual claim in `apps/web/app/docs/data-source-decision-engine.md` verified against source code.
**Verdict:** MINOR_ISSUES

---

## CLAIMS VERIFIED AS TRUE

### Section 1: The Core Problem

| Claim | Code Evidence |
|-------|--------------|
| BigQuery uses `jd_sports` dataset with 6 relational tables | `bigquery.ts:2` — `BQ_DATASET_ID = "jd_sports"`; `bigquery.ts:19-131` — 6 tables: products, orders, order_items, users, inventory_items, events |

### Section 2: Intent Classification

| Claim | Code Evidence |
|-------|--------------|
| Intent category type at `classifier.ts:6` | `classifier.ts:6` — `export type IntentCategory = "DATABASE" \| "DOCUMENT" \| "HYBRID" \| "UNKNOWN"` |
| `classifyIntentFull()` at `classifier.ts:27` | `classifier.ts:27` — `export async function classifyIntentFull(message: string, queryEmbedding?: number[]): Promise<ClassificationResult>` |
| 4-stage cascade (cache → heuristic → LLM → fallback) | `classifier.ts:34-137` — stages executed in logical order of return precedence |
| Cache threshold: `score >= 0.95` | `intentCacheService.ts:31` — `if (topMatch.score >= 0.95)` |
| Cache hit requires intent matching heuristic result | `classifier.ts:40` — `if (heuristic && pineconeCached.intent === heuristic.intent)` |
| Poisoned entry deleted on mismatch | `classifier.ts:43` — `await deleteCachedPineconeIntent(pineconeCached.id)` |
| Heuristic threshold: confidence >= 0.85 (non-UNKNOWN) | `classifier.ts:47` — `if (heuristic.confidence >= 0.85 && heuristic.intent !== "UNKNOWN")` |
| Heuristic threshold: UNKNOWN confidence >= 0.85 | `classifier.ts:52` — `if (heuristic.intent === "UNKNOWN" && heuristic.confidence >= 0.85)` |
| LLM model: `deepseek/deepseek-v4-flash` | `classifier.ts:87` — `model: "deepseek/deepseek-v4-flash"` |
| LLM temperature: 0.0 | `classifier.ts:92` — `temperature: 0.0` |
| LLM max_tokens: 4000 | `classifier.ts:15` — `const LLM_MAX_TOKENS = 4000;`; line 93: `max_tokens: LLM_MAX_TOKENS` |
| LLM timeout: 8s | `classifier.ts:16` — `const LLM_TIMEOUT_MS = 8000;` |
| System prompt: "Respond with ONLY the category label." | `classifier.ts:76` — matches exactly |
| LLM confidence returned as 0.85 | `classifier.ts:112` — `return { intent: cat, confidence: 0.85, stage: "llm", ... }` |
| Fallback: heuristic confidence >= 0.5 → intent with * 0.8 penalty | `classifier.ts:128-134` — matches exactly |
| Fallback: UNKNOWN heuristic → HYBRID | `classifier.ts:130` — `intent: heuristic.intent === "UNKNOWN" ? "HYBRID" : heuristic.intent` |
| Fallback: nothing → HYBRID at 0.5 | `classifier.ts:136` — `return { intent: "HYBRID", confidence: 0.5, ... }` |
| Decision logic at `classifierHeuristics.ts:116-141` | `classifierHeuristics.ts:116-141` — matches described logic |
| HYBRID pattern takes precedence (any HYBRID score > 0) | `classifierHeuristics.ts:116` — `if (scores.HYBRID > 0)` returns immediately |
| UNKNOWN threshold >= 0.8 | `classifierHeuristics.ts:120` — `if (scores.UNKNOWN >= 0.8)` |
| Top 2 scores both >= 0.7 → HYBRID | `classifierHeuristics.ts:134` — `if (secondScore >= 0.7)` → returns HYBRID |
| If no pattern matches, heuristic returns null | `classifierHeuristics.ts:128` — `if (topTwo.length === 0) return null` |

### DOCUMENT Pattern Verification (all 27 listed regexes match code)

| Pattern in Article | Weight | Actual Code (line) | Status |
|-------------------|--------|-------------------|--------|
| `full[- ]?price sell[- ]?through` | 0.99 | Line 17: 0.99 | ✅ |
| `framework agreement` | 0.99 | Line 20: 0.99 | ✅ |
| `campaign brief` | 0.92 | Line 23: 0.92 | ✅ |
| `running deep dive` | 0.99 | Line 24: 0.99 | ✅ |
| `annual sales plan` | 0.99 | Line 25: 0.99 | ✅ |
| `Q3.{0,10}(performance\|review)` | 0.99 | Line 27: 0.99 | ✅ |
| `media.{0,10}budget` | 0.98 | Line 28: 0.98 | ✅ |
| `rebate (rate\|threshold\|tier)` | 0.99 | Line 36: 0.99 | ✅ |
| `volume commitment` / `purchase commitment` | 0.99 | Lines 37-38: 0.99 | ✅ |
| `markdown support` / `coop marketing` | 0.99 | Lines 40-41: 0.99 | ✅ |
| `like[- ]?for[- ]?like` | 0.98 | Line 31: 0.98 | ✅ |
| `(year.on.year\|yoy\|year over year)` | 0.95 | Line 32: 0.95 | ✅ |
| `growth.{0,20}(rate\|vs\|versus)` | 0.92 | Line 33: 0.92 | ✅ |
| `store.{0,10}(count\|estate\|number)` | 0.95 | Line 34: 0.95 | ✅ |
| `how many.{0,30}(stores\|store)` | 0.97 | Line 35: 0.97 | ✅ |
| `weeks? of cover` / `aged stock` | 0.99 / 0.95 | Lines 45-46: 0.99, 0.95 | ✅ |
| `footfall uplift` / `return on ad spend` | 0.99 | Lines 47-48: 0.99 | ✅ |
| `(premium\|super premium\|core\|mid) tier` | 0.95 | Line 49: 0.95 | ✅ |
| `hero products?` | 0.95 | Line 50: 0.95 | ✅ |
| `click and collect` | 0.90 | Line 51: 0.90 | ✅ |
| `loyalty (programme\|program\|tier)` | 0.92 | Line 52: 0.92 | ✅ |
| `jd status` | 0.95 | Line 53: 0.95 | ✅ |
| `size cur` | 0.99 | Line 54: 0.99 | ✅ |
| `target volume of` | 0.95 | Line 55: 0.95 | ✅ |
| `buffer stock` | 0.92 | Line 56: 0.92 | ✅ |
| `top selling (product\|sku)` | 0.90 | Line 73: 0.90 | ✅ |

### DATABASE Pattern Verification (all 21 listed regexes match code)

| Pattern in Article | Weight | Actual Code (line) | Status |
|-------------------|--------|-------------------|--------|
| `(top\|bottom) \d+` | 0.95 | Line 74: 0.95 | ✅ |
| `how many (customers\|orders\|users\|products\|items\|pairs\|units)` | 0.97 | Line 75: 0.97 | ✅ |
| `average (order value\|discount\|price\|quantity\|spend)` | 0.97 | Line 76: 0.97 | ✅ |
| `by (region\|channel\|category\|brand\|department\|state\|age.group\|gender\|status)` | 0.92 | Line 77: 0.92 | ✅ |
| `(count\|total\|sum) of` | 0.95 | Line 78: 0.95 | ✅ |
| `\btotal\s+(revenue\|sales\|orders\|customers\|products)` | 0.95 | Line 79: 0.95 | ✅ |
| `\blast\s+(quarter\|month\|week\|year)\b` | 0.85 | Line 80: 0.85 | ✅ |
| `revenue (generated\|by\|for\|in)` | 0.90 | Line 81: 0.90 | ✅ |
| `orders? (placed\|by\|in\|per)` | 0.92 | Line 82: 0.92 | ✅ |
| `low (on )?stock` | 0.97 | Line 83: 0.97 | ✅ |
| `stock level` | 0.95 | Line 84: 0.95 | ✅ |
| `reorder point` | 0.98 | Line 85: 0.98 | ✅ |
| `distribution center` | 0.97 | Line 86: 0.97 | ✅ |
| `age group` | 0.95 | Line 87: 0.95 | ✅ |
| `return rate` | 0.95 | Line 88: 0.95 | ✅ |
| `discount (depth\|pct\|percentage)` | 0.92 | Line 89: 0.92 | ✅ |
| `loyalty tier` | 0.95 | Line 90: 0.95 | ✅ |
| `traffic source` | 0.95 | Line 91: 0.95 | ✅ |
| `conversion (funnel\|rate)` | 0.90 | Line 92: 0.90 | ✅ |
| `\b(bigquery\|sql query\|database\|bq)\b` | 0.92 | Line 93: 0.92 | ✅ |
| `(most\|highest\|lowest) (revenue\|sales\|profit\|margin)` | 0.90 | Line 94: 0.90 | ✅ |

### HYBRID Pattern Verification (all 9 listed regexes match code)

| Pattern in Article | Weight | Actual Code (line) | Status |
|-------------------|--------|-------------------|--------|
| `according to (the\|our\|both)...(review\|report\|document\|agreement\|plan\|brief\|deep dive)` | 0.98 | Line 57: 0.98 | ✅ (article omits `bigquery\|database` from alternatives, but pattern is correct) |
| `(review\|agreement\|plan\|report\|brief\|deep dive).{0,20}(says\|states\|shows\|indicates)` | 0.95 | Line 58: 0.95 | ✅ |
| `compare.{0,30}(document\|report\|pdf)...(with\|against\|and)...(data\|database\|bigquery\|actual)` | 0.98 | Line 59: 0.98 | ✅ |
| `(validate\|verify\|confirm).{0,30}(against\|with\|using)...(data\|bigquery\|database)` | 0.95 | Line 60: 0.95 | ✅ |
| `track (target\|plan) against` | 0.95 | Line 61: 0.95 | ✅ |
| `(actual\|real).{0,10}(vs\|versus\|vs\.)...(plan\|target\|budget)` | 0.90 | Line 62: 0.90 | ✅ |
| `\bvs\.?\s+(plan\|target\|budget)\b` | 0.85 | Line 63: 0.85 | ✅ |
| `how does.{0,50}(compare\|track\|stack up)` | 0.92 | Line 64: 0.92 | ✅ |
| `in\s+BQ\b` | 0.92 | Line 65: 0.92 | ✅ |

### UNKNOWN Pattern Verification (all 7 listed regexes match code)

| Pattern in Article | Weight | Actual Code (line) | Status |
|-------------------|--------|-------------------|--------|
| `weather` | 0.99 | Line 66: 0.99 | ✅ |
| `tell.{0,20}(joke\|story\|poem)` | 0.99 | Line 67: 0.99 | ✅ |
| `who is (the )?(ceo\|cfo\|president\|founder\|director)` | 0.95 | Line 68: 0.95 | ✅ |
| `what is your (name\|purpose)` | 0.95 | Line 69: 0.95 | ✅ |
| `stock (price\|market)` | 0.95 | Line 70: 0.95 | ✅ |
| `how (are\|were) (sales\|things\|we doing\|business)` | 0.70 | Line 71: 0.70 | ✅ |
| `^what'?s? (new\|happening\|going on)` | 0.65 | Line 72: 0.65 | ✅ |

### Section 3: Source Execution & Fallback

| Claim | Code Evidence |
|-------|--------------|
| `orchestrate()` at `orchestrator.ts:161` | `orchestrator.ts:161` — `export async function orchestrate(` |
| Routing at lines 236-280 | `orchestrator.ts:236-280` — DATABASE/DOCUMENT/HYBRID routing |
| `isRowsEmpty()` at `orchestrator.ts:150-159` | `orchestrator.ts:150-159` — checks all fields null/undefined/empty |
| DATABASE → BigQuery, fallback to Document | `orchestrator.ts:236-253` |
| DOCUMENT → Document RAG, fallback to BigQuery | `orchestrator.ts:254-276` |
| `MIN_RELEVANCE_SCORE = 0.001` | `orchestrator.ts:13` |
| HYBRID → `Promise.all([execDoc(), execBq()])` | `orchestrator.ts:278` |
| UNKNOWN → "No relevant data found." | `orchestrator.ts:192-197` |
| `execDoc()` at `orchestrator.ts:204-219` | `orchestrator.ts:204-219` — wraps `executeRagPipeline()` |
| `execBq()` at `orchestrator.ts:222-234` | `orchestrator.ts:222-234` — wraps `executeBqQuestion()` |
| Pinecone search: topK = 40, filtered by documentIds | `pipeline.ts:41-44` |
| Rerank model: `nvidia/llama-nemotron-rerank-vl-1b-v2:free`, selects top 3 | `openrouter.ts:6`, `pipeline.ts:59` |
| Rerank fallback: raw vector scores for top 3 | `pipeline.ts:66-71` |
| Semantic cache: cosine sim >= 0.95 against `sql-cache.json` | `semanticCache.ts:81` |
| Table selection: Pinecone `bq-schemas` namespace, topK 3, filter > 0.3 | `bigquerySemantic.ts:92-98` |
| Golden examples: Pinecone `golden-queries` namespace, topK 2, filter > 0.4 | `bigquerySemantic.ts:140-145` |
| SQL primary model: `cohere/north-mini-code:free`, 10s timeout | `bigqueryService.ts:100`, `bigquerySqlGenerator.ts:86` |
| SQL fallback model: `deepseek/deepseek-v4-flash`, 30s timeout | `bigqueryService.ts:100`, `bigquerySqlGenerator.ts:86` |
| SQL 2 attempts per model | `bigqueryService.ts:104` — `for (let attempt = 1; attempt <= 2; attempt++)` |
| Error feedback loop (retry with error message) | `bigqueryService.ts:107` passes `lastError`; `bigquerySqlGenerator.ts:53-55` injects retry hint |
| SQL validation rejects DDL/DML at `bigqueryHelpers.ts:39-44` | `bigqueryHelpers.ts:39-44` — forbidden ops: DROP, DELETE, INSERT, UPDATE, ALTER, CREATE, TRUNCATE, GRANT, REVOKE, CALL, EXPORT, LOAD, MERGE, EXECUTE |
| Query execution via `@google-cloud/bigquery` | `bigqueryService.ts:4` — imports BigQuery from `@google-cloud/bigquery` |
| Cache successful SQL + embedding | `bigqueryService.ts:121` — `await addCachedSql(question, embedding, sql)` |

### Section 4: Context Assembly & Answer Generation

| Claim | Code Evidence |
|-------|--------------|
| Context merging at `orchestrator.ts:282-330` | `orchestrator.ts:282-330` |
| `parts: string[]` with conditional push | `orchestrator.ts:324-327` |
| BQ index offset by doc chunk count | `orchestrator.ts:65` — `const bqIndex = docChunkCount + 1` |
| System prompt at `orchestrator.ts:329-330` | `orchestrator.ts:329-330` — matches described content |
| LLM generation model: `deepseek/deepseek-v4-flash` | `openrouter.ts:2`, `chatService.ts:191` |
| LLM generation temperature: 0.1 | `chatService.ts:193` |
| LLM generation max_tokens: 16000 | `chatService.ts:194` |
| Streaming SSE | `chatService.ts:195` — `stream: true`; `orchestrator.ts:335` — `onToken` callback |
| `buildDocCitations()` extracts `[N]` markers | `orchestrator.ts:39` — regex for markers |
| `buildBqCitation()` creates single BQ citation regardless of markers | `orchestrator.ts:83-96`, lines 348-349 |
| Citation verification: 120-char window around marker | `verification.ts:47-51` — start: matchIndex-60, end: matchIndex+markerLength+60 |
| Citation verification: remove stop words, keep numbers, lowercase | `verification.ts:27-36` — matches exactly |
| Citation verification: term overlap >= 40% threshold | `verification.ts:14` — `MIN_TERM_OVERLAP = 0.4`; line 103 — `if (overlap < MIN_TERM_OVERLAP)` |
| Citation verification: > 25% failure → low_confidence | `verification.ts:13` — `HALLUCINATION_RATE_MAX = 0.25`; line 132 |
| BQ citations NOT verified | `orchestrator.ts:346-349` — only docCitations run through verification; BQ citation built directly |

### Section 5: Embedding Sharing

| Claim | Code Evidence |
|-------|--------------|
| Embed call at `orchestrator.ts:171-175` (approx) | `orchestrator.ts:171-176` |
| Embedding reused in `executeRagPipeline()` | `orchestrator.ts:213` — `queryEmbedding` passed to `executeRagPipeline({..., queryEmbedding})`; `pipeline.ts:26-27` — uses `precomputedEmbedding` |
| Embedding reused in `executeBqQuestion()` | `orchestrator.ts:228` — `queryEmbedding` passed to `executeBqQuestion(input.message, queryEmbedding)`; `bigqueryService.ts:78` — uses it |

### Section 7: Edge Cases

| Claim | Code Evidence |
|-------|--------------|
| Both sources empty at `orchestrator.ts:315-319` | `orchestrator.ts:315-319` — `if (!docContext && !bqText)` |
| Source error logged at `orchestrator.ts:297-298` | `orchestrator.ts:297-298` — `console.error("Document RAG failed:", docResFinal.reason)` |
| BQ error logged at `orchestrator.ts:311-312` | `orchestrator.ts:311-312` — `console.error("BigQuery failed:", bqResFinal.reason)` |
| Fallbacks are one-directional (DATABASE→DOCUMENT, DOCUMENT→BQ) | `orchestrator.ts:236-280` |
| Poisoned cache entry deletion at `classifier.ts:43` | `classifier.ts:43` — `await deleteCachedPineconeIntent(pineconeCached.id)` |
| `BQ_ERROR` thrown by service | `bigqueryService.ts:130` — `throw new ServiceError("BQ_ERROR", ...)` |

### Section 8: Principles

| Claim | Code Evidence |
|-------|--------------|
| Fire-and-forget fallback — one-directional | `orchestrator.ts:236-280` — after fallback runs, no re-evaluation |
| Graceful degradation everywhere | LLM→heuristic fallback (`classifier.ts:57-124`), reranker→vector scores fallback (`pipeline.ts:66-71`) |
| Parallelism: embed + classify, HYBRID sources | `orchestrator.ts:175` — `Promise.all([embedPromise, classifyPromise])`; line 278 — `Promise.all([execDoc(), execBq()])` |

---

## CLAIMS FOUND FALSE OR INACCURATE

### 1. Pattern Count: "96 regex rules" — FALSE
**Article claims:** "96 regex rules across 4 categories"
**Actual:** 79 patterns total (counted from `classifierHeuristics.ts:17-95`)
- DOCUMENT: 42 (article says "45+ regexes") — FALSE
- DATABASE: 21 (article says "20+ regexes") — TRUE (≥20)
- HYBRID: 9 (article says "10+ regexes") — FALSE
- UNKNOWN: 7 (article says "7 regexes") — TRUE

### 2. Report Period Regex Pattern — INACCURATE
**Article claims:** `\.(h1|h2|fy\s?\d{2,4})\b` (leading dot)
**Actual code** (`classifierHeuristics.ts:95`): `\b(h1|h2|fy\s?\d{2,4})\b` (leading word boundary `\b`)
The article uses `\.` (literal dot) instead of `\b` (word boundary).

### 3. Citation Extraction Regex — FALSE
**Article claims:** `/(\d+)]/g` (malformed regex, only captures `)]` literally)
**Actual code** (`orchestrator.ts:39`): `/\[(\d+)\]/g` (properly escaped brackets)

### 4. SQL Generation Retry Count — FALSE
**Article claims:** "retries up to 6 times total (2 models × 2 attempts each + error feedback)"
**Actual** (`bigqueryService.ts:103-108`): 2 models × 2 attempts = **4 total attempts**. The "error feedback" is within the existing 2nd attempt per model (line 107 passes `lastError`), not an additional retry. `maxRetries = 3` on line 97 is unused in the retry loop.

### 5. Embedding NOT Shared with Classifier — FALSE
**Article claims:** "This single embedding is passed to: classifyIntentFull() (for Pinecone intent cache lookup)" and "This avoids 3 redundant embedding API calls per request"
**Actual** (`orchestrator.ts:172`): `classifyIntentFull(input.message)` — called **without** `queryEmbedding` parameter. Inside `classifyIntentFull` (`classifier.ts:36-37`): `const embedding = queryEmbedding || (await embed([message]))[0];` — it computes its own embedding because `queryEmbedding` is not passed. The embedding IS shared with `executeRagPipeline()` and `executeBqQuestion()`. So only **2 redundant calls** are avoided, not 3.

### 6. `sanitizeMessage()` Not Called in Chat Route — FALSE
**Article flow diagram claims:** `POST /api/chat → sanitizeMessage()`
**Actual** (`route.ts:35-63`): The route does NOT call `sanitizeMessage()`. It performs inline validation only: checks `message` is a non-empty string, checks `message.length <= MAX_MESSAGE_LENGTH`, and validates `documentIds` format. The `sanitizeMessage()` function exists in `chatService.ts:31-38` but is never invoked from the route.

### 7. `intentCacheService.ts:19-41` Code Snippet Oversimplified — MINOR INACCURACY
**Article shows** simplified code that would throw `TypeError` on empty matches:
```typescript
// intentCacheService.ts:19-41
const matches = await searchChunks(queryEmbedding, {
  topK: 1,
  namespace: "intent-routing-cache",
});
if (matches[0].score >= 0.95) {
  return matches[0].metadata.intent;
}
```
**Actual code** (`intentCacheService.ts:23-41`): Has null guards:
```typescript
if (matches.length === 0) return null;
const topMatch = matches[0];
if (topMatch.score >= 0.95) {
  const metadata = topMatch.metadata as unknown as CacheMetadata;
  if (metadata && metadata.intent) {
    return { intent: metadata.intent as IntentCategory, id: topMatch.id, score: topMatch.score };
  }
}
return null;
```
The article's version would crash on `matches[0]` when `matches` is empty and avoids the metadata guard. While functionally illustrative, it misrepresents the live code.

### 8. HYBRID Pattern Missing Alternatives — MINOR INACCURACY
**Article claims:** `according to (the|our|both).{0,60}(review|report|document|agreement|plan|brief|deep dive)` → weight 0.98
**Actual code** (`classifierHeuristics.ts:57`): `/according to (the|our|both).{0,60}(review|report|document|agreement|plan|brief|deep dive|bigquery|database)/i` — the article omits `|bigquery|database` from the alternatives list.

### 9. Line Number for HYBRID Routing — MINOR OFF-BY-ONE
**Article claims:** "orchestrator.ts:277-279"
**Actual:** The HYBRID block runs `orchestrator.ts:277-280` (includes `checkAborted(signal)` at line 279).

### 10. Both Sources Empty Code — MINOR OMISSION
**Article claims** `orchestrator.ts:315-319` shows:
```typescript
if (!docContext && !bqText) {
  writer.textDelta("No relevant data found.");
  return;
}
```
**Actual** (`orchestrator.ts:315-320`): Also calls `writer.status("complete", "Done")` and `writer.done()` before returning. The article omits these cleanup calls.

---

## SUMMARY

| Metric | Count |
|--------|-------|
| Claims fully verified as TRUE | ~120+ |
| Claims FALSE | 6 |
| Claims MINOR INACCURACY | 4 |

**Verdict: MINOR_ISSUES**

The article is largely accurate for architecture and behavior descriptions, but contains several numerical inaccuracies (pattern counts, retry count), a couple of code snippet errors (citation regex, report-period regex), and one significant behavioral misstatement (the embedding sharing claim — the embedding is NOT actually shared with `classifyIntentFull` as claimed, resulting in one redundant embedding call per request that the article says is avoided).
