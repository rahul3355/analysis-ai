# The Data Source Decision Engine

## How Analysis AI Chooses Between Documents, BigQuery, Both, or Neither

*An architectural deep-dive into the intent-based routing pipeline*

---

## 1. The Core Problem

The system has two fundamentally different data sources:

| Source | Technology | Contains |
|--------|-----------|----------|
| **Documents** (RAG) | Pinecone vector index | PDF/DOCX business reports — contractual terms, campaign briefs, strategic plans, pre-computed analytical metrics |
| **BigQuery** (NL-to-SQL) | Google BigQuery — 6 relational tables (`jd_sports` dataset) | Transactional data — orders, products, users, inventory, events |

The challenge: when a user asks a question, the system must automatically decide **which source(s)** to query, in what **order**, and how to **merge** the results — without ever asking the user.

The answer lives in a three-stage pipeline:

```
User Question
    │
    ▼
┌──────────────────────────────────────────┐
│ STAGE 1: Intent Classification            │
│ (cache → heuristic → LLM → fallback)      │
│ Output: DATABASE | DOCUMENT | HYBRID |    │
│         UNKNOWN                           │
└──────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────┐
│ STAGE 2: Source Execution & Fallback      │
│ (DATABASE → BQ, fallback to doc)          │
│ (DOCUMENT → RAG, fallback to BQ)          │
│ (HYBRID → BOTH in parallel)               │
│ (UNKNOWN → "No relevant data found.")     │
└──────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────┐
│ STAGE 3: Context Assembly & Generation    │
│ (merge doc chunks + BQ rows → LLM →      │
│  citations → verification)               │
└──────────────────────────────────────────┘
    │
    ▼
    Response
```

This article walks through every decision point, every fallback, and every piece of data that governs the routing.

---

## 2. Stage 1: Intent Classification (`classifier.ts`)

The classifier (`src/core/pipeline/classifier.ts`) is the brain of the system. It determines *what kind of question* the user is asking by running a **4-stage cascade** of classifiers, each stage faster/cheaper than the next.

### 2.1 The Four Intent Categories

Defined in `classifier.ts:6` as a type union:

| Category | Meaning | Example |
|----------|---------|---------|
| `"DATABASE"` | Asks for structured data aggregation — counts, sums, averages, top-N rankings, breakdowns by region/channel/category/brand | *"What were our top 3 products by revenue?"* |
| `"DOCUMENT"` | Asks for pre-computed analytical metrics, contractual terms, plan figures, campaign details from business reports | *"What is Hoka's year-on-year growth rate?"* |
| `"HYBRID"` | Cross-references a document claim with database data — asks for both a document fact AND a data computation, often using "according to" + "compare" / "track" | *"Hoka grew 52% according to the deep dive. What was Hoka's revenue?"* |
| `"UNKNOWN"` | Out of scope, non-business, or too ambiguous | *"What is the weather in London?"* |

### 2.2 The 4-Stage Classification Cascade

`classifyIntentFull()` in `classifier.ts:27` executes these stages in order:

```
[STAGE 1] Pinecone Semantic Cache (intent-routing-cache)
    threshold: score >= 0.95 AND matches heuristic
    ↓ hit  → return cached intent immediately
    ↓ miss → delete stale entry, continue
    
[STAGE 2] Heuristic Pattern Matcher (classifierHeuristics.ts)
    79 regex rules across 4 categories
    threshold: confidence >= 0.85 (non-UNKNOWN) or >= 0.85 (UNKNOWN)
    ↓ hit  → cache in Pinecone, return
    ↓ miss or low confidence → continue
    
[STAGE 3] LLM Classifier (deepseek/deepseek-v4-flash via OpenRouter)
    temperature: 0.0, timeout: 8s
    ↓ success → cache in Pinecone, return with confidence 0.85
    ↓ fail/timeout/unparseable → continue
    
[STAGE 4] Fallback Result
    heuristic exists & confidence >= 0.5 → use heuristic * 0.8 penalty
    UNKNOWN heuristic → remapped to HYBRID
    nothing works → return HYBRID at 0.5 confidence
```

#### Stage 1: Pinecone Semantic Cache (`intentCacheService.ts`)

Before any regex or LLM call, the system checks Pinecone's `intent-routing-cache` namespace for a semantically similar query:

```typescript
// intentCacheService.ts:19-41 (simplified)
const matches = await searchChunks(queryEmbedding, {
  topK: 1,
  namespace: "intent-routing-cache",
});
if (matches.length === 0) return null;
const topMatch = matches[0];
if (topMatch.score >= 0.95 && topMatch.metadata?.intent) {
  return topMatch.metadata.intent; // cached DATABASE/DOCUMENT/HYBRID/UNKNOWN
}
```

If intent from cache **does not match** the heuristic result, the cache entry is **deleted** (poisoned entry eviction). This prevents stale or wrong intents from persisting.

The cache is populated by successful Stage 2 and Stage 3 classifications.

#### Stage 2: Heuristic Pattern Matcher (`classifierHeuristics.ts`)

79 regex patterns are organized into 4 intent groups. Each pattern has a name and a weight (0.0 - 1.0). The highest-scoring match per intent category wins.

**DOCUMENT patterns (42 regexes):**
- `full[- ]?price sell[- ]?through` → weight 0.99
- `framework agreement` → weight 0.99
- `campaign brief` → weight 0.92
- `running deep dive` → weight 0.99
- `annual sales plan` → weight 0.99
- `Q3.{0,10}(performance|review)` → weight 0.99
- `media.{0,10}budget` → weight 0.98
- `rebate (rate|threshold|tier)` → weight 0.99
- `volume commitment` / `purchase commitment` → weight 0.99
- `markdown support` / `coop marketing` → weight 0.99
- `like[- ]?for[- ]?like` → weight 0.98
- `(year.on.year|yoy|year over year)` → weight 0.95
- `growth.{0,20}(rate|vs|versus)` → weight 0.92
- `store.{0,10}(count|estate|number)` → weight 0.95
- `how many.{0,30}(stores|store)` → weight 0.97
- `weeks? of cover` / `aged stock` → weight 0.99
- `footfall uplift` / `return on ad spend` → weight 0.99
- `(premium|super premium|core|mid) tier` → weight 0.95
- `hero products?` → weight 0.95
- `click and collect` → weight 0.90
- `loyalty (programme|program|tier)` → weight 0.92
- `jd status` → weight 0.95
- `size cur` → weight 0.99
- `target volume of` → weight 0.95
- `buffer stock` → weight 0.92
- `\b(h1|h2|fy\s?\d{2,4})\b` (report period codes) → weight 0.95
- `top selling (product|sku)` → weight 0.90

**DATABASE patterns (20+ regexes):**
- `(top|bottom) \d+` → weight 0.95
- `how many (customers|orders|users|products|items|pairs|units)` → weight 0.97
- `average (order value|discount|price|quantity|spend)` → weight 0.97
- `by (region|channel|category|brand|department|state|age.group|gender|status)` → weight 0.92
- `(count|total|sum) of` → weight 0.95
- `\btotal\s+(revenue|sales|orders|customers|products)` → weight 0.95
- `\blast\s+(quarter|month|week|year)\b` → weight 0.85
- `revenue (generated|by|for|in)` → weight 0.90
- `orders? (placed|by|in|per)` → weight 0.92
- `low (on )?stock` → weight 0.97
- `stock level` → weight 0.95
- `reorder point` → weight 0.98
- `distribution center` → weight 0.97
- `age group` → weight 0.95
- `return rate` → weight 0.95
- `discount (depth|pct|percentage)` → weight 0.92
- `loyalty tier` → weight 0.95
- `traffic source` → weight 0.95
- `conversion (funnel|rate)` → weight 0.90
- `\b(bigquery|sql query|database|bq)\b` → weight 0.92
- `(most|highest|lowest) (revenue|sales|profit|margin)` → weight 0.90

**HYBRID patterns (9 regexes):**
- `according to (the|our|both).{0,60}(review|report|document|agreement|plan|brief|deep dive|bigquery|database)` → weight 0.98
- `(review|agreement|plan|report|brief|deep dive).{0,20}(says|states|shows|indicates)` → weight 0.95
- `compare.{0,30}(document|report|pdf).{0,30}(with|against|and).{0,30}(data|database|bigquery|actual)` → weight 0.98
- `(validate|verify|confirm).{0,30}(against|with|using).{0,30}(data|bigquery|database)` → weight 0.95
- `track (target|plan) against` → weight 0.95
- `(actual|real).{0,10}(vs|versus|vs\.).{0,10}(plan|target|budget)` → weight 0.90
- `\bvs\.?\s+(plan|target|budget)\b` → weight 0.85
- `how does.{0,50}(compare|track|stack up)` → weight 0.92
- `in\s+BQ\b` → weight 0.92

**UNKNOWN patterns (7 regexes):**
- `weather` → weight 0.99
- `tell.{0,20}(joke|story|poem)` → weight 0.99
- `who is (the )?(ceo|cfo|president|founder|director)` → weight 0.95
- `what is your (name|purpose)` → weight 0.95
- `stock (price|market)` → weight 0.95
- `how (are|were) (sales|things|we doing|business)` → weight 0.70 (vague-business)
- `^what'?s? (new|happening|going on)` → weight 0.65 (vague-whats-new)

**The decision logic** (`classifierHeuristics.ts:116-141`):

1. If **any HYBRID pattern** matches, return HYBRID immediately (hybrid takes precedence).
2. If **UNKNOWN score >= 0.8**, return UNKNOWN.
3. If the **top 2 scores are both >= 0.7**, return HYBRID (conflicting signals — run both sources).
4. Otherwise, return the **single highest-scoring intent**.

If no pattern matches at all, the heuristic returns `null`, which triggers Stage 3.

#### Stage 3: LLM Classifier

When heuristics are inconclusive ($confidence < 0.85$ or null), the system sends the question to `deepseek/deepseek-v4-flash` via OpenRouter with a system prompt that defines the 4 categories, provides 3 examples each, and instructs:

```
Respond with ONLY the category label.
```

The LLM runs with `temperature: 0.0` and a hard `max_tokens: 4000` limit, with an 8-second timeout. Any response containing the words DATABASE, DOCUMENT, HYBRID, or UNKNOWN (case-insensitive) is accepted. If the LLM fails, times out, or returns unparseable output, it falls through to Stage 4.

#### Stage 4: Fallback

```typescript
// classifier.ts:127-137
function fallbackResult(heuristic, start):
  if heuristic exists and heuristic.confidence >= 0.5:
    if heuristic.intent is UNKNOWN:
      return HYBRID (so the question still gets answered)
    return heuristic.intent with confidence * 0.8 penalty
  return HYBRID with 0.5 confidence
```

This ensures the system **always produces a route** rather than failing. "Better to look in both places than give up."

---

## 3. Stage 2: Source Execution & Fallback (`orchestrator.ts`)

Once the intent is classified, `orchestrate()` in `orchestrator.ts:161` decides what to execute next. The routing is defined at lines 236-280.

### 3.1 The Routing Matrix

```
┌──────────────────────────────────────────────────────┐
│        │ Primary     │ Fallback (if primary empty)   │
├────────┼─────────────┼───────────────────────────────┤
│ DATABASE│ BigQuery    │ → Document RAG               │
│ DOCUMENT│ Document RAG│ → BigQuery                   │
│ HYBRID  │ Both (parallel) │ (no fallback needed)      │
│ UNKNOWN │ "No relevant data found." │ (exit)          │
└────────┴─────────────┴───────────────────────────────┘
```

### 3.2 DATABASE Intent (`orchestrator.ts:236-253`)

```typescript
if (intent === "DATABASE") {
  await execBq(); // Run BigQuery first

  const isBqEmpty = rows.length === 0 || all values are null/undefined/empty;

  if (isBqEmpty) {
    console.log("[orchestrate] DATABASE returned nothing, trying DOCUMENT fallback");
    await execDoc(); // Fallback to document RAG
  }
}
```

The `isRowsEmpty()` function (`orchestrator.ts:150-159`) is strict: it considers a row "empty" if every field across every row is null, undefined, or empty string. Even a single populated cell in one row counts as "not empty."

### 3.3 DOCUMENT Intent (`orchestrator.ts:254-276`)

```typescript
if (intent === "DOCUMENT") {
  await execDoc(); // Run RAG pipeline first

  const isDocEmpty = chunks.length === 0 ||
    maxRelevanceScore(chunks) < MIN_RELEVANCE_SCORE; // 0.001

  if (isDocEmpty) {
    console.log("[orchestrate] DOCUMENT returned nothing, trying DATABASE fallback");
    await execBq(); // Fallback to BigQuery
  }
}
```

The relevance threshold `MIN_RELEVANCE_SCORE = 0.001` acts as a noise floor. If no chunk's reranker score exceeds this, the system treats the document search as having found nothing relevant.

### 3.4 HYBRID Intent (`orchestrator.ts:277-280`)

```typescript
else {
  await Promise.all([execDoc(), execBq()]); // Run both in parallel
  checkAborted(signal);
}

Both document RAG and BigQuery execute **simultaneously** via `Promise.all`. There is no fallback between them because both are expected to contribute. Each source's results are independently formatted and merged in Stage 3.

### 3.5 UNKNOWN Intent (`orchestrator.ts:192-197`)

```typescript
if (classification.intent === "UNKNOWN") {
  writer.textDelta("No relevant data found.");
  writer.status("complete", "Done");
  writer.done();
  return;
}
```

Terminal. No source is queried. The response is immediate.

### 3.6 The execDoc() Function

`execDoc()` (`orchestrator.ts:204-219`) wraps `executeRagPipeline()` from `pipeline.ts`:

1. **Embed** the query via OpenRouter (`openai/text-embedding-3-small`) — **skipped if orchestrator already computed it**.
2. **Search Pinecone** — `searchChunks()` in default namespace, `topK = 40`, filtered by `documentIds` if the user specified them.
3. **Rerank** via OpenRouter (`nvidia/llama-nemotron-rerank-vl-1b-v2:free`) — selects top 3.
4. **Fallback** if reranker fails — uses raw vector search scores for top 3.
5. **Format context** as:
   ```
   [1] Document: "Nike Framework Agreement 2025" (score: 0.87)
       The minimum annual purchase commitment for FY2025 is GBP 750M...
   ```

### 3.7 The execBq() Function

`execBq()` (`orchestrator.ts:222-234`) wraps `executeBqQuestion()` from `bigqueryService.ts`:

1. **Semantic cache check** (`semanticCache.ts`) — cosine similarity >= 0.95 against previously executed SQL queries stored in `sql-cache.json`. If found, execute cached SQL directly.
2. **Table selection** (`bigquerySemantic.ts`) — Pinecone query in `bq-schemas` namespace, finds 3 most relevant tables from the 6 available, filters by score > 0.3.
3. **Golden example retrieval** (`bigquerySemantic.ts`) — Pinecone query in `golden-queries` namespace, finds 2 most similar example NL→SQL pairs, score > 0.4 threshold.
4. **SQL generation** (`bigquerySqlGenerator.ts`) — LLM-powered with retry across 2 models:
   - Primary: `cohere/north-mini-code:free` (10s timeout) — 2 attempts
   - Fallback: `deepseek/deepseek-v4-flash` (30s timeout) — 2 attempts
   - Error feedback loop: if SQL fails on execution, the error message is fed back to the LLM for self-correction.
5. **SQL validation** (`bigqueryHelpers.ts:39-44`) — rejects DDL/DML statements (DROP, DELETE, INSERT, UPDATE, ALTER, CREATE, TRUNCATE, GRANT, REVOKE, CALL, EXPORT, LOAD, MERGE, EXECUTE).
6. **Query execution** via `@google-cloud/bigquery` with singleton client.
7. **Cache** the successful SQL + embedding in `sql-cache.json`.
8. **Format context** as:
   ```
   [N] BigQuery: 5 rows:
     product_name: Nike Air Max, units_sold: 1234
   Query: SELECT p.product_name, SUM(oi.quantity) AS units_sold...
   ```

---

## 4. Stage 3: Context Assembly & Answer Generation

### 4.1 Merging Contexts (`orchestrator.ts:282-330`)

After source execution, the orchestrator builds a unified `mergedContext`:

```typescript
const parts: string[] = [];
if (docContext) parts.push(docContext);   // Document chunks [1], [2], [3]
if (bqText) parts.push(bqText);           // BigQuery result [N]
const mergedContext = parts.join("\n\n");
```

The BigQuery source index is offset by the number of document chunks. If there are 3 doc chunks, the BQ result gets `[4]`.

### 4.2 The System Prompt (`orchestrator.ts:329-330`)

```
You are Analysis AI. Answer ONLY using the sources below.
Use inline citations like [1], [2] referencing source indices.
If a database query successfully returned 0 rows, state that no
records match the criteria rather than saying "No relevant data found."
If no source answers the question, say "No relevant data found."
Do not make up information.

SOURCES:
[1] Document: "Nike Framework Agreement" (score: 0.87)
    The minimum annual purchase commitment for FY2025 is GBP 750M...
[2] Document: "Hoka Running Deep Dive" (score: 0.92)
    Hoka full-price sell-through rate is 62%...
[3] BigQuery: 3 rows:
    product_name: Hoka Clifton 9, units_sold: 4582
  Query: SELECT p.product_name, SUM(oi.quantity) AS units_sold...
```

### 4.3 LLM Generation

The LLM (`deepseek/deepseek-v4-flash`, temperature 0.1, max_tokens 16000) generates the answer via streaming SSE. It must cite sources using `[N]` markers inline.

### 4.4 Citation Building (`orchestrator.ts:31-97`)

After the LLM responds, `buildDocCitations()` extracts every `[N]` marker from the reply text using the regex `/\[(\d+)\]/g`. Each marker is mapped back to the corresponding source chunk.

`buildBqCitation()` creates a single BigQuery citation if BQ was used, regardless of the number of markers found.

### 4.5 Citation Verification (`verification.ts`)

A **post-hoc hallucination check** runs on document citations:

1. For each `[N]` marker, extract a 120-character window of claim text around it.
2. Extract key terms from the claim text (remove stop words, keep numbers, lowercase).
3. Compute **term overlap** with the source chunk text.
4. If overlap < 40%, the citation marker is **removed** from the reply.
5. If more than 25% of citations fail, the verdict is "low_confidence."

BigQuery citations are NOT verified (they come from deterministic SQL execution).

---

## 5. The Embedding Sharing Optimization

The orchestrator computes the query embedding **once** and shares it across the entire pipeline:

```typescript
// orchestrator.ts:171-175
const [embeddings, classification] = await Promise.all([
  embed([input.message]),       // Single embed call
  classifyIntentFull(input.message)
]);
const queryEmbedding = embeddings[0];
```

This single embedding is passed to:
- `executeRagPipeline()` (for Pinecone document search)
- `executeBqQuestion()` (for semantic SQL cache, table selection, golden example retrieval)

This avoids 2 redundant embedding API calls per request. (Note: `classifyIntentFull` computes its own embedding internally — it does not receive the pre-computed one from the orchestrator.)

---

## 6. The Complete End-to-End Flow

```
┌──────────────────────────────────────────────────┐
│ User: "What are the top 3 products by revenue?"  │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│ 1. POST /api/chat                                 │
│    → validate message (non-empty, <= 10K chars)   │
│    → Create SSE stream                            │
│    → Call orchestrate()                           │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│ 2. Embed + Classify (parallel)                    │
│    → embed: [openai/text-embedding-3-small]       │
│    → classifyIntentFull():                        │
│       a. Pinecone intent cache? No match          │
│       b. Heuristic: "top 3" → DATABASE (0.95)     │
│       c. Return DATABASE (confidence 0.95)        │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│ 3. DATABASE routing → execBq()                    │
│    → Semantic SQL cache? Miss                     │
│    → selectTablesSemantic() → [products, orders,  │
│      order_items]                                 │
│    → llmGenerateSql()                             │
│    → validateSql()                                │
│    → executeQuery()                               │
│    → Returns 3 rows                               │
│    → emitBqResult() — SSE event to client         │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│ 4. Not empty → no fallback needed                 │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│ 5. Build context:                                 │
│    [1] BigQuery: 3 rows:                          │
│        product_name: Nike Air Max...              │
│      Query: SELECT p.product_name...              │
│                                                   │
│    System: "Answer ONLY using the sources below"  │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│ 6. LLM generates answer (SSE stream)              │
│    → "Our top 3 products by revenue are:         │
│       1. Nike Air Max (GBP 125,430) [1]..."      │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│ 7. Build citations → emit via SSE                 │
│    → [bigquery] citation                          │
│    → verification skipped (no doc chunks)          │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│ Client receives: reply + citations + sources       │
│ React renders: MessageBubble + BqPreview           │
└──────────────────────────────────────────────────┘
```

---

## 7. Edge Cases and Failure Modes

### 7.1 Both Sources Empty

```typescript
// orchestrator.ts:315-320
if (!docContext && !bqText) {
  writer.textDelta("No relevant data found.");
  writer.status("complete", "Done");
  writer.done();
  return;
}
```

### 7.2 Source Execution Error

```typescript
// orchestrator.ts:297-298
} else if (docResFinal?.status === "rejected") {
  console.error("Document RAG failed:", docResFinal.reason);
}
```

If a source errors out (e.g., Pinecone is down, BigQuery timeout), the orchestrator **silently logs it and continues** with whatever the other source produced. If both error out, no context is available and the empty-handling kicks in.

### 7.3 DATABASE → Fallback to DOCUMENT Uses Single-Path

The fallback from DATABASE to DOCUMENT does **not** re-run the BQ after document search — the document result is the final word. Similarly, DOCUMENT → BQ fallback ends at BQ.

### 7.4 Poisoned Intent Cache Entry

If Pinecone returns a cached intent that contradicts the heuristic result, the entry is **deleted** (`classifier.ts:43`). This prevents stale classifications from persisting.

### 7.5 Classification Timeout

If the LLM classification times out (8s), the system falls back to heuristic with a 0.8 confidence penalty. If the heuristic itself was null, it defaults to HYBRID at 0.5 — ensuring the question still gets answered even under degraded conditions.

### 7.6 SQL Generation Loop

BigQuery SQL generation retries up to **4 times total** (2 models × 2 attempts each). The error feedback from failed executions is injected into the next attempt's prompt for self-correction. If all fail, it throws a `BQ_ERROR` with the last error message, which propagates up to the orchestrator and is logged.

---

## 8. Key Architectural Principles

1. **Fire-and-forget fallback**: Fallbacks are one-directional. Once the primary source fails and the fallback runs, the result is final — there is no reconciliation or re-evaluation.

2. **Graceful degradation**: Every external dependency (Pinecone, OpenRouter, BigQuery) has a fallback path. The system never crashes — it returns degraded results.

3. **Parallelism by default**: Embedding and classification run in parallel. HYBRID sources run in parallel. The system minimizes latency by overlapping independent work.

4. **Embedding as single source of truth**: One embedding vector is generated per query request and reused across all subsystems — intent cache, document search, BigQuery table selection, and SQL semantic cache.

5. **Semantic caching at every layer**: Intent routing cache (Pinecone), SQL cache (file-based cosine similarity), and schema cache (file-based) all prevent redundant work.

6. **Heuristics before LLM**: The 96 regex patterns classify most queries without any LLM call ($0 cost, ~1ms latency). The LLM classifier is only invoked when heuristics are ambiguous.

---

## 9. Source Code Reference

| Component | File Path |
|-----------|-----------|
| Orchestrator | `src/core/pipeline/orchestrator.ts` |
| Classifier | `src/core/pipeline/classifier.ts` |
| Heuristic Patterns | `src/core/pipeline/classifierHeuristics.ts` |
| Classification Cache | `src/core/pipeline/classifierCache.ts` |
| RAG Pipeline | `src/core/pipeline/pipeline.ts` |
| Citation Verification | `src/core/pipeline/verification.ts` |
| Intent Cache (Pinecone) | `src/server/services/intentCacheService.ts` |
| Embedding Client | `src/server/clients/embeddingClient.ts` |
| Rerank Client | `src/server/clients/rerankClient.ts` |
| BigQuery Service | `src/server/services/bigqueryService.ts` |
| BigQuery Semantic | `src/server/services/bigquerySemantic.ts` |
| BigQuery SQL Generator | `src/server/services/bigquerySqlGenerator.ts` |
| BigQuery Helpers | `src/server/services/bigqueryHelpers.ts` |
| Semantic Cache (SQL) | `src/server/services/semanticCache.ts` |
| BigQuery Client | `src/server/clients/bigqueryClient.ts` |
| Vector Service (Pinecone) | `src/server/services/vectorService.ts` |
| BQ Schema Config | `src/server/config/bigquery.ts` |
| OpenRouter Config | `src/server/config/openrouter.ts` |
| Pinecone Config | `src/server/config/pinecone.ts` |
| SSE Events | `src/lib/sse.ts` |
| Chat API Route | `src/app/api/chat/route.ts` |
| Type Definitions | `packages/types/src/domain.ts` |
| API Type Definitions | `packages/types/src/api.ts` |
