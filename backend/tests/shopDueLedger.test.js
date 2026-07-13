import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, addStock, createDsr, getCashAccount } from "./helpers/seeders.js";

let databaseManager;
let tenant;
let otherTenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Shop Due Ledger Tenant" });
  otherTenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Shop Due Ledger Other Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await cleanupTenant(databaseManager, otherTenant.tenantId);
  await closeTestApp();
});

async function createShop(agent, overrides = {}) {
  const response = await agent.post("/api/customers").send({
    shopName: `Test Shop ${Date.now()}-${Math.random()}`,
    ownerName: "Shop Owner",
    phone: "0155000000",
    address: "Shop address",
    ...overrides,
  });
  if (response.status !== 201) {
    throw new Error(`createShop failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return response.body.customer;
}

function daysFromToday(offset) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

test("a shop's ledger balance falls back to its opening due when no ledger entries exist yet", async () => {
  const shop = await createShop(tenant.agent, { openingDue: 250 });

  const balanceResponse = await tenant.agent.get("/api/shop-due-ledger/balance").query({ shopId: shop.id });
  assert.equal(balanceResponse.status, 200);
  assert.equal(balanceResponse.body.balance, 250);
});

test("recording a manual due debits the ledger, and requires a positive amount", async () => {
  const shop = await createShop(tenant.agent, { openingDue: 0 });

  const zeroAmount = await tenant.agent.post("/api/shop-due-ledger/record-due").send({ shopId: shop.id, amount: 0 });
  assert.equal(zeroAmount.status, 400);

  const response = await tenant.agent.post("/api/shop-due-ledger/record-due").send({
    shopId: shop.id,
    amount: 500,
    note: "Goods delivered on credit",
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.type, "SALE_DUE");
  assert.equal(response.body.debit, 500);
  assert.equal(response.body.credit, 0);
  assert.equal(response.body.balanceAfter, 500);

  const balanceResponse = await tenant.agent.get("/api/shop-due-ledger/balance").query({ shopId: shop.id });
  assert.equal(balanceResponse.body.balance, 500);

  const shopResponse = await tenant.agent.get(`/api/customers/${shop.id}`);
  assert.equal(shopResponse.body.customer.currentDue, 500);
});

test("collecting from a shop within its due balance deposits cash and reduces the balance", async () => {
  const shop = await createShop(tenant.agent, { openingDue: 1000 });
  const cashBefore = await getCashAccount(tenant.agent);

  const collectResponse = await tenant.agent.post("/api/shop-due-ledger/collect").send({ shopId: shop.id, amount: 400 });
  assert.equal(collectResponse.status, 200);
  assert.equal(collectResponse.body.type, "COLLECTION");
  assert.equal(collectResponse.body.credit, 400);
  assert.equal(collectResponse.body.balanceAfter, 600);

  const balanceResponse = await tenant.agent.get("/api/shop-due-ledger/balance").query({ shopId: shop.id });
  assert.equal(balanceResponse.body.balance, 600);

  const cashAfter = await getCashAccount(tenant.agent);
  assert.equal(Number(cashAfter.balance), Number(cashBefore.balance) + 400);
});

test("collecting more than the shop's current due balance is rejected and changes nothing", async () => {
  const shop = await createShop(tenant.agent, { openingDue: 300 });

  const collectResponse = await tenant.agent.post("/api/shop-due-ledger/collect").send({ shopId: shop.id, amount: 500 });
  assert.equal(collectResponse.status, 400);

  const balanceResponse = await tenant.agent.get("/api/shop-due-ledger/balance").query({ shopId: shop.id });
  assert.equal(balanceResponse.body.balance, 300);
});

test("a DSR settlement's shop collection posts a COLLECTION entry referencing the settlement and reduces the shop's due", async () => {
  const product = await createProduct(tenant.agent, { name: `Shop Collection Widget ${Date.now()}`, wholesalePrice: 50 });
  await addStock(tenant.agent, product.id, 50);
  const dsr = await createDsr(tenant.agent, { name: `Shop Collection DSR ${Date.now()}` });
  const shop = await createShop(tenant.agent, { openingDue: 1000, assignedDsrId: dsr.id });

  const issueResponse = await tenant.agent.post("/api/issues").send({
    date: "2026-04-01",
    dsrId: dsr.id,
    items: [{ productId: product.id, issuedPieces: 20 }],
  });
  assert.equal(issueResponse.status, 201);

  const settleResponse = await tenant.agent.post("/api/settlements").send({
    date: "2026-04-01",
    dsrId: dsr.id,
    items: [{ productId: product.id, returnedPieces: 0, damagedPieces: 0 }],
    discount: 0,
    extraReturnValue: 0,
    amountPaid: 0,
    shopCollections: [{ shopId: shop.id, amount: 300, note: "Collected on the round" }],
  });
  assert.equal(settleResponse.status, 201);

  const balanceResponse = await tenant.agent.get("/api/shop-due-ledger/balance").query({ shopId: shop.id });
  assert.equal(balanceResponse.body.balance, 700);

  const listResponse = await tenant.agent.get("/api/shop-due-ledger").query({ shopId: shop.id });
  assert.equal(listResponse.status, 200);
  const entry = listResponse.body.items.find((item) => item.referenceType === "settlement");
  assert.ok(entry, "expected a ledger entry referencing the settlement");
  assert.equal(entry.type, "COLLECTION");
  assert.equal(entry.credit, 300);
  assert.equal(entry.referenceId, settleResponse.body.settlement.id);
});

test("a DSR settlement's shop collection exceeding the shop's current due is rejected", async () => {
  const product = await createProduct(tenant.agent, { name: `Over Collection Widget ${Date.now()}`, wholesalePrice: 50 });
  await addStock(tenant.agent, product.id, 50);
  const dsr = await createDsr(tenant.agent, { name: `Over Collection DSR ${Date.now()}` });
  const shop = await createShop(tenant.agent, { openingDue: 100, assignedDsrId: dsr.id });

  const issueResponse = await tenant.agent.post("/api/issues").send({
    date: "2026-04-05",
    dsrId: dsr.id,
    items: [{ productId: product.id, issuedPieces: 20 }],
  });
  assert.equal(issueResponse.status, 201);

  const settleResponse = await tenant.agent.post("/api/settlements").send({
    date: "2026-04-05",
    dsrId: dsr.id,
    items: [{ productId: product.id, returnedPieces: 0, damagedPieces: 0 }],
    discount: 0,
    extraReturnValue: 0,
    amountPaid: 0,
    shopCollections: [{ shopId: shop.id, amount: 500, note: "More than the shop owes" }],
  });
  assert.equal(settleResponse.status, 400);
  assert.match(settleResponse.body.message, /exceeds their current due balance/);

  const balanceResponse = await tenant.agent.get("/api/shop-due-ledger/balance").query({ shopId: shop.id });
  assert.equal(balanceResponse.body.balance, 100, "the rejected settlement must not have touched the shop's balance");
});

test("editing a settlement's shop collection adjusts the shop's due by the delta, and an over-collecting delta is rejected", async () => {
  const today = new Date().toISOString().slice(0, 10);
  const product = await createProduct(tenant.agent, { name: `Edit Collection Widget ${Date.now()}`, wholesalePrice: 50 });
  await addStock(tenant.agent, product.id, 50);
  const dsr = await createDsr(tenant.agent, { name: `Edit Collection DSR ${Date.now()}` });
  const shop = await createShop(tenant.agent, { openingDue: 1000, assignedDsrId: dsr.id });

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
    shopCollections: [{ shopId: shop.id, amount: 200 }],
  });
  assert.equal(settleResponse.status, 201);

  const balanceAfterCreate = await tenant.agent.get("/api/shop-due-ledger/balance").query({ shopId: shop.id });
  assert.equal(balanceAfterCreate.body.balance, 800);

  // Raise the collection from 200 to 1100 — the shop only owes 800 at this point, so
  // the extra delta of 900 exceeds its current due and must be rejected, leaving the
  // balance exactly as the first settlement left it.
  const overEdit = await tenant.agent.put(`/api/settlements/${settleResponse.body.settlement.id}`).send({
    date: today,
    dsrId: dsr.id,
    items: [{ productId: product.id, returnedPieces: 0, damagedPieces: 0 }],
    discount: 0,
    extraReturnValue: 0,
    amountPaid: 0,
    shopCollections: [{ shopId: shop.id, amount: 1100 }],
    reason: "test over-collection edit",
  });
  assert.equal(overEdit.status, 400);
  assert.match(overEdit.body.message, /exceeds their current due balance/);

  const balanceAfterRejectedEdit = await tenant.agent.get("/api/shop-due-ledger/balance").query({ shopId: shop.id });
  assert.equal(balanceAfterRejectedEdit.body.balance, 800, "a rejected edit must not change the shop's balance");

  // A valid increase from 200 to 500 (delta +300) is within the shop's remaining due of 800.
  const validEdit = await tenant.agent.put(`/api/settlements/${settleResponse.body.settlement.id}`).send({
    date: today,
    dsrId: dsr.id,
    items: [{ productId: product.id, returnedPieces: 0, damagedPieces: 0 }],
    discount: 0,
    extraReturnValue: 0,
    amountPaid: 0,
    shopCollections: [{ shopId: shop.id, amount: 500 }],
    reason: "test valid collection edit",
  });
  assert.equal(validEdit.status, 200);

  const balanceAfterValidEdit = await tenant.agent.get("/api/shop-due-ledger/balance").query({ shopId: shop.id });
  assert.equal(balanceAfterValidEdit.body.balance, 500, "the additional 300 delta must be collected on top of the original 200");
});

test("the statement reports correct opening/closing balances, totals, and entries for a date range", async () => {
  const shop = await createShop(tenant.agent, { openingDue: 0 });
  const before = daysFromToday(-5);
  const inRange = daysFromToday(1);

  await tenant.agent.post("/api/shop-due-ledger/record-due").send({
    shopId: shop.id,
    amount: 500,
    businessDate: before,
    note: "Older credit sale",
  });
  await tenant.agent.post("/api/shop-due-ledger/collect").send({
    shopId: shop.id,
    amount: 200,
    businessDate: inRange,
    note: "Collected on the round",
  });

  const statementResponse = await tenant.agent
    .get("/api/shop-due-ledger/statement")
    .query({ shopId: shop.id, dateFrom: inRange, dateTo: inRange });
  assert.equal(statementResponse.status, 200);
  assert.equal(statementResponse.body.openingBalance, 500);
  assert.equal(statementResponse.body.closingBalance, 300);
  assert.equal(statementResponse.body.totalCredit, 200);
  assert.equal(statementResponse.body.entries.length, 1);
  assert.equal(statementResponse.body.shop.id, shop.id);
});

// Unlike suppliers/DSRs/SRs, a shop's opening due does not get an OPENING row in
// shop_due_ledger at creation time — it only lives on customers.opening_due. The
// balance endpoint falls back to that column when the ledger is empty, but the
// statement's openingBalance (getShopBalanceBefore) only ever looks at prior ledger
// rows. So a shop with an opening due but no ledger activity before the requested
// range reports an opening balance of 0 here, not the actual opening due — this
// documents that real, currently-shipped behavior rather than the doc's assumption.
test("a shop's opening due does NOT appear in the statement's opening balance when no ledger entry predates the range", async () => {
  const shop = await createShop(tenant.agent, { openingDue: 900 });
  const today = daysFromToday(0);

  const statementResponse = await tenant.agent
    .get("/api/shop-due-ledger/statement")
    .query({ shopId: shop.id, dateFrom: today, dateTo: today });
  assert.equal(statementResponse.status, 200);
  assert.equal(statementResponse.body.openingBalance, 0, "opening due is invisible to the statement without a prior ledger row");

  const balanceResponse = await tenant.agent.get("/api/shop-due-ledger/balance").query({ shopId: shop.id });
  assert.equal(balanceResponse.body.balance, 900, "the balance endpoint, unlike the statement, does fall back to opening due");
});

test("tenant isolation: another tenant cannot view or collect from a shop's due ledger", async () => {
  const shop = await createShop(tenant.agent, { openingDue: 500 });

  const balanceResponse = await otherTenant.agent.get("/api/shop-due-ledger/balance").query({ shopId: shop.id });
  assert.equal(balanceResponse.status, 404);

  const collectResponse = await otherTenant.agent.post("/api/shop-due-ledger/collect").send({ shopId: shop.id, amount: 100 });
  assert.equal(collectResponse.status, 404);

  const statementResponse = await otherTenant.agent.get("/api/shop-due-ledger/statement").query({ shopId: shop.id });
  assert.equal(statementResponse.status, 404);
});
