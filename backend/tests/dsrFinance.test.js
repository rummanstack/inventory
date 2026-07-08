import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createDsr, getCashAccount, depositCash } from "./helpers/seeders.js";

let databaseManager;
let tenant;
let otherTenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "DSR Finance Tenant" });
  otherTenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "DSR Finance Other Tenant" });
  // A fresh tenant's cash account starts at zero; advances withdraw cash, so fund it first.
  await depositCash(tenant.agent, 100000);
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

test("an advance without an amount, dsrId, or note is rejected", async () => {
  const dsr = await createDsr(tenant.agent, { name: `No Note DSR ${Date.now()}` });
  const response = await tenant.agent.post("/api/dsr-advances").send({ dsrId: dsr.id, amount: 500 });
  assert.equal(response.status, 400);
});

test("recording an advance withdraws cash and adds to the DSR's due balance", async () => {
  const dsr = await createDsr(tenant.agent, { name: `Advance DSR ${Date.now()}` });
  const cashBefore = await getCashAccount(tenant.agent);

  const response = await tenant.agent.post("/api/dsr-advances").send({
    dsrId: dsr.id,
    date: "2026-04-10",
    amount: 300,
    note: "Fuel advance",
  });
  assert.equal(response.status, 201);

  const cashAfter = await getCashAccount(tenant.agent);
  assert.equal(Number(cashAfter.balance), Number(cashBefore.balance) - 300);

  const balance = await getDsrDueBalance(dsr.id);
  assert.equal(balance, 300);
});

test("editing an advance without a reason is rejected; with a reason it adjusts cash and the due balance by the delta", async () => {
  const dsr = await createDsr(tenant.agent, { name: `Edit Advance DSR ${Date.now()}` });
  const createResponse = await tenant.agent.post("/api/dsr-advances").send({
    dsrId: dsr.id,
    date: "2026-04-10",
    amount: 200,
    note: "Initial advance",
  });
  const advanceId = createResponse.body.record.id;

  const withoutReason = await tenant.agent.patch(`/api/dsr-advances/${advanceId}`).send({
    dsrId: dsr.id,
    date: "2026-04-10",
    amount: 350,
    note: "Initial advance",
  });
  assert.equal(withoutReason.status, 400);

  const cashBefore = await getCashAccount(tenant.agent);
  const withReason = await tenant.agent.patch(`/api/dsr-advances/${advanceId}`).send({
    dsrId: dsr.id,
    date: "2026-04-10",
    amount: 350,
    note: "Initial advance",
    reason: "Underestimated fuel cost",
  });
  assert.equal(withReason.status, 200);

  const cashAfter = await getCashAccount(tenant.agent);
  assert.equal(Number(cashAfter.balance), Number(cashBefore.balance) - 150);

  const balance = await getDsrDueBalance(dsr.id);
  assert.equal(balance, 350);
});

test("deleting an advance deposits the cash back and removes it from the DSR's due balance", async () => {
  const dsr = await createDsr(tenant.agent, { name: `Delete Advance DSR ${Date.now()}` });
  const createResponse = await tenant.agent.post("/api/dsr-advances").send({
    dsrId: dsr.id,
    date: "2026-04-10",
    amount: 500,
    note: "To be deleted",
  });
  const advanceId = createResponse.body.record.id;
  const cashBefore = await getCashAccount(tenant.agent);

  const deleteResponse = await tenant.agent.delete(`/api/dsr-advances/${advanceId}`);
  assert.equal(deleteResponse.status, 200);

  const cashAfter = await getCashAccount(tenant.agent);
  assert.equal(Number(cashAfter.balance), Number(cashBefore.balance) + 500);

  const balance = await getDsrDueBalance(dsr.id);
  assert.equal(balance, 0);
});

test("tenant isolation: another tenant cannot edit or delete an advance that isn't theirs", async () => {
  const dsr = await createDsr(tenant.agent, { name: `Isolated Advance DSR ${Date.now()}` });
  const createResponse = await tenant.agent.post("/api/dsr-advances").send({
    dsrId: dsr.id,
    date: "2026-04-10",
    amount: 250,
    note: "Isolated advance",
  });
  const advanceId = createResponse.body.record.id;

  // The update path validates dsrId against the caller's own tenant before it ever
  // looks up the advance record, so cross-tenant access surfaces as 400 ("Select a
  // valid DSR"), not 404 — the record's own ownership check never gets a chance to run.
  const updateResponse = await otherTenant.agent.patch(`/api/dsr-advances/${advanceId}`).send({
    dsrId: dsr.id,
    date: "2026-04-10",
    amount: 999,
    note: "Hijacked",
    reason: "hijack attempt",
  });
  assert.equal(updateResponse.status, 400);

  const deleteResponse = await otherTenant.agent.delete(`/api/dsr-advances/${advanceId}`);
  assert.equal(deleteResponse.status, 404);
});
