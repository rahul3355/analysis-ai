# Code Review Checklist

Run this checklist against every component file before marking work complete.

## TypeScript

- [ ] Every component has an explicit `Props` interface (not inline types)
- [ ] No `any` type anywhere — use proper types or `unknown` + narrowing
- [ ] No `@ts-ignore` or `@ts-expect-error` comments
- [ ] All event handlers have correct event types (not generic `Event`)
- [ ] Enum-like values use union types: `"chat" | "documents"`, not `string`
- [ ] Date values use `Date` type, not `string`
- [ ] Array state is immutable: use spread `[...prev, new]`, not `push`

## Component Architecture

- [ ] File ≤ 150 lines (split if exceeded)
- [ ] Single responsibility: one component per file, one purpose per component
- [ ] Props are minimal: only what the component needs to render
- [ ] No prop drilling beyond 2 levels (extract shared state if needed)
- [ ] Named exports only: `export function Sidebar()` not `export default`
- [ ] No business logic in render — extract to helpers or hooks

## Imports

- [ ] Path alias used: `@/components/...` not `../../../components/...`
- [ ] Import order: React → external libs → local modules
- [ ] No unused imports
- [ ] No circular imports
- [ ] Icons imported individually: `import { FileText } from "lucide-react"`

## Styling

- [ ] All classes via Tailwind — no `style={{}}` props
- [ ] Conditional classes use `cn()` from `@/lib/cn`
- [ ] No hardcoded colors, spacing, or radii (design tokens only)
- [ ] Dark mode variants on all visual classes
- [ ] Responsive classes where needed: `md:` prefix for ≥768px
- [ ] No `!important` in any class

## State Management

- [ ] State lives in the closest common ancestor
- [ ] No unnecessary re-renders (state is granular, not monolithic)
- [ ] Side effects in `useEffect` with correct dependency arrays
- [ ] Cleanup functions for timers (`setTimeout` → `clearTimeout`)
- [ ] No direct DOM manipulation — use refs if needed

## Accessibility

- [ ] Interactive elements are semantic: `<button>` not `<div onClick>`
- [ ] Icons have `aria-hidden="true"` when decorative
- [ ] Icons have `aria-label` when they are the only content
- [ ] File input has associated label or button
- [ ] Focus is managed: auto-scroll, focus trap in modals (if any)
- [ ] Color is not the only indicator (always pair with text/icon)

## Error Prevention

- [ ] No `console.log` left in production code
- [ ] No TODO comments without a tracking reference
- [ ] No commented-out code blocks
- [ ] File names match component names (PascalCase.tsx)
- [ ] No duplicate key props in lists — use unique `id`, not array index
