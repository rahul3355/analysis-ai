# Analysis AI

> Conversational BI assistant that answers questions grounded in your documents and database — with inline source citations.

[![CI](https://github.com/USER/analysis-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/USER/analysis-ai/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org)

---

## Why This Exists

Business analysts spend **30–40% of their time** writing SQL queries and searching through contracts for specific clauses. Every query requires a subject-matter expert, tribal knowledge of database schemas, and manual cross-referencing between documents and data.

**Analysis AI eliminates that overhead.**

Instead of:

> "Can someone look up the termination clause in the Acme contract and tell me how many active customers we have in the West region?"

you ask:

> "What's the termination clause in the Acme contract and how many active customers are in the West region?"

And get a grounded answer with links to the source paragraph and the SQL that produced the numbers.

### Business Impact

| Metric | Improvement |
|---|---|
| Ad-hoc query turnaround | Hours → seconds |
| SQL/NL2SQL accuracy | 90%+ with self-healing retry |
| Contract lookup time | 15–30 min → instant |
| Cross-source (doc + DB) queries | Previously required manual join |
| Onboarding new analysts | Weeks → days |

---

## Features

- **Chat with Documents** — Upload PDFs/DOCXs and ask questions. Retrieval-augmented generation (RAG) over chunked, embedded, and reranked document text.
- **Natural Language to BigQuery** — Ask business questions in plain English. The system classifies intent, selects relevant tables, generates SQL, executes it, and cites the query.
- **Hybrid Intelligence** — Questions spanning documents and database are answered from both sources in a single response with separate citations.
- **Streaming Responses** — Real-time SSE pipeline: classify → search docs → query BigQuery → generate answer. Each stage emits status updates.
- **Inline Citations** — Every claim is backed by `[1]`, `[2]` markers that expand to the source text, document name, and relevance score.
- **Dark Mode** — Full design system with light/dark themes persisted to local storage.
- **Evaluation Suite** — 100+ golden test cases for benchmarking NL2SQL, document Q&A, and hybrid queries across accuracy, latency, and cost.

---

## Architecture

```
User → Sidebar + Chat/Documents Views
                          │
                     POST /api/chat
                          │
              ┌───────────┴───────────┐
              │   Intent Classifier    │
              │ (LLM + heuristic)      │
              └───────┬───────────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
    DOCUMENT      DATABASE     HYBRID
         │            │            │
    ┌────┴────┐  ┌────┴────┐  ┌───┴───┐
    │Pinecone │  │BigQuery│  │Both   │
    │RAG +    │  │NL2SQL  │  │       │
    │Reranker │  │Pipeline│  │       │
    └────┬────┘  └────┬────┘  └───┬───┘
         │            │            │
         └────────────┼────────────┘
                      │
              ┌───────┴───────┐
              │   LLM (via    │
              │  OpenRouter)  │
              │   Generate    │
              │   Answer +    │
              │   Citations   │
              └───────┬───────┘
                      │
              Streaming SSE →
              Chat UI renders
```

### Key Components

| Layer | Technology | Role |
|---|---|---|
| **Frontend** | Next.js 16 App Router, React 19, TypeScript strict | UI, state, streaming SSE client |
| **Styling** | Tailwind CSS v4, design tokens in `globals.css` | Themed, responsive UI |
| **Vector Store** | Pinecone | Document chunk embeddings, similarity search, reranking |
| **Database** | Google BigQuery | NL2SQL query execution |
| **LLM** | OpenRouter (multi-model) | Intent classification, SQL generation, answer synthesis |
| **Storage** | Cloudflare R2 (S3-compatible) | Document file storage |
| **Pipeline** | Custom orchestrator | Intent routing, fallback chains, streaming orchestration |

---

## Tech Stack

| Category | Choice |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript (strict mode) |
| **Monorepo** | npm workspaces + Turborepo |
| **UI** | React 19, Tailwind CSS v4, lucide-react |
| **Vector DB** | Pinecone |
| **Database** | Google BigQuery |
| **LLM Gateway** | OpenRouter |
| **PDF Parsing** | pdfjs-dist, pdf-lib |
| **DOCX Parsing** | mammoth |
| **Testing** | Vitest, Testing Library, Puppeteer |
| **CI** | GitHub Actions |

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 10
- A Pinecone index with embeddings
- A Google BigQuery dataset
- An OpenRouter API key
- Cloudflare R2 bucket (or any S3-compatible store)

### Installation

```bash
git clone https://github.com/USER/analysis-ai.git
cd analysis-ai
npm install
```

### Environment

Copy the example env file and fill in your credentials:

```bash
cp .env.example apps/web/.env.local
```

Required variables:

| Variable | Description |
|---|---|
| `PINECONE_API_KEY` | Pinecone API key |
| `PINECONE_INDEX_HOST` | Pinecone index host URL |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `GOOGLE_PROJECT_ID` | GCP project ID |
| `BQ_DATASET_ID` | BigQuery dataset ID |
| `R2_ENDPOINT` | S3-compatible endpoint |
| `R2_ACCESS_KEY_ID` | S3 access key |
| `R2_SECRET_ACCESS_KEY` | S3 secret key |
| `R2_BUCKET_NAME` | S3 bucket name |
| `R2_ACCOUNT_ID` | Cloudflare account ID |

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Verification

Run the full pipeline (lint → typecheck → test → build):

```bash
# Linux/macOS
bash scripts/verify.sh

# Windows PowerShell
.\scripts\verify.ps1
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |
| `npm run typecheck` | TypeScript `--noEmit` |
| `npm run eval` | Run golden dataset evaluation |
| `npm run eval:doc` | Document-only evaluation |
| `npm run eval:bq` | BigQuery-only evaluation |
| `npm run eval:hybrid` | Hybrid query evaluation |

---

## Project Structure

```
analysis-ai/
├── apps/
│   └── web/                    # Next.js application
│       ├── src/
│       │   ├── app/            # Pages, layouts, API routes
│       │   │   ├── layout.tsx  # Root layout (fonts, dark mode)
│       │   │   ├── page.tsx    # Root page (view router)
│       │   │   ├── globals.css # Design tokens
│       │   │   └── api/        # Chat, documents, health, query
│       │   ├── components/
│       │   │   ├── layout/     # Sidebar, Logo, SystemStatus
│       │   │   ├── chat/       # ChatView, MessageBubble, InputBar, SourcesBlock, etc.
│       │   │   └── documents/  # DocumentsView, UploadZone, DocumentList
│       │   ├── core/           # Pure business logic (zero I/O)
│       │   │   ├── pipeline/   # Intent classifier, orchestrator, RAG pipeline
│       │   │   ├── document/   # Text chunker
│       │   │   └── generate/   # Answer generation (scaffold)
│       │   ├── server/         # I/O services
│       │   │   ├── services/   # BigQuery, document, vector, cache, chat
│       │   │   ├── clients/    # BigQuery, Pinecone, OpenRouter, R2
│       │   │   ├── parsers/    # PDF, DOCX text extraction
│       │   │   └── config/     # Service configuration
│       │   ├── hooks/          # React hooks
│       │   └── lib/            # Utilities (cn, id, SSE types)
│       └── tests/              # Integration and E2E tests
├── packages/
│   ├── types/                  # Shared TypeScript interfaces
│   └── config/                 # Environment validation
├── docs/                       # Architecture, design, evaluation docs
├── golden/                     # Golden test dataset (100+ cases)
├── scripts/                    # CI, verification, data seeding
└── .github/workflows/          # CI pipeline
```

---

## Evaluation

The project includes a comprehensive evaluation suite in `golden/` with 100+ test cases spanning:

- **Document Q&A** — Answer extraction from PDF/DOCX content
- **NL2SQL** — Natural language → BigQuery SQL accuracy
- **Hybrid** — Multi-source questions requiring both docs and database
- **Performance** — Latency and cost tracking per query type

Run the full eval:

```bash
npm run eval
```

See [docs/EVAL.md](docs/EVAL.md) for methodology and [golden/REPORT.md](golden/REPORT.md) for latest results.

---

## Contributing

Contributions are welcome. Please open an issue first to discuss changes.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Design System

All colors, spacing, typography, and radii are defined as Tailwind v4 `@theme` tokens in `apps/web/src/app/globals.css`. No hardcoded colors. See [docs/DESIGN.md](docs/DESIGN.md) for full specifications.

### Rules

- No hardcoded colors or inline styles
- TypeScript strict — no `any`
- Components ≤ 150 lines
- Animations ≤ 250ms
- Only lucide-react for icons
- Pass `npm run verify` before committing

---

## License

[MIT](LICENSE)

---

## Roadmap

- [x] Chat with documents (RAG + Pinecone)
- [x] Natural language to BigQuery (NL2SQL)
- [x] Hybrid document + database queries
- [x] Streaming response pipeline
- [x] Inline source citations
- [x] Dark mode
- [x] Golden evaluation dataset
- [ ] Multi-user sessions
- [ ] Document folder organization
- [ ] Custom knowledge base connectors
- [ ] Admin analytics dashboard
