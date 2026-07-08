import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { getCashAccount, depositCash } from "./helpers/seeders.js";

let databaseManager;
let tenant;
let otherTenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Expenses Tenant" });
  otherTenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Expenses Other Tenant" });
  // A fresh tenant's cash account starts at zero; expenses withdraw cash, so fund it first.
  await depositCash(tenant.agent, 100000);
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await cleanupTenant(databaseManager, otherTenant.tenantId);
  await closeTestApp();
});

test("an invalid category is rejected", async () => {
  const response = await tenant.agent.post("/api/expenses").send({
    date: "2026-04-01",
    category: "Not A Real Category",
    amount: 100,
    note: "Bad category",
  });
  assert.equal(response.status, 400);
});

test("a zero or missing amount, or a missing note, is rejected", async () => {
  const noAmount = await tenant.agent.post("/api/expenses").send({ date: "2026-04-01", category: "Office", note: "test" });
  assert.equal(noAmount.status, 400);

  const noNote = await tenant.agent.post("/api/expenses").send({ date: "2026-04-01", category: "Office", amount: 50 });
  assert.equal(noNote.status, 400);
});

test("creating an expense withdraws cash", async () => {
  const cashBefore = await getCashAccount(tenant.agent);

  const response = await tenant.agent.post("/api/expenses").send({
    date: "2026-04-01",
    category: "Rent",
    amount: 5000,
    note: "April rent",
  });
  assert.equal(response.status, 201);

  const cashAfter = await getCashAccount(tenant.agent);
  assert.equal(Number(cashAfter.balance), Number(cashBefore.balance) - 5000);
});

test("editing an expense without a reason is rejected; with a reason cash moves by the delta", async () => {
  const createResponse = await tenant.agent.post("/api/expenses").send({
    date: "2026-04-02",
    category: "Vehicle",
    amount: 1000,
    note: "Fuel",
  });
  const expenseId = createResponse.body.expense.id;

  const withoutReason = await tenant.agent.patch(`/api/expenses/${expenseId}`).send({
    date: "2026-04-02",
    category: "Vehicle",
    amount: 1500,
    note: "Fuel",
  });
  assert.equal(withoutReason.status, 400);

  const cashBefore = await getCashAccount(tenant.agent);
  const withReason = await tenant.agent.patch(`/api/expenses/${expenseId}`).send({
    date: "2026-04-02",
    category: "Vehicle",
    amount: 1500,
    note: "Fuel",
    reason: "Forgot toll charges",
  });
  assert.equal(withReason.status, 200);

  const cashAfter = await getCashAccount(tenant.agent);
  assert.equal(Number(cashAfter.balance), Number(cashBefore.balance) - 500);
});

test("deleting an expense deposits the cash back, and it can be restored (withdrawing the cash again)", async () => {
  const createResponse = await tenant.agent.post("/api/expenses").send({
    date: "2026-04-03",
    category: "Other",
    amount: 800,
    note: "Misc",
  });
  const expenseId = createResponse.body.expense.id;

  const cashBeforeDelete = await getCashAccount(tenant.agent);
  const deleteResponse = await tenant.agent.delete(`/api/expenses/${expenseId}`).send({ reason: "entered twice" });
  assert.equal(deleteResponse.status, 200);

  const cashAfterDelete = await getCashAccount(tenant.agent);
  assert.equal(Number(cashAfterDelete.balance), Number(cashBeforeDelete.balance) + 800);

  const trashList = await tenant.agent.get("/api/expenses/trash");
  assert.ok(trashList.body.items.some((item) => item.id === expenseId));

  const restoreResponse = await tenant.agent.post(`/api/expenses/${expenseId}/restore`);
  assert.equal(restoreResponse.status, 200);

  const cashAfterRestore = await getCashAccount(tenant.agent);
  assert.equal(Number(cashAfterRestore.balance), Number(cashBeforeDelete.balance));
});

test("permanently deleting a trashed expense removes it for good", async () => {
  const createResponse = await tenant.agent.post("/api/expenses").send({
    date: "2026-04-04",
    category: "Load/Unload",
    amount: 300,
    note: "Loading charge",
  });
  const expenseId = createResponse.body.expense.id;
  await tenant.agent.delete(`/api/expenses/${expenseId}`).send({ reason: "cleanup" });

  const permanentResponse = await tenant.agent.delete(`/api/expenses/${expenseId}/permanent`);
  assert.equal(permanentResponse.status, 200);

  const trashList = await tenant.agent.get("/api/expenses/trash");
  assert.ok(!trashList.body.items.some((item) => item.id === expenseId));
});

test("tenant isolation: another tenant cannot edit or delete an expense that isn't theirs", async () => {
  const createResponse = await tenant.agent.post("/api/expenses").send({
    date: "2026-04-05",
    category: "Office",
    amount: 400,
    note: "Isolated expense",
  });
  const expenseId = createResponse.body.expense.id;

  const updateResponse = await otherTenant.agent.patch(`/api/expenses/${expenseId}`).send({
    date: "2026-04-05",
    category: "Office",
    amount: 999,
    note: "Hijacked",
    reason: "hijack",
  });
  assert.equal(updateResponse.status, 404);

  const deleteResponse = await otherTenant.agent.delete(`/api/expenses/${expenseId}`);
  assert.equal(deleteResponse.status, 404);
});
