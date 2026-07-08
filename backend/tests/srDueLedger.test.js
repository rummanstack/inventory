import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createSr, getCashAccount } from "./helpers/seeders.js";

let databaseManager;
let tenant;
let otherTenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "SR Due Ledger Tenant" });
  otherTenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "SR Due Ledger Other Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await cleanupTenant(databaseManager, otherTenant.tenantId);
  await closeTestApp();
});

test("collecting from an SR within its due balance deposits cash and reduces the balance", async () => {
  const sr = await createSr(tenant.agent, { name: `Collect SR ${Date.now()}`, openingDue: 1000 });
  const cashBefore = await getCashAccount(tenant.agent);

  const collectResponse = await tenant.agent.post("/api/sr-due-ledger/collect").send({ srId: sr.id, amount: 400 });
  assert.equal(collectResponse.status, 200);

  const balanceResponse = await tenant.agent.get("/api/sr-due-ledger/balance").query({ srId: sr.id });
  assert.equal(balanceResponse.body.balance, 600);

  const cashAfter = await getCashAccount(tenant.agent);
  assert.equal(Number(cashAfter.balance), Number(cashBefore.balance) + 400);
});

test("collecting more than the SR's current due balance is rejected and changes nothing", async () => {
  const sr = await createSr(tenant.agent, { name: `Overcollect SR ${Date.now()}`, openingDue: 300 });

  const collectResponse = await tenant.agent.post("/api/sr-due-ledger/collect").send({ srId: sr.id, amount: 500 });
  assert.equal(collectResponse.status, 400);

  const balanceResponse = await tenant.agent.get("/api/sr-due-ledger/balance").query({ srId: sr.id });
  assert.equal(balanceResponse.body.balance, 300);
});

test("collecting a non-positive amount is rejected", async () => {
  const sr = await createSr(tenant.agent, { name: `Zero Collect SR ${Date.now()}`, openingDue: 100 });

  const collectResponse = await tenant.agent.post("/api/sr-due-ledger/collect").send({ srId: sr.id, amount: 0 });
  assert.equal(collectResponse.status, 400);
});

test("tenant isolation: another tenant cannot collect from or view an SR's due ledger", async () => {
  const sr = await createSr(tenant.agent, { name: `Isolated SR Ledger ${Date.now()}`, openingDue: 500 });

  const collectResponse = await otherTenant.agent.post("/api/sr-due-ledger/collect").send({ srId: sr.id, amount: 100 });
  assert.equal(collectResponse.status, 404);

  const balanceResponse = await otherTenant.agent.get("/api/sr-due-ledger/balance").query({ srId: sr.id });
  assert.equal(balanceResponse.status, 404);
});
