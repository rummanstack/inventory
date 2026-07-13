import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, addStock, createRetailCustomer, getCustomerDueBalance } from "./helpers/seeders.js";

let databaseManager;
let tenant;
let otherTenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Customer Due Ledger Tenant" });
  otherTenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Customer Due Ledger Other Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await cleanupTenant(databaseManager, otherTenant.tenantId);
  await closeTestApp();
});

function daysFromToday(offset) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

test("getBalance requires a customerId and 404s for an unknown customer", async () => {
  const missing = await tenant.agent.get("/api/customer-due-ledger/balance");
  assert.equal(missing.status, 400);

  const unknown = await tenant.agent.get("/api/customer-due-ledger/balance").query({ customerId: "customer-does-not-exist" });
  assert.equal(unknown.status, 404);
});

test("a registered sale on credit, followed by a partial payment, produces a correct statement with matching opening/closing balances and totals", async () => {
  const product = await createProduct(tenant.agent, { name: `Customer Statement Widget ${Date.now()}`, retailPrice: 100 });
  await addStock(tenant.agent, product.id, 20);
  const customer = await createRetailCustomer(tenant.agent, { name: `Statement Customer ${Date.now()}` });

  const saleDate = daysFromToday(-5);
  const paymentDate = daysFromToday(1);

  const saleResponse = await tenant.agent.post("/api/sales-invoices").send({
    customerId: customer.id,
    customerType: "REGISTERED",
    saleType: "RETAIL",
    invoiceDate: saleDate,
    items: [{ productId: product.id, quantityPieces: 5, actualSalePrice: 100 }],
    discount: 0,
    paidAmount: 200,
    paymentMethod: "CASH",
  });
  assert.equal(saleResponse.status, 201);
  assert.equal(saleResponse.body.invoice.dueAmount, 300);

  const balanceAfterSale = await getCustomerDueBalance(tenant.agent, customer.id);
  assert.equal(balanceAfterSale, 300);

  const paymentResponse = await tenant.agent.post("/api/customer-payments").send({
    customerId: customer.id,
    paymentDate,
    amount: 120,
    paymentMethod: "CASH",
  });
  assert.equal(paymentResponse.status, 201);

  const statementResponse = await tenant.agent
    .get("/api/customer-due-ledger/statement")
    .query({ customerId: customer.id, dateFrom: paymentDate, dateTo: paymentDate });
  assert.equal(statementResponse.status, 200);
  assert.equal(statementResponse.body.openingBalance, 300, "the sale's due, posted 5 days before the range, is the opening balance");
  assert.equal(statementResponse.body.closingBalance, 180);
  assert.equal(statementResponse.body.totalDebit, 0, "no new debit falls inside this one-day range");
  assert.equal(statementResponse.body.totalCredit, 120);
  assert.equal(statementResponse.body.entries.length, 1);
  assert.equal(statementResponse.body.customer.id, customer.id);
});

test("a date range that excludes all activity shows no entries, only the opening balance", async () => {
  const product = await createProduct(tenant.agent, { name: `Quiet Statement Widget ${Date.now()}`, retailPrice: 50 });
  await addStock(tenant.agent, product.id, 10);
  const customer = await createRetailCustomer(tenant.agent, { name: `Quiet Statement Customer ${Date.now()}` });

  await tenant.agent.post("/api/sales-invoices").send({
    customerId: customer.id,
    customerType: "REGISTERED",
    saleType: "RETAIL",
    invoiceDate: daysFromToday(5),
    items: [{ productId: product.id, quantityPieces: 2, actualSalePrice: 50 }],
    discount: 0,
    paidAmount: 0,
    paymentMethod: "CASH",
  });

  const quietDay = daysFromToday(1);
  const statementResponse = await tenant.agent
    .get("/api/customer-due-ledger/statement")
    .query({ customerId: customer.id, dateFrom: quietDay, dateTo: quietDay });
  assert.equal(statementResponse.status, 200);
  assert.equal(statementResponse.body.entries.length, 0);
  assert.equal(statementResponse.body.openingBalance, 0);
  assert.equal(statementResponse.body.closingBalance, 0);
});

test("tenant isolation: another tenant cannot view a customer's balance or statement", async () => {
  const customer = await createRetailCustomer(tenant.agent, { name: `Isolated Statement Customer ${Date.now()}` });

  const balanceResponse = await otherTenant.agent.get("/api/customer-due-ledger/balance").query({ customerId: customer.id });
  assert.equal(balanceResponse.status, 404);

  const statementResponse = await otherTenant.agent.get("/api/customer-due-ledger/statement").query({ customerId: customer.id });
  assert.equal(statementResponse.status, 404);
});
