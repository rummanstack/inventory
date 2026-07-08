import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createSr } from "./helpers/seeders.js";

let databaseManager;
let tenant;
let otherTenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "SRs Tenant" });
  otherTenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "SRs Other Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await cleanupTenant(databaseManager, otherTenant.tenantId);
  await closeTestApp();
});

async function getSrDueBalance(srId) {
  const response = await tenant.agent.get("/api/sr-due-ledger/balance").query({ srId });
  assert.equal(response.status, 200);
  return response.body.balance;
}

test("creating an SR without name or phone is rejected", async () => {
  const response = await tenant.agent.post("/api/srs").send({ name: "No Phone" });
  assert.equal(response.status, 400);
});

test("an SR can be created, updated, and listed", async () => {
  const sr = await createSr(tenant.agent, { name: `Karim ${Date.now()}` });

  const updateResponse = await tenant.agent.put(`/api/srs/${sr.id}`).send({
    name: sr.name,
    phone: "0177123456",
    status: "Inactive",
  });
  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.sr.phone, "0177123456");
  assert.equal(updateResponse.body.sr.status, "Inactive");

  const listResponse = await tenant.agent.get("/api/srs").query({ search: sr.name });
  assert.ok(listResponse.body.items.some((item) => item.id === sr.id));
});

test("an opening due creates an OPENING ledger entry matching the balance", async () => {
  const sr = await createSr(tenant.agent, { name: `Opening Due SR ${Date.now()}`, openingDue: 700 });
  const balance = await getSrDueBalance(sr.id);
  assert.equal(balance, 700);
});

test("changing an SR's opening due without a reason is rejected, and with a reason it updates the ledger balance", async () => {
  const sr = await createSr(tenant.agent, { name: `Adjust SR ${Date.now()}`, openingDue: 300 });

  const withoutReason = await tenant.agent.put(`/api/srs/${sr.id}`).send({
    name: sr.name,
    phone: sr.phone,
    openingDue: 600,
  });
  assert.equal(withoutReason.status, 400);

  const balanceUnchanged = await getSrDueBalance(sr.id);
  assert.equal(balanceUnchanged, 300);

  const withReason = await tenant.agent.put(`/api/srs/${sr.id}`).send({
    name: sr.name,
    phone: sr.phone,
    openingDue: 600,
    reason: "Correcting opening balance",
  });
  assert.equal(withReason.status, 200);

  const balanceAfter = await getSrDueBalance(sr.id);
  assert.equal(balanceAfter, 600);
});

test("deleting an SR moves it to trash, hides it from the active list, and it can be restored", async () => {
  const sr = await createSr(tenant.agent, { name: `Trash SR ${Date.now()}` });

  const deleteResponse = await tenant.agent.delete(`/api/srs/${sr.id}`).send({ reason: "left the company" });
  assert.equal(deleteResponse.status, 200);

  const activeList = await tenant.agent.get("/api/srs");
  assert.ok(!activeList.body.items.some((item) => item.id === sr.id));

  const trashList = await tenant.agent.get("/api/srs/trash");
  assert.ok(trashList.body.items.some((item) => item.id === sr.id));

  const restoreResponse = await tenant.agent.post(`/api/srs/${sr.id}/restore`);
  assert.equal(restoreResponse.status, 200);

  const activeAfterRestore = await tenant.agent.get("/api/srs");
  assert.ok(activeAfterRestore.body.items.some((item) => item.id === sr.id));
});

test("permanently deleting a trashed SR removes it for good", async () => {
  const sr = await createSr(tenant.agent, { name: `Permanent Delete SR ${Date.now()}` });
  await tenant.agent.delete(`/api/srs/${sr.id}`).send({ reason: "cleanup" });

  const permanentResponse = await tenant.agent.delete(`/api/srs/${sr.id}/permanent`);
  assert.equal(permanentResponse.status, 200);

  const trashList = await tenant.agent.get("/api/srs/trash");
  assert.ok(!trashList.body.items.some((item) => item.id === sr.id));
});

test("tenant isolation: another tenant cannot update, delete, or see an SR that isn't theirs", async () => {
  const sr = await createSr(tenant.agent, { name: `Isolated SR ${Date.now()}` });

  const updateResponse = await otherTenant.agent.put(`/api/srs/${sr.id}`).send({
    name: "Hijacked",
    phone: "0100000000",
  });
  assert.equal(updateResponse.status, 404);

  const deleteResponse = await otherTenant.agent.delete(`/api/srs/${sr.id}`);
  assert.equal(deleteResponse.status, 404);

  const listResponse = await otherTenant.agent.get("/api/srs");
  assert.ok(!listResponse.body.items.some((item) => item.id === sr.id));
});
