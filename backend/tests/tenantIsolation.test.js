import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, createSupplier, createRetailCustomer, createDsr } from "./helpers/seeders.js";

let app;
let databaseManager;
let tenantA;
let tenantB;

before(async () => {
  ({ app, databaseManager } = await getTestApp());
  tenantA = await createTenantAndAdmin(databaseManager, app, { name: "Tenant A" });
  tenantB = await createTenantAndAdmin(databaseManager, app, { name: "Tenant B" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenantA.tenantId);
  await cleanupTenant(databaseManager, tenantB.tenantId);
  await closeTestApp();
});

test("tenant B cannot read, update, or delete tenant A's product", async () => {
  const product = await createProduct(tenantA.agent, { name: "Tenant A Widget" });

  const getResponse = await tenantB.agent.get(`/api/products`).query({ search: "Tenant A Widget" });
  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.body.items.some((item) => item.id === product.id), false);

  const updateResponse = await tenantB.agent.put(`/api/products/${product.id}`).send({
    name: "Hijacked",
    categoryId: product.categoryId,
    piecesPerCase: 1,
    purchasePrice: 1,
    wholesalePrice: 1,
    retailPrice: 1,
  });
  assert.equal(updateResponse.status, 404);

  const deleteResponse = await tenantB.agent.delete(`/api/products/${product.id}`).send({ reason: "test" });
  assert.equal(deleteResponse.status, 404);

  const stockResponse = await tenantB.agent.post(`/api/products/${product.id}/stock`).send({ addPieces: 10 });
  assert.equal(stockResponse.status, 404);
});

test("tenant B cannot read tenant A's supplier, retail customer, or DSR", async () => {
  const supplier = await createSupplier(tenantA.agent, { name: "Tenant A Supplier" });
  const customer = await createRetailCustomer(tenantA.agent, { name: "Tenant A Customer" });
  const dsr = await createDsr(tenantA.agent, { name: "Tenant A DSR" });

  assert.equal((await tenantB.agent.get(`/api/suppliers/${supplier.id}`)).status, 404);
  assert.equal((await tenantB.agent.get(`/api/retail-customers/${customer.id}`)).status, 404);

  const dsrListResponse = await tenantB.agent.get("/api/dsrs");
  assert.equal(dsrListResponse.status, 200);
  assert.equal(dsrListResponse.body.items.some((item) => item.id === dsr.id), false);
});

test("a request with no session is rejected before reaching any business route", async () => {
  const response = await request(app).get("/api/products");
  assert.equal(response.status, 401);
});
