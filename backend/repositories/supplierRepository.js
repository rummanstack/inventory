export function mapSupplier(row) {
  return {
    id: row.id,
    organizationId: row.tenant_id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    openingDue: Number(row.opening_due || 0),
    currentDue: Number(row.current_due || 0),
    status: row.status,
    note: row.note,
    createdById: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTrashedSupplier(row) {
  return {
    ...mapSupplier(row),
    deletedAt: row.deleted_at,
    deletedById: row.deleted_by_id,
    deletedByName: row.deleted_by_name || null,
    deleteReason: row.delete_reason || '',
  };
}

function buildFilters({ search, status, tenantId }) {
  const params = [tenantId];
  const conditions = ["s.tenant_id = $1", "s.deleted_at IS NULL"];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(s.name ILIKE $${params.length} OR s.phone ILIKE $${params.length} OR s.address ILIKE $${params.length})`);
  }

  if (status) {
    params.push(status);
    conditions.push(`s.status = $${params.length}`);
  }

  return { params, where: `WHERE ${conditions.join(" AND ")}` };
}

export async function countSuppliers(client, filters = {}) {
  const { params, where } = buildFilters(filters);
  const result = await client.query(`SELECT COUNT(*)::INTEGER AS count FROM suppliers s ${where}`, params);
  return result.rows[0].count;
}

export async function listSuppliersPage(client, { limit, offset, ...filters }) {
  const { params, where } = buildFilters(filters);
  params.push(limit, offset);
  const result = await client.query(
    `SELECT s.* FROM suppliers s
     ${where}
     ORDER BY s.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapSupplier);
}

export async function listAllActiveSuppliers(client, tenantId) {
  const result = await client.query(
    `SELECT * FROM suppliers WHERE tenant_id = $1 AND deleted_at IS NULL AND status = 'ACTIVE' ORDER BY name ASC`,
    [tenantId],
  );
  return result.rows.map(mapSupplier);
}

export function insertSupplier(client, supplier) {
  return client.query(
    `INSERT INTO suppliers (id, tenant_id, name, phone, address, opening_due, current_due, status, note, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      supplier.id,
      supplier.tenantId,
      supplier.name,
      supplier.phone,
      supplier.address,
      supplier.openingDue,
      supplier.currentDue,
      supplier.status,
      supplier.note,
      supplier.createdById,
    ],
  );
}

export function updateSupplier(client, supplier) {
  return client.query(
    `UPDATE suppliers
     SET name = $3, phone = $4, address = $5, opening_due = $6, current_due = $7, status = $8, note = $9, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [
      supplier.id,
      supplier.tenantId,
      supplier.name,
      supplier.phone,
      supplier.address,
      supplier.openingDue,
      supplier.currentDue,
      supplier.status,
      supplier.note,
    ],
  );
}

export function updateSupplierCurrentDue(client, supplierId, tenantId, currentDue) {
  return client.query(
    `UPDATE suppliers SET current_due = $3, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *`,
    [supplierId, tenantId, currentDue],
  );
}

export function softDeleteSupplier(client, supplierId, tenantId, { deletedById, deleteReason } = {}) {
  return client.query(
    `UPDATE suppliers
     SET deleted_at = NOW(), deleted_by_id = $3, delete_reason = $4
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [supplierId, tenantId, deletedById || null, deleteReason || ""],
  );
}

export function restoreSupplier(client, supplierId, tenantId) {
  return client.query(
    `UPDATE suppliers
     SET deleted_at = NULL, deleted_by_id = NULL, delete_reason = ''
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL
     RETURNING *`,
    [supplierId, tenantId],
  );
}

export function permanentlyDeleteSupplier(client, supplierId, tenantId) {
  return client.query(
    "DELETE FROM suppliers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL",
    [supplierId, tenantId],
  );
}

export async function countTrashedSuppliers(client, tenantId) {
  const result = await client.query(
    "SELECT COUNT(*)::INTEGER AS count FROM suppliers WHERE tenant_id = $1 AND deleted_at IS NOT NULL",
    [tenantId],
  );
  return result.rows[0].count;
}

export async function listTrashedSuppliers(client, { tenantId, limit, offset }) {
  const result = await client.query(
    `SELECT s.*, u.name AS deleted_by_name
     FROM suppliers s
     LEFT JOIN users u ON u.id = s.deleted_by_id
     WHERE s.tenant_id = $1 AND s.deleted_at IS NOT NULL
     ORDER BY s.deleted_at DESC
     LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );
  return result.rows.map(mapTrashedSupplier);
}

export function findSupplierById(client, supplierId, tenantId) {
  return client.query(
    `SELECT * FROM suppliers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL LIMIT 1`,
    [supplierId, tenantId],
  );
}

export function findSupplierForUpdate(client, supplierId, tenantId) {
  return client.query(
    `SELECT * FROM suppliers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL FOR UPDATE LIMIT 1`,
    [supplierId, tenantId],
  );
}
