---
name: backend-testing
description: Use when writing or running backend tests in StockLedger, or when asked to verify a backend change. Explains the node:test + supertest setup, the tenant fixture/cleanup pattern, and why tests run against the real dev database instead of mocks.
---

# Backend testing conventions

`backend/tests/*.test.js`, run with `npm --prefix backend test` (`node --test
--test-concurrency=1` — concurrency is 1 because tests share one real database).

## Tests hit the real dev database, not mocks

There's no test double for Postgres. Every test creates a **disposable tenant**, runs
real HTTP requests against the real Express app, asserts on real responses, then deletes
that tenant's rows. This is safe because every business route is tenant-scoped
(`requireActiveTenant` + `tenant_id` filtering in every repository query) — a throwaway
tenant can never see or affect another tenant's data, including real production-shaped
data if `DEV_DATABASE_URL` points at a shared dev DB. **Don't introduce mocking** for the
DB layer here; it would diverge from how this codebase has chosen to catch real
tenant-isolation and SQL bugs (see `backend/tests/tenantIsolation.test.js`).

`DEV_DATABASE_URL` (falls back to `DATABASE_URL`) is selected automatically when
`npm_lifecycle_event` is `dev` or `test` — see `backend/config/env.js`.

## Standard test shape

```js
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";

let databaseManager, tenant;

before(async () => {
  const testApp = await getTestApp();           // builds the real app via composition.js, cached
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "X Tenant" });
  // tenant.agent is a supertest agent already logged in (cookie jar persisted)
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);  // deletes every tenant_id-scoped row, then the tenant
  await closeTestApp();
});

test("does the thing", async () => {
  const response = await tenant.agent.post("/api/your-resource").send({ ... });
  assert.equal(response.status, 201);
});
```

- `getTestApp()` (`tests/helpers/testApp.js`) builds the app once via the real
  `createBackendApp()` composition root and caches it across the whole test file run —
  don't construct services/app another way in a test.
- `createTenantAndAdmin` / `cleanupTenant` (`tests/helpers/fixtures.js`): cleanup walks
  `information_schema.columns` for every table with a `tenant_id` column and deletes in
  retry passes until FK ordering resolves itself — you don't need to hand-maintain a
  deletion order when adding a new tenant-scoped table.
- `tests/helpers/seeders.js` has reusable `createProduct`/`createSupplier`/
  `createRetailCustomer`/`createDsr`/etc. helpers that POST through the real API (not
  direct repository inserts) — prefer extending these over writing raw fixture SQL, since
  going through the API also exercises validation.

## What to test for a new module

1. The happy path CRUD/workflow through the real HTTP API.
2. Tenant isolation: tenant B cannot read/update/delete tenant A's rows of the new
   entity (`assert.equal(getResponse.body.items.some(item => item.id === otherTenantsId),
   false)` style — see `tenantIsolation.test.js` for the pattern across every existing
   module).
3. Any derived/aggregate field (stock counts, ledger balances) ends up correct after a
   sequence of operations, not just after one.
4. Permission/feature gating: a role without the permission gets 403.

## Invariant checks (separate from node:test)

`backend/scripts/checkInvariants.js` (`npm --prefix backend run check:invariants
[tenantId]`) is a standalone, read-only script — not part of `npm test` — that re-derives
stock/ledger/finance balances from movement rows and flags any tenant where the stored
aggregate has drifted. Run it manually after touching stock movements, due ledgers, or
finance account transactions; it's the fastest way to catch a missed `tenant_id` filter
or an unbalanced transaction.
