import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, createSupplier } from "./helpers/seeders.js";

let databaseManager;
let tenant;
let otherTenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Supplier Statement Tenant" });
  otherTenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Supplier Statement Other Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await cleanupTenant(databaseManager, otherTenant.tenantId);
  await closeTestApp();
});

test("getBalance requires a supplierId and 404s for an unknown supplier", async () => {
  const missing = await tenant.agent.get("/api/supplier-due-ledger/balance");
  assert.equal(missing.status, 400);

  const unknown = await tenant.agent.get("/api/supplier-due-ledger/balance").query({ supplierId: "supplier-does-not-exist" });
  assert.equal(unknown.status, 404);
});

// The opening-due ledger entry created at supplier creation time is stamped with
// today's date (no businessDate is settable via the create-supplier form), so any
// "opening balance" range check must start strictly after today for it to be included.
function daysFromToday(offset) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

test("a purchase on credit shows up on the supplier statement with matching opening/closing balances and totals", async () => {
  const product = await createProduct(tenant.agent, { name: `Statement Widget ${Date.now()}`, purchasePrice: 100 });
  const supplier = await createSupplier(tenant.agent, { name: `Statement Supplier ${Date.now()}`, openingDue: 500 });
  const purchaseDate = daysFromToday(1);

  const purchaseResponse = await tenant.agent.post("/api/purchase-receive").send({
    supplierId: supplier.id,
    purchaseDate,
    items: [{ productId: product.id, quantityPieces: 10, purchasePrice: 100 }],
    discount: 0,
    paidAmount: 0,
    paymentMethod: "CASH",
  });
  assert.equal(purchaseResponse.status, 201);

  const balanceResponse = await tenant.agent.get("/api/supplier-due-ledger/balance").query({ supplierId: supplier.id });
  assert.equal(balanceResponse.status, 200);
  assert.equal(balanceResponse.body.balance, 1500);

  const statementResponse = await tenant.agent
    .get("/api/supplier-due-ledger/statement")
    .query({ supplierId: supplier.id, dateFrom: purchaseDate, dateTo: purchaseDate });
  assert.equal(statementResponse.status, 200);
  assert.equal(statementResponse.body.openingBalance, 500);
  assert.equal(statementResponse.body.closingBalance, 1500);
  assert.equal(statementResponse.body.totalDebit, 1000);
  assert.equal(statementResponse.body.supplier.id, supplier.id);
  assert.ok(statementResponse.body.entries.length >= 1);
});

test("a date range that excludes the purchase date shows no movement, only the opening balance", async () => {
  const product = await createProduct(tenant.agent, { name: `Statement Widget B ${Date.now()}` });
  const supplier = await createSupplier(tenant.agent, { name: `Statement Supplier B ${Date.now()}`, openingDue: 200 });

  await tenant.agent.post("/api/purchase-receive").send({
    supplierId: supplier.id,
    purchaseDate: daysFromToday(5),
    items: [{ productId: product.id, quantityPieces: 5, purchasePrice: 100 }],
    discount: 0,
    paidAmount: 0,
    paymentMethod: "CASH",
  });

  const quietDay = daysFromToday(1);
  const statementResponse = await tenant.agent
    .get("/api/supplier-due-ledger/statement")
    .query({ supplierId: supplier.id, dateFrom: quietDay, dateTo: quietDay });
  assert.equal(statementResponse.status, 200);
  assert.equal(statementResponse.body.entries.length, 0);
  assert.equal(statementResponse.body.openingBalance, 200);
  assert.equal(statementResponse.body.closingBalance, 200);
});

test("tenant isolation: another tenant cannot view a supplier's balance or statement", async () => {
  const supplier = await createSupplier(tenant.agent, { name: `Isolated Statement Supplier ${Date.now()}` });

  const balanceResponse = await otherTenant.agent.get("/api/supplier-due-ledger/balance").query({ supplierId: supplier.id });
  assert.equal(balanceResponse.status, 404);

  const statementResponse = await otherTenant.agent.get("/api/supplier-due-ledger/statement").query({ supplierId: supplier.id });
  assert.equal(statementResponse.status, 404);
});
