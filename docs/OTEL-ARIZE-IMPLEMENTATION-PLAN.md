# OTEL + Arize Cloud Implementation Plan

## Context & Goal

We are building **Analysis AI** — an internal BI assistant that lets users upload contracts/documents (PDF, DOCX), chat with them, and get answers grounded in document content and BigQuery data with inline source citations.

### Current State

- **Frontend**: Next.js 16.2.9, React 19, Tailwind v4, lucide-react
- **Backend**: RAG pipeline (embed → Pinecone topK=40 → rerank topK=3 → LLM generate)
- **Services**: BigQuery (6 tables), Pinecone vector DB, OpenRouter LLM, Cloudflare R2 storage
- **Pipeline stages** (in `orchestrator.ts`): classify → embed → (doc search + rerank) / (BQ SQL gen + execute) → LLM generate → citations
- **No tracing**: `console.log` and `console.time` only
- **No evals**: `verification.ts` hallucination gate exists but is NOT wired to orchestrator
- **No analytics**: No user event tracking
- **No cost tracking**: No per-query cost visibility
- **Existing types** (`@analysis-ai/types`): `Message` (role, content, citations), `Citation` (sourceId, confidence, verificationStatus, type), `Document` (status, progress)
- **Monorepo**: npm workspaces with `apps/web/` and `packages/`

### Business Goal

Ship with **observability from day one**. Know:
- Is the pipeline fast enough? (latency per stage)
- Are answers accurate? (hallucination rate, faithfulness)
- Are we spending money wisely? (cost per query, tokens)
- What's the error rate and where?
- Can we trace a bad answer back to the exact pipeline step that caused it?

### Why Arize Cloud (Free Tier)

- **$0/mo** up to 25K spans, 1GB ingestion, 15-day retention
- **OTEL-native** — just send spans via standard OpenTelemetry protocol
- **Built-in UI** for traces, dashboards, and click-to-eval (hallucination, faithfulness, QA, etc)
- **No self-hosting** — no Docker, no VPS, no maintenance
- **Evals are on-demand** — never auto-run. You click a trace → "Evaluate" → it runs against YOUR OpenRouter key

---

## Implementation (Short)

### What changes in the app

1. **Add 2 npm packages**: `@opentelemetry/api` + `@opentelemetry/exporter-trace-otlp-http`
2. **Create `instrumentation.ts`**: Initialize OTEL exporter pointing at Arize Cloud OTLP endpoint (Arize provides the exact URL + auth header after signup)
3. **Add 5-6 OTEL spans in `orchestrator.ts`**: Wrap each pipeline stage (classify, embed, search, rerank, generate) with `tracer.startSpan()` + `.end()`. Set attributes on each span: intent, confidence, tokens_in, tokens_out, model, chunk_count, cost, citations, question text.
4. **Optionally add root span in `api/chat/route.ts`**: Wrap the entire request
5. **Add 1 env var** `.env.local`: `ARIZE_API_KEY`

### What stays the same

- The app runs exactly as it does today. OTEL is fire-and-forget, never blocks the response.
- No changes to the streaming SSE response, no changes to the UI components, no changes to existing tests.
- The hallucination gate fix (`verifyCitations()` wiring) is a separate concern.

### Files to create

| File | Purpose | Lines |
|------|---------|-------|
| `apps/web/src/instrumentation.ts` | Initialize OTEL SDK with Arize exporter | ~20 |
| `apps/web/src/lib/trace.ts` | Helper functions for creating spans with consistent attributes | ~30 |

### Files to modify

| File | Change | Lines |
|------|--------|-------|
| `apps/web/src/core/pipeline/orchestrator.ts` | Wrap 5-6 pipeline stages with OTEL spans, set attributes (question, intent, tokens, model, cost, citations, chunks, latency per stage) | +~60 |
| `apps/web/src/app/api/chat/route.ts` | Wrap the entire request as a root span with requestId | +~8 |
| `apps/web/.env.local` | Add `ARIZE_API_KEY` | +1 |
| `apps/web/package.json` | Add 2 OTEL dependencies | +2 |
| `apps/web/next.config.ts` | May need to allowlist OTEL packages if they trigger serverExternalPackages | +1 |

---

## Prerequisites / What You Need to Provide

Before any code changes, you need an Arize Cloud account and API key:

1. **Sign up** at https://app.arize.com/auth/join (Free tier)
2. **Create an API key**: Settings → API Keys → Create Key (starts with `phx_...`)
3. **Get the OTLP endpoint URL**: Arize shows this in the setup wizard. Typically `https://otlp.arize.com/v1/traces`
4. **Get your OpenRouter API key** if you want LLM-as-judge evals (already have this if the app is running)
5. **Provide both keys** to the implementation script or agent

The agent does NOT need access to your Arize account. It just needs the env var values.

---

## End Goal — What You Get

### 1. Tracing (visible in Arize Cloud immediately)

Every chat request becomes a **trace** with nested **spans**:

```
Trace: "What is JD Sports FY2027 revenue target?" (4.2s total)
├── Span: classify (120ms)
│   attributes: intent=DOCUMENT, confidence=0.94, stage=cache
├── Span: embed (85ms)
│   attributes: model=text-embedding-3-small, dimensions=1536
├── Span: search (210ms)
│   attributes: topK=40, topChunk=chunk_042, topScore=0.92, docCount=5
├── Span: rerank (340ms)
│   attributes: topK=3, model=llama-nemotron-rerank, pass=true
├── Span: generate (3475ms)
│   attributes: tokens_in=452, tokens_out=187, model=deepseek-v4-flash, cost=0.0032
│   attributes: citations=3, answer_preview="The targeted total revenue..." 
│   attributes: question="What is JD Sports UK FY2027 revenue target?"
```

You can search traces by: question text, latency range, error status, date range, or any attribute.

### 2. Dashboard (shown in Arize Cloud automatically)

- Latency over time: p50 / p95 / p99 charts
- Cost over time (in $, broken down by model)
- Error rate over time
- Token usage (in/out) over time
- Intent distribution pie chart
- Span breakdown: which stage is the bottleneck

### 3. Evals (on-demand, never auto-run)

In Arize Cloud UI:

1. Open any trace from the trace list
2. Click **"Evaluate"** button
3. Choose an evaluator from the library:
   - **Hallucination** — "Does the answer contain claims NOT supported by the cited sources?"
   - **QA Correctness** — "Does the answer correctly answer the question based on the context?"
   - **Relevance** — "Is the answer relevant to the question?"
   - **Toxicity** — "Does the answer contain harmful content?"
   - **Citation Precision** — "Are citations correctly attributed?"
4. Configure the judge model (use your OpenRouter key, pick DeepSeek V4 or any model)
5. Click **"Run"**
6. Score appears attached to that trace (0.0 - 1.0) with explanation

You decide when to run evals. Run them on:
- The 10 most recent traces after a deploy
- Traces with high latency (filter > 10s)
- Traces your user reported as wrong

**Cost**: Each eval call costs ~$0.001-0.003 via OpenRouter (you pay, not Arize).

### 4. How to verify it's working

```
1. Run the app locally: npm run dev
2. Ask a question: "What is JD Sports UK FY2027 revenue target?"
3. Open Arize Cloud → Traces tab
4. See the trace appear in < 5 seconds (OTEL is near real-time)
5. Click the trace → see 5 spans with attributes
6. Go to Dashboard → see latency and cost charts populate
7. Click a trace → Evaluate → Run "Hallucination" → see score
```

### 5. Staying in free tier forever

The Free tier allows 25K spans/month. At ~5 spans per question:
- 100 questions/day × 30 days = 15K spans/month → **safely under**
- 165 questions/day = 25K spans/month → **exactly at limit**
- 200+ questions/day → sample: `Math.random() < 0.5` = 50% sampling

Traces older than 15 days are auto-deleted by Arize. No manual cleanup needed.

---

## Verification Checklist for Agent

After implementation, verify:

- [ ] `npm run build` exits 0
- [ ] `cd apps/web && npx tsc --noEmit` exits 0
- [ ] Running app locally, sending a chat request, trace appears in Arize Cloud dashboard
- [ ] Spans have correct attributes (intent, tokens, cost, model, question, citations)
- [ ] Latency dashboard shows data points
- [ ] Click-to-eval works on any trace
- [ ] Error traces include error attributes
- [ ] OTEL init never blocks the streaming response (app works without Arize endpoint)
- [ ] No regressions in existing tests: `npm run test`

---

## Architecture Diagram (text)

```
User question
    │
    ▼
api/chat/route.ts (POST)
    │
    ▼
orchestrator.ts
    │
    ├── Span: classify ────── attributes: intent, confidence, stage
    ├── Span: embed ──────── attributes: model, dimensions
    ├── Span: search ──────── attributes: topK, topChunk, topScore
    ├── Span: rerank ──────── attributes: pass/fail, model
    └── Span: generate ───── attributes: tokens_in/out, model, cost, citations
                                    question, answer_preview
    │
    ▼
Streaming response to client (unchanged)
    │
    ▼ (fire and forget, non-blocking)
OTEL exporter → HTTPS POST → Arize Cloud OTLP endpoint
                                    │
                                    ▼
                            Arize Cloud UI:
                            - Traces (searchable)
                            - Dashboard (latency, cost, error rate)
                            - Eval (click to run hallucination check)
```

---

## Notes for the Implementer

- OTEL must be initialized BEFORE the app starts. Next.js `instrumentation.ts` runs at module init. This is the standard pattern.
- The `@opentelemetry/exporter-trace-otlp-http` package sends spans via HTTP POST. It does NOT block the request — spans are queued and sent in batches on a background interval.
- If the Arize endpoint is unreachable, OTEL drops spans silently. The app continues to work. No try/catch needed.
- Do NOT add `@opentelemetry/sdk-node` or `@opentelemetry/instrumentation-http` — those are auto-instrumentation packages and add unnecessary complexity. We only need manual instrumentation.
- The Arize Cloud endpoint and auth format will be provided by the Arize setup wizard after signup. For planning purposes, it follows this pattern:
  - URL: `https://otlp.arize.com/v1/traces`
  - Auth: `Authorization: Bearer phx_xxxxxxxxxxxxxxxx` via headers
- Span attribute values must be strings, numbers, or booleans. Objects must be serialized via `JSON.stringify()`.
- The `question` text should be stored as an attribute on the root span or the generate span for searchability.
- Cost calculation formula: `(tokens_in × input_price_per_token + tokens_out × output_price_per_token)`. Use model pricing from OpenRouter API or a hardcoded lookup table.
