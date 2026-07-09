import test from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { cleanupTenant, createTenantAndAdmin } from "./helpers/fixtures.js";
import { setCachedPermissions } from "../lib/permissionCache.js";
import { TENANT_BUSINESS_PERMISSIONS } from "../lib/permissions.js";

test("employee advances and loans enforce validation, approvals, tenant isolation, and feature gates", async (t) => {
  const { app, databaseManager } = await getTestApp();
  const tenantA = await createTenantAndAdmin(databaseManager, app, { name: "Employee Finance Tenant A" });
  const tenantB = await createTenantAndAdmin(databaseManager, app, { name: "Employee Finance Tenant B" });
  t.after(async () => cleanupTenant(databaseManager, tenantA.tenantId));
  t.after(async () => cleanupTenant(databaseManager, tenantB.tenantId));
  t.after(closeTestApp);

  const employeeAResponse = await tenantA.agent.post("/api/employees").send({ name: "Finance Worker A", salaryAmount: 20000 });
  assert.equal(employeeAResponse.status, 201);
  const employeeBResponse = await tenantB.agent.post("/api/employees").send({ name: "Finance Worker B", salaryAmount: 20000 });
  assert.equal(employeeBResponse.status, 201);

  const invalidAdvanceResponse = await tenantA.agent.post("/api/employee-finance/advances").send({
    employeeId: employeeAResponse.body.id,
    amount: 0,
    monthlyRecovery: 100,
  });
  assert.equal(invalidAdvanceResponse.status, 400);

  const advanceResponse = await tenantA.agent.post("/api/employee-finance/advances").send({
    employeeId: employeeAResponse.body.id,
    requestDate: "2026-08-01",
    amount: 1500,
    monthlyRecovery: 500,
    reason: "School fees",
  });
  assert.equal(advanceResponse.status, 201);
  assert.equal(advanceResponse.body.advance.status, "PENDING");
  assert.equal(advanceResponse.body.advance.outstandingAmount, 1500);

  const crossTenantApproveAdvance = await tenantB.agent.post(`/api/employee-finance/advances/${advanceResponse.body.advance.id}/approve`).send({ note: "Wrong tenant" });
  assert.equal(crossTenantApproveAdvance.status, 404);

  const approveAdvanceResponse = await tenantA.agent.post(`/api/employee-finance/advances/${advanceResponse.body.advance.id}/approve`).send({ note: "Approved" });
  assert.equal(approveAdvanceResponse.status, 200);
  assert.equal(approveAdvanceResponse.body.advance.status, "APPROVED");

  const approveAdvanceAgainResponse = await tenantA.agent.post(`/api/employee-finance/advances/${advanceResponse.body.advance.id}/approve`).send({ note: "Again" });
  assert.equal(approveAdvanceAgainResponse.status, 400);

  const invalidLoanResponse = await tenantA.agent.post("/api/employee-finance/loans").send({
    employeeId: employeeAResponse.body.id,
    principalAmount: 1000,
    installmentAmount: 0,
  });
  assert.equal(invalidLoanResponse.status, 400);

  const loanResponse = await tenantA.agent.post("/api/employee-finance/loans").send({
    employeeId: employeeAResponse.body.id,
    requestDate: "2026-08-01",
    principalAmount: 5000,
    installmentAmount: 1000,
    reason: "Medical",
  });
  assert.equal(loanResponse.status, 201);
  assert.equal(loanResponse.body.loan.status, "PENDING");
  assert.equal(loanResponse.body.loan.outstandingAmount, 5000);

  const crossTenantRejectLoan = await tenantB.agent.post(`/api/employee-finance/loans/${loanResponse.body.loan.id}/reject`).send({ note: "Wrong tenant" });
  assert.equal(crossTenantRejectLoan.status, 404);

  const rejectLoanResponse = await tenantA.agent.post(`/api/employee-finance/loans/${loanResponse.body.loan.id}/reject`).send({ note: "Rejected" });
  assert.equal(rejectLoanResponse.status, 200);
  assert.equal(rejectLoanResponse.body.loan.status, "REJECTED");

  const advanceAuditResponse = await tenantA.agent.get(`/api/audit/entity/employee_advance/${advanceResponse.body.advance.id}`);
  assert.equal(advanceAuditResponse.status, 200);
  assert.deepEqual(
    advanceAuditResponse.body.items.map((item) => item.actionType).sort(),
    ["employee_advance.approve", "employee_advance.request"],
  );

  const loanAuditResponse = await tenantA.agent.get(`/api/audit/entity/employee_loan/${loanResponse.body.loan.id}`);
  assert.equal(loanAuditResponse.status, 200);
  assert.deepEqual(
    loanAuditResponse.body.items.map((item) => item.actionType).sort(),
    ["employee_loan.reject", "employee_loan.request"],
  );

  const tenantAAdvances = await tenantA.agent.get("/api/employee-finance/advances").query({ employeeId: employeeAResponse.body.id });
  assert.equal(tenantAAdvances.status, 200);
  assert.equal(tenantAAdvances.body.items.length, 1);

  const tenantBAdvances = await tenantB.agent.get("/api/employee-finance/advances").query({ employeeId: employeeBResponse.body.id });
  assert.equal(tenantBAdvances.status, 200);
  assert.equal(tenantBAdvances.body.items.length, 0);

  await databaseManager.withClient(async (client) => {
    await client.query("DELETE FROM tenant_features WHERE tenant_id=$1 AND feature='employee_advances'", [tenantA.tenantId]);
  });
  const featureDenied = await tenantA.agent.get("/api/employee-finance/advances");
  assert.equal(featureDenied.status, 403);

  await databaseManager.withClient(async (client) => {
    await client.query("INSERT INTO tenant_features (tenant_id, feature) VALUES ($1, 'employee_advances') ON CONFLICT DO NOTHING", [tenantA.tenantId]);
    await client.query("DELETE FROM role_permissions WHERE tenant_id=$1 AND role='super_admin' AND permission='advance.manage'", [tenantA.tenantId]);
  });
  setCachedPermissions("super_admin", tenantA.tenantId, TENANT_BUSINESS_PERMISSIONS.filter((permission) => permission !== "advance.manage"));
  const permissionDenied = await tenantA.agent.get("/api/employee-finance/advances");
  assert.equal(permissionDenied.status, 403);
});

