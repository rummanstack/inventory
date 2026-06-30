---
name: project-overview
description: The master reference for StockLedger (Arinda Inventory System). Read this first — or reference it when you need to understand what the project is, what every domain module does, how the monorepo is laid out, how deployment works, key conventions, and what's currently dead code. This is the single source of truth about the whole application.
---

# StockLedger — Everything You Need to Know

Hey Claude 👋 This is your complete map of StockLedger. Read this once and you'll understand the whole system. It covers what the app does, who uses it, how it's built, and all the little "gotchas" that would otherwise take hours to discover.

---

## What Is This App?

**StockLedger** (branded as Arinda Inventory System) is a **multi-tenant SaaS** for small and medium businesses in Bangladesh. It handles:

- Inventory management
- Retail POS (point of sale)
- Dealer/DSR distribution
- Supplier purchasing
- Finance & accounting
- Platform administration (managing tenants)

Businesses (tenants) subscribe and get their own isolated data. A platform admin (us) manages all tenants from a special platform view.

The app is bilingual: **English and Bengali (বাংলা)**. The `language` preference is per-user and affects date formatting, number formatting, and all UI text.

---

## Monorepo Layout

```
backend/      Node.js + Express API — ESM modules, runs with node --test for tests
frontend/     React 18 + Vite + Tailwind SPA
api/          Vercel serverless entry — api/[...path].js wraps backend/runtime.js
scripts/      render-build.mjs — builds frontend, copies dist to both deploy targets
```

**Important:** Root `package.json` only proxies scripts into `backend/` and `frontend/`. There is **no root `node_modules`**. Always run:
- Backend commands: `npm --prefix backend run <script>`
- Frontend commands: `npm --prefix frontend run <script>`

---

## Two Deploy Targets, One Codebase

The same backend code deploys two ways:

| Target | Entry point | How it runs |
|---|---|---|
| **Render** (long-running) | `backend/server.js` | Listens on `$PORT`, serves static files from `backend/public/dist` |
| **Vercel** (serverless) | `api/[...path].js` → `backend/runtime.js` | Serverless function, static served separately |

Both entry points delegate to **`backend/composition.js`** (`createBackendApp`) — the single composition root. Never wire services or routes anywhere else.

`scripts/render-build.mjs` builds the frontend and copies `frontend/dist` into **both** `/public` (Vercel) and `backend/public/dist` (Render) in one shot.

---

## All Domain Modules (what the app actually does)

### 🏷️ Inventory
Products, categories, stock movements, product serials, damaged stock, low-stock alerts, warranty claims. Stock quantity (`products.stock_pieces`) is **never set directly** — it's always derived by summing `stock_movements` rows. The `checkInvariants` script verifies this.

### 🚚 Dealer / DSR Distribution
DSRs = Delivery Sales Reps. Shops = their retail customers.
- **Morning issue**: stock issued to a DSR at the start of the day
- **Evening settlement**: DSR returns unsold stock + cash (reconciliation)
- DSR due ledger + cash advances
- SR due ledger (Sales Reps)

### 🛒 Retail POS
- Quick sale (fast POS terminal)
- Sales invoices (full invoice flow)
- Sales returns
- Retail customers with due ledger + due collection
- Cash sessions (open/close daily cash register)
- Promotions & loyalty
- Customer statements

### 📦 Purchasing
Suppliers, purchase receive, supplier payments, supplier due ledger, supplier statements, supplier discounts.

### 💰 Finance
Finance accounts (cash/bank), account transactions, account transfers, expenses, finance dashboard with sparklines and trend data, profit reports.

### 🔧 Special / Add-ons
- **Pharmacy / Batch tracking**: drug batch management, batch sales reports, expiry tracking
- **Repair jobs**: kanban-style repair workflow (Received → Diagnosing → Awaiting Parts → In Repair → Ready → Delivered)
- **Warranty claims**: linked to repair jobs
- **Trade-ins**: trade-in valuation and sale
- **Quotations**: pre-sale quotation generation
- **HR / Salary**: salary payments, salary advances, salary structure (⚠️ pages exist but have NO routes — see dead code section)

### 🏢 Platform / System (admin-only)
Tenants, users, roles/permissions management, org settings, activity logs / audit trail, database backups, help desk, visitor chat (public widget + admin view), system health, error logs, issue center, trash.

---

## Key Conventions (things that will burn you if you forget them)

### IDs
All IDs are **prefixed UUID strings**, never serial integers:
```js
import { createId } from '../lib/ids.js';
const id = createId('prod'); // → "prod-550e8400-e29b-41d4-..."
```
Each entity has its own prefix: `prod-`, `supp-`, `inv-`, `cust-`, etc.

### Tenant isolation
Every business table has a `tenant_id` column. **Every query must filter `WHERE tenant_id = $1`**. There is NO database-level row security — isolation is entirely in application code. This is tested in `backend/tests/tenantIsolation.test.js`. Breaking this is a critical security bug.

### Derived / aggregate fields
`products.stock_pieces`, ledger balances, finance account balances — **never set by the client**. Always recomputed from movement/transaction rows. Run `npm --prefix backend run check:invariants` after touching any of these to verify consistency.

### Sequential business document numbers
Invoice numbers, purchase numbers, claim numbers, ticket numbers all use a `*_number_counters` table per tenant for **gapless sequential numbering**. See `backend/lib/purchaseNumber.js` or `backend/lib/salesNumber.js` before adding a new numbered document type.

### Date handling — the UTC+6 gotcha
PostgreSQL `DATE` columns arrive at the frontend as plain strings like `'2024-01-15'`. **Never pass these to `new Date('2024-01-15')` directly** — JavaScript treats date-only strings as UTC midnight, which in Bangladesh (UTC+6) shows as 6:00 AM.

✅ Use `formatDate()` or `formatDateTime()` from `frontend/src/utils/calculations.js` — both handle date-only strings correctly by appending `T00:00:00` (local time) before parsing.

`formatDateTime()` also auto-detects date-only strings and skips the time part so you never see "6:00 AM" on a date field.

### Database access pattern
```js
// Reads — no transaction needed
const result = await databaseManager.withClient(async (client) => {
  return myRepository.getById(client, tenantId, id);
});

// Writes — always in a transaction
await databaseManager.withTransaction(async (client) => {
  await myRepository.create(client, data);
  await auditService.record(client, { ... }); // same transaction
});
```

### Validation errors
Use `assert(condition, message, status)` from `backend/lib/errors.js`:
```js
import { assert } from '../lib/errors.js';
assert(product.stockPieces >= qty, 'Not enough stock', 400);
```
This throws an Error with `.status`, caught by `middleware/errorHandler.js`. Don't hand-roll `res.status(400).json(...)` inside services.

### API auto-polling
When a page has live data that should stay fresh, add polling to its viewmodel using `setInterval` gated on whether there's active data to watch. See `useCashSessionsViewModel.js` for the pattern — polls every 30s only while an open session exists, clears the interval automatically when no open session is found.

---

## Environment Config

All env vars live in `backend/config/env.js`. Key ones:
- `DATABASE_URL` — production DB
- `DEV_DATABASE_URL` — used when `npm_lifecycle_event` is `dev` or `test`
- `SESSION_COOKIE_NAME` — auth cookie name
- `PORT` — server port (Render)

---

## Dead Code (as of 2026-06-30)

Before adding code that looks like it might already exist, check the dead code audit. These are fully built but currently unreachable:

### Completely dead files (never imported anywhere)
- `frontend/src/app/tenantFeatures.js`
- `frontend/src/app/permissions.js`
- `frontend/src/services/exportService.js`

### HR module — built but has no routes
The entire HR feature set (payroll, payslips, salary reports, salary structure) is implemented end-to-end but has **no `APP_ROUTES` entry**. No page is reachable. If you need to activate it, add entries to `APP_ROUTES`.
- `frontend/src/features/hr/payroll/` (all files)
- `frontend/src/features/hr/payslips/` (all files)
- `frontend/src/features/hr/salary-reports/` (all files)
- `frontend/src/features/hr/salary-structure/` (all files)

### Manufacturers page — replaced by a modal
`ManufacturersPage.jsx` is imported in `routes.js` but not in `APP_ROUTES`. Manufacturers are now managed via a modal inside ProductsPage.

### Dead feature flags (in `backend/lib/features.js`)
`retailer-profit-report`, `payslips`, `salary-reports`, `expiry-alerts`, `controlled-drug-register` — none have corresponding routes or pages.

See `DEAD-CODE-AUDIT.md` at the repo root for the full list.

---

## Testing at a Glance

Backend tests live in `backend/tests/*.test.js`, run with `npm --prefix backend test`.
- They hit the **real dev database** (no mocks)
- Each test creates a disposable tenant, runs real HTTP requests, then cleans up
- See the `backend-patterns` skill for the full testing guide

---

## Quick Reference: Which file does what?

| Need | File |
|---|---|
| Add a page to the sidebar | `frontend/src/app/routes.js` (APP_ROUTES) |
| Add a new DB table | `backend/db/schema.js` |
| Add a permission | `backend/lib/permissions.js` + `ROLE_PERMISSIONS` |
| Add a feature flag | `backend/lib/features.js` (TENANT_FEATURES) |
| Wire a new service | `backend/composition.js` → `backend/app.js` → `backend/routes/api.js` |
| Add i18n text | `frontend/src/i18n/locales/en.js` + `bn.js` |
| Add an API call | `frontend/src/services/api/<x>Api.js` → register in `inventoryApi.js` |
| Format a date | `formatDate()` / `formatDateTime()` in `frontend/src/utils/calculations.js` |
| Format currency | `formatCurrency(amount, language)` in `frontend/src/utils/calculations.js` |
| Check stock/ledger invariants | `npm --prefix backend run check:invariants` |
