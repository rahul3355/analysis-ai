# Analysis AI — Implementation Plan

## Phase 0 — Bootstrap (Current)

### Tasks
1. Pull design system via `npx getdesign@latest add cohere` → generates `DESIGN.md`
2. Read `DESIGN.md` fully, internalize all design tokens
3. Create planning files: `GOAL.md`, `PLAN.md`, `PROGRESS.md`, `ARCHITECTURE.md`, `REVIEW.md`, `EVAL.md`
4. Create `scripts/verify.sh` (lint + type check + build)
5. Define verifiable pass/fail criteria in `EVAL.md`
6. Get user approval before proceeding

---

## Phase 1 — Project Setup

### Tasks
1. Scaffold Next.js 14 App Router project with TypeScript and Tailwind CSS
   ```
    npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"
   ```
2. Install dependencies: `lucide-react`, `clsx`, `tailwind-merge`
 3. Configure `@theme` in `src/app/globals.css` with all DESIGN.md tokens:
    - Colors: primary, cohere-black, ink, deep-green, dark-navy, canvas, soft-stone, pale-green, pale-blue, hairline, border-light, card-border, muted, slate, body-muted, action-blue, focus-blue, coral, coral-soft, form-focus, on-primary, on-dark, error
    - Typography: font families (display, body/UI, mono) via `@theme inline` + next/font
    - Spacing: xxs(2), xs(6), sm(8), md(12), lg(16), xl(24), xxl(32), section(80)
    - Border radius: xs(4), sm(8), md(16), lg(22), xl(30), pill(32), full(9999)
 4. Create `src/types/index.ts` with `Message`, `Citation`, `Document` interfaces
5. Update `PROGRESS.md`

### Font Strategy
Since CohereText, Unica77, and CohereMono are proprietary fonts, we will use the documented fallbacks:
- Display: `Space Grotesk` (from Google Fonts) → `Inter` → `ui-sans-serif` → `system-ui`
- Body/UI: `Inter` (from Google Fonts) → `Arial` → `ui-sans-serif` → `system-ui`
- Mono: `JetBrains Mono` (from Google Fonts) → `ui-monospace` → `monospace`

We load Space Grotesk, Inter, and JetBrains Mono via Google Fonts in `layout.tsx`.

---

## Phase 2 — Layout and Navigation

### Tasks
1. Create `components/Sidebar.tsx`
   - Fixed left sidebar, 100vh
   - Chat nav item (MessageSquare icon from lucide-react)
   - Documents nav item (FileText icon from lucide-react)
   - Active state uses design system accent
   - Footer: "Analysis AI" muted text + dark mode toggle
   - Responsive: collapses to icon-only at < 768px
2. Create `app/page.tsx` as root page
   - State: `view: "chat" | "documents"`
   - Renders Sidebar + main area (ChatView or DocumentsView)
   - Full viewport height, no outer scroll
3. Update `PROGRESS.md`

---

## Phase 3 — Chat View

### Tasks
1. Create `components/chat/ChatView.tsx`
   - Flex column, full height
   - Scrollable message thread (flex-1) + pinned input bar
   - Empty state with prompt text and example question chips
2. Create `components/chat/MessageThread.tsx`
   - Renders list of Messages
   - User messages right-aligned, assistant messages left-aligned
   - Auto-scroll on new messages
   - Typing indicator (three dots animation) when loading
3. Create `components/chat/MessageBubble.tsx`
   - Renders single message with basic markdown formatting
   - Citation markers as superscript badges [1] [2]
   - Click badge → toggle SourcesBlock
4. Create `components/chat/SourcesBlock.tsx`
   - Collapsible block (CSS transition on max-height, ≤ 250ms)
   - Each citation: icon + source label + excerpt
5. Create `components/chat/InputBar.tsx`
   - Textarea that grows up to 5 lines
   - Send button (ArrowUp icon)
   - Enter to send, Shift+Enter for newline
   - Disabled when loading
6. Wire up mock state with 3 messages demonstrating:
   - Document-only answer with citations
   - BigQuery-only answer with citations
   - Hybrid answer with both citation types
7. Update `PROGRESS.md`

---

## Phase 4 — Documents View

### Tasks
1. Create `components/documents/DocumentsView.tsx`
   - Header with title and subtitle
   - Upload zone + file list
2. Create `components/documents/UploadZone.tsx`
   - Dashed-border drop zone
   - File icon + instructional text
   - "Browse files" button → hidden file input
   - Accepts .pdf and .docx only
   - Drag-over visual feedback
3. Create `components/documents/DocumentList.tsx`
   - File rows: icon, filename, date, status badge, delete button
   - Status badges: uploading (grey), processing (amber), ready (green), error (red)
   - Progress bar for uploading/processing states
   - Hover state on rows
4. Wire up mock state:
   - 4 documents (one per status)
   - Simulated upload flow with setTimeout
5. Update `PROGRESS.md`

---

## Phase 5 — Polish and Design System Conformance

### Tasks
1. Re-read `DESIGN.md` in full
2. Audit every component:
   - No hardcoded hex colors → design token classes only
   - No hardcoded font sizes → design token classes only
   - Spacing rhythm consistent with DESIGN.md scale
   - Hover and focus states on all interactive elements
   - Focus rings for keyboard accessibility
3. Add dark mode toggle (html `dark` class strategy)
4. Responsive audit at 768px breakpoint
   - Sidebar collapses to icon-only
   - Main area takes full remaining width
5. Ensure all animations ≤ 250ms
6. Update `PROGRESS.md`

---

## Phase 6 — Verification and Self-Review

### Tasks
1. Run `scripts/verify.sh` → fix all errors until exit 0
2. Walk through every EVAL.md criterion → mark PASS/FAIL
3. Walk through every REVIEW.md criterion → mark PASS/FAIL
4. Fix any failures, re-verify
5. Final `PROGRESS.md` update
6. Declare complete only when all criteria pass

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `lucide-react` | Icon library for nav, status, and action icons |
| `clsx` | Conditional class name utility |
| `tailwind-merge` | Merge Tailwind classes without conflicts |

No additional packages will be installed without documenting the reason here first.
