import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, addStock } from "./helpers/seeders.js";

let databaseManager;
let tenant;
let otherTenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Cash Sessions Tenant" });
  otherTenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Cash Sessions Other Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await cleanupTenant(databaseManager, otherTenant.tenantId);
  await closeTestApp();
});

test("no active session initially, and starting one requires no open session already exist", async () => {
  const currentResponse = await tenant.agent.get("/api/retail-cash-sessions/current");
  assert.equal(currentResponse.status, 200);
  assert.equal(currentResponse.body.session, null);

  const startResponse = await tenant.agent.post("/api/retail-cash-sessions").send({ openingCash: 1000 });
  assert.equal(startResponse.status, 201);
  assert.equal(startResponse.body.session.openingCash, 1000);
  assert.equal(startResponse.body.session.isOpen, true);

  const secondStart = await tenant.agent.post("/api/retail-cash-sessions").send({ openingCash: 500 });
  assert.equal(secondStart.status, 400);

  // Clean up: stop the session so later tests in this file start fresh.
  await tenant.agent.post(`/api/retail-cash-sessions/${startResponse.body.session.id}/stop`).send({ countedCash: 1000 });
});

test("a cash sale made during the session's window counts toward its expected cash", async () => {
  const startResponse = await tenant.agent.post("/api/retail-cash-sessions").send({ openingCash: 2000 });
  assert.equal(startResponse.status, 201);
  const sessionId = startResponse.body.session.id;

  const product = await createProduct(tenant.agent, { name: `Session Widget ${Date.now()}`, retailPrice: 60 });
  await addStock(tenant.agent, product.id, 50);

  const saleResponse = await tenant.agent.post("/api/sales-invoices").send({
    customerType: "WALK_IN",
    saleType: "QUICK_SALE",
    invoiceDate: "2026-04-01",
    items: [{ productId: product.id, quantityPieces: 2, actualSalePrice: 60 }],
    discount: 0,
    paidAmount: 120,
    paymentMethod: "CASH",
  });
  assert.equal(saleResponse.status, 201);

  const currentResponse = await tenant.agent.get("/api/retail-cash-sessions/current");
  assert.equal(currentResponse.status, 200);
  assert.equal(currentResponse.body.session.id, sessionId);
  assert.equal(currentResponse.body.session.cashSalesAmount, 120);
  assert.equal(currentResponse.body.session.expectedCash, 2120);

  await tenant.agent.post(`/api/retail-cash-sessions/${sessionId}/stop`).send({ countedCash: 2120 });
});

test("stopping a session computes variance as counted minus expected cash, and it cannot be stopped twice", async () => {
  const startResponse = await tenant.agent.post("/api/retail-cash-sessions").send({ openingCash: 1000 });
  const sessionId = startResponse.body.session.id;

  const stopResponse = await tenant.agent.post(`/api/retail-cash-sessions/${sessionId}/stop`).send({ countedCash: 950 });
  assert.equal(stopResponse.status, 200);
  assert.equal(stopResponse.body.session.expectedCash, 1000);
  assert.equal(stopResponse.body.session.variance, -50);
  assert.equal(stopResponse.body.session.isOpen, false);

  const secondStop = await tenant.agent.post(`/api/retail-cash-sessions/${sessionId}/stop`).send({ countedCash: 950 });
  assert.equal(secondStop.status, 400);
});

test("closed sessions show up in the session list and the cash session report", async () => {
  const startResponse = await tenant.agent.post("/api/retail-cash-sessions").send({ openingCash: 300 });
  const sessionId = startResponse.body.session.id;
  await tenant.agent.post(`/api/retail-cash-sessions/${sessionId}/stop`).send({ countedCash: 300 });

  const listResponse = await tenant.agent.get("/api/retail-cash-sessions");
  assert.equal(listResponse.status, 200);
  assert.ok(listResponse.body.items.some((item) => item.id === sessionId));

  const reportResponse = await tenant.agent.get("/api/retail-cash-sessions/reports");
  assert.equal(reportResponse.status, 200);
  assert.ok(reportResponse.body.rows.some((row) => row.id === sessionId));
});

test("tenant isolation: another tenant's current session and history are independent", async () => {
  const startResponse = await tenant.agent.post("/api/retail-cash-sessions").send({ openingCash: 400 });
  const sessionId = startResponse.body.session.id;

  const otherCurrent = await otherTenant.agent.get("/api/retail-cash-sessions/current");
  assert.equal(otherCurrent.body.session, null);

  const otherList = await otherTenant.agent.get("/api/retail-cash-sessions");
  assert.ok(!otherList.body.items.some((item) => item.id === sessionId));

  await tenant.agent.post(`/api/retail-cash-sessions/${sessionId}/stop`).send({ countedCash: 400 });
});
