# StockLedger Mobile — 15-Day "Native App Feel" Plan

**Goal:** On a phone, StockLedger should feel like a real mobile app (Facebook-app standard) — bottom tab bar, compact screens, card lists instead of tables, bottom sheets instead of modals, icons over words, **zero unnecessary sentences**. Desktop stays exactly as it is today.

**How to execute:** each day is one self-contained work session. Tell Claude *"execute Day N of MOBILE-15-DAY-PLAN.md"*. Every day ends with `npm --prefix frontend run build` passing and a check of the named screens at 390px width.

---

## Global rules (apply every day)

1. **Mobile-only changes.** Everything ships behind responsive breakpoints (`lg:hidden` / `hidden lg:block` or `max-lg:` variants). Desktop layout must not change.
2. **No new dependencies.** Tailwind + existing components only.
3. **Copy rule:** on mobile, labels are 1–2 words, no descriptions, no helper sentences. If a sentence exists on desktop, it is *hidden* on mobile, not shortened — desktop copy stays.
4. **Touch rule:** every tappable target ≥ 44px tall. Inputs ≥ 16px font size (kills iOS auto-zoom).
5. **Both languages:** any new label gets en + bn keys the same day.
6. **Design tokens only** — `rounded-card`, `shadow-card`, CSS variables. No hardcoded colors (dark mode must keep working).
7. **Exempt:** landing page, print sheets.

---

## Week 1 — App shell (this is 70% of the "app feel")

### Day 1 — Audit + baseline
- Walk every route in `frontend/src/app/routes.js` at 390×844 (Chrome device mode). Note per page: horizontal overflow, tiny touch targets, wasted text, table pain.
- Verify `frontend/public/site.webmanifest`: `display: "standalone"`, correct name (StockLedger), `theme-color` matches `--brand-strong`, 192/512 + maskable icons present.
- Output: a ranked "worst screens" list appended to this file under *Audit Notes*.
- **Done when:** audit notes committed; manifest verified/fixed.

### Day 2 — Bottom tab bar
- New `frontend/src/app/MobileTabBar.jsx`: fixed bottom, `lg:hidden`, safe-area-inset padding, 5 tabs:
  **Home** (`/dashboard`) · **Sell** (`/quick-sale` retail / `/morning-issue` dealer, by `tenant.sellerType`) · **Stock** (`/products`) · **Reports** (`/reports`) · **Menu** (opens Day 3 screen).
- Tabs filtered by `can`/`hasFeature` like the sidebar. Active tab = brand color + filled icon. Labels: one word, both locales.
- Mount in `AppLayout.jsx`; add bottom padding to the scroll container on mobile so content never hides behind the bar; move the floating Help button up on mobile (or into Menu).
- **Done when:** tab bar navigates on all roles, nothing overlaps, desktop untouched.

### Day 3 — Menu screen (replaces the hamburger drawer on mobile)
- New mobile-only full-screen Menu (route or overlay): user card on top (avatar, name, tenant), then the sidebar's sections as an app-style icon grid/list — same `APP_ROUTES` + access filtering the sidebar uses (`AppSidebar.jsx` logic, reused not duplicated).
- Language switch, theme toggle, tenant switcher, logout at the bottom.
- The hamburger in `TopHeader.jsx` disappears on mobile (tab bar + Menu replace it).
- **Done when:** every page reachable from Menu; drawer no longer opens on mobile.

### Day 4 — Compact header
- `SectionHeader` (`frontend/src/components/ui/DataDisplay.jsx`): on mobile hide `eyebrow` and `description`, shrink title (`text-lg`), actions collapse to icons where possible.
- `TopHeader.jsx` on mobile: slim single row — page title + 1–2 context actions. Date chip, search, anything secondary → hidden or in Menu.
- **Done when:** every page's above-the-fold on mobile is title + content, no paragraph of text.

### Day 5 — Touch & type foundation
- `frontend/src/index.css`: mobile adjustments — main padding tight (`px-3`), `.input` ≥ 44px height and 16px font on mobile, `.btn-primary`/`.btn-secondary` ≥ 44px on mobile, safe-area utilities (`pb-[env(safe-area-inset-bottom)]`).
- Add `viewport-fit=cover` to the viewport meta in `frontend/index.html`.
- **Done when:** no iOS zoom on input focus; all buttons pass the 44px check on the 5 busiest pages.

---

## Week 2 — Core screens

### Day 6 — Card-list pattern (kill tables on mobile)
- Build shared mobile list card (in `frontend/src/components/ui/`): title line + right-aligned value, one sub-line, status badge, whole card tappable. Tables get `hidden md:block`; cards get `md:hidden`.
- Convert **Products page** first as the reference implementation.
- **Done when:** Products on mobile = scrolling cards, zero horizontal scroll.

### Day 7 — Roll out card lists
- Same pattern: **Sales Invoices**, **Stock Movements**, **Shops/Customers**, **Suppliers**.
- Row actions move into the card (tap → detail/sheet), not tiny inline icon buttons.
- **Done when:** the 5 highest-traffic list pages have no mobile tables.

### Day 8 — Bottom sheets
- `frontend/src/components/ui/Modal.jsx`: on mobile, modals render as bottom sheets — slide up, drag-handle bar, full width, rounded top corners only, `max-h-[92dvh]` with internal scroll. Desktop keeps centered modals.
- Same treatment for `ConfirmationDialog` (compact sheet).
- **Done when:** open any form modal on mobile → it's a sheet; ESC/backdrop/scroll-lock still work.

### Day 9 — Forms one-hand pass
- All money/quantity inputs: `inputmode="decimal"`/`"numeric"`; phone: `inputmode="tel"`.
- Sheets with forms get a **sticky submit bar** at the bottom (button always visible, above safe-area).
- **Quick Sale page** (`features/retailer/quick-sale`) gets a dedicated pass: it must be fully usable with a thumb — big product search, big qty steppers, sticky total + charge button.
- **Done when:** a sale can be completed on a phone without pinching, zooming, or scrolling hunting for the submit button.

### Day 10 — Dashboard mobile
- Stat blocks → horizontal snap-scroll rows (`overflow-x-auto snap-x`) instead of tall stacked grids; charts get mobile heights; helper texts hidden on mobile (copy rule).
- Financial Health / Today's Profit panels: 2-column compact grid on mobile.
- Daily Close panel and report boxes stack cleanly, numbers stay `tabular-nums` right-aligned.
- **Done when:** dashboard fits in ~3 phone screens of scrolling and every number is readable without zoom.

---

## Week 3 — Flows, polish, ship

### Day 11 — Dealer field flows
- **Morning Issue** and **Evening Settlement** on mobile: step-like vertical layout, big numeric inputs, product rows as cards, sticky totals bar. These are used standing in a warehouse — optimize for speed and fat fingers.
- **Done when:** an issue and a settlement can each be completed on a phone in under 2 minutes.

### Day 12 — Reports + share
- Daily Reports + Daily Close mobile layout pass (cards stack, tables → cards where needed).
- Add **Share** action next to PDF download: `navigator.share` with the PDF file (falls back to download). WhatsApp-ready — this is how reports travel in your market.
- **Done when:** Daily Close can be generated and shared to WhatsApp from a phone.

### Day 13 — Copy trim day (both locales)
- Sweep `en.js` + `bn.js` usage on mobile: every visible description/hint/helper on mobile screens is either hidden or replaced by a ≤2-word label. Buttons become icon+word ("Add", "Save", "Share").
- Empty states on mobile: icon + 3–4 words + one button. No paragraphs.
- **Done when:** no full sentences visible on the 10 key mobile screens (except toasts/errors).

### Day 14 — App-feel details
- Pressed feedback (`active:scale-[0.98]` / `active:bg-…`) on all cards, tabs, buttons.
- Scroll restoration per tab; tab switch keeps page state where cheap.
- PWA check: install to home screen on Android — standalone window, correct icon, no browser chrome, dark-mode splash sensible. Fix whatever fails.
- Dark mode pass on all new mobile surfaces (tab bar, sheets, menu).
- **Done when:** installed-app walkthrough video-able: open from home screen → looks native end to end.

### Day 15 — Device QA + fix day
- Real devices: one cheap Android (the customer reality) + one iPhone Safari. Walk the 10 key screens ×2 themes ×2 languages.
- Lighthouse mobile run; fix the practical items (tap targets, contrast, CLS).
- Fix everything found; update this file's *Audit Notes* with before/after status.
- **Done when:** full demo flow (login → dashboard → sale → settlement → daily close → share) executed on a real phone with zero layout breaks.

---

## The 10 key mobile screens (QA checklist)

1. Dashboard · 2. Quick Sale · 3. Products · 4. Sales Invoices · 5. Morning Issue · 6. Evening Settlement · 7. Daily Reports + Daily Close · 8. Customer/Shop Due · 9. Menu · 10. Login/Register

## Audit Notes

*Day 1 audit — 2026-07-05. Static code walk of every `APP_ROUTES` page at the 390px breakpoint. Updated on Day 15 with before/after.*

### Baseline facts (apply to every page)

- **Tables everywhere:** 157 raw `<table>` occurrences across 72 feature files. Every list page is a table inside `overflow-x-auto` → horizontal scroll at 390px. This is the single biggest "not an app" signal (Days 6–7).
- **Inputs trigger iOS zoom:** `.input` is `h-10` (40px) + `text-sm` (14px) — below both the 44px touch floor and the 16px no-zoom floor (Day 5).
- **Touch targets under 44px:** `.icon-btn` 36×36, `.table-cell` rows ~42px, `Pagination` buttons `h-9` (36px), the `h-8` (32px) mini export buttons used on Products/Settlement/Sales Invoices headers.
- **No `inputmode` anywhere** in the frontend — every numeric field opens the full keyboard (Day 9).
- **Verbose copy:** 215 `description=` usages across 98 feature files; `SectionHeader` always renders eyebrow + title + description; every `StatCard`/metric has a helper sentence (Days 4, 13).
- **App shell:** on mobile `TopHeader` hides its entire right cluster (`hidden sm:flex`) and never renders the page title — the header is an ~80px bar containing only a hamburger. The floating Help button (`fixed bottom-6 right-6`) sits exactly where the Day 2 tab bar goes. `viewport` meta lacks `viewport-fit=cover`.
- **Modals** are centered boxes with `max-h-[calc(100vh-10rem)]`; on phones forms open as cramped floating cards (Day 8).

### Ranked worst screens (worst first)

1. **Evening Settlement** (`/settlements`) — 9-column table with **4 number inputs per row** (`w-24` each) → ~800px min width, heavy horizontal scroll *while entering data*. Extra-returns rows are 7-column grids; the summary `dl` mixes inputs and totals; submit button buried at the bottom of a very long page. The #1 field-use screen and the hardest to use today.
2. **Morning Issue** (`/morning-issue`) — 7-column entry table with 2 inputs per row (same `w-24` pattern), 5-field header grid, save button at the *top* (with a visible `Ctrl+S` kbd hint on mobile), totals at the bottom — total thumb-travel mismatch.
3. **Daily Reports + Daily Close** (`/reports`) — 8 stacked StatCards + **6 tables**, each table header carrying a 3-button `TableReportActions` cluster + chip + description → enormous scroll length; DSR table keeps 5 columns visible at 390px.
4. **Dashboard** (`/dashboard`) — 8+ panels stack single-column: 12 metric tiles each with an icon block, uppercase label, big number *and* helper sentence, then 8 ChartPanels each with a description paragraph. Easily 10+ phone screens tall; `px-7` tile padding wastes width.
5. **Quick Sale** (`/retailer/quick-sale`) — cash-session hero (eyebrow + title + paragraph) pushes the actual sale form below the fold; item rows are 6-column grids collapsing to tall stacks; money inputs `h-9 w-28` with no `inputmode`; submit is a normal button at the form's end (not sticky); visible `/` and `Ctrl+↵` kbd hints on mobile; receipt via `window.open` popup (mobile blockers).
6. **Sales Invoices** (`/retailer/sales-invoices`) — 9-column table (5 still visible at 390px incl. two icon-btn actions), 6 filter fields stacked above, 3 mini export buttons. Reference conversion target for Day 7.
7. **Products** (`/products`) — 9-column list table; header can carry up to 5 action buttons that wrap into a tall stack; 3 chips + 3 h-8 export buttons above the filters. Grid view (`grid-cols-2` on mobile) is already close to the Day 6 card pattern — convert list view, keep grid.
8. **Customer/Shop Due** (`/retailer/customer-due`, `/shop-due-ledger`) — 7-column ledger table (5 visible on mobile), 4 StatCards stacked, 4-button action row; date-range + customer picker grid is fine.
9. **Stock Movements / Suppliers / Shops / DSR Finance / Purchase Receive / Expenses etc.** — same table-page template as 6–8; inherit whatever Day 6–7 card pattern ships.
10. **Login/Register** — actually in good shape (single column, `h-11` inputs, no tables); only needs the 16px input font + `inputmode="email"` polish on Day 5/9.

### Manifest / PWA status (verified + fixed on Day 1)

- ✅ `display: "standalone"` was already set; 192/512 icons existed.
- 🔧 Fixed: name/short_name `"Stock Ledger"` → `"StockLedger"`.
- 🔧 Fixed: `theme_color` `#373373` → `#0e0c25` (`--brand-strong`); `index.html` `theme-color` meta had a third color (`#0f3d91`) → aligned to `#0e0c25`.
- 🔧 Added: `stockledger-icon-maskable-192x192.png` / `-512x512.png` (full-bleed navy, glyph inside the 80% safe zone — generated by flood-filling the white margin of the 512 icon) + `purpose: "maskable"` entries and `start_url: "/"`.
- ⏳ Still open for Day 5: `viewport-fit=cover` missing from the viewport meta.
