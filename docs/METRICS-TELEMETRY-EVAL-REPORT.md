# Metrics, Telemetry, Golden Datasets & Evaluation — Deep Research Report

> **7 personas, 7 domains, one integrated view.**
> Compiled for Analysis AI — JD Sports UK internal BI assistant.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Integration Map — How It All Fits Together](#2-integration-map)
3. [Domain 1: RAG Evaluation & Metrics](#3-domain-1-rag-evaluation--metrics)
4. [Domain 2: LLM Observability & Telemetry](#4-domain-2-llm-observability--telemetry)
5. [Domain 3: Golden Datasets & Eval Pipelines](#5-domain-3-golden-datasets--eval-pipelines)
6. [Domain 4: Product Metrics & Business Impact](#6-domain-4-product-metrics--business-impact)
7. [Domain 5: CI/CD Quality Gates & Monitoring](#7-domain-5-cicd-quality-gates--monitoring)
8. [Domain 6: Infrastructure Telemetry](#8-domain-6-infrastructure-telemetry)
9. [Domain 7: Data Pipeline & Quality Metrics](#9-domain-7-data-pipeline--quality-metrics)
10. [Integrated Implementation Roadmap](#10-integrated-implementation-roadmap)
11. [Perceived Changes Summary](#11-perceived-changes-summary)
12. [Business Impact Synthesis](#12-business-impact-synthesis)
13. [Cost/Benefit Analysis](#13-costbenefit-analysis)
14. [Risk Matrix](#14-risk-matrix)

---

## 1. Executive Summary

Analysis AI is a fully built BI assistant (74 tests, 11 phases complete) with **zero observability, zero evaluation, zero telemetry, zero golden datasets**. This report covers what to build, in what order, and what you gain.

### The High-Level Answer

| Layer | What | Why | When |
|-------|------|-----|------|
| **Golden Dataset** | 30-50 curated Q&A pairs covering doc-only, BQ-only, hybrid, edge cases | Foundation for every other decision | **Week 1** |
| **RAG Eval** | Faithfulness, citation accuracy, SQL correctness metrics | Measure quality objectively | **Week 1-2** |
| **LLM Observability** | Langfuse tracing per pipeline step | Debug bad answers in 2 min instead of 4 hours | **Week 2** |
| **Product Metrics** | PostHog analytics (DAU, engagement, trust signals) | Know if anyone actually uses it | **Week 2** |
| **CI Eval Gate** | Eval in CI, block regression on prompt/model changes | Never ship worse answers | **Week 2-3** |
| **Infra Telemetry** | Latency, error rates, cost per step | SLA enforcement, cost optimization | **Week 3** |
| **Data Quality** | BigQuery freshness, schema drift, pipeline health | Trust that data is fresh and correct | **Week 3-4** |
| **Canary Deployments** | Traffic splitting, shadow testing, auto-rollback | Safe experimentation at 5x velocity | **Week 4-5** |

**Total cost:** ~$305/month incremental (eval judge LLM + monitoring infra).  
**Total effort:** ~3-4 weeks for one senior engineer.  
**Net ROI:** ~4x in Year 1 (prevents bad-decision incidents, speeds iteration, enables trust).

---

## 2. Integration Map — How It All Fits Together

```
                         ┌─────────────────────────────────────────────────────┐
                         │                    USERS                           │
                         │  (JD Sports analysts, merchandisers, buyers)       │
                         └────────────────────────┬──────────────────────────┘
                                                  │
                         ┌────────────────────────▼──────────────────────────┐
                         │              PRODUCT METRICS (PostHog)             │
                         │  DAU, conversations, follow-up rate, citation CTR  │
                         │  rephrase rate, session quality, feedback scores   │
                         └────────────┬────────────────────┬─────────────────┘
                                      │                    │
              ┌───────────────────────┼────────────────────┼───────────────────────┐
              │                       │                    │                       │
              ▼                       ▼                    ▼                       ▼
   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
   │  LLM OBSERVABILITY│   │  RAG EVALUATION  │   │  INFRA TELEMETRY │   │  DATA QUALITY    │
   │  (Langfuse)       │   │  (RAGAS + custom)│   │  (Grafana/Prom)  │   │  (BigQuery SQL)  │
   │                   │   │                   │   │                   │   │                   │
   │  • Trace/spans    │──▶│  • Faithfulness   │   │  • P50/P95/P99   │   │  • Freshness      │
   │  • Token usage    │   │  • Citation acc   │   │  • Error rates   │   │  • Schema drift   │
   │  • Latency/step   │   │  • SQL correctness│   │  • Cost tracking  │   │  • Row anomalies  │
   │  • Cost tracking  │   │  • Context quality│   │  • Dependency     │   │  • Null rates     │
   │  • Error budgets  │   │  • Hallucination  │   │    health checks  │   │  • Lineage audit  │
   └──────────────────┘   └──────────────────┘   └──────────────────┘   └──────────────────┘
              │                       │                    │                       │
              └───────────────────────┴────────────────────┴───────────────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────────────────────────────────┐
                         │         GOLDEN DATASET (Source of Truth)            │
                         │  30-200 test cases: doc-only, BQ-only, hybrid,      │
                         │  edge cases, multi-turn. Version-controlled in git. │
                         └────────────────────┬────────────────────────────────┘
                                              │
                                              ▼
                         ┌─────────────────────────────────────────────────────┐
                         │     CI/CD QUALITY GATES (GitHub Actions)            │
                         │  lint → test → eval-smoke → eval-full → build       │
                         │  → canary (5%) → shadow compare → auto-rollback     │
                         │  → 100% rollout                                     │
                         └─────────────────────────────────────────────────────┘
```

### Data Flow

```
User Question
    │
    ▼
┌───────────────────────────────────────────────────────────────┐
│  ORCHESTRATOR (instrumented with Langfuse spans)              │
│                                                               │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐  │
│  │Query    │──▶│Embedding│──▶│Vector   │──▶│Reranking │  │
│  │Expansion│   │(OpenAI) │   │Search   │   │(Cohere)  │  │
│  └──────────┘   └──────────┘   │(Pinecone)│   └──────────┘  │
│                                └──────────┘                  │
│  ┌──────────────────────────────────────────────────┐       │
│  │  BigQuery (NL → SQL → Execute)                   │       │
│  └──────────────────────────────────────────────────┘       │
│  ┌──────────┐   ┌──────────┐   ┌──────────────────┐        │
│  │LLM Call  │──▶│Citation  │──▶│Response +        │        │
│  │(DeepSeek)│   │Verify    │   │Fallback Gate     │        │
│  └──────────┘   └──────────┘   └──────────────────┘        │
└───────────────────────────────────────────────────────────────┘
    │                                    │
    ▼                                    ▼
┌────────────┐                   ┌─────────────────────┐
│  Product   │                   │  Langfuse Trace     │
│  Analytics │                   │  ┌───────────────┐  │
│  (PostHog) │                   │  │span: embed    │  │
│            │                   │  │span: search   │  │
│  Event:    │                   │  │span: rerank   │  │
│  answer    │                   │  │span: llm      │  │
│  rendered  │                   │  │span: verify   │  │
│            │                   │  │usage: tokens  │  │
│            │                   │  │cost: $0.0023  │  │
└────────────┘                   └─────────────────────┘
    │                                    │
    ▼                                    ▼
┌─────────────────────┐         ┌──────────────────────────┐
│  BigQuery Events    │         │  Data Quality Checks     │
│  Table              │         │  (schema drift, row cnt) │
│  (for weekly SLA    │         └──────────────────────────┘
│   reporting)        │
└─────────────────────┘
```

---

## 3. Domain 1: RAG Evaluation & Metrics

**Persona:** Nihar B. — Staff Engineer, Search & AI Evaluation, Google

### Stack Recommendation

| Component | Choice | Why |
|-----------|--------|-----|
| Metric computation | **RAGAS** | Best RAG metrics + native SQL evaluation (`SQLQueryEquivalence`, `DatacompyScore`) |
| Test runner | **DeepEval** (or custom) | pytest-native, CI integration, regression thresholds |
| LLM-as-judge | DeepSeek v4 Flash via OpenRouter | Same model you use — no additional provider |

### Metrics to Track

| Metric | What It Measures | How | Threshold |
|--------|-----------------|-----|-----------|
| **Faithfulness** | Claims in answer supported by retrieved context? | LLM extracts claims, checks against chunks | > 0.8 |
| **Answer Relevancy** | Answer addresses the question? | LLM classifies answer statements | > 0.7 |
| **Citation Accuracy** | Does `[1]` point to the right source? | Term overlap + LLM verification | > 0.9 |
| **SQL Syntax** | Does generated SQL parse? | Try `EXPLAIN` or dry-run | 100% |
| **SQL Result** | Does SQL produce correct rows? | Execute + compare to expected | > 0.85 |
| **Hallucination Rate** | Fraction of unsupported claims | Existing term-overlap gate + LLM | < 0.15 |

### Key Insight: Why the Existing Hallucination Gate Isn't Enough

Your current `verifyCitations()` uses term overlap (threshold 0.15). This catches "no source" hallucinations but **misses semantic errors**. Example:

> Claim: "Hoka achieved a 74% sell-through rate"  
> Context says: "Hoka achieved a **68%** sell-through rate"  
> Term overlap score: 0.83 (5/6 words match, number differs) → **passes**  
> But the answer is **wrong**.

An LLM-as-judge faithfulness check catches this. Term overlap is a cheap pre-filter; LLM-as-judge is the real gate.

### Code: Faithfulness Evaluation

```python
from ragas import Dataset
from ragas.metrics import faithfulness
from openai import OpenAI

client = OpenAI(api_key="...", base_url="https://openrouter.ai/api/v1")
dataset = Dataset.from_list([{
    "question": "What was Hoka's sell-through rate?",
    "answer": "Hoka achieved 74% in H1 2026",
    "contexts": ["Hoka achieved a sell-through rate of 68% in H1 2026"],
    "ground_truth": "Hoka achieved 68% in H1 2026"
}])
result = dataset.evaluate(llm=client, metrics=[faithfulness])
# Faithfulness = 0.0 (claim "74%" is not supported by context "68%")
```

---

## 4. Domain 2: LLM Observability & Telemetry

**Persona:** Michelle P. — Staff Engineer, API Reliability & Observability, OpenAI

### Platform: Langfuse

| Criterion | Verdict |
|-----------|---------|
| Next.js support | Yes (`@vercel/otel` integration, `registerOTel`) |
| Custom pipeline support | Yes — manual spans via `startActiveObservation` |
| Cost tracking | First-class (`usageDetails`, `costDetails` on generations) |
| Sessions | Maps to conversation IDs |
| Open source | Yes (AGPL, self-hostable) |
| Overhead | ~1-5ms per observation, async |

### What a Single Trace Looks Like

```
Trace: "chat-completion" (traceId = conversationId)
├── Span: "orchestrator.run"
│   ├── Span: "query-expansion" [gen, model=deepseek]
│   ├── Span: "embedding" [gen, model=text-embedding-3-small]
│   ├── Span: "vector-search" + Event: "pinecone-query"
│   ├── Span: "reranking" [gen, model=rerank-4-fast]
│   ├── Span: "bigquery-query" {sql, rowCount, duration}
│   ├── Span: "llm-response" [gen, model=deepseek] + usage + cost
│   └── Span: "citation-verification" [gen] + verdict
```

### Key Business Insight

> **Without telemetry:** A user reports "wrong answer." Developer spends 4-8 hours reproducing, reading logs, theorizing.  
> **With Langfuse:** Filter by `sessionId`, see the trace in 30 seconds. "Ah — Pinecone returned 0 results because the index was stale." Fix in 2 minutes.  
> **MTTR reduction: 4-8 hours → 2 minutes.**

### Dashboard: "BI Assistant Health"

```
┌──────────────────┬───────────────────┬──────────────────┐
│ Total Requests   │ P95 Latency       │ Error Rate       │
│ 12,847           │ 6.2s              │ 2.1%             │
├──────────────────┴───────────────────┴──────────────────┤
│ LATENCY BY STEP (p95, ms)                                │
│ Step             │ p50    │ p95    │ p99    │ Trend     │
│ Query Expansion  │ 320    │ 890    │ 1200   │ ▄▆█       │
│ Embedding        │ 180    │ 450    │ 780    │ ▂▄▆       │
│ Vector Search    │ 95     │ 220    │ 410    │ ▂▃▄       │
│ Reranking        │ 280    │ 670    │ 950    │ ▃▅█       │
│ BigQuery         │ 1200   │ 4100   │ 8200   │ ▅▇█       │
│ LLM Call         │ 1800   │ 4200   │ 7100   │ ▄▆█       │
│ Total            │ 4100   │ 8200   │ 14000  │ ▅▇█       │
├──────────────────┬───────────────────┬──────────────────┤
│ Cost Today       │ Cache Hit Rate    │ Fallback Rate    │
│ $142.50          │ 62%               │ 8.3%             │
├──────────────────┴───────────────────┴──────────────────┤
│ ERRORS BY TYPE (last 24h)                                │
│ Error Type        │ Count  │ % of Total │ Affected      │
│ LLM 429          │ 23     │ 0.18%      │ 12 users      │
│ Pinecone Timeout │ 7      │ 0.05%      │ 5 users       │
│ BQ Error         │ 15     │ 0.12%      │ 9 users       │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Domain 3: Golden Datasets & Eval Pipelines

**Persona:** Chris O. — Principal Engineer, Eval Infrastructure, Anthropic

### Dataset Design

| Stage | Size | Purpose |
|-------|------|---------|
| MVP | 30-50 cases | Catch regressions, set baseline |
| Growth | 100-150 | Statistical power for A/B testing |
| Mature | 200-500 | Fine-grained sub-splits by type/difficulty |

### Test Case Taxonomy

| Category | Count | Example |
|----------|-------|---------|
| Document-only | 10-12 | "What was Hoka's sell-through rate?" |
| BigQuery-only | 10-12 | "Top 5 products by revenue?" |
| Hybrid | 10-12 | "Scotland vs plan — what drove underperformance?" |
| Edge cases | 6-8 | Out-of-scope, ambiguous, multi-turn |
| Multi-turn chains | 3-5 | 2-4 turn follow-up conversations |

### Test Case Structure

```json
{
  "id": "gd-hybrid-001",
  "question": "How did Scotland perform vs plan in Q3?",
  "queryType": "hybrid",
  "difficulty": "medium",
  "expectedAnswerCheckpoints": [
    "Scotland at 92.5% of plan",
    "GBP 128M actual vs GBP 138M plan",
    "Dundee/Inverness refurbishment closures",
    "Undersupply of larger shoe sizes"
  ],
  "expectedCitations": [
    {"sourceId": "doc-jd-4", "label": "Q3 Performance Review", "required": true},
    {"sourceId": "bq://orders", "label": "BigQuery revenue", "required": true}
  ],
  "expectedSqlShape": "SELECT.*region.*SUM.*FROM.*orders.*GROUP BY"
}
```

### Key Insight: Build vs Buy

| Capability | Build | Buy | Verdict |
|------------|-------|-----|---------|
| Golden dataset storage | Git + JSON | LangSmith Datasets | **Build** (zero vendor lock-in) |
| Eval runner | Custom `run.ts` | LangSmith SDK | **Build** (custom pipeline, 200 lines) |
| LLM-as-judge | Custom evaluator | LangSmith/Confident AI | **Mix** — build simple, buy at scale |
| Human annotation | Label Studio | LangSmith Queues | **Buy** (LangSmith free tier) |
| CI integration | GitHub Action | LangSmith CLI | **Build** (trivial script) |

---

## 6. Domain 4: Product Metrics & Business Impact

**Persona:** Claire H. — Staff Product Engineer, Stripe

### North Star: Time-to-Insight

> _"How long does it take a JD Sports analyst to get the answer they need?"_

### Metrics Framework

| Tier | Metric | How to Measure | Target |
|------|--------|---------------|--------|
| **Adoption** | DAU/WAU/MAU, conversations per user | PostHog event tracking | >35% weekly stickiness |
| **Engagement** | Messages per session, session duration | PostHog | >4 msgs/session |
| **Quality** | Follow-up rate, rephrase rate, citation CTR | Event tracking | Follow-up >40% (good), rephrase <15% (bad) |
| **Trust** | Feedback score, copy rate, export rate | UI events | Score >4.0/5.0 |

### Key Insight: Implicit Signals Beat Explicit Feedback

Users rarely click thumbs up/down. But they **do**:
- Copy the answer → "I'm going to use this in a report" → **high trust signal**
- Ask a follow-up → "First answer was useful, I want more" → **high engagement signal**
- Rephrase the question → "First answer missed the mark" → **hidden negative signal**
- Click a citation → "I want to verify the source" → **trust-but-verify signal**

Track these **zero-effort signals** before adding feedback UI.

### Business Value Quantification

| Role | Time Saved/Week | Value/Year |
|------|----------------|------------|
| Analyst (50 people) | 8.5 hours | ~£773K |
| Reduced engineering ad-hoc queries | 5 hours | ~£55K |
| Faster decision cycles | N/A | Hard to quantify but significant |
| **Total estimated value** | | **~£828K/year** |

### Code: Event Tracking

```typescript
// frontend/src/lib/analytics.ts
import posthog from "posthog-js";

export function trackMessageSent(role: "user" | "assistant", props: {
  conversationId: string;
  messageLength: number;
  queryType?: "document" | "bigquery" | "hybrid" | "general";
  documentIds?: string[];
  latencyMs?: number;
}) {
  posthog.capture("message_sent", { role, ...props });
}

export function trackCitationClicked(conversationId: string, citationId: string, sourceType: string) {
  posthog.capture("citation_clicked", { conversationId, citationId, sourceType });
}

export function trackAnswerCopied(conversationId: string, answerLength: number) {
  posthog.capture("answer_copied", { conversationId, answerLength });
}
```

---

## 7. Domain 5: CI/CD Quality Gates & Monitoring

**Persona:** Brian S. — Staff Engineer, AI Infrastructure, Meta

### CI Pipeline Stages

```
PR Opened
  ├── Stage 1: Lint + TypeCheck (45s) — always
  ├── Stage 2: Unit Tests (90s) — always
  ├── Stage 3: Eval Smoke (8s) — always, 10 critical golden queries
  ├── Stage 4: Eval Full (90s) — conditional on pipeline/core changes
  ├── Stage 5: Build (60s) — always
  └── Stage 7: Deploy Preview (Vercel) — every PR
```

### Canary Deployment Flow

```
Merge to main
  │
  ├── 5% traffic → new config (prompt/model/params)
  │     └── Monitor: eval ROUGE score, latency, error rate
  │     └── Shadow run: compare new vs old answers silently
  │
  ├── If guardrail breached → auto-rollback (2 min)
  │
  └── If stable for 48h → 25% → 50% → 100%
```

### Key Insight: Mock Everything in CI

Real LLM calls in CI: 5-15 minutes, $2-5/run.  
Mock LLM (deterministic map): 8-12 seconds, $0.

```typescript
// scripts/eval/mock-llm.ts
const ANSWER_MAP = new Map([
  ["what was hoka's sell-through rate", "Hoka achieved 68% in H1 2026"],
  // ... for all 50 golden question patterns
]);

export function mockLLMResponse(prompt: string): string {
  const normalized = prompt.toLowerCase().trim();
  for (const [key, val] of ANSWER_MAP)
    if (normalized.includes(key)) return val;
  return "MOCK: Unable to determine answer";
}
```

### Alerts (Only 3 P1 Alerts)

| Alert | Condition | Action |
|-------|-----------|--------|
| Error rate >1% | 5 min window | Auto-rollback canary, page on-call |
| P95 latency >10s | 5 min window | Investigate bottleneck step |
| Fallback rate >20% | 5 min window | Check LLM provider status |

---

## 8. Domain 6: Infrastructure Telemetry

**Persona:** Werner V. — Principal Engineer, AWS

### The Four Golden Signals for AI Apps

| Signal | What to Monitor | How |
|--------|----------------|-----|
| **Latency** | P50/P95/P99 per pipeline step | OpenTelemetry manual spans in orchestrator |
| **Traffic** | Requests/min, conversations/hour | Prometheus counter |
| **Errors** | API 429/5xx, Pinecone timeouts, BQ errors | Error counters per dependency |
| **Saturation** | Pinecone query units, BQ slot usage, OpenRouter rate limits | Dependency health metrics |

### Cost Tracking

Track per-request cost for:

| Service | Cost Driver | Tracking |
|---------|-------------|----------|
| OpenRouter (LLM) | Input/output tokens | `usage` object in response |
| OpenRouter (embedding) | Text length | `usage` in embedding response |
| OpenRouter (reranking) | Document count × tokens | Usage metadata |
| Pinecone | Read/write units | Prometheus metrics |
| BigQuery | Bytes processed | `INFORMATION_SCHEMA.JOBS` |

### Dependency Health + Circuit Breaker

Pinecone is the most likely single point of failure. Implement a circuit breaker:

```typescript
// frontend/src/core/pipeline/circuit-breaker.ts
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private readonly threshold = 5;    // 5 failures in window
  private readonly timeout = 30000;  // 30s cooldown

  async call<T>(fn: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = "HALF_OPEN";
      } else {
        return fallback(); // Skip Pinecone, use BQ-only mode
      }
    }

    try {
      const result = await fn();
      this.failures = 0;
      this.state = "CLOSED";
      return result;
    } catch (err) {
      this.failures++;
      this.lastFailureTime = Date.now();
      if (this.failures >= this.threshold) this.state = "OPEN";
      return fallback();
    }
  }
}
```

---

## 9. Domain 7: Data Pipeline & Quality Metrics

**Persona:** Matei Z. — Staff Engineer, Databricks (Unity Catalog)

### Data Quality Dimensions

| Dimension | Document Pipeline | BigQuery Pipeline |
|-----------|-----------------|-------------------|
| **Freshness** | Time from upload to "ready" status | Table last_modified via `INFORMATION_SCHEMA` |
| **Completeness** | Funnel: parsed → chunked → embedded → indexed | Row count anomaly detection |
| **Accuracy** | Content hash consistency on re-upload | SQL generation correctness |
| **Consistency** | Deterministic chunking (same doc → same chunks) | Schema drift detection (weekly diff) |

### Schema Drift Detection (Critical)

BigQuery schemas change. When they do, your NL-to-SQL prompt's schema context becomes stale and generated SQL breaks.

```sql
-- Weekly snapshot
INSERT INTO `analysis_ai.dq_schema_snapshots`
SELECT CURRENT_DATE(), table_name, column_name, data_type, ordinal_position
FROM `your-project.INFORMATION_SCHEMA.COLUMNS`
WHERE table_schema = 'your_dataset';

-- Diff against previous snapshot → alert on ADDED/DROPPED/TYPE_CHANGED
```

### Data Lineage Record

Every question → answer pair gets a lineage record stored as NDJSON:

```json
{
  "lineageId": "lin_01J7XYZ",
  "sessionId": "sess_abc123",
  "question": "Top 5 products by revenue?",
  "retrieval": {
    "documentIds": ["doc_42"],
    "chunkScores": [0.89, 0.76]
  },
  "sql": {
    "generated": true,
    "query": "SELECT p.name, SUM(oi.revenue)...",
    "tablesAccessed": ["orders", "order_items", "products"],
    "success": true,
    "bytesProcessed": 104857600
  },
  "latencyMs": 5840,
  "citations": [
    {"type": "document", "source": "doc_42"},
    {"type": "table", "source": "orders"}
  ]
}
```

This enables: audit trail, debugging ("what data was used for this answer?"), and compliance.

---

## 10. Integrated Implementation Roadmap

### Phase 1: Foundation (Week 1)

| Day | What | Who | Output |
|-----|------|-----|--------|
| 1 | Create golden dataset: 30 cases from existing docs + BQ schema | Engineer | `golden/*.json` |
| 2 | Build eval runner: call orchestrator, collect results | Engineer | `golden/run.ts` |
| 2 | Add 3 deterministic evaluators (citation check, SQL shape, answer length) | Engineer | `golden/evaluators/*.ts` |
| 3 | Run golden set → establish baseline scores | Engineer | `golden/baseline.json` |
| 3 | Start Langfuse: install, create `instrumentation.ts`, instrument orchestrator | Engineer | Traces visible in Langfuse |
| 4 | Set up PostHog: add event tracking to chat components | Engineer | Product analytics dashboard |
| 5 | Add eval smoke test to CI (10 critical queries, always runs) | Engineer | CI eval step |

**Verification:** `npm run eval` produces a score report. First trace appears in Langfuse. PostHog shows page views.

### Phase 2: Quality Gates (Week 2)

| Day | What | Who | Output |
|-----|------|-----|--------|
| 1-2 | Add RAGAS faithfulness + citation accuracy metrics | Engineer | LLM-as-judge evaluators |
| 2-3 | Add eval-full to CI (conditional, all 30-50 cases) | Engineer | CI blocks on regression |
| 3-4 | Set up BigQuery data quality monitoring (freshness, row counts) | Engineer | Scheduled SQL queries |
| 4-5 | Add structured logging to all pipeline steps | Engineer | `pipeline.*` metrics |
| 5 | Build first Grafana/Datadog dashboard (latency, errors, cost) | Engineer | Operations dashboard |

**Verification:** CI blocks a PR with a regression. Data quality alerts fire if BQ tables go stale.

### Phase 3: Observability (Week 3)

| Day | What | Who | Output |
|-----|------|-----|--------|
| 1-2 | Add cost tracking to Langfuse spans (token usage from OpenRouter) | Engineer | Cost per conversation |
| 2-3 | Build data lineage logging (NDJSON per session) | Engineer | Lineage audit trail |
| 3-4 | Add document pipeline monitoring (per-stage timing, success rates) | Engineer | Pipeline funnel dashboard |
| 4-5 | Set up 3 P1 alerts (error rate, latency, fallback rate) | Engineer | Slack + PagerDuty alerts |

**Verification:** P1 alert fires when Pinecone is slow. Lineage shows every step for a conversation.

### Phase 4: Safe Deployment (Week 4-5)

| Day | What | Who | Output |
|-----|------|-----|--------|
| 1-2 | Config-driven pipeline (env var → model/prompt/params) | Engineer | `pipeline-config.ts` |
| 2-3 | Implement canary deployment (hash-based 5% traffic split) | Engineer | Canary config |
| 3-4 | Add shadow testing (run both configs, compare ROUGE-L) | Engineer | Shadow comparison dashboard |
| 4-5 | Add auto-rollback + circuit breaker (Pinecone) | Engineer | Auto-rollback trigger |
| 5 | Implement LLM-as-judge evaluators for ongoing monitoring | Engineer | Online LLM evaluation |

**Verification:** Canary auto-rolls back when faithfulness drops. Circuit breaker routes around Pinecone outage.

### Phase 5: Maturity (Week 6-8)

| Week | What | Who | Output |
|------|------|-----|--------|
| 6 | Expand golden dataset to 100+ cases (synthetic + real) | Engineer + PM | Expanded coverage |
| 6 | Add human eval pipeline (LangSmith annotation queues, 2 raters) | Engineer | Human eval rubric |
| 7 | Calibrate LLM-as-judge against human evaluators | Engineer | Confusion matrix |
| 7 | Embedding drift detection (weekly canonical doc comparison) | Engineer | Embedding drift alert |
| 8 | Dashboard for business stakeholders (adoption, satisfaction) | PM + Engineer | Product health dashboard |

---

## 11. Perceived Changes Summary

### What Developers Notice

| Change | Pain | Benefit |
|--------|------|---------|
| CI takes 5-10 min longer (conditional) | ⭐⭐ | Never ship regression |
| New `golden/` directory | ⭐ | Quality culture |
| New `LANGFUSE_*` env vars | ⭐ | Debug in 2 min |
| New `NEXT_PUBLIC_POSTHOG_KEY` | ⭐ | Know if users like it |
| New `dq_schema_snapshots` table | ⭐ | Catch BQ schema changes |
| Can't merge if eval fails | ⭐⭐⭐ | Safety net |
| Alert noise (first 2 weeks) | ⭐⭐⭐⭐ | Then tuned |
| Weekly human eval (30 min) | ⭐⭐ | Quality signal |
| Monthly golden dataset refresh | ⭐ | Dataset stays relevant |

### What Business Users Notice

| Change | Impact |
|--------|--------|
| Document status shows "processed 3m ago" | "Data is fresh" |
| Response includes table freshness badge | Trust |
| Answers cite sources they can verify | Trust |
| Rarely see wrong answers | Confidence |
| Slow queries show explanation | Patience |

---

## 12. Business Impact Synthesis

### Quantitative Impact

| Area | Before | After (3 months) | Business Value |
|------|--------|-----------------|----------------|
| **Hallucination rate** | ~10-15% (estimated, unmeasured) | <2% (measured, enforced) | Correct decisions. VP doesn't make inventory call on wrong data. |
| **SQL correctness** | ~15% errors (estimated) | <3% syntax, <5% semantic | Analysts trust the numbers. No time wasted debugging bad queries. |
| **Prompt iteration** | 3 days per change (manual QA) | 2 hours per change (CI eval) | 12x faster. Ship 5 changes/week instead of 1. |
| **Regression detection** | Days (user reports) | Minutes (CI alert) | Zero production incidents from prompt/model changes. |
| **MTTR for bad answers** | 4-8 hours | 2-15 minutes | 30x faster. Support tickets resolved same-day. |
| **Cost optimization** | Unknown spend | 20-40% reduction | $200-400/month saved per $1K API spend. |
| **Deploy confidence** | Low (manual QA gate) | High (automated gates) | Deploy daily instead of weekly. |

### Qualitative Impact

| Stakeholder | What They Get |
|-------------|---------------|
| **Analyst** | Trustworthy answers. Fresh data. Source citations to verify. |
| **VP Merchandising** | Data-driven decisions. No "I can't trust the AI" moments. |
| **CTO** | Cost visibility. SLA reporting. Audit trail for compliance. |
| **Engineering team** | Fast iteration. Safe experimentation. 5x velocity. |
| **Compliance** | "Show me exactly what data was used for every answer." |

### ROI Calculation (Year 1)

| Item | Cost/Benefit |
|------|-------------|
| **Cost: Engineer time** (4 weeks × $8K/week) | -$32K |
| **Cost: LLM-as-judge eval** ($3-5/CI run × 50 runs/month × 12) | -$2.4K |
| **Cost: Monitoring infra** (Datadog/Grafana) | -$2.4K |
| **Total cost** | **-$36.8K** |
| **Benefit: Analyst time saved** (8.5 hrs/wk × 50 analysts × $50/hr × 50 wks) | +$1,062.5K |
| **Benefit: Reduced engineering ad-hoc** | +$55K |
| **Benefit: Faster decisions** (hard to quantify, excluded) | ??? |
| **Total benefit** | **+$1,117.5K** |
| **Net ROI** | **~30x** |

---

## 13. Cost/Benefit Analysis

### Monthly Recurring Costs

| Item | Cost | Notes |
|------|------|-------|
| Langfuse (free tier) | $0 | 50K observations/month, sufficient for internal tool |
| PostHog (free tier) | $0 | 1M events/month |
| LLM-as-judge eval | $50-150 | DeepSeek v4 Flash is cheap |
| Monitoring (Datadog/Grafana) | $0-200 | Free tier or existing budget |
| Human eval time (2 hrs/week) | ~$400 | Internal resource cost |
| **Total monthly** | **~$500** | |

### One-Time Setup Costs

| Item | Effort | Equivalent Cost |
|------|--------|-----------------|
| Golden dataset creation | 2 days | $3.2K |
| Eval runner + CI integration | 3 days | $4.8K |
| Langfuse instrumentation | 1 day | $1.6K |
| PostHog analytics | 0.5 day | $0.8K |
| Data quality monitoring | 2 days | $3.2K |
| Canary deployment infra | 3 days | $4.8K |
| **Total setup** | **~4 weeks** | **~$18.4K** |

---

## 14. Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Eval costs balloon** | Low | Medium | Use smaller judge LLM. Cap eval runs per CI. |
| **Alert fatigue** | Medium | High | Tier alerts: P1 = page, P2 = Slack, P3 = weekly digest. |
| **Golden dataset goes stale** | Medium | High | Monthly refresh using production query logs. |
| **LLM provider changes model silently** | Medium | High | Pin model versions. Run drift detection weekly. |
| **Team doesn't adopt eval culture** | Medium | Medium | Start permissive (comment, not block). Tighten over time. |
| **Human eval takes too much time** | Medium | Low | Cap at 30 cases/week. Prioritize automated eval. |
| **False positives in regression detection** | Medium | Medium | Bootstrap CI with 95% confidence. >5% drop to block. |
| **Infra telemetry overhead slows pipeline** | Low | Low | Async, batched, ~5ms/observation. <0.1% overhead. |

---

## Appendix A: Persona Roster

| Domain | Persona | Company Focus |
|--------|---------|---------------|
| RAG Evaluation | Nihar B., Staff Engineer | Google Search & AI Evaluation |
| LLM Observability | Michelle P., Staff Engineer | OpenAI API Reliability |
| Golden Datasets | Chris O., Principal Engineer | Anthropic Eval Infrastructure |
| Product Metrics | Claire H., Staff Product Engineer | Stripe Internal Tools |
| CI/CD Quality | Brian S., Staff Engineer | Meta AI Infrastructure |
| Infra Telemetry | Werner V., Principal Engineer | AWS Observability |
| Data Quality | Matei Z., Staff Engineer | Databricks Unity Catalog |

## Appendix B: Repository Changes Summary

### New Files

```
golden/
├── manifest.json
├── baseline.json
├── cases/
│   ├── document-only.json    ← 10-12 cases
│   ├── bigquery-only.json    ← 10-12 cases
│   ├── hybrid.json           ← 10-12 cases
│   ├── edge.json             ← 6-8 cases
│   └── multi-turn.json       ← 3-5 chains
├── evaluators/
│   ├── citation-evaluator.ts
│   ├── accuracy-evaluator.ts
│   ├── sql-evaluator.ts
│   └── deterministic-evaluators.ts
├── reporters/
│   ├── json-reporter.ts
│   └── regression-detector.ts
├── run.ts                    ← Main eval entry point
└── README.md

apps/web/src/
├── lib/
│   ├── analytics.ts          ← PostHog event helpers
│   ├── config-resolver.ts   ← Canary config resolver
│   └── circuit-breaker.ts   ← Pinecone circuit breaker
├── core/pipeline/
│   ├── orchestrator.ts      ← ← MODIFIED: Langfuse spans + cost tracking
│   └── monitor.ts           ← Pipeline metrics collector
├── server/services/
│   ├── bigqueryService.ts   ← ← MODIFIED: lineage logging + schema cache
│   └── documentService.ts   ← ← MODIFIED: monitor block in documents.json

docs/
├── runbooks/
│   ├── high-error-rate.md
│   ├── high-latency.md
│   └── silent-degradation.md
└── TRACKING-PLAN.md

scripts/
├── eval.sh                  ← Runs full eval pipeline
├── dq/
│   ├── schema-snapshot.sql  ← Weekly BQ schema capture
│   ├── freshness-check.sql  ← Table freshness dashboard
│   └── lineage-export.sh    ← Export lineage for compliance
├── deploy-canary.sh         ← Vercel canary deployment
└── mock-llm.ts             ← Deterministic LLM mock for CI

.github/workflows/
├── ci.yml                   ← ← MODIFIED: eval smoke + eval full stages
├── canary.yml               ← Canary monitoring + auto-rollback
└── dq-monitoring.yml        ← Scheduled data quality checks
```

### New Dependencies

```json
{
  "@langfuse/tracing": "^3",
  "posthog-js": "^1",
  "posthog-node": "^4"
}
```

### New Environment Variables

```
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_CANARY_ENABLED=false
NEXT_PUBLIC_CANARY_PERCENT=0
```
