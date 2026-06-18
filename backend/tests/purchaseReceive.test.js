import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, createSupplier, depositCash, getCashAccount } from "./helpers/seeders.js";

let databaseManager;
let tenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Purchase Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await closeTestApp();
});

test("receiving a fully-paid purchase increases stock, records PURCHASE_RECEIVE movement, clears due, and withdraws cash", async () => {
  const product = await createProduct(tenant.agent, { name: "Purchase Widget" });
  const supplier = await createSupplier(tenant.agent, { name: "Purchase Supplier" });
  await depositCash(tenant.agent, 5000);

  const response = await tenant.agent.post("/api/purchase-receive").send({
    supplierId: supplier.id,
    purchaseDate: "2026-01-10",
    items: [{ productId: product.id, quantityPieces: 100, purchasePrice: 40 }],
    discount: 0,
    paidAmount: 4000,
    paymentMethod: "CASH",
  });

  assert.equal(response.status, 201);
  const receipt = response.body.purchaseReceipt;
  assert.equal(receipt.totalAmount, 4000);
  assert.equal(receipt.paidAmount, 4000);
  assert.equal(receipt.dueAmount, 0);

  const productResponse = await tenant.agent.get("/api/products").query({ search: "Purchase Widget" });
  const updatedProduct = productResponse.body.items.find((item) => item.id === product.id);
  assert.equal(updatedProduct.stockPieces, 100);
  assert.equal(updatedProduct.purchasePrice, 40, "purchase price updates to the latest cost");

  const movements = await tenant.agent.get("/api/stock-movements").query({ productId: product.id });
  const movement = movements.body.items.find((item) => item.type === "PURCHASE_RECEIVE");
  assert.ok(movement);
  assert.equal(movement.quantityIn, 100);
  assert.equal(movement.balanceAfter, 100);

  const supplierResponse = await tenant.agent.get(`/api/suppliers/${supplier.id}`);
  assert.equal(supplierResponse.body.supplier.currentDue, 0, "due was fully paid");

  const cashAccount = await getCashAccount(tenant.agent);
  assert.equal(cashAccount.balance, 1000, "deposited 5000, withdrew 4000");
});

test("partial payment on a purchase leaves the remaining amount on the supplier due ledger", async () => {
  const product = await createProduct(tenant.agent, { name: "Partial Pay Widget" });
  const supplier = await createSupplier(tenant.agent, { name: "Partial Pay Supplier" });

  const response = await tenant.agent.post("/api/purchase-receive").send({
    supplierId: supplier.id,
    purchaseDate: "2026-01-11",
    items: [{ productId: product.id, quantityPieces: 50, purchasePrice: 5 }],
    discount: 0,
    paidAmount: 100,
    paymentMethod: "CASH",
  });

  assert.equal(response.status, 201);
  const receipt = response.body.purchaseReceipt;
  assert.equal(receipt.totalAmount, 250);
  assert.equal(receipt.paidAmount, 100);
  assert.equal(receipt.dueAmount, 150);

  const supplierResponse = await tenant.agent.get(`/api/suppliers/${supplier.id}`);
  assert.equal(supplierResponse.body.supplier.currentDue, 150);
});

test("a purchase that would overdraw the cash account is rejected and leaves no partial writes", async () => {
  const product = await createProduct(tenant.agent, { name: "Overdraw Widget" });
  const supplier = await createSupplier(tenant.agent, { name: "Overdraw Supplier" });
  const cashBefore = await getCashAccount(tenant.agent);
  const hugeAmount = cashBefore.balance + 100000;

  const response = await tenant.agent.post("/api/purchase-receive").send({
    supplierId: supplier.id,
    purchaseDate: "2026-01-12",
    items: [{ productId: product.id, quantityPieces: 1, purchasePrice: hugeAmount }],
    discount: 0,
    paidAmount: hugeAmount,
    paymentMethod: "CASH",
  });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /Insufficient cash balance/);

  const productResponse = await tenant.agent.get("/api/products").query({ search: "Overdraw Widget" });
  const updatedProduct = productResponse.body.items.find((item) => item.id === product.id);
  assert.equal(updatedProduct.stockPieces, 0, "stock must not change when the transaction rolls back");

  const supplierResponse = await tenant.agent.get(`/api/suppliers/${supplier.id}`);
  assert.equal(supplierResponse.body.supplier.currentDue, 0, "due must not change when the transaction rolls back");

  const cashAfter = await getCashAccount(tenant.agent);
  assert.equal(cashAfter.balance, cashBefore.balance);
});
