import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { TEST_PASSWORD } from "./helpers/fixtures.js";
import { createId } from "../lib/ids.js";
import { hashPassword } from "../lib/passwords.js";
import { USER_ROLES } from "../lib/roles.js";
import { insertUser } from "../repositories/userRepository.js";

let app;
let databaseManager;
let devAgent;
let devUserId;
const createdTenantIds = [];

before(async () => {
  const testApp = await getTestApp();
  app = testApp.app;
  databaseManager = testApp.databaseManager;

  devUserId = createId("user");
  const devEmail = `dev-${devUserId.slice(-10)}@test.local`;
  await databaseManager.withTransaction(async (client) => {
    await insertUser(client, {
      id: devUserId,
      name: "Test Dev",
      email: devEmail,
      passwordHash: await hashPassword(TEST_PASSWORD),
      role: USER_ROLES.SYSTEM_DEVELOPER,
      status: "active",
    });
  });
  devAgent = request.agent(app);
  const devLogin = await devAgent.post("/api/auth/login").send({ email: devEmail, password: TEST_PASSWORD });
  assert.equal(devLogin.status, 200);
});

after(async () => {
  for (const tenantId of createdTenantIds) {
    await databaseManager.withClient(async (client) => {
      await client.query("UPDATE user_sessions SET active_tenant_id = NULL WHERE active_tenant_id = $1", [tenantId]);
      await client.query("DELETE FROM activity_logs WHERE tenant_id = $1", [tenantId]);
      await client.query("DELETE FROM role_permissions WHERE tenant_id = $1", [tenantId]);
      await client.query("DELETE FROM tenant_features WHERE tenant_id = $1", [tenantId]);
      await client.query("DELETE FROM login_history WHERE user_id IN (SELECT id FROM users WHERE tenant_id = $1)", [tenantId]);
      await client.query("DELETE FROM users WHERE tenant_id = $1", [tenantId]);
      await client.query("DELETE FROM tenants WHERE id = $1", [tenantId]);
    });
  }
  await databaseManager.withClient(async (client) => {
    await client.query("DELETE FROM login_history WHERE user_id = $1", [devUserId]);
    await client.query("DELETE FROM users WHERE id = $1", [devUserId]);
  });
  await closeTestApp();
});

test("a tenant created via the platform admin flow gets a usable owner, not a blank app", async () => {
  const suffix = createId("tenant").slice(-10);
  const tenantResponse = await devAgent.post("/api/platform/tenants").send({
    name: `Owner Seed Co ${suffix}`,
    slug: `owner-seed-${suffix}`,
    email: `contact-${suffix}@test.local`,
    plan: "starter",
    businessType: "ELECTRONICS",
    sellerType: "RETAILER",
  });
  assert.equal(tenantResponse.status, 201);
  const tenantId = tenantResponse.body.tenant.id;
  createdTenantIds.push(tenantId);

  const ownerEmail = `owner-${suffix}@test.local`;
  const createOwnerResponse = await devAgent
    .post("/api/users")
    .set("X-Active-Tenant-Id", tenantId)
    .send({
      name: "New Owner",
      email: ownerEmail,
      password: TEST_PASSWORD,
      role: "super_admin",
      status: "active",
      tenantId,
    });
  assert.equal(createOwnerResponse.status, 201);

  const ownerAgent = request.agent(app);
  const ownerLogin = await ownerAgent.post("/api/auth/login").send({ email: ownerEmail, password: TEST_PASSWORD });
  assert.equal(ownerLogin.status, 200);

  // The whole point: this owner must be able to actually use the app on
  // first login, not 403 on everything because nobody visited Permissions yet.
  // super_admin can't view its own permission ceiling (no self-escalation),
  // so read it back through the platform admin instead.
  const permissionsResponse = await devAgent.get("/api/permissions").set("X-Active-Tenant-Id", tenantId).query({ tenantId });
  assert.equal(permissionsResponse.status, 200);
  const ownerRole = permissionsResponse.body.roles.find((entry) => entry.role === "super_admin");
  assert.ok(ownerRole, "expected a super_admin entry in the permissions response");
  assert.ok(ownerRole.permissions.length > 0, "a freshly seeded owner must not have zero permissions");
  assert.ok(ownerRole.permissions.includes("view_products"), "owner should hold view_products, a default-enabled feature's permission");

  const productsResponse = await ownerAgent.get("/api/products");
  assert.equal(productsResponse.status, 200, "owner must be able to reach a real endpoint immediately, not 403");
});

test("seeding only fires once — a deliberately-trimmed super_admin permission set survives creating a second owner", async () => {
  const suffix = createId("tenant").slice(-10);
  const tenantResponse = await devAgent.post("/api/platform/tenants").send({
    name: `Second Owner Co ${suffix}`,
    slug: `second-owner-${suffix}`,
    email: `contact2-${suffix}@test.local`,
    plan: "starter",
    businessType: "ELECTRONICS",
    sellerType: "RETAILER",
  });
  assert.equal(tenantResponse.status, 201);
  const tenantId = tenantResponse.body.tenant.id;
  createdTenantIds.push(tenantId);

  const firstOwnerEmail = `first-owner-${suffix}@test.local`;
  const createFirstOwner = await devAgent
    .post("/api/users")
    .set("X-Active-Tenant-Id", tenantId)
    .send({
      name: "First Owner",
      email: firstOwnerEmail,
      password: TEST_PASSWORD,
      role: "super_admin",
      status: "active",
      tenantId,
    });
  assert.equal(createFirstOwner.status, 201);

  // Deliberately trim the owner's permissions down to just one.
  const trimResponse = await devAgent
    .put("/api/permissions/super_admin")
    .set("X-Active-Tenant-Id", tenantId)
    .send({ permissions: ["view_products"], tenantId });
  assert.equal(trimResponse.status, 200);

  const secondOwnerEmail = `second-owner-${suffix}@test.local`;
  const createSecondOwner = await devAgent
    .post("/api/users")
    .set("X-Active-Tenant-Id", tenantId)
    .send({
      name: "Second Owner",
      email: secondOwnerEmail,
      password: TEST_PASSWORD,
      role: "super_admin",
      status: "active",
      tenantId,
    });
  assert.equal(createSecondOwner.status, 201);

  const secondOwnerAgent = request.agent(app);
  const secondLogin = await secondOwnerAgent.post("/api/auth/login").send({ email: secondOwnerEmail, password: TEST_PASSWORD });
  assert.equal(secondLogin.status, 200);

  const permissionsResponse = await devAgent.get("/api/permissions").set("X-Active-Tenant-Id", tenantId).query({ tenantId });
  assert.equal(permissionsResponse.status, 200);
  const role = permissionsResponse.body.roles.find((entry) => entry.role === "super_admin");
  assert.deepEqual(role.permissions, ["view_products"], "creating a second super_admin must not re-seed or reset the already-configured permission set");
});
