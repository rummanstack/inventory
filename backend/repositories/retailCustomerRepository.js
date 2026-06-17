export function mapRetailCustomer(row) {
  return {
    id: row.id,
    organizationId: row.tenant_id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    note: row.note,
    status: row.status,
    createdById: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTrashedRetailCustomer(row) {
  return {
    ...mapRetailCustomer(row),
    deletedAt: row.deleted_at,
    deletedById: row.deleted_by_id,
    deletedByName: row.deleted_by_name || null,
    deleteReason: row.delete_reason || '',
  };
}

function buildFilters({ search, status, tenantId }) {
  const params = [tenantId];
  const conditions = ["tenant_id = $1", "deleted_at IS NULL"];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(name ILIKE $${params.length} OR phone ILIKE $${params.length})`);
  }

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  return { params, where: `WHERE ${conditions.join(" AND ")}` };
}

export async function countRetailCustomers(client, filters = {}) {
  const { params, where } = buildFilters(filters);
  const result = await client.query(`SELECT COUNT(*)::INTEGER AS count FROM retail_customers ${where}`, params);
  return result.rows[0].count;
}

export async function listRetailCustomersPage(client, { limit, offset, ...filters }) {
  const { params, where } = buildFilters(filters);
  params.push(limit, offset);
  const result = await client.query(
    `SELECT * FROM retail_customers ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapRetailCustomer);
}

export async function listAllActiveRetailCustomers(client, tenantId) {
  const result = await client.query(
    `SELECT * FROM retail_customers WHERE tenant_id = $1 AND deleted_at IS NULL AND status = 'ACTIVE' ORDER BY name ASC`,
    [tenantId],
  );
  return result.rows.map(mapRetailCustomer);
}

export function insertRetailCustomer(client, customer) {
  return client.query(
    `INSERT INTO retail_customers (id, tenant_id, name, phone, address, note, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [customer.id, customer.tenantId, customer.name, customer.phone, customer.address, customer.note, customer.status, customer.createdById],
  );
}

export function updateRetailCustomer(client, customer) {
  return client.query(
    `UPDATE retail_customers
     SET name = $3, phone = $4, address = $5, note = $6, status = $7, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [customer.id, customer.tenantId, customer.name, customer.phone, customer.address, customer.note, customer.status],
  );
}

export function softDeleteRetailCustomer(client, id, tenantId, { deletedById, deleteReason } = {}) {
  return client.query(
    `UPDATE retail_customers
     SET deleted_at = NOW(), deleted_by_id = $3, delete_reason = $4
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [id, tenantId, deletedById || null, deleteReason || ""],
  );
}

export function restoreRetailCustomer(client, id, tenantId) {
  return client.query(
    `UPDATE retail_customers
     SET deleted_at = NULL, deleted_by_id = NULL, delete_reason = ''
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL
     RETURNING *`,
    [id, tenantId],
  );
}

export function permanentlyDeleteRetailCustomer(client, id, tenantId) {
  return client.query(
    "DELETE FROM retail_customers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL",
    [id, tenantId],
  );
}

export async function countTrashedRetailCustomers(client, tenantId) {
  const result = await client.query(
    "SELECT COUNT(*)::INTEGER AS count FROM retail_customers WHERE tenant_id = $1 AND deleted_at IS NOT NULL",
    [tenantId],
  );
  return result.rows[0].count;
}

export async function listTrashedRetailCustomers(client, { tenantId, limit, offset }) {
  const result = await client.query(
    `SELECT rc.*, u.name AS deleted_by_name
     FROM retail_customers rc
     LEFT JOIN users u ON u.id = rc.deleted_by_id
     WHERE rc.tenant_id = $1 AND rc.deleted_at IS NOT NULL
     ORDER BY rc.deleted_at DESC
     LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );
  return result.rows.map(mapTrashedRetailCustomer);
}

export function findRetailCustomerById(client, id, tenantId) {
  return client.query(
    "SELECT * FROM retail_customers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL LIMIT 1",
    [id, tenantId],
  );
}
