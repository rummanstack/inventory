import test from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { cleanupTenant, createTenantAndAdmin } from "./helpers/fixtures.js";

test("leave management enforces validation, tenant isolation, overlap rules, approvals, and reports", async (t) => {
  const { app, databaseManager } = await getTestApp();
  const tenantA = await createTenantAndAdmin(databaseManager, app, { name: "Leave Tenant A" });
  const tenantB = await createTenantAndAdmin(databaseManager, app, { name: "Leave Tenant B" });
  t.after(async () => cleanupTenant(databaseManager, tenantA.tenantId));
  t.after(async () => cleanupTenant(databaseManager, tenantB.tenantId));
  t.after(closeTestApp);

  const employeeAResponse = await tenantA.agent.post("/api/employees").send({ name: "Leave Worker A" });
  assert.equal(employeeAResponse.status, 201);
  const employeeBResponse = await tenantB.agent.post("/api/employees").send({ name: "Leave Worker B" });
  assert.equal(employeeBResponse.status, 201);

  const leaveTypeResponse = await tenantA.agent.post("/api/leave/types").send({
    name: "Annual Leave",
    code: "AL",
    annualDays: 14,
    paid: true,
  });
  assert.equal(leaveTypeResponse.status, 201);
  assert.equal(leaveTypeResponse.body.leaveType.name, "Annual Leave");
  assert.equal(leaveTypeResponse.body.leaveType.annualDays, 14);

  const duplicateTypeResponse = await tenantA.agent.post("/api/leave/types").send({ name: "annual leave" });
  assert.equal(duplicateTypeResponse.status, 409);

  const tenantBTypeResponse = await tenantB.agent.post("/api/leave/types").send({ name: "Annual Leave" });
  assert.equal(tenantBTypeResponse.status, 201);

  const invalidApplyResponse = await tenantA.agent.post("/api/leave/requests").send({
    employeeId: employeeAResponse.body.id,
    leaveTypeId: leaveTypeResponse.body.leaveType.id,
    startDate: "2026-07-03",
    endDate: "2026-07-01",
    reason: "Invalid range",
  });
  assert.equal(invalidApplyResponse.status, 400);

  const applyResponse = await tenantA.agent.post("/api/leave/requests").send({
    employeeId: employeeAResponse.body.id,
    leaveTypeId: leaveTypeResponse.body.leaveType.id,
    startDate: "2026-07-01",
    endDate: "2026-07-03",
    reason: "Family event",
  });
  assert.equal(applyResponse.status, 201);
  assert.equal(applyResponse.body.leaveRequest.status, "PENDING");
  assert.equal(applyResponse.body.leaveRequest.totalDays, 3);

  const overlapResponse = await tenantA.agent.post("/api/leave/requests").send({
    employeeId: employeeAResponse.body.id,
    leaveTypeId: leaveTypeResponse.body.leaveType.id,
    startDate: "2026-07-02",
    endDate: "2026-07-04",
    reason: "Overlapping request",
  });
  assert.equal(overlapResponse.status, 409);

  const crossTenantApproveResponse = await tenantB.agent.post(`/api/leave/requests/${applyResponse.body.leaveRequest.id}/approve`).send({
    decisionNote: "Wrong tenant",
  });
  assert.equal(crossTenantApproveResponse.status, 404);

  const approveResponse = await tenantA.agent.post(`/api/leave/requests/${applyResponse.body.leaveRequest.id}/approve`).send({
    decisionNote: "Approved by HR",
  });
  assert.equal(approveResponse.status, 200);
  assert.equal(approveResponse.body.leaveRequest.status, "APPROVED");
  assert.equal(approveResponse.body.leaveRequest.decisionNote, "Approved by HR");

  const approveAgainResponse = await tenantA.agent.post(`/api/leave/requests/${applyResponse.body.leaveRequest.id}/approve`).send({
    decisionNote: "Duplicate approval",
  });
  assert.equal(approveAgainResponse.status, 400);

  const rejectedApplyResponse = await tenantA.agent.post("/api/leave/requests").send({
    employeeId: employeeAResponse.body.id,
    leaveTypeId: leaveTypeResponse.body.leaveType.id,
    startDate: "2026-07-05",
    endDate: "2026-07-05",
    reason: "Personal work",
  });
  assert.equal(rejectedApplyResponse.status, 201);

  const rejectResponse = await tenantA.agent.post(`/api/leave/requests/${rejectedApplyResponse.body.leaveRequest.id}/reject`).send({
    decisionNote: "Insufficient handover",
  });
  assert.equal(rejectResponse.status, 200);
  assert.equal(rejectResponse.body.leaveRequest.status, "REJECTED");

  const listResponse = await tenantA.agent.get("/api/leave/requests").query({ employeeId: employeeAResponse.body.id });
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.total, 2);

  const tenantBListResponse = await tenantB.agent.get("/api/leave/requests").query({ employeeId: employeeBResponse.body.id });
  assert.equal(tenantBListResponse.status, 200);
  assert.equal(tenantBListResponse.body.total, 0);

  const calendarResponse = await tenantA.agent.get("/api/leave/calendar").query({ fromDate: "2026-07-01", toDate: "2026-07-31" });
  assert.equal(calendarResponse.status, 200);
  assert.equal(calendarResponse.body.items.length, 1);
  assert.equal(calendarResponse.body.items[0].status, "APPROVED");

  const reportResponse = await tenantA.agent.get("/api/leave/report").query({ fromDate: "2026-07-01", toDate: "2026-07-31" });
  assert.equal(reportResponse.status, 200);
  assert.equal(reportResponse.body.totals.requestCount, 2);
  assert.equal(reportResponse.body.totals.totalDays, 4);
  const statuses = new Map(reportResponse.body.items.map((item) => [item.status, item]));
  assert.equal(statuses.get("APPROVED").requestCount, 1);
  assert.equal(statuses.get("APPROVED").totalDays, 3);
  assert.equal(statuses.get("REJECTED").requestCount, 1);
  assert.equal(statuses.get("REJECTED").totalDays, 1);

  const deleteUsedTypeResponse = await tenantA.agent.delete(`/api/leave/types/${leaveTypeResponse.body.leaveType.id}`).send({ reason: "Used in tests" });
  assert.equal(deleteUsedTypeResponse.status, 400);
});
