import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct } from "./helpers/seeders.js";
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
