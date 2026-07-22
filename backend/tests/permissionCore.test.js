import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { TENANT_BUSINESS_PERMISSIONS, PERMISSIONS } from "../lib/permissions.js";
import {
  EMPTY_PERMISSION_SENTINEL,
  getCachedPermissions,
  loadPermissionCache,
  setCachedPermissions,
} from "../lib/permissionCache.js";
import {
  listEffectiveRolePermissions,
  replaceRolePermissions,
} from "../repositories/rolePermissionRepository.js";
import {
  PERMISSION_DEPENDENCIES,
  PERMISSION_REQUIRED_FEATURES,
  permissionMatchesEnabledFeatures,
} from "../services/permissionService.js";
import { closeTestApp, getTestApp } from "./helpers/testApp.js";
import { cleanupTenant, createTenantAndAdmin, TEST_PASSWORD } from "./helpers/fixtures.js";

let app;
let databaseManager;
let tenant;

before(async () => {
  const testApp = await getTestApp();
  app = testApp.app;
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, app, { name: "Permission Core Co" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await closeTestApp();
});

test("explicitly empty role permissions neither inherit global rows nor reappear after cache reload", async () => {
  const client = await databaseManager.getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM role_permissions WHERE role = 'manager' AND tenant_id IN ($1, 'global')", [
      tenant.tenantId,
    ]);
    await client.query(
      "INSERT INTO role_permissions (role, tenant_id, permission) VALUES ('manager', 'global', 'view_products')",
    );

    await replaceRolePermissions(client, "manager", tenant.tenantId, []);
    const raw = await client.query(
      "SELECT permission FROM role_permissions WHERE role = 'manager' AND tenant_id = $1",
      [tenant.tenantId],
    );
    assert.deepEqual(raw.rows.map((row) => row.permission), [EMPTY_PERMISSION_SENTINEL]);
    assert.deepEqual(await listEffectiveRolePermissions(client, "manager", tenant.tenantId), []);
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }

  try {
    await loadPermissionCache({
      query: async () => ({
        rows: [
          { role: "manager", tenant_id: "global", permission: PERMISSIONS.VIEW_PRODUCTS },
          { role: "manager", tenant_id: tenant.tenantId, permission: EMPTY_PERMISSION_SENTINEL },
        ],
      }),
    });
    assert.deepEqual(getCachedPermissions("manager", tenant.tenantId), []);
  } finally {
    await loadPermissionCache(databaseManager.getPool());
  }
});

test("permission metadata covers feature alternatives and exposes structural dependencies", async () => {
  const response = await tenant.agent.get("/api/permissions");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.permissionRequiredFeatures[PERMISSIONS.VIEW_PRODUCTS], [
    "products",
    "stock-movement",
    "low-stock-alerts",
    "damaged-stock",
  ]);
  assert.deepEqual(response.body.permissionDependencies[PERMISSIONS.MANAGE_PRODUCTS], [PERMISSIONS.VIEW_PRODUCTS]);
  assert.deepEqual(PERMISSION_REQUIRED_FEATURES[PERMISSIONS.VIEW_INSTALLMENT_PLANS], [
    "installment-plans",
    "installment-reports",
    "installment-dashboard",
    "installment-late-fee-rules",
  ]);
  assert.equal(PERMISSION_REQUIRED_FEATURES[PERMISSIONS.REPORT_CASH_FLOW], "cash-flow");
  assert.deepEqual(PERMISSION_DEPENDENCIES[PERMISSIONS.APPROVE_PAYROLL], [PERMISSIONS.VIEW_PAYROLL]);
  assert.equal(permissionMatchesEnabledFeatures(PERMISSIONS.VIEW_PRODUCTS, ["damaged-stock"]), true);
  assert.equal(permissionMatchesEnabledFeatures(PERMISSIONS.VIEW_PRODUCTS, ["customers"]), false);
});

test("permission saves reject missing dependencies", async () => {
  const response = await tenant.agent
    .put("/api/permissions/manager")
    .send({ permissions: [PERMISSIONS.MANAGE_PRODUCTS] });
  assert.equal(response.status, 400);
  assert.match(response.body.message, /requires: view_products/);
});

test("manager user administration is limited to operators and cannot target self or higher roles", async () => {
  const grantResponse = await tenant.agent
    .put("/api/permissions/manager")
    .send({ permissions: [PERMISSIONS.MANAGE_USERS] });
  assert.equal(grantResponse.status, 200);

  const managerEmail = `manager-${tenant.tenantId.slice(-10)}@test.local`;
  const created = await tenant.agent.post("/api/users").send({
    name: "Permission Manager",
    email: managerEmail,
    password: TEST_PASSWORD,
    role: "manager",
    status: "active",
  });
  assert.equal(created.status, 201);
  const manager = created.body.users.find((user) => user.email === managerEmail);
  const owner = created.body.users.find((user) => user.email === tenant.email);
  assert.ok(manager);
  assert.ok(owner);

  const managerAgent = request.agent(app);
  const login = await managerAgent.post("/api/auth/login").send({ email: managerEmail, password: TEST_PASSWORD });
  assert.equal(login.status, 200);

  const selfPromotion = await managerAgent.patch(`/api/users/${manager.id}`).send({ role: "admin" });
  assert.equal(selfPromotion.status, 403);

  const selfReset = await managerAgent.post(`/api/users/${manager.id}/reset-password`);
  assert.equal(selfReset.status, 403);

  const selfDelete = await managerAgent.delete(`/api/users/${manager.id}`).send({ reason: "must be rejected" });
  assert.equal(selfDelete.status, 403);

  const createAdmin = await managerAgent.post("/api/users").send({
    name: "Illicit Admin",
    email: `illicit-${tenant.tenantId.slice(-10)}@test.local`,
    password: TEST_PASSWORD,
    role: "admin",
  });
  assert.equal(createAdmin.status, 403);

  const resetOwner = await managerAgent.post(`/api/users/${owner.id}/reset-password`);
  assert.equal(resetOwner.status, 403);

  const createOperator = await managerAgent.post("/api/users").send({
    name: "Allowed Operator",
    email: `operator-${tenant.tenantId.slice(-10)}@test.local`,
    password: TEST_PASSWORD,
    role: "operator",
  });
  assert.equal(createOperator.status, 201);
});

test("super admin cannot delegate beyond its own effective permission ceiling", async () => {
  await databaseManager.withTransaction(async (client) => {
    await replaceRolePermissions(client, "super_admin", tenant.tenantId, [PERMISSIONS.VIEW_PRODUCTS]);
  });
  setCachedPermissions("super_admin", tenant.tenantId, [PERMISSIONS.VIEW_PRODUCTS]);

  try {
    const response = await tenant.agent.put("/api/permissions/operator").send({
      permissions: [PERMISSIONS.VIEW_PRODUCTS, PERMISSIONS.MANAGE_PRODUCTS],
    });
    assert.equal(response.status, 403);
    assert.match(response.body.message, /do not have: manage_products/);
  } finally {
    await databaseManager.withTransaction(async (client) => {
      await replaceRolePermissions(client, "super_admin", tenant.tenantId, TENANT_BUSINESS_PERMISSIONS);
    });
    setCachedPermissions("super_admin", tenant.tenantId, TENANT_BUSINESS_PERMISSIONS);
  }
});

test("the next authenticated request observes a revocation even when its process cache is stale", async () => {
  const operatorEmail = `revoked-${tenant.tenantId.slice(-10)}@test.local`;
  const createResponse = await tenant.agent.post("/api/users").send({
    name: "Revocation Test Operator",
    email: operatorEmail,
    password: TEST_PASSWORD,
    role: "operator",
    status: "active",
  });
  assert.equal(createResponse.status, 201);

  const operator = createResponse.body.users.find((user) => user.email === operatorEmail);
  assert.ok(operator);

  const grantResponse = await tenant.agent
    .put("/api/permissions/operator")
    .send({ permissions: [PERMISSIONS.MANAGE_USERS] });
  assert.equal(grantResponse.status, 200);

  const operatorAgent = request.agent(app);
  const login = await operatorAgent.post("/api/auth/login").send({
    email: operatorEmail,
    password: TEST_PASSWORD,
  });
  assert.equal(login.status, 200);
  assert.equal((await operatorAgent.get("/api/users")).status, 200);

  await databaseManager.withTransaction(async (client) => {
    await replaceRolePermissions(client, "operator", tenant.tenantId, []);
  });
  // Simulate another application instance retaining the old grant. requireAuth
  // must replace this from the authoritative DB before route authorization.
  setCachedPermissions("operator", tenant.tenantId, [PERMISSIONS.MANAGE_USERS]);

  assert.equal((await operatorAgent.get("/api/users")).status, 403);
});
