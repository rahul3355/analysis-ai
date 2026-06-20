# Cache Invalidation Strategies for Pinecone Intent Classification

**Date**: 2026-06-20
**Author**: Agent C — Research Cache Invalidation

---

## 1. Executive Summary

The intent classifier uses a **3-tier caching architecture**: in-memory LRU (TTL-aware) → Pinecone vector cache (no TTL) → Heuristic/LLM (slow path). The Pinecone layer has **no invalidation mechanism** — vectors written to namespace `"intent-routing-cache"` persist forever, creating a poisoned-cache risk whenever the classifier's behavior changes. This report inventories Pinecone's capabilities, compares invalidation strategies, and provides code-level fixes.

---

## 2. Codebase Current State

### 2.1 Tier 1 — In-Memory Cache (`classifierCache.ts`)
- `Map<string, ClassificationCacheEntry>` with max 1000 entries
- TTL: 1 hour (`DEFAULT_TTL_MS = 3600000`)
- Semantic fuzzy match via `cosineSimilarity()` with threshold 0.92
- Eviction: oldest entry on insert when full (FIFO, not LRU)
- **Already has expiration** — but the TTL is never propagated to Pinecone

### 2.2 Tier 2 — Pinecone Vector Cache (`intentCacheService.ts`)
- Namespace: `"intent-routing-cache"`
- Read: `searchChunks(queryEmbedding, { topK: 1 })`, threshold `score >= 0.95`
- Write: `upsertChunks()` with `CacheMetadata` including `cachedAt` timestamp
- **No TTL check on read** — `cachedAt` is stored but never read
- **No stale cleanup** — vectors accumulate indefinitely
- **No version pinning** — no `classifierVersion` field in metadata

### 2.3 Tier 3 — Heuristic + LLM (`classifier.ts`, `classifierHeuristics.ts`)
- 93 regex patterns with weighted confidence scores
- Heuristic writes to Pinecone if `confidence >= 0.85 && intent !== "UNKNOWN"`
- LLM writes to Pinecone after successful classification
- **No write-through validation** against the other path

### 2.4 Key Risks
1. **Classifier retraining / prompt change**: Old Pinecone entries return stale intents with 0.95+ confidence, silently overriding the new classifier
2. **Distribution drift**: User query patterns shift; old cache entries match semantically similar but now-incorrect queries
3. **No eviction**: Unlimited growth in `"intent-routing-cache"` namespace + infinite storage cost
4. **No monitoring**: No metrics on cache hit rate, freshness, or staleness

---

## 3. Pinecone Capability Inventory

### 3.1 Delete Operations
| Method | Capability | API Cost |
|--------|-----------|----------|
| `deleteById(ids[])` | Delete specific vectors by ID (max 1000 per call) | 1+ WU per vector |
| `deleteByFilter(filter)` | Delete all vectors matching metadata filter | 1+ WU per vector |
| `deleteAll()` | Wipe entire namespace | Low |
| `deleteNamespace(ns)` | Destroy namespace + all vectors | Low |

**Source**: Pinecone Delete API — supports `ids`, `deleteAll`, `filter`, and `namespace` params.

### 3.2 Metadata Filter Operators (relevant to TTL)
| Operator | Example | Use Case |
|----------|---------|---------|
| `$lt` | `{"cachedAt": {"$lt": 1234567890}}` | Delete entries older than timestamp |
| `$gte` | `{"cachedAt": {"$gte": 1234567890}}` | Filter to fresh entries on query |
| `$exists` | `{"classifierVersion": {"$exists": true}}` | Validate metadata schema |
| `$eq` | `{"classifierVersion": {"$eq": "v2"}}` | Version-gated queries |
| `$and`/`$or` | Combine freshness + version filters | Compound filters |

### 3.3 No Native TTL
Pinecone **does not** support server-side TTL or auto-expiry. TTL must be implemented at the application layer by:
1. Storing a timestamp in metadata on write
2. Filtering by `$gte` (freshness) on query
3. Running periodic GC to delete expired entries

### 3.4 Vector Listing
Pinecone supports `list()` to enumerate vector IDs in a namespace (paginated). This enables batch processing of stale entries but should be used sparingly — listing large namespaces is expensive in read units.

### 3.5 Update
`update()` can modify metadata without re-indexing the vector. Useful for bumping `cachedAt` on cache refresh without recomputing embeddings.

---

## 4. Cache Invalidation Strategies — Comparison

| Strategy | Freshness | Hit Rate Impact | Latency Impact | Operational Cost | Complexity | Best For |
|----------|-----------|----------------|----------------|------------------|------------|----------|
| **TTL-based (timestamp filter)** | Moderate | ~80% hit rate preserved | +0ms (filter) | Periodic GC runs | Low | Rapidly evolving classifiers |
| **Version-based (metadata filter)** | High (exact) | Degrades on version bump | +0ms (filter) | One-time delete per version | Low | Infrequent retraining (weekly+) |
| **Write-through validation** | High | Reduces cache writes by ~30% | +2-5ms (heuristic) | Extra heuristic call per write | Medium | High-accuracy requirements |
| **Shadow reads** | Very high | ~50% hit rate | +10-50ms (parallel check) | 2x query cost per read | High | Mission-critical accuracy |
| **Probabilistic early expiry** | High | ~70% hit rate | +0ms | Recovers gradually | Low | Detecting distribution drift |
| **deleteAll + rebuild** | Complete | 0% (temporary) | High (cold start) | Wipe + re-classify all queries | Trivial | Emergency poisoned-cache fix |

### 4.1 TTL-Based Invalidation
**Mechanism**: Store `cachedAt` (epoch ms) in metadata. On query, filter `cachedAt >= {$gte: now - TTL}`. Periodically delete expired entries.

**Pinecone implementation**:
```typescript
// Read with TTL filter
const result = await target.query({
  vector: queryEmbedding,
  topK: 1,
  filter: { cachedAt: { $gte: Date.now() - TTL_MS }},
  includeMetadata: true,
});

// Periodic GC (cron job)
const cutoff = Date.now() - TTL_MS;
await target.deleteMany({ filter: { cachedAt: { $lt: cutoff }}});
```

**Trade-offs**:
- (+) Zero read-latency overhead
- (+) Simple to reason about
- (-) Can't distinguish between "correct old entry" and "incorrect old entry"
- (-) GC costs write units periodically
- (-) Hard threshold means abrupt cache drop at TTL boundary

### 4.2 Version-Based Invalidation
**Mechanism**: Store `classifierVersion` in metadata. Bump version on any classifier change. Use version filter on all queries.

**Implementation**:
```typescript
// Write
const metadata = { ...intent, classifierVersion: CURRENT_VERSION, ... };
await upsertChunks([{ id, values, metadata }], "intent-routing-cache");

// Read
const matches = await searchChunks(queryEmbedding, {
  topK: 1,
  namespace: "intent-routing-cache",
  filter: { classifierVersion: { $eq: CURRENT_VERSION }},
});
```

**Version bump script**:
```typescript
// On classifier update:
await target.deleteMany({
  filter: { classifierVersion: { $ne: CURRENT_VERSION }},
});
```

**Trade-offs**:
- (+) Guarantees cache coherence after retraining
- (+) Zero latency overhead
- (-) All cache entries invalidate on every version bump (cold cache)
- (-) Requires manual version tracking in deploy pipeline
- (-) Doesn't handle gradual distribution drift

### 4.3 Write-Through Validation
**Mechanism**: Before writing to Pinecone, run the heuristic classifier. If heuristic disagrees with the LLM result, skip caching (or cache with lower confidence).

**Implementation** (in `classifier.ts`):
```typescript
if (label) {
  const cat = label as IntentCategory;
  const heuristic = classifyByHeuristics(message);
  const disagree = heuristic && heuristic.confidence >= 0.7 && heuristic.intent !== cat;
  if (!disagree) {
    await setCachedPineconeIntent(embedding, message, cat);
  }
  // Always cache in-memory (faster eviction cycle)
  setCachedClassification(message, embedding, cat);
  return { intent: cat, confidence: disagree ? 0.7 : 0.85, stage: "llm", ... };
}
```

**Trade-offs**:
- (+) Prevents caching obviously wrong classifications
- (+) Improves overall accuracy (even on cache miss)
- (-) Adds ~2-5ms per LLM write
- (-) Heuristic might be wrong too
- (-) Reduces cache hit rate by ~10-30%

### 4.4 Shadow Reads
**Mechanism**: On every cache hit, also run the heuristic in parallel. If they disagree, re-classify via LLM, and update the cache.

**Implementation**:
```typescript
const [cached, heuristic] = await Promise.all([
  getCachedPineconeIntent(embedding),
  classifyByHeuristics(message),
]);

if (cached && heuristic && heuristic.confidence >= 0.7 && heuristic.intent !== cached) {
  // Cache hit disagrees with heuristic → stale cache
  return await classifyViaLLM(message, embedding);
}
```

**Trade-offs**:
- (+) Detects stale entries in real time
- (+) Self-healing — wrong entries get overwritten
- (-) 2x heuristic calls per cache hit
- (-) Adds ~5-50ms per query
- (-) Complexity in handling race conditions

### 4.5 Probabilistic Early Expiration
**Mechanism**: Randomly expire entries before their TTL with probability `p(age)`. Older entries are more likely to be re-evaluated.

**Implementation**:
```typescript
function shouldRevalidate(cachedAt: number, ttlMs: number): boolean {
  const age = Date.now() - cachedAt;
  const progress = age / ttlMs;
  if (progress >= 1) return true; // expired
  // Linear probability from 0 → 1 as age approaches TTL
  return Math.random() < progress * 0.5;
}
```

**Trade-offs**:
- (+) Smoothly refreshes cache without abrupt TTL wall
- (+) Naturally detects distribution drift (stale entries get re-checked)
- (-) Non-deterministic — same query might hit or miss
- (-) Harder to debug
- (-) ~5-10% extra LLM calls

---

## 5. Recommended Fixes (in order of urgency)

### 5.1 IMMEDIATE — Emergency Poisoned Cache Cleanup

**Problem**: If the current cache contains misclassifications (e.g., all queries routed to "HYBRID" due to a bug), it must be wiped immediately.

**Script**: `apps/web/scripts/clearIntentCache.ts`

```typescript
import { getPineconeClient, getIndexConfig } from "../src/server/config/pinecone";

async function clearIntentCache() {
  const pc = getPineconeClient();
  const { host, indexName } = getIndexConfig();
  const index = pc.index({ name: indexName, host });
  const ns = index.namespace("intent-routing-cache");

  console.log("[clearIntentCache] Deleting all vectors in namespace 'intent-routing-cache'...");
  await ns.deleteAll();
  console.log("[clearIntentCache] Done — namespace is now empty.");
}

clearIntentCache().catch((err) => {
  console.error("[clearIntentCache] Failed:", err);
  process.exit(1);
});
```

**Add to package.json**:
```json
{
  "scripts": {
    "clear-cache": "npx tsx scripts/clearIntentCache.ts"
  }
}
```

**Impact**: Hit rate drops to 0% temporarily, recovers over hours/days as queries are re-classified. **No stale results**. Run with `npm run clear-cache`.

### 5.2 SHORT-TERM — Add TTL to Pinecone Cache Reads

**File**: `apps/web/src/server/services/intentCacheService.ts`

**Changes needed**:

1. Add a TTL constant and a helper:

```typescript
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const INTENT_CACHE_NAMESPACE = "intent-routing-cache";

function isFresh(cachedAt: string): boolean {
  return Date.now() - new Date(cachedAt).getTime() < CACHE_TTL_MS;
}
```

2. In `getCachedPineconeIntent()`, check freshness after score pass:

```typescript
export async function getCachedPineconeIntent(
  queryEmbedding: number[]
): Promise<IntentCategory | null> {
  try {
    const matches = await searchChunks(queryEmbedding, {
      topK: 1,
      namespace: INTENT_CACHE_NAMESPACE,
    });

    if (matches.length === 0) return null;

    const topMatch = matches[0];
    if (topMatch.score >= 0.95) {
      const metadata = topMatch.metadata as unknown as CacheMetadata;
      // TTL CHECK — reject stale entries
      if (metadata && metadata.cachedAt && isFresh(metadata.cachedAt)) {
        if (metadata.intent) {
          return metadata.intent as IntentCategory;
        }
      }
    }
    return null;
  } catch (err) {
    console.error("[Cache] Failed to query Pinecone semantic cache:", err);
    return null;
  }
}
```

3. Add `isFresh` check to `setCachedPineconeIntent()` — don't cache UNKNOWN intents:

```typescript
if (intent === "UNKNOWN") return; // Never cache unknown
```

**Impact**:
- Hit rate: stays high for the TTL window (24h), then drops gradually
- Latency: +0ms (timestamp comparison is trivial)
- Operations: automatic — no cron needed
- **Accuracy**: stale entries older than TTL are ignored

### 5.3 MEDIUM-TERM — Heuristic Shadow Validation on Cache Hit

**File**: `apps/web/src/core/pipeline/classifier.ts`

Add heuristic cross-validation when a cache hit occurs:

```typescript
export async function classifyIntentFull(
  message: string,
  queryEmbedding?: number[]
): Promise<ClassificationResult> {
  const start = performance.now();

  if (!message || message.trim().length === 0) {
    return { intent: "HYBRID", confidence: 1.0, stage: "heuristic", latencyMs: perfDiff(start) };
  }

  const embedding = queryEmbedding || (await embed([message]))[0];

  // Tier 1: In-memory cache (fast)
  const cached = getCachedClassification(message, embedding);
  if (cached) {
    return { intent: cached, confidence: 0.95, stage: "cache", latencyMs: perfDiff(start) };
  }

  // Tier 2: Pinecone vector cache WITH shadow validation
  const pineconeCached = await getCachedPineconeIntent(embedding);
  if (pineconeCached) {
    const heuristic = classifyByHeuristics(message);
    const heuristicAgrees = !heuristic || heuristic.confidence < 0.7 || heuristic.intent === pineconeCached;

    if (heuristicAgrees) {
      setCachedClassification(message, embedding, pineconeCached as any);
      return { intent: pineconeCached, confidence: 0.95, stage: "cache", latencyMs: perfDiff(start) };
    }

    // Heuristic disagrees — cache is stale; fall through to re-classify
    console.log(`[Cache] Cache-heuristic mismatch: cache=${pineconeCached}, heuristic=${heuristic?.intent}. Re-classifying.`);
  }

  // Tier 3: Heuristic
  const heuristic = classifyByHeuristics(message);
  // ... existing heuristic logic ...
```

**Impact**:
- Hit rate: may drop ~10-20% depending on heuristic accuracy
- Latency: +2-5ms per cache hit (heuristic is regex, very fast)
- Accuracy: stale entries are detected and re-classified in real time
- Self-healing: wrong cache entries get overwritten

### 5.4 LONG-TERM — Versioned Self-Healing Cache System

**Architecture**:

1. **Version field** in `CacheMetadata`
2. **Write-through validation** — never cache if heuristic + LLM disagree
3. **Background GC cron** — delete expired + old-version entries
4. **Probabilistic early expiry** — random re-check near TTL boundary
5. **Monitoring** — track cache hit rate, freshness distribution

**Metadata evolution**:

```typescript
export interface CacheMetadata {
  // ... existing fields
  intent: "DATABASE" | "DOCUMENT" | "HYBRID" | "UNKNOWN";
  cachedAt: string;                       // ISO string
  classifierVersion: string;              // "1.0" | "1.1" | "2.0"
  heuristicConfidence: number;            // 0.0-1.0, 0 if written by LLM
  llmModel: string;                       // "deepseek/deepseek-v4-flash"
  source: "heuristic" | "llm";            // Who wrote this entry
}
```

**Write policy**:

```typescript
export async function setCachedPineconeIntent(
  queryEmbedding: number[],
  message: string,
  intent: IntentCategory,
  source: "heuristic" | "llm" = "llm",
  heuristicConfidence: number = 0
): Promise<void> {
  if (intent === "UNKNOWN") return;

  // Write-through validation: skip if heuristic strongly disagrees with LLM
  if (source === "llm") {
    const h = classifyByHeuristics(message);
    if (h && h.confidence >= 0.7 && h.intent !== intent) {
      console.log(`[Cache] Skipping cache write: heuristic=${h.intent} (${h.confidence}) vs llm=${intent}`);
      return;
    }
  }

  try {
    const cacheId = getUniqueId("cache");
    const isoString = new Date().toISOString();

    const metadata: CacheMetadata = {
      // ... existing metadata fields
      intent,
      cachedAt: isoString,
      classifierVersion: CURRENT_VERSION,
      heuristicConfidence,
      llmModel: "deepseek/deepseek-v4-flash",
      source,
    };

    await upsertChunks(
      [{ id: cacheId, values: queryEmbedding, metadata: metadata as any }],
      INTENT_CACHE_NAMESPACE
    );
  } catch (err) {
    console.error("[Cache] Failed to write to Pinecone semantic cache:", err);
  }
}
```

**GC cron job** (`scripts/cacheGc.ts`):

```typescript
async function runCacheGC() {
  const pc = getPineconeClient();
  const { host, indexName } = getIndexConfig();
  const index = pc.index({ name: indexName, host });
  const ns = index.namespace("intent-routing-cache");

  // Delete expired entries (older than TTL)
  const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();
  await ns.deleteMany({
    filter: { cachedAt: { $lt: cutoff } },
  });

  // Delete old-version entries
  await ns.deleteMany({
    filter: { classifierVersion: { $ne: CURRENT_VERSION } },
  });

  // Log stats
  const stats = await index.describeIndexStats();
  const nsStats = stats.namespaces?.[INTENT_CACHE_NAMESPACE];
  console.log(`[CacheGC] Remaining in 'intent-routing-cache': ${nsStats?.recordCount ?? 0} vectors`);
}
```

**Run via cron**:
```bash
# Run every 6 hours
0 */6 * * * cd /app && npx tsx scripts/cacheGc.ts
```

**Probabilistic early expiry** (in `getCachedPineconeIntent`):

```typescript
function shouldRevalidate(cachedAt: string): boolean {
  const age = Date.now() - new Date(cachedAt).getTime();
  const progress = age / CACHE_TTL_MS;
  // 5% chance to revalidate even for fresh entries at 50% TTL progress
  // Linearly increases to 50% at TTL boundary
  if (progress >= 1) return true;
  return Math.random() < progress * 0.1;
}

// In getCachedPineconeIntent, after score check:
if (isFresh(metadata.cachedAt)) {
  if (shouldRevalidate(metadata.cachedAt)) {
    // Return null to force re-classification
    console.log(`[Cache] Probabilistic revalidation triggered for ${cacheId}`);
    return null;
  }
  return metadata.intent as IntentCategory;
}
```

**Impact**:
- Hit rate: ~70-85% (slightly below TTL-only due to early expiry)
- Latency: +0ms (no extra network calls on the hot path)
- Accuracy: highest (stale entries detected on read + re-validated on write)
- Operations: requires cron setup for GC

---

## 6. Trade-off Analysis Summary

| Fix | Implementation Effort | Cache Hit Rate | Classification Accuracy | Operations Cost | Time to Ship |
|-----|----------------------|----------------|------------------------|----------------|-------------|
| Emergency clear | 15 min | 0% (temporary) | Max (no stale data) | $0 | Now |
| TTL on read | 1 hour | ~90% | High (24h window) | $0 | Today |
| Shadow validation | 2 hours | ~75% | Very high | +heuristic cost | This week |
| Version + TTL + GC | 4 hours | ~85% | Very high | +cron + GC WUs | This sprint |
| Full self-healing | 1-2 days | ~80% | Highest | +cron + monitoring | Next sprint |

### Cost Trade-off Notes

- **Pinecone Write Units (WU)**: Each cache write costs 1+ WU. Having a longer TTL reduces total writes but risks staleness.
- **Pinecone Read Units (RU)**: Cache query costs 1 RU. Shadow reads add a heuristic call (free, in-process) not an extra RU.
- **GC costs**: `deleteMany` with a filter costs proportional to number of matching vectors. Delete via `deleteAll()` is cheapest.
- **LLM costs**: Each cache miss triggers an LLM call (~$0.0005-$0.002 per call). A 90% hit rate on 10K queries/day saves ~$5-$20/day in LLM costs.

### Recommended Phased Rollout

```
Phase 0 (NOW):     Run emergency clear script → restore accuracy
Phase 1 (TODAY):   Add TTL check on read → stop new stale accumulation
Phase 2 (WEEK 1):  Add shadow validation → detect existing stale entries
Phase 3 (WEEK 2):  Add version field + GC cron → version-gated invalidation
Phase 4 (WEEK 3):  Probabilistic early expiry → drift detection
Phase 5 (ONGOING): Monitor hit rate / freshness / accuracy dashboards
```

---

## 7. Sources

- Pinecone Delete API: https://docs.pinecone.io/reference/api/data-plane/delete
- Pinecone Query API: https://docs.pinecone.io/reference/api/data-plane/query
- Pinecone Update API: https://docs.pinecone.io/reference/api/data-plane/update
- Pinecone Metadata Filtering: https://docs.pinecone.io/guides/search/filter-by-metadata
- Pinecone Indexing Overview: https://docs.pinecone.io/guides/index-data/indexing-overview
- Pinecone LLMs.txt (doc index): https://docs.pinecone.io/llms.txt
- Pinecone Production Checklist: https://docs.pinecone.io/guides/production/production-checklist
- In-memory cache (existing): `frontend/src/core/pipeline/classifierCache.ts`
- Pinecone cache service (existing): `frontend/src/server/services/intentCacheService.ts`
- Classifier pipeline (existing): `frontend/src/core/pipeline/classifier.ts`
- Heuristic classifier (existing): `frontend/src/core/pipeline/classifierHeuristics.ts`
- Pinecone config (existing): `frontend/src/server/config/pinecone.ts`
- Vector service (existing): `frontend/src/server/services/vectorService.ts`
