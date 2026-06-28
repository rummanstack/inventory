export function mapSupplierPayment(row) {
  return {
    id: row.id,
    organizationId: row.tenant_id,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name || null,
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

function mapTrashedSupplierPayment(row) {
  return {
    ...mapSupplierPayment(row),
    deletedAt: row.deleted_at,
    deletedById: row.deleted_by_id,
    deletedByName: row.deleted_by_name || null,
    deleteReason: row.delete_reason || '',
  };
}

function buildFilters({ supplierId, dateFrom, dateTo, tenantId }) {
  const params = [tenantId];
  const conditions = ["sp.tenant_id = $1", "sp.deleted_at IS NULL"];

  if (supplierId) {
    params.push(supplierId);
    conditions.push(`sp.supplier_id = $${params.length}`);
  }

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`sp.payment_date >= $${params.length}::date`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`sp.payment_date <= $${params.length}::date`);
  }

  return { params, where: `WHERE ${conditions.join(" AND ")}` };
}

export async function countSupplierPayments(client, filters = {}) {
  const { params, where } = buildFilters(filters);
  const result = await client.query(`SELECT COUNT(*)::INTEGER AS count FROM supplier_payments sp ${where}`, params);
  return result.rows[0].count;
}

export async function listSupplierPaymentsPage(client, { limit, offset, ...filters }) {
  const { params, where } = buildFilters(filters);
  params.push(limit, offset);
  const result = await client.query(
    `SELECT sp.*, s.name AS supplier_name, u.name AS created_by_name
     FROM supplier_payments sp
     LEFT JOIN suppliers s ON s.id = sp.supplier_id
     LEFT JOIN users u ON u.id = sp.created_by
     ${where}
     ORDER BY sp.payment_date DESC, sp.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapSupplierPayment);
}

export function findSupplierPaymentById(client, paymentId, tenantId) {
  return client.query(
    `SELECT sp.*, s.name AS supplier_name, u.name AS created_by_name
     FROM supplier_payments sp
     LEFT JOIN suppliers s ON s.id = sp.supplier_id
     LEFT JOIN users u ON u.id = sp.created_by
     WHERE sp.id = $1 AND sp.tenant_id = $2 AND sp.deleted_at IS NULL
     LIMIT 1`,
    [paymentId, tenantId],
  );
}

export function findSupplierPaymentForUpdate(client, paymentId, tenantId) {
  return client.query(
    `SELECT * FROM supplier_payments WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL FOR UPDATE LIMIT 1`,
    [paymentId, tenantId],
  );
}

export function insertSupplierPayment(client, payment) {
  return client.query(
    `INSERT INTO supplier_payments (id, tenant_id, supplier_id, payment_date, amount, payment_method, note, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [payment.id, payment.tenantId, payment.supplierId, payment.paymentDate, payment.amount, payment.paymentMethod, payment.note, payment.createdById],
  );
}

export function updateSupplierPayment(client, payment) {
  return client.query(
    `UPDATE supplier_payments
     SET payment_date = $3, amount = $4, payment_method = $5, note = $6, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [payment.id, payment.tenantId, payment.paymentDate, payment.amount, payment.paymentMethod, payment.note],
  );
}

export function softDeleteSupplierPayment(client, paymentId, tenantId, { deletedById, deleteReason } = {}) {
  return client.query(
    `UPDATE supplier_payments
     SET deleted_at = NOW(), deleted_by_id = $3, delete_reason = $4
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [paymentId, tenantId, deletedById || null, deleteReason || ""],
  );
}

export function restoreSupplierPayment(client, paymentId, tenantId) {
  return client.query(
    `UPDATE supplier_payments
     SET deleted_at = NULL, deleted_by_id = NULL, delete_reason = ''
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL
     RETURNING *`,
    [paymentId, tenantId],
  );
}

export async function getSupplierPaymentReport(client, { tenantId, dateFrom, dateTo, supplierId }) {
  const params = [tenantId];
  const conditions = ["sp.tenant_id = $1", "sp.deleted_at IS NULL"];
  if (supplierId) { params.push(supplierId); conditions.push(`sp.supplier_id = $${params.length}`); }
  if (dateFrom) { params.push(dateFrom); conditions.push(`sp.payment_date >= $${params.length}::date`); }
  if (dateTo) { params.push(dateTo); conditions.push(`sp.payment_date <= $${params.length}::date`); }
  const result = await client.query(
    `SELECT sp.payment_date AS date,
            COUNT(*)::INTEGER AS payment_count,
            COALESCE(SUM(sp.amount), 0)::NUMERIC AS total_amount
     FROM supplier_payments sp
     WHERE ${conditions.join(" AND ")}
     GROUP BY sp.payment_date
     ORDER BY sp.payment_date DESC`,
    params,
  );
  return result.rows.map((r) => ({
    date: r.date,
    paymentCount: Number(r.payment_count),
    totalAmount: Number(r.total_amount),
  }));
}

export async function countTrashedSupplierPayments(client, tenantId) {
  const result = await client.query(
    "SELECT COUNT(*)::INTEGER AS count FROM supplier_payments WHERE tenant_id = $1 AND deleted_at IS NOT NULL",
    [tenantId],
  );
  return result.rows[0].count;
}

export async function listTrashedSupplierPayments(client, { tenantId, limit, offset }) {
  const result = await client.query(
    `SELECT sp.*, s.name AS supplier_name, u.name AS deleted_by_name
     FROM supplier_payments sp
     LEFT JOIN suppliers s ON s.id = sp.supplier_id
     LEFT JOIN users u ON u.id = sp.deleted_by_id
     WHERE sp.tenant_id = $1 AND sp.deleted_at IS NOT NULL
     ORDER BY sp.deleted_at DESC
     LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );
  return result.rows.map(mapTrashedSupplierPayment);
}
