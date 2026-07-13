import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, addStock } from "./helpers/seeders.js";

let databaseManager;
let tenant;
let otherTenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Daily Sales Report Tenant" });
  otherTenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Daily Sales Report Other Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await cleanupTenant(databaseManager, otherTenant.tenantId);
  await closeTestApp();
});

async function sell(agent, { productId, invoiceDate, saleType, quantityPieces, price, paidAmount }) {
  const response = await agent.post("/api/sales-invoices").send({
    customerType: "WALK_IN",
    saleType,
    invoiceDate,
    items: [{ productId, quantityPieces, actualSalePrice: price }],
    discount: 0,
    paidAmount,
    paymentMethod: "CASH",
  });
  if (response.status !== 201) {
    throw new Error(`sell failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return response.body.invoice;
}

test("the daily report aggregates invoice count, total, paid, due, and profit correctly for one date", async () => {
  const day = "2026-05-25";
  const product = await createProduct(tenant.agent, { name: `Daily Report Widget ${Date.now()}`, purchasePrice: 40, retailPrice: 70 });
  await addStock(tenant.agent, product.id, 30);

  await sell(tenant.agent, { productId: product.id, invoiceDate: day, saleType: "QUICK_SALE", quantityPieces: 3, price: 70, paidAmount: 210 });
  await sell(tenant.agent, { productId: product.id, invoiceDate: day, saleType: "QUICK_SALE", quantityPieces: 2, price: 70, paidAmount: 140 });

  const response = await tenant.agent.get("/api/sales-invoices/reports/daily").query({ dateFrom: day, dateTo: day });
  assert.equal(response.status, 200);

  const row = response.body.rows.find((item) => String(item.date).slice(0, 10) === day);
  assert.ok(row, "expected an aggregated row for the sale date");
  assert.equal(row.invoiceCount, 2);
  assert.equal(row.totalAmount, 350);
  assert.equal(row.paidAmount, 350);
  assert.equal(row.dueAmount, 0);
  assert.equal(row.totalProfit, 5 * (70 - 40));
});

test("the sale type filter only aggregates invoices of the requested type", async () => {
  const day = "2026-05-26";
  const product = await createProduct(tenant.agent, { name: `Sale Type Widget ${Date.now()}`, purchasePrice: 20, retailPrice: 50, wholesalePrice: 40 });
  await addStock(tenant.agent, product.id, 30);

  await sell(tenant.agent, { productId: product.id, invoiceDate: day, saleType: "QUICK_SALE", quantityPieces: 2, price: 50, paidAmount: 100 });
  await sell(tenant.agent, { productId: product.id, invoiceDate: day, saleType: "WHOLESALE", quantityPieces: 4, price: 40, paidAmount: 160 });

  const quickSaleOnly = await tenant.agent.get("/api/sales-invoices/reports/daily").query({ dateFrom: day, dateTo: day, saleType: "QUICK_SALE" });
  assert.equal(quickSaleOnly.status, 200);
  const quickRow = quickSaleOnly.body.rows.find((item) => String(item.date).slice(0, 10) === day);
  assert.ok(quickRow);
  assert.equal(quickRow.invoiceCount, 1);
  assert.equal(quickRow.totalAmount, 100);

  const wholesaleOnly = await tenant.agent.get("/api/sales-invoices/reports/daily").query({ dateFrom: day, dateTo: day, saleType: "WHOLESALE" });
  assert.equal(wholesaleOnly.status, 200);
  const wholesaleRow = wholesaleOnly.body.rows.find((item) => String(item.date).slice(0, 10) === day);
  assert.ok(wholesaleRow);
  assert.equal(wholesaleRow.invoiceCount, 1);
  assert.equal(wholesaleRow.totalAmount, 160);
});

test("a date range that excludes a sale date returns no row for it", async () => {
  const day = "2026-05-27";
  const product = await createProduct(tenant.agent, { name: `Range Widget ${Date.now()}`, retailPrice: 30 });
  await addStock(tenant.agent, product.id, 10);

  await sell(tenant.agent, { productId: product.id, invoiceDate: day, saleType: "QUICK_SALE", quantityPieces: 1, price: 30, paidAmount: 30 });

  const outsideRange = await tenant.agent.get("/api/sales-invoices/reports/daily").query({ dateFrom: "2026-06-01", dateTo: "2026-06-30" });
  assert.equal(outsideRange.status, 200);
  assert.equal(outsideRange.body.rows.some((item) => String(item.date).slice(0, 10) === day), false);
});

test("tenant isolation: another tenant's daily report never includes this tenant's sales", async () => {
  const day = "2026-05-28";
  const product = await createProduct(tenant.agent, { name: `Isolated Report Widget ${Date.now()}`, retailPrice: 45 });
  await addStock(tenant.agent, product.id, 10);

  await sell(tenant.agent, { productId: product.id, invoiceDate: day, saleType: "QUICK_SALE", quantityPieces: 1, price: 45, paidAmount: 45 });

  const otherResponse = await otherTenant.agent.get("/api/sales-invoices/reports/daily").query({ dateFrom: day, dateTo: day });
  assert.equal(otherResponse.status, 200);
  assert.equal(otherResponse.body.rows.length, 0);
});
