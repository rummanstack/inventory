export function mapSalaryStructure(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    employeeId: row.employee_id,
    payType: row.pay_type,
    basicPay: Number(row.basic_pay),
    effectiveFrom: row.effective_from ? String(row.effective_from).slice(0, 10) : null,
    allowances: Array.isArray(row.allowances) ? row.allowances : (row.allowances ? JSON.parse(row.allowances) : []),
    deductions: Array.isArray(row.deductions) ? row.deductions : (row.deductions ? JSON.parse(row.deductions) : []),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findSalaryStructureByEmployee(client, employeeId, tenantId) {
  const result = await client.query(
    `SELECT * FROM salary_structures WHERE employee_id=$1 AND tenant_id=$2
     ORDER BY effective_from DESC LIMIT 1`,
    [employeeId, tenantId],
  );
  return result.rows[0] ? mapSalaryStructure(result.rows[0]) : null;
}

export async function upsertSalaryStructure(client, ss) {
  const existing = await findSalaryStructureByEmployee(client, ss.employeeId, ss.tenantId);
  if (existing) {
    await client.query(
      `UPDATE salary_structures SET
        pay_type=$3, basic_pay=$4, effective_from=$5, allowances=$6, deductions=$7, updated_at=NOW()
       WHERE employee_id=$1 AND tenant_id=$2`,
      [ss.employeeId, ss.tenantId, ss.payType, ss.basicPay, ss.effectiveFrom,
       JSON.stringify(ss.allowances), JSON.stringify(ss.deductions)],
    );
    return { ...existing, ...ss };
  } else {
    await client.query(
      `INSERT INTO salary_structures
        (id, tenant_id, employee_id, pay_type, basic_pay, effective_from, allowances, deductions, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [ss.id, ss.tenantId, ss.employeeId, ss.payType, ss.basicPay, ss.effectiveFrom,
       JSON.stringify(ss.allowances), JSON.stringify(ss.deductions), ss.createdBy],
    );
    return ss;
  }
}

export async function listSalaryStructures(client, tenantId) {
  const result = await client.query(
    `SELECT DISTINCT ON (employee_id) * FROM salary_structures
     WHERE tenant_id=$1 ORDER BY employee_id, effective_from DESC`,
    [tenantId],
  );
  return result.rows.map(mapSalaryStructure);
}
