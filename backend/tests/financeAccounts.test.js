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

async function getBankAccount() {
  const response = await tenant.agent.get("/api/finance-accounts");
  assert.equal(response.status, 200);
  return response.body.accounts.find((account) => account.type === "BANK");
}

test("depositing into the Bank account keeps it independent from the Cash account", async () => {
  const cashBefore = await getCashAccount(tenant.agent);

  const response = await tenant.agent.post("/api/finance-accounts/transactions").send({
    accountType: "BANK",
    type: "DEPOSIT",
    amount: 2000,
    date: "2026-04-01",
    note: "Bank deposit test",
  });
  assert.equal(response.status, 201);

  const bankAfter = await getBankAccount();
  assert.equal(bankAfter.balance, 2000);

  const cashAfter = await getCashAccount(tenant.agent);
  assert.equal(Number(cashAfter.balance), Number(cashBefore.balance), "the Cash account must be unaffected by a Bank deposit");
});

test("a transfer moves the balance from one account to the other and both legs are ledgered", async () => {
  await transact("DEPOSIT", 5000);
  const cashBefore = await getCashAccount(tenant.agent);
  const bankBefore = await getBankAccount();

  const transferResponse = await tenant.agent.post("/api/finance-accounts/transfers").send({
    fromAccountType: "CASH",
    toAccountType: "BANK",
    amount: 1500,
    date: "2026-04-02",
    note: "Deposit to bank",
  });
  assert.equal(transferResponse.status, 201);

  const cashAfter = await getCashAccount(tenant.agent);
  const bankAfter = await getBankAccount();
  assert.equal(Number(cashAfter.balance), Number(cashBefore.balance) - 1500);
  assert.equal(Number(bankAfter.balance), Number(bankBefore.balance) + 1500);

  const transactionsResponse = await tenant.agent.get("/api/finance-accounts/transactions").query({ accountType: "BANK" });
  assert.equal(transactionsResponse.status, 200);
  assert.ok(transactionsResponse.body.items.some((item) => item.type === "TRANSFER_IN" && Number(item.debit) === 1500));

  const cashTransactionsResponse = await tenant.agent.get("/api/finance-accounts/transactions").query({ accountType: "CASH" });
  assert.ok(cashTransactionsResponse.body.items.some((item) => item.type === "TRANSFER_OUT" && Number(item.credit) === 1500));
});

test("a transfer exceeding the source account's balance is rejected and changes neither account", async () => {
  const cashBefore = await getCashAccount(tenant.agent);
  const bankBefore = await getBankAccount();

  const response = await tenant.agent.post("/api/finance-accounts/transfers").send({
    fromAccountType: "CASH",
    toAccountType: "BANK",
    amount: cashBefore.balance + 100000,
    date: "2026-04-02",
  });
  assert.equal(response.status, 400);

  const cashAfter = await getCashAccount(tenant.agent);
  const bankAfter = await getBankAccount();
  assert.equal(Number(cashAfter.balance), Number(cashBefore.balance));
  assert.equal(Number(bankAfter.balance), Number(bankBefore.balance));
});

test("a transfer to the same account type is rejected", async () => {
  const response = await tenant.agent.post("/api/finance-accounts/transfers").send({
    fromAccountType: "CASH",
    toAccountType: "CASH",
    amount: 100,
    date: "2026-04-02",
  });
  assert.equal(response.status, 400);
});
