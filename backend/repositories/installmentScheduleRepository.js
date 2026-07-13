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

// Locks every still-collectible row for a plan (PENDING or PARTIAL only —
// RESTRUCTURED/WAIVED/PAID rows are settled history, never touched again),
// oldest installment first — the order payments/closures are applied in.
export async function listUnpaidScheduleForUpdate(client, planId, tenantId) {
  const result = await client.query(
    `SELECT * FROM installment_schedule
     WHERE plan_id = $1 AND tenant_id = $2 AND status IN ('PENDING', 'PARTIAL')
     ORDER BY installment_no ASC
     FOR UPDATE`,
    [planId, tenantId],
  );
  return result.rows.map(mapInstallmentScheduleRow);
}

function mapReportRow(row) {
  return {
    ...mapInstallmentScheduleRow(row),
    planNumber: row.plan_number,
    customerId: row.customer_id,
    customerName: row.customer_name || null,
    customerPhone: row.customer_phone || null,
    planOutstandingAmount: Number(row.plan_outstanding_amount || 0),
  };
}

// Every not-yet-fully-paid installment due within [dateFrom, dateTo] on an
// ACTIVE plan — covers both "Today's Due" (dateFrom = dateTo = today) and
// "Upcoming Due" (dateFrom = today, dateTo = +7/+15 days) from one query.
export async function listDueSchedule(client, tenantId, { dateFrom, dateTo }) {
  const result = await client.query(
    `SELECT
       installment_schedule.*,
       installment_plans.plan_number,
       installment_plans.customer_id,
       installment_plans.outstanding_amount AS plan_outstanding_amount,
       retail_customers.name AS customer_name,
       retail_customers.phone AS customer_phone
     FROM installment_schedule
     JOIN installment_plans
       ON installment_plans.id = installment_schedule.plan_id
       AND installment_plans.tenant_id = installment_schedule.tenant_id
     LEFT JOIN retail_customers
       ON retail_customers.id = installment_plans.customer_id
       AND retail_customers.tenant_id = installment_plans.tenant_id
     WHERE installment_schedule.tenant_id = $1
       AND installment_plans.status = 'ACTIVE'
       AND installment_schedule.status IN ('PENDING', 'PARTIAL')
       AND installment_schedule.due_date BETWEEN $2 AND $3
     ORDER BY installment_schedule.due_date ASC, installment_plans.plan_number ASC`,
    [tenantId, dateFrom, dateTo],
  );
  return result.rows.map(mapReportRow);
}

// Every not-yet-fully-paid installment whose due date has already passed, on
// an ACTIVE plan, ordered worst-first (most days overdue at the top).
export async function listOverdueSchedule(client, tenantId, asOfDate) {
  const result = await client.query(
    `SELECT
       installment_schedule.*,
       installment_plans.plan_number,
       installment_plans.customer_id,
       installment_plans.outstanding_amount AS plan_outstanding_amount,
       retail_customers.name AS customer_name,
       retail_customers.phone AS customer_phone,
       ($2::date - installment_schedule.due_date) AS days_overdue
     FROM installment_schedule
     JOIN installment_plans
       ON installment_plans.id = installment_schedule.plan_id
       AND installment_plans.tenant_id = installment_schedule.tenant_id
     LEFT JOIN retail_customers
       ON retail_customers.id = installment_plans.customer_id
       AND retail_customers.tenant_id = installment_plans.tenant_id
     WHERE installment_schedule.tenant_id = $1
       AND installment_plans.status = 'ACTIVE'
       AND installment_schedule.status IN ('PENDING', 'PARTIAL')
       AND installment_schedule.due_date < $2
     ORDER BY days_overdue DESC, installment_plans.plan_number ASC`,
    [tenantId, asOfDate],
  );
  return result.rows.map((row) => ({ ...mapReportRow(row), daysOverdue: Number(row.days_overdue) }));
}

// Credit check input: how much of a specific customer's existing installment
// exposure is currently past due, across all their ACTIVE plans.
export async function sumOverdueForCustomer(client, customerId, tenantId, asOfDate) {
  const result = await client.query(
    `SELECT COALESCE(SUM(installment_schedule.remaining_amount), 0) AS total
     FROM installment_schedule
     JOIN installment_plans
       ON installment_plans.id = installment_schedule.plan_id
       AND installment_plans.tenant_id = installment_schedule.tenant_id
     WHERE installment_schedule.tenant_id = $1
       AND installment_plans.customer_id = $2
       AND installment_plans.status = 'ACTIVE'
       AND installment_schedule.status IN ('PENDING', 'PARTIAL')
       AND installment_schedule.due_date < $3`,
    [tenantId, customerId, asOfDate],
  );
  return Number(result.rows[0].total || 0);
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
