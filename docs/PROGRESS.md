# Analysis AI — Progress Tracker

## Phase 0 — Bootstrap
- [x] Pull design system (`npx getdesign@latest add cohere`)
- [x] Read DESIGN.md fully
- [x] Create GOAL.md
- [x] Create PLAN.md
- [x] Create PROGRESS.md
- [x] Create ARCHITECTURE.md
- [x] Create REVIEW.md
- [x] Create EVAL.md
- [x] Create scripts/verify.sh

### Agentic Infrastructure (added)
- [x] Research AGENTS.md standard, Boris Cherny practices, parallel agent strategies
- [x] Create AGENTS.md — canonical agent instructions with loop contract, phase gates, rules with reasons
- [x] Create CLAUDE.md — points to AGENTS.md
- [x] Create GEMINI.md — points to AGENTS.md
- [x] Create .cursor/rules/rules.mdc — points to AGENTS.md
- [x] Create .agents/VERIFY.md — verification pipeline checklist
- [x] Create .agents/DESIGN-AUDIT.md — design conformance audit checklist
- [x] Create .agents/CODE-REVIEW.md — code quality review checklist
- [x] Create scripts/verify.ps1 — Windows PowerShell verification script
- [x] Update scripts/verify.sh — cross-platform delegation to verify.ps1
- [x] Update EVAL.md — add agentic loop evaluation criteria
- [x] Update REVIEW.md — add agentic loop review criteria

### Agentic Infrastructure v2 (loop hardening)
- [x] Research latest loop engineering patterns: stop conditions, sub-agent review, Ralph Wiggum fresh context
- [x] Upgrade AGENTS.md loop contract — fresh context reset, peer review, stop conditions, escalation protocol
- [x] Add iteration budget caps to phase gates table
- [x] Add E24-E27 to EVAL.md (stop conditions, fresh context, peer review, budget caps)
- [x] User approval to proceed to Phase 1

## Phase 1 — Project Setup
- [x] Scaffold Next.js 14 App Router project
- [x] Install dependencies (lucide-react, clsx, tailwind-merge)
- [x] Configure `@theme` in `src/app/globals.css` with design tokens
- [x] Set up Google Fonts (Space Grotesk, Inter, JetBrains Mono)
- [x] Create `src/types/index.ts` with TypeScript interfaces
- [x] Create `src/lib/cn.ts` utility
- [x] **Gate: `npm run build` exits 0, `npx tsc --noEmit` exits 0**

## Phase 2 — Layout and Navigation
- [x] Create src/components/Sidebar.tsx
- [x] Create src/app/page.tsx (root page with view state)
- [x] Verify sidebar + view switching works
- [x] **Gate: Sidebar renders, view toggles between chat/documents**

## Phase 3 — Chat View
- [x] Create src/components/chat/ChatView.tsx
- [x] Create src/components/chat/MessageThread.tsx
- [x] Create src/components/chat/MessageBubble.tsx
- [x] Create src/components/chat/SourcesBlock.tsx
- [x] Create src/components/chat/InputBar.tsx
- [x] Wire up mock data (3 messages with varied citations)
- [x] Verify empty state, typing indicator, auto-scroll
- [x] **Gate: Chat view renders with mock messages, citations, sources block**

## Phase 4 — Documents View
- [x] Create src/components/documents/DocumentsView.tsx
- [x] Create src/components/documents/UploadZone.tsx
- [x] Create src/components/documents/DocumentList.tsx
- [x] Wire up mock data (4 documents, one per status)
- [x] Verify simulated upload flow
- [x] **Gate: Documents view renders with mock data, upload simulation works**

## Phase 5 — Polish and Design System Conformance
- [x] Re-read DESIGN.md, run .agents/DESIGN-AUDIT.md checklist
- [x] Audit all components — no hardcoded colors, spacing, radii
- [x] Add dark mode toggle
- [x] Responsive audit at 768px
- [x] Ensure all animations ≤ 250ms
- [x] Keyboard accessibility audit
- [x] Run .agents/CODE-REVIEW.md checklist
- [x] **Gate: All components pass design audit, dark mode works, responsive at 768px**

## Phase 6 — Verification and Self-Review
- [x] Run scripts/verify.ps1 — fix all errors until exit 0
- [x] Walk through every EVAL.md criterion — mark PASS/FAIL
- [x] Walk through every REVIEW.md criterion — mark PASS/FAIL
- [x] Fix any failures, re-verify, add lessons to AGENTS.md
- [x] Final sign-off
- [x] **Gate: verify.sh exits 0, all EVAL.md = PASS, all REVIEW.md = PASS**

---

## Phase 7 — Backend: Core Pipeline & AI Orchestration

### Document Processing
- [x] Create `src/core/document/chunker.ts` — text chunker (chunk_size=500, overlap=60, 30% overlap cap, min 100-char threshold)
- [x] Fix overlap stall bug that produced 1000+ chunks
- [x] Write 14 chunker unit tests (`__tests__/chunker.test.ts`)

### RAG Pipeline
- [x] Create `src/core/pipeline/pipeline.ts` — embed → Pinecone search → rerank → context assembly with confidence scores
- [x] Implement 100-entry LRU embedding cache
- [x] Implement reranker bypass for simple queries with high-confidence top result (score > 0.88)

### Query Expansion
- [x] Create `src/core/pipeline/queryExpander.ts` — expands H1/H2/Q1-Q4 with year suffix

### Fallback Responses
- [x] Create `src/core/pipeline/fallback.ts` — keyword-matched hardcoded responses (hoka, scotland, nike)
- [x] Source-aware fallback messages when both doc and BQ sources were queried with no results

### Central Orchestrator
- [x] Create `src/core/pipeline/orchestrator.ts` — "run both sources in parallel" pattern
- [x] Intent router deleted (replaced with parallel execution — eliminates routing errors)
- [x] Multi-source context assembly (documents + BigQuery) with `<source>` XML tags
- [x] DOC_RELEVANCE_MIN = 0.3 per-chunk relevance gate
- [x] AllZeroOrNull check for BQ 0-row results
- [x] Confidence labels in context lines (HIGH/MEDIUM/LOW)
- [x] max_tokens = 16000 everywhere

### Hallucination Gate
- [x] Create `src/core/pipeline/verification.ts` — term-overlap check between LLM claims and source chunks
- [x] Removes unsupported citation markers from reply
- [x] Triggers fallback when >30% of citations fail

### Non-Streaming LLM Integration
- [x] `processChatMessage()` and `processChatWithMessages()` — system/user role separation
- [x] `generateWithContext()` — context injected into system prompt
- [x] `generateWithContextStream()` — SSE streaming scaffold (not yet wired to frontend)
- [x] Context goes in system role, not user role (fixes "I am ready to answer" hallucination)

**Gate: 17 orchestrator tests + 14 chunker tests = 31 core pipeline tests passing**

## Phase 8 — Backend: External Service Integrations

### Pinecone Vector Store
- [x] Create `src/server/config/pinecone.ts` — Pinecone client config
- [x] Create `src/server/services/vectorService.ts` — upsertChunks (batched), searchChunks, deleteDocumentChunks, deleteAllChunks
- [x] Index: `analysis-ai` at `https://anlysis-ai-sj8lmb0.svc.aped-4627-b74a.pinecone.io`, 1536 dims

### BigQuery Integration
- [x] Create `scripts/setup-bigquery.mjs` — 6 tables, 94 rows of mock JD Sports UK data
- [x] Create `src/server/config/bigquery.ts` — 6 table schemas with column descriptions, join hints, relationship map
- [x] Create `src/server/clients/bigqueryClient.ts` — BigQuery SDK wrapper with timeout
- [x] Create `src/server/services/bigqueryService.ts` — NL-to-SQL via OpenRouter, keyword-based table selector, SQL validation, SQL cleaning (markdown fence removal + keyword spacing + whitespace normalization)
- [x] Project: `analysis-ai-499819`, service account at `analysis-ai-bigquery@analysis-ai-499819.iam.gserviceaccount.com`

### Embedding Service (OpenRouter)
- [x] Create `src/server/clients/embeddingClient.ts` — OpenRouter embedding with batch processing, retry (3 attempts with exponential backoff), concurrency limit
- [x] Model: `openai/text-embedding-3-small`, 1536 dims

### Reranking Service (OpenRouter)
- [x] Create `src/server/clients/rerankClient.ts` — OpenRouter reranking with retry
- [x] Model: `cohere/rerank-4-fast`

### Object Storage (Cloudflare R2)
- [x] Create `src/server/config/storage.ts` — R2 config (S3-compatible)
- [x] Create `src/server/clients/storageClient.ts` — upload, delete, presigned download URLs, list files

### LLM Chat (OpenRouter / DeepSeek)
- [x] Create `src/server/config/openrouter.ts` — model config (DeepSeek v4 Flash)
- [x] Create `src/server/services/chatService.ts` — OpenRouter API wrapper with timeout, rate-limit handling, auth error handling

**Gate: All 6 external services integrated (Pinecone, BigQuery, OpenRouter embed/rerank/chat, R2)**

## Phase 9 — Backend: API Routes & Document Management

### API Routes
- [x] `POST /api/chat` — orchestrates doc RAG + BigQuery, returns reply with citations + source context
- [x] `GET /api/chat` — health check
- [x] `POST /api/documents` — file upload (PDF/DOCX, 10MB limit) with 120s timeout
- [x] `GET /api/documents` — list all documents
- [x] `DELETE /api/documents?all=true` — delete all Pinecone vectors
- [x] `GET /api/documents/[id]` — get document status
- [x] `DELETE /api/documents/[id]` — delete document from Pinecone + R2 + persisted store
- [x] `GET /api/documents/[id]/download` — get presigned download URL

### Document Upload Pipeline
- [x] Create `src/server/parsers/pdfParser.ts` — pdfjs-dist v6, dynamic import (avoids Turbopack crash), parallel page extraction
- [x] Create `src/server/parsers/docxParser.ts` — mammoth-based DOCX parsing
- [x] Create `src/server/services/documentService.ts` — full pipeline: R2 upload → parse → chunk → embed → Pinecone upsert → mark ready

### Persistent Document Store
- [x] Create `src/server/services/persistedStore.ts` — file-based JSON store at `.analysis-ai/documents.json`
- [x] Debounced persistence (500ms debounce for intermediate updates, immediate flush for terminal states)
- [x] Survives server restarts

### Delete Workflow
- [x] Delete from Pinecone (filter by documentId)
- [x] Delete from R2 (S3 DeleteObject)
- [x] Delete from persisted store
- [x] Verified end-to-end

**Gate: All 5 API endpoints implemented, document lifecycle (upload → process → list → delete) complete**

## Phase 10 — Backend: Mock Data & Content

### JD Sports UK Mock PDFs (5 documents)
- [x] `fy2027_annual_sales_plan.pdf` — FY2027 plan with revenue targets by quarter, channel mix, cost assumptions
- [x] `nike_framework_agreement_2026.pdf` — Nike Framework Agreement terms, rebate thresholds, compliance KPIs
- [x] `back_to_school_2026_campaign_brief.pdf` — BTS 2026 campaign brief, marketing calendar, media plan
- [x] `q3_2026_regional_performance_review.pdf` — Q3 performance by region, Scotland deep-dive, Nike + Adidas vendor performance
- [x] `running_footwear_category_deep_dive_h1_2026.pdf` — Category overview, brand share, sell-through rates, top 10 SKUs
- [x] All placed in `frontend/public/mock-docs/` alongside content markdown source files

### BigQuery Mock Data (6 tables, 94 rows)
- [x] `products` — 12 products across Running/Lifestyle/Outerwear/Training/Accessories
- [x] `users` — 10 users across Scotland/England/Wales
- [x] `orders` — 20 orders across 6 regions, 3 channels
- [x] `order_items` — 20 line items with pricing, discounts, returns
- [x] `inventory_items` — 12 records across Manchester/Glasgow DCs
- [x] `events` — 20 events across page_view/add_to_cart/purchase/search

### Frontend Fixtures (UI mock data)
- [x] `src/fixtures/messages.ts` — 3 mock conversations: document-only, BigQuery-only, hybrid
- [x] `src/fixtures/documents.ts` — 5 mock documents (all "ready" status)

**Gate: 5 PDFs + 94 BQ rows + 3 mock conversations = complete realistic data set**

## Phase 11 — Backend: Testing & Integration

### Backend Test Coverage (74 tests)
- [x] 14 chunker unit tests (`chunker.test.ts`)
- [x] 17 orchestrator fallback tests (`orchestrator.test.ts` — covers all fallback paths, keyword matching, source-aware messages)
- [x] 11 ChatView component tests (includes fallback on API failure, keyword-matched fallback with citations)
- [x] 10 MessageBubble component tests
- [x] 6 InputBar component tests
- [x] 3 SourcesBlock component tests
- [x] 3 MessageThread component tests
- [x] 3 Sidebar layout tests
- [x] 3 UploadZone component tests
- [x] 3 DocumentsView component tests
- [x] 2 DocumentList component tests

### Key Decisions Made
- [x] **Intent router deleted** — replaced regex classifier with "run both sources in parallel, let LLM decide"
- [x] **Context in system role** — `processChatWithMessages()` sends context as system message, fixing hallucination
- [x] **No embedding-based routing** — canonical embedding approach requires hardcoded thresholds; run-all is simpler
- [x] **No LangGraph / Vercel AI SDK / LangChain** — custom orchestration sufficient for 2 sources
- [x] **No em dashes in LLM output** — enforced via system prompt
- [x] **No self-improving/self-training** — everything works immediately with zero training
- [x] **No streaming yet** — always returns JSON responses

### Remaining / Optional
- [ ] Integration tests for BigQuery + RAG pipeline (currently untested end-to-end)
- [ ] Wire streaming to frontend (SSE scaffold exists in `generateWithContextStream`)
- [ ] Restart dev server to pick up latest orchestrator.ts changes

**Gate: `npm run build` exits 0, `npx tsc --noEmit` exits 0, 74 tests pass**

---

## Parallel Execution Map

```
Wave 1 (sequential): Phase 1 → Phase 2
Wave 2 (parallel):   Phase 3 ║ Phase 4
Wave 3 (sequential): Phase 5 → Phase 6
Wave 4 (sequential): Phase 7 → Phase 8 → Phase 9 → Phase 10 → Phase 11
```

## Blockers
_None currently._

## Lessons Learned
- 2026-06-12 | Next.js 16 CLI does not support next lint command natively; it treats 'lint' as the project directory. Use eslint directly or npm run lint.
- 2026-06-12 | React 19 ESLint flags synchronous state changes inside useEffect on mount as cascading renders. Initialize state via lazy initializer and sync DOM in useEffect without calling setState.
- 2026-06-12 | React 19 ESLint flags calling impure functions like Date.now() inside the component render body (even inside handler definitions). Move unique ID generators outside the component scope as top-level helpers.
- 2026-06-12 | React hook cleanups referencing refs (like clearing arrays of intervals) can trigger warnings if ref.current is read during cleanup. Copy the ref value to a local variable inside the useEffect body first.
- 2026-06-12 | pdf-parse v5 depends on pdfjs-dist v5 which has a text extraction bug. Switch to direct pdfjs-dist v6 with dynamic import to avoid Turbopack crashes.
- 2026-06-12 | Chunker overlap stall: when chunk size creates tiny remaining segments, overlap can push cursor backwards. Fix: require min 100-char chunk length before applying overlap, cap overlap at 30% of chunk length.
- 2026-06-12 | Intent router is a source of bugs: regex patterns always miss edge cases. Deleting it and running both sources in parallel eliminates an entire class of routing errors.
