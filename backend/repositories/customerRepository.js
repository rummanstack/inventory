export function mapCustomer(row) {
  return {
    id: row.id,
    organizationId: row.tenant_id,
    shopName: row.shop_name,
    ownerName: row.owner_name,
    phone: row.phone,
    address: row.address,
    market: row.market,
    assignedDsrId: row.assigned_dsr_id,
    assignedDsrName: row.assigned_dsr_name || null,
    openingDue: Number(row.opening_due || 0),
    currentDue: Number(row.current_due || 0),
    status: row.status,
    note: row.note,
    createdById: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTrashedCustomer(row) {
  return {
    ...mapCustomer(row),
    deletedAt: row.deleted_at,
    deletedById: row.deleted_by_id,
    deletedByName: row.deleted_by_name || null,
    deleteReason: row.delete_reason || '',
  };
}

function buildFilters({ search, status, assignedDsrId, tenantId }) {
  const params = [tenantId];
  const conditions = ["c.tenant_id = $1", "c.deleted_at IS NULL"];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(c.shop_name ILIKE $${params.length} OR c.owner_name ILIKE $${params.length} OR c.phone ILIKE $${params.length} OR c.market ILIKE $${params.length})`);
  }

  if (status) {
    params.push(status);
    conditions.push(`c.status = $${params.length}`);
  }

  if (assignedDsrId) {
    params.push(assignedDsrId);
    conditions.push(`c.assigned_dsr_id = $${params.length}`);
  }

  return { params, where: `WHERE ${conditions.join(" AND ")}` };
}

export async function countCustomers(client, filters = {}) {
  const { params, where } = buildFilters(filters);
  const result = await client.query(`SELECT COUNT(*)::INTEGER AS count FROM customers c ${where}`, params);
  return result.rows[0].count;
}

export async function countActiveShops(client, tenantId) {
  const result = await client.query(
    `SELECT COUNT(*)::INTEGER AS count FROM customers WHERE tenant_id = $1 AND deleted_at IS NULL AND status = 'ACTIVE'`,
    [tenantId],
  );
  return result.rows[0].count;
}

export async function listCustomersPage(client, { limit, offset, ...filters }) {
  const { params, where } = buildFilters(filters);
  params.push(limit, offset);
  const result = await client.query(
    `SELECT c.*, d.name AS assigned_dsr_name,
            COALESCE(latest_due.balance_after, c.opening_due) AS current_due
     FROM customers c
     LEFT JOIN dsrs d ON d.id = c.assigned_dsr_id
     LEFT JOIN LATERAL (
       SELECT balance_after FROM shop_due_ledger
       WHERE shop_id = c.id AND tenant_id = c.tenant_id
       ORDER BY created_at DESC, id DESC LIMIT 1
     ) latest_due ON true
     ${where}
     ORDER BY c.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapCustomer);
}

export async function listAllActiveCustomers(client, tenantId) {
  const result = await client.query(
    `SELECT * FROM customers WHERE tenant_id = $1 AND deleted_at IS NULL AND status = 'ACTIVE' ORDER BY shop_name ASC`,
    [tenantId],
  );
  return result.rows.map(mapCustomer);
}

export function insertCustomer(client, customer) {
  return client.query(
    `INSERT INTO customers (id, tenant_id, shop_name, owner_name, phone, address, market, assigned_dsr_id, opening_due, current_due, status, note, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      customer.id,
      customer.tenantId,
      customer.shopName,
      customer.ownerName,
      customer.phone,
      customer.address,
      customer.market,
      customer.assignedDsrId,
      customer.openingDue,
      customer.currentDue,
      customer.status,
      customer.note,
      customer.createdById,
    ],
  );
}

export function updateCustomer(client, customer) {
  return client.query(
    `UPDATE customers
     SET shop_name = $3, owner_name = $4, phone = $5, address = $6, market = $7, assigned_dsr_id = $8,
         opening_due = $9, current_due = $10, status = $11, note = $12, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [
      customer.id,
      customer.tenantId,
      customer.shopName,
      customer.ownerName,
      customer.phone,
      customer.address,
      customer.market,
      customer.assignedDsrId,
      customer.openingDue,
      customer.currentDue,
      customer.status,
      customer.note,
    ],
  );
}

export function updateCustomerCurrentDue(client, customerId, tenantId, currentDue) {
  return client.query(
    `UPDATE customers SET current_due = $3, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *`,
    [customerId, tenantId, currentDue],
  );
}

export function softDeleteCustomer(client, customerId, tenantId, { deletedById, deleteReason } = {}) {
  return client.query(
    `UPDATE customers
     SET deleted_at = NOW(), deleted_by_id = $3, delete_reason = $4
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [customerId, tenantId, deletedById || null, deleteReason || ""],
  );
}

export function restoreCustomer(client, customerId, tenantId) {
  return client.query(
    `UPDATE customers
     SET deleted_at = NULL, deleted_by_id = NULL, delete_reason = ''
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL
     RETURNING *`,
    [customerId, tenantId],
  );
}

export function permanentlyDeleteCustomer(client, customerId, tenantId) {
  return client.query(
    "DELETE FROM customers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL",
    [customerId, tenantId],
  );
}

export async function countTrashedCustomers(client, tenantId) {
  const result = await client.query(
    "SELECT COUNT(*)::INTEGER AS count FROM customers WHERE tenant_id = $1 AND deleted_at IS NOT NULL",
    [tenantId],
  );
  return result.rows[0].count;
}

export async function listTrashedCustomers(client, { tenantId, limit, offset }) {
  const result = await client.query(
    `SELECT c.*, d.name AS assigned_dsr_name, u.name AS deleted_by_name
     FROM customers c
     LEFT JOIN dsrs d ON d.id = c.assigned_dsr_id
     LEFT JOIN users u ON u.id = c.deleted_by_id
     WHERE c.tenant_id = $1 AND c.deleted_at IS NOT NULL
     ORDER BY c.deleted_at DESC
     LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );
  return result.rows.map(mapTrashedCustomer);
}

export function findCustomerById(client, customerId, tenantId) {
  return client.query(
    `SELECT c.*, d.name AS assigned_dsr_name
     FROM customers c
     LEFT JOIN dsrs d ON d.id = c.assigned_dsr_id
     WHERE c.id = $1 AND c.tenant_id = $2 AND c.deleted_at IS NULL
     LIMIT 1`,
    [customerId, tenantId],
  );
}
