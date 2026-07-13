export function mapInstallmentScheduleRow(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    planId: row.plan_id,
    installmentNo: Number(row.installment_no),
    dueDate: row.due_date,
    dueAmount: Number(row.due_amount || 0),
    paidAmount: Number(row.paid_amount || 0),
    remainingAmount: Number(row.remaining_amount || 0),
    paidDate: row.paid_date || null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function insertInstallmentScheduleRow(client, row) {
  const result = await client.query(
    `INSERT INTO installment_schedule (
       id, tenant_id, plan_id, installment_no, due_date, due_amount, paid_amount, remaining_amount, status
     ) VALUES ($1, $2, $3, $4, $5, $6, 0, $6, 'PENDING')
     RETURNING *`,
    [row.id, row.tenantId, row.planId, row.installmentNo, row.dueDate, row.dueAmount],
  );
  return mapInstallmentScheduleRow(result.rows[0]);
}

export async function listScheduleByPlan(client, planId, tenantId) {
  const result = await client.query(
    `SELECT * FROM installment_schedule WHERE plan_id = $1 AND tenant_id = $2 ORDER BY installment_no ASC`,
    [planId, tenantId],
  );
  return result.rows.map(mapInstallmentScheduleRow);
}

// Locks every not-yet-fully-paid row for a plan, oldest installment first — the
// order payments are applied in.
export async function listUnpaidScheduleForUpdate(client, planId, tenantId) {
  const result = await client.query(
    `SELECT * FROM installment_schedule
     WHERE plan_id = $1 AND tenant_id = $2 AND status != 'PAID'
     ORDER BY installment_no ASC
     FOR UPDATE`,
    [planId, tenantId],
  );
  return result.rows.map(mapInstallmentScheduleRow);
}

export async function updateInstallmentScheduleRow(client, id, tenantId, { paidAmount, remainingAmount, status, paidDate }) {
  const result = await client.query(
    `UPDATE installment_schedule
     SET paid_amount = $3, remaining_amount = $4, status = $5, paid_date = $6, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [id, tenantId, paidAmount, remainingAmount, status, paidDate],
  );
  return mapInstallmentScheduleRow(result.rows[0]);
}
