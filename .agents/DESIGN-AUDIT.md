# Design System Audit Checklist

Run this checklist against every component before marking a phase complete.
Reference: [DESIGN.md](../DESIGN.md)

## Colors

- [ ] No hardcoded hex values in component files
  ```bash
  # Run this — should return 0 matches in src/
  grep -rn "#[0-9a-fA-F]\{3,8\}" src/components/ src/app/ --include="*.tsx"
  ```
- [ ] All background colors use design tokens: `bg-canvas`, `bg-primary`,
      `bg-soft-stone`, `bg-deep-green`, `bg-dark-navy`, `bg-pale-green`, `bg-pale-blue`
- [ ] All text colors use design tokens: `text-ink`, `text-muted`, `text-slate`,
      `text-body-muted`, `text-on-primary`, `text-on-dark`, `text-error`
- [ ] All border colors use design tokens: `border-hairline`, `border-border-light`,
      `border-card-border`
- [ ] Accent colors used correctly: `text-action-blue` for links,
      `text-coral` for taxonomy/warm accents only
- [ ] Dark mode variants present on all color classes: `dark:bg-*`, `dark:text-*`,
      `dark:border-*`

## Typography

- [ ] Display headings use `font-display` (Space Grotesk fallback)
- [ ] Body text uses `font-body` (Inter fallback)
- [ ] Monospace/technical labels use `font-mono` (JetBrains Mono fallback)
- [ ] Font sizes match DESIGN.md hierarchy:
  - Hero display: 96px (only if used)
  - Card heading: 32px → `text-[32px]`
  - Feature heading: 24px → `text-2xl`
  - Body large: 18px → `text-lg`
  - Body: 16px → `text-base`
  - Button: 14px / weight 500 → `text-sm font-medium`
  - Caption: 14px → `text-sm`
  - Micro: 12px → `text-xs`
- [ ] No bold weights used for hierarchy (size + spacing do the work per DESIGN.md)
- [ ] Letter spacing applied where DESIGN.md specifies negative tracking

## Spacing

- [ ] All padding/margin uses design token scale:
  - `p-xxs`/`m-xxs` (2px), `p-xs`/`m-xs` (6px), `p-sm`/`m-sm` (8px)
  - `p-md`/`m-md` (12px), `p-lg`/`m-lg` (16px), `p-xl`/`m-xl` (24px)
  - `p-xxl`/`m-xxl` (32px), `p-section`/`m-section` (80px)
- [ ] No hardcoded pixel values (p-[17px], m-[23px], etc.)
- [ ] Gap values use design token scale

## Border Radius

- [ ] Radius values use design tokens:
  - `rounded-xs` (4px), `rounded-sm` (8px), `rounded-md` (16px)
  - `rounded-lg` (22px), `rounded-xl` (30px), `rounded-pill` (32px)
  - `rounded-full` (9999px)
- [ ] Primary CTA buttons use `rounded-pill` (32px)
- [ ] Major media cards use `rounded-lg` (22px) or `rounded-sm` (8px)
- [ ] No `rounded-[Npx]` ad-hoc values

## Elevation & Depth

- [ ] No heavy drop shadows (DESIGN.md says "mostly flat")
- [ ] Depth comes from surface alternation, borders, rounded corners
- [ ] Borders use 1px `hairline`, `border-light`, or `card-border`

## Interactive States

- [ ] All buttons have hover states
- [ ] All clickable elements have cursor-pointer
- [ ] All focusable elements have visible focus rings
- [ ] Focus ring uses `focus-blue` (#4c6ee6) color
- [ ] Form inputs use `form-focus` (#9b60aa) for focus border
- [ ] Transition duration ≤ 250ms on all state changes

## Do's and Don'ts (from DESIGN.md)

### Verify these DO's:
- [ ] White canvas as default surface
- [ ] Primary CTAs are pill-shaped and near-black on light surfaces
- [ ] 22px radius on major media cards
- [ ] UI shell stays restrained (color comes from content, not chrome)

### Verify these DON'Ts:
- [ ] No coral or blue used as broad decorative surface colors
- [ ] No heavy drop shadows on cards
- [ ] No saturated gradients as normal UI backgrounds
- [ ] No rounded cards below 8px for major elements
