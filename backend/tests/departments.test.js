import test from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { cleanupTenant, createTenantAndAdmin } from "./helpers/fixtures.js";

test("departments can be created, listed, updated, and deleted", async (t) => {
  const { app, databaseManager } = await getTestApp();
  const { tenantId, agent } = await createTenantAndAdmin(databaseManager, app, { name: "Departments Tenant" });
  t.after(async () => cleanupTenant(databaseManager, tenantId));
  t.after(closeTestApp);

  const createResponse = await agent.post("/api/departments").send({
    name: "Finance",
    code: "fin",
    status: "ACTIVE",
    note: "Back office finance team",
  });
  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.department.name, "Finance");
  assert.equal(createResponse.body.department.code, "FIN");

  const duplicateResponse = await agent.post("/api/departments").send({ name: "finance" });
  assert.equal(duplicateResponse.status, 409);

  const listResponse = await agent.get("/api/departments").query({ search: "fin" });
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.items.length, 1);
  assert.equal(listResponse.body.items[0].employeeCount, 0);

  const updateResponse = await agent.put(`/api/departments/${createResponse.body.department.id}`).send({
    name: "Finance & Accounts",
    code: "fa",
    status: "INACTIVE",
  });
  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.department.name, "Finance & Accounts");
  assert.equal(updateResponse.body.department.status, "INACTIVE");

  const deleteResponse = await agent.delete(`/api/departments/${createResponse.body.department.id}`).send({
    reason: "Test cleanup",
  });
  assert.equal(deleteResponse.status, 200);
  assert.equal(deleteResponse.body.ok, true);

  const emptyListResponse = await agent.get("/api/departments");
  assert.equal(emptyListResponse.status, 200);
  assert.equal(emptyListResponse.body.items.length, 0);
});
