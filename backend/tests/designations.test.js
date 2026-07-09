import test from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { cleanupTenant, createTenantAndAdmin } from "./helpers/fixtures.js";

test("designations can be created, listed, updated, and protected from assigned deletes", async (t) => {
  const { app, databaseManager } = await getTestApp();
  const { tenantId, agent } = await createTenantAndAdmin(databaseManager, app, { name: "Designations Tenant" });
  t.after(async () => cleanupTenant(databaseManager, tenantId));
  t.after(closeTestApp);

  const createResponse = await agent.post("/api/designations").send({
    name: "Sales Manager",
    code: "sm",
    status: "ACTIVE",
    note: "Owns store sales targets",
  });
  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.designation.name, "Sales Manager");
  assert.equal(createResponse.body.designation.code, "SM");

  const duplicateResponse = await agent.post("/api/designations").send({ name: "sales manager" });
  assert.equal(duplicateResponse.status, 409);

  const activeResponse = await agent.get("/api/designations/active");
  assert.equal(activeResponse.status, 200);
  assert.equal(activeResponse.body.items.length, 1);

  const listResponse = await agent.get("/api/designations").query({ search: "manager" });
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.items.length, 1);
  assert.equal(listResponse.body.items[0].employeeCount, 0);

  const updateResponse = await agent.put(`/api/designations/${createResponse.body.designation.id}`).send({
    name: "Senior Sales Manager",
    code: "ssm",
    status: "ACTIVE",
  });
  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.designation.name, "Senior Sales Manager");
  assert.equal(updateResponse.body.designation.code, "SSM");

  await databaseManager.withClient((client) => client.query(
    `INSERT INTO employees (id, tenant_id, employee_number, name, designation_id)
     VALUES ($1, $2, $3, $4, $5)`,
    ["emp_designation_guard", tenantId, "EMP-DESIG-001", "Assigned Employee", createResponse.body.designation.id],
  ));

  const blockedDeleteResponse = await agent.delete(`/api/designations/${createResponse.body.designation.id}`).send({
    reason: "Should be blocked",
  });
  assert.equal(blockedDeleteResponse.status, 400);

  await databaseManager.withClient((client) => client.query("UPDATE employees SET deleted_at = NOW() WHERE id = $1", ["emp_designation_guard"]));

  const deleteResponse = await agent.delete(`/api/designations/${createResponse.body.designation.id}`).send({
    reason: "Test cleanup",
  });
  assert.equal(deleteResponse.status, 200);
  assert.equal(deleteResponse.body.ok, true);

  const emptyListResponse = await agent.get("/api/designations");
  assert.equal(emptyListResponse.status, 200);
  assert.equal(emptyListResponse.body.items.length, 0);
});
