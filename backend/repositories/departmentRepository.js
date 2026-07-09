export function mapDepartment(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    code: row.code || "",
    status: row.status,
    headEmployeeId: row.head_employee_id || null,
    headEmployeeName: row.head_employee_name || null,
    note: row.note || "",
    employeeCount: Number(row.employee_count || 0),
    createdBy: row.created_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || null,
  };
}

function buildDepartmentFilters({ tenantId, status, search }) {
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

const DEPARTMENT_SELECT = `
  SELECT d.*,
         head.name AS head_employee_name,
         COUNT(e.id) FILTER (WHERE e.deleted_at IS NULL) AS employee_count
  FROM departments d
  LEFT JOIN employees head ON head.id = d.head_employee_id AND head.tenant_id = d.tenant_id
  LEFT JOIN employees e ON e.department_id = d.id AND e.tenant_id = d.tenant_id
`;

export async function countDepartments(client, filters) {
  const { conditions, values } = buildDepartmentFilters(filters);
  const result = await client.query(
    `SELECT COUNT(*)::INTEGER AS count FROM departments d WHERE ${conditions.join(" AND ")}`,
    values,
  );
  return Number(result.rows[0]?.count || 0);
}

export async function listDepartmentsPage(client, filters, limit, offset) {
  const { conditions, values, nextIndex } = buildDepartmentFilters(filters);
  const result = await client.query(
    `${DEPARTMENT_SELECT}
     WHERE ${conditions.join(" AND ")}
     GROUP BY d.id, head.name
     ORDER BY d.name ASC
     LIMIT $${nextIndex} OFFSET $${nextIndex + 1}`,
    [...values, limit, offset],
  );
  return result.rows.map(mapDepartment);
}

export async function listActiveDepartments(client, tenantId) {
  const result = await client.query(
    `${DEPARTMENT_SELECT}
     WHERE d.tenant_id = $1 AND d.status = 'ACTIVE' AND d.deleted_at IS NULL
     GROUP BY d.id, head.name
     ORDER BY d.name ASC`,
    [tenantId],
  );
  return result.rows.map(mapDepartment);
}

export async function findDepartmentById(client, id, tenantId) {
  const result = await client.query(
    `${DEPARTMENT_SELECT}
     WHERE d.id = $1 AND d.tenant_id = $2
     GROUP BY d.id, head.name
     LIMIT 1`,
    [id, tenantId],
  );
  return result.rows[0] ? mapDepartment(result.rows[0]) : null;
}

export async function findDepartmentByName(client, tenantId, name, excludeId = null) {
  const params = [tenantId, name];
  let excludeClause = "";
  if (excludeId) {
    params.push(excludeId);
    excludeClause = `AND id != $${params.length}`;
  }
  const result = await client.query(
    `SELECT * FROM departments
     WHERE tenant_id = $1 AND LOWER(name) = LOWER($2) AND deleted_at IS NULL ${excludeClause}
     LIMIT 1`,
    params,
  );
  return result.rows[0] ? mapDepartment(result.rows[0]) : null;
}

export async function insertDepartment(client, department) {
  const result = await client.query(
    `INSERT INTO departments
      (id, tenant_id, name, code, status, head_employee_id, note, created_by, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
     RETURNING *`,
    [
      department.id,
      department.tenantId,
      department.name,
      department.code || "",
      department.status,
      department.headEmployeeId || null,
      department.note || "",
      department.createdBy || null,
    ],
  );
  return mapDepartment(result.rows[0]);
}

export async function updateDepartment(client, department) {
  const result = await client.query(
    `UPDATE departments
     SET name = $3, code = $4, status = $5, head_employee_id = $6, note = $7, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [
      department.id,
      department.tenantId,
      department.name,
      department.code || "",
      department.status,
      department.headEmployeeId || null,
      department.note || "",
    ],
  );
  return result.rows[0] ? mapDepartment(result.rows[0]) : null;
}

export function softDeleteDepartment(client, id, tenantId, { deletedById, deleteReason } = {}) {
  return client.query(
    `UPDATE departments
     SET deleted_at = NOW(), deleted_by_id = $3, delete_reason = $4, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [id, tenantId, deletedById || null, deleteReason || ""],
  );
}
