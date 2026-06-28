export function mapSalaryPayment(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    paymentDate: row.payment_date ? String(row.payment_date).slice(0, 10) : null,
    paymentMonth: row.payment_month,
    amount: Number(row.amount || 0),
    paymentMethod: row.payment_method || 'CASH',
    note: row.note || '',
    createdById: row.created_by,
    createdByName: row.created_by_name || null,
    createdAt: row.created_at,
  };
}

export function insertSalaryPayment(client, payment) {
  return client.query(
    `INSERT INTO salary_payments
      (id, tenant_id, employee_id, employee_name, payment_date, payment_month,
       amount, payment_method, note, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      payment.id,
      payment.tenantId,
      payment.employeeId,
      payment.employeeName,
      payment.paymentDate,
      payment.paymentMonth,
      payment.amount,
      payment.paymentMethod,
      payment.note,
      payment.createdById,
    ],
  );
}

export function getSalaryOverview(client, tenantId, month) {
  return client.query(
    `SELECT
       e.id AS employee_id,
       e.name AS employee_name,
       e.salary_amount,
       e.pay_type,
       e.department,
       COALESCE(SUM(sp.amount), 0) AS total_paid
     FROM employees e
     LEFT JOIN salary_payments sp
       ON sp.employee_id = e.id AND sp.payment_month = $2 AND sp.tenant_id = $1
     WHERE e.tenant_id = $1 AND e.status = 'ACTIVE' AND e.deleted_at IS NULL
     GROUP BY e.id, e.name, e.salary_amount, e.pay_type, e.department
     ORDER BY e.name ASC`,
    [tenantId, month],
  );
}

export function listPaymentsByMonth(client, tenantId, month) {
  return client.query(
    `SELECT sp.*, u.name AS created_by_name
     FROM salary_payments sp
     LEFT JOIN users u ON u.id = sp.created_by
     WHERE sp.tenant_id = $1 AND sp.payment_month = $2
     ORDER BY sp.payment_date DESC, sp.created_at DESC`,
    [tenantId, month],
  );
}

export function findSalaryPaymentById(client, id, tenantId) {
  return client.query(
    `SELECT * FROM salary_payments WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    [id, tenantId],
  );
}

export function deleteSalaryPaymentRecord(client, id, tenantId) {
  return client.query(
    `DELETE FROM salary_payments WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId],
  );
}
