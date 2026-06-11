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

export async function countDsrs(client, { search, tenantId } = {}) {
  const params = [tenantId];
  const conditions = ["tenant_id = $1"];

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
  const conditions = ["tenant_id = $1"];

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
    "SELECT id, name, area, phone, status, opening_due FROM dsrs WHERE tenant_id = $1 ORDER BY name ASC",
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

export function deleteDsr(client, dsrId, tenantId) {
  return client.query("DELETE FROM dsrs WHERE id = $1 AND tenant_id = $2", [dsrId, tenantId]);
}

export function findDsrById(client, dsrId, tenantId) {
  if (tenantId) {
    return client.query("SELECT * FROM dsrs WHERE id = $1 AND tenant_id = $2 LIMIT 1", [dsrId, tenantId]);
  }
  return client.query("SELECT * FROM dsrs WHERE id = $1 LIMIT 1", [dsrId]);
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
