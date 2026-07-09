import test from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { cleanupTenant, createTenantAndAdmin } from "./helpers/fixtures.js";

test("attendance enforces validation, duplicate daily rows, tenant isolation, and monthly totals", async (t) => {
  const { app, databaseManager } = await getTestApp();
  const tenantA = await createTenantAndAdmin(databaseManager, app, { name: "Attendance Tenant A" });
  const tenantB = await createTenantAndAdmin(databaseManager, app, { name: "Attendance Tenant B" });
  t.after(async () => cleanupTenant(databaseManager, tenantA.tenantId));
  t.after(async () => cleanupTenant(databaseManager, tenantB.tenantId));
  t.after(closeTestApp);

  const employeeAResponse = await tenantA.agent.post("/api/employees").send({ name: "A Worker" });
  assert.equal(employeeAResponse.status, 201);
  const employeeBResponse = await tenantB.agent.post("/api/employees").send({ name: "B Worker" });
  assert.equal(employeeBResponse.status, 201);

  const invalidStatusResponse = await tenantA.agent.post("/api/attendance").send({
    employeeId: employeeAResponse.body.id,
    attendanceDate: "2026-07-01",
    status: "REMOTE",
  });
  assert.equal(invalidStatusResponse.status, 400);

  const presentResponse = await tenantA.agent.post("/api/attendance").send({
    employeeId: employeeAResponse.body.id,
    attendanceDate: "2026-07-01",
    status: "PRESENT",
    checkInTime: "09:15",
    checkOutTime: "18:30",
    lateMinutes: 15,
    overtimeMinutes: 30,
  });
  assert.equal(presentResponse.status, 201);
  assert.equal(presentResponse.body.attendance.status, "PRESENT");
  assert.equal(presentResponse.body.attendance.employeeName, "A Worker");

  const duplicateResponse = await tenantA.agent.post("/api/attendance").send({
    employeeId: employeeAResponse.body.id,
    attendanceDate: "2026-07-01",
    status: "ABSENT",
  });
  assert.equal(duplicateResponse.status, 409);

  const crossTenantUpdateResponse = await tenantB.agent.put(`/api/attendance/${presentResponse.body.attendance.id}`).send({
    employeeId: employeeBResponse.body.id,
    attendanceDate: "2026-07-01",
    status: "PRESENT",
  });
  assert.equal(crossTenantUpdateResponse.status, 404);

  const tenantADailyResponse = await tenantA.agent.get("/api/attendance/daily").query({ date: "2026-07-01" });
  assert.equal(tenantADailyResponse.status, 200);
  assert.equal(tenantADailyResponse.body.items.length, 1);

  const tenantBDailyResponse = await tenantB.agent.get("/api/attendance/daily").query({ date: "2026-07-01" });
  assert.equal(tenantBDailyResponse.status, 200);
  assert.equal(tenantBDailyResponse.body.items.length, 0);

  const absentResponse = await tenantA.agent.post("/api/attendance").send({
    employeeId: employeeAResponse.body.id,
    attendanceDate: "2026-07-02",
    status: "ABSENT",
  });
  assert.equal(absentResponse.status, 201);

  const leaveResponse = await tenantA.agent.post("/api/attendance").send({
    employeeId: employeeAResponse.body.id,
    attendanceDate: "2026-07-03",
    status: "LEAVE",
  });
  assert.equal(leaveResponse.status, 201);

  const holidayResponse = await tenantA.agent.post("/api/attendance").send({
    employeeId: employeeAResponse.body.id,
    attendanceDate: "2026-07-04",
    status: "HOLIDAY",
  });
  assert.equal(holidayResponse.status, 201);

  const updateResponse = await tenantA.agent.put(`/api/attendance/${presentResponse.body.attendance.id}`).send({
    employeeId: employeeAResponse.body.id,
    attendanceDate: "2026-07-01",
    status: "PRESENT",
    checkInTime: "09:00",
    checkOutTime: "18:00",
    lateMinutes: 0,
    overtimeMinutes: 60,
  });
  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.attendance.overtimeMinutes, 60);

  const reportResponse = await tenantA.agent.get("/api/attendance/monthly").query({ month: "2026-07" });
  assert.equal(reportResponse.status, 200);
  assert.equal(reportResponse.body.month, "2026-07");
  assert.equal(reportResponse.body.items.length, 1);
  assert.equal(reportResponse.body.totals.totalDays, 4);
  assert.equal(reportResponse.body.totals.presentDays, 1);
  assert.equal(reportResponse.body.totals.absentDays, 1);
  assert.equal(reportResponse.body.totals.leaveDays, 1);
  assert.equal(reportResponse.body.totals.holidayDays, 1);
  assert.equal(reportResponse.body.totals.lateMinutes, 0);
  assert.equal(reportResponse.body.totals.overtimeMinutes, 60);
});
