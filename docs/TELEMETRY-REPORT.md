# System Performance & Infrastructure Telemetry Report — Analysis AI

**Author:** Werner V. (Principal Engineer, AWS — Observability & Distributed Systems)  
**Date:** 2026-06-19  
**Context:** Internal BI assistant for JD Sports UK. Next.js 16 + Vercel. Multi-step LLM pipeline. Zero current monitoring.

---

## Table of Contents

1. [The Four Golden Signals for AI Apps](#1-the-four-golden-signals-for-ai-apps)
2. [Instrumentation Strategy](#2-instrumentation-strategy)
3. [Cost Monitoring](#3-cost-monitoring)
4. [Dependency Monitoring](#4-dependency-monitoring)
5. [Dashboard Design](#5-dashboard-design)
6. [Alerting & On-Call](#6-alerting--on-call)
7. [Perceived Changes](#7-perceived-changes)
8. [Optimal Route (Recommended)](#8-optimal-route)
9. [Deep Examples](#9-deep-examples)
10. [Business Impact](#10-business-impact)

---

## 1. The Four Golden Signals for AI Apps

The Google SRE book's four golden signals (Latency, Traffic, Errors, Saturation) apply differently to LLM-powered apps vs. traditional web apps. The key difference: **LLM pipelines have high variance** — a single request can take 500ms or 30s depending on model load, context size, and token count. Traditional web apps are much more predictable.

### 1.1 Latency

**Pipeline breakdown** (expected ranges for a 6-step pipeline):

| Step | Service | P50 | P95 | P99 | Timeout |
|------|---------|-----|-----|-----|---------|
| Query expansion | OpenRouter (DeepSeek) | 500ms | 2s | 4s | 10s |
| Embedding | OpenRouter (text-embedding-3-small) | 300ms | 1s | 2s | 5s |
| Vector search | Pinecone | 50ms | 200ms | 500ms | 3s |
| Reranking | OpenRouter (rerank-4-fast) | 200ms | 800ms | 1.5s | 5s |
| LLM call | OpenRouter (DeepSeek) | 2s | 10s | 20s | 30s |
| Citation verification | OpenRouter (cheap model) | 500ms | 2s | 4s | 10s |
| **Total end-to-end** | | **3.5s** | **16s** | **32s** | **60s** |

**Why this differs from traditional web apps:**
- Traditional apps: p95 is usually 2-3x p50. Here, p95 is 5-10x p50 because LLM inference queues vary wildly.
- The LLM step alone dominates the pipeline (60-70% of total latency).
- Network latency to Pinecone/BQ is negligible vs. inference time.

**What to measure:**
- Per-step duration (histogram with buckets: 0.1, 0.5, 1, 2, 5, 10, 20, 30, 60)
- End-to-end request duration
- Time to first token (TTFT) — crucial metric for perceived responsiveness
- Token generation rate (tokens/second) — if streaming
- Queuing delay (time between request arrival and processing start)
- Step timeout rate (how often does each step hit its timeout?)

### 1.2 Traffic

| Metric | Expected (small team) | Growth trigger |
|--------|----------------------|----------------|
| Requests/minute | 1-10 | Team scaling, feature launch |
| Conversations/hour | 10-50 | Power users, integrations |
| Documents uploaded/day | 5-50 | Batch uploads, new contracts |
| Total users (concurrent) | 1-10 | Org-wide rollout |
| Tokens consumed/hour | 100K-1M | Heavy analysis workloads |
| Pinecone queries/hour | 100-1000 | Document retrieval patterns |
| BQ queries/hour | 10-100 | Analytics-heavy conversations |

**What to track:**
- RPM (requests per minute) by user
- RPM by pipeline type (chat vs. document analysis vs. query)
- Active conversations (concurrent sessions)
- Document throughput (uploads/minute, pages processed/minute)
- Token throughput (input tokens, output tokens, embedding tokens)

### 1.3 Errors

**Error categories and thresholds:**

| Error Type | Source | Impact | Expected frequency |
|-----------|--------|--------|-------------------|
| HTTP 429 Rate Limited | OpenRouter, Pinecone | Request retried or failed | Daily during peaks |
| HTTP 500 Internal | OpenRouter, Pinecone | Request failed | < 1% of requests |
| HTTP 503 Unavailable | OpenRouter, Pinecone | Brief outage | < 0.1% |
| Step timeout | Orchestrator | Partial response | < 2% |
| Citation verification failure | LLM check | Bad citation flagged | 5-15% of responses |
| Fallback triggered | Orchestrator | Degraded quality | < 5% |
| BQ query timeout | BigQuery | No analytics | < 1% |
| Pinecone connection error | Network | No RAG context | < 0.5% |

**How AI apps differ from traditional apps:**
- **429s are not treated as errors** — they're saturation signals. Traditional apps rarely see 429s because they control capacity. AI apps are at the mercy of API rate limits.
- **500s from LLM providers are normal** — OpenRouter's reliability is not AWS-level. Expect periodic blips.
- **Semantic errors** (hallucinations, bad citations) are a new category that doesn't exist in traditional apps. These need separate tracking via user feedback.

**What to alert on:**
- Error rate > 5% of total requests (any 5xx or timeout)
- 429 rate exceeding exponential backoff capacity (retries failing)
- Citation verification failure rate > 20% (indicates model degradation)
- Fallback trigger rate > 20% (indicates primary dependency issues)

### 1.4 Saturation

| Resource | Limit | Measurement | Warning threshold |
|----------|-------|-------------|-------------------|
| OpenRouter RPM | Model-dependent | Current RPM / limit | > 70% |
| OpenRouter TPM | Model-dependent | Current TPM / limit | > 70% |
| Pinecone query RU/s | 2,000 RU/s per index | Read unit consumption | > 1,500 RU/s |
| Pinecone QPS | 100 QPS per namespace | Query count per sec | > 70 QPS |
| Pinecone monthly RU | Plan-dependent | Cumulative usage | > 80% of monthly cap |
| BQ slots | Reservation-dependent | Slot usage | > 80% of reservation |
| BQ concurrent queries | 100 default | Active queries | > 50 |
| R2 bandwidth | Unlimited (pay per GB) | GB/hour | No hard limit, cost-based |
| R2 storage | Unlimited | GB stored | Cost-based alert |
| Vercel function duration | 10s default (paid: 60s) | Function duration | > 8s (Hobby), > 50s (Pro) |
| Vercel concurrent executions | 10 default | Active invocations | > 7 |

**How AI apps differ:**
- **Saturation ≠ Errors.** 200 OK with 30s latency is saturated. Traditional apps tend to fail hard; AI apps degrade gradually.
- **Token budgets** are a new saturation dimension. Pinecone charges by read units, not just QPS. You can be under QPS cap but over monthly RU budget.
- **Metered pricing** (OpenRouter, Pinecone RU) means saturation = cost explosion. Need cost-aware saturation alerts.

---

## 2. Instrumentation Strategy

### 2.1 OpenTelemetry — Do You Really Need It?

**Short answer: Yes, but only for traces and a few custom metrics. Skip logs in OTel for now.**

For an internal tool with 1-10 users, full OpenTelemetry deployment (collector, exporter, backend) is overkill. Here's the pragmatic split:

| Signal | Use OTel? | Why |
|--------|-----------|-----|
| **Traces** | **Yes** | Manual spans in orchestrator.ts are the only way to get per-step latency breakdowns. OTel trace context propagates naturally across async boundaries. |
| **Metrics** | **Partial** | Use OTel for custom pipeline metrics (Histogram for step duration, Counter for errors). Export to Prometheus or directly to Grafana Cloud via OTel metrics exporter. |
| **Logs** | **No** | Stick with structured JSON logging to stdout (Vercel captures it). OTel logging SDK for JS is still immature. Don't complicate your stack. |

**Recommended packages:**

```json
{
  "@opentelemetry/api": "^1.9",
  "@opentelemetry/sdk-node": "^0.57",
  "@opentelemetry/auto-instrumentations-node": "^0.57",
  "@opentelemetry/exporter-trace-otlp-http": "^0.57",
  "@opentelemetry/exporter-metrics-otlp-http": "^0.57"
}
```

### 2.2 Structured Logging vs Metrics vs Traces — What to Use for What

| Concern | Use | Example |
|---------|-----|---------|
| "Is the app up?" | Uptime check (Pingdom, Better Uptime) | HTTP 200 check on /api/health |
| "How slow is it?" | Metrics (Histogram) | `pipeline_step_duration_ms{step="llm_call"}` |
| "Which request is slow?" | Traces | Trace ID `abc123` shows each step's duration |
| "Why did it fail?" | Logs | `{ "error": "OpenRouter 429", "trace_id": "abc123", "retry_count": 3 }` |
| "How much does it cost?" | Metrics + Logs | Track token counts per model, minutes of BQ slot time |
| "Which user is affected?" | Logs | Include `user_id` in every structured log entry |
| "How many 429s today?" | Metrics (Counter) | `openrouter_rate_limits_total{model="deepseek"}` |
| "Trace a specific conversation" | Traces + Logs | Filter by `conversation_id` attribute |

**Rule of thumb:**
- **Metrics** answer "what's happening right now?" (dashboards, alerts)
- **Logs** answer "what happened to this specific request?" (debugging)
- **Traces** answer "why was this request slow?" (performance analysis)

### 2.3 Log Aggregation

For an internal tool, evaluate tradeoffs:

| Option | Cost | Setup time | Retention | Search | Verdict |
|--------|------|------------|-----------|--------|---------|
| Vercel Logs (built-in) | Free with plan | 0 | 3 days (Pro: 14) | Basic | Good enough for MVP |
| Grafana Cloud Logs (Loki) | Free tier: 50GB | 1 hour | 14 days | Great | **Best option** |
| Self-hosted Loki | Vercel hosting cost | 1 day | Unlimited | Great | Overkill for now |
| Datadog | ~$15/host/month | 30 min | 15 days | Excellent | Overkill for 1-10 users |
| Axiom | Free tier: 500GB/month | 10 min | 30 days | Great | Good alternative |
| BQ-based log storage | ~$5/TB scanned | 2 hours | Unlimited | Good SQL search | Novel but powerful |

**Recommendation:** Grafana Cloud Free Tier (50GB logs, 10k series metrics, 5000 traces/hour). Deploy the Grafana Faro agent or use a simple OTLP exporter. Then pair with a Grafana dashboard (see §5).

### 2.4 Metrics

**Prometheus exposition format** (expose via `/metrics` endpoint on the Next.js app):

```prometheus
# HELP pipeline_step_duration_ms Duration of each pipeline step
# TYPE pipeline_step_duration_ms histogram
pipeline_step_duration_ms_bucket{step="query_expansion",le="500"} 120
pipeline_step_duration_ms_bucket{step="query_expansion",le="1000"} 145
pipeline_step_duration_ms_bucket{step="query_expansion",le="2000"} 149
pipeline_step_duration_ms_bucket{step="query_expansion",le="5000"} 150
pipeline_step_duration_ms_bucket{step="query_expansion",le="+Inf"} 150
pipeline_step_duration_ms_count{step="query_expansion"} 150
pipeline_step_duration_ms_sum{step="query_expansion"} 45200

# HELP openrouter_tokens_total Total tokens consumed per model
# TYPE openrouter_tokens_total counter
openrouter_tokens_total{model="deepseek-v4-flash",type="input"} 1500000
openrouter_tokens_total{model="deepseek-v4-flash",type="output"} 450000
openrouter_tokens_total{model="text-embedding-3-small",type="input"} 800000

# HELP pinecone_read_units_total Cumulative read units consumed
# TYPE pinecone_read_units_total counter
pinecone_read_units_total{index="contracts"} 25000

# HELP pipeline_errors_total Error count by error type
# TYPE pipeline_errors_total counter
pipeline_errors_total{error="rate_limit",step="llm_call"} 45
pipeline_errors_total{error="timeout",step="vector_search"} 3
pipeline_errors_total{error="verification_failed",step="citation"} 12
```

### 2.5 Tracing — OpenTelemetry Auto + Manual

**Auto-instrumentation catches:**
- HTTP request/response lifecycle (Next.js API routes)
- External HTTP calls (fetch to OpenRouter, Pinecone, BQ)
- Node.js event loop metrics

**Manual instrumentation needed for:**
- Pipeline step boundaries (wrapping each step in a span)
- Semantic attributes (`conversation_id`, `user_id`, `document_id`)
- Error attribution (which step caused the failure)
- Token counts (as span attributes for cost analysis)

---

## 3. Cost Monitoring

### 3.1 OpenRouter Cost Breakdown

| Model | Input cost | Output cost | Expected usage/day | Daily cost |
|-------|-----------|------------|-------------------|------------|
| DeepSeek v4 Flash | ~$0.15/M input tokens | ~$0.60/M output tokens | 200K input, 50K output | ~$0.06 |
| text-embedding-3-small | ~$0.02/M tokens | N/A (embedding) | 100K tokens | ~$0.002 |
| rerank-4-fast | ~$0.50/M documents | N/A | 500 documents | ~$0.25 |
| **Total daily** | | | | **~$0.31** |

**Track per conversation.** Tag every OpenRouter API call with `conversation_id` so you can query: "Which conversation cost $5 today?"

### 3.2 Pinecone Cost

- Serverless: $0.102 per million read units + $0.348 per million write units
- Storage: ~$0.126/GB/month
- Estimate for 100K vectors at 1536 dimensions: ~$30-50/month on Standard plan

**Key cost driver:** Query read units. Each vector search consumes RU based on `top_k` and namespace size. A search returning 10 results on a 10K-document namespace costs ~50-100 RU. On a 1M-document namespace: ~500-1000 RU.

### 3.3 BigQuery Cost

- On-demand: $6.25/TB processed (for queries), $0.02/GB/month (storage)
- Flat-rate: Slot commitments vary by region ($1-2/slot/month for 100 slots)
- Each AI user query typically scans 100MB-1GB

**Cost optimization for BQ:**
- Use clustered/partitioned tables (date-partition by month, cluster by department)
- Limit scanned data with WHERE clauses on partition columns
- Cache frequent query results (BI Engine or materialized views)
- Add a `query_cost_bytes` metric to see which queries cost the most

### 3.4 R2 Cost

- $0.015/GB/month storage
- $0.009/GB egress (to internet)
- Free egress to Cloudflare Workers/Pages
- Document storage at scale: 10GB of PDFs = $0.15/month. Negligible.

### 3.5 Cost Allocation Strategy

```sql
-- BigQuery-based cost analysis
SELECT
  conversation_id,
  SUM(CASE WHEN service = 'openrouter' AND model = 'deepseek-v4-flash'
    THEN (input_tokens * 0.15e-6 + output_tokens * 0.60e-6) END) AS openrouter_cost,
  SUM(CASE WHEN service = 'pinecone' THEN read_units * 0.102e-6 END) AS pinecone_cost,
  SUM(CASE WHEN service = 'bigquery' THEN bytes_processed * 6.25 / 1e12 END) AS bq_cost,
  COUNT(*) AS request_count
FROM telemetry.cost_events
WHERE DATE(timestamp) = CURRENT_DATE()
GROUP BY conversation_id
ORDER BY openrouter_cost DESC
LIMIT 10;
```

**What to track:**
- Cost per conversation
- Cost per user (weekly/monthly)
- Cost per feature (chat vs. document analysis vs. query)
- Cost trend (week-over-week, month-over-month)
- Cost anomalies (a single conversation that cost 10x normal)

---

## 4. Dependency Monitoring

### 4.1 Health Checks

Each dependency should have a lightweight health check:

```typescript
interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  lastChecked: string;
  error?: string;
}

// Example: Pinecone health check
async function checkPinecone(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const stats = await pinecone.describeIndexStats({ indexName: 'contracts' });
    return {
      service: 'pinecone',
      status: stats.status?.ready ? 'healthy' : 'degraded',
      latency: Date.now() - start,
      lastChecked: new Date().toISOString(),
    };
  } catch (err) {
    const latency = Date.now() - start;
    return {
      service: 'pinecone',
      status: latency > 2000 ? 'degraded' : 'down',
      latency,
      lastChecked: new Date().toISOString(),
      error: (err as Error).message,
    };
  }
}
```

Run health checks every 30 seconds from a lightweight endpoint (`/api/health`).

### 4.2 Circuit Breaker Implementation

**Pattern:** For each external dependency, wrap calls in a circuit breaker with three states:

```
CLOSED (normal) → OPEN (failing) → HALF-OPEN (testing) → CLOSED (recovered)
```

**Implementation for Pinecone:**

```typescript
class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly threshold = 5;       // failures before OPEN
  private readonly cooldownMs = 30_000; // wait before HALF_OPEN

  async call<T>(fn: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.cooldownMs) {
        this.state = 'HALF_OPEN';
      } else {
        logWarning('Circuit breaker OPEN for Pinecone, using fallback');
        return fallback();
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failureCount = 0;
      }
      return result;
    } catch (err) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      if (this.failureCount >= this.threshold || this.state === 'HALF_OPEN') {
        this.state = 'OPEN';
        logError('Circuit breaker OPENED for Pinecone', err);
      }
      return fallback();
    }
  }
}
```

**Fallback behaviors by dependency:**

| Dependency | Fallback | Quality impact |
|-----------|----------|---------------|
| Pinecone | Skip vector search, use BQ data only | Less relevant context |
| OpenRouter (LLM) | Use cached response or show error | Cannot answer |
| OpenRouter (embedding) | Use BQ embedding model or skip | No RAG |
| OpenRouter (reranking) | Skip reranking, use raw vector results | Lower result quality |
| BigQuery | Show cached analytics or error message | No data-driven answers |
| R2 | Show "document unavailable" | Cannot show document text |

### 4.3 Degraded Mode

When one or more dependencies fail, the app should:

1. **Detect automatically** via health check + circuit breaker
2. **Log a degraded-mode event** with the severity level
3. **Return a response with a warning header** `X-Degraded-Mode: true`
4. **Show the user a non-blocking banner:** "Search is limited — vector search unavailable. Results based on warehouse data only."
5. **Self-recover** when the circuit breaker transitions to HALF_OPEN and back to CLOSED

### 4.4 Timeout Budgets

Set cascading timeouts per step. Each step has a timeout; the sum of timeouts should be less than the total request timeout (60s).

```typescript
const PIPELINE_TIMEOUTS = {
  queryExpansion: 10_000,   // ms
  embedding: 5_000,
  vectorSearch: 3_000,
  reranking: 5_000,
  llmCall: 30_000,
  citationVerification: 10_000,
  buffer: 2_000,             // internal processing
  // Total: 65_000ms — but we'll enforce total < 60s
} as const;
```

**Implementation:** Use `Promise.race` with a timeout per step. If a step times out, log it, increment timeout counter, and either retry once or skip to fallback.

---

## 5. Dashboard Design

### 5.1 Level 1 — Office TV Dashboard ("Green/Red")

**Purpose:** At-a-glance system health. Visible on a 55" TV in the JD Sports UK office.

**Layout (6 panels, auto-refresh every 30s):**

```
┌─────────────────────────────────────────────────────────────┐
│  ANALYSIS AI — SYSTEM HEALTH                   [19 Jun 2026] │
├──────────────────┬──────────────────┬────────────────────────┤
│  UPTIME          │  ERROR RATE      │  RESPONSE TIME        │
│  ┌──────────────┐│  ┌──────────────┐│  ┌──────────────────┐ │
│  │  99.8%       ││  │  < 0.5%      ││  │  P50: 2.1s       │ │
│  │  Last 7 days  ││  │  Last hour   ││  │  P95: 8.3s       │ │
│  └──────────────┘│  └──────────────┘│  └──────────────────┘ │
├──────────────────┼──────────────────┼────────────────────────┤
│  OPENROUTER      │  PINECONE        │  BIGQUERY             │
│  ┌──────────────┐│  ┌──────────────┐│  ┌──────────────────┐ │
│  │  ● Healthy   ││  │  ● Healthy   ││  │  ● Healthy       │ │
│  │  1.2s avg    ││  │  45ms avg    ││  │  2.8s avg        │ │
│  └──────────────┘│  └──────────────┘│  └──────────────────┘ │
└──────────────────┴──────────────────┴────────────────────────┘
```

**Status indicators:**
- 🟢 All green: P95 < 10s, error rate < 2%, all dependencies healthy
- 🟡 Yellow: P95 > 15s, error rate 2-5%, one dependency degraded
- 🔴 Red: P95 > 25s, error rate > 5%, any dependency down, or total outage

### 5.2 Level 2 — On-Call Engineer Dashboard

**Purpose:** Detailed views for an engineer debugging an active issue. Grafana dashboard with ~15 panels.

**Row 1: Request Volume & Health**
- Requests per minute (bar chart, stacked by status: success/error/timeout)
- Active conversations (gauge)
- End-to-end latency heatmap (P50/P95/P99 over time, 6h window)

**Row 2: Pipeline Breakdown**
- Step duration by percentile (table, one row per step: P50, P95, P99, count)
- Step success rate (bar chart, one bar per step)
- Timeout rate per step (single stat with sparkline)

**Row 3: Dependencies**
- OpenRouter API latency (timeseries, colored by model)
- Pinecone query latency + read unit consumption (dual-axis chart)
- BQ slot utilization (if using flat-rate) or bytes scanned (if on-demand)
- R2 bandwidth (area chart, last 24h)

**Row 4: Errors**
- Error rate by type (pie chart: 429, 500, 503, timeout, verification failure)
- Top error messages (table, sorted by count, last 1h)
- Degraded mode events (log panel, last 50 events)

**Row 5: Cost**
- OpenRouter cost per model (stacked bar, last 7 days)
- Cost per top user/conversation (table)
- Daily cost trend (line chart)

### 5.3 Level 3 — Per-Request Trace Search

**Purpose:** Deep debugging. "Why did this specific request take 45 seconds?"

**Implementation:** OTel trace explorer (Grafana Tempo or Jaeger UI).

**Search fields:**
- `trace_id` (direct link from log entries)
- `conversation_id`
- `user_id`
- `http.method` + `http.route`
- Duration range (e.g., `> 20s`)
- Error flag

**Span details (for each trace):**

```
Trace: 3f8a1b2c... (45.2s)
├── HTTP POST /api/chat (45.2s) [root]
│   ├── query_expansion (2.1s)
│   │   └── openrouter.chat (2.1s)
│   │       ├── request: 200ms
│   │       ├── inference: 1.8s
│   │       └── tokens: input=450, output=120
│   ├── embedding (0.8s)
│   │   └── openrouter.embed (0.8s)
│   │       └── tokens: input=450
│   ├── vector_search (0.045s) ✓
│   ├── reranking (1.2s)
│   │   └── openrouter.rerank (1.2s)
│   ├── llm_call (38.0s) ← SLOW
│   │   └── openrouter.chat (38.0s)
│   │       ├── request: 500ms
│   │       ├── queuing: 12.3s  ← BOTTLENECK
│   │       ├── inference: 24.8s
│   │       └── response: 400ms
│   └── citation_verification (3.0s)
│       └── openrouter.chat (3.0s)
```

**Key insight from the trace:** The queuing time (12.3s) indicates OpenRouter's DeepSeek v4 Flash endpoint was under load. The inference time (24.8s) was high due to large context (document text + conversation history). This trace alone tells you to either (a) reduce context size, (b) switch to a less busy model, or (c) add a queuing timeout.

---

## 6. Alerting & On-Call

### 6.1 What to Alert On (and What Not To)

**ALERT on — P0 (Page immediately, 24/7):**
1. **System down for all users:** P95 latency > 30s for 5 consecutive minutes
2. **Complete dependency failure:** Any critical dependency (OpenRouter, Pinecone, BQ) returns 0% success rate for 2 minutes
3. **Error rate > 10%** of total requests (not 429s) for 5 minutes
4. **No requests at all** for 15 minutes during business hours (might be deployment broken)

**ALERT on — P1 (Page during business hours):**
5. **P95 latency > 15s** for 10 minutes (degraded UX)
6. **Error rate > 5%** for 10 minutes
7. **Any single dependency error rate > 10%** for 5 minutes
8. **Pinecone monthly RU > 80%** (risk of hitting cap)
9. **OpenRouter cost spike > 2x daily average**

**ALERT on — P2 (Slack notification, no page):**
10. **P95 latency > 10s** for 15 minutes
11. **Pinecone read unit consumption > 70% of monthly cap**
12. **BQ bytes scanned > 2x daily average** (cost anomaly)
13. **Degraded mode activated** (any dependency circuit breaker OPEN)
14. **Citation verification failure rate > 20%** for 1 hour

**DO NOT alert on:**
- Single 429 errors (they self-recover with exponential backoff)
- Single timeout errors (unless cascading)
- Latency spikes under 2 minutes (auto-scaling causes brief spikes)
- Low traffic periods (nights, weekends for internal tool — expected)
- Cost increases under $10/day (noise)

### 6.2 Alert Severity Summary

| Severity | Response time | Channel | Example |
|----------|--------------|---------|---------|
| P0 | < 5 min | Page (PagerDuty/OpsGenie) + Slack | System down |
| P1 | < 15 min (business hours) | Page + Slack | Degraded performance |
| P2 | < 1 hour | Slack only | Cost anomaly |

### 6.3 Runbook Links

Every alert must include a direct link to a runbook:

```
Alert: P95 Latency > 30s
Runbook: https://github.com/jd-sports/analysis-ai/wiki/Runbooks/high-latency
Actions:
  1. Check L2 dashboard: https://grafana.jd-sports.com/d/pipeline-health
  2. Check OpenRouter status: https://status.openrouter.ai
  3. Check recent deploys: https://vercel.com/jd-sports/analysis-ai/deployments
  4. If OpenRouter down: no action (wait for recovery)
  5. If code regression: rollback to last known good deploy
```

### 6.4 On-Call Rotation

For an internal tool with 1-10 users:
- No dedicated on-call. First week: the developer who built it.
- After that: Slack alerts to a team channel. Respond within 1 business hour.
- If the tool is business-critical (e.g., buyer analytics for JD Sports contracts), then a voluntary rotation among 2-3 engineers.
- "Follow the sun" if the team is distributed.

---

## 7. Perceived Changes

What would the Analysis AI team **notice** after implementing this telemetry:

1. **More log output** — structured JSON instead of `console.log`. Each request produces ~20-30 lines (one per pipeline step). ~100-300 lines/minute. Negligible.

2. **New dashboard** — someone sets up a monitor in the office. Team starts checking it habitually. Within a week, they catch a Pinecone outage before users complain.

3. **Occasional alert noise** — first week: too many alerts. Tune thresholds. By week 2: one or two actionable alerts per day.

4. **Slightly more verbose stack traces** — OTel adds context to error logs (trace ID, span ID). Very helpful for debugging. Slightly larger log payloads.

5. **Cost visibility** — "Oh, that conversation where someone asked to analyze 500 contracts cost $12 in LLM tokens." Team starts building cost awareness.

6. **Slower cold starts** — OTel SDK adds ~200-500ms to cold start on Vercel serverless functions. Mitigation: use Vercel's `functions` config to keep 1-2 instances warm.

7. **New dependency** — OTel exporter telemetry itself needs to be monitored. "Who watches the watchers?" A simple cron job that pings the OTLP endpoint.

8. **Developer friction** — first deployment with OTel might fail (ESM import issues, span processor crashes). Allocate 2-3 hours for debugging.

---

## 8. Optimal Route (Recommended)

For an internal tool at JD Sports UK, here is the **minimum viable observability** that delivers 80% of the value at 20% of the effort:

### Phase 1: This Week (2 hours)

1. **Add structured JSON logging** to orchestrator.ts. Every step logs a JSON line with `trace_id`, `step`, `duration_ms`, `status`, `error` (if any). See §9.1.

2. **Add a `/api/health` endpoint** that checks all four dependencies (OpenRouter, Pinecone, BQ, R2). Return HTTP 200 if all healthy, 503 if any critical dependency is down.

3. **Set up Grafana Cloud free tier** (5 minutes, free):
   - Sign up at grafana.com
   - Create a Loki log source
   - Create a Prometheus metrics source
   - Generate an API key

4. **Expose Prometheus metrics** at `/api/metrics` (or use OpenTelemetry SDK to push metrics via OTLP). Track at minimum:
   - `pipeline_step_duration_ms` (histogram)
   - `pipeline_errors_total` (counter) with `error` and `step` labels
   - `pipeline_requests_total` (counter) with `status` label

5. **Create one dashboard** (§5.2, Level 2). Share with the team.

### Phase 2: Next Sprint (1 day)

6. **Add OpenTelemetry manual tracing** to orchestrator.ts. Each pipeline step gets a child span. Export via OTLP to Grafana Tempo.

7. **Implement cost tracking** — log token counts per model, BQ bytes scanned, Pinecone RU consumed to a BigQuery table. Query once a day for a cost report.

8. **Add three alerts** (§6.1, P0 items 1-3).

9. **Write runbook** for the top 3 failure modes (Pinecone down, OpenRouter throttling, BQ timeout).

### Phase 3: When You Need It (1 day)

10. **Circuit breaker** for Pinecone (§4.2).

11. **Degraded mode UI** — a banner that tells users "Search results may be limited."

12. **Per-conversation cost view** — simple BigQuery query that the team runs when needed.

### What NOT to do (yet):

- ❌ Self-hosted Prometheus (use Grafana Cloud's managed Prometheus)
- ❌ Self-hosted Loki (use Grafana Cloud's managed Loki)
- ❌ Jaeger/Zipkin (use Grafana Tempo via OTLP)
- ❌ Full tracing of every request (sample 10% of requests, 100% of failed/slow ones)
- ❌ Complex aggregation pipelines (Spark, Flink, Kafka)
- ❌ Real user monitoring (RUM) for browser performance (internal tool, users will tell you)
- ❌ Anomaly detection ML — too many false positives for a small-scale system

---

## 9. Deep Examples

### 9.1 Structured Log Entry with Full Pipeline Trace

```json
{
  "timestamp": "2026-06-19T14:23:11.452Z",
  "level": "info",
  "service": "analysis-ai",
  "trace_id": "3f8a1b2c9d0e4f5a",
  "span_id": "a1b2c3d4",
  "conversation_id": "conv_7e9a2b",
  "user_id": "rahul.singh@jd-sports.co.uk",
  "step": "pipeline_complete",
  "duration_ms": 8512,
  "status": "success",
  "steps": [
    {
      "name": "query_expansion",
      "duration_ms": 1234,
      "status": "success",
      "input_tokens": 85,
      "output_tokens": 210,
      "model": "deepseek-v4-flash"
    },
    {
      "name": "embedding",
      "duration_ms": 456,
      "status": "success",
      "input_tokens": 210,
      "model": "text-embedding-3-small"
    },
    {
      "name": "vector_search",
      "duration_ms": 87,
      "status": "success",
      "top_k": 20,
      "results_count": 20,
      "read_units": 150
    },
    {
      "name": "reranking",
      "duration_ms": 890,
      "status": "success",
      "documents_count": 20,
      "model": "rerank-4-fast"
    },
    {
      "name": "llm_call",
      "duration_ms": 5120,
      "status": "success",
      "input_tokens": 4580,
      "output_tokens": 420,
      "model": "deepseek-v4-flash",
      "time_to_first_token_ms": 1800,
      "queuing_ms": 210
    },
    {
      "name": "citation_verification",
      "duration_ms": 725,
      "status": "success",
      "citations_checked": 3,
      "citations_passed": 3
    }
  ],
  "source_documents": [
    {
      "document_id": "doc_42",
      "relevance_score": 0.94
    },
    {
      "document_id": "doc_17",
      "relevance_score": 0.87
    }
  ],
  "bigquery": {
    "queries_executed": 2,
    "bytes_processed": 245000000,
    "slot_ms": 3400,
    "tables_queried": ["jd_sports.contracts.active", "jd_sports.suppliers.current"]
  }
}
```

### 9.2 Prometheus Metric Definition for Pipeline Latency

```typescript
// frontend/src/server/services/pipeline-metrics.ts
import { Meter } from '@opentelemetry/api';

export class PipelineMetrics {
  private stepDuration: Histogram;
  private stepErrors: Counter;
  private stepTimeouts: Counter;
  private tokenCount: Counter;

  constructor(meter: Meter) {
    this.stepDuration = meter.createHistogram('pipeline_step_duration_ms', {
      description: 'Duration of each pipeline step',
      unit: 'ms',
      advice: {
        explicitBucketBoundaries: [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 30000, 60000],
      },
    });

    this.stepErrors = meter.createCounter('pipeline_errors_total', {
      description: 'Total errors by pipeline step and error type',
    });

    this.stepTimeouts = meter.createCounter('pipeline_timeouts_total', {
      description: 'Total timeouts by pipeline step',
    });

    this.tokenCount = meter.createCounter('pipeline_tokens_total', {
      description: 'Total tokens consumed per model',
    });
  }

  recordStepDuration(step: string, durationMs: number, status: string) {
    this.stepDuration.record(durationMs, {
      step,
      status,
    });
  }

  recordError(step: string, errorType: string) {
    this.stepErrors.add(1, { step, error_type: errorType });
  }

  recordTimeout(step: string) {
    this.stepTimeouts.add(1, { step });
  }

  recordTokens(model: string, tokenType: string, count: number) {
    this.tokenCount.add(count, { model, type: tokenType });
  }
}
```

### 9.3 Grafana Dashboard JSON Structure

A Grafana dashboard for AI assistant monitoring would have these panels (JSON model):

```json
{
  "title": "Analysis AI — Pipeline Health",
  "panels": [
    {
      "title": "Requests per Minute",
      "type": "timeseries",
      "datasource": "Prometheus",
      "targets": [
        {
          "expr": "sum(rate(pipeline_requests_total[1m]))",
          "legendFormat": "Total"
        },
        {
          "expr": "sum(rate(pipeline_requests_total{status=\"error\"}[1m]))",
          "legendFormat": "Errors"
        }
      ]
    },
    {
      "title": "Pipeline Latency (P50/P95/P99)",
      "type": "timeseries",
      "datasource": "Prometheus",
      "targets": [
        {
          "expr": "histogram_quantile(0.50, sum(rate(pipeline_step_duration_ms_bucket[5m])) by (le))",
          "legendFormat": "P50"
        },
        {
          "expr": "histogram_quantile(0.95, sum(rate(pipeline_step_duration_ms_bucket[5m])) by (le))",
          "legendFormat": "P95"
        },
        {
          "expr": "histogram_quantile(0.99, sum(rate(pipeline_step_duration_ms_bucket[5m])) by (le))",
          "legendFormat": "P99"
        }
      ]
    },
    {
      "title": "Step Duration Breakdown",
      "type": "bargauge",
      "datasource": "Prometheus",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(pipeline_step_duration_ms_bucket{step=\"query_expansion\"}[5m])) by (le))",
          "legendFormat": "Query Expansion"
        },
        {
          "expr": "histogram_quantile(0.95, sum(rate(pipeline_step_duration_ms_bucket{step=\"embedding\"}[5m])) by (le))",
          "legendFormat": "Embedding"
        },
        {
          "expr": "histogram_quantile(0.95, sum(rate(pipeline_step_duration_ms_bucket{step=\"vector_search\"}[5m])) by (le))",
          "legendFormat": "Vector Search"
        },
        {
          "expr": "histogram_quantile(0.95, sum(rate(pipeline_step_duration_ms_bucket{step=\"llm_call\"}[5m])) by (le))",
          "legendFormat": "LLM Call"
        }
      ]
    },
    {
      "title": "Error Rate by Type",
      "type": "piechart",
      "datasource": "Prometheus",
      "targets": [
        {
          "expr": "sum(rate(pipeline_errors_total[1h])) by (error_type)"
        }
      ]
    },
    {
      "title": "OpenRouter Cost (7d)",
      "type": "barchart",
      "datasource": "Prometheus",
      "targets": [
        {
          "expr": "sum(rate(openrouter_cost_total[1d])) by (model)",
          "legendFormat": "{{model}}"
        }
      ]
    },
    {
      "title": "Dependency Health",
      "type": "stat",
      "datasource": "Prometheus",
      "targets": [
        {
          "expr": "dependency_health{service=\"openrouter\"}",
          "legendFormat": "OpenRouter"
        },
        {
          "expr": "dependency_health{service=\"pinecone\"}",
          "legendFormat": "Pinecone"
        },
        {
          "expr": "dependency_health{service=\"bigquery\"}",
          "legendFormat": "BQ"
        }
      ]
    }
  ]
}
```

### 9.4 OpenTelemetry Manual Instrumentation in orchestrator.ts

```typescript
// frontend/src/core/pipeline/orchestrator.ts
import { trace, context, Span, SpanStatusCode } from '@opentelemetry/api';
import { PipelineMetrics } from '../server/services/pipeline-metrics';

const tracer = trace.getTracer('analysis-ai');
const metrics = new PipelineMetrics(trace.getMeter('analysis-ai'));

interface PipelineStep<T> {
  name: string;
  execute: (signal: AbortSignal) => Promise<T>;
  timeout: number;
  model?: string;
}

async function runStep<T>(
  step: PipelineStep<T>,
  parentSpan: Span,
): Promise<T> {
  return tracer.startActiveSpan(
    step.name,
    { attributes: { 'step': step.name } },
    parentSpan,
    async (span: Span) => {
      const startTime = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), step.timeout);

        const result = await step.execute(controller.signal);
        clearTimeout(timeoutId);

        const duration = Date.now() - startTime;
        span.setAttribute('duration_ms', duration);
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();

        metrics.recordStepDuration(step.name, duration, 'success');
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        const isTimeout = error instanceof DOMException && error.name === 'AbortError';
        const errorType = isTimeout ? 'timeout' : 'error';

        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        span.setAttribute('error.type', errorType);
        span.end();

        metrics.recordStepDuration(step.name, duration, errorType);
        if (isTimeout) {
          metrics.recordTimeout(step.name);
        } else {
          metrics.recordError(step.name, (error as Error).name);
        }

        throw error;
      }
    },
  );
}

export async function runPipeline(
  conversationId: string,
  userId: string,
  query: string,
): Promise<PipelineResult> {
  const traceAttributes = {
    'conversation_id': conversationId,
    'user_id': userId,
    'query_length': query.length,
  };

  return tracer.startActiveSpan(
    'pipeline',
    { attributes: traceAttributes },
    async (span: Span) => {
      const startTime = Date.now();

      // Log the full trace info as structured JSON at the start
      logInfo('pipeline_started', {
        trace_id: span.spanContext().traceId,
        conversation_id: conversationId,
        user_id: userId,
        query: query.substring(0, 100),
      });

      try {
        // Step 1: Query Expansion
        const expandedQuery = await runStep({
          name: 'query_expansion',
          execute: async (signal) => {
            return expandQuery(query, signal);
          },
          timeout: PIPELINE_TIMEOUTS.queryExpansion,
          model: 'deepseek-v4-flash',
        }, span);
        metrics.recordTokens('deepseek-v4-flash', 'input', expandedQuery.usage.inputTokens);
        metrics.recordTokens('deepseek-v4-flash', 'output', expandedQuery.usage.outputTokens);

        // Step 2: Embedding
        const embeddings = await runStep({
          name: 'embedding',
          execute: async (signal) => {
            return generateEmbeddings(expandedQuery.text, signal);
          },
          timeout: PIPELINE_TIMEOUTS.embedding,
          model: 'text-embedding-3-small',
        }, span);
        metrics.recordTokens('text-embedding-3-small', 'input', embeddings.usage.inputTokens);

        // Step 3: Vector Search
        const searchResults = await runStep({
          name: 'vector_search',
          execute: async (signal, breaker = pineconeCircuitBreaker) => {
            return breaker.call(
              () => searchPinecone(embeddings.vector, signal),
              () => searchBigQueryFallback(query, signal),
            );
          },
          timeout: PIPELINE_TIMEOUTS.vectorSearch,
        }, span);

        // Step 4: Reranking
        const rankedResults = await runStep({
          name: 'reranking',
          execute: async (signal) => {
            return rerank(searchResults, query, signal);
          },
          timeout: PIPELINE_TIMEOUTS.reranking,
          model: 'rerank-4-fast',
        }, span);

        // Step 5: LLM Call
        const llmResponse = await runStep({
          name: 'llm_call',
          execute: async (signal) => {
            return callLLM(rankedResults, expandedQuery, query, signal);
          },
          timeout: PIPELINE_TIMEOUTS.llmCall,
          model: 'deepseek-v4-flash',
        }, span);
        metrics.recordTokens('deepseek-v4-flash', 'input', llmResponse.usage.inputTokens);
        metrics.recordTokens('deepseek-v4-flash', 'output', llmResponse.usage.outputTokens);

        // Step 6: Citation Verification
        const citations = await runStep({
          name: 'citation_verification',
          execute: async (signal) => {
            return verifyCitations(llmResponse.text, searchResults, signal);
          },
          timeout: PIPELINE_TIMEOUTS.citationVerification,
        }, span);

        const duration = Date.now() - startTime;
        span.setAttribute('total_duration_ms', duration);
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();

        logInfo('pipeline_completed', {
          trace_id: span.spanContext().traceId,
          conversation_id: conversationId,
          duration_ms: duration,
          status: 'success',
        });

        return { response: llmResponse.text, citations };
      } catch (error) {
        const duration = Date.now() - startTime;
        span.setAttribute('total_duration_ms', duration);
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        span.end();

        logError('pipeline_failed', {
          trace_id: span.spanContext().traceId,
          conversation_id: conversationId,
          duration_ms: duration,
          error: (error as Error).message,
        });

        throw error;
      }
    },
  );
}
```

### 9.5 Circuit Breaker Implementation for Pinecone

```typescript
// frontend/src/server/clients/pinecone-circuit-breaker.ts
import { trace } from '@opentelemetry/api';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;
  cooldownMs: number;
  halfOpenMaxRequests: number;
  name: string;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  cooldownMs: 30_000,
  halfOpenMaxRequests: 3,
  name: 'pinecone',
};

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenAttempts = 0;
  private readonly config: CircuitBreakerConfig;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getState(): CircuitState {
    return this.state;
  }

  async call<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T>,
  ): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.config.cooldownMs) {
        this.transitionTo('HALF_OPEN');
      } else {
        const span = trace.getActiveSpan();
        span?.addEvent('circuit_breaker.open', {
          service: this.config.name,
          state: 'OPEN',
          fallback: 'true',
        });
        return fallback();
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      if (this.state === 'OPEN') {
        const span = trace.getActiveSpan();
        span?.addEvent('circuit_breaker.opened', {
          service: this.config.name,
          failure_count: this.failureCount,
        });
        return fallback();
      }
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.config.halfOpenMaxRequests) {
        this.transitionTo('CLOSED');
      }
    }
    this.failureCount = 0;
  }

  private onFailure(error: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.transitionTo('OPEN');
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.transitionTo('OPEN');
    }
  }

  private transitionTo(newState: CircuitState): void {
    const prevState = this.state;
    this.state = newState;
    if (newState === 'CLOSED') {
      this.failureCount = 0;
      this.halfOpenAttempts = 0;
    }
    if (newState === 'OPEN') {
      this.halfOpenAttempts = 0;
    }
    if (newState === 'HALF_OPEN') {
      this.halfOpenAttempts = 0;
    }
    logWarn('circuit_breaker_transition', {
      service: this.config.name,
      from: prevState,
      to: newState,
      failure_count: this.failureCount,
    });
  }
}

// Singleton
export const pineconeCircuitBreaker = new CircuitBreaker({ name: 'pinecone' });
```

---

## 10. Business Impact

### 10.1 Know When the System Is Actually Down

**Current state:** Users send a Slack message "is Analysis AI down?" → Someone checks manually → "Oh, Pinecone returned errors."

**With telemetry:** Grafana dashboard shows dependency health in real time. Alerts fire *before* users notice. A P0 alert "Pinecone 100% error rate" fires at 14:01. At 14:02, the runbook is consulted. At 14:03, the team decides to switch to fallback mode. Users never notice an issue.

### 10.2 Reduce MTTR from Hours to Minutes

**Without monitoring:** A user reports "it's slow" at 10am. Engineer starts investigating at 10:15. Checks Vercel logs (3-5 minutes). Can't find the issue → adds temporary debug logging (15 minutes). Waits for another occurrence (30-60 minutes). Finally sees "OpenRouter 429." Fix: add retry logic. Total: 1-2 hours.

**With monitoring:** Latency dashboard shows P95 spiking at 9:45. Engineer opens trace explorer at 9:46. Finds a trace with "queuing_ms: 12,000" on OpenRouter. Checks OpenRouter status page. Confirms provider load. Adds a queue-timeout at 9:55. Total: 10 minutes.

### 10.3 Data-Driven Capacity Planning

**Questions you can answer with metrics:**

- "How much Pinecone read unit capacity do we need for Q3?" → Look at RU growth rate over last 3 months, apply trend.
- "Should we upgrade our BQ reservation?" → Slot utilization has been > 80% for 2 consecutive weeks.
- "Do we need a dedicated OpenRouter endpoint?" → Queuing times exceed 5 seconds more than 10% of the time.
- "When should we expect to hit Pinecone's monthly RU cap?" → Project current daily consumption against cap.

**Evidence-based decisions.** No more guessing.

### 10.4 Cost Optimization

Without cost tracking, you discover an issue when the credit card bill arrives. With per-conversation cost tracking:

- **Find anomaly:** "Conversation `conv_3a9b` cost $18.24 — 30x the average." Investigation reveals the user uploaded a 500-page contract and asked "summarize everything."
- **Fix:** Add a context window cap (max 100K input tokens) or warn users before processing massive documents.
- **Result:** Save $50-100/month instantly.

**Typical savings from cost monitoring in LLM apps:** 20-40% reduction in monthly API costs through:
- Detecting expensive conversations
- Right-sizing context windows
- Identifying model mismatches (using an expensive model where a cheap one suffices)
- Caching frequent queries/embeddings

### 10.5 SLA Visibility

Even without a formal SLA, the business wants to know:

- "What was our uptime last month?" → 99.2%
- "How many conversations failed?" → 47 out of 12,430 (0.38%)
- "What was the average response time?" → 4.2 seconds

This data feeds into vendor management (Pinecone, OpenRouter) and internal reporting. When a PM asks "is the tool working?" you can answer with a dashboard link instead of "I think so."

**For a formal SLA target (recommended for internal tools supporting business operations):**

| Metric | Target | Measurement |
|--------|--------|-------------|
| Uptime | 99.5% | `(/api/health returns 200) / total checks` |
| P95 latency | < 15s | `histogram_quantile(0.95, pipeline_step_duration_ms)` |
| Error rate | < 3% | `pipeline_errors_total / pipeline_requests_total` |
| Citation accuracy | > 90% | `citations_passed / citations_checked` |

---

## Appendix A: AWS Well-Architected Framework Mapping

| Pillar | How this report applies |
|--------|------------------------|
| **Operational Excellence** | Structured logging, runbooks, dashboard-driven operations |
| **Security** | No secrets in logs, IAM for BQ, API keys as environment variables |
| **Reliability** | Circuit breakers, fallback modes, timeout budgets, health checks |
| **Performance Efficiency** | Per-step latency tracking, token budget management, right-sizing models |
| **Cost Optimization** | Per-conversation cost tracking, model choice optimization, cache strategies |
| **Sustainability** | Reducing tokens = reducing compute = reducing carbon. Track and minimize token waste. |

## Appendix B: Cost Estimate for Recommended Stack

| Service | Monthly cost | Notes |
|---------|-------------|-------|
| Grafana Cloud Free Tier | $0 | 50GB logs, 10k series, 3 users |
| OpenRouter | ~$10 | At 1000 conversations/month |
| Pinecone | ~$40 | Standard plan, 100K vectors |
| BigQuery | ~$50 | On-demand, ~50GB scanned/day |
| R2 | ~$1 | Storage + minimal egress |
| Vercel Pro | $20 | For longer function timeouts |
| Better Uptime (optional) | ~$10 | External health check every 1 min |
| **Total** | **~$131/month** | |

This is less than the cost of one engineer's lunch budget per week. The ROI (reduced debugging time, cost savings, SLA visibility) pays for itself in the first month.

---

*Report prepared by Werner V. — Principal Engineer, AWS Observability  
For questions: wernerv@amazon.com (internal) | werner.vogels@aws-well-architected-partner.com*
