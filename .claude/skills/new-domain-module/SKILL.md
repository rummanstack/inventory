---
name: new-domain-module
description: Use when adding a new business entity/module to StockLedger (a new table and full CRUD/workflow feature spanning backend and frontend) — e.g. "add a new X module", "add a page for Y", "expose Z as an API". Walks the exact layer-by-layer sequence this codebase uses so nothing is missed (schema, repository, service, controller, routes, permission, feature flag, frontend API client, viewmodel, page, route registration, tests).
---

# Adding a new domain module to StockLedger

This codebase has one consistent pattern for every business module (products, suppliers,
sales invoices, warranty claims, ...). Follow the same order every time — skipping a step
is the most common source of bugs here (e.g. a working API with no sidebar entry, or a
page that 403s because the feature flag was never added).

Read root `CLAUDE.md` first for the architecture overview if you haven't already.

## Sequence

1. **Schema** — `backend/db/schema.js`: add an idempotent `CREATE TABLE IF NOT EXISTS`
   block (find a similar existing table, e.g. `suppliers` or `warranty_claims`, and copy
   its shape). Every business table needs: `id` (text, `createId()`-style), `tenant_id`
   (FK to `tenants`, NOT NULL), `created_at`/`updated_at`, and soft-delete columns
   (`deleted_at`, `deleted_by_id`, `delete_reason`) if the entity should be trashable. If
   the entity needs a human-readable sequential number (invoice #, claim #...), add a
   `*_number_counters` table — copy `purchase_number_counters`.

2. **Repository** — `backend/repositories/<x>Repository.js`: write `mapX(row)` (snake_case
   → camelCase) and query functions. Every query that filters by tenant takes `tenantId`
   and includes `WHERE tenant_id = $1` (and `deleted_at IS NULL` for the
   non-trash views). All functions take `client` as the first argument — never grab a
   client/pool here, the caller (service) owns the transaction boundary.

3. **Service** — `backend/services/<x>Service.js`: business logic + validation. Use
   `assert(condition, message, status)` from `lib/errors.js` for validation errors. Wrap
   writes in `databaseManager.withTransaction(...)`. If the entity affects audit history,
   accept `auditService` in the constructor (see `composition.js` for the DI pattern —
   pass only the dependencies you need) and call `auditService.record(client, {...})`
   inside the same transaction. If it touches money, accept `financeAccountService` the
   same way.

4. **Controller** — `backend/controllers/<X>Controller.js`: thin arrow-function methods,
   each: try/catch, call exactly one service method, `res.json(...)`, `next(error)` on
   failure. No logic here — if you're writing an `if` in a controller, it belongs in the
   service.

5. **Routes** — `backend/routes/<x>.routes.js`: `Router()` factory taking the controller.
   Add `router.use(requireFeature("your-feature-key"))` at the top, then per-route
   `requirePermission(PERMISSIONS.YOUR_PERMISSION)`. Mount it in
   `backend/routes/api.js`: import the controller + route factory, instantiate the
   controller in `createApiRouter`, add it to the constructor's destructured params list,
   and `router.use("/your-path", createYourRoutes(yourController))` — business routes go
   *after* the `router.use(requireActiveTenant)` line unless this is a platform/system
   route.

6. **Wire the service into composition** — `backend/composition.js`: import the service,
   instantiate it with its dependencies (after the deps it needs, e.g.
   `financeAccountService`/`auditService` must already exist above it), and add it to
   both the `createApp({...})` call's object AND `backend/app.js`'s destructured params
   AND `backend/routes/api.js`'s destructured params. (Yes, the same service name has to
   be threaded through composition.js → app.js → api.js — that's the DI chain. Missing
   one link is a silent `undefined` at runtime, not a startup error.)

7. **Permission** — `backend/lib/permissions.js`: add a key to `PERMISSIONS`, add it to
   `TENANT_BUSINESS_PERMISSIONS`, and decide which roles in `ROLE_PERMISSIONS` get it
   (`system_developer` always gets everything automatically — don't add it there).

8. **Feature flag** — `backend/lib/features.js`: add the same key you used in
   `requireFeature(...)` to `TENANT_FEATURES`. Without this the route 403s for every
   tenant (existing tenants don't get new features automatically — see
   `tenant-access-control` skill).

9. **Frontend API client** — `frontend/src/services/api/<x>Api.js`: thin fetch wrappers
   calling your new endpoints through `client.js`. Register it in
   `frontend/src/services/inventoryApi.js`.

10. **Frontend viewmodel + page** — `frontend/src/features/<name>/viewmodels/use<Name>
    ViewModel.js` (data fetching/state hook) and `.../pages/<Name>Page.jsx`
    (route component). Add `components/` for anything presentational specific to this
    page.

11. **Register the route** — `frontend/src/app/routes.js`: add one entry to
    `APP_ROUTES` with `id`, `path`, `labelKey`, `icon`, `component`, `group` (must be one
    of `SIDEBAR_SECTIONS`), `permission`, and `feature` matching what you added in steps
    7-8. Add the `labelKey` string to `frontend/src/i18n/translations.js` (and the locale
    files under `i18n/locales/`) or the sidebar will show the raw key.

12. **Tests** — see the `backend-testing` skill. At minimum add a tenant-isolation
    assertion (tenant B can't see/edit tenant A's rows of the new entity) following
    `backend/tests/tenantIsolation.test.js`.

13. **Invariants** — if the new module affects stock, money, or ledger balances, check
    whether `backend/services/invariantService.js` needs a new reconciliation check, and
    re-run `npm --prefix backend run check:invariants` against the dev DB.

## Common mistakes to avoid
- Adding the route in `api.js` but forgetting `requireFeature`/`requirePermission` —
  every business route needs both.
- Forgetting to thread a new service through all three files in step 6.
- Letting a client set a derived/aggregate field directly (e.g. stock counts, ledger
  balances) instead of deriving it from movement/transaction rows.
- Adding a frontend page without a matching `APP_ROUTES` entry's `feature`/`permission` —
  it renders fine in dev (nothing gates it locally) but breaks for real tenants whose
  permission/feature set doesn't include it yet.
