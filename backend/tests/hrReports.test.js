import test from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { cleanupTenant, createTenantAndAdmin } from "./helpers/fixtures.js";

test("hr report source endpoints return employee, attendance, leave, payroll, advance, loan, and department data", async (t) => {
  const { app, databaseManager } = await getTestApp();
  const tenant = await createTenantAndAdmin(databaseManager, app, { name: "HR Reports Tenant" });
  t.after(async () => cleanupTenant(databaseManager, tenant.tenantId));
  t.after(closeTestApp);

  const departmentResponse = await tenant.agent.post("/api/departments").send({ name: "Operations", code: "OPS" });
  assert.equal(departmentResponse.status, 201);
  const designationResponse = await tenant.agent.post("/api/designations").send({ name: "Officer", code: "OFF" });
  assert.equal(designationResponse.status, 201);
  const employeeResponse = await tenant.agent.post("/api/employees").send({
    name: "Report Worker",
    departmentId: departmentResponse.body.department.id,
    designationId: designationResponse.body.designation.id,
    salaryAmount: 10000,
  });
  assert.equal(employeeResponse.status, 201);

  const attendanceResponse = await tenant.agent.post("/api/attendance").send({
    employeeId: employeeResponse.body.id,
    attendanceDate: "2026-09-01",
    status: "PRESENT",
  });
  assert.equal(attendanceResponse.status, 201);

  const leaveTypeResponse = await tenant.agent.post("/api/leave/types").send({ name: "Casual Leave", paid: true });
  assert.equal(leaveTypeResponse.status, 201);
  const leaveResponse = await tenant.agent.post("/api/leave/requests").send({
    employeeId: employeeResponse.body.id,
    leaveTypeId: leaveTypeResponse.body.leaveType.id,
    startDate: "2026-09-02",
    endDate: "2026-09-02",
    reason: "Family",
  });
  assert.equal(leaveResponse.status, 201);
  assert.equal((await tenant.agent.post(`/api/leave/requests/${leaveResponse.body.leaveRequest.id}/approve`).send({ note: "OK" })).status, 200);

  const advanceResponse = await tenant.agent.post("/api/employee-finance/advances").send({
    employeeId: employeeResponse.body.id,
    requestDate: "2026-09-01",
    amount: 300,
    monthlyRecovery: 100,
  });
  assert.equal(advanceResponse.status, 201);
  const loanResponse = await tenant.agent.post("/api/employee-finance/loans").send({
    employeeId: employeeResponse.body.id,
    requestDate: "2026-09-01",
    principalAmount: 600,
    installmentAmount: 200,
  });
  assert.equal(loanResponse.status, 201);

  assert.equal((await tenant.agent.post("/api/payroll/runs/generate").send({ month: "2026-09" })).status, 201);

  const employeesReport = await tenant.agent.get("/api/employees").query({ pageSize: 100 });
  assert.equal(employeesReport.status, 200);
  assert.equal(employeesReport.body.items.length, 1);

  const departmentsReport = await tenant.agent.get("/api/departments").query({ pageSize: 100 });
  assert.equal(departmentsReport.status, 200);
  assert.equal(departmentsReport.body.items.length, 1);
  assert.equal(departmentsReport.body.items[0].employeeCount, 1);

  const attendanceReport = await tenant.agent.get("/api/attendance/monthly").query({ month: "2026-09" });
  assert.equal(attendanceReport.status, 200);
  assert.equal(attendanceReport.body.totals.presentDays, 1);

  const leaveReport = await tenant.agent.get("/api/leave/report").query({ fromDate: "2026-09-01", toDate: "2026-09-30" });
  assert.equal(leaveReport.status, 200);
  assert.equal(leaveReport.body.totals.requestCount, 1);

  const payrollReport = await tenant.agent.get("/api/payroll/register").query({ month: "2026-09" });
  assert.equal(payrollReport.status, 200);
  assert.equal(payrollReport.body.totals.runCount, 1);

  const advanceReport = await tenant.agent.get("/api/employee-finance/advances");
  assert.equal(advanceReport.status, 200);
  assert.equal(advanceReport.body.items.length, 1);

  const loanReport = await tenant.agent.get("/api/employee-finance/loans");
  assert.equal(loanReport.status, 200);
  assert.equal(loanReport.body.items.length, 1);
});

