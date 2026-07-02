---
description: Execute one phase of the world-class design upgrade plan (usage: /design-upgrade phase-1 … phase-5, or "audit")
---

# StockLedger Design Upgrade — World-Class SaaS Polish

You are executing a design refinement plan for the StockLedger frontend. The goal aesthetic is **calm, dense, premium** — like Linear, Stripe, Attio, Mercury. NOT friendly/playful/template-like.

The user passed this argument: `$ARGUMENTS` — execute only that phase. If no argument was given, ask which phase to run.

## Ground rules (apply to every phase)

1. **Read the `frontend-patterns` skill first** before touching any file.
2. **Never hardcode colors.** Every color must route through the CSS variables in `frontend/src/index.css` and the Tailwind mappings in `frontend/tailwind.config.js`. This is what makes the app rethemeable — breaking it is a rejected change.
3. **Change tokens, not components, whenever possible.** The token system exists so one edit in `index.css` restyles the whole app. Only edit individual components when a value is hardcoded there (that hardcoding is itself a bug — migrate it to a token).
4. **Landing page is exempt** (`frontend/src/features/landing/**`) — it intentionally uses gradients and expressive styling. These rules apply to the logged-in app only.
5. **Print sheets are exempt** (`*PrintSheet.jsx`, `PrintableSheet.jsx`) — do not restyle printable documents.
6. **Do not add dependencies.** No Framer Motion, no component libraries. Everything here is achievable with Tailwind + CSS.
7. **Verify visually.** After changes, run `npm --prefix frontend run build` to confirm no build errors. Describe what changed and on which pages the user should look.
8. **Small commits per logical change**, not one mega-commit.

## Design direction (the target look)

- Hairline borders (`border-slate-200`) + `shadow-sm` instead of large blurred shadows
- Radii: 12–16px cards, 8–10px inputs/buttons (currently 28px — too bubbly)
- Big shadows reserved for floating elements only (modals, popovers, dropdowns)
- `font-semibold` + `tabular-nums` for data values (currently `font-black` — too heavy)
- Slight negative letter-spacing (`-0.01em`) on headings
- Gradients removed from the app shell; solid subtle surfaces instead
- Whitespace discipline: consistent spacing scale, no arbitrary gaps
- Color used sparingly and only with meaning (status, brand accent) — most UI is neutral slate

---

## Phase 1 — Token-level restyle (radii, shadows, typography)

Highest impact, lowest risk. Work in `frontend/src/index.css` and `frontend/tailwind.config.js`:

1. Add radius tokens to `:root`: `--radius-card: 14px`, `--radius-control: 10px`, `--radius-pill: 9999px`. Map them in Tailwind config (`borderRadius: { card: 'var(--radius-card)', control: 'var(--radius-control)' }`).
2. Tighten the shadow tokens (`--shadow-soft`, `--shadow-crisp`, `--shadow-card`): reduce blur/spread dramatically — e.g. `--shadow-card: 0 1px 2px rgba(var(--slate-900), 0.04), 0 1px 3px rgba(var(--slate-900), 0.06)`. Keep `--shadow-modal` prominent (floating elements deserve depth).
3. Grep the app (excluding `features/landing`) for hardcoded `rounded-[28px]`, `rounded-[24px]`, `rounded-3xl`, and inline `shadow-[0_18px...]` values — replace with the new tokens/utilities. Key file: `frontend/src/components/ui/DataDisplay.jsx` (StatCard uses `rounded-[28px]` and a huge inline shadow).
4. StatCard values: `font-black` → `font-semibold tabular-nums`. Section/page titles: add `tracking-tight`.
5. Remove `bg-gradient-to-br from-white to-*-soft` card backgrounds in StatCard — use solid white/surface with the tone expressed via the icon chip and accent bar only.
6. Check `.panel`, `.panel-strong`, `.brand-chip`, `.page-title` component classes in `index.css` and align them to the new tokens.

Deliverable: dashboard and one list page look noticeably calmer/tighter with zero component-logic changes beyond class swaps.

## Phase 2 — Tables (the product IS tables)

This is an inventory/POS app; tables are where quality is judged.

1. Find the shared table styles/components (check `index.css` for `.table` classes and `DataDisplay.jsx`). If tables are styled ad-hoc per page, first extract a shared pattern.
2. Numeric columns: right-aligned + `tabular-nums`. Text columns: left-aligned. Never center data columns.
3. Sticky header (`sticky top-0` with solid bg + bottom hairline) on scrollable tables.
4. Row hover: subtle `hover:bg-slate-50`, and move row action buttons to appear on hover (`opacity-0 group-hover:opacity-100 focus-within:opacity-100` — keep them keyboard-accessible).
5. Consistent cell padding everywhere: pick one density (e.g. `px-4 py-2.5 text-sm`) and enforce it.
6. Column headers: `text-xs font-semibold uppercase tracking-wider text-slate-500`.

Apply to the 3 highest-traffic pages first: `frontend/src/features/products/pages/ProductsPage.jsx`, `frontend/src/features/retailer/sales-invoices/pages/SalesInvoicesPage.jsx`, `frontend/src/features/stock-movement/pages/StockMovementPage.jsx`. Then report what other pages need the same treatment.

## Phase 3 — Consistency sweep

1. Inventory the shared primitives (`SectionHeader`, `StatCard`, `Modal`, buttons, `.panel` classes, empty states, skeletons).
2. Pick 5 reference pages that use them correctly (Dashboard is likely one).
3. Sweep every page under `frontend/src/features/**/pages/` (excluding landing) and fix drift:
   - Every page starts with `SectionHeader` (eyebrow + title + description + actions) — same header anatomy everywhere.
   - One primary button per view; everything else secondary/ghost.
   - Same empty-state pattern (icon + one-line message + CTA) and same skeleton pattern.
   - Same spacing scale between sections (pick one: `space-y-6`).
4. Produce a checklist of pages fixed vs. pages still drifting; work in batches of ~5 pages per commit.

## Phase 4 — Premium signals: command palette + dark mode

**4a. Command palette (Ctrl+K) — already built, needs polish:**
- The palette EXISTS at `frontend/src/app/CommandPalette.jsx` — route search over `APP_ROUTES`, entity search (products, DSRs, SRs, suppliers, shops, retail customers), recent pages, and `can`/`hasFeature` access-control filtering are all done. Do NOT rebuild it.
- Restyle it to the Phase 1 tokens: it still uses `font-black` (e.g. the `Highlight` match styling) and pre-Phase-1 radii/shadows — align with the calm/dense direction.
- Verify keyboard behavior still holds after restyling: Ctrl+K / Cmd+K to open, arrows to navigate, Enter to go, Esc to close.
- Verify all visible strings route through `t()`; fix any that don't.

**4b. Dark mode:**
- The entire palette already routes through CSS variables stored as "R G B" channels precisely to enable this. Add a `[data-theme="dark"]` block in `index.css` redefining the variable set (slate scale inverted, surfaces dark, brand adjusted for contrast).
- Toggle in the profile/settings area, persisted to localStorage, applied on `<html>` before first paint (inline script in `index.html` to avoid flash).
- Charts: `frontend/src/components/ui/charts.jsx` reads colors via `getCssVar` — verify charts re-read on theme change.
- Do dark mode ONLY after Phases 1–3, otherwise you'll theme inconsistent styles.

## Phase 5 — Motion system

1. Standardize in `index.css`: two duration tokens (`--motion-fast: 150ms`, `--motion-base: 250ms`), one easing (`cubic-bezier(0.16, 1, 0.3, 1)` — already used by `modal-enter`).
2. Add enter animations for dropdowns/popovers (`Select.jsx`, `SearchableSelect.jsx`, `DatePicker.jsx`) — scale from 0.98 + fade, 150ms.
3. Button press feedback: `active:scale-[0.98]` on primary buttons.
4. Add a global `@media (prefers-reduced-motion: reduce)` block that disables all animations/transitions (currently missing — this is an accessibility requirement).
5. Audit that no animation exceeds 300ms and nothing bounces.

## "audit" mode

If the argument is `audit`: don't change anything. Read the key files (`index.css`, `tailwind.config.js`, `DataDisplay.jsx`, `Modal.jsx`, 5 sample pages), score each phase's current state 1–10 with evidence (file:line), and output a prioritized findings report.
