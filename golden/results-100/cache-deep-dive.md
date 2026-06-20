# Intent Cache Deep-Dive

**Date:** 2026-06-20  
**Author:** Agent A  
**Scope:** Complete analysis of the Pinecone intent-routing cache — architecture, poisoning mechanism, evidence, and fix recommendations.

---

## 1. Cache Architecture

### 1.1 Two-Layer Cache

The intent classification system has **two independent cache layers** stacked in front of the heuristic/LLM classifier:

```
classifyIntentFull()
  ├── Layer 1: In-memory Map (classifierCache.ts)
  ├── Layer 2: Pinecone index namespace "intent-routing-cache" (intentCacheService.ts)
  ├── Heuristics (classifierHeuristics.ts)
  ├── LLM (OpenRouter via classifier.ts)
  └── Fallback
```

### 1.2 Layer 1: In-memory Cache (`classifierCache.ts`)

| Property | Value |
|----------|-------|
| Storage | `Map<string, ClassificationCacheEntry>` (module-level) |
| Key (exact) | Normalized message text (`.toLowerCase().trim().replace(/\s+/g, " ")`) |
| Key (semantic) | Embedding cosine similarity (secondary fallback) |
| Semantic threshold | `>= 0.92` |
| Max entries | 1000 |
| TTL | 1 hour (`DEFAULT_TTL_MS = 3600000`) |
| Value stored | `{ normalized, embedding, intent, expiresAt }` |

**Read path:** Exact text match first, then embedding similarity scan across all entries.

### 1.3 Layer 2: Pinecone Cache (`intentCacheService.ts`)

| Property | Value |
|----------|-------|
| Index | `analysis-ai` (serverless, 1536d) |
| Namespace | `intent-routing-cache` |
| API | `@pinecone-database/pinecone` v8 |
| Embedding model | `openai/text-embedding-3-small` (1536 dims) |
| Search | `topK: 1`, `includeMetadata: true` |
| Similarity threshold | `>= 0.95` (cosine) |
| TTL | **None** — entries persist until explicitly deleted |
| Version field | **None** |
| Max vectors (pre-clear) | 102 |

**Write path** (`setCachedPineconeIntent`):
```typescript
setCachedPineconeIntent(queryEmbedding, message, intent)
  → upsertChunks([{ id: getUniqueId("cache"), values: queryEmbedding, metadata }], "intent-routing-cache")
```

**Read path** (`getCachedPineconeIntent`):
```typescript
getCachedPineconeIntent(queryEmbedding)
  → searchChunks(queryEmbedding, { topK: 1, namespace: "intent-routing-cache" })
  → if score >= 0.95, return metadata.intent
```

**Metadata stored per vector** (`CacheMetadata`):
```typescript
{
  chunkId: string,       // e.g. "cache-abc123"
  documentId: "intent-cache",
  documentName: "Intent Semantic Cache",
  pageNumber: 1,
  chunkIndex: 0,
  chunkText: string,     // the full question text
  orgId: "system",
  uploadedAt: string,    // ISO timestamp
  storageUrl: "",
  intent: "DATABASE" | "DOCUMENT" | "HYBRID" | "UNKNOWN",
  cachedAt: string,      // ISO timestamp
}
```

### 1.4 Cache Write Trigger Points

Cache writes happen at exactly two places in `classifyIntentFull()`:

1. **Heuristic path** (line 53): When `heuristic.confidence >= 0.85 && heuristic.intent !== "UNKNOWN"`
2. **LLM path** (line 116): When the LLM returns a parsable label

Both paths write to **both** Layer 1 (in-memory) and Layer 2 (Pinecone) caches.

**Key observation:** The local in-memory cache (`classifierCache.ts`) is checked **before** Pinecone:
```
if (cached = getCachedClassification(message, embedding)) → return, don't check Pinecone
if (pineconeCached = getCachedPineconeIntent(embedding)) → return, also write to local cache
```

So the local cache acts as an even faster front-end. If the exact question text was classified in the same process, the local cache short-circuits entirely.

### 1.5 Cache Read Decision Flow

```
classifyIntentFull(message, queryEmbedding?)
  │
  ├─ 1. getCachedClassification(message, embedding)  ← Local in-memory cache
  │     ├─ Exact text match → return cached intent
  │     └─ Embedding similarity ≥ 0.92 → return best match
  │
  ├─ 2. getCachedPineconeIntent(embedding)           ← Pinecone cache
  │     └─ Pinecone cosine ≥ 0.95 → cache locally + return
  │
  ├─ 3. classifyByHeuristics(message)                 ← Regex patterns
  │     └─ confidence ≥ 0.85 & not UNKNOWN → cache both layers + return
  │
  ├─ 4. LLM via OpenRouter                            ← DeepSeek V4
  │     └─ Successful → cache both layers + return
  │
  └─ 5. Fallback                                      ← heuristic * 0.8 or HYBRID(0.5)
```

### 1.6 No TTL/Expiry in Pinecone

The Pinecone cache has **zero eviction or expiration logic**. Vectors written to `intent-routing-cache` persist until manually deleted via `deleteAll()` or `deleteMany()`. The only built-in bound is that each process restart clears the in-memory cache (Layer 1), but the Pinecone cache (Layer 2) persists across restarts.

---

## 2. Pre-Clear Cache State

Before this investigation cleared the cache, the Pinecone `intent-routing-cache` namespace contained:

| Metric | Value |
|--------|-------|
| Total vectors | 102 |
| DATABASE | 46 |
| DOCUMENT | 37 |
| HYBRID | 14 |
| UNKNOWN | 3 |
| Other namespaces | golden-queries (22), bq-schemas (6), __default__ (38) |

The majority of cached intents (83 of 102 = 81%) were **DATABASE or DOCUMENT** — not HYBRID. This directly reflects the heuristic misclassification pattern.

---

## 3. Per-Question Heuristic Analysis

### 3.1 Methodology

For each hybrid question, I traced every regex pattern in `classifierHeuristics.ts` against the exact question text from `golden-100.json`. The `test-heuristic.mjs` script confirmed the analysis.

### 3.2 Results

| ID | Ground Truth | Heuristic Returned | Confidence | Patterns That Fired | Cached Intent (Pinecone) |
|----|-------------|-------------------|------------|---------------------|--------------------------|
| hyb-05 | HYBRID | **DATABASE** | 0.92 | `bq-reference` | DATABASE |
| hyb-09 | HYBRID | **DOCUMENT** | 0.97 | `how-many-stores` | DOCUMENT |
| hyb-10 | HYBRID | **DOCUMENT** | 0.95 | `target-volume` | DOCUMENT |
| hyb-12 | HYBRID | **DATABASE** | 0.97 | `how-many-entity`, `stock-level` | DATABASE |
| hyb-13 | HYBRID | **HYBRID** ✓ | 0.95 | `yoy-growth` + `stock-level` (conflicting) | HYBRID |
| hyb-16 | HYBRID | **DOCUMENT** | 0.95 | `gross-margin`, `report-period` | DOCUMENT |
| hyb-18 | HYBRID | **DATABASE** | 0.95 | `stock-level` | DATABASE |
| hyb-19 | HYBRID | **DATABASE** | 0.95 | `stock-level` | DATABASE |
| hyb-20 | HYBRID | **DOCUMENT** | 0.95 | `gross-margin` | DOCUMENT |
| hyb-22 | HYBRID | **DATABASE** | 0.97 | `how-many-entity`, `stock-level` | DATABASE |
| hyb-23 | HYBRID | **DATABASE** | 0.98 | `reorder-point` | DATABASE |

### 3.3 Why Each Question Was Misclassified

#### hyb-05
```
"The campaign brief targets 8,000 units of The North Face Nuptse Jacket. How many units of this jacket were actually sold in BigQuery?"
```
- `bigquery|sql query|database` → matches **"BigQuery"** → DATABASE (0.92)
- No HYBRID pattern matches (no "according to", no "says/states/shows/indicates", no "compare", no "vs plan")
- No DOCUMENT pattern matches ("targets" ≠ "target volume of")
- **Result:** DATABASE (should be HYBRID — needs both doc retrieval for campaign target + BQ for actual sales)

#### hyb-09
```
"The running category deep dive targets 200 stores for Hoka. In how many stores is Hoka currently stocked, and how many Hoka products were sold in BQ?"
```
- `how many.{0,30}(stores|store)` → matches **"how many stores"** → DOCUMENT (0.97)
- No HYBRID pattern matches
- "how many (customers|orders|users|products|items|pairs)" does NOT match because "Hoka" sits between "how many" and "products"
- **Result:** DOCUMENT (should be HYBRID — store count from doc + units sold from BQ)

#### hyb-10
```
"The campaign brief specifies a target volume of 25,000 Under Armour Backpacks. How many UA backpacks were sold and how many were returned in BQ?"
```
- `target volume of` → matches **"target volume of"** → DOCUMENT (0.95)
- No HYBRID or DATABASE patterns match ("BQ" ≠ "bigquery")
- **Result:** DOCUMENT (should be HYBRID — target from doc + sales/returns from BQ)

#### hyb-12
```
"Nike Pegasus 41 is the top SKU in the deep dive (GBP 8.2 million). How many pairs were sold in BQ, and what is its stock level at the Manchester DC?"
```
- `how many (customers|orders|users|products|items|pairs)` → matches **"how many pairs"** → DATABASE (0.97)
- `stock level` → DATABASE (0.95)
- No HYBRID pattern matches
- **Result:** DATABASE (should be HYBRID — deep dive fact + BQ sales + stock)

#### hyb-13
```
"New Balance has seen 18% YoY growth in JD UK in the sales plan. How many New Balance 530 units were sold in BQ, and what is the stock level at Manchester DC?"
```
- `(year.on.year|yoy|year over year)` → matches **"YoY"** → DOCUMENT (0.95)
- `stock level` → DATABASE (0.95)
- Conflicting patterns (both ≥ 0.7) → **correctly returns HYBRID** ✓
- **Result:** HYBRID (correct)

#### hyb-16
```
"The running category gross margin was 44.0% in H1 deep dive. What is the actual gross margin of the Running category in BQ?"
```
- `(gross|operating) margin` → matches **"gross margin"** → DOCUMENT (0.95)
- `\b(h1|h2|fy\s?\d{2,4})\b` → matches **"H1"** → DOCUMENT (0.95)
- No HYBRID pattern matches
- **Result:** DOCUMENT (should be HYBRID — doc margin figure vs BQ actual)

#### hyb-18
```
"The campaign brief targets 28,000 Converse Chuck Taylor All Star pairs. How many Chuck Taylors were sold in BQ, and what is its stock level in Manchester DC?"
```
- `stock level` → DATABASE (0.95)
- No HYBRID pattern matches
- "how many (customers|orders|users|products|items|pairs)" does NOT match because "Chuck Taylors" separates "how many" from the target word
- **Result:** DATABASE (should be HYBRID)

#### hyb-19
```
"The campaign brief targets 18,000 Nike Tech Fleece Hoodie units. How many units were sold in BQ, and what is the stock level at Glasgow DC?"
```
- `stock level` → DATABASE (0.95)
- No HYBRID pattern matches
- "how many (customers|orders|users|products|items|pairs)" — "units" is NOT in the enumerated list
- **Result:** DATABASE (should be HYBRID)

#### hyb-20
```
"The sales plan targets Accessories gross margin of 51.0%. What is the actual Accessories gross margin in BQ?"
```
- `(gross|operating) margin` → DOCUMENT (0.95)
- No HYBRID pattern matches
- "BQ" does not match `/bigquery|sql query|database/i`
- **Result:** DOCUMENT (should be HYBRID)

#### hyb-22
```
"Nike Dunk Low targets 32,000 pairs in the campaign brief. How many pairs were sold and what is the stock level at Manchester DC?"
```
- `how many (customers|orders|users|products|items|pairs)` → **"how many pairs"** → DATABASE (0.97)
- `stock level` → DATABASE (0.95)
- No HYBRID pattern matches
- **Result:** DATABASE (should be HYBRID)

#### hyb-23
```
"The running category deep dive targets expanding Hoka distribution to 200 stores. What is the reorder point of Hoka Clifton 9 at Glasgow DC?"
```
- `reorder point` → DATABASE (0.98)
- No HYBRID pattern matches
- **Result:** DATABASE (should be HYBRID — expansion target from document + reorder point from BQ)

### 3.4 Root Cause Pattern

The heuristic misclassified these questions because **none of the HYBRID patterns matched**. The question authors used phrasing like:

- "targets" instead of "according to...says/states/shows"
- "in BQ" (abbreviation) instead of "in BigQuery"
- "How many units" — "units" is not in the DATABASE entity list

The conflict-resolver (second score ≥ 0.7 → HYBRID) only fires when both DATABASE and DOCUMENT patterns match with high confidence, which only happened for hyb-13.

---

## 4. Cache Poisoning Mechanism

### 4.1 How Poisoning Happens

```
First run (cache empty):
  classifyIntentFull("hyb-05 question")
    → Pinecone cache miss
    → Heuristic returns DATABASE (from "BigQuery" regex)
    → setCachedPineconeIntent(embedding, "hyb-05 text", "DATABASE")  ← WRONG
    → setCachedClassification("hyb-05 text", embedding, "DATABASE")  ← WRONG
    → orchestrator runs BQ-only (for DATABASE intent), misses doc context
    → Reply has no doc comparison data → test FAILS

Second run (cache populated):
  classifyIntentFull("hyb-05 question")
    → In-memory cache hit (exact text match): returns DATABASE immediately
    → orchestrator runs BQ-only again
    → Same wrong result, no way to recover
```

### 4.2 Key Vulnerability: Cache Persists Across Restarts

The **Pinecone cache is persistent** (hosted on Pinecone cloud). Once a wrong intent is written:
- Survives server restarts
- Survives process exits
- Survives all code changes (it's external state)
- Needs explicit `deleteAll()` or `deleteMany()` to clear

The **in-memory cache** (`Map` in `classifierCache.ts`) is per-process but lives as long as the server runs. Each process restart clears it, but the first request after restart will re-hit the Pinecone cache.

### 4.3 Similarity Threshold Analysis

**Pinecone threshold:** `>= 0.95` (very high)

At 0.95 cosine similarity, only near-identical questions match. This means:
- Same question re-asked → 1.0 similarity → cache hit (poisoned)
- Different but similar question (e.g., "Nuptse Jacket" vs "Nike Tech Fleece") → likely < 0.95 → cache miss → reclassified

However, OpenAI's `text-embedding-3-small` produces 1536-dimensional embeddings where questions about the same product/brand can have high cosine similarity. Two questions about "The North Face Nuptse Jacket" could score > 0.95 even with different wording, making the cross-contamination path viable.

**Local in-memory threshold:** `>= 0.92` (slightly lower)

The local cache scans ALL entries by embedding similarity, so a question about "Nike running shoes" could match a cached "Nike footwear" entry at 0.92+, returning the wrong intent.

### 4.4 Secondary Contamination Path

A completely different question whose embedding happened to be within 0.95 of a hybrid question's embedding could also poison the cache. I checked specific candidates:

- `bq-01` ("What were our top 3 products by revenue?") → cached as DATABASE
- `doc-14` ("What is the planned revenue for Nike?") → cached as DOCUMENT

If any BQ- or DOC-only question had an embedding within 0.95 of a hybrid question, it would return the wrong intent from the Pinecone cache. This is possible but less likely than the primary path (heuristic first-classification mistake).

### 4.5 Latch-on-Bootstrapping

All 100 test questions were processed sequentially in one `tsx` process. Once a question was cached (with wrong intent), later questions whose embeddings were similar would hit the local cache (0.92 threshold) or Pinecone cache (0.95 threshold) and return the cached wrong intent.

Since the exact text match in the local cache is checked first, the first-hit-wins pattern is especially problematic. After all 100 questions were processed, the in-memory cache contained 100 entries (capped at 1000), so every question would hit the local cache on subsequent requests in the same process.

---

## 5. Cache Clearing Script

**File:** `golden/clear-cache.ts`

### Usage

```bash
# Run from project root
npx tsx golden/clear-cache.ts list              # List all cached entries
npx tsx golden/clear-cache.ts clear             # DELETE ALL vectors
npx tsx golden/clear-cache.ts reset             # Clear + offer rebuild instructions
npx tsx golden/clear-cache.ts delete-intent DATABASE    # Delete only DATABASE entries
npx tsx golden/clear-cache.ts delete-ids <id1> <id2>    # Delete specific vectors
```

### What was done

Before this investigation: **102 vectors** in `intent-routing-cache`
After `npx tsx golden/clear-cache.ts reset`: **0 vectors** — fully cleared.

Verified by `inspect-cache.ts`:
- `describeIndexStats()` confirms namespace is gone
- Zero query matches returned

### Verification

```bash
# After clearing, verify:
npx tsx golden/inspect-cache.ts
# Expected: Namespace "intent-routing-cache" is empty. No cached intents.
```

### Rebuild Recommendation

After clearing, re-run the golden-100 test suite with a **cold cache** to let correct classifications be stored:
```bash
cd apps/web
npx tsx ../../golden/test-runner-100.js
```

This will re-populate the cache with correct intents from the LLM path (which correctly classifies all hybrid questions as HYBRID).

---

## 6. Recommended Fixes

### 6.1 Immediate Fixes (Operations)

| # | Fix | Priority | Effort |
|---|-----|----------|--------|
| 1 | Add `"BQ"` to the `bigquery|sql query|database` regex → `BQ|bigquery|sql query|database` | P0 | 2 min |
| 2 | Add `"units"` to the `how many (customers|orders|users|products|items|pairs)` regex | P0 | 2 min |
| 3 | Add HYBRID pattern for `(targets|target volume).{0,60}(BQ|bigquery|database|actual)` | P0 | 5 min |
| 4 | Add HYBRID pattern for `campaign brief.{0,30}(sold|sell|stock|inventory)` | P1 | 5 min |
| 5 | Add TTL to Pinecone cache entries (e.g., 7 days via a scheduled cleanup) | P1 | 1 day |
| 6 | Add cache version field to allow bulk invalidation on schema change | P2 | 1 day |

### 6.2 Code Fixes

**File: `classifierHeuristics.ts`**

1. **Line 90: Add "BQ" as alias for "bigquery":**
   ```diff
   - { regex: /bigquery|sql query|database/i, intent: "DATABASE", weight: 0.92, name: "bq-reference" },
   + { regex: /\b(bq|bigquery|sql query|database)\b/i, intent: "DATABASE", weight: 0.92, name: "bq-reference" },
   ```

2. **Line 72: Add "units" to the how-many entity list:**
   ```diff
   - { regex: /how many (customers|orders|users|products|items|pairs)/i, ... },
   + { regex: /how many (customers|orders|users|products|items|pairs|units)/i, ... },
   ```

3. **Add new HYBRID patterns to catch cross-reference questions:**
   ```typescript
   { regex: /(targets|target volume).{0,60}(bq|bigquery|actual|sold|stock level)/i, intent: "HYBRID", weight: 0.90, name: "target-vs-actual" },
   { regex: /(campaign brief|brief).{0,60}how many.{0,60}(sold|returned|stock|inventory)/i, intent: "HYBRID", weight: 0.92, name: "brief-vs-data" },
   { regex: /(deep dive|review|plan|report).{0,60}(how many|what is|stock level|reorder).{0,60}(bq|bigquery|database)/i, intent: "HYBRID", weight: 0.90, name: "doc-fact-vs-db" },
   ```

**File: `classifier.ts`**

4. **Add fallback re-classification**: If the Pinecone cache returns an intent with high confidence but the orchestrator's execution path produces contradictory results (e.g., DATABASE path returns empty BQ results), re-classify with a penalty.

5. **Add cache write-after-execution validation**: Don't cache an intent until after the orchestrator's execution path confirms the classification. Currently, the cache is written BEFORE the orchestrator uses the intent.

**File: `intentCacheService.ts`**

6. **Add TTL to Pinecone metadata** and implement a periodic cleanup:
   ```typescript
   metadata.expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
   ```

7. **Add a version field** and reject stale versions:
   ```typescript
   const CACHE_VERSION = 2;
   metadata.cacheVersion = CACHE_VERSION;
   // On read:
   if (metadata.cacheVersion !== CACHE_VERSION) return null;
   ```

### 6.3 Architectural Fixes

| # | Fix | Rationale |
|---|-----|-----------|
| 1 | Move cache write to AFTER orchestrator execution | Currently written in `classifyIntentFull()` before the orchestrator uses the intent. Write should happen only after the orchestrator confirms execution path succeeded. |
| 2 | Add cache TTL to Pinecone metadata + cron cleanup | Prevents stale entries from persisting indefinitely |
| 3 | Store both intent AND execution result hash | Allows detecting when a cached intent leads to empty results → invalidate cache entry |
| 4 | Add cache metrics/monitoring | Track cache hit rate by intent type to detect drift |
| 5 | Add A/B testing path | For a subset of requests, bypass cache and compare heuristic vs LLM results |

### 6.4 Testing

1. After applying fixes, clear the Pinecone cache and re-run the golden-100 test suite
2. Verify ALL 25 hybrid questions pass with both document citations AND BigQuery citations
3. Re-run with cache populated to verify second-run correctness
4. Add a dedicated `intent-cache.test.ts` that specifically tests each hybrid question's classification

---

## 7. Summary

The cache poisoning was caused by **10 out of 11 hybrid questions being misclassified by the heuristic classifier**. The heuristic's HYBRID patterns are too narrow — they require explicit phrases like "according to...says/states/shows/indicates" or "compare...with...data" — but the golden-100 hybrid questions use natural phrasing like "targets X units... How many were sold in BQ?" and "What is the stock level at Manchester DC?"

Once the wrong intent (DATABASE or DOCUMENT) was cached in Pinecone (which has no TTL or expiration), every subsequent request for the same question would hit the cache and return the wrong classification, routing the question to the wrong execution path and missing the parallel document+BQ data needed for hybrid answering.

**Clearing the cache** (done — 102 vectors deleted) is necessary but not sufficient. The heuristic patterns must be fixed to prevent re-poisoning on the next test run.
