export function mapSalaryStructure(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    employeeId: row.employee_id,
    employeeName: row.employee_name || "",
    employeeNumber: row.employee_number || "",
    basicSalary: Number(row.basic_salary || 0),
    allowances: Number(row.allowances || 0),
    deductions: Number(row.deductions || 0),
    grossSalary: Number(row.gross_salary || 0),
    effectiveFrom: row.effective_from ? String(row.effective_from).slice(0, 10) : null,
    status: row.status,
    note: row.note || "",
    createdBy: row.created_by || null,
    updatedBy: row.updated_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPayrollRun(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    payrollMonth: row.payroll_month,
    status: row.status,
    totalEmployees: Number(row.total_employees || 0),
    grossTotal: Number(row.gross_total || 0),
    allowanceTotal: Number(row.allowance_total || 0),
    deductionTotal: Number(row.deduction_total || 0),
    attendanceDeductionTotal: Number(row.attendance_deduction_total || 0),
    netTotal: Number(row.net_total || 0),
    journalEntryId: row.journal_entry_id || null,
    generatedBy: row.generated_by || null,
    approvedBy: row.approved_by || null,
    approvedAt: row.approved_at || null,
    note: row.note || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPayrollRunItem(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    payrollRunId: row.payroll_run_id,
    employeeId: row.employee_id,
    employeeName: row.employee_name || "",
    employeeNumber: row.employee_number || "",
    departmentName: row.department_name || "",
    designationName: row.designation_name || "",
    basicSalary: Number(row.basic_salary || 0),
    allowances: Number(row.allowances || 0),
    fixedDeductions: Number(row.fixed_deductions || 0),
    grossSalary: Number(row.gross_salary || 0),
    presentDays: Number(row.present_days || 0),
    absentDays: Number(row.absent_days || 0),
    paidLeaveDays: Number(row.paid_leave_days || 0),
    unpaidLeaveDays: Number(row.unpaid_leave_days || 0),
    payableDays: Number(row.payable_days || 0),
    attendanceDeduction: Number(row.attendance_deduction || 0),
    advanceRecovery: Number(row.advance_recovery || 0),
    loanRecovery: Number(row.loan_recovery || 0),
    netPay: Number(row.net_pay || 0),
    createdAt: row.created_at,
  };
}

const SALARY_STRUCTURE_SELECT = `
  SELECT ss.*, e.name AS employee_name, e.employee_number
  FROM salary_structures ss
  JOIN employees e ON e.id = ss.employee_id AND e.tenant_id = ss.tenant_id
`;

export async function upsertSalaryStructure(client, structure) {
  const result = await client.query(
    `INSERT INTO salary_structures
      (id, tenant_id, employee_id, basic_salary, allowances, deductions, gross_salary, effective_from, status, note, created_by, updated_by, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11,NOW(),NOW())
     ON CONFLICT (tenant_id, employee_id) DO UPDATE SET
       basic_salary=EXCLUDED.basic_salary,
       allowances=EXCLUDED.allowances,
       deductions=EXCLUDED.deductions,
       gross_salary=EXCLUDED.gross_salary,
       effective_from=EXCLUDED.effective_from,
       status=EXCLUDED.status,
       note=EXCLUDED.note,
       updated_by=EXCLUDED.updated_by,
       updated_at=NOW()
     RETURNING *`,
    [
      structure.id,
      structure.tenantId,
      structure.employeeId,
      structure.basicSalary,
      structure.allowances,
      structure.deductions,
      structure.grossSalary,
      structure.effectiveFrom,
      structure.status,
      structure.note || "",
      structure.actorId || null,
    ],
  );
  return result.rows[0];
}

export async function findSalaryStructureByEmployee(client, tenantId, employeeId) {
  const result = await client.query(
    `${SALARY_STRUCTURE_SELECT}
     WHERE ss.tenant_id=$1 AND ss.employee_id=$2
     LIMIT 1`,
    [tenantId, employeeId],
  );
  return result.rows[0] ? mapSalaryStructure(result.rows[0]) : null;
}

export async function listSalaryStructures(client, tenantId) {
  const result = await client.query(
    `${SALARY_STRUCTURE_SELECT}
     WHERE ss.tenant_id=$1
     ORDER BY e.name ASC`,
    [tenantId],
  );
  return result.rows.map(mapSalaryStructure);
}

export async function findPayrollRunByMonth(client, tenantId, payrollMonth) {
  const result = await client.query(
    `SELECT * FROM payroll_runs WHERE tenant_id=$1 AND payroll_month=$2 LIMIT 1`,
    [tenantId, payrollMonth],
  );
  return result.rows[0] ? mapPayrollRun(result.rows[0]) : null;
}

export async function findPayrollRunById(client, tenantId, id) {
  const result = await client.query(
    `SELECT * FROM payroll_runs WHERE tenant_id=$1 AND id=$2 LIMIT 1`,
    [tenantId, id],
  );
  return result.rows[0] ? mapPayrollRun(result.rows[0]) : null;
}

export async function listPayrollRuns(client, tenantId) {
  const result = await client.query(
    `SELECT * FROM payroll_runs WHERE tenant_id=$1 ORDER BY payroll_month DESC, created_at DESC`,
    [tenantId],
  );
  return result.rows.map(mapPayrollRun);
}

export async function insertPayrollRun(client, run) {
  const result = await client.query(
    `INSERT INTO payroll_runs
      (id, tenant_id, payroll_month, status, total_employees, gross_total, allowance_total, deduction_total,
       attendance_deduction_total, net_total, generated_by, note, created_at, updated_at)
     VALUES ($1,$2,$3,'DRAFT',$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
     RETURNING *`,
    [
      run.id,
      run.tenantId,
      run.payrollMonth,
      run.totalEmployees,
      run.grossTotal,
      run.allowanceTotal,
      run.deductionTotal,
      run.attendanceDeductionTotal,
      run.netTotal,
      run.generatedBy || null,
      run.note || "",
    ],
  );
  return mapPayrollRun(result.rows[0]);
}

export async function insertPayrollRunItem(client, item) {
  const result = await client.query(
    `INSERT INTO payroll_run_items
      (id, tenant_id, payroll_run_id, employee_id, employee_name, employee_number, department_name, designation_name,
       basic_salary, allowances, fixed_deductions, gross_salary, present_days, absent_days, paid_leave_days,
       unpaid_leave_days, payable_days, attendance_deduction, advance_recovery, loan_recovery, net_pay, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,NOW())
     RETURNING *`,
    [
      item.id,
      item.tenantId,
      item.payrollRunId,
      item.employeeId,
      item.employeeName,
      item.employeeNumber || "",
      item.departmentName || "",
      item.designationName || "",
      item.basicSalary,
      item.allowances,
      item.fixedDeductions,
      item.grossSalary,
      item.presentDays,
      item.absentDays,
      item.paidLeaveDays,
      item.unpaidLeaveDays,
      item.payableDays,
      item.attendanceDeduction,
      item.advanceRecovery || 0,
      item.loanRecovery || 0,
      item.netPay,
    ],
  );
  return mapPayrollRunItem(result.rows[0]);
}

export async function listPayrollRunItems(client, tenantId, payrollRunId) {
  const result = await client.query(
    `SELECT * FROM payroll_run_items
     WHERE tenant_id=$1 AND payroll_run_id=$2
     ORDER BY employee_name ASC`,
    [tenantId, payrollRunId],
  );
  return result.rows.map(mapPayrollRunItem);
}

export async function findPayrollRunItem(client, tenantId, payrollRunId, employeeId) {
  const result = await client.query(
    `SELECT * FROM payroll_run_items
     WHERE tenant_id=$1 AND payroll_run_id=$2 AND employee_id=$3
     LIMIT 1`,
    [tenantId, payrollRunId, employeeId],
  );
  return result.rows[0] ? mapPayrollRunItem(result.rows[0]) : null;
}

export async function approvePayrollRun(client, { tenantId, id, actorId, journalEntryId }) {
  const result = await client.query(
    `UPDATE payroll_runs
     SET status='APPROVED', approved_by=$3, approved_at=NOW(), journal_entry_id=$4, updated_at=NOW()
     WHERE tenant_id=$1 AND id=$2 AND status='DRAFT'
     RETURNING *`,
    [tenantId, id, actorId || null, journalEntryId || null],
  );
  return result.rows[0] ? mapPayrollRun(result.rows[0]) : null;
}

export async function listPayrollSourceEmployees(client, tenantId) {
  const result = await client.query(
    `SELECT e.id, e.employee_number, e.name, e.department_id, COALESCE(d.name, e.department, '') AS department_name,
            e.designation_id, COALESCE(des.name, e.designation, '') AS designation_name,
            e.salary_amount, e.pay_type,
            ss.basic_salary, ss.allowances, ss.deductions, ss.gross_salary, ss.status AS salary_structure_status
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id AND d.tenant_id = e.tenant_id AND d.deleted_at IS NULL
     LEFT JOIN designations des ON des.id = e.designation_id AND des.tenant_id = e.tenant_id AND des.deleted_at IS NULL
     LEFT JOIN salary_structures ss ON ss.employee_id = e.id AND ss.tenant_id = e.tenant_id
     WHERE e.tenant_id=$1 AND e.deleted_at IS NULL AND e.status='ACTIVE'
     ORDER BY e.name ASC`,
    [tenantId],
  );
  return result.rows;
}

export async function listPayrollAttendanceSummary(client, tenantId, month) {
  const result = await client.query(
    `SELECT employee_id,
            COUNT(*) FILTER (WHERE status='PRESENT')::INTEGER AS present_days,
            COUNT(*) FILTER (WHERE status='ABSENT')::INTEGER AS absent_days
     FROM attendance
     WHERE tenant_id=$1 AND attendance_date >= $2::date AND attendance_date < ($2::date + INTERVAL '1 month')
     GROUP BY employee_id`,
    [tenantId, `${month}-01`],
  );
  return result.rows;
}

export async function listPayrollLeaveSummary(client, tenantId, month) {
  const result = await client.query(
    `WITH leave_days AS (
       SELECT lr.employee_id,
              lt.paid,
              (LEAST(lr.end_date, ($2::date + INTERVAL '1 month' - INTERVAL '1 day')::date)
               - GREATEST(lr.start_date, $2::date) + 1)::NUMERIC AS overlap_days
       FROM leave_requests lr
       JOIN leave_types lt ON lt.id = lr.leave_type_id AND lt.tenant_id = lr.tenant_id
       WHERE lr.tenant_id=$1 AND lr.status='APPROVED'
         AND lr.start_date < ($2::date + INTERVAL '1 month') AND lr.end_date >= $2::date
     )
     SELECT employee_id,
            COALESCE(SUM(CASE WHEN paid THEN overlap_days ELSE 0 END), 0)::NUMERIC AS paid_leave_days,
            COALESCE(SUM(CASE WHEN paid THEN 0 ELSE overlap_days END), 0)::NUMERIC AS unpaid_leave_days
     FROM leave_days
     GROUP BY employee_id`,
    [tenantId, `${month}-01`],
  );
  return result.rows;
}



