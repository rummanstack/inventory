import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";

let databaseManager;
let tenant;
let otherTenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Repair Jobs Tenant" });
  otherTenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Repair Jobs Other Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await cleanupTenant(databaseManager, otherTenant.tenantId);
  await closeTestApp();
});

function jobPayload(overrides = {}) {
  return {
    customerName: "Repair Customer",
    customerPhone: "0155000000",
    deviceName: "Smartphone X",
    problemDescription: "Cracked screen",
    receivedDate: "2026-04-01",
    ...overrides,
  };
}

test("creating a repair job without a customer name, problem description, or received date is rejected", async () => {
  const noCustomer = await tenant.agent.post("/api/repair-jobs").send(jobPayload({ customerName: "" }));
  assert.equal(noCustomer.status, 400);

  const noProblem = await tenant.agent.post("/api/repair-jobs").send(jobPayload({ problemDescription: "" }));
  assert.equal(noProblem.status, 400);

  const noDate = await tenant.agent.post("/api/repair-jobs").send(jobPayload({ receivedDate: "" }));
  assert.equal(noDate.status, 400);
});

test("a repair job is created RECEIVED/PENDING and can move through the kanban stages", async () => {
  const createResponse = await tenant.agent.post("/api/repair-jobs").send(jobPayload());
  assert.equal(createResponse.status, 201);
  const job = createResponse.body;
  assert.equal(job.status, "RECEIVED");
  assert.equal(job.approvalStatus, "PENDING");
  assert.ok(job.jobNumber);

  const diagnosing = await tenant.agent.patch(`/api/repair-jobs/${job.id}`).send({ status: "DIAGNOSING", approvalStatus: "APPROVED" });
  assert.equal(diagnosing.status, 200);
  assert.equal(diagnosing.body.status, "DIAGNOSING");
  assert.equal(diagnosing.body.approvalStatus, "APPROVED");

  const inRepair = await tenant.agent.patch(`/api/repair-jobs/${job.id}`).send({ status: "IN_REPAIR", laborCost: 200 });
  assert.equal(inRepair.status, 200);
  assert.equal(inRepair.body.laborCost, 200);

  const ready = await tenant.agent.patch(`/api/repair-jobs/${job.id}`).send({ status: "READY" });
  assert.equal(ready.status, 200);
  assert.equal(ready.body.status, "READY");

  const delivered = await tenant.agent.patch(`/api/repair-jobs/${job.id}`).send({ status: "DELIVERED" });
  assert.equal(delivered.status, 200);
  assert.equal(delivered.body.status, "DELIVERED");
  assert.ok(delivered.body.deliveredDate, "delivering without an explicit date should stamp today's date");
});

test("a DELIVERED or CANCELLED repair job is closed and cannot be edited further", async () => {
  const createResponse = await tenant.agent.post("/api/repair-jobs").send(jobPayload());
  const job = createResponse.body;

  await tenant.agent.patch(`/api/repair-jobs/${job.id}`).send({ status: "CANCELLED" });

  const editAttempt = await tenant.agent.patch(`/api/repair-jobs/${job.id}`).send({ laborCost: 999 });
  assert.equal(editAttempt.status, 400);
});

test("a repair job can be listed by status and searched, then moved to trash", async () => {
  const createResponse = await tenant.agent.post("/api/repair-jobs").send(jobPayload({ customerName: `Findable Customer ${Date.now()}` }));
  const job = createResponse.body;

  const listResponse = await tenant.agent.get("/api/repair-jobs").query({ status: "RECEIVED" });
  assert.ok(listResponse.body.items.some((item) => item.id === job.id));

  const deleteResponse = await tenant.agent.delete(`/api/repair-jobs/${job.id}`).send({ reason: "customer withdrew device" });
  assert.equal(deleteResponse.status, 200);

  const activeList = await tenant.agent.get("/api/repair-jobs");
  assert.ok(!activeList.body.items.some((item) => item.id === job.id));

  const trashList = await tenant.agent.get("/api/repair-jobs/trash");
  assert.ok(trashList.body.items.some((item) => item.id === job.id));
});

test("tenant isolation: another tenant cannot see, update, or delete a repair job that isn't theirs", async () => {
  const createResponse = await tenant.agent.post("/api/repair-jobs").send(jobPayload());
  const job = createResponse.body;

  const getResponse = await otherTenant.agent.get(`/api/repair-jobs/${job.id}`);
  assert.equal(getResponse.status, 404);

  const updateResponse = await otherTenant.agent.patch(`/api/repair-jobs/${job.id}`).send({ status: "DIAGNOSING" });
  assert.equal(updateResponse.status, 404);

  const deleteResponse = await otherTenant.agent.delete(`/api/repair-jobs/${job.id}`);
  assert.equal(deleteResponse.status, 404);
});
