export function mapEmployee(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    employeeNumber: row.employee_number,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    department: row.department,
    designation: row.designation,
    joinDate: row.join_date ? String(row.join_date).slice(0, 10) : null,
    status: row.status,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function insertEmployee(client, emp) {
  await client.query(
    `INSERT INTO employees
      (id, tenant_id, employee_number, name, phone, email, address, department, designation,
       join_date, status, note, created_by, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())`,
    [
      emp.id, emp.tenantId, emp.employeeNumber, emp.name, emp.phone, emp.email,
      emp.address, emp.department, emp.designation, emp.joinDate, emp.status,
      emp.note, emp.createdBy,
    ],
  );
}

export async function updateEmployee(client, emp) {
  await client.query(
    `UPDATE employees SET
      name=$3, phone=$4, email=$5, address=$6, department=$7, designation=$8,
      join_date=$9, status=$10, note=$11, updated_at=NOW()
     WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL`,
    [
      emp.id, emp.tenantId, emp.name, emp.phone, emp.email, emp.address,
      emp.department, emp.designation, emp.joinDate, emp.status, emp.note,
    ],
  );
}

export async function findEmployeeById(client, id, tenantId) {
  const result = await client.query(
    `SELECT * FROM employees WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
    [id, tenantId],
  );
  return result.rows[0] ? mapEmployee(result.rows[0]) : null;
}

export function buildEmployeeFilters(params) {
  const conditions = ["tenant_id=$1", "deleted_at IS NULL"];
  const values = [params.tenantId];
  let i = 2;

  if (params.status) {
    conditions.push(`status=$${i++}`);
    values.push(params.status);
  }
  if (params.department) {
    conditions.push(`department=$${i++}`);
    values.push(params.department);
  }
  if (params.search) {
    conditions.push(`(LOWER(name) LIKE $${i} OR LOWER(employee_number) LIKE $${i} OR phone LIKE $${i})`);
    values.push(`%${params.search.toLowerCase()}%`);
    i++;
  }
  return { conditions, values, nextIndex: i };
}

export async function countEmployees(client, params) {
  const { conditions, values } = buildEmployeeFilters(params);
  const result = await client.query(
    `SELECT COUNT(*) FROM employees WHERE ${conditions.join(" AND ")}`,
    values,
  );
  return Number(result.rows[0].count);
}

export async function listEmployeesPage(client, params, limit, offset) {
  const { conditions, values, nextIndex } = buildEmployeeFilters(params);
  const result = await client.query(
    `SELECT * FROM employees WHERE ${conditions.join(" AND ")}
     ORDER BY created_at DESC LIMIT $${nextIndex} OFFSET $${nextIndex + 1}`,
    [...values, limit, offset],
  );
  return result.rows.map(mapEmployee);
}

export async function listAllActiveEmployees(client, tenantId) {
  const result = await client.query(
    `SELECT * FROM employees WHERE tenant_id=$1 AND status='ACTIVE' AND deleted_at IS NULL ORDER BY name ASC`,
    [tenantId],
  );
  return result.rows.map(mapEmployee);
}

export async function softDeleteEmployee(client, id, tenantId, deletedById, reason) {
  await client.query(
    `UPDATE employees SET deleted_at=NOW(), deleted_by_id=$3, delete_reason=$4, updated_at=NOW()
     WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL`,
    [id, tenantId, deletedById, reason],
  );
}

export async function restoreEmployee(client, id, tenantId) {
  await client.query(
    `UPDATE employees SET deleted_at=NULL, deleted_by_id=NULL, delete_reason='', updated_at=NOW()
     WHERE id=$1 AND tenant_id=$2`,
    [id, tenantId],
  );
}
