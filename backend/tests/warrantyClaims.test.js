import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, createSupplier } from "./helpers/seeders.js";

let databaseManager;
let tenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Warranty Claim Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await closeTestApp();
});

async function receiveOneSerial(product, serialNumber, purchaseDate) {
  const supplier = await createSupplier(tenant.agent, { name: `Supplier ${serialNumber}` });
  const response = await tenant.agent.post("/api/purchase-receive").send({
    supplierId: supplier.id,
    purchaseDate,
    items: [{ productId: product.id, quantityPieces: 1, purchasePrice: 40, serials: [serialNumber] }],
    discount: 0,
    paidAmount: 0,
    paymentMethod: "CASH",
  });
  assert.equal(response.status, 201);

  const listResponse = await tenant.agent.get("/api/product-serials").query({ productId: product.id });
  const serial = listResponse.body.items.find((item) => item.serialNumber === serialNumber);
  assert.ok(serial);
  return serial;
}

async function sellSerial(product, serial, invoiceDate) {
  const response = await tenant.agent.post("/api/sales-invoices").send({
    customerType: "WALK_IN",
    saleType: "QUICK_SALE",
    invoiceDate,
    items: [{ productId: product.id, quantityPieces: 1, actualSalePrice: 90, serialIds: [serial.id] }],
    discount: 0,
    paidAmount: 90,
    paymentMethod: "CASH",
  });
  assert.equal(response.status, 201);
  return response.body.invoice;
}

test("a claim is rejected for a serial that has not been sold", async () => {
  const product = await createProduct(tenant.agent, { name: "Claim Unsold Widget", serialRequired: true, warrantyMonths: 6, retailPrice: 90 });
  const serial = await receiveOneSerial(product, "SN-CLAIM-UNSOLD-1", "2026-01-01");

  const response = await tenant.agent.post("/api/warranty-claims").send({
    productId: product.id,
    productSerialId: serial.id,
    receivedDate: "2026-01-05",
    problemNote: "Screen flicker",
  });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /has not been sold/);
});

test("a claim is rejected once the warranty period has expired", async () => {
  const product = await createProduct(tenant.agent, { name: "Claim Expired Widget", serialRequired: true, warrantyMonths: 1, retailPrice: 90 });
  const serial = await receiveOneSerial(product, "SN-CLAIM-EXPIRED-1", "2024-01-01");
  await sellSerial(product, serial, "2024-01-10");

  const response = await tenant.agent.post("/api/warranty-claims").send({
    productId: product.id,
    productSerialId: serial.id,
    receivedDate: "2026-01-05",
    problemNote: "Will not power on",
  });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /warranty period/);
});

test("a claim succeeds for a sold serial within its warranty period", async () => {
  const product = await createProduct(tenant.agent, { name: "Claim Valid Widget", serialRequired: true, warrantyMonths: 12, retailPrice: 90 });
  const serial = await receiveOneSerial(product, "SN-CLAIM-VALID-1", "2026-01-01");
  await sellSerial(product, serial, "2026-01-10");

  const response = await tenant.agent.post("/api/warranty-claims").send({
    productId: product.id,
    productSerialId: serial.id,
    receivedDate: "2026-03-01",
    problemNote: "Battery drains quickly",
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.productSerialId, serial.id);
});
