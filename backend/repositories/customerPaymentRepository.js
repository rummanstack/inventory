export function mapCustomerPayment(row) {
  return {
    id: row.id,
    organizationId: row.tenant_id,
    customerId: row.customer_id,
    customerName: row.customer_name || null,
    paymentDate: row.payment_date,
    amount: Number(row.amount || 0),
    paymentMethod: row.payment_method,
    note: row.note,
    createdById: row.created_by,
    createdByName: row.created_by_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTrashedCustomerPayment(row) {
  return {
    ...mapCustomerPayment(row),
    deletedAt: row.deleted_at,
    deletedById: row.deleted_by_id,
    deletedByName: row.deleted_by_name || null,
    deleteReason: row.delete_reason || '',
  };
}

function buildFilters({ customerId, dateFrom, dateTo, tenantId }) {
  const params = [tenantId];
  const conditions = ["cp.tenant_id = $1", "cp.deleted_at IS NULL"];

  if (customerId) {
    params.push(customerId);
    conditions.push(`cp.customer_id = $${params.length}`);
  }

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`cp.payment_date >= $${params.length}::date`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`cp.payment_date <= $${params.length}::date`);
  }

  return { params, where: `WHERE ${conditions.join(" AND ")}` };
}

export async function countCustomerPayments(client, filters = {}) {
  const { params, where } = buildFilters(filters);
  const result = await client.query(`SELECT COUNT(*)::INTEGER AS count FROM customer_payments cp ${where}`, params);
  return result.rows[0].count;
}

export async function listCustomerPaymentsPage(client, { limit, offset, ...filters }) {
  const { params, where } = buildFilters(filters);
  params.push(limit, offset);
  const result = await client.query(
    `SELECT cp.*, c.name AS customer_name, u.name AS created_by_name
     FROM customer_payments cp
     LEFT JOIN retail_customers c ON c.id = cp.customer_id
     LEFT JOIN users u ON u.id = cp.created_by
     ${where}
     ORDER BY cp.payment_date DESC, cp.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapCustomerPayment);
}

export function findCustomerPaymentById(client, paymentId, tenantId) {
  return client.query(
    `SELECT cp.*, c.name AS customer_name, u.name AS created_by_name
     FROM customer_payments cp
     LEFT JOIN retail_customers c ON c.id = cp.customer_id
     LEFT JOIN users u ON u.id = cp.created_by
     WHERE cp.id = $1 AND cp.tenant_id = $2 AND cp.deleted_at IS NULL
     LIMIT 1`,
    [paymentId, tenantId],
  );
}

export function findCustomerPaymentForUpdate(client, paymentId, tenantId) {
  return client.query(
    `SELECT * FROM customer_payments WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL FOR UPDATE LIMIT 1`,
    [paymentId, tenantId],
  );
}

export function insertCustomerPayment(client, payment) {
  return client.query(
    `INSERT INTO customer_payments (id, tenant_id, customer_id, payment_date, amount, payment_method, note, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [payment.id, payment.tenantId, payment.customerId, payment.paymentDate, payment.amount, payment.paymentMethod, payment.note, payment.createdById],
  );
}

export function updateCustomerPayment(client, payment) {
  return client.query(
    `UPDATE customer_payments
     SET payment_date = $3, amount = $4, payment_method = $5, note = $6, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [payment.id, payment.tenantId, payment.paymentDate, payment.amount, payment.paymentMethod, payment.note],
  );
}

export function softDeleteCustomerPayment(client, paymentId, tenantId, { deletedById, deleteReason } = {}) {
  return client.query(
    `UPDATE customer_payments
     SET deleted_at = NOW(), deleted_by_id = $3, delete_reason = $4
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [paymentId, tenantId, deletedById || null, deleteReason || ""],
  );
}

export function restoreCustomerPayment(client, paymentId, tenantId) {
  return client.query(
    `UPDATE customer_payments
     SET deleted_at = NULL, deleted_by_id = NULL, delete_reason = ''
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL
     RETURNING *`,
    [paymentId, tenantId],
  );
}

export async function countTrashedCustomerPayments(client, tenantId) {
  const result = await client.query(
    "SELECT COUNT(*)::INTEGER AS count FROM customer_payments WHERE tenant_id = $1 AND deleted_at IS NOT NULL",
    [tenantId],
  );
  return result.rows[0].count;
}

export async function listTrashedCustomerPayments(client, { tenantId, limit, offset }) {
  const result = await client.query(
    `SELECT cp.*, c.name AS customer_name, u.name AS deleted_by_name
     FROM customer_payments cp
     LEFT JOIN retail_customers c ON c.id = cp.customer_id
     LEFT JOIN users u ON u.id = cp.deleted_by_id
     WHERE cp.tenant_id = $1 AND cp.deleted_at IS NOT NULL
     ORDER BY cp.deleted_at DESC
     LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );
  return result.rows.map(mapTrashedCustomerPayment);
}
