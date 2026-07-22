import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, createSupplier, depositCash } from "./helpers/seeders.js";
import { insertProductSerial } from "../repositories/productSerialRepository.js";
import { normalizeProductSerial } from "../lib/normalizers.js";

let databaseManager;
let tenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Product Serial Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await closeTestApp();
});

test("creating a serial for a product that is not marked serial/IMEI required is rejected", async () => {
  const product = await createProduct(tenant.agent, { name: "Non Serial Widget", serialRequired: false });

  const response = await tenant.agent.post("/api/product-serials").send({
    productId: product.id,
    serialNumber: "SN-NOT-REQUIRED",
  });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /not marked as serial\/IMEI required/);
});

test("creating a serial for a serial-required product succeeds", async () => {
  const product = await createProduct(tenant.agent, { name: "Serial Required Widget", serialRequired: true });

  const response = await tenant.agent.post("/api/product-serials").send({
    productId: product.id,
    serialNumber: "SN-ALLOWED-1",
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.serialNumber, "SN-ALLOWED-1");
  assert.equal(response.body.status, "IN_STOCK");
});

test("the database rejects a duplicate serial number for the same tenant even if the app-level check is bypassed", async () => {
  const product = await createProduct(tenant.agent, { name: "Constraint Widget", serialRequired: true });

  await databaseManager.withClient(async (client) => {
    const first = normalizeProductSerial({ productId: product.id, serialNumber: "SN-DUP-1" });
    first.tenantId = tenant.tenantId;
    await insertProductSerial(client, first);

    const second = normalizeProductSerial({ productId: product.id, serialNumber: "SN-DUP-1" });
    second.tenantId = tenant.tenantId;

    await assert.rejects(
      () => insertProductSerial(client, second),
      (error) => error.code === "23505",
      "a unique index violation (23505) should be thrown for the duplicate serial number",
    );
  });
});

test("a value already used as a serial number cannot be reused as an imei on another unit", async () => {
  const product = await createProduct(tenant.agent, { name: "Cross Column Widget", serialRequired: true });

  const firstResponse = await tenant.agent.post("/api/product-serials").send({
    productId: product.id,
    serialNumber: "CROSS-VALUE-1",
  });
  assert.equal(firstResponse.status, 201);

  const secondResponse = await tenant.agent.post("/api/product-serials").send({
    productId: product.id,
    imei1: "CROSS-VALUE-1",
  });
  assert.equal(secondResponse.status, 400);
  assert.match(secondResponse.body.message, /already exists in inventory/);
});

test("the database rejects a cross-column duplicate even if the app-level check is bypassed", async () => {
  const product = await createProduct(tenant.agent, { name: "Cross Column Constraint Widget", serialRequired: true });

  await databaseManager.withClient(async (client) => {
    const first = normalizeProductSerial({ productId: product.id, serialNumber: "CROSS-VALUE-2" });
    first.tenantId = tenant.tenantId;
    await insertProductSerial(client, first);

    const second = normalizeProductSerial({ productId: product.id, imei1: "CROSS-VALUE-2" });
    second.tenantId = tenant.tenantId;

    await assert.rejects(
      () => insertProductSerial(client, second),
      (error) => error.code === "23505",
      "a unique index violation (23505) should be thrown for a value reused across identifier columns",
    );
  });
});

test("a serial created without a barcode gets one auto-generated, and it's globally unique for the tenant", async () => {
  const product = await createProduct(tenant.agent, { name: "Auto Barcode Widget", serialRequired: true });

  const response = await tenant.agent.post("/api/product-serials").send({
    productId: product.id,
    serialNumber: "SN-AUTO-1",
  });

  assert.equal(response.status, 201);
  assert.ok(response.body.barcode, "expected an auto-generated barcode");
  assert.match(response.body.barcode, /^\d{12}$/, "generated barcode should be a 12-digit numeric string");

  // Reusing that generated barcode manually on another serial must be rejected,
  // proving it's actually enforced as unique, not just cosmetic.
  const dupeResponse = await tenant.agent.post("/api/product-serials").send({
    productId: product.id,
    serialNumber: "SN-AUTO-2",
    barcode: response.body.barcode,
  });
  assert.equal(dupeResponse.status, 400);
  assert.match(dupeResponse.body.message, /already exists in inventory/);
});

test("a manually supplied barcode is kept as-is and its own uniqueness is enforced", async () => {
  const product = await createProduct(tenant.agent, { name: "Manual Barcode Widget", serialRequired: true });

  const response = await tenant.agent.post("/api/product-serials").send({
    productId: product.id,
    serialNumber: "SN-MANUAL-1",
    barcode: "MANUAL-BC-0001",
    purchasePrice: 120,
    salePrice: 180,
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.barcode, "MANUAL-BC-0001");
  assert.equal(response.body.purchasePrice, 120);
  assert.equal(response.body.salePrice, 180);
});

test("search finds a serial by its own barcode, product name, or product SKU", async () => {
  const product = await createProduct(tenant.agent, {
    name: `Searchable Widget ${Date.now()}`,
    sku: `SKU-SEARCH-${Date.now()}`,
    serialRequired: true,
  });

  const createResponse = await tenant.agent.post("/api/product-serials").send({
    productId: product.id,
    serialNumber: `SN-SEARCH-${Date.now()}`,
    barcode: `BC-SEARCH-${Date.now()}`,
  });
  assert.equal(createResponse.status, 201);
  const serial = createResponse.body;

  const byBarcode = await tenant.agent.get("/api/product-serials").query({ search: serial.barcode });
  assert.ok(byBarcode.body.items.some((item) => item.id === serial.id), "expected to find the serial by its barcode");

  const byProductName = await tenant.agent.get("/api/product-serials").query({ search: product.name });
  assert.ok(byProductName.body.items.some((item) => item.id === serial.id), "expected to find the serial by product name");

  const bySku = await tenant.agent.get("/api/product-serials").query({ search: product.sku });
  assert.ok(bySku.body.items.some((item) => item.id === serial.id), "expected to find the serial by product SKU");
});

test("a serial's barcode resolves directly to the exact unit for POS scanning", async () => {
  const product = await createProduct(tenant.agent, { name: "Scan Lookup Widget", serialRequired: true });
  const createResponse = await tenant.agent.post("/api/product-serials").send({
    productId: product.id,
    serialNumber: "SN-SCAN-1",
  });
  assert.equal(createResponse.status, 201);
  const serial = createResponse.body;

  const scanResponse = await tenant.agent.get(`/api/product-serials/barcode/${serial.barcode}`);
  assert.equal(scanResponse.status, 200);
  assert.equal(scanResponse.body.serial.id, serial.id);

  const missResponse = await tenant.agent.get("/api/product-serials/barcode/no-such-barcode");
  assert.equal(missResponse.status, 200);
  assert.equal(missResponse.body.serial, null, "a barcode that matches nothing should return null, not an error");
});

test("bulk import creates every valid row, auto-generating barcodes where missing, and rejects an in-batch duplicate", async () => {
  const product = await createProduct(tenant.agent, { name: "Bulk Import Widget", serialRequired: true });

  const importResponse = await tenant.agent.post("/api/product-serials/bulk").send({
    productId: product.id,
    rows: [
      { serialNumber: "BULK-1" },
      { serialNumber: "BULK-2", barcode: "BULK-BC-2", purchasePrice: 100, salePrice: 150 },
      { serialNumber: "BULK-3" },
    ],
  });

  assert.equal(importResponse.status, 201);
  assert.equal(importResponse.body.count, 3);
  const bulk1 = importResponse.body.items.find((item) => item.serialNumber === "BULK-1");
  assert.ok(bulk1.barcode, "row without a barcode should get one auto-generated");
  const bulk2 = importResponse.body.items.find((item) => item.serialNumber === "BULK-2");
  assert.equal(bulk2.barcode, "BULK-BC-2");
  assert.equal(bulk2.purchasePrice, 100);
  assert.equal(bulk2.salePrice, 150);

  const dupeImportResponse = await tenant.agent.post("/api/product-serials/bulk").send({
    productId: product.id,
    rows: [
      { serialNumber: "BULK-4" },
      { serialNumber: "BULK-4" },
    ],
  });
  assert.equal(dupeImportResponse.status, 400);
  assert.match(dupeImportResponse.body.message, /more than once/);

  // The whole batch must fail together — BULK-4 from the rejected import must
  // not have been partially created.
  const afterFailure = await tenant.agent.get("/api/product-serials").query({ search: "BULK-4" });
  assert.equal(afterFailure.body.items.length, 0);
});

test("receiving stock for a serial-required product captures each unit's own barcode/price, and auto-generates a barcode when none is given", async () => {
  const product = await createProduct(tenant.agent, { name: "Receive Serial Widget", serialRequired: true, purchasePrice: 200 });
  const supplier = await createSupplier(tenant.agent, { name: `Receive Serial Supplier ${Date.now()}` });
  await depositCash(tenant.agent, 100000);

  const receiveResponse = await tenant.agent.post("/api/purchase-receive").send({
    supplierId: supplier.id,
    purchaseDate: "2026-01-10",
    items: [
      {
        productId: product.id,
        quantityPieces: 2,
        purchasePrice: 200,
        serials: [
          { serialNumber: "RECV-SN-1" },
          { serialNumber: "RECV-SN-2", barcode: "RECV-BC-2", purchasePrice: 210, salePrice: 260 },
        ],
      },
    ],
    discount: 0,
    paidAmount: 400,
    paymentMethod: "CASH",
  });
  assert.equal(receiveResponse.status, 201);

  const listResponse = await tenant.agent.get("/api/product-serials").query({ productId: product.id });
  assert.equal(listResponse.status, 200);
  const recv1 = listResponse.body.items.find((item) => item.serialNumber === "RECV-SN-1");
  const recv2 = listResponse.body.items.find((item) => item.serialNumber === "RECV-SN-2");

  assert.ok(recv1.barcode, "a unit received without a barcode should get one auto-generated");
  assert.equal(recv1.purchasePrice, 200, "defaults to the line's purchase price when the unit doesn't specify its own");

  assert.equal(recv2.barcode, "RECV-BC-2");
  assert.equal(recv2.purchasePrice, 210, "a unit's own purchase price overrides the line's purchase price");
  assert.equal(recv2.salePrice, 260);
});
