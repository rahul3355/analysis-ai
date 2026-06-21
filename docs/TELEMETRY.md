# Metrics & Telemetry Infrastructure

> Staff engineer analysis for Analysis AI observability.
> See also: [ARCHITECTURE.md](./ARCHITECTURE.md), [EVAL.md](./EVAL.md)

---

## 1. APM — Instrumenting the Orchestrator Pipeline

**Current state**: `console.time`/`console.log` with no trace context propagation.

### OpenTelemetry Span Hierarchy

```
chat.request (attrs: request_id, message_length, document_count, intent)
├── classify.intent (attrs: stage: cache|heuristic|llm|fallback, confidence, latency_ms)
├── embed (attrs: model, input_length, duration_ms)
├── doc.pipeline (duration: total doc RAG)
│   ├── vector.search (attrs: topK=40, namespace, filter, hit_count)
│   ├── rerank (attrs: candidates=40, topK=3, model, success)
│   └── doc.context.build (attrs: chunk_count, context_length)
├── bq.pipeline (duration: total BQ)
│   ├── semantic.cache.lookup (attrs: hit, similarity)
│   ├── bq.table_select (attrs: tables_selected)
│   ├── bq.sql_generate (attrs: model_name, attempt)
│   ├── bq.query_execute (attrs: bytes_processed, row_count, latency_ms)
│   └── semantic.cache.store
├── llm.generate (attrs: prompt_length, max_tokens, temperature, model)
│   ├── llm.stream_first_token (event)
│   └── llm.stream_complete (attrs: total_tokens, tokens_per_second)
└── citation.verify (attrs: failed_count, total_count, verdict)
```

### Key Latency Metrics (histograms)

```
chat_request_duration_ms{intent="DATABASE|DOCUMENT|HYBRID"}
pipeline_embed_duration_ms
vector_search_duration_ms{namespace}
rerank_duration_ms
bq_query_duration_ms{bq_success="true|false"}
llm_generation_duration_ms{model, stream="true"}
time_to_first_token_ms
total_pipeline_duration_ms{intent}
```

### Implementation Pattern

```typescript
// apps/web/src/lib/tracer.ts (NEW)
import { trace } from "@opentelemetry/api";
export const tracer = trace.getTracer("analysis-ai", "1.0");

// Usage in pipeline.ts:
export async function executeRagPipeline(input: PipelineInput) {
  return tracer.startActiveSpan("doc.pipeline", async (span) => {
    span.setAttribute("document_count", input.documentIds.length);
    const queryEmbedding = await embedAndTrace(input.message);
    const candidates = await vectorSearchTrace(queryEmbedding, { topK: 40 });
    const topChunks = await rerankAndTrace(input.message, candidates, 3);
    span.setAttribute("chunk_count", topChunks.length);
    span.end();
    return { context: buildContext(topChunks), chunks: topChunks };
  });
}
```

---

## 2. RUM — Client-Side for Chat Apps

### Web Vitals (secondary for internal tool)
- **TTFB**: Server response time (correlated with API route latency)
- **FCP/LCP**: Bundle size, JS parse time
- **CLS**: Watch sidebar collapse + SourcesBlock expand/collapse

### Chat-Specific Metrics (PRIMARY)

| Metric | Measurement Point | Implementation |
|--------|------------------|----------------|
| **Time to First Token (TTFT)** | `ChatView.tsx` SSE consumer | `performance.now()` at fetch → first `text_delta` event |
| **Tokens Per Second (TPS)** | `ChatView.tsx` | token_count / (time at done - time at first token) |
| **Perceived Latency** | `ChatView.tsx` | Submit click → first rendered character |
| **Stream Abandonment** | `ChatView.tsx` | User navigates away mid-stream |

### Client Implementation

```typescript
// In ChatView.tsx, around the fetch call:
const requestStart = performance.now();
let ttft: number | null = null;
let tokenCount = 0;

// On SSE event "text_delta":
if (ttft === null) {
  ttft = performance.now() - requestStart;
  recordMetric("chat.ttft", ttft);
}
tokenCount += delta.length;

// On SSE event "done":
const duration = (performance.now() - requestStart - ttft) / 1000;
recordMetric("chat.tps", tokenCount / duration);
```

---

## 3. Streaming Metrics

| Metric | Where | Implementation |
|--------|-------|----------------|
| Time to First Token | Client | See above |
| Tokens per Second | Client | See above |
| Total Streaming Duration | Server | `orchestrator.ts`: `llm.generate` span duration |
| Backpressure Events | Server | `chatService.ts:237`: measure gap between `reader.read()` calls |
| SSE Events Written | Server | Counter in `StreamEvent.write()` |
| Premature Close Rate | Server | `writer.closed === true` before `done()` |
| Chunk Size Distribution | Server | Histogram of `delta.length` |

### Alert Thresholds
- **P1**: TTFT > 5s
- **P2**: TPS average < 5 over 5 minutes
- **P2**: Streaming abort rate > 1%

---

## 4. External Service Monitoring

### Pinecone (`vectorService.ts`)

```
pinecone.query.duration_ms{operation="search", namespace}
pinecone.upsert.duration_ms
pinecone.error_count{error_type="timeout|rate_limit"}
pinecone.total_vector_count{namespace}
```

Alert: error rate > 1%, p95 latency > 500ms

### OpenRouter / LLM

```
openrouter.completions.duration_ms{model, stream="true|false"}
openrouter.embeddings.duration_ms{model}
openrouter.rerank.duration_ms{model}
openrouter.token_count{model, direction="input|output"}
openrouter.cost_usd{model, service="chat|embed|rerank|classify"}
openrouter.rate_limit_hits{service}
openrouter.error_count{status_code, service}
```

Alert: error rate > 5%, daily cost > threshold

### BigQuery (`bigqueryClient.ts`)

```
bigquery.query.duration_ms{dataset, table}
bigquery.bytes_processed{dataset}
bigquery.rows_returned
bigquery.cost_usd
bigquery.cache_hit{semantic="true|false"}
bigquery.error_count{code}
```

Alert: query failure rate > 5%, bytes_processed per query > 1GB

### R2 Storage (`storageClient.ts`)

```
r2.upload.duration_ms
r2.upload.size_bytes
r2.download_url_generated
r2.delete_count
r2.error_count
```

---

## 5. Custom Business Metrics

| Metric | Source | Type |
|--------|--------|------|
| `questions_asked_total` | orchestrator.ts entry | Counter |
| `questions_per_session` | Client session storage | Gauge |
| `sessions_total` | Client session start | Counter |
| `documents_uploaded_total` | documentService.ts:41 | Counter |
| `documents_deleted_total` | documentService.ts:156 | Counter |
| `citations_clicked_total` | SourcesBlock.tsx onClick | Counter |
| `citations_served_total{type="document"|"bigquery"}` | orchestrate() after LLM | Counter |
| `intent_distribution{intent}` | orchestrator.ts:171 | Counter |
| `intent_classification_stage{stage}` | orchestrator.ts:171 | Counter |
| `hallucination_gate_triggered` | verification.ts:131 verdict | Counter |
| `fallback_triggered{from="doc_to_bq"|"bq_to_doc"}` | orchestrator.ts:232,251 | Counter |
| `retry_count{service="llm"|"bq"|"embed"}` | Respective service | Histogram |
| `empty_response_total` | orchestrator.ts:298 | Counter |
| `streaming_aborted_total` | SSE reader cancel | Counter |
| `cache_hit_ratio{type="intent"|"sql"}` | Cache lookup | Gauge |
| `model_usage_count{model}` | chatService.ts | Counter |

---

## 6. Logging Strategy

### Current Problem
`console.log` scattered with inconsistent `[tag] prefix` format. No levels, no structured JSON, no sampling.

### Target Format

```typescript
interface LogEntry {
  timestamp: string;           // ISO 8601
  level: "debug" | "info" | "warn" | "error" | "fatal";
  service: "web";
  request_id: string;          // from getUniqueId("req")
  trace_id: string;            // from OpenTelemetry
  span_id: string;
  message: string;
  data?: Record<string, unknown>;
  error?: { name: string; message: string; stack?: string };
}
```

### Per-Stage Logging Plan

| Stage | Level | Key Data | Rate |
|-------|-------|----------|------|
| Request start | info | request_id, message_length, document_count | 1:1 |
| Intent class. | debug | intent, stage, confidence, latency_ms | 1:1 |
| Embedding | debug | model, input_length, duration_ms | 1:10 |
| Vector search | debug | topK, namespace, hits, dur_ms | 1:10 |
| Reranker | debug | model, candidates, success | 1:10 |
| BQ SQL gen | info | sql_hash, attempt, model | 1:1 |
| BQ query | info | sql_hash, bytes_processed, row_count | 1:1 |
| LLM gen | info | model, token_count, cost | 1:1 |
| Citation verify | info | total, failed, verdict | 1:1 |
| Error | error | full context | 1:1 |
| Hallucination gate | warn | reply_preview, failed/total | 1:1 |
| Rate limit | warn | service, retry_after | 1:1 |
| User message | debug | PII-sanitized | 1:100 |

### PII Sanitization

Strip before logging user messages:
- Email: `/\b[\w.-]+@[\w.-]+\.\w{2,}\b/g`
- Phone: `/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g`
- SSN: `/\b\d{3}-\d{2}-\d{4}\b/g`

### Log Sampling Implementation

```typescript
// apps/web/src/lib/logger.ts (NEW)
const SAMPLE_RATES: Record<string, number> = {
  debug_user_message: 0.01,  // 1%
  debug_pipeline: 0.1,        // 10%
  info_default: 1.0,          // 100%
};

function shouldSample(requestId: string, category: string): boolean {
  const rate = SAMPLE_RATES[category] ?? 1.0;
  const hash = hashString(requestId); // simple hash
  return (hash % 10000) / 10000 < rate;
}
```

---

## 7. Perceived Changes

### What Developers See

**Before**: "The app is slow." — SSH into server, grep logs, guess.
**After**: Open Datadog, find trace for request_id = "req_abc123":

```
chat.request (28.4s) ← P95 is usually 12s!
├── classify.intent (0.8s, llm)
├── doc.pipeline (1.2s)
│   ├── vector.search (0.4s, 40 hits)
│   └── rerank (0.8s)
├── bq.pipeline (3 × 8s = 24s) ← PROBLEM
│   ├── bq.sql_generate (8s, attempt 1/2, cohere/north-mini-code:free)
│   ├── bq.query_execute (5s, failed: syntax error)
│   ├── bq.sql_generate (8s, attempt 2/2, deepseek/deepseek-v4-flash)
│   └── bq.query_execute (3s, OK, 420 rows)
└── llm.generate (2.4s, 1200 tokens, 500 TPS)
```

You know immediately: BQ SQL generation retried on model failure, costing 24s. Fix: better error feedback to SQL generator.

### Dashboards

1. **Service Overview**: request rate, error rate, p50/p95/p99 latency
2. **Pipeline Deep Dive**: waterfall by intent
3. **LLM Cost Explorer**: cost by model/day/endpoint
4. **RAG Quality**: cache hit ratio, hallucination rate, fallback rate
5. **User Experience**: TTFT, TPS, questions/session
6. **External Dependencies**: Pinecone, BQ, OpenRouter health

### Alerts

| Priority | Condition | Channel |
|----------|-----------|---------|
| P1 | Error rate > 5% on `/api/chat` for 5 min | PagerDuty |
| P1 | TTFT > 10s for any request | PagerDuty |
| P1 | OpenRouter 401/403 | PagerDuty |
| P1 | BQ all queries failing > 5% | PagerDuty |
| P2 | Cache hit ratio < 50% | Slack |
| P2 | Daily LLM cost > $X | Slack |
| P2 | Hallucination rate > 10% | Slack |
| P2 | Pinecone p95 > 1s | Slack |
| Info | Rate limit events > 10/min | Slack |

---

## 8. 80/20 Route — Maximum Value per Effort

### Phase 1 (1-2 days) — 80% of value

1. **Structured JSON logging** in 5 critical files:
   - `chat/route.ts` (request start/end)
   - `orchestrator.ts` (pipeline stages, errors)
   - `pipeline.ts` (embed/search/rerank timing)
   - `chatService.ts` (LLM calls, retries, cost)
   - `bigqueryService.ts` (SQL gen, query execution)

   Replace all `console.log` with a `logger.ts` helper that outputs structured events.

2. **Performance.now() histograms** at 6 pipeline points. Output as metrics line to stdout: `METRIC pipeline_embed_duration_ms 203`.

3. **Client-side TTFT tracking**: 10 lines in `ChatView.tsx` fetch handler.

4. **OpenRouter cost tracking**: Parse response headers for model/token usage.

### Phase 2 (3-5 days) — Next 15%

5. **OpenTelemetry SDK init** with OTLP exporter (~30 lines).
6. **Manual spans** wrapping the orchestrator and its sub-stages.
7. **External service counters** for Pinecone, BQ, R2.
8. **Business metric counters** for intents, citations, fallbacks.

### Phase 3 (deferred) — Last 5%

- Full RUM with `web-vitals` library
- Session replay
- Custom investor dashboards
- Fine-grained token-level streaming metrics

---

## 9. Business Impact

### Reliability
- **Before**: Blind to production issues until users complain
- **After**: Pager alerts when pipeline degrades, traces pinpoint root cause in seconds

### Debugging Speed
- **Before**: Hours of SSH + grep through rotated logs
- **After**: Click one trace → see all spans with timing and error context

### Cost Optimization
- **Before**: "How much are we spending on OpenRouter?" — Unknown
- **After**: Cost dashboard shows $X/day per model. Discover that intent classification can use a free model. BQ cost tracking catches terabyte-scanning queries.

### Concrete Example
Your `bigqueryService.ts` tries 2 models × 2 attempts = up to 4 LLM calls per BQ query.
- 1,000 questions/day × 60% BQ intent = 600 BQ queries
- Without telemetry: you don't see this
- With telemetry: "attempt 1 succeeds at 85% → only 15% need expensive fallback"
- You tune the semantic cache threshold from 0.95 to 0.90: hit ratio jumps from 40% to 65%
- Cost drops 40% overnight

### Cost of NOT Having Telemetry
- Blind LLM spend ($100/mo vs $10,000/mo — you can't tell)
- Silent quality degradation (hallucination rate creeps up)
- No capacity planning
- Debugging by guesswork
- No SLA tracking for stakeholders
