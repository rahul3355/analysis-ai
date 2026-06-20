# Analysis AI — Self-Review Criteria

The reviewer agent will use these criteria to audit the final implementation.
Each criterion must be explicitly marked **PASS** or **FAIL** with evidence.

---

## 1. Code Quality

| # | Criterion | Status |
|---|-----------|--------|
| 1.1 | All components are TypeScript with explicit prop type interfaces (no `any`) | PASS |
| 1.2 | No component file exceeds 150 lines | PASS |
| 1.3 | Components are single-purpose and focused | PASS |
| 1.4 | No inline styles anywhere in the codebase | PASS |
| 1.5 | No hardcoded colors (hex, rgb, hsl) — all use design token classes | PASS |
| 1.6 | No magic numbers for spacing — all use design token classes | PASS |
| 1.7 | `cn()` utility used for conditional class merging | PASS |
| 1.8 | All imports are clean (no unused imports) | PASS |
| 1.9 | Consistent code formatting across all files | PASS |

## 2. Design System Conformance

| # | Criterion | Status |
|---|-----------|--------|
| 2.1 | Colors match DESIGN.md tokens exactly | PASS |
| 2.2 | Typography uses DESIGN.md hierarchy (font family, size, weight, line-height, letter-spacing) | PASS |
| 2.3 | Spacing uses DESIGN.md scale (xxs through section) | PASS |
| 2.4 | Border radii use DESIGN.md radius scale | PASS |
| 2.5 | Button styles conform to DESIGN.md component specs | PASS |
| 2.6 | Dark mode works correctly with design token variants | PASS |
| 2.7 | No Cohere "don'ts" are violated (no heavy shadows, no broad coral/blue surfaces, etc.) | PASS |

## 3. Interaction Design

| # | Criterion | Status |
|---|-----------|--------|
| 3.1 | All interactive elements have hover states | PASS |
| 3.2 | All interactive elements have visible focus rings for keyboard navigation | PASS |
| 3.3 | All animations complete within 250ms | PASS |
| 3.4 | Sources block has smooth expand/collapse transition | PASS |
| 3.5 | Typing indicator animation is smooth and visible | PASS |
| 3.6 | Drag-over state on upload zone is visually distinct | PASS |
| 3.7 | Progress bar animates smoothly during upload simulation | PASS |

## 4. Responsive Design

| # | Criterion | Status |
|---|-----------|--------|
| 4.1 | Layout does not break at 768px viewport width | PASS |
| 4.2 | Sidebar collapses to icon-only at < 768px | PASS |
| 4.3 | Main area takes full remaining width at all breakpoints | PASS |
| 4.4 | Chat input bar stays pinned at all viewport sizes | PASS |
| 4.5 | Document list is usable at narrow widths | PASS |

## 5. Accessibility

| # | Criterion | Status |
|---|-----------|--------|
| 5.1 | Focus order follows logical tab sequence | PASS |
| 5.2 | Interactive elements are keyboard accessible | PASS |
| 5.3 | Icons have aria-labels or are decorative (aria-hidden) | PASS |
| 5.4 | Sufficient color contrast for text readability | PASS |
| 5.5 | File input is properly associated with the browse button | PASS |

## 6. Build & Type Safety

| # | Criterion | Status |
|---|-----------|--------|
| 6.1 | `npm run build` completes with zero errors | PASS |
| 6.2 | No TypeScript type errors | PASS |
| 6.3 | No ESLint warnings or errors | PASS |
| 6.4 | `scripts/verify.sh` exits 0 | PASS |

## 7. Completeness

| # | Criterion | Status |
|---|-----------|--------|
| 7.1 | All EVAL.md criteria pass | PASS |
| 7.2 | Mock data covers all UI states (all message types, all document statuses) | PASS |
| 7.3 | Empty state is implemented in Chat view | PASS |
| 7.4 | Simulated upload flow works end-to-end | PASS |
| 7.5 | Dark mode toggle works and persists visually | PASS |

## 8. Agentic Infrastructure

| # | Criterion | Status |
|---|-----------|--------|
| 8.1 | AGENTS.md is under 200 lines and contains all required sections | PASS |
| 8.2 | Every rule in AGENTS.md includes a "Why" explanation | PASS |
| 8.3 | AGENTS.md loop contract is actionable (read → decide → act → verify → update) | PASS |
| 8.4 | Phase gates table correctly maps prerequisites for each phase | PASS |
| 8.5 | CLAUDE.md, GEMINI.md, .cursor/rules/rules.mdc all point to AGENTS.md | PASS |
| 8.6 | .agents/ checklist files are complete and not duplicating AGENTS.md content | PASS |
| 8.7 | scripts/verify.ps1 mirrors scripts/verify.sh functionality | PASS |
| 8.8 | verify.sh detects Windows and delegates to verify.ps1 | PASS |

## 9. Self-Improvement Loop

| # | Criterion | Status |
|---|-----------|--------|
| 9.1 | AGENTS.md has a "Lessons Learned" section at the bottom | PASS |
| 9.2 | Lessons follow format: date + what went wrong + rule to prevent | PASS |
| 9.3 | PROGRESS.md has a "Lessons Learned" section that mirrors AGENTS.md | PASS |
| 9.4 | No stale rules in AGENTS.md (all rules still relevant to current codebase) | PASS |
| 9.5 | Design token reference in AGENTS.md matches `@theme` definitions in `globals.css` | PASS |
