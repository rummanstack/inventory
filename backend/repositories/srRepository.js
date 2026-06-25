export function mapSr(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    status: row.status,
    openingDue: Number(row.opening_due || 0),
    currentDue: row.current_due != null ? Number(row.current_due) : Number(row.opening_due || 0),
  };
}

function mapTrashedSr(row) {
  return {
    ...mapSr(row),
    deletedAt: row.deleted_at,
    deletedById: row.deleted_by_id,
    deletedByName: row.deleted_by_name || null,
    deleteReason: row.delete_reason || '',
  };
}

export async function countSrs(client, { search, tenantId } = {}) {
  const params = [tenantId];
  const conditions = ["tenant_id = $1", "deleted_at IS NULL"];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(name ILIKE $${params.length} OR phone ILIKE $${params.length})`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const result = await client.query(`SELECT COUNT(*)::INTEGER AS count FROM srs ${where}`, params);
  return result.rows[0].count;
}

export async function listSrsPage(client, { search, tenantId, limit, offset }) {
  const params = [tenantId];
  const conditions = ["s.tenant_id = $1", "s.deleted_at IS NULL"];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(s.name ILIKE $${params.length} OR s.phone ILIKE $${params.length})`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  params.push(limit, offset);
  const result = await client.query(
    `SELECT s.*, COALESCE(latest_due.balance_after, s.opening_due) AS current_due
     FROM srs s
     LEFT JOIN LATERAL (
       SELECT balance_after FROM sr_due_ledger
       WHERE sr_id = s.id AND tenant_id = s.tenant_id
       ORDER BY created_at DESC, id DESC LIMIT 1
     ) latest_due ON true
     ${where}
     ORDER BY s.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapSr);
}

export async function listAllActiveSrsLite(client, tenantId) {
  const result = await client.query(
    "SELECT id, name, phone, status, opening_due FROM srs WHERE tenant_id = $1 AND deleted_at IS NULL AND status = 'Active' ORDER BY name ASC",
    [tenantId],
  );
  return result.rows.map(mapSr);
}

export function insertSr(client, sr) {
  return client.query(
    `INSERT INTO srs (id, tenant_id, name, phone, status, opening_due)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [sr.id, sr.tenantId, sr.name, sr.phone, sr.status, sr.openingDue],
  );
}

export function updateSr(client, sr) {
  return client.query(
    `UPDATE srs
     SET name = $3, phone = $4, status = $5, opening_due = $6
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [sr.id, sr.tenantId, sr.name, sr.phone, sr.status, sr.openingDue],
  );
}

export function softDeleteSr(client, srId, tenantId, { deletedById, deleteReason } = {}) {
  return client.query(
    `UPDATE srs
     SET deleted_at = NOW(), deleted_by_id = $3, delete_reason = $4
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [srId, tenantId, deletedById || null, deleteReason || ""],
  );
}

export function restoreSr(client, srId, tenantId) {
  return client.query(
    `UPDATE srs
     SET deleted_at = NULL, deleted_by_id = NULL, delete_reason = ''
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL
     RETURNING *`,
    [srId, tenantId],
  );
}

export function permanentlyDeleteSr(client, srId, tenantId) {
  return client.query(
    "DELETE FROM srs WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL",
    [srId, tenantId],
  );
}

export async function countTrashedSrs(client, tenantId) {
  const result = await client.query(
    "SELECT COUNT(*)::INTEGER AS count FROM srs WHERE tenant_id = $1 AND deleted_at IS NOT NULL",
    [tenantId],
  );
  return result.rows[0].count;
}

export async function listTrashedSrs(client, { tenantId, limit, offset }) {
  const result = await client.query(
    `SELECT s.*, u.name AS deleted_by_name
     FROM srs s
     LEFT JOIN users u ON u.id = s.deleted_by_id
     WHERE s.tenant_id = $1 AND s.deleted_at IS NOT NULL
     ORDER BY s.deleted_at DESC
     LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );
  return result.rows.map(mapTrashedSr);
}

export function findSrById(client, srId, tenantId) {
  return client.query("SELECT * FROM srs WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL LIMIT 1", [srId, tenantId]);
}

export function findSrForUpdate(client, srId, tenantId) {
  return client.query(
    "SELECT * FROM srs WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL FOR UPDATE LIMIT 1",
    [srId, tenantId],
  );
}
