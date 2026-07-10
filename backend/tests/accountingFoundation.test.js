import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { closeTestApp, getTestApp } from "./helpers/testApp.js";
import { cleanupTenant, createTenantAndAdmin } from "./helpers/fixtures.js";

let databaseManager;
let tenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Accounting Foundation Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await closeTestApp();
});

test("accounting foundation routes support accounts, fiscal years, settings, opening balances, and period locking", async () => {
  const settingsResponse = await tenant.agent.put("/api/accounting/settings").send({
    defaultCurrency: "BDT",
    decimalPrecision: 2,
    voucherPrefix: "OB",
    financialYearStart: "01-01",
    negativeCashPolicy: "WARN",
    autoPostingEnabled: true,
  });
  assert.equal(settingsResponse.status, 200);
  assert.equal(settingsResponse.body.settings.voucherPrefix, "OB");

  const accountResponse = await tenant.agent.post("/api/accounting/accounts").send({
    code: "1300",
    name: "Petty Cash Float",
    type: "ASSET",
    accountGroup: "Current Assets",
    isCashAccount: true,
  });
  assert.equal(accountResponse.status, 201);
  assert.equal(accountResponse.body.account.code, "1300");

  const fyResponse = await tenant.agent.post("/api/accounting/fiscal-years").send({
    name: "FY 2026",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    isActive: true,
  });
  assert.equal(fyResponse.status, 201);
  const fiscalYear = fyResponse.body.fiscalYear;
  assert.equal(fiscalYear.periods.length, 12);

  const closePeriodResponse = await tenant.agent.post(`/api/accounting/periods/${fiscalYear.periods[0].id}/close`).send({});
  assert.equal(closePeriodResponse.status, 200);

  const blockedExpense = await tenant.agent.post("/api/expenses").send({
    date: "2026-01-15",
    category: "Office",
    amount: 100,
    note: "Blocked by period close",
  });
  assert.equal(blockedExpense.status, 400);
  assert.match(blockedExpense.body.error || blockedExpense.body.message || "", /period/i);

  const reopenPeriodResponse = await tenant.agent.post(`/api/accounting/periods/${fiscalYear.periods[0].id}/reopen`).send({});
  assert.equal(reopenPeriodResponse.status, 200);

  const openingBalanceResponse = await tenant.agent.post("/api/accounting/opening-balances").send({
    referenceType: "ACCOUNT",
    accountCode: "1300",
    balanceDate: "2026-01-01",
    amount: 500,
    balanceSide: "DEBIT",
    note: "Initial float",
  });
  assert.equal(openingBalanceResponse.status, 201);
  assert.equal(openingBalanceResponse.body.openingBalance.accountCode, "1300");

  const dashboardResponse = await tenant.agent.get("/api/accounting/dashboard");
  assert.equal(dashboardResponse.status, 200);
  assert.equal(Number(dashboardResponse.body.currentCash), 500);

  const listResponse = await tenant.agent.get("/api/accounting/opening-balances");
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.openingBalances.length, 1);
});
