# Analysis AI — Architecture

## System Design Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                  CLIENT TIER                                        │
│                                                                                     │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │  Browser (Next.js 16 App Router · React 19 · Tailwind v4)                    │  │
│  │                                                                               │  │
│  │  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────────────────┐   │  │
│  │  │   Sidebar    │  │   ChatView       │  │   DocumentsView              │   │  │
│  │  │  · navigation│  │  · MessageThread │  │  · UploadZone                │   │  │
│  │  │  · dark mode │  │  · InputBar      │  │  · DocumentList              │   │  │
│  │  └──────────────┘  │  · SourcesBlock  │  └──────────────────────────────┘   │  │
│  │                     │  · PipelineStatus│                                      │  │
│  │                     │  · BqPreview     │                                      │  │
│  │                     └──────────────────┘                                      │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                    POST /api/chat
                                  (Server-Sent Events)
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                API LAYER (Next.js Route Handlers)                   │
│                                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────────────────────┐  │
│  │  POST /api/chat  │  │  GET /api/health │  │  /api/documents/*              │  │
│  │  streaming SSE   │  │  health check    │  │  POST (upload) · GET (list)    │  │
│  └────────┬─────────┘  └──────────────────┘  │  DELETE (remove) · GET (dl)   │  │
│           │                                  └─────────────────────────────────┘  │
└───────────┼─────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           CORE PIPELINE (orchestrator.ts)                           │
│                                                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │  ① Intent Classification  (classifier.ts)                                    │  │
│  │                                                                               │  │
│  │  Pinecone Cache ──► Heuristic Patterns (96 regex) ──► LLM ──► Fallback      │  │
│  │       (0.95 sim)            (classifierHeuristics.ts)    (deepseek-v4-flash) │  │
│  │                                                                               │  │
│  │  Returns: DATABASE │ DOCUMENT │ HYBRID │ UNKNOWN                              │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                                 │
│               ┌────────────────────┼────────────────────┐                            │
│               ▼                    ▼                    ▼                            │
│  ┌──────────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐       │
│  │ ②a DOCUMENT Path    │  │ ②b DATABASE Path │  │ ②c HYBRID (both)       │       │
│  │                     │  │                  │  │                          │       │
│  │ executeRagPipeline  │  │ executeBqQuestion│  │ ③ Parallel: RAG + BQ    │       │
│  │ (pipeline.ts)       │  │ (bigqueryService)│  │   with fallback chains   │       │
│  └──────────┬──────────┘  └────────┬─────────┘  └──────────────────────────┘       │
│             │                      │                                                 │
│             ▼                      ▼                                                 │
│  ┌──────────────────────┐  ┌──────────────────┐                                     │
│  │ ③ Context Assembly  │◄─┤ ④ Answer Gen    │                                     │
│  │  merge doc chunks + │  │  OpenRouter LLM  │                                     │
│  │  BQ results +       │  │  streaming SSE   │                                     │
│  │  source indices     │  │  with citations  │                                     │
│  └──────────────────────┘  └──────────────────┘                                     │
│                                                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │  ⑤ Citation Building  ──►  map [N] markers to source chunks with excerpts  │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL SERVICES TIER                                      │
│                                                                                     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌───────────────────┐ │
│  │   OpenRouter   │  │    Pinecone    │  │ Google BigQuery│  │  Cloudflare R2    │ │
│  │                │  │                │  │                │  │                   │ │
│  │  · Chat LLM    │  │  · Doc vectors │  │  · jd_sports   │  │  · Document       │ │
│  │  · Embeddings  │  │  · Intent cache│  │  · 6 tables    │  │    storage        │ │
│  │  · Reranking   │  │  · BQ schemas  │  │  · NL2SQL      │  │  · Signed URLs    │ │
│  │  · SQL gen     │  │  · Golden exs  │  │                │  │                   │ │
│  └────────────────┘  └────────────────┘  └────────────────┘  └───────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
            │                      │                      │                            │
            ▼                      ▼                      ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          DATA STORES                                                │
│                                                                                     │
│  ┌─────────────────────────┐  ┌──────────────────────────────────────────────────┐  │
│  │  Local File Stores     │  │  External Databases                               │  │
│  │                        │  │                                                   │  │
│  │  · documents.json      │  │  · Pinecone index (analysis-ai)                   │  │
│  │  · sql-cache.json      │  │    ├─ (default)  → document chunks (1536d)       │  │
│  │                        │  │    ├─ intent-routing-cache  → cached intents     │  │
│  └─────────────────────────┘  │    ├─ bq-schemas            → table schemas     │  │
│                               │    └─ golden-queries        → few-shot SQL      │  │
│                               │                                                   │  │
│                               │  · BigQuery (jd_sports dataset)                  │  │
│                               │    ├─ products · orders · order_items            │  │
│                               │    ├─ users · inventory_items · events           │  │
│                               │                                                   │  │
│                               │  · Cloudflare R2 (analysis-ai-documents)         │  │
│                               │    └─ documents/{id}/{file}                      │  │
│                               └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          CROSS-CUTTING CONCERNS                                     │
│                                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────────────────────┐  │
│  │  OpenTelemetry   │  │  Semantic Cache  │  │  Observability (Arize AI)       │  │
│  │  (lib/trace.ts)  │  │  (cosine sim)    │  │  (optional OTLP export)         │  │
│  └──────────────────┘  └──────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## Request Lifecycle (Chat Query)

```
User sends message
        │
        ▼
POST /api/chat ──── input validation (uuid, message, documentIds)
        │
        ▼
orchestrate() ───── intent classification (cache → heuristics → LLM)
        │
        ├── DOCUMENT  ──► embed query → search Pinecone (topK=40)
        │                      → rerank (topK=3) → build doc context
        │
        ├── DATABASE  ──► semantic cache → select tables (Pinecone)
        │                      → LLM generates SQL (2 models × 2 attempts)
        │                      → validate SQL → execute BigQuery → format
        │
        ├── HYBRID    ──► both paths in parallel, fallback chains
        │
        └── UNKNOWN   ──► reply "I'm not sure how to answer that"
                │
                ▼
    SSE stream ─── status → sources → bq_result → text_delta → citations → done
```

## Component Tree

```
src/app/layout.tsx                    ← Root layout (fonts, global styles, dark mode class)
src/app/page.tsx                      ← Root page (view state: "chat" | "documents")
├── src/components/Sidebar.tsx        ← Fixed left sidebar (nav + footer)
├── src/components/chat/
│   ├── ChatView.tsx                  ← Chat container (thread + input bar)
│   ├── MessageThread.tsx             ← Scrollable message list
│   ├── MessageBubble.tsx             ← Single message (content + citations)
│   ├── SourcesBlock.tsx              ← Collapsible citation details
│   └── InputBar.tsx                  ← Pinned textarea + send button
└── src/components/documents/
    ├── DocumentsView.tsx             ← Documents container (upload + list)
    ├── UploadZone.tsx                ← Drag-and-drop upload area
    └── DocumentList.tsx              ← File list with status badges
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  app/page.tsx                                               │
│                                                             │
│  State:                                                     │
│    view: "chat" | "documents"                               │
│                                                             │
│  ┌──────────┐    ┌────────────────────────────────────┐     │
│  │ Sidebar  │    │ Main Area                          │     │
│  │          │    │                                    │     │
│  │ setView()├───►│ view === "chat"                    │     │
│  │          │    │   → <ChatView />                   │     │
│  │          │    │ view === "documents"               │     │
│  │          │    │   → <DocumentsView />              │     │
│  └──────────┘    └────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### ChatView Data Flow

```
ChatView.tsx
  State:
    messages: Message[]           ← Array of chat messages
    isLoading: boolean            ← Shows typing indicator
    input: string                 ← Current input text

  ┌────────────────────────────┐
  │ MessageThread              │
  │   messages, isLoading      │
  │   ┌─────────────────────┐  │
  │   │ MessageBubble       │  │
  │   │   message            │  │
  │   │   ┌───────────────┐ │  │
  │   │   │ SourcesBlock  │ │  │
  │   │   │  citations    │ │  │
  │   │   └───────────────┘ │  │
  │   └─────────────────────┘  │
  └────────────────────────────┘
  ┌────────────────────────────┐
  │ InputBar                   │
  │   input, onSend, isLoading │
  └────────────────────────────┘
```

### DocumentsView Data Flow

```
DocumentsView.tsx
  State:
    documents: Document[]         ← Array of uploaded documents

  ┌────────────────────────────┐
  │ UploadZone                 │
  │   onFilesSelected(files)   │─── Adds to documents array
  └────────────────────────────┘     with simulated progress
  ┌────────────────────────────┐
  │ DocumentList               │
  │   documents, onDelete      │
  └────────────────────────────┘
```

## State Management

### Strategy: Local React State (useState)

This is a single-page app with two isolated views. There is no shared state between Chat and Documents views, so **no global state management library is needed**.

| State | Location | Type | Reason |
|-------|----------|------|--------|
| `view` | `app/page.tsx` | `"chat" \| "documents"` | Controls which view is rendered |
| `messages` | `ChatView.tsx` | `Message[]` | Chat history, local to chat |
| `isLoading` | `ChatView.tsx` | `boolean` | Typing indicator state |
| `input` | `InputBar.tsx` | `string` | Current textarea value |
| `documents` | `DocumentsView.tsx` | `Document[]` | Upload list, local to documents |
| `expandedSources` | `MessageBubble.tsx` | `boolean` | Per-message sources toggle |
| `isDarkMode` | `Sidebar.tsx` | `boolean` | Dark mode toggle (applied to `<html>`) |

### Why Not Context/Redux/Zustand?

- Only two views with no cross-view data dependencies
- Mock data only (no API calls, no caching concerns)
- useState keeps components self-contained and easy to test
- Adding a state library would be unnecessary complexity

## Styling Architecture

### Tailwind CSS + Design Tokens

All DESIGN.md tokens are mapped into `src/app/globals.css` via Tailwind v4 `@theme`:

```css
/* Colors */
@theme {
  --color-primary: #17171c;
  --color-cohere-black: #000000;
  --color-ink: #212121;
  --color-deep-green: #003c33;
  --color-dark-navy: #071829;
  --color-canvas: #ffffff;
  --color-soft-stone: #eeece7;
  --color-pale-green: #edfce9;
  --color-pale-blue: #f1f5ff;
  --color-hairline: #d9d9dd;
  --color-border-light: #e5e7eb;
  --color-card-border: #f2f2f2;
  --color-muted: #93939f;
  --color-slate: #75758a;
  --color-body-muted: #616161;
  --color-action-blue: #1863dc;
  --color-focus-blue: #4c6ee6;
  --color-coral: #ff7759;
  --color-coral-soft: #ffad9b;
  --color-form-focus: #9b60aa;
  --color-on-primary: #ffffff;
  --color-on-dark: #ffffff;
  --color-error: #b30000;

  /* Spacing */
  --spacing-xxs: 2px;
  --spacing-xs: 6px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  --spacing-xxl: 32px;
  --spacing-section: 80px;

  /* Border Radius */
  --radius-xs: 4px;
  --radius-sm: 8px;
  --radius-md: 16px;
  --radius-lg: 22px;
  --radius-xl: 30px;
  --radius-pill: 32px;
  --radius-full: 9999px;
}

/* Fonts — must be @theme inline for next/font CSS variable resolution */
@theme inline {
  --font-display: var(--font-space-grotesk), Inter, ui-sans-serif, system-ui;
  --font-body: var(--font-inter), Arial, ui-sans-serif, system-ui;
  --font-mono: var(--font-jetbrains-mono), ui-monospace, monospace;
}
```

### Dark Mode Strategy

- Tailwind v4 `@custom-variant dark (&:is(.dark *))` in `globals.css`
- Toggle adds/removes `dark` class on `<html>` element
- All components use `dark:` variants for dark mode colors
- Dark mode palette:
  - Background: `primary` (#17171c)
  - Surface: slightly lighter dark
  - Text: `on-dark` (#ffffff) / `muted` (#93939f)
  - Borders: darker variants of hairline/border-light

### Utility Helper

```typescript
// src/lib/cn.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## File Structure

```
analysis-ai/
├── apps/
│   └── web/                          ← Next.js app (UI + API routes)
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx        ← Root layout (fonts, metadata, globals)
│       │   │   ├── page.tsx          ← Root page (view state management)
│       │   │   ├── globals.css       ← Tailwind v4 @theme + global styles
│       │   │   └── api/              ← API routes (chat, documents)
│       │   ├── components/
│       │   │   ├── layout/Sidebar.tsx
│       │   │   ├── chat/
│       │   │   │   ├── ChatView.tsx
│       │   │   │   ├── MessageThread.tsx
│       │   │   │   ├── MessageBubble.tsx
│       │   │   │   ├── SourcesBlock.tsx
│       │   │   │   ├── InputBar.tsx
│       │   │   │   ├── ChatEmptyState.tsx
│       │   │   │   ├── TypingIndicator.tsx
│       │   │   │   ├── DocumentSelector.tsx
│       │   │   │   └── MarkdownRenderer.tsx
│       │   │   └── documents/
│       │   │       ├── DocumentsView.tsx
│       │   │       ├── UploadZone.tsx
│       │   │       └── DocumentList.tsx
│       │   ├── server/               ← I/O services + clients + config
│       │   ├── core/                 ← Business logic (pipeline, chunker)
│       │   ├── hooks/
│       │   ├── lib/
│       │   └── fixtures/             ← Mock data
│       ├── public/
│       ├── tests/
│       ├── next.config.ts
│       ├── tsconfig.json             ← extends ../../tsconfig.base.json
│       └── package.json              ← name: "web"
├── packages/
│   ├── types/                        ← @analysis-ai/types (shared interfaces)
│   │   ├── src/
│   │   │   ├── index.ts             ← Re-exports
│   │   │   ├── message.ts           ← Message, Citation
│   │   │   ├── document.ts          ← Document
│   │   │   ├── api.ts               ← ChatRequest, ChatResponse, etc.
│   │   │   └── domain.ts            ← Domain entities
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── config/                       ← @analysis-ai/config (env validation)
│       ├── src/index.ts
│       ├── tsconfig.json
│       └── package.json
├── scripts/
│   ├── verify.sh / verify.ps1        ← Verification pipeline
│   ├── setup-bigquery.mjs            ← BigQuery data seeding
│   ├── generate-mock-pdfs.mjs        ← Mock PDF generation
│   └── testing/ + perf/              ← Test + perf scripts
├── .github/workflows/ci.yml          ← CI pipeline
├── docs/
│   ├── ARCHITECTURE.md               ← This file
│   ├── DESIGN.md                     ← Design system
│   ├── PROGRESS.md                   ← Task tracker
│   ├── GOAL.md                       ← Project goals
│   └── PLAN.md / REVIEW.md / EVAL.md
├── turbo.json                        ← Turborepo pipeline
├── tsconfig.base.json                ← Shared strict TS config
├── package.json                      ← npm workspaces root
└── .prettierrc
```

## Animation Constraints

All animations and micro-interactions must complete within **250ms**:

| Animation | Duration | Easing |
|-----------|----------|--------|
| Sources block expand/collapse | 200ms | ease-out |
| Hover state transitions | 150ms | ease |
| Focus ring appearance | 150ms | ease |
| Typing indicator dots | 200ms per cycle | ease-in-out |
| Status badge transitions | 150ms | ease |
| Sidebar collapse/expand | 200ms | ease-out |
| Drag-over border color | 150ms | ease |
| Progress bar width | 200ms | ease-out |

## Responsive Breakpoints

| Breakpoint | Sidebar | Main Area |
|------------|---------|-----------|
| ≥ 768px | Full sidebar (icons + labels) | Remaining width |
| < 768px | Icon-only sidebar (collapsed) | Full remaining width |
