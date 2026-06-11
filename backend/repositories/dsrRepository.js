export function mapDsr(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    area: row.area,
    status: row.status,
    openingDue: Number(row.opening_due || 0),
  };
}

function mapTrashedDsr(row) {
  return {
    ...mapDsr(row),
    deletedAt: row.deleted_at,
    deletedById: row.deleted_by_id,
    deletedByName: row.deleted_by_name || null,
    deleteReason: row.delete_reason || '',
  };
}

export async function countDsrs(client, { search, tenantId } = {}) {
  const params = [tenantId];
  const conditions = ["tenant_id = $1", "deleted_at IS NULL"];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(name ILIKE $${params.length} OR area ILIKE $${params.length} OR phone ILIKE $${params.length})`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const result = await client.query(`SELECT COUNT(*)::INTEGER AS count FROM dsrs ${where}`, params);
  return result.rows[0].count;
}

export async function listDsrsPage(client, { search, tenantId, limit, offset }) {
  const params = [tenantId];
  const conditions = ["tenant_id = $1", "deleted_at IS NULL"];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(name ILIKE $${params.length} OR area ILIKE $${params.length} OR phone ILIKE $${params.length})`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  params.push(limit, offset);
  const result = await client.query(
    `SELECT * FROM dsrs ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapDsr);
}

export async function listAllActiveDsrsLite(client, tenantId) {
  const result = await client.query(
    "SELECT id, name, area, phone, status, opening_due FROM dsrs WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY name ASC",
    [tenantId],
  );
  return result.rows.map(mapDsr);
}

export function insertDsr(client, dsr) {
  return client.query(
    `INSERT INTO dsrs (id, tenant_id, name, phone, area, status, opening_due)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [dsr.id, dsr.tenantId, dsr.name, dsr.phone, dsr.area, dsr.status, dsr.openingDue],
  );
}

export function updateDsr(client, dsr) {
  return client.query(
    `UPDATE dsrs
     SET name = $3, phone = $4, area = $5, status = $6, opening_due = $7
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [dsr.id, dsr.tenantId, dsr.name, dsr.phone, dsr.area, dsr.status, dsr.openingDue],
  );
}

export function softDeleteDsr(client, dsrId, tenantId, { deletedById, deleteReason } = {}) {
  return client.query(
    `UPDATE dsrs
     SET deleted_at = NOW(), deleted_by_id = $3, delete_reason = $4
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [dsrId, tenantId, deletedById || null, deleteReason || ""],
  );
}

export function restoreDsr(client, dsrId, tenantId) {
  return client.query(
    `UPDATE dsrs
     SET deleted_at = NULL, deleted_by_id = NULL, delete_reason = ''
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL
     RETURNING *`,
    [dsrId, tenantId],
  );
}

export function permanentlyDeleteDsr(client, dsrId, tenantId) {
  return client.query(
    "DELETE FROM dsrs WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL",
    [dsrId, tenantId],
  );
}

export async function countTrashedDsrs(client, tenantId) {
  const result = await client.query(
    "SELECT COUNT(*)::INTEGER AS count FROM dsrs WHERE tenant_id = $1 AND deleted_at IS NOT NULL",
    [tenantId],
  );
  return result.rows[0].count;
}

export async function listTrashedDsrs(client, { tenantId, limit, offset }) {
  const result = await client.query(
    `SELECT d.*, u.name AS deleted_by_name
     FROM dsrs d
     LEFT JOIN users u ON u.id = d.deleted_by_id
     WHERE d.tenant_id = $1 AND d.deleted_at IS NOT NULL
     ORDER BY d.deleted_at DESC
     LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );
  return result.rows.map(mapTrashedDsr);
}

export function findDsrById(client, dsrId, tenantId) {
  if (tenantId) {
    return client.query("SELECT * FROM dsrs WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL LIMIT 1", [dsrId, tenantId]);
  }
  return client.query("SELECT * FROM dsrs WHERE id = $1 AND deleted_at IS NULL LIMIT 1", [dsrId]);
}

export function syncDsrHistory(client, dsr) {
  return Promise.all([
    client.query(
      `UPDATE issues
       SET dsr_name = $3, phone = $4, area = $5
       WHERE dsr_id = $1 AND tenant_id = $2`,
      [dsr.id, dsr.tenantId, dsr.name, dsr.phone, dsr.area],
    ),
    client.query(
      `UPDATE settlements
       SET dsr_name = $3, phone = $4, area = $5
       WHERE dsr_id = $1 AND tenant_id = $2`,
      [dsr.id, dsr.tenantId, dsr.name, dsr.phone, dsr.area],
    ),
  ]);
}
