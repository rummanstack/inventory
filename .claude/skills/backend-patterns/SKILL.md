---
name: backend-patterns
description: Use when adding or modifying anything in the backend — new modules, new endpoints, new DB tables, business logic changes, or writing tests. Covers the full layer-by-layer sequence, key conventions, DI wiring, and the test setup. Replaces the old new-domain-module and backend-testing skills.
---

# Backend Patterns — How to Build Things in StockLedger's Backend

The backend is a strict **layered architecture**. Every feature touches the same layers in the same order. Understanding the flow once means you can work on any feature confidently.

---

## The Layer Stack (top to bottom)

```
routes/<x>.routes.js          Middleware wiring only. No logic.
controllers/<X>Controller.js  Thin HTTP adapter. Calls one service method per endpoint.
services/<x>Service.js        ALL business logic lives here.
repositories/<x>Repository.js ALL SQL lives here.
db/schema.js                  Table definitions (idempotent, run on boot).
```

**The golden rule:** Logic only ever flows downward. A controller never writes SQL. A repository never validates business rules. A service never touches `req` or `res`.

---

## Adding a Complete New Module — Step by Step

### Step 1 — Schema (`backend/db/schema.js`)

Add an idempotent `CREATE TABLE IF NOT EXISTS` block. Every business table needs:

```sql
CREATE TABLE IF NOT EXISTS your_things (
  id             TEXT PRIMARY KEY,
  tenant_id      TEXT NOT NULL REFERENCES tenants(id),
  -- your columns --
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- soft-delete columns if this entity should go to trash:
  deleted_at     TIMESTAMPTZ,
  deleted_by_id  TEXT REFERENCES users(id),
  delete_reason  TEXT
);
CREATE INDEX IF NOT EXISTS your_things_tenant_id_idx ON your_things(tenant_id);
```

If this entity needs a human-readable sequential number (invoice #, claim #, etc.), also add a counters table:
```sql
CREATE TABLE IF NOT EXISTS your_thing_number_counters (
  tenant_id TEXT PRIMARY KEY REFERENCES tenants(id),
  last_number INTEGER NOT NULL DEFAULT 0
);
```
See `backend/lib/purchaseNumber.js` for how to use it.

Schema changes are **additive only** — always append new blocks, never modify existing ones. The schema runs on every boot via `bootstrapService.js`.

---

### Step 2 — Repository (`backend/repositories/<x>Repository.js`)

```js
// Row mapper: snake_case DB → camelCase API
export function mapYourThing(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    // ... all columns
    createdAt: row.created_at,
  };
}

// Every query takes client as first arg — the service owns the transaction boundary
export async function listYourThings(client, tenantId, { page = 1, pageSize = 20 } = {}) {
  const offset = (page - 1) * pageSize;
  const result = await client.query(
    `SELECT *, COUNT(*) OVER() AS total_count
     FROM your_things
     WHERE tenant_id = $1 AND deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [tenantId, pageSize, offset],
  );
  const total = result.rows[0]?.total_count ? Number(result.rows[0].total_count) : 0;
  return { items: result.rows.map(mapYourThing), total };
}

export async function createYourThing(client, data) {
  const result = await client.query(
    `INSERT INTO your_things (id, tenant_id, name, ...)
     VALUES ($1, $2, $3, ...)
     RETURNING *`,
    [data.id, data.tenantId, data.name, ...],
  );
  return mapYourThing(result.rows[0]);
}
```

**Never** grab a DB client inside a repository. The caller passes `client` in.

---

### Step 3 — Service (`backend/services/<x>Service.js`)

```js
import { assert } from '../lib/errors.js';
import { createId } from '../lib/ids.js';
import { createYourThing, listYourThings } from '../repositories/yourThingRepository.js';

export class YourThingService {
  constructor({ databaseManager, auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService; // only inject what you actually need
  }

  async list(query, actor) {
    return this.databaseManager.withClient(async (client) => {
      return listYourThings(client, actor.tenantId, query);
    });
  }

  async create(data, actor) {
    assert(data.name?.trim(), 'Name is required', 400);

    return this.databaseManager.withTransaction(async (client) => {
      const thing = await createYourThing(client, {
        id: createId('ytng'),
        tenantId: actor.tenantId,
        name: data.name.trim(),
        createdById: actor.id,
      });

      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        action: 'CREATE',
        entityType: 'your_thing',
        entityId: thing.id,
      });

      return thing;
    });
  }
}
```

- **Reads** → `databaseManager.withClient(...)` (no transaction overhead)
- **Writes** → `databaseManager.withTransaction(...)` (auto BEGIN/COMMIT/ROLLBACK with retry)
- **Validation** → `assert(condition, message, statusCode)` — throws an error caught by `errorHandler.js`
- **IDs** → `createId('prefix')` — always use this, never raw UUIDs or integers

---

### Step 4 — Controller (`backend/controllers/<X>Controller.js`)

```js
export class YourThingController {
  constructor({ yourThingService }) {
    this.service = yourThingService;
    this.list = this.list.bind(this);
    this.create = this.create.bind(this);
  }

  async list(req, res, next) {
    try {
      const result = await this.service.list(req.query, req.currentUser);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const thing = await this.service.create(req.body, req.currentUser);
      res.status(201).json(thing);
    } catch (error) {
      next(error);
    }
  }
}
```

Controllers are deliberately boring — pull from `req`, call one service method, send response, forward errors. If you find yourself writing an `if` in a controller, it belongs in the service.

---

### Step 5 — Routes (`backend/routes/<x>.routes.js`)

```js
import { Router } from 'express';
import { requireFeature } from '../middleware/requireFeature.js';
import { requirePermission } from '../middleware/requireRole.js';
import { PERMISSIONS } from '../lib/permissions.js';

export function createYourThingRoutes(controller) {
  const router = Router();
  router.use(requireFeature('your-feature-key'));

  router.get('/', requirePermission(PERMISSIONS.MANAGE_YOUR_THING), controller.list);
  router.post('/', requirePermission(PERMISSIONS.MANAGE_YOUR_THING), controller.create);
  router.delete('/:id', requirePermission(PERMISSIONS.MANAGE_YOUR_THING), controller.delete);

  return router;
}
```

`requireFeature` goes at the top — it gates the entire router. Individual permissions go per-route.

---

### Step 6 — Wire Everything (the DI chain)

This is the step people most often forget. A new service must be threaded through **three files**:

**`backend/composition.js`:**
```js
import { YourThingService } from './services/yourThingService.js';
// ... after its dependencies are already instantiated above it ...
const yourThingService = new YourThingService({ databaseManager, auditService });
// Pass it into createApp:
return createApp({ ..., yourThingService });
```

**`backend/app.js`:**
```js
export function createApp({ ..., yourThingService }) {
  // pass it into createApiRouter
  const apiRouter = createApiRouter({ ..., yourThingService });
}
```

**`backend/routes/api.js`:**
```js
export function createApiRouter({ ..., yourThingService }) {
  const yourThingController = new YourThingController({ yourThingService });
  // Mount after requireActiveTenant for business routes:
  router.use('/your-things', createYourThingRoutes(yourThingController));
}
```

Missing any one of these three links causes a silent `undefined` at runtime — no startup error, just a crash on first request.

---

### Step 7 — Permission (`backend/lib/permissions.js`)

```js
export const PERMISSIONS = {
  // ... existing ...
  MANAGE_YOUR_THING: 'manage_your_thing',
};

export const TENANT_BUSINESS_PERMISSIONS = [
  // ... existing ...
  PERMISSIONS.MANAGE_YOUR_THING,
];

export const ROLE_PERMISSIONS = {
  super_admin: [...existing, PERMISSIONS.MANAGE_YOUR_THING],
  admin:       [...existing, PERMISSIONS.MANAGE_YOUR_THING],
  manager:     [...existing],  // decide if managers get it
  operator:    [...existing],  // decide if operators get it
};
// system_developer gets everything automatically — don't add it there
```

---

### Step 8 — Feature Flag (`backend/lib/features.js`)

```js
export const TENANT_FEATURES = {
  // ... existing ...
  'your-feature-key': 'Your Feature Display Name',
};
```

The string key must match exactly across:
- `requireFeature('your-feature-key')` in the route file
- `APP_ROUTES[].feature: 'your-feature-key'` in the frontend
- `TENANT_FEATURES['your-feature-key']` here

If these three strings don't match, the feature silently fails (API 403s or page doesn't appear).

---

## Testing

### Setup

Tests live in `backend/tests/*.test.js` and run with:
```
npm --prefix backend test
```
`--test-concurrency=1` — tests share one real dev database, so they run serially.

### Why real DB, no mocks

There are no test doubles for Postgres. Real SQL runs against a real database. This catches tenant-isolation bugs, FK ordering issues, and aggregate-field drift that mocks would miss. **Don't introduce mocks for the DB layer.**

`DEV_DATABASE_URL` is automatically selected when running `npm test`.

### Standard test shape

```js
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getTestApp, closeTestApp } from './helpers/testApp.js';
import { createTenantAndAdmin, cleanupTenant } from './helpers/fixtures.js';

let databaseManager, tenant;

before(async () => {
  const testApp = await getTestApp(); // builds real app via composition.js, cached
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: 'Test Co' });
  // tenant.agent is a pre-logged-in supertest agent (cookie jar persisted)
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await closeTestApp();
});

test('creates a thing', async () => {
  const res = await tenant.agent.post('/api/your-things').send({ name: 'Widget' });
  assert.equal(res.status, 201);
  assert.equal(res.body.name, 'Widget');
});
```

### What to test for every new module

1. **Happy path** — CRUD/workflow through real HTTP
2. **Tenant isolation** — tenant B can't see/edit tenant A's rows (copy the assertion from `tenantIsolation.test.js`)
3. **Derived fields** — after a sequence of operations, aggregates (stock counts, balances) are correct
4. **Permission gating** — a role without the permission gets 403

### Seeders

`tests/helpers/seeders.js` has reusable helpers: `createProduct`, `createSupplier`, `createRetailCustomer`, `createDsr`, etc. These POST through the real API (not direct SQL), which also tests validation. Extend these instead of writing raw fixture SQL.

### Invariant checks (separate from tests)

```
npm --prefix backend run check:invariants
npm --prefix backend run check:invariants <tenantId>  # specific tenant
```

This is a standalone read-only script (`backend/scripts/checkInvariants.js`) that re-derives stock, ledger, and finance balances from movement rows and flags any drift. Run it manually after touching:
- Stock movements
- Due ledger entries
- Finance account transactions

---

## Common Mistakes

| Mistake | Result |
|---|---|
| Missing `WHERE tenant_id = $1` in a repo query | Data leak across tenants — critical bug |
| Setting `stock_pieces` / balance directly instead of via movement rows | Invariant drift — silent wrong numbers |
| Forgetting to thread a service through all 3 DI files | Silent `undefined` crash on first request |
| `requireFeature`/`requirePermission` not added to the route | Feature works in dev (system_developer bypasses), breaks for real tenants |
| Date-only string passed to `new Date()` without `T00:00:00` | Shows 6:00 AM in UTC+6 (Bangladesh) |
| Using `res.status(400).json(...)` in a service | Bypasses the error handler; use `assert()` instead |
