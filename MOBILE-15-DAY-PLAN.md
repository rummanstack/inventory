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

*(filled in on Day 1, updated on Day 15)*
