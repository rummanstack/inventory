import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, createSupplier, depositCash, getCashAccount } from "./helpers/seeders.js";

async function findSerialByNumber(agent, productId, serialNumber) {
  const response = await agent.get("/api/product-serials").query({ productId });
  assert.equal(response.status, 200);
  const serial = response.body.items.find((item) => item.serialNumber === serialNumber);
  assert.ok(serial, `serial ${serialNumber} should exist for product ${productId}`);
  return serial;
}

async function getSerial(agent, serialId) {
  const response = await agent.get(`/api/product-serials/${serialId}`);
  assert.equal(response.status, 200);
  return response.body;
}

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

test("editing an unrelated field on a serial-required purchase leaves the serial linked to its purchase item", async () => {
  const product = await createProduct(tenant.agent, { name: "Serial Edit Widget", serialRequired: true, purchasePrice: 40 });
  const supplier = await createSupplier(tenant.agent, { name: "Serial Edit Supplier" });

  const createResponse = await tenant.agent.post("/api/purchase-receive").send({
    supplierId: supplier.id,
    purchaseDate: "2026-02-01",
    items: [{ productId: product.id, quantityPieces: 1, purchasePrice: 40, serials: ["SN-EDIT-1"] }],
    discount: 0,
    paidAmount: 0,
    paymentMethod: "CASH",
  });
  assert.equal(createResponse.status, 201);
  const receipt = createResponse.body.purchaseReceipt;
  const itemId = receipt.items[0].id;

  const serialBefore = await findSerialByNumber(tenant.agent, product.id, "SN-EDIT-1");
  assert.equal(serialBefore.purchaseReceiptItemId, itemId);
  assert.equal(serialBefore.status, "IN_STOCK");

  const updateResponse = await tenant.agent.put(`/api/purchase-receive/${receipt.id}`).send({
    supplierId: supplier.id,
    purchaseDate: "2026-02-01",
    items: [{ id: itemId, productId: product.id, quantityPieces: 1, purchasePrice: 40, serials: ["SN-EDIT-1"] }],
    discount: 5,
    paidAmount: 0,
    paymentMethod: "CASH",
    reason: "Correcting discount",
  });
  assert.equal(updateResponse.status, 200);

  const serialAfter = await getSerial(tenant.agent, serialBefore.id);
  assert.equal(serialAfter.purchaseReceiptItemId, itemId, "serial must stay linked to the same purchase item after an unrelated edit");
  assert.equal(serialAfter.status, "IN_STOCK");
});

test("changing a purchase line's product removes the old product's serial instead of leaving it orphaned", async () => {
  const productA = await createProduct(tenant.agent, { name: "Swap Widget A", serialRequired: true, purchasePrice: 40 });
  const productB = await createProduct(tenant.agent, { name: "Swap Widget B", serialRequired: true, purchasePrice: 40 });
  const supplier = await createSupplier(tenant.agent, { name: "Swap Supplier" });

  const createResponse = await tenant.agent.post("/api/purchase-receive").send({
    supplierId: supplier.id,
    purchaseDate: "2026-02-01",
    items: [{ productId: productA.id, quantityPieces: 1, purchasePrice: 40, serials: ["SN-SWAP-A"] }],
    discount: 0,
    paidAmount: 0,
    paymentMethod: "CASH",
  });
  assert.equal(createResponse.status, 201);
  const receipt = createResponse.body.purchaseReceipt;
  const itemId = receipt.items[0].id;

  const updateResponse = await tenant.agent.put(`/api/purchase-receive/${receipt.id}`).send({
    supplierId: supplier.id,
    purchaseDate: "2026-02-01",
    items: [{ id: itemId, productId: productB.id, quantityPieces: 1, purchasePrice: 40, serials: ["SN-SWAP-B"] }],
    discount: 0,
    paidAmount: 0,
    paymentMethod: "CASH",
    reason: "Wrong product was selected",
  });
  assert.equal(updateResponse.status, 200);

  const oldProductSerials = await tenant.agent.get("/api/product-serials").query({ productId: productA.id });
  assert.equal(
    oldProductSerials.body.items.find((item) => item.serialNumber === "SN-SWAP-A"),
    undefined,
    "the old product's serial must not be left behind once the line points at a different product",
  );

  const newSerial = await findSerialByNumber(tenant.agent, productB.id, "SN-SWAP-B");
  assert.equal(newSerial.purchaseReceiptItemId, itemId);
  assert.equal(newSerial.status, "IN_STOCK");
});

test("editing a purchase to drop a serial that has already been sold is rejected", async () => {
  const product = await createProduct(tenant.agent, { name: "Serial Sold Widget", serialRequired: true, purchasePrice: 40, retailPrice: 90 });
  const supplier = await createSupplier(tenant.agent, { name: "Serial Sold Supplier" });

  const createResponse = await tenant.agent.post("/api/purchase-receive").send({
    supplierId: supplier.id,
    purchaseDate: "2026-02-02",
    items: [{ productId: product.id, quantityPieces: 2, purchasePrice: 40, serials: ["SN-SOLD-1", "SN-SOLD-2"] }],
    discount: 0,
    paidAmount: 0,
    paymentMethod: "CASH",
  });
  assert.equal(createResponse.status, 201);
  const receipt = createResponse.body.purchaseReceipt;
  const itemId = receipt.items[0].id;
  const soldSerial = await findSerialByNumber(tenant.agent, product.id, "SN-SOLD-1");

  const saleResponse = await tenant.agent.post("/api/sales-invoices").send({
    customerType: "WALK_IN",
    saleType: "QUICK_SALE",
    invoiceDate: "2026-02-03",
    items: [{ productId: product.id, quantityPieces: 1, actualSalePrice: 90, serialIds: [soldSerial.id] }],
    discount: 0,
    paidAmount: 90,
    paymentMethod: "CASH",
  });
  assert.equal(saleResponse.status, 201);

  const updateResponse = await tenant.agent.put(`/api/purchase-receive/${receipt.id}`).send({
    supplierId: supplier.id,
    purchaseDate: "2026-02-02",
    items: [{ id: itemId, productId: product.id, quantityPieces: 1, purchasePrice: 40, serials: ["SN-SOLD-2"] }],
    discount: 0,
    paidAmount: 0,
    paymentMethod: "CASH",
    reason: "Trying to drop a sold serial",
  });
  assert.equal(updateResponse.status, 400);
  assert.match(updateResponse.body.message, /already been sold or used/);
});

test("trashing and restoring a purchase round-trips its serial rows", async () => {
  const product = await createProduct(tenant.agent, { name: "Serial Trash Widget", serialRequired: true, purchasePrice: 40 });
  const supplier = await createSupplier(tenant.agent, { name: "Serial Trash Supplier" });

  const createResponse = await tenant.agent.post("/api/purchase-receive").send({
    supplierId: supplier.id,
    purchaseDate: "2026-02-04",
    items: [{ productId: product.id, quantityPieces: 1, purchasePrice: 40, serials: ["SN-TRASH-1"] }],
    discount: 0,
    paidAmount: 0,
    paymentMethod: "CASH",
  });
  assert.equal(createResponse.status, 201);
  const receipt = createResponse.body.purchaseReceipt;
  const serial = await findSerialByNumber(tenant.agent, product.id, "SN-TRASH-1");

  const deleteResponse = await tenant.agent.delete(`/api/purchase-receive/${receipt.id}`).send({ reason: "test trash" });
  assert.equal(deleteResponse.status, 200);

  const afterDelete = await tenant.agent.get(`/api/product-serials/${serial.id}`);
  assert.equal(afterDelete.status, 404, "soft-deleted serial should not be visible through the normal lookup");

  const restoreResponse = await tenant.agent.post(`/api/purchase-receive/${receipt.id}/restore`);
  assert.equal(restoreResponse.status, 200);

  const afterRestore = await getSerial(tenant.agent, serial.id);
  assert.equal(afterRestore.status, "IN_STOCK");
});

test("deleting a purchase that already sold one of its serials is rejected", async () => {
  const product = await createProduct(tenant.agent, { name: "Serial Delete Sold Widget", serialRequired: true, purchasePrice: 40, retailPrice: 90 });
  const supplier = await createSupplier(tenant.agent, { name: "Serial Delete Sold Supplier" });

  const createResponse = await tenant.agent.post("/api/purchase-receive").send({
    supplierId: supplier.id,
    purchaseDate: "2026-02-05",
    items: [{ productId: product.id, quantityPieces: 1, purchasePrice: 40, serials: ["SN-DELSOLD-1"] }],
    discount: 0,
    paidAmount: 0,
    paymentMethod: "CASH",
  });
  assert.equal(createResponse.status, 201);
  const receipt = createResponse.body.purchaseReceipt;
  const serial = await findSerialByNumber(tenant.agent, product.id, "SN-DELSOLD-1");

  const saleResponse = await tenant.agent.post("/api/sales-invoices").send({
    customerType: "WALK_IN",
    saleType: "QUICK_SALE",
    invoiceDate: "2026-02-06",
    items: [{ productId: product.id, quantityPieces: 1, actualSalePrice: 90, serialIds: [serial.id] }],
    discount: 0,
    paidAmount: 90,
    paymentMethod: "CASH",
  });
  assert.equal(saleResponse.status, 201);

  const deleteResponse = await tenant.agent.delete(`/api/purchase-receive/${receipt.id}`).send({ reason: "should be blocked" });
  assert.equal(deleteResponse.status, 400);
  assert.match(deleteResponse.body.message, /already been sold or used/);
});
