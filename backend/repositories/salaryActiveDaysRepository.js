export async function upsertActiveDays(client, { id, tenantId, employeeId, month, activeDays, updatedBy }) {
  await client.query(
    `INSERT INTO salary_active_days (id, tenant_id, employee_id, month, active_days, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (tenant_id, employee_id, month)
     DO UPDATE SET active_days = EXCLUDED.active_days, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [id, tenantId, employeeId, month, activeDays, updatedBy || null],
  );
}

export async function listActiveDaysByMonth(client, tenantId, month) {
  const result = await client.query(
    `SELECT employee_id, active_days FROM salary_active_days WHERE tenant_id = $1 AND month = $2`,
    [tenantId, month],
  );
  const map = {};
  for (const row of result.rows) map[row.employee_id] = Number(row.active_days);
  return map;
}
