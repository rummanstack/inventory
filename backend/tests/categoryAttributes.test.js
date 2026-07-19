import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createCategory } from "./helpers/seeders.js";

let databaseManager;
let tenantA;
let tenantB;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenantA = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Category Attributes Tenant A" });
  tenantB = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Category Attributes Tenant B" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenantA.tenantId);
  await cleanupTenant(databaseManager, tenantB.tenantId);
  await closeTestApp();
});

test("create, list, update, and delete a category attribute definition", async () => {
  const category = await createCategory(tenantA.agent, { name: "Televisions" });

  const createResponse = await tenantA.agent.post(`/api/categories/${category.id}/attributes`).send({
    key: "screen_size_inch",
    label: "Screen Size",
    dataType: "number",
    unit: "inch",
  });
  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.attribute.key, "screen_size_inch");
  assert.equal(createResponse.body.attribute.dataType, "number");

  const attributeId = createResponse.body.attribute.id;

  const listResponse = await tenantA.agent.get(`/api/categories/${category.id}/attributes`);
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.attributes.length, 1);

  const duplicateResponse = await tenantA.agent.post(`/api/categories/${category.id}/attributes`).send({
    key: "screen_size_inch",
    label: "Screen Size Again",
    dataType: "number",
  });
  assert.equal(duplicateResponse.status, 400);

  const updateResponse = await tenantA.agent.patch(`/api/categories/${category.id}/attributes/${attributeId}`).send({
    label: "Screen Size (Diagonal)",
    dataType: "number",
    unit: "inch",
  });
  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.attribute.label, "Screen Size (Diagonal)");

  const deleteResponse = await tenantA.agent.delete(`/api/categories/${category.id}/attributes/${attributeId}`);
  assert.equal(deleteResponse.status, 200);

  const listAfterDelete = await tenantA.agent.get(`/api/categories/${category.id}/attributes`);
  assert.equal(listAfterDelete.body.attributes.length, 0);
});

test("tenant B cannot read, update, or delete tenant A's category attribute", async () => {
  const category = await createCategory(tenantA.agent, { name: "Refrigerators" });
  const createResponse = await tenantA.agent.post(`/api/categories/${category.id}/attributes`).send({
    key: "capacity_liters",
    label: "Capacity",
    dataType: "number",
    unit: "L",
  });
  const attributeId = createResponse.body.attribute.id;

  const listResponse = await tenantB.agent.get(`/api/categories/${category.id}/attributes`);
  assert.equal(listResponse.status, 404);

  const updateResponse = await tenantB.agent.patch(`/api/categories/${category.id}/attributes/${attributeId}`).send({
    label: "Hijacked",
    dataType: "number",
  });
  assert.equal(updateResponse.status, 404);

  const deleteResponse = await tenantB.agent.delete(`/api/categories/${category.id}/attributes/${attributeId}`);
  assert.equal(deleteResponse.status, 404);
});
