# Analysis AI

> Conversational BI assistant — ask questions in plain English, get answers grounded in documents and databases with inline citations.

[![CI](https://github.com/USER/analysis-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/USER/analysis-ai/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org)

Eliminates the 30–40% of time analysts spend writing SQL and searching contracts. Ad-hoc queries go from hours to seconds.

---

## System Design

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT TIER                                          │
│  Browser (Next.js 16 · React 19 · Tailwind v4)                                      │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────────────────┐          │
│  │   Sidebar    │  │   ChatView       │  │   DocumentsView              │          │
│  │  · navigation│  │  · MessageThread │  │  · UploadZone                │          │
│  │  · dark mode │  │  · InputBar      │  │  · DocumentList              │          │
│  └──────────────┘  │  · SourcesBlock  │  └──────────────────────────────┘          │
│                     │  · BqPreview    │                                            │
│                     └──────────────────┘                                            │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                   │ POST /api/chat (SSE)
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          CORE PIPELINE (orchestrator.ts)                            │
│                                                                                     │
│  ① Intent Classification — Pinecone cache → 96 heuristics → LLM → fallback         │
│       Returns: DATABASE | DOCUMENT | HYBRID | UNKNOWN                               │
│                                                                                     │
│        ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐            │
│        │ ② DOCUMENT   │  │ ② DATABASE   │  │ ② HYBRID (both)         │            │
│        │ Pinecone RAG │  │ NL2SQL       │  │ parallel + fallback      │            │
│        │ embed→search │  │ cache→tables │  │ chains if one is empty   │            │
│        │ rerank→ctx   │  │ gen SQL→exec │  │                          │            │
│        └──────┬───────┘  └──────┬───────┘  └───────────┬──────────────┘            │
│               └─────────────────┼──────────────────────┘                            │
│                                 ▼                                                   │
│  ③ Context Assembly → ④ LLM Answer Gen (OpenRouter, streaming SSE with [N] cites) │
│  ⑤ Citation Building — map [N] markers to source chunks with excerpts              │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                   │ SSE stream
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SERVICES                                         │
│                                                                                     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌───────────────────┐ │
│  │   OpenRouter   │  │    Pinecone    │  │ Google BigQuery│  │  Cloudflare R2    │ │
│  │  · Chat LLM    │  │  · Doc vectors │  │  · jd_sports   │  │  · Document       │ │
│  │  · Embeddings  │  │  · Intent cache│  │  · 6 tables    │  │    storage        │ │
│  │  · Reranking   │  │  · BQ schemas  │  │  · NL2SQL      │  │  · Signed URLs    │ │
│  │  · SQL gen     │  │  · Golden exs  │  │                │  │                   │ │
│  └────────────────┘  └────────────────┘  └────────────────┘  └───────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           DATA STORES                                               │
│  · Pinecone: doc chunks (1536d) · intent cache · BQ schemas · golden queries        │
│  · BigQuery: products · orders · order_items · users · inventory_items · events     │
│  · Cloudflare R2: documents/{id}/{file}                                             │
│  · Local: documents.json (metadata) · sql-cache.json (semantic SQL cache)           │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Observability:** OpenTelemetry spans exported to **Arize AI** (optional) for tracing chat requests end-to-end — intent, model, latency, cost, sources, and SQL.

---

## Tech Stack

| Category | Choice |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript (strict) |
| **Monorepo** | npm workspaces + Turborepo |
| **UI** | React 19, Tailwind CSS v4, lucide-react |
| **LLM Gateway** | OpenRouter (deepseek-v4-flash, cohere north-mini-code, etc.) |
| **Vector DB** | Pinecone |
| **Analytical DB** | Google BigQuery |
| **Object Storage** | Cloudflare R2 (S3-compatible) |
| **Observability** | OpenTelemetry + Arize AI |
| **Testing** | Vitest, Testing Library, Puppeteer |

---

## Getting Started

```bash
git clone https://github.com/USER/analysis-ai.git
cd analysis-ai
npm install
cp .env.example apps/web/.env.local   # fill in credentials
npm run dev                            # http://localhost:3000
```

Required env vars: `PINECONE_API_KEY`, `PINECONE_INDEX_HOST`, `OPENROUTER_API_KEY`, BigQuery credentials (`GOOGLE_PROJECT_ID`, `BQ_DATASET_ID`), and R2 credentials.

Full verification: `npm run verify` (lint → typecheck → test → build).

---

## Evaluation

100+ golden test cases in `golden/` spanning document Q&A, NL2SQL, hybrid, and edge cases. Run with `npm run eval`. See [docs/EVAL.md](docs/EVAL.md).

---

## License

[MIT](LICENSE)
