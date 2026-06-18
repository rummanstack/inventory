import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { getCashAccount } from "./helpers/seeders.js";

let databaseManager;
let tenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Finance Accounts Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await closeTestApp();
});

async function transact(type, amount) {
  return tenant.agent.post("/api/finance-accounts/transactions").send({
    accountType: "CASH",
    type,
    amount,
    date: "2026-04-01",
    note: `${type} test`,
  });
}

test("sequential deposits and withdrawals keep the running balance consistent", async () => {
  const before = await getCashAccount(tenant.agent);

  const deposit1 = await transact("DEPOSIT", 1000);
  assert.equal(deposit1.status, 201);
  assert.equal(deposit1.body.transaction.balanceAfter, before.balance + 1000);

  const deposit2 = await transact("DEPOSIT", 500);
  assert.equal(deposit2.status, 201);
  assert.equal(deposit2.body.transaction.balanceAfter, before.balance + 1500);

  const withdrawal = await transact("WITHDRAWAL", 700);
  assert.equal(withdrawal.status, 201);
  assert.equal(withdrawal.body.transaction.balanceAfter, before.balance + 800);

  const after = await getCashAccount(tenant.agent);
  assert.equal(after.balance, before.balance + 800);
});

test("a withdrawal exceeding the balance is rejected and the balance is unchanged", async () => {
  const before = await getCashAccount(tenant.agent);

  const response = await transact("WITHDRAWAL", before.balance + 1);
  assert.equal(response.status, 400);
  assert.match(response.body.message, /Insufficient cash balance/);

  const after = await getCashAccount(tenant.agent);
  assert.equal(after.balance, before.balance);
});

test("a withdrawal for exactly the available balance is accepted (boundary case)", async () => {
  await transact("DEPOSIT", 250);
  const before = await getCashAccount(tenant.agent);

  const response = await transact("WITHDRAWAL", before.balance);
  assert.equal(response.status, 201);

  const after = await getCashAccount(tenant.agent);
  assert.equal(after.balance, 0);
});
