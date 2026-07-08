import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, addStock, getCashAccount } from "./helpers/seeders.js";

let databaseManager;
let tenant;
let otherTenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Trade-Ins Tenant" });
  otherTenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Trade-Ins Other Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await cleanupTenant(databaseManager, otherTenant.tenantId);
  await closeTestApp();
});

test("creating a trade-in without received items or without sold items is rejected", async () => {
  const noReceived = await tenant.agent.post("/api/trade-ins").send({
    soldItems: [{ productName: "New Phone", quantity: 1, unitPrice: 500 }],
  });
  assert.equal(noReceived.status, 400);

  const noSold = await tenant.agent.post("/api/trade-ins").send({
    receivedItems: [{ productName: "Old Phone", quantity: 1, tradeInValue: 100 }],
  });
  assert.equal(noSold.status, 400);
});

test("a trade-in where the customer owes more than the trade-in value deposits the difference into cash and adjusts stock both ways", async () => {
  const oldPhone = await createProduct(tenant.agent, { name: `Old Phone ${Date.now()}`, purchasePrice: 50, wholesalePrice: 80 });
  const newPhone = await createProduct(tenant.agent, { name: `New Phone ${Date.now()}`, purchasePrice: 300, wholesalePrice: 500 });
  await addStock(tenant.agent, newPhone.id, 10);

  const cashBefore = await getCashAccount(tenant.agent);

  const response = await tenant.agent.post("/api/trade-ins").send({
    tradeInDate: "2026-04-01",
    customerName: "Trade-In Customer",
    receivedItems: [{ productId: oldPhone.id, productName: oldPhone.name, quantity: 1, tradeInValue: 150, condition: "GOOD" }],
    soldItems: [{ productId: newPhone.id, productName: newPhone.name, quantity: 1, unitPrice: 500 }],
    paymentMethod: "CASH",
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.totalTradeInValue, 150);
  assert.equal(response.body.totalSaleAmount, 500);
  assert.equal(response.body.paymentAmount, 350);

  // The customer's old phone doesn't cover the new one, so they pay the difference in — cash increases.
  const cashAfter = await getCashAccount(tenant.agent);
  assert.equal(Number(cashAfter.balance), Number(cashBefore.balance) + 350);

  const oldPhoneResponse = await tenant.agent.get("/api/products").query({ search: oldPhone.name });
  assert.equal(oldPhoneResponse.body.items.find((item) => item.id === oldPhone.id).stockPieces, 1);

  const newPhoneResponse = await tenant.agent.get("/api/products").query({ search: newPhone.name });
  assert.equal(newPhoneResponse.body.items.find((item) => item.id === newPhone.id).stockPieces, 9);
});

test("a trade-in where the trade-in value exceeds the sale amount withdraws the refund from cash", async () => {
  const oldPhone = await createProduct(tenant.agent, { name: `Valuable Old Phone ${Date.now()}` });
  const cheapPhone = await createProduct(tenant.agent, { name: `Cheap Phone ${Date.now()}`, wholesalePrice: 50 });
  await addStock(tenant.agent, cheapPhone.id, 10);

  const cashBefore = await getCashAccount(tenant.agent);

  const response = await tenant.agent.post("/api/trade-ins").send({
    tradeInDate: "2026-04-01",
    customerName: "Refund Customer",
    receivedItems: [{ productId: oldPhone.id, productName: oldPhone.name, quantity: 1, tradeInValue: 200 }],
    soldItems: [{ productId: cheapPhone.id, productName: cheapPhone.name, quantity: 1, unitPrice: 50 }],
    paymentMethod: "CASH",
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.paymentAmount, -150);

  // The customer's old phone is worth more than what they bought, so the shop refunds
  // them the difference in cash — cash decreases.
  const cashAfter = await getCashAccount(tenant.agent);
  assert.equal(Number(cashAfter.balance), Number(cashBefore.balance) - 150);
});

test("a trade-in is rejected when the sold product doesn't have enough stock, and it changes nothing", async () => {
  const oldPhone = await createProduct(tenant.agent, { name: `Understock Old Phone ${Date.now()}` });
  const soldPhone = await createProduct(tenant.agent, { name: `Understock Sold Phone ${Date.now()}` });
  await addStock(tenant.agent, soldPhone.id, 1);

  const response = await tenant.agent.post("/api/trade-ins").send({
    receivedItems: [{ productId: oldPhone.id, productName: oldPhone.name, quantity: 1, tradeInValue: 50 }],
    soldItems: [{ productId: soldPhone.id, productName: soldPhone.name, quantity: 5, unitPrice: 100 }],
  });
  assert.equal(response.status, 400);

  const soldPhoneResponse = await tenant.agent.get("/api/products").query({ search: soldPhone.name });
  assert.equal(soldPhoneResponse.body.items.find((item) => item.id === soldPhone.id).stockPieces, 1);
});

test("deleting a trade-in moves it to trash and it can be listed there", async () => {
  const oldPhone = await createProduct(tenant.agent, { name: `Delete Old Phone ${Date.now()}` });
  const soldPhone = await createProduct(tenant.agent, { name: `Delete Sold Phone ${Date.now()}` });
  await addStock(tenant.agent, soldPhone.id, 5);

  const createResponse = await tenant.agent.post("/api/trade-ins").send({
    receivedItems: [{ productId: oldPhone.id, productName: oldPhone.name, quantity: 1, tradeInValue: 20 }],
    soldItems: [{ productId: soldPhone.id, productName: soldPhone.name, quantity: 1, unitPrice: 40 }],
  });
  const tradeInId = createResponse.body.id;

  const deleteResponse = await tenant.agent.delete(`/api/trade-ins/${tradeInId}`).send({ reason: "duplicate entry" });
  assert.equal(deleteResponse.status, 200);

  const listResponse = await tenant.agent.get("/api/trade-ins");
  assert.ok(!listResponse.body.items.some((item) => item.id === tradeInId));

  const trashList = await tenant.agent.get("/api/trade-ins/trash");
  assert.ok(trashList.body.items.some((item) => item.id === tradeInId));
});

test("tenant isolation: another tenant cannot see or delete a trade-in that isn't theirs", async () => {
  const oldPhone = await createProduct(tenant.agent, { name: `Isolated Old Phone ${Date.now()}` });
  const soldPhone = await createProduct(tenant.agent, { name: `Isolated Sold Phone ${Date.now()}` });
  await addStock(tenant.agent, soldPhone.id, 5);

  const createResponse = await tenant.agent.post("/api/trade-ins").send({
    receivedItems: [{ productId: oldPhone.id, productName: oldPhone.name, quantity: 1, tradeInValue: 20 }],
    soldItems: [{ productId: soldPhone.id, productName: soldPhone.name, quantity: 1, unitPrice: 40 }],
  });
  const tradeInId = createResponse.body.id;

  const getResponse = await otherTenant.agent.get(`/api/trade-ins/${tradeInId}`);
  assert.equal(getResponse.status, 404);

  const deleteResponse = await otherTenant.agent.delete(`/api/trade-ins/${tradeInId}`);
  assert.equal(deleteResponse.status, 404);
});
