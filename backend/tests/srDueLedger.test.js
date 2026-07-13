import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createSr, getCashAccount, createProduct, addStock, createDsr } from "./helpers/seeders.js";

let databaseManager;
let tenant;
let otherTenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "SR Due Ledger Tenant" });
  otherTenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "SR Due Ledger Other Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await cleanupTenant(databaseManager, otherTenant.tenantId);
  await closeTestApp();
});

test("collecting from an SR within its due balance deposits cash and reduces the balance", async () => {
  const sr = await createSr(tenant.agent, { name: `Collect SR ${Date.now()}`, openingDue: 1000 });
  const cashBefore = await getCashAccount(tenant.agent);

  const collectResponse = await tenant.agent.post("/api/sr-due-ledger/collect").send({ srId: sr.id, amount: 400 });
  assert.equal(collectResponse.status, 200);

  const balanceResponse = await tenant.agent.get("/api/sr-due-ledger/balance").query({ srId: sr.id });
  assert.equal(balanceResponse.body.balance, 600);

  const cashAfter = await getCashAccount(tenant.agent);
  assert.equal(Number(cashAfter.balance), Number(cashBefore.balance) + 400);
});

test("collecting more than the SR's current due balance is rejected and changes nothing", async () => {
  const sr = await createSr(tenant.agent, { name: `Overcollect SR ${Date.now()}`, openingDue: 300 });

  const collectResponse = await tenant.agent.post("/api/sr-due-ledger/collect").send({ srId: sr.id, amount: 500 });
  assert.equal(collectResponse.status, 400);

  const balanceResponse = await tenant.agent.get("/api/sr-due-ledger/balance").query({ srId: sr.id });
  assert.equal(balanceResponse.body.balance, 300);
});

test("collecting a non-positive amount is rejected", async () => {
  const sr = await createSr(tenant.agent, { name: `Zero Collect SR ${Date.now()}`, openingDue: 100 });

  const collectResponse = await tenant.agent.post("/api/sr-due-ledger/collect").send({ srId: sr.id, amount: 0 });
  assert.equal(collectResponse.status, 400);
});

test("a DSR settlement's SR handover posts a HANDOVER debit entry referencing the settlement and increases the SR's due", async () => {
  const product = await createProduct(tenant.agent, { name: `Handover Widget ${Date.now()}`, wholesalePrice: 50 });
  await addStock(tenant.agent, product.id, 50);
  const dsr = await createDsr(tenant.agent, { name: `Handover DSR ${Date.now()}` });
  const sr = await createSr(tenant.agent, { name: `Handover SR ${Date.now()}`, openingDue: 0 });

  const issueResponse = await tenant.agent.post("/api/issues").send({
    date: "2026-04-10",
    dsrId: dsr.id,
    items: [{ productId: product.id, issuedPieces: 20 }],
  });
  assert.equal(issueResponse.status, 201);

  // Sold 20 @ 50 = 1000 receivable; hand over 400 of it to the SR, collect nothing else.
  const settleResponse = await tenant.agent.post("/api/settlements").send({
    date: "2026-04-10",
    dsrId: dsr.id,
    items: [{ productId: product.id, returnedPieces: 0, damagedPieces: 0 }],
    discount: 0,
    extraReturnValue: 0,
    amountPaid: 0,
    srHandovers: [{ srId: sr.id, amount: 400, note: "Handed to SR for collection" }],
  });
  assert.equal(settleResponse.status, 201);

  const balanceResponse = await tenant.agent.get("/api/sr-due-ledger/balance").query({ srId: sr.id });
  assert.equal(balanceResponse.body.balance, 400);
});

test("SR handovers that exceed the settlement's total receivable are rejected", async () => {
  const product = await createProduct(tenant.agent, { name: `Over Handover Widget ${Date.now()}`, wholesalePrice: 50 });
  await addStock(tenant.agent, product.id, 50);
  const dsr = await createDsr(tenant.agent, { name: `Over Handover DSR ${Date.now()}` });
  const sr = await createSr(tenant.agent, { name: `Over Handover SR ${Date.now()}`, openingDue: 0 });

  await tenant.agent.post("/api/issues").send({
    date: "2026-04-11",
    dsrId: dsr.id,
    items: [{ productId: product.id, issuedPieces: 10 }],
  });

  // Receivable is only 10 * 50 = 500; handing over 600 exceeds it.
  const settleResponse = await tenant.agent.post("/api/settlements").send({
    date: "2026-04-11",
    dsrId: dsr.id,
    items: [{ productId: product.id, returnedPieces: 0, damagedPieces: 0 }],
    discount: 0,
    extraReturnValue: 0,
    amountPaid: 0,
    srHandovers: [{ srId: sr.id, amount: 600 }],
  });
  assert.equal(settleResponse.status, 400);
  assert.match(settleResponse.body.message, /cannot be greater than the total receivable/);

  const balanceResponse = await tenant.agent.get("/api/sr-due-ledger/balance").query({ srId: sr.id });
  assert.equal(balanceResponse.body.balance, 0, "a rejected settlement must not touch the SR's balance");
});

test("editing a settlement's SR handover amount adjusts the SR's due by the delta", async () => {
  const today = new Date().toISOString().slice(0, 10);
  const product = await createProduct(tenant.agent, { name: `Edit Handover Widget ${Date.now()}`, wholesalePrice: 50 });
  await addStock(tenant.agent, product.id, 50);
  const dsr = await createDsr(tenant.agent, { name: `Edit Handover DSR ${Date.now()}` });
  const sr = await createSr(tenant.agent, { name: `Edit Handover SR ${Date.now()}`, openingDue: 0 });

  await tenant.agent.post("/api/issues").send({
    date: today,
    dsrId: dsr.id,
    items: [{ productId: product.id, issuedPieces: 20 }],
  });

  const settleResponse = await tenant.agent.post("/api/settlements").send({
    date: today,
    dsrId: dsr.id,
    items: [{ productId: product.id, returnedPieces: 0, damagedPieces: 0 }],
    discount: 0,
    extraReturnValue: 0,
    amountPaid: 0,
    srHandovers: [{ srId: sr.id, amount: 300 }],
  });
  assert.equal(settleResponse.status, 201);

  const balanceAfterCreate = await tenant.agent.get("/api/sr-due-ledger/balance").query({ srId: sr.id });
  assert.equal(balanceAfterCreate.body.balance, 300);

  const editResponse = await tenant.agent.put(`/api/settlements/${settleResponse.body.settlement.id}`).send({
    date: today,
    dsrId: dsr.id,
    items: [{ productId: product.id, returnedPieces: 0, damagedPieces: 0 }],
    discount: 0,
    extraReturnValue: 0,
    amountPaid: 0,
    srHandovers: [{ srId: sr.id, amount: 700 }],
    reason: "test handover edit",
  });
  assert.equal(editResponse.status, 200);

  const balanceAfterEdit = await tenant.agent.get("/api/sr-due-ledger/balance").query({ srId: sr.id });
  assert.equal(balanceAfterEdit.body.balance, 700, "the SR's due must reflect the new handover total, not the delta added again");
});

test("tenant isolation: another tenant cannot collect from or view an SR's due ledger", async () => {
  const sr = await createSr(tenant.agent, { name: `Isolated SR Ledger ${Date.now()}`, openingDue: 500 });

  const collectResponse = await otherTenant.agent.post("/api/sr-due-ledger/collect").send({ srId: sr.id, amount: 100 });
  assert.equal(collectResponse.status, 404);

  const balanceResponse = await otherTenant.agent.get("/api/sr-due-ledger/balance").query({ srId: sr.id });
  assert.equal(balanceResponse.status, 404);
});
