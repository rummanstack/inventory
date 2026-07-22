import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, createSupplier, depositCash } from "./helpers/seeders.js";

let databaseManager;
let tenantA;
let tenantB;

function daysFromToday(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenantA = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Expiry Alerts Tenant A" });
  tenantB = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Expiry Alerts Tenant B" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenantA.tenantId);
  await cleanupTenant(databaseManager, tenantB.tenantId);
  await closeTestApp();
});

test("expiry alerts lists batches expired or expiring within the window, soonest first, and excludes batches outside it", async () => {
  const expiredProduct = await createProduct(tenantA.agent, { name: `Expired Widget ${Date.now()}`, purchasePrice: 10 });
  const soonProduct = await createProduct(tenantA.agent, { name: `Soon Widget ${Date.now()}`, purchasePrice: 20 });
  const farProduct = await createProduct(tenantA.agent, { name: `Far Widget ${Date.now()}`, purchasePrice: 30 });
  const plainProduct = await createProduct(tenantA.agent, { name: `Plain Widget ${Date.now()}`, purchasePrice: 5 });
  const supplier = await createSupplier(tenantA.agent, { name: `Expiry Supplier ${Date.now()}` });
  await depositCash(tenantA.agent, 100000);

  const receiveResponse = await tenantA.agent.post("/api/purchase-receive").send({
    supplierId: supplier.id,
    purchaseDate: "2026-01-10",
    items: [
      { productId: expiredProduct.id, quantityPieces: 10, purchasePrice: 10, batchNumber: "EXP-1", lotNumber: "L1", expiryDate: daysFromToday(-5) },
      { productId: soonProduct.id, quantityPieces: 20, purchasePrice: 20, batchNumber: "SOON-1", lotNumber: "L2", expiryDate: daysFromToday(10) },
      { productId: farProduct.id, quantityPieces: 30, purchasePrice: 30, batchNumber: "FAR-1", lotNumber: "L3", expiryDate: daysFromToday(200) },
      { productId: plainProduct.id, quantityPieces: 40, purchasePrice: 5 },
    ],
    discount: 0,
    paidAmount: 10 * 10 + 20 * 20 + 30 * 30 + 40 * 5,
    paymentMethod: "CASH",
  });
  assert.equal(receiveResponse.status, 201);

  const response = await tenantA.agent.get("/api/drug-batches/expiry-alerts").query({ withinDays: 60 });
  assert.equal(response.status, 200);
  assert.equal(response.body.withinDays, 60);

  const productIds = response.body.items.map((row) => row.productId);
  assert.ok(productIds.includes(expiredProduct.id), "expired batch must be included");
  assert.ok(productIds.includes(soonProduct.id), "batch expiring within the window must be included");
  assert.equal(productIds.includes(farProduct.id), false, "batch expiring outside the window must be excluded");
  assert.equal(productIds.includes(plainProduct.id), false, "a product received with no batch info must never appear");

  // Soonest expiry first — the already-expired batch sorts ahead of the one expiring in 10 days.
  const expiredIndex = productIds.indexOf(expiredProduct.id);
  const soonIndex = productIds.indexOf(soonProduct.id);
  assert.ok(expiredIndex < soonIndex, "expired batch should be listed before the batch expiring later");

  const expiredRow = response.body.items.find((row) => row.productId === expiredProduct.id);
  assert.equal(expiredRow.batchNumber, "EXP-1");
  assert.equal(expiredRow.lotNumber, "L1");
  assert.equal(expiredRow.quantityRemaining, 10);
  assert.equal(expiredRow.productName, expiredProduct.name);
});

test("a wider window includes batches a narrower one excludes", async () => {
  const product = await createProduct(tenantA.agent, { name: `Wide Window Widget ${Date.now()}`, purchasePrice: 15 });
  const supplier = await createSupplier(tenantA.agent, { name: `Wide Window Supplier ${Date.now()}` });

  const receiveResponse = await tenantA.agent.post("/api/purchase-receive").send({
    supplierId: supplier.id,
    purchaseDate: "2026-01-10",
    items: [{ productId: product.id, quantityPieces: 5, purchasePrice: 15, batchNumber: "WIDE-1", expiryDate: daysFromToday(80) }],
    discount: 0,
    paidAmount: 0,
    paymentMethod: "CASH",
  });
  assert.equal(receiveResponse.status, 201);

  const narrow = await tenantA.agent.get("/api/drug-batches/expiry-alerts").query({ withinDays: 60 });
  assert.equal(narrow.status, 200);
  assert.equal(narrow.body.items.some((row) => row.productId === product.id), false);

  const wide = await tenantA.agent.get("/api/drug-batches/expiry-alerts").query({ withinDays: 90 });
  assert.equal(wide.status, 200);
  assert.equal(wide.body.withinDays, 90);
  assert.ok(wide.body.items.some((row) => row.productId === product.id));
});

test("tenant B cannot see tenant A's expiring batches", async () => {
  const product = await createProduct(tenantA.agent, { name: `Isolated Expiry Widget ${Date.now()}`, purchasePrice: 12 });
  const supplier = await createSupplier(tenantA.agent, { name: `Isolated Expiry Supplier ${Date.now()}` });

  await tenantA.agent.post("/api/purchase-receive").send({
    supplierId: supplier.id,
    purchaseDate: "2026-01-10",
    items: [{ productId: product.id, quantityPieces: 5, purchasePrice: 12, batchNumber: "ISO-1", expiryDate: daysFromToday(1) }],
    discount: 0,
    paidAmount: 0,
    paymentMethod: "CASH",
  });

  const response = await tenantB.agent.get("/api/drug-batches/expiry-alerts").query({ withinDays: 60 });
  assert.equal(response.status, 200);
  assert.equal(response.body.items.some((row) => row.productId === product.id), false);
});
