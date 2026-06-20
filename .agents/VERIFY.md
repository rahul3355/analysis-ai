# Verification Pipeline

Run this checklist after every phase completion and before advancing.

## Pre-flight

- [ ] All files saved (no unsaved changes in editor)
- [ ] No uncommitted changes that break imports

## Step 1: Lint

```bash
npm run lint
```

- [ ] Command exits 0
- [ ] No warnings about unused variables
- [ ] No warnings about missing dependencies in hooks
- [ ] No accessibility (a11y) warnings

## Step 2: TypeScript Type Check

```bash
npx tsc --noEmit
```

- [ ] Command exits 0
- [ ] No "Cannot find module" errors (check import paths)
- [ ] No "Property does not exist" errors (check interface definitions)
- [ ] No "implicitly has an 'any' type" errors

## Step 3: Production Build

```bash
npm run build
```

- [ ] Command exits 0
- [ ] No "Module not found" errors
- [ ] No "Build failed" messages
- [ ] Build output shows all routes compiled

## Step 4: Dev Server Smoke Test

```bash
npm run dev
```

- [ ] Server starts without errors
- [ ] Page loads at localhost:3000
- [ ] No console errors in browser
- [ ] No hydration mismatch warnings

## Phase-Specific Verification

### After Phase 1 (Setup)
- [ ] `src/app/globals.css` `@theme` includes all DESIGN.md tokens
- [ ] `src/types/index.ts` exports Message, Citation, Document
- [ ] Google Fonts load in `src/app/layout.tsx`

### After Phase 2 (Layout)
- [ ] Sidebar renders with two nav items
- [ ] Clicking Chat/Documents toggles the view
- [ ] No horizontal scrollbar at any viewport width

### After Phase 3 (Chat)
- [ ] Mock messages render with citations
- [ ] Citation badges are clickable
- [ ] Sources block expands/collapses
- [ ] Input bar stays pinned at bottom
- [ ] Empty state shows when no messages

### After Phase 4 (Documents)
- [ ] Upload zone accepts drag and drop
- [ ] File input filters to .pdf,.docx
- [ ] Mock documents show all 4 statuses
- [ ] Simulated upload progression works
- [ ] Delete button removes document

### After Phase 5 (Polish)
- [ ] Dark mode toggle works
- [ ] Layout intact at 768px viewport width
- [ ] All hover states visible
- [ ] All focus rings visible (tab through UI)
- [ ] No animation exceeds 250ms

## Recovery

If any step fails:
1. Read the error message carefully
2. Fix the root cause (not the symptom)
3. Re-run the full pipeline from Step 1
4. Add a lesson to AGENTS.md → "Lessons Learned"
