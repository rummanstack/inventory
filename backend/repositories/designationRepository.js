export function mapDesignation(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    code: row.code || "",
    status: row.status,
    note: row.note || "",
    employeeCount: Number(row.employee_count || 0),
    createdBy: row.created_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || null,
  };
}

function buildDesignationFilters({ tenantId, status, search }) {
  const conditions = ["d.tenant_id = $1", "d.deleted_at IS NULL"];
  const values = [tenantId];
  let index = 2;

  if (status) {
    conditions.push(`d.status = $${index++}`);
    values.push(status);
  }

  if (search) {
    conditions.push(`(LOWER(d.name) LIKE $${index} OR LOWER(d.code) LIKE $${index})`);
    values.push(`%${String(search).trim().toLowerCase()}%`);
    index += 1;
  }

  return { conditions, values, nextIndex: index };
}

const DESIGNATION_SELECT = `
  SELECT d.*,
         COUNT(e.id) FILTER (WHERE e.deleted_at IS NULL) AS employee_count
  FROM designations d
  LEFT JOIN employees e ON e.designation_id = d.id AND e.tenant_id = d.tenant_id
`;

export async function countDesignations(client, filters) {
  const { conditions, values } = buildDesignationFilters(filters);
  const result = await client.query(
    `SELECT COUNT(*)::INTEGER AS count FROM designations d WHERE ${conditions.join(" AND ")}`,
    values,
  );
  return Number(result.rows[0]?.count || 0);
}

export async function listDesignationsPage(client, filters, limit, offset) {
  const { conditions, values, nextIndex } = buildDesignationFilters(filters);
  const result = await client.query(
    `${DESIGNATION_SELECT}
     WHERE ${conditions.join(" AND ")}
     GROUP BY d.id
     ORDER BY d.name ASC
     LIMIT $${nextIndex} OFFSET $${nextIndex + 1}`,
    [...values, limit, offset],
  );
  return result.rows.map(mapDesignation);
}

export async function listActiveDesignations(client, tenantId) {
  const result = await client.query(
    `${DESIGNATION_SELECT}
     WHERE d.tenant_id = $1 AND d.status = 'ACTIVE' AND d.deleted_at IS NULL
     GROUP BY d.id
     ORDER BY d.name ASC`,
    [tenantId],
  );
  return result.rows.map(mapDesignation);
}

export async function findDesignationById(client, id, tenantId) {
  const result = await client.query(
    `${DESIGNATION_SELECT}
     WHERE d.id = $1 AND d.tenant_id = $2
     GROUP BY d.id
     LIMIT 1`,
    [id, tenantId],
  );
  return result.rows[0] ? mapDesignation(result.rows[0]) : null;
}

export async function findDesignationByName(client, tenantId, name, excludeId = null) {
  const params = [tenantId, name];
  let excludeClause = "";
  if (excludeId) {
    params.push(excludeId);
    excludeClause = `AND id != $${params.length}`;
  }
  const result = await client.query(
    `SELECT * FROM designations
     WHERE tenant_id = $1 AND LOWER(name) = LOWER($2) AND deleted_at IS NULL ${excludeClause}
     LIMIT 1`,
    params,
  );
  return result.rows[0] ? mapDesignation(result.rows[0]) : null;
}

export async function insertDesignation(client, designation) {
  const result = await client.query(
    `INSERT INTO designations
      (id, tenant_id, name, code, status, note, created_by, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
     RETURNING *`,
    [
      designation.id,
      designation.tenantId,
      designation.name,
      designation.code || "",
      designation.status,
      designation.note || "",
      designation.createdBy || null,
    ],
  );
  return mapDesignation(result.rows[0]);
}

export async function updateDesignation(client, designation) {
  const result = await client.query(
    `UPDATE designations
     SET name = $3, code = $4, status = $5, note = $6, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [
      designation.id,
      designation.tenantId,
      designation.name,
      designation.code || "",
      designation.status,
      designation.note || "",
    ],
  );
  return result.rows[0] ? mapDesignation(result.rows[0]) : null;
}

export function softDeleteDesignation(client, id, tenantId, { deletedById, deleteReason } = {}) {
  return client.query(
    `UPDATE designations
     SET deleted_at = NOW(), deleted_by_id = $3, delete_reason = $4, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [id, tenantId, deletedById || null, deleteReason || ""],
  );
}
