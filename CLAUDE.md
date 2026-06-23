# StockLedger (Arinda Inventory System)

Multi-tenant inventory, retail POS, dealer-distribution (DSR), and finance management
SaaS. Node/Express + PostgreSQL backend, React (Vite) frontend, deployed both as a
long-running Render service and as a Vercel serverless function from the same codebase.

For recurring workflows, see the skills in `.claude/skills/`:
- `new-domain-module` — adding a new business entity end-to-end (table → API → UI)
- `tenant-access-control` — how roles, permissions, and per-tenant feature flags gate access
- `backend-testing` — writing/running backend tests against the real dev database

## Monorepo layout

```
backend/    Express API (ESM, Node --test for tests)
frontend/   React 18 + Vite + Tailwind SPA
api/        Vercel serverless entry ([...path].js wraps backend/runtime.js)
scripts/    render-build.mjs — builds frontend, copies dist into both backend/public/dist and /public
```

Root `package.json` only proxies scripts into `backend`/`frontend` — there is no root
`node_modules`. Run backend commands with `npm --prefix backend run <script>` (or `cd
backend`) and frontend the same way.

## Two entry points, one composition root

`backend/composition.js` (`createBackendApp`) is the **single composition root**: it
builds the `DatabaseManager`, every `*Service`, and calls `createApp()`. Both
`backend/server.js` (long-running process, used by `npm run dev`/Render) and
`backend/runtime.js` (serverless handler used by `api/[...path].js` on Vercel) delegate
to it. **Never construct services or wire routes anywhere else** — that was a deliberate
fix to stop the two entry points from drifting apart (see git history: "Single
composition root" comment in composition.js).

## Backend architecture (layered, one folder per layer)

```
routes/<x>.routes.js      Express Router factory: wires middleware (requireFeature,
                           requirePermission) to controller methods. No logic.
controllers/<X>Controller.js  Thin: pulls req.body/req.params/req.currentUser, calls one
                           service method, sends the JSON response, forwards errors via
                           next(error). No business logic, no SQL.
services/<x>Service.js    Business logic, validation (via lib/errors.js `assert`),
                           orchestration across repositories, audit logging.
repositories/<x>Repository.js  All SQL lives here. Exports `mapX(row)` row-mappers
                           (snake_case DB → camelCase API) plus query functions that take
                           a pg `client` as the first argument.
db/schema.js               Idempotent `CREATE TABLE IF NOT EXISTS` migrations, run on
                           boot by services/bootstrapService.js. There is no separate
                           migration tool — schema changes are additive SQL appended here.
lib/                       Cross-cutting helpers (permissions, features, roles, ids,
                           passwords, errors, audit, due-ledger math, etc.)
```

A new feature module touches every layer in that order. See the
`new-domain-module` skill for the exact sequence.

### Conventions
- IDs are `createId(prefix)` → `"<prefix>-<uuid>"` strings (`backend/lib/ids.js`), not
  serial integers.
- Every business table has a `tenant_id` column. Every repository query that touches one
  **must** filter `WHERE tenant_id = $1` — there is no DB-level RLS, isolation is
  enforced entirely in application code (see `backend/tests/tenantIsolation.test.js`).
- DB access goes through `databaseManager.withClient(...)` (read) or
  `.withTransaction(...)` (write, auto BEGIN/COMMIT/ROLLBACK with retry). Services accept
  `databaseManager` in the constructor; controllers never touch the DB directly.
- Validation/business errors: `assert(condition, message, status)` from
  `backend/lib/errors.js` throws an `Error` with `.status`, caught by
  `middleware/errorHandler.js`. Don't hand-roll `res.status(400).json(...)` in services.
- Derived/aggregate fields (e.g. `products.stock_pieces`) are never set directly by
  clients — they're recomputed from `stock_movements` rows. `backend/scripts/
  checkInvariants.js` (`npm run check:invariants` in backend) is a read-only regression
  check for these invariants (stock reconciliation, customer/supplier ledger balances,
  finance account balances, finance transfer pairing) — run it after touching any ledger
  or stock logic.
- Numeric ID-like business documents (purchase numbers, sales numbers, warranty claim
  numbers, help-desk ticket numbers) use a `*_number_counters` table per tenant for
  gapless sequential numbering — see `lib/purchaseNumber.js` / `lib/salesNumber.js` for
  the pattern before adding a new numbered-document type.

## Multi-tenancy & auth

- **Platform users** (`role: system_developer`) have `tenantId = null` and manage tenants
  globally (`/api/platform/*`, `/api/system/*`). They pick an "active tenant" per-session
  via the `X-Active-Tenant-Id` header, resolved in `middleware/requireAuth.js`.
- **Tenant users** (`super_admin`, `admin`, `manager`, `operator`) belong to exactly one
  tenant (`users.tenant_id`).
- Session = a hashed token in an HTTP-only cookie (`SESSION_COOKIE_NAME`) or `Authorization:
  Bearer`. `requireAuth` resolves it to `req.currentUser` + `req.currentTenant`.
- `requireActiveTenant` (applied to all `/api/*` business routes except `/auth`,
  `/contact`, `/visitor-chat`, `/platform/*`, `/system/*`) rejects requests with no tenant
  or an inactive tenant subscription.

### Three independent access-control layers (see `tenant-access-control` skill for detail)
1. **Role** (`backend/lib/roles.js`) — `system_developer > super_admin > admin > manager >
   operator`.
2. **Permission** (`backend/lib/permissions.js`) — fine-grained capability per role,
   enforced server-side via `requirePermission(PERMISSIONS.X)` in routes. Can be
   customized per-tenant (`role_permissions` table, cached in
   `lib/permissionCache.js`) — `getRolePermissions` checks the cache before falling back
   to the hardcoded `ROLE_PERMISSIONS` default.
3. **Feature flag** (`backend/lib/features.js` `TENANT_FEATURES`) — whole modules can be
   enabled/disabled per tenant by a platform admin (`tenant_features` table, cached in
   `lib/tenantFeatureCache.js`), enforced via `requireFeature("key")` in routes. Feature
   keys correspond 1:1 with frontend `APP_ROUTES[].feature` ids.

`system_developer` bypasses both permission and feature checks unconditionally.

## Frontend architecture

```
src/app/routes.js          APP_ROUTES — single source of truth for every page: path,
                            sidebar group/icon, i18n label key, required permission,
                            required feature flag. Adding a page = adding one entry here
                            plus the route's component.
src/app/useInventoryApp.jsx  Big context provider: current user/tenant/permissions,
                            directories (cached lookup lists), toasts, confirmation
                            dialogs, i18n.
src/features/<name>/       One folder per business feature:
  pages/<Name>Page.jsx        Route-level component
  viewmodels/use<Name>ViewModel.js  Data fetching + state for the page (hook, not a class)
  components/                 Presentational pieces specific to this feature
src/services/api/<x>Api.js Thin fetch wrappers per backend resource, all routed through
                            src/services/api/client.js (adds active-tenant header, base
                            URL, error normalization).
src/services/inventoryApi.js  Aggregates the per-resource API modules into one object
                            consumed by the app context.
```

Sidebar visibility = `APP_ROUTES` entry's `permission`/`feature`/`role` matched against
the current user's resolved permissions and the tenant's enabled features — both checks
happen client-side for UX *and* are re-enforced server-side by the route's middleware
(never trust the client-side gate alone).

## Domain modules (for orientation)

- **Inventory**: products, categories, stock movements, product serials, damaged stock,
  low-stock alerts, warranty claims.
- **Dealer/DSR distribution**: DSRs (delivery sales reps), customers ("shops"), morning
  issue (stock issued to a DSR), evening settlement (cash/returns reconciliation), DSR
  due ledger, DSR cash advances.
- **Retail POS**: quick sale, sales invoices, sales returns, retail customers, retail
  cash sessions, retail promotions/loyalty, customer due ledger + due collection.
- **Purchasing**: suppliers, purchase receive, supplier payments, supplier due ledger.
- **Finance**: finance accounts (cash/bank), finance account transactions/transfers,
  expenses, finance dashboard, profit reports.
- **Platform/system**: tenants, users, roles/permissions, org settings, activity log /
  audit trail, database backups, help desk, visitor chat (public widget + admin), system
  health, error logs.

## Deployment

Two parallel deploy targets share one build:
- `scripts/render-build.mjs` builds `frontend/`, then copies `frontend/dist` into both
  `/public` (Vercel static output, see `vercel.json`) and `backend/public/dist` (served
  by Express directly when running on Render — see the static-file fallback in
  `backend/app.js`).
- Vercel: `api/[...path].js` wraps `backend/runtime.js` (serverless) behind the rewrites
  in `vercel.json`.
- Render/long-running: `backend/server.js` listens on `env.PORT` directly.

`backend/.env` (`DATABASE_URL` or `DEV_DATABASE_URL` when `npm_lifecycle_event` is `dev`
or `test`) configures the DB — see `backend/config/env.js` for every env var and its
default.

## Testing

Backend: `npm test` (`node --test`, concurrency 1 — tests share the real dev database, not
mocks/an in-memory DB) from `backend/`. See the `backend-testing` skill.
