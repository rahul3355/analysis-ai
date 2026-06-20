# Analysis AI — Project Goal

## What We Are Building

**Analysis AI** is an internal business intelligence assistant that lets users:

1. **Upload contracts and documents** (PDF, DOCX) to a document store
2. **Chat with their documents** using a conversational interface
3. **Get answers grounded in both document content and BigQuery data**, with inline source citations

The frontend is a single-page application with two views—**Chat** and **Documents**—toggled via a fixed sidebar. There is no routing; view switching is entirely state-driven.

## What "Done" Looks Like

### Chat View
- Full-height message thread with auto-scroll
- Pinned input bar at the bottom (textarea, not input)
- Messages display with inline citation markers `[1]` `[2]`
- Clicking a citation toggles a collapsible sources block
- Sources block shows per-source metadata (icon, label, excerpt)
- Empty state with example question chips
- Typing indicator (animated dots) during loading
- User messages right-aligned, assistant messages left-aligned

### Documents View
- Drag-and-drop upload zone (PDF + DOCX only)
- File list with filename, upload date, status badge, delete button
- Progress bar for uploading/processing states
- Status badges: Uploading (grey), Processing (amber), Ready (green), Error (red)
- Simulated upload flow (uploading → processing → ready) for demo purposes

### Layout & Navigation
- Fixed left sidebar with Chat and Documents nav items
- Active nav item visually highlighted
- App name "Analysis AI" in sidebar footer
- Dark mode toggle in sidebar
- Responsive down to 768px (sidebar collapses to icon-only)
- Full viewport height, no outer scroll

### Design System Conformance
- All colors from DESIGN.md tokens (no hardcoded hex)
- All typography from DESIGN.md hierarchy
- All spacing from DESIGN.md spacing scale
- All border radii from DESIGN.md radius scale
- Hover and focus states on all interactive elements
- Animations ≤ 250ms

### Technical Requirements
- Next.js 14 App Router with TypeScript
- Tailwind CSS v4 `@theme` in `globals.css` with design tokens
- Zero build errors, zero type errors
- No inline styles, no magic numbers
- Components < 150 lines each
- Mock data for all UI states (no backend required)
