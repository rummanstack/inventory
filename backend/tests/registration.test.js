import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant, TEST_PASSWORD } from "./helpers/fixtures.js";
import { createId } from "../lib/ids.js";
import { hashPassword } from "../lib/passwords.js";
import { USER_ROLES } from "../lib/roles.js";
import { insertUser } from "../repositories/userRepository.js";

let app;
let databaseManager;
let devAgent;
let devUserId;
let tenant;
const registeredTenantIds = [];

const suffix = createId("reg").slice(-10);
const ownerEmail = `owner-${suffix}@test.local`;
const ownerPassword = "Owner@12345";

function registrationPayload(overrides = {}) {
  return {
    businessName: `Reg Test Business ${suffix}`,
    businessType: "GROCERY",
    ownerName: "Reg Owner",
    email: ownerEmail,
    phone: "01700000000",
    password: ownerPassword,
    ...overrides,
  };
}

before(async () => {
  const testApp = await getTestApp();
  app = testApp.app;
  databaseManager = testApp.databaseManager;

  // Platform admin (system_developer has no tenant) to review registrations.
  devUserId = createId("user");
  const devEmail = `dev-${suffix}@test.local`;
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

  // Regular tenant admin used to prove non-platform users can't reach the queue.
  tenant = await createTenantAndAdmin(databaseManager, app, { name: "Reg Bystander Co" });
});

after(async () => {
  for (const tenantId of registeredTenantIds) {
    await cleanupTenant(databaseManager, tenantId);
  }
  await cleanupTenant(databaseManager, tenant.tenantId);
  await databaseManager.withClient(async (client) => {
    await client.query("DELETE FROM login_history WHERE user_id = $1", [devUserId]);
    await client.query("DELETE FROM users WHERE id = $1", [devUserId]);
  });
  await closeTestApp();
});

test("public registration creates a pending tenant with owner user", async () => {
  const res = await request(app).post("/api/register").send(registrationPayload());
  assert.equal(res.status, 201);
  assert.equal(res.body.status, "pending");
  assert.ok(res.body.id);
  registeredTenantIds.push(res.body.id);
});

test("pending owner cannot log in yet", async () => {
  const res = await request(app).post("/api/auth/login").send({ email: ownerEmail, password: ownerPassword });
  assert.equal(res.status, 403);
  assert.match(res.body.message, /awaiting approval/i);
});

test("duplicate email is rejected", async () => {
  const res = await request(app).post("/api/register").send(registrationPayload({ businessName: "Another Biz" }));
  assert.equal(res.status, 409);
});

test("weak password is rejected", async () => {
  const res = await request(app)
    .post("/api/register")
    .send(registrationPayload({ email: `weak-${suffix}@test.local`, password: "short" }));
  assert.equal(res.status, 400);
});

test("tenant admin cannot access the registration queue", async () => {
  const res = await tenant.agent.get("/api/platform/registrations");
  assert.equal(res.status, 403);
});

test("platform admin sees the pending registration with owner contact info", async () => {
  const res = await devAgent.get("/api/platform/registrations");
  assert.equal(res.status, 200);
  const item = res.body.items.find((row) => row.id === registeredTenantIds[0]);
  assert.ok(item, "registered tenant should be in the queue");
  assert.equal(item.status, "pending");
  assert.equal(item.ownerEmail, ownerEmail);
  assert.equal(item.ownerName, "Reg Owner");
  assert.equal(item.phone, "01700000000");
  assert.equal(item.businessType, "GROCERY");
});

test("grocery registration is seeded with dealer features, not electronics ones", async () => {
  const res = await devAgent.get(`/api/platform/tenants/${registeredTenantIds[0]}/features`);
  assert.equal(res.status, 200);
  const features = res.body.features || res.body;
  assert.ok(features.includes("dsrs"), "grocery tenant should have DSR features");
  assert.ok(!features.includes("product-serials"), "grocery tenant should not have electronics serials");
});

test("approving activates the tenant and the owner can log in", async () => {
  const approveRes = await devAgent.post(`/api/platform/registrations/${registeredTenantIds[0]}/approve`);
  assert.equal(approveRes.status, 200);
  assert.equal(approveRes.body.status, "active");

  const loginRes = await request(app).post("/api/auth/login").send({ email: ownerEmail, password: ownerPassword });
  assert.equal(loginRes.status, 200);
  assert.ok(loginRes.body.permissions.length > 0, "approved owner receives a usable permission ceiling");
  assert.ok(loginRes.body.permissions.includes("view_products"));

  const ownerAgent = request.agent(app);
  const ownerLogin = await ownerAgent.post("/api/auth/login").send({ email: ownerEmail, password: ownerPassword });
  assert.equal(ownerLogin.status, 200);
  const productsRes = await ownerAgent.get("/api/products");
  assert.equal(productsRes.status, 200, "approved owner can use an enabled business module");

  const queueRes = await devAgent.get("/api/platform/registrations");
  assert.ok(!queueRes.body.items.some((row) => row.id === registeredTenantIds[0]), "approved tenant leaves the queue");
});

test("rejected registration stays blocked from logging in", async () => {
  const rejectEmail = `reject-${suffix}@test.local`;
  const registerRes = await request(app)
    .post("/api/register")
    .send(registrationPayload({ businessName: `Reject Biz ${suffix}`, email: rejectEmail }));
  assert.equal(registerRes.status, 201);
  registeredTenantIds.push(registerRes.body.id);

  const rejectRes = await devAgent.post(`/api/platform/registrations/${registerRes.body.id}/reject`);
  assert.equal(rejectRes.status, 200);
  assert.equal(rejectRes.body.status, "rejected");

  const loginRes = await request(app).post("/api/auth/login").send({ email: rejectEmail, password: ownerPassword });
  assert.equal(loginRes.status, 403);

  // A rejected registration can still be approved later after a follow-up call.
  const approveRes = await devAgent.post(`/api/platform/registrations/${registerRes.body.id}/approve`);
  assert.equal(approveRes.status, 200);
  const retryLogin = await request(app).post("/api/auth/login").send({ email: rejectEmail, password: ownerPassword });
  assert.equal(retryLogin.status, 200);
});
