export function mapPayroll(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    payrollNumber: row.payroll_number,
    month: row.month,
    status: row.status,
    financeAccountId: row.finance_account_id,
    totalNetPay: Number(row.total_net_pay),
    notes: row.notes,
    paidAt: row.paid_at,
    paidById: row.paid_by_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPayrollItem(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    payrollId: row.payroll_id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    department: row.department,
    designation: row.designation,
    payType: row.pay_type,
    basicPay: Number(row.basic_pay),
    workingDays: Number(row.working_days),
    daysPresent: Number(row.days_present),
    daysAbsent: Number(row.days_absent),
    absentDeduction: Number(row.absent_deduction),
    allowances: Array.isArray(row.allowances) ? row.allowances : (row.allowances ? JSON.parse(row.allowances) : []),
    totalAllowances: Number(row.total_allowances),
    deductions: Array.isArray(row.deductions) ? row.deductions : (row.deductions ? JSON.parse(row.deductions) : []),
    totalDeductions: Number(row.total_deductions),
    grossPay: Number(row.gross_pay),
    netPay: Number(row.net_pay),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function insertPayroll(client, payroll) {
  await client.query(
    `INSERT INTO payrolls
      (id, tenant_id, payroll_number, month, status, finance_account_id,
       total_net_pay, notes, created_by, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
    [
      payroll.id, payroll.tenantId, payroll.payrollNumber, payroll.month,
      payroll.status, payroll.financeAccountId, payroll.totalNetPay,
      payroll.notes, payroll.createdBy,
    ],
  );
}

export async function insertPayrollItems(client, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO payroll_items
        (id, tenant_id, payroll_id, employee_id, employee_name, department, designation,
         pay_type, basic_pay, working_days, days_present, days_absent, absent_deduction,
         allowances, total_allowances, deductions, total_deductions, gross_pay, net_pay,
         created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW(),NOW())`,
      [
        item.id, item.tenantId, item.payrollId, item.employeeId, item.employeeName,
        item.department, item.designation, item.payType, item.basicPay, item.workingDays,
        item.daysPresent, item.daysAbsent, item.absentDeduction,
        JSON.stringify(item.allowances), item.totalAllowances,
        JSON.stringify(item.deductions), item.totalDeductions,
        item.grossPay, item.netPay,
      ],
    );
  }
}

export async function findPayrollById(client, id, tenantId) {
  const result = await client.query(
    `SELECT * FROM payrolls WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
    [id, tenantId],
  );
  return result.rows[0] ? mapPayroll(result.rows[0]) : null;
}

export async function findPayrollByMonth(client, month, tenantId) {
  const result = await client.query(
    `SELECT * FROM payrolls WHERE month=$1 AND tenant_id=$2 LIMIT 1`,
    [month, tenantId],
  );
  return result.rows[0] ? mapPayroll(result.rows[0]) : null;
}

export async function countPayrolls(client, tenantId) {
  const result = await client.query(
    `SELECT COUNT(*) FROM payrolls WHERE tenant_id=$1`,
    [tenantId],
  );
  return Number(result.rows[0].count);
}

export async function listPayrollsPage(client, tenantId, limit, offset) {
  const result = await client.query(
    `SELECT * FROM payrolls WHERE tenant_id=$1 ORDER BY month DESC, created_at DESC LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );
  return result.rows.map(mapPayroll);
}

export async function updatePayrollStatus(client, id, tenantId, status, extra) {
  const fields = ["status=$3", "updated_at=NOW()"];
  const values = [id, tenantId, status];
  let i = 4;
  if (extra?.paidAt) { fields.push(`paid_at=$${i++}`); values.push(extra.paidAt); }
  if (extra?.paidById) { fields.push(`paid_by_id=$${i++}`); values.push(extra.paidById); }
  if (extra?.financeAccountId) { fields.push(`finance_account_id=$${i++}`); values.push(extra.financeAccountId); }
  await client.query(
    `UPDATE payrolls SET ${fields.join(",")} WHERE id=$1 AND tenant_id=$2`,
    values,
  );
}

export async function updatePayrollTotals(client, id, tenantId, totalNetPay) {
  await client.query(
    `UPDATE payrolls SET total_net_pay=$3, updated_at=NOW() WHERE id=$1 AND tenant_id=$2`,
    [id, tenantId, totalNetPay],
  );
}

export async function findPayrollItems(client, payrollId, tenantId) {
  const result = await client.query(
    `SELECT * FROM payroll_items WHERE payroll_id=$1 AND tenant_id=$2 ORDER BY employee_name ASC`,
    [payrollId, tenantId],
  );
  return result.rows.map(mapPayrollItem);
}

export async function updatePayrollItem(client, id, payrollId, tenantId, updates) {
  const daysAbsent = Number(updates.daysAbsent || 0);
  const daysPresent = Number(updates.workingDays || 30) - daysAbsent;

  await client.query(
    `UPDATE payroll_items SET
      days_absent=$4, days_present=$5, absent_deduction=$6,
      gross_pay=$7, net_pay=$8, updated_at=NOW()
     WHERE id=$1 AND payroll_id=$2 AND tenant_id=$3`,
    [
      id, payrollId, tenantId,
      daysAbsent, daysPresent,
      Number(updates.absentDeduction || 0),
      Number(updates.grossPay || 0),
      Number(updates.netPay || 0),
    ],
  );
}

export async function deletePayroll(client, id, tenantId) {
  await client.query(`DELETE FROM payroll_items WHERE payroll_id=$1 AND tenant_id=$2`, [id, tenantId]);
  await client.query(`DELETE FROM payrolls WHERE id=$1 AND tenant_id=$2`, [id, tenantId]);
}
