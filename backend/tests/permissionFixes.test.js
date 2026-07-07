import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { listEffectiveRolePermissions } from "../repositories/rolePermissionRepository.js";
import {
  replaceTenantFeatures,
  listTenantFeatures,
  hasTenantFeatureConfig,
} from "../repositories/tenantFeatureRepository.js";
import { loadFeatureCache, getCachedFeatures, setCachedFeatures } from "../lib/tenantFeatureCache.js";

let app;
let databaseManager;
let tenant;

before(async () => {
  const testApp = await getTestApp();
  app = testApp.app;
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, app, { name: "Permission Fixes Co" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await closeTestApp();
});

test("permissions page falls back to global-scope rows when a tenant has none (group-reset root cause)", async () => {
  // Simulated inside a rolled-back transaction so the shared dev DB's real
  // global bucket is never mutated.
  const client = await databaseManager.getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM role_permissions WHERE role = 'manager' AND tenant_id = $1", [tenant.tenantId]);
    await client.query(
      "INSERT INTO role_permissions (role, tenant_id, permission) VALUES ('manager', 'global', 'view_products') ON CONFLICT (role, tenant_id, permission) DO NOTHING",
    );

    const effective = await listEffectiveRolePermissions(client, "manager", tenant.tenantId);
    assert.ok(
      effective.includes("view_products"),
      "tenant with no scoped rows must inherit the global bucket on the permissions page",
    );

    // Once the tenant has its own rows, they win over the global bucket.
    await client.query(
      "INSERT INTO role_permissions (role, tenant_id, permission) VALUES ('manager', $1, 'view_dsrs')",
      [tenant.tenantId],
    );
    const scoped = await listEffectiveRolePermissions(client, "manager", tenant.tenantId);
    assert.deepEqual(scoped, ["view_dsrs"]);
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
});

test("saving one role's permissions via the API preserves everything already shown for that role", async () => {
  const beforeSave = await tenant.agent.get("/api/permissions");
  assert.equal(beforeSave.status, 200);
  const manager = beforeSave.body.roles.find((entry) => entry.role === "manager");
  assert.ok(manager, "manager role present on the permissions page");

  // The dev DB's global bucket may hold retired permission names the API no
  // longer accepts — keep only currently-known ones, same as the page renders.
  const known = manager.permissions.filter((permission) => beforeSave.body.allPermissions.includes(permission));

  // Simulate the user's exact flow: tick ONE extra box and hit Save.
  const withOneMore = [...new Set([...known, "view_products", "view_dsrs"])];
  const saveResponse = await tenant.agent.put("/api/permissions/manager").send({ permissions: withOneMore });
  assert.equal(saveResponse.status, 200);

  const afterSave = await tenant.agent.get("/api/permissions");
  const managerAfter = afterSave.body.roles.find((entry) => entry.role === "manager");
  for (const permission of known) {
    assert.ok(
      managerAfter.permissions.includes(permission),
      `previously-held permission ${permission} must survive an unrelated save`,
    );
  }
  assert.ok(managerAfter.permissions.includes("view_products"));
});

test("an explicitly-empty feature set stays empty across a cache reload (no menu resurrection)", async () => {
  await databaseManager.withTransaction(async (client) => {
    await replaceTenantFeatures(client, tenant.tenantId, []);
  });

  await databaseManager.withClient(async (client) => {
    assert.equal(await hasTenantFeatureConfig(client, tenant.tenantId), true, "sentinel row marks the tenant as configured");
    assert.deepEqual(await listTenantFeatures(client, tenant.tenantId), [], "sentinel never leaks into the feature list");
  });

  // Simulate a server restart: rebuild the cache from the DB.
  await loadFeatureCache(databaseManager.getPool());
  assert.deepEqual(getCachedFeatures(tenant.tenantId), [], "restart must not fail open back to the full catalog");

  // A feature-gated API must now deny instead of failing open.
  const denied = await tenant.agent.get("/api/products");
  assert.equal(denied.status, 403);

  // Restore: give the tenant its features back for any later assertions.
  await databaseManager.withTransaction(async (client) => {
    await replaceTenantFeatures(client, tenant.tenantId, ["products"]);
  });
  setCachedFeatures(tenant.tenantId, ["products"]);
  const allowed = await tenant.agent.get("/api/products");
  assert.equal(allowed.status, 200);
});

test("one-time backfills are recorded and never re-run (no permission/feature resets on restart)", async () => {
  await databaseManager.withClient(async (client) => {
    const { rows } = await client.query("SELECT key FROM schema_backfills ORDER BY key");
    const keys = rows.map((row) => row.key);
    for (const expected of [
      "retail-permission-split",
      "menu-feature-split",
      "hr-feature-backfill",
      "issue-center-split",
      "hr-permission-backfill",
      "read-write-permission-split",
    ]) {
      assert.ok(keys.includes(expected), `backfill ${expected} recorded as applied`);
    }
  });
});
