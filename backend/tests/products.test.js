import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, addStock } from "./helpers/seeders.js";

let databaseManager;
let tenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Products Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await closeTestApp();
});

test("addStock increases stock_pieces and records a MANUAL_ADJUSTMENT movement with correct balanceAfter", async () => {
  const product = await createProduct(tenant.agent, { name: "Add Stock Widget" });
  assert.equal(product.stockPieces, 0);

  const updated = await addStock(tenant.agent, product.id, 50, "Initial stock");
  assert.equal(updated.stockPieces, 50);

  const movements = await tenant.agent.get("/api/stock-movements").query({ productId: product.id });
  assert.equal(movements.status, 200);
  const movement = movements.body.items.find((item) => item.type === "MANUAL_ADJUSTMENT");
  assert.ok(movement, "expected a MANUAL_ADJUSTMENT movement");
  assert.equal(movement.quantityIn, 50);
  assert.equal(movement.quantityOut, 0);
  assert.equal(movement.balanceAfter, 50);

  const second = await addStock(tenant.agent, product.id, 25, "More stock");
  assert.equal(second.stockPieces, 75);
});

test("saveProduct rejects an update that tries to set stockPieces directly", async () => {
  const product = await createProduct(tenant.agent, { name: "No Direct Edit Widget" });

  const response = await tenant.agent.put(`/api/products/${product.id}`).send({
    name: product.name,
    categoryId: product.categoryId,
    piecesPerCase: product.piecesPerCase,
    purchasePrice: product.purchasePrice,
    wholesalePrice: product.wholesalePrice,
    retailPrice: product.retailPrice,
    stockPieces: 9999,
  });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /Add Stock/);
});

test("clearDamagedStock rejects clearing more than the recorded damaged stock", async () => {
  const product = await createProduct(tenant.agent, { name: "Damage Widget" });

  const response = await tenant.agent.post(`/api/products/${product.id}/clear-damage`).send({ quantity: 5 });
  assert.equal(response.status, 400);
  assert.match(response.body.message, /exceeds damaged stock/);
});

test("setOpeningStock records an OPENING movement on a brand-new product, and is rejected once any stock activity exists", async () => {
  const product = await createProduct(tenant.agent, { name: "Opening Widget" });
  assert.equal(product.stockPieces, 0);

  const response = await tenant.agent.post(`/api/products/${product.id}/opening-stock`).send({ quantity: 60, note: "Onboarding count" });
  assert.equal(response.status, 200);
  assert.equal(response.body.product.stockPieces, 60);

  const movements = await tenant.agent.get("/api/stock-movements").query({ productId: product.id });
  const movement = movements.body.items.find((item) => item.type === "OPENING");
  assert.ok(movement, "expected an OPENING movement");
  assert.equal(movement.quantityIn, 60);
  assert.equal(movement.balanceAfter, 60);

  const secondAttempt = await tenant.agent.post(`/api/products/${product.id}/opening-stock`).send({ quantity: 10 });
  assert.equal(secondAttempt.status, 400);
  assert.match(secondAttempt.body.message, /can only be set before any other stock activity/);

  // Regular Add Stock still works and is tagged MANUAL_ADJUSTMENT, not OPENING.
  const addStockResponse = await addStock(tenant.agent, product.id, 5, "top-up");
  assert.equal(addStockResponse.stockPieces, 65);
});

test("setOpeningStock is rejected on a product that already has stock movements from Add Stock", async () => {
  const product = await createProduct(tenant.agent, { name: "Already Active Widget" });
  await addStock(tenant.agent, product.id, 30);

  const response = await tenant.agent.post(`/api/products/${product.id}/opening-stock`).send({ quantity: 10 });
  assert.equal(response.status, 400);
  assert.match(response.body.message, /can only be set before any other stock activity/);
});

test("low-stock list uses the configured reorder level, and falls back to the case-based heuristic when unset", async () => {
  const withReorderLevel = await createProduct(tenant.agent, { name: "Reorder Widget", piecesPerCase: 12, reorderLevel: 20 });
  await addStock(tenant.agent, withReorderLevel.id, 15); // below its reorder level of 20 -> low stock

  const aboveReorderLevel = await createProduct(tenant.agent, { name: "Healthy Reorder Widget", piecesPerCase: 12, reorderLevel: 20 });
  await addStock(tenant.agent, aboveReorderLevel.id, 25); // above its reorder level of 20 -> not low stock

  const withoutReorderLevel = await createProduct(tenant.agent, { name: "Heuristic Widget", piecesPerCase: 12 });
  await addStock(tenant.agent, withoutReorderLevel.id, 40); // <= 12*4 default heuristic -> low stock

  const response = await tenant.agent.get("/api/products/low-stock");
  assert.equal(response.status, 200);
  const ids = response.body.products.map((product) => product.id);

  assert.ok(ids.includes(withReorderLevel.id), "below configured reorder level must appear");
  assert.equal(ids.includes(aboveReorderLevel.id), false, "above configured reorder level must not appear");
  assert.ok(ids.includes(withoutReorderLevel.id), "falls back to the 4-case heuristic when reorder level is unset");
});
