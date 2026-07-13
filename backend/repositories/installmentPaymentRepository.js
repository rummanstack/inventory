export function mapInstallmentPayment(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    planId: row.plan_id,
    customerId: row.customer_id,
    paymentDate: row.payment_date,
    amount: Number(row.amount || 0),
    paymentMethod: row.payment_method,
    note: row.note || "",
    createdById: row.created_by,
    createdAt: row.created_at,
  };
}

export async function insertInstallmentPayment(client, payment) {
  const result = await client.query(
    `INSERT INTO installment_payments (
       id, tenant_id, plan_id, customer_id, payment_date, amount, payment_method, note, created_by
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      payment.id,
      payment.tenantId,
      payment.planId,
      payment.customerId,
      payment.paymentDate,
      payment.amount,
      payment.paymentMethod,
      payment.note,
      payment.createdById,
    ],
  );
  return mapInstallmentPayment(result.rows[0]);
}

export async function insertInstallmentPaymentAllocation(client, allocation) {
  await client.query(
    `INSERT INTO installment_payment_allocations (id, tenant_id, payment_id, schedule_id, allocated_amount)
     VALUES ($1, $2, $3, $4, $5)`,
    [allocation.id, allocation.tenantId, allocation.paymentId, allocation.scheduleId, allocation.allocatedAmount],
  );
}

export async function listPaymentsByPlan(client, planId, tenantId) {
  const result = await client.query(
    `SELECT * FROM installment_payments
     WHERE plan_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
     ORDER BY payment_date DESC, created_at DESC`,
    [planId, tenantId],
  );
  return result.rows.map(mapInstallmentPayment);
}

// Collection Report: every payment posted within a date range, with the
// collecting user's name so the report can be grouped/filtered by collector.
export async function listPaymentsInRange(client, tenantId, { dateFrom, dateTo }) {
  const result = await client.query(
    `SELECT
       installment_payments.*,
       installment_plans.plan_number,
       retail_customers.name AS customer_name,
       users.name AS collected_by_name
     FROM installment_payments
     JOIN installment_plans
       ON installment_plans.id = installment_payments.plan_id
       AND installment_plans.tenant_id = installment_payments.tenant_id
     LEFT JOIN retail_customers
       ON retail_customers.id = installment_payments.customer_id
       AND retail_customers.tenant_id = installment_payments.tenant_id
     LEFT JOIN users
       ON users.id = installment_payments.created_by
     WHERE installment_payments.tenant_id = $1
       AND installment_payments.deleted_at IS NULL
       AND installment_payments.payment_date BETWEEN $2 AND $3
     ORDER BY installment_payments.payment_date DESC, installment_payments.created_at DESC`,
    [tenantId, dateFrom, dateTo],
  );
  return result.rows.map((row) => ({
    ...mapInstallmentPayment(row),
    planNumber: row.plan_number,
    customerName: row.customer_name || null,
    collectedByName: row.collected_by_name || null,
  }));
}
