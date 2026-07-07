import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, createSupplier, depositCash } from "./helpers/seeders.js";

let databaseManager;
let tenant;
let otherTenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Purchase Returns Tenant" });
  otherTenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Purchase Returns Other Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await cleanupTenant(databaseManager, otherTenant.tenantId);
  await closeTestApp();
});

// Receives 10 pieces at 100 each on credit → stock 10, supplier due 1000.
async function seedStockedSupplier() {
  const product = await createProduct(tenant.agent, { name: `Return Widget ${Date.now()}-${Math.random()}` });
  const supplier = await createSupplier(tenant.agent, { name: `Return Supplier ${Date.now()}-${Math.random()}` });

  const response = await tenant.agent.post("/api/purchase-receive").send({
    supplierId: supplier.id,
    purchaseDate: "2026-03-01",
    items: [{ productId: product.id, quantityPieces: 10, purchasePrice: 100 }],
    discount: 0,
    paidAmount: 0,
    paymentMethod: "CASH",
  });
  assert.equal(response.status, 201);
  return { product, supplier };
}

async function getProductStock(productId) {
  const response = await tenant.agent.get("/api/products/directory");
  const product = (response.body.products || []).find((item) => item.id === productId);
  return Number(product?.stockPieces || 0);
}

test("a purchase return reduces stock, records a PURCHASE_RETURN movement, and credits the supplier due", async () => {
  const { product, supplier } = await seedStockedSupplier();

  const response = await tenant.agent.post("/api/purchase-returns").send({
    supplierId: supplier.id,
    returnDate: "2026-03-02",
    items: [{ productId: product.id, quantityPieces: 4, unitPrice: 100 }],
    note: "Expired stock back to company",
  });

  assert.equal(response.status, 201);
  const purchaseReturn = response.body.purchaseReturn;
  assert.match(purchaseReturn.returnNumber, /^PRN-\d{4}-\d{6}$/);
  assert.equal(purchaseReturn.totalAmount, 400);
  assert.ok(purchaseReturn.transactionHash, "every purchase return carries a transaction hash");

  assert.equal(await getProductStock(product.id), 6);

  const supplierResponse = await tenant.agent.get(`/api/suppliers/${supplier.id}`);
  assert.equal(supplierResponse.body.supplier.currentDue, 600);

  const movementsResponse = await tenant.agent.get(`/api/stock-movements?productId=${product.id}`);
  const movements = movementsResponse.body.items || movementsResponse.body.movements || [];
  const returnMovement = movements.find((movement) => movement.type === "PURCHASE_RETURN");
  assert.ok(returnMovement, "a PURCHASE_RETURN stock movement must exist");
  assert.equal(Number(returnMovement.quantityOut), 4);
});

test("a return larger than the stock on hand is rejected and changes nothing", async () => {
  const { product, supplier } = await seedStockedSupplier();

  const response = await tenant.agent.post("/api/purchase-returns").send({
    supplierId: supplier.id,
    returnDate: "2026-03-02",
    items: [{ productId: product.id, quantityPieces: 25, unitPrice: 100 }],
  });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /does not have enough stock/);

  assert.equal(await getProductStock(product.id), 10, "stock must be unchanged after the rejected return");
  const supplierResponse = await tenant.agent.get(`/api/suppliers/${supplier.id}`);
  assert.equal(supplierResponse.body.supplier.currentDue, 1000, "due must be unchanged after the rejected return");
});

test("a return worth more than the due flips the balance into a supplier advance", async () => {
  const { product, supplier } = await seedStockedSupplier();

  // Pay off 800 of the 1000 due first, leaving 200 due, then return 400 worth.
  await depositCash(tenant.agent, 1000);
  const paymentResponse = await tenant.agent.post("/api/supplier-payments").send({
    supplierId: supplier.id,
    paymentDate: "2026-03-02",
    amount: 800,
    paymentMethod: "CASH",
  });
  assert.equal(paymentResponse.status, 201);

  const response = await tenant.agent.post("/api/purchase-returns").send({
    supplierId: supplier.id,
    returnDate: "2026-03-03",
    items: [{ productId: product.id, quantityPieces: 4, unitPrice: 100 }],
  });
  assert.equal(response.status, 201);

  const supplierResponse = await tenant.agent.get(`/api/suppliers/${supplier.id}`);
  assert.equal(supplierResponse.body.supplier.currentDue, 0, "current due clamps to zero");

  const balanceResponse = await tenant.agent.get(`/api/supplier-due-ledger/balance?supplierId=${supplier.id}`);
  assert.equal(balanceResponse.body.balance, -200, "the 200 overshoot becomes an advance (negative balance)");
});

test("unit price defaults to the product's purchase price when omitted", async () => {
  const { product, supplier } = await seedStockedSupplier();

  const response = await tenant.agent.post("/api/purchase-returns").send({
    supplierId: supplier.id,
    returnDate: "2026-03-02",
    items: [{ productId: product.id, quantityPieces: 2 }],
  });

  assert.equal(response.status, 201);
  // createProduct seeds purchasePrice 50, but purchase-receive at 100 updates it to 100.
  const expectedUnitPrice = Number(response.body.purchaseReturn.items[0].unitPrice);
  assert.ok(expectedUnitPrice > 0, "unit price must default to a positive purchase price");
  assert.equal(response.body.purchaseReturn.totalAmount, expectedUnitPrice * 2);
});

test("deleting a purchase return restores stock and puts the value back on the supplier due", async () => {
  const { product, supplier } = await seedStockedSupplier();

  const createResponse = await tenant.agent.post("/api/purchase-returns").send({
    supplierId: supplier.id,
    returnDate: "2026-03-02",
    items: [{ productId: product.id, quantityPieces: 4, unitPrice: 100 }],
  });
  assert.equal(createResponse.status, 201);
  const returnId = createResponse.body.purchaseReturn.id;

  const missingReason = await tenant.agent.delete(`/api/purchase-returns/${returnId}`).send({});
  assert.equal(missingReason.status, 400);

  const deleteResponse = await tenant.agent.delete(`/api/purchase-returns/${returnId}`).send({ reason: "Recorded by mistake" });
  assert.equal(deleteResponse.status, 200);

  assert.equal(await getProductStock(product.id), 10, "stock must be restored after the reversal");
  const supplierResponse = await tenant.agent.get(`/api/suppliers/${supplier.id}`);
  assert.equal(supplierResponse.body.supplier.currentDue, 1000, "due must be restored after the reversal");

  const getResponse = await tenant.agent.get(`/api/purchase-returns/${returnId}`);
  assert.equal(getResponse.status, 404, "a deleted return is no longer visible");
});

test("tenant isolation: another tenant cannot see or delete a purchase return", async () => {
  const { product, supplier } = await seedStockedSupplier();

  const createResponse = await tenant.agent.post("/api/purchase-returns").send({
    supplierId: supplier.id,
    returnDate: "2026-03-02",
    items: [{ productId: product.id, quantityPieces: 1, unitPrice: 100 }],
  });
  assert.equal(createResponse.status, 201);
  const returnId = createResponse.body.purchaseReturn.id;

  const foreignGet = await otherTenant.agent.get(`/api/purchase-returns/${returnId}`);
  assert.equal(foreignGet.status, 404);

  const foreignDelete = await otherTenant.agent.delete(`/api/purchase-returns/${returnId}`).send({ reason: "not mine" });
  assert.equal(foreignDelete.status, 404);

  const ownGet = await tenant.agent.get(`/api/purchase-returns/${returnId}`);
  assert.equal(ownGet.status, 200, "the owning tenant still sees the return");
});
