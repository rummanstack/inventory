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

function buildFilters({ search, status, assignedDsrId, tenantId }) {
  const params = [tenantId];
  const conditions = ["c.tenant_id = $1"];

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

export async function listCustomersPage(client, { limit, offset, ...filters }) {
  const { params, where } = buildFilters(filters);
  params.push(limit, offset);
  const result = await client.query(
    `SELECT c.*, d.name AS assigned_dsr_name
     FROM customers c
     LEFT JOIN dsrs d ON d.id = c.assigned_dsr_id
     ${where}
     ORDER BY c.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
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

export function deleteCustomer(client, customerId, tenantId) {
  return client.query("DELETE FROM customers WHERE id = $1 AND tenant_id = $2", [customerId, tenantId]);
}

export function findCustomerById(client, customerId, tenantId) {
  return client.query(
    `SELECT c.*, d.name AS assigned_dsr_name
     FROM customers c
     LEFT JOIN dsrs d ON d.id = c.assigned_dsr_id
     WHERE c.id = $1 AND c.tenant_id = $2
     LIMIT 1`,
    [customerId, tenantId],
  );
}
