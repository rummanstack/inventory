import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, addStock, createRetailCustomer } from "./helpers/seeders.js";
import { PERMISSIONS, TENANT_BUSINESS_PERMISSIONS } from "../lib/permissions.js";
import { setCachedPermissions } from "../lib/permissionCache.js";
import { replaceRolePermissions } from "../repositories/rolePermissionRepository.js";

let databaseManager;
let tenant;
let otherTenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Installment Credit Tenant" });
  otherTenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Installment Credit Other Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await cleanupTenant(databaseManager, otherTenant.tenantId);
  await closeTestApp();
});

function daysFromToday(offset) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

// 50000 sale, 10000 down -> 40000 financed, 10% markup -> 44000 payable.
async function planPayload(agent, customerId, overrides = {}) {
  const product = await createProduct(agent, { name: `Credit Widget ${Date.now()}-${Math.random()}`, retailPrice: 5000 });
  await addStock(agent, product.id, 20);
  return {
    customerId,
    saleDate: daysFromToday(0),
    items: [{ productId: product.id, quantityPieces: 10, actualSalePrice: 5000 }],
    discount: 0,
    downPayment: 10000,
    markupType: "PERCENT",
    markupValue: 10,
    numberOfMonths: 8,
    firstPaymentDate: daysFromToday(0),
    ...overrides,
  };
}

// ── Credit settings & credit check ──────────────────────────────────────────

test("a customer's credit settings can be updated, and the credit check reflects them", async () => {
  const customer = await createRetailCustomer(tenant.agent, { name: `Credit Settings Customer ${Date.now()}` });

  const updateResponse = await tenant.agent.put(`/api/installments/customers/${customer.id}/credit-settings`).send({
    creditLimit: 50000,
    isCreditBlocked: false,
  });
  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.creditLimit, 50000);

  const checkResponse = await tenant.agent.get("/api/installments/credit-check").query({ customerId: customer.id });
  assert.equal(checkResponse.status, 200);
  assert.equal(checkResponse.body.creditLimit, 50000);
  assert.equal(checkResponse.body.isBlocked, false);
  assert.equal(checkResponse.body.totalExposure, 0);
  assert.equal(checkResponse.body.overLimit, false);
});

test("creating an installment plan is rejected for a credit-blocked customer", async () => {
  const customer = await createRetailCustomer(tenant.agent, { name: `Blocked Customer ${Date.now()}` });
  await tenant.agent.put(`/api/installments/customers/${customer.id}/credit-settings`).send({ creditLimit: 0, isCreditBlocked: true });

  const payload = await planPayload(tenant.agent, customer.id);
  const response = await tenant.agent.post("/api/installments").send(payload);
  assert.equal(response.status, 400);
  assert.match(response.body.message, /blocked from new installment credit/);
});

test("creating a plan that would exceed the credit limit is rejected without an explicit override, even for a user who could override", async () => {
  const customer = await createRetailCustomer(tenant.agent, { name: `Over Limit Customer ${Date.now()}` });
  await tenant.agent.put(`/api/installments/customers/${customer.id}/credit-settings`).send({ creditLimit: 30000, isCreditBlocked: false });

  const payload = await planPayload(tenant.agent, customer.id);
  const response = await tenant.agent.post("/api/installments").send(payload);
  assert.equal(response.status, 400);
  // The default test tenant admin *has* the override permission, so this
  // specifically exercises the second gate — the explicit-confirmation flag
  // — not the permission check itself (that's the next test down).
  assert.match(response.body.message, /explicit override confirmation/);
});

test("creating a plan that exceeds the credit limit succeeds with an explicit override from a user who has the override permission", async () => {
  const customer = await createRetailCustomer(tenant.agent, { name: `Override Customer ${Date.now()}` });
  await tenant.agent.put(`/api/installments/customers/${customer.id}/credit-settings`).send({ creditLimit: 30000, isCreditBlocked: false });

  const payload = await planPayload(tenant.agent, customer.id, { overrideCreditLimit: true });
  const response = await tenant.agent.post("/api/installments").send(payload);
  assert.equal(response.status, 201);
  assert.equal(response.body.creditCheck.overLimit, true);
});

test("a user without the override permission cannot exceed the credit limit even with the override flag set", async () => {
  const limitedTenant = await createTenantAndAdmin(databaseManager, (await getTestApp()).app, { name: "Credit Limited Tenant" });
  const limitedPermissions = TENANT_BUSINESS_PERMISSIONS.filter((permission) => permission !== PERMISSIONS.OVERRIDE_INSTALLMENT_CREDIT_LIMIT);
  await databaseManager.withTransaction(async (client) => {
    await replaceRolePermissions(client, "super_admin", limitedTenant.tenantId, limitedPermissions);
  });
  setCachedPermissions("super_admin", limitedTenant.tenantId, limitedPermissions);

  const customer = await createRetailCustomer(limitedTenant.agent, { name: `No Override Customer ${Date.now()}` });
  await limitedTenant.agent.put(`/api/installments/customers/${customer.id}/credit-settings`).send({ creditLimit: 30000, isCreditBlocked: false });

  const payload = await planPayload(limitedTenant.agent, customer.id, { overrideCreditLimit: true });
  const response = await limitedTenant.agent.post("/api/installments").send(payload);
  assert.equal(response.status, 400);
  assert.match(response.body.message, /over their credit limit/);

  await cleanupTenant(databaseManager, limitedTenant.tenantId);
});

// ── Guarantors ───────────────────────────────────────────────────────────────

test("a guarantor can be added to a plan, listed in plan detail, and removed", async () => {
  const customer = await createRetailCustomer(tenant.agent, { name: `Guarantor Customer ${Date.now()}` });
  const payload = await planPayload(tenant.agent, customer.id);
  const planResponse = await tenant.agent.post("/api/installments").send(payload);
  assert.equal(planResponse.status, 201);
  const planId = planResponse.body.plan.id;

  const addResponse = await tenant.agent.post(`/api/installments/${planId}/guarantors`).send({
    name: "Jane Guarantor",
    phone: "0177000000",
    relationship: "Sister",
    monthlyIncome: 40000,
  });
  assert.equal(addResponse.status, 201);
  assert.equal(addResponse.body.name, "Jane Guarantor");
  const guarantorId = addResponse.body.id;

  const detailResponse = await tenant.agent.get(`/api/installments/${planId}`);
  assert.equal(detailResponse.body.guarantors.length, 1);
  assert.equal(detailResponse.body.guarantors[0].id, guarantorId);

  const removeResponse = await tenant.agent.delete(`/api/installments/${planId}/guarantors/${guarantorId}`);
  assert.equal(removeResponse.status, 200);

  const afterRemove = await tenant.agent.get(`/api/installments/${planId}`);
  assert.equal(afterRemove.body.guarantors.length, 0);
});

test("adding a guarantor requires a name", async () => {
  const customer = await createRetailCustomer(tenant.agent, { name: `No Name Guarantor Customer ${Date.now()}` });
  const payload = await planPayload(tenant.agent, customer.id);
  const planResponse = await tenant.agent.post("/api/installments").send(payload);
  const planId = planResponse.body.plan.id;

  const response = await tenant.agent.post(`/api/installments/${planId}/guarantors`).send({ phone: "0177000000" });
  assert.equal(response.status, 400);
});

// ── Documents ────────────────────────────────────────────────────────────────

test("a document can be attached to a plan, listed in plan detail, and removed", async () => {
  const customer = await createRetailCustomer(tenant.agent, { name: `Document Customer ${Date.now()}` });
  const payload = await planPayload(tenant.agent, customer.id);
  const planResponse = await tenant.agent.post("/api/installments").send(payload);
  const planId = planResponse.body.plan.id;

  const attachResponse = await tenant.agent.post(`/api/installments/${planId}/documents`).send({
    documentType: "NATIONAL_ID",
    url: "/uploads/photos/national-id-123.jpg",
  });
  assert.equal(attachResponse.status, 201);
  assert.equal(attachResponse.body.documentType, "NATIONAL_ID");
  const documentId = attachResponse.body.id;

  const detailResponse = await tenant.agent.get(`/api/installments/${planId}`);
  assert.equal(detailResponse.body.documents.length, 1);
  assert.equal(detailResponse.body.documents[0].id, documentId);

  const removeResponse = await tenant.agent.delete(`/api/installments/${planId}/documents/${documentId}`);
  assert.equal(removeResponse.status, 200);

  const afterRemove = await tenant.agent.get(`/api/installments/${planId}`);
  assert.equal(afterRemove.body.documents.length, 0);
});

test("attaching a document requires a url and a document type", async () => {
  const customer = await createRetailCustomer(tenant.agent, { name: `No URL Document Customer ${Date.now()}` });
  const payload = await planPayload(tenant.agent, customer.id);
  const planResponse = await tenant.agent.post("/api/installments").send(payload);
  const planId = planResponse.body.plan.id;

  const noUrl = await tenant.agent.post(`/api/installments/${planId}/documents`).send({ documentType: "NATIONAL_ID" });
  assert.equal(noUrl.status, 400);

  const noType = await tenant.agent.post(`/api/installments/${planId}/documents`).send({ url: "/uploads/photos/x.jpg" });
  assert.equal(noType.status, 400);
});

// ── Tenant isolation ─────────────────────────────────────────────────────────

test("tenant isolation: another tenant cannot manage credit settings, guarantors, or documents on a plan/customer that isn't theirs", async () => {
  const customer = await createRetailCustomer(tenant.agent, { name: `Isolated Credit Customer ${Date.now()}` });
  const payload = await planPayload(tenant.agent, customer.id);
  const planResponse = await tenant.agent.post("/api/installments").send(payload);
  const planId = planResponse.body.plan.id;

  const creditSettingsResponse = await otherTenant.agent.put(`/api/installments/customers/${customer.id}/credit-settings`).send({
    creditLimit: 1,
    isCreditBlocked: true,
  });
  assert.equal(creditSettingsResponse.status, 404);

  const creditCheckResponse = await otherTenant.agent.get("/api/installments/credit-check").query({ customerId: customer.id });
  assert.equal(creditCheckResponse.status, 404);

  const addGuarantorResponse = await otherTenant.agent.post(`/api/installments/${planId}/guarantors`).send({ name: "Intruder" });
  assert.equal(addGuarantorResponse.status, 404);

  const attachDocumentResponse = await otherTenant.agent.post(`/api/installments/${planId}/documents`).send({
    documentType: "NATIONAL_ID",
    url: "/uploads/photos/x.jpg",
  });
  assert.equal(attachDocumentResponse.status, 404);
});
