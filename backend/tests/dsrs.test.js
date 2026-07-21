import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createDsr } from "./helpers/seeders.js";

let databaseManager;
let tenant;
let otherTenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "DSRs Tenant" });
  otherTenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "DSRs Other Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await cleanupTenant(databaseManager, otherTenant.tenantId);
  await closeTestApp();
});

async function getDsrDueBalance(dsrId) {
  const response = await tenant.agent.get("/api/dsr-due-ledger/balance").query({ dsrId });
  assert.equal(response.status, 200);
  return response.body.balance;
}

test("creating a DSR without name, phone, or area is rejected", async () => {
  const response = await tenant.agent.post("/api/dsrs").send({ name: "No Phone Or Area" });
  assert.equal(response.status, 400);
});

test("a DSR can be created, updated, and listed", async () => {
  const dsr = await createDsr(tenant.agent, { name: `Rahim ${Date.now()}` });

  const updateResponse = await tenant.agent.put(`/api/dsrs/${dsr.id}`).send({
    name: dsr.name,
    phone: dsr.phone,
    area: "New Area",
    status: "Inactive",
  });
  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.dsr.area, "New Area");
  assert.equal(updateResponse.body.dsr.status, "Inactive");

  const listResponse = await tenant.agent.get("/api/dsrs").query({ search: dsr.name });
  assert.ok(listResponse.body.items.some((item) => item.id === dsr.id));
});

test("an opening due creates an OPENING ledger entry matching the balance", async () => {
  const dsr = await createDsr(tenant.agent, { name: `Opening Due DSR ${Date.now()}`, openingDue: 1000 });
  const balance = await getDsrDueBalance(dsr.id);
  assert.equal(balance, 1000);
});

test("changing a DSR's opening due without a reason is rejected, and with a reason it updates the ledger balance", async () => {
  const dsr = await createDsr(tenant.agent, { name: `Adjust DSR ${Date.now()}`, openingDue: 500 });

  const withoutReason = await tenant.agent.put(`/api/dsrs/${dsr.id}`).send({
    name: dsr.name,
    phone: dsr.phone,
    area: dsr.area,
    openingDue: 800,
  });
  assert.equal(withoutReason.status, 400);

  const balanceUnchanged = await getDsrDueBalance(dsr.id);
  assert.equal(balanceUnchanged, 500);

  const withReason = await tenant.agent.put(`/api/dsrs/${dsr.id}`).send({
    name: dsr.name,
    phone: dsr.phone,
    area: dsr.area,
    openingDue: 800,
    reason: "Correcting opening balance",
  });
  assert.equal(withReason.status, 200);

  const balanceAfter = await getDsrDueBalance(dsr.id);
  assert.equal(balanceAfter, 800);
});

test("a DSR with a non-zero balance cannot be deleted", async () => {
  const dsr = await createDsr(tenant.agent, { name: "Unsettled DSR " + Date.now(), openingDue: 500 });
  const response = await tenant.agent.delete("/api/dsrs/" + dsr.id).send({ reason: "cleanup" });
  assert.equal(response.status, 409);
  assert.match(response.body.message, /balance.*0.00/i);
});

test("deleting a DSR moves it to trash, hides it from the active list, and it can be restored", async () => {
  const dsr = await createDsr(tenant.agent, { name: `Trash DSR ${Date.now()}` });

  const deleteResponse = await tenant.agent.delete(`/api/dsrs/${dsr.id}`).send({ reason: "left the company" });
  assert.equal(deleteResponse.status, 200);

  const activeList = await tenant.agent.get("/api/dsrs");
  assert.ok(!activeList.body.items.some((item) => item.id === dsr.id));

  const trashList = await tenant.agent.get("/api/dsrs/trash");
  assert.ok(trashList.body.items.some((item) => item.id === dsr.id));

  const restoreResponse = await tenant.agent.post(`/api/dsrs/${dsr.id}/restore`);
  assert.equal(restoreResponse.status, 200);

  const activeAfterRestore = await tenant.agent.get("/api/dsrs");
  assert.ok(activeAfterRestore.body.items.some((item) => item.id === dsr.id));
});

test("permanently deleting a trashed DSR removes it for good", async () => {
  const dsr = await createDsr(tenant.agent, { name: `Permanent Delete DSR ${Date.now()}` });
  await tenant.agent.delete(`/api/dsrs/${dsr.id}`).send({ reason: "cleanup" });

  const permanentResponse = await tenant.agent.delete(`/api/dsrs/${dsr.id}/permanent`);
  assert.equal(permanentResponse.status, 200);

  const trashList = await tenant.agent.get("/api/dsrs/trash");
  assert.ok(!trashList.body.items.some((item) => item.id === dsr.id));
});

test("tenant isolation: another tenant cannot update, delete, or see a DSR that isn't theirs", async () => {
  const dsr = await createDsr(tenant.agent, { name: `Isolated DSR ${Date.now()}` });

  const updateResponse = await otherTenant.agent.put(`/api/dsrs/${dsr.id}`).send({
    name: "Hijacked",
    phone: "0100000000",
    area: "Nowhere",
  });
  assert.equal(updateResponse.status, 404);

  const deleteResponse = await otherTenant.agent.delete(`/api/dsrs/${dsr.id}`);
  assert.equal(deleteResponse.status, 404);

  const listResponse = await otherTenant.agent.get("/api/dsrs");
  assert.ok(!listResponse.body.items.some((item) => item.id === dsr.id));
});
