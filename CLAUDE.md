# StockLedger (Arinda Inventory System)

Multi-tenant inventory, retail POS, dealer-distribution (DSR), and finance management SaaS.
Node/Express + PostgreSQL backend, React (Vite) + Tailwind frontend, deployed on both Render (long-running) and Vercel (serverless) from the same codebase.

## Skills — Start Here

Four skills cover everything. Reference the right one for your task:

- **`project-overview`** — What the app is, all domain modules, monorepo layout, key conventions, date gotchas, dead code list. Read this first if you're new to the project or need orientation.
- **`backend-patterns`** — How to add/modify backend features: full layer sequence (schema → repository → service → controller → routes → DI wiring), testing against the real DB, invariant checks.
- **`frontend-patterns`** — How to add/modify UI: pages, viewmodels, API clients, the component library, design tokens, color rules, i18n, date formatting.
- **`access-control`** — The three independent layers (role, permission, feature flag), how to add/debug each, and the complete 403 debugging checklist.

## Monorepo Layout

```
backend/    Express API (ESM, Node --test for tests)
frontend/   React 18 + Vite + Tailwind SPA
api/        Vercel serverless entry (api/[...path].js wraps backend/runtime.js)
scripts/    render-build.mjs — builds frontend, copies dist to both deploy targets
```

No root `node_modules`. Run commands with `npm --prefix backend run <script>` or `npm --prefix frontend run <script>`.

## Single Composition Root

`backend/composition.js` (`createBackendApp`) is the one place that wires the `DatabaseManager`, every `*Service`, and the Express app. Both `backend/server.js` (Render) and `backend/runtime.js` (Vercel) delegate to it. Never construct services anywhere else.

## Key Conventions at a Glance

- **IDs** → `createId('prefix')` from `backend/lib/ids.js` — prefixed UUID strings, never integers
- **Tenant isolation** → every query must `WHERE tenant_id = $1` — no DB-level RLS, enforced in code only
- **Derived fields** → `products.stock_pieces`, ledger balances are never set by clients — always recomputed from movement/transaction rows
- **Validation** → `assert(condition, message, status)` from `backend/lib/errors.js` — never hand-roll `res.status(400)`
- **Date fields** → always use `formatDate()` / `formatDateTime()` from `frontend/src/utils/calculations.js` — raw `new Date('YYYY-MM-DD')` shows 6:00 AM in UTC+6

## Testing

`npm --prefix backend test` — uses `node --test`, concurrency 1, hits the real dev database. See the `backend-patterns` skill.

## Dead Code

See `DEAD-CODE-AUDIT.md` at the repo root for a full list. The biggest chunk: the HR module (payroll, payslips, salary reports, salary structure) is fully built but has no `APP_ROUTES` entries — pages are unreachable.
