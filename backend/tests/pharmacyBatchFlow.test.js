import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant, TEST_PASSWORD } from "./helpers/fixtures.js";
import { createProduct, createSupplier, depositCash } from "./helpers/seeders.js";
import { createId } from "../lib/ids.js";
import { hashPassword } from "../lib/passwords.js";
import { USER_ROLES } from "../lib/roles.js";
import { insertUser } from "../repositories/userRepository.js";
import { TENANT_FEATURES } from "../lib/features.js";

let app;
let databaseManager;
let tenant;
let devAgent;
let devUserId;

function daysFromToday(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

before(async () => {
  const testApp = await getTestApp();
  app = testApp.app;
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Pharmacy Flow Tenant" });

  // Platform admin (system_developer has no tenant) to toggle the batch-tracking
  // feature flag on/off for the gating test below.
  devUserId = createId("user");
  const devEmail = `dev-${devUserId.slice(-10)}@test.local`;
  await databaseManager.withTransaction(async (client) => {
    await insertUser(client, {
      id: devUserId,
      name: "Test Dev",
      email: devEmail,
      passwordHash: await hashPassword(TEST_PASSWORD),
      role: USER_ROLES.SYSTEM_DEVELOPER,
      status: "active",
    });
  });
  devAgent = request.agent(app);
  const devLogin = await devAgent.post("/api/auth/login").send({ email: devEmail, password: TEST_PASSWORD });
  assert.equal(devLogin.status, 200);
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await databaseManager.withClient(async (client) => {
    await client.query("DELETE FROM login_history WHERE user_id = $1", [devUserId]);
    await client.query("DELETE FROM users WHERE id = $1", [devUserId]);
  });
  await closeTestApp();
});

test("a sale consumes batches FEFO across two batches, snapshots the earliest-expiring one, and records the prescription number", async () => {
  const product = await createProduct(tenant.agent, { name: `FEFO Widget ${Date.now()}`, purchasePrice: 10, retailPrice: 25 });
  const supplier = await createSupplier(tenant.agent, { name: `FEFO Supplier ${Date.now()}` });
  await depositCash(tenant.agent, 100000);

  // Two batches, received together: batch 1 expires sooner (30 days) with only
  // 5 pieces; batch 2 expires later (90 days) with 10 pieces. A sale of 8
  // pieces should drain batch 1 entirely (FEFO) and take the remaining 3 from
  // batch 2.
  const receiveResponse = await tenant.agent.post("/api/purchase-receive").send({
    supplierId: supplier.id,
    purchaseDate: "2026-01-10",
    items: [
      { productId: product.id, quantityPieces: 5, purchasePrice: 10, batchNumber: "B-EARLY", lotNumber: "L-EARLY", expiryDate: daysFromToday(30) },
      { productId: product.id, quantityPieces: 10, purchasePrice: 10, batchNumber: "B-LATE", lotNumber: "L-LATE", expiryDate: daysFromToday(90) },
    ],
    discount: 0,
    paidAmount: 150,
    paymentMethod: "CASH",
  });
  assert.equal(receiveResponse.status, 201);

  const invoiceResponse = await tenant.agent.post("/api/sales-invoices").send({
    customerType: "WALK_IN",
    saleType: "RETAIL",
    invoiceDate: daysFromToday(0),
    items: [{ productId: product.id, quantityPieces: 8, actualSalePrice: 25 }],
    prescriptionNumber: "Rx-TEST-001",
    discount: 0,
    paidAmount: 200,
    paymentMethod: "CASH",
  });
  assert.equal(invoiceResponse.status, 201);
  const invoice = invoiceResponse.body.invoice;
  assert.equal(invoice.prescriptionNumber, "Rx-TEST-001");
  const soldItem = invoice.items.find((item) => item.productId === product.id);
  assert.equal(soldItem.batchNumberSnapshot, "B-EARLY", "the earliest-expiring batch must be snapshotted as the primary batch");

  // Batch 1 (earlier expiry) must be fully drained before batch 2 is touched.
  const batchesResponse = await tenant.agent.get(`/api/drug-batches/product/${product.id}`);
  assert.equal(batchesResponse.status, 200);
  const batch1 = batchesResponse.body.batches.find((b) => b.batchNumber === "B-EARLY");
  const batch2 = batchesResponse.body.batches.find((b) => b.batchNumber === "B-LATE");
  assert.equal(batch1.quantityRemaining, 0, "batch expiring soonest should be fully consumed first");
  assert.equal(batch2.quantityRemaining, 7, "only the leftover 3 of 8 pieces should come from the later batch");

  // The batch sales report must show both consumption events, with the
  // prescription number and batch/lot/expiry intact for each.
  const reportResponse = await tenant.agent.get("/api/drug-batches/batch-sales-report").query({ productId: product.id });
  assert.equal(reportResponse.status, 200);
  const reportRows = reportResponse.body.items.filter((row) => row.productId === product.id);
  assert.equal(reportRows.length, 2, "one report row per batch consumed by this sale");
  const earlyRow = reportRows.find((row) => row.batchNumber === "B-EARLY");
  const lateRow = reportRows.find((row) => row.batchNumber === "B-LATE");
  assert.equal(earlyRow.quantityFromBatch, 5);
  assert.equal(earlyRow.lotNumber, "L-EARLY");
  assert.equal(earlyRow.prescriptionNumber, "Rx-TEST-001");
  assert.equal(lateRow.quantityFromBatch, 3);
  assert.equal(lateRow.lotNumber, "L-LATE");
});

test("the batch-tracking feature flag actually gates the batch sales report and expiry alerts routes", async () => {
  const withoutBatchTracking = TENANT_FEATURES.filter((key) => key !== "batch-tracking");

  const disableResponse = await devAgent.patch(`/api/platform/tenants/${tenant.tenantId}/features`).send({ features: withoutBatchTracking });
  assert.equal(disableResponse.status, 200);

  const reportResponse = await tenant.agent.get("/api/drug-batches/batch-sales-report");
  assert.equal(reportResponse.status, 403, "batch sales report must be blocked once batch-tracking is disabled for the tenant");

  const alertsResponse = await tenant.agent.get("/api/drug-batches/expiry-alerts");
  assert.equal(alertsResponse.status, 403, "expiry alerts must be blocked once batch-tracking is disabled for the tenant");

  // Re-enable so the feature isn't left off for any later test reusing this tenant.
  const restoreResponse = await devAgent.patch(`/api/platform/tenants/${tenant.tenantId}/features`).send({ features: [...TENANT_FEATURES] });
  assert.equal(restoreResponse.status, 200);

  const reportAfterRestore = await tenant.agent.get("/api/drug-batches/batch-sales-report");
  assert.equal(reportAfterRestore.status, 200, "batch sales report must work again once the feature is re-enabled");
});
