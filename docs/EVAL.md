# Analysis AI — Evaluation Criteria

Each criterion below is a **pass/fail** check. The implementation is only considered complete when **every** criterion is marked **PASS**.

---

## Build & Type Safety

| # | Criterion | How to Verify | Status |
|---|-----------|---------------|--------|
| E01 | App builds with zero errors | Run `npm run build` — exit code must be 0 | PASS |
| E02 | App builds with zero type errors | Run `npx tsc --noEmit` — exit code must be 0 | PASS |

## Sidebar & Navigation

| # | Criterion | How to Verify | Status |
|---|-----------|---------------|--------|
| E03 | Sidebar renders with Chat and Documents nav items | Visual inspection: sidebar visible with two labeled nav items | PASS |
| E04 | Clicking Documents switches main area to Documents view | Click Documents nav → main area shows DocumentsView | PASS |
| E05 | Clicking Chat switches main area to Chat view | Click Chat nav → main area shows ChatView | PASS |

## Chat View

| # | Criterion | How to Verify | Status |
|---|-----------|---------------|--------|
| E06 | Chat view renders a full-height message thread and pinned input bar | Visual inspection: thread fills available height, input bar at bottom | PASS |
| E07 | Messages render with inline citation markers [1] [2] | Visual inspection: assistant messages show superscript citation badges | PASS |
| E08 | Clicking a citation marker scrolls to or expands a sources block | Click citation badge → sources block expands/becomes visible | PASS |
| E09 | Sources block is collapsible and shows per-source metadata | Click sources label → block collapses; each source shows icon + label + excerpt | PASS |

## Documents View

| # | Criterion | How to Verify | Status |
|---|-----------|---------------|--------|
| E10 | Documents view renders a drag-and-drop upload zone | Visual inspection: dashed-border upload area with icon and text | PASS |
| E11 | Upload zone accepts PDF and DOCX files | Check file input `accept` attribute contains `.pdf,.docx` | PASS |
| E12 | Uploaded files appear in a list with filename and upload date | Drop/select a file → appears in list with name and date | PASS |
| E13 | Each file shows a progress bar while in "processing" state | Mock data includes processing file → progress bar visible | PASS |
| E14 | Each file shows a green Ready badge when in "ready" state | Mock data includes ready file → green "Ready" badge visible | PASS |
| E15 | Each file has a delete button | Visual inspection: trash icon on each file row | PASS |

## Responsive Design

| # | Criterion | How to Verify | Status |
|---|-----------|---------------|--------|
| E16 | Layout is fully responsive down to 768px width | Resize viewport to 768px → layout intact, no overflow/breakage | PASS |

## Design System Conformance

| # | Criterion | How to Verify | Status |
|---|-----------|---------------|--------|
| E17 | All components conform to DESIGN.md typography, spacing, and color tokens | Code audit: grep for hardcoded values, verify token usage | PASS |
| E18 | No hardcoded colors — all colors use design system tokens | Run `grep -rn "#[0-9a-fA-F]\{3,8\}" src/components/ src/app/` → no matches | PASS |

---

## Agentic Infrastructure

| # | Criterion | How to Verify | Status |
|---|-----------|---------------|--------|
| E19 | AGENTS.md exists and contains loop contract, phase gates, rules with reasons | Read AGENTS.md — sections present: Rules (8 with reasons), Agentic Loop Contract, Phase Gates | PASS |
| E20 | CLAUDE.md, GEMINI.md, .cursor/rules/rules.mdc all reference AGENTS.md | Read each file — contains reference to AGENTS.md as canonical source | PASS |
| E21 | .agents/ directory contains VERIFY.md, DESIGN-AUDIT.md, CODE-REVIEW.md | `ls .agents/` shows all 3 files | PASS |
| E22 | scripts/verify.ps1 exists and runs on Windows | `powershell -File scripts/verify.ps1` executes (may fail pre-scaffold but must not error on missing script) | PASS |
| E23 | AGENTS.md has Lessons Learned section | Read AGENTS.md — section exists at bottom | PASS |
| E24 | AGENTS.md loop contract includes explicit stop conditions (max failures, no-progress detection, phase cap) | Read AGENTS.md — "Stop Conditions" section exists with thresholds and actions | PASS |
| E25 | AGENTS.md loop contract includes fresh-context reset per tick | Read AGENTS.md — loop begins with a RESET CONTEXT or equivalent step | PASS |
| E26 | AGENTS.md loop contract includes peer review step (sub-agent or separate reviewer) | Read AGENTS.md — loop includes a review step before UPDATE, using fresh context | PASS |
| E27 | Phase gates table includes budget caps per phase | Read AGENTS.md — "Budget Cap" column exists in phase gates table | PASS |

## Phase Gates

| # | Criterion | How to Verify | Status |
|---|-----------|---------------|--------|
| E28 | Phase 1 gate passes before Phase 2 starts | `npm run build` exits 0, `npx tsc --noEmit` exits 0, types/index.ts exists | PASS |
| E29 | Phase 2 gate passes before Phase 3/4 starts | Sidebar renders, view toggles work | PASS |
| E30 | Phase 3 gate passes before Phase 5 | Chat view renders with mock data, citations, sources block | PASS |
| E31 | Phase 4 gate passes before Phase 5 | Documents view renders with mock data, upload simulation | PASS |
| E32 | Phase 5 gate passes before Phase 6 | Design audit passes, dark mode works, responsive at 768px | PASS |

---

## Summary

| Category | Criteria Count | Passed | Failed |
|----------|---------------|--------|--------|
| Build & Type Safety | 2 | 2 | 0 |
| Sidebar & Navigation | 3 | 3 | 0 |
| Chat View | 4 | 4 | 0 |
| Documents View | 6 | 6 | 0 |
| Responsive Design | 1 | 1 | 0 |
| Design System Conformance | 2 | 2 | 0 |
| Agentic Infrastructure | 9 | 9 | 0 |
| Phase Gates | 5 | 5 | 0 |
| **Total** | **32** | **32** | **0** |

**Overall Status: COMPLETE / ALL CHECKS PASSED**
