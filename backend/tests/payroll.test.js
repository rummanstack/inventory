import test from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { cleanupTenant, createTenantAndAdmin } from "./helpers/fixtures.js";

test("payroll supports structures, recoveries, payment settlement, reports, accounting, and tenant isolation", async (t) => {
  const { app, databaseManager } = await getTestApp();
  const tenantA = await createTenantAndAdmin(databaseManager, app, { name: "Payroll Tenant A" });
  const tenantB = await createTenantAndAdmin(databaseManager, app, { name: "Payroll Tenant B" });
  t.after(async () => cleanupTenant(databaseManager, tenantA.tenantId));
  t.after(async () => cleanupTenant(databaseManager, tenantB.tenantId));
  t.after(closeTestApp);

  const employeeAResponse = await tenantA.agent.post("/api/employees").send({ name: "Payroll Worker A", salaryAmount: 30000 });
  assert.equal(employeeAResponse.status, 201);
  const employeeBResponse = await tenantB.agent.post("/api/employees").send({ name: "Payroll Worker B", salaryAmount: 30000 });
  assert.equal(employeeBResponse.status, 201);

  const invalidStructureResponse = await tenantA.agent.post("/api/payroll/salary-structures").send({
    employeeId: employeeAResponse.body.id,
    basicSalary: 1000,
    deductions: 2000,
  });
  assert.equal(invalidStructureResponse.status, 400);

  const structureResponse = await tenantA.agent.post("/api/payroll/salary-structures").send({
    employeeId: employeeAResponse.body.id,
    basicSalary: 30000,
    allowances: 3000,
    deductions: 1000,
    effectiveFrom: "2026-07-01",
  });
  assert.equal(structureResponse.status, 200);
  assert.equal(structureResponse.body.salaryStructure.grossSalary, 33000);

  const attendanceResponse = await tenantA.agent.post("/api/attendance").send({
    employeeId: employeeAResponse.body.id,
    attendanceDate: "2026-07-01",
    status: "ABSENT",
  });
  assert.equal(attendanceResponse.status, 201);

  const unpaidTypeResponse = await tenantA.agent.post("/api/leave/types").send({ name: "Unpaid Leave", paid: false });
  assert.equal(unpaidTypeResponse.status, 201);
  const leaveResponse = await tenantA.agent.post("/api/leave/requests").send({
    employeeId: employeeAResponse.body.id,
    leaveTypeId: unpaidTypeResponse.body.leaveType.id,
    startDate: "2026-07-02",
    endDate: "2026-07-02",
    reason: "Personal work",
  });
  assert.equal(leaveResponse.status, 201);
  const approveLeaveResponse = await tenantA.agent.post(`/api/leave/requests/${leaveResponse.body.leaveRequest.id}/approve`).send({ decisionNote: "Approved" });
  assert.equal(approveLeaveResponse.status, 200);

  const advanceResponse = await tenantA.agent.post("/api/employee-finance/advances").send({
    employeeId: employeeAResponse.body.id,
    requestDate: "2026-07-01",
    amount: 1200,
    monthlyRecovery: 500,
    reason: "Festival advance",
  });
  assert.equal(advanceResponse.status, 201);
  const approveAdvanceResponse = await tenantA.agent.post(`/api/employee-finance/advances/${advanceResponse.body.advance.id}/approve`).send({ note: "Approved" });
  assert.equal(approveAdvanceResponse.status, 200);

  const loanResponse = await tenantA.agent.post("/api/employee-finance/loans").send({
    employeeId: employeeAResponse.body.id,
    requestDate: "2026-07-01",
    principalAmount: 2000,
    installmentAmount: 700,
    reason: "Medical loan",
  });
  assert.equal(loanResponse.status, 201);
  const approveLoanResponse = await tenantA.agent.post(`/api/employee-finance/loans/${loanResponse.body.loan.id}/approve`).send({ note: "Approved" });
  assert.equal(approveLoanResponse.status, 200);

  const generateResponse = await tenantA.agent.post("/api/payroll/runs/generate").send({ month: "2026-07" });
  assert.equal(generateResponse.status, 201);
  assert.equal(generateResponse.body.run.payrollMonth, "2026-07");
  assert.equal(generateResponse.body.run.status, "DRAFT");
  assert.equal(generateResponse.body.items.length, 1);
  const item = generateResponse.body.items[0];
  assert.equal(item.grossSalary, 33000);
  assert.equal(item.fixedDeductions, 1000);
  assert.equal(item.absentDays, 1);
  assert.equal(item.unpaidLeaveDays, 1);
  assert.equal(item.attendanceDeduction, 2129.03);
  assert.equal(item.advanceRecovery, 500);
  assert.equal(item.loanRecovery, 700);
  assert.equal(item.netPay, 28670.97);

  const advancesAfterGenerate = await tenantA.agent.get("/api/employee-finance/advances");
  assert.equal(advancesAfterGenerate.status, 200);
  assert.equal(advancesAfterGenerate.body.items[0].recoveredAmount, 500);
  assert.equal(advancesAfterGenerate.body.items[0].outstandingAmount, 700);

  const loansAfterGenerate = await tenantA.agent.get("/api/employee-finance/loans");
  assert.equal(loansAfterGenerate.status, 200);
  assert.equal(loansAfterGenerate.body.items[0].recoveredAmount, 700);
  assert.equal(loansAfterGenerate.body.items[0].outstandingAmount, 1300);

  const duplicateGenerateResponse = await tenantA.agent.post("/api/payroll/runs/generate").send({ month: "2026-07" });
  assert.equal(duplicateGenerateResponse.status, 409);

  const tenantBRunResponse = await tenantB.agent.get(`/api/payroll/runs/${generateResponse.body.run.id}`);
  assert.equal(tenantBRunResponse.status, 404);

  const approveResponse = await tenantA.agent.post(`/api/payroll/runs/${generateResponse.body.run.id}/approve`).send({ note: "Approved" });
  assert.equal(approveResponse.status, 200);
  assert.equal(approveResponse.body.run.status, "APPROVED");
  assert.ok(approveResponse.body.run.journalEntryId);

  const approveAgainResponse = await tenantA.agent.post(`/api/payroll/runs/${generateResponse.body.run.id}/approve`).send({ note: "Again" });
  assert.equal(approveAgainResponse.status, 400);

  const payslipResponse = await tenantA.agent.get(`/api/payroll/runs/${generateResponse.body.run.id}/payslips/${employeeAResponse.body.id}`);
  assert.equal(payslipResponse.status, 200);
  assert.equal(payslipResponse.body.item.netPay, 28670.97);

  const registerResponse = await tenantA.agent.get("/api/payroll/register").query({ month: "2026-07" });
  assert.equal(registerResponse.status, 200);
  assert.equal(registerResponse.body.totals.runCount, 1);
  assert.equal(registerResponse.body.totals.netTotal, 28670.97);

  await databaseManager.withClient(async (client) => {
    const result = await client.query(
      `SELECT je.source_type, jl.account_code, jl.debit, jl.credit
       FROM journal_entries je
       JOIN journal_lines jl ON jl.journal_entry_id = je.id AND jl.tenant_id = je.tenant_id
       WHERE je.tenant_id=$1 AND je.id=$2
       ORDER BY jl.account_code`,
      [tenantA.tenantId, approveResponse.body.run.journalEntryId],
    );
    assert.equal(result.rows.length, 2);
    assert.equal(result.rows[0].source_type, "payroll_run");
    const byAccount = new Map(result.rows.map((row) => [row.account_code, row]));
    assert.equal(Number(byAccount.get("6010").debit), 28670.97);
    assert.equal(Number(byAccount.get("2200").credit), 28670.97);

    await client.query("UPDATE finance_accounts SET balance=50000 WHERE tenant_id=$1 AND type='BANK'", [tenantA.tenantId]);
  });

  const payResponse = await tenantA.agent.post(`/api/payroll/runs/${generateResponse.body.run.id}/pay`).send({ paymentMethod: "BANK", paymentDate: "2026-07-31" });
  assert.equal(payResponse.status, 200);
  assert.equal(payResponse.body.run.paymentStatus, "PAID");
  assert.equal(payResponse.body.run.paymentMethod, "BANK");
  assert.ok(payResponse.body.run.paymentJournalEntryId);

  const payAgainResponse = await tenantA.agent.post(`/api/payroll/runs/${generateResponse.body.run.id}/pay`).send({ paymentMethod: "BANK" });
  assert.equal(payAgainResponse.status, 400);

  const salaryStructureAuditResponse = await tenantA.agent.get(`/api/audit/entity/salary_structure/${structureResponse.body.salaryStructure.id}`);
  assert.equal(salaryStructureAuditResponse.status, 200);
  assert.deepEqual(salaryStructureAuditResponse.body.items.map((item) => item.actionType), ["salary_structure.save"]);

  const payrollAuditResponse = await tenantA.agent.get(`/api/audit/entity/payroll_run/${generateResponse.body.run.id}`);
  assert.equal(payrollAuditResponse.status, 200);
  assert.deepEqual(
    payrollAuditResponse.body.items.map((item) => item.actionType).sort(),
    ["payroll.approve", "payroll.generate", "payroll.pay"],
  );

  await databaseManager.withClient(async (client) => {
    const result = await client.query(
      `SELECT je.source_type, jl.account_code, jl.debit, jl.credit
       FROM journal_entries je
       JOIN journal_lines jl ON jl.journal_entry_id = je.id AND jl.tenant_id = je.tenant_id
       WHERE je.tenant_id=$1 AND je.id=$2
       ORDER BY jl.account_code`,
      [tenantA.tenantId, payResponse.body.run.paymentJournalEntryId],
    );
    assert.equal(result.rows.length, 2);
    assert.equal(result.rows[0].source_type, "payroll_payment");
    const byAccount = new Map(result.rows.map((row) => [row.account_code, row]));
    assert.equal(Number(byAccount.get("1010").credit), 28670.97);
    assert.equal(Number(byAccount.get("2200").debit), 28670.97);
  });
});

