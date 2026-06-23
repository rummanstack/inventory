import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, addStock, createRetailCustomer } from "./helpers/seeders.js";

let databaseManager;
let tenantA;
let tenantB;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenantA = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Profit Report Tenant A" });
  tenantB = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Profit Report Tenant B" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenantA.tenantId);
  await cleanupTenant(databaseManager, tenantB.tenantId);
  await closeTestApp();
});

test("by-customer breakdown attributes gross profit to the registered customer and matches the invoice's total_profit", async () => {
  const today = new Date().toISOString().slice(0, 10);
  const product = await createProduct(tenantA.agent, { name: "Profit Widget", purchasePrice: 50, retailPrice: 90 });
  await addStock(tenantA.agent, product.id, 20);
  const customer = await createRetailCustomer(tenantA.agent, { name: "Profit Customer" });

  const invoiceResponse = await tenantA.agent.post("/api/sales-invoices").send({
    customerType: "REGISTERED",
    customerId: customer.id,
    saleType: "RETAIL",
    invoiceDate: today,
    items: [{ productId: product.id, quantityPieces: 4, actualSalePrice: 90 }],
    discount: 0,
    paidAmount: 360,
    paymentMethod: "CASH",
  });
  assert.equal(invoiceResponse.status, 201);
  const invoice = invoiceResponse.body.invoice;
  assert.equal(invoice.totalProfit, (90 - 50) * 4);

  const breakdown = await tenantA.agent.get("/api/profit-report/by-customer").query({ dateFrom: today, dateTo: today });
  assert.equal(breakdown.status, 200);
  const row = breakdown.body.rows.find((entry) => entry.customerId === customer.id);
  assert.ok(row, "expected a breakdown row for the registered customer");
  assert.equal(row.grossProfit, invoice.totalProfit);
  assert.equal(row.revenue, invoice.totalAmount);
});

test("by-product breakdown matches gross profit derived from cost_price_snapshot", async () => {
  const today = new Date().toISOString().slice(0, 10);
  const product = await createProduct(tenantA.agent, { name: "Breakdown Widget", purchasePrice: 30, retailPrice: 60 });
  await addStock(tenantA.agent, product.id, 10);

  const invoiceResponse = await tenantA.agent.post("/api/sales-invoices").send({
    customerType: "WALK_IN",
    saleType: "RETAIL",
    invoiceDate: today,
    items: [{ productId: product.id, quantityPieces: 2, actualSalePrice: 60 }],
    discount: 0,
    paidAmount: 120,
    paymentMethod: "CASH",
  });
  assert.equal(invoiceResponse.status, 201);

  const breakdown = await tenantA.agent.get("/api/profit-report/by-product").query({ dateFrom: today, dateTo: today });
  assert.equal(breakdown.status, 200);
  const row = breakdown.body.rows.find((entry) => entry.productId === product.id);
  assert.ok(row, "expected a breakdown row for the product");
  assert.equal(row.revenue, 120);
  assert.equal(row.cost, 60);
  assert.equal(row.grossProfit, 60);
});

test("tenant B cannot see tenant A's profit breakdown rows", async () => {
  const today = new Date().toISOString().slice(0, 10);
  const product = await createProduct(tenantA.agent, { name: "Isolated Widget", purchasePrice: 20, retailPrice: 40 });
  await addStock(tenantA.agent, product.id, 5);

  const invoiceResponse = await tenantA.agent.post("/api/sales-invoices").send({
    customerType: "WALK_IN",
    saleType: "RETAIL",
    invoiceDate: today,
    items: [{ productId: product.id, quantityPieces: 1, actualSalePrice: 40 }],
    discount: 0,
    paidAmount: 40,
    paymentMethod: "CASH",
  });
  assert.equal(invoiceResponse.status, 201);

  const productBreakdown = await tenantB.agent.get("/api/profit-report/by-product").query({ dateFrom: today, dateTo: today });
  assert.equal(productBreakdown.status, 200);
  assert.equal(productBreakdown.body.rows.some((row) => row.productId === product.id), false);
});
