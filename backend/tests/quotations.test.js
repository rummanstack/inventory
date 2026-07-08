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
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Quotations Tenant" });
  otherTenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Quotations Other Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await cleanupTenant(databaseManager, otherTenant.tenantId);
  await closeTestApp();
});

test("creating a quotation without items is rejected", async () => {
  const response = await tenant.agent.post("/api/quotations").send({ customerName: "No Items" });
  assert.equal(response.status, 400);
});

test("a quotation can be created as a DRAFT, listed, and updated", async () => {
  const product = await createProduct(tenant.agent, { name: `Quote Widget ${Date.now()}`, retailPrice: 100 });

  const createResponse = await tenant.agent.post("/api/quotations").send({
    customerName: "Prospective Buyer",
    quoteDate: "2026-04-01",
    validityDays: 14,
    items: [{ productId: product.id, productName: product.name, quantity: 5, unitPrice: 100 }],
  });
  assert.equal(createResponse.status, 201);
  const quotation = createResponse.body;
  assert.equal(quotation.status, "DRAFT");
  assert.equal(quotation.subtotal, 500);
  assert.equal(quotation.totalAmount, 500);
  assert.equal(quotation.validUntil, "2026-04-15");

  const listResponse = await tenant.agent.get("/api/quotations");
  assert.ok(listResponse.body.items.some((item) => item.id === quotation.id));

  const updateResponse = await tenant.agent.patch(`/api/quotations/${quotation.id}`).send({ status: "SENT" });
  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.status, "SENT");
});

test("a REJECTED quotation is closed and cannot be edited", async () => {
  const createResponse = await tenant.agent.post("/api/quotations").send({
    customerName: "Rejected Buyer",
    items: [{ productName: "Ad-hoc Item", quantity: 1, unitPrice: 50 }],
  });
  const quotation = createResponse.body;

  const rejectResponse = await tenant.agent.patch(`/api/quotations/${quotation.id}`).send({ status: "REJECTED" });
  assert.equal(rejectResponse.status, 200);

  const editAttempt = await tenant.agent.patch(`/api/quotations/${quotation.id}`).send({ notes: "trying to edit" });
  assert.equal(editAttempt.status, 400);
});

test("converting a quotation to an invoice deducts stock and marks the quotation CONVERTED", async () => {
  const product = await createProduct(tenant.agent, { name: `Convert Widget ${Date.now()}`, retailPrice: 80 });
  await addStock(tenant.agent, product.id, 20);

  const createResponse = await tenant.agent.post("/api/quotations").send({
    customerName: "Convert Buyer",
    items: [{ productId: product.id, productName: product.name, quantity: 4, unitPrice: 80 }],
  });
  const quotation = createResponse.body;

  const convertResponse = await tenant.agent.post(`/api/quotations/${quotation.id}/convert`).send({
    paymentMethod: "CASH",
    paidAmount: 320,
    invoiceDate: "2026-04-02",
  });
  assert.equal(convertResponse.status, 200);
  assert.ok(convertResponse.body.invoiceId);

  const invoiceResponse = await tenant.agent.get(`/api/sales-invoices/${convertResponse.body.invoiceId}`);
  assert.equal(invoiceResponse.status, 200);
  assert.equal(invoiceResponse.body.invoice.totalAmount, 320);

  const productResponse = await tenant.agent.get("/api/products").query({ search: product.name });
  const updated = productResponse.body.items.find((item) => item.id === product.id);
  assert.equal(updated.stockPieces, 16);

  const quotationAfter = await tenant.agent.get(`/api/quotations/${quotation.id}`);
  assert.equal(quotationAfter.body.status, "CONVERTED");

  const secondConvert = await tenant.agent.post(`/api/quotations/${quotation.id}/convert`).send({ paidAmount: 320 });
  assert.equal(secondConvert.status, 400);
});

test("converting a quotation whose product no longer has enough stock is rejected", async () => {
  const product = await createProduct(tenant.agent, { name: `Understocked Quote Widget ${Date.now()}`, retailPrice: 50 });
  await addStock(tenant.agent, product.id, 2);

  const createResponse = await tenant.agent.post("/api/quotations").send({
    customerName: "Understock Buyer",
    items: [{ productId: product.id, productName: product.name, quantity: 10, unitPrice: 50 }],
  });
  const quotation = createResponse.body;

  const convertResponse = await tenant.agent.post(`/api/quotations/${quotation.id}/convert`).send({ paidAmount: 500 });
  assert.equal(convertResponse.status, 400);

  const productResponse = await tenant.agent.get("/api/products").query({ search: product.name });
  const updated = productResponse.body.items.find((item) => item.id === product.id);
  assert.equal(updated.stockPieces, 2, "a failed conversion must not touch stock");
});

test("deleting a quotation moves it to trash", async () => {
  const createResponse = await tenant.agent.post("/api/quotations").send({
    customerName: "Trash Buyer",
    items: [{ productName: "Ad-hoc Item", quantity: 1, unitPrice: 20 }],
  });
  const quotation = createResponse.body;

  const deleteResponse = await tenant.agent.delete(`/api/quotations/${quotation.id}`).send({ reason: "no longer needed" });
  assert.equal(deleteResponse.status, 200);

  const trashList = await tenant.agent.get("/api/quotations/trash");
  assert.ok(trashList.body.items.some((item) => item.id === quotation.id));
});

test("tenant isolation: another tenant cannot see, update, convert, or delete a quotation that isn't theirs", async () => {
  const createResponse = await tenant.agent.post("/api/quotations").send({
    customerName: "Isolated Buyer",
    items: [{ productName: "Ad-hoc Item", quantity: 1, unitPrice: 20 }],
  });
  const quotation = createResponse.body;

  const getResponse = await otherTenant.agent.get(`/api/quotations/${quotation.id}`);
  assert.equal(getResponse.status, 404);

  const updateResponse = await otherTenant.agent.patch(`/api/quotations/${quotation.id}`).send({ status: "SENT" });
  assert.equal(updateResponse.status, 404);

  const convertResponse = await otherTenant.agent.post(`/api/quotations/${quotation.id}/convert`).send({});
  assert.equal(convertResponse.status, 404);

  const deleteResponse = await otherTenant.agent.delete(`/api/quotations/${quotation.id}`);
  assert.equal(deleteResponse.status, 404);
});
