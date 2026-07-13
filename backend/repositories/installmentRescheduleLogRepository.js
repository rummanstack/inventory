export function mapInstallmentRescheduleLog(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    planId: row.plan_id,
    reason: row.reason,
    oldSchedule: row.old_schedule,
    newSchedule: row.new_schedule,
    createdById: row.created_by,
    createdAt: row.created_at,
  };
}

export async function insertInstallmentRescheduleLog(client, entry) {
  const result = await client.query(
    `INSERT INTO installment_reschedule_log (id, tenant_id, plan_id, reason, old_schedule, new_schedule, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      entry.id,
      entry.tenantId,
      entry.planId,
      entry.reason,
      JSON.stringify(entry.oldSchedule),
      JSON.stringify(entry.newSchedule),
      entry.createdById,
    ],
  );
  return mapInstallmentRescheduleLog(result.rows[0]);
}

export async function listRescheduleLogByPlan(client, planId, tenantId) {
  const result = await client.query(
    `SELECT * FROM installment_reschedule_log WHERE plan_id = $1 AND tenant_id = $2 ORDER BY created_at DESC`,
    [planId, tenantId],
  );
  return result.rows.map(mapInstallmentRescheduleLog);
}
