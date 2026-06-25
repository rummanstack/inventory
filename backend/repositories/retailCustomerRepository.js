export function mapRetailCustomer(row) {
  return {
    id: row.id,
    organizationId: row.tenant_id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    note: row.note,
    status: row.status,
    openingDue: Number(row.opening_due || 0),
    currentDue: row.current_due != null ? Number(row.current_due) : Number(row.opening_due || 0),
    loyaltyPointsBalance: Number(row.loyalty_points_balance || 0),
    purchaseCount: Number(row.purchase_count || 0),
    firstPurchaseAt: row.first_purchase_at || null,
    lastPurchaseAt: row.last_purchase_at || null,
    totalSpent: Number(row.total_spent || 0),
    totalPaid: Number(row.total_paid || 0),
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

function buildFilters({ search, status, tenantId }, tableAlias = '') {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  const params = [tenantId];
  const conditions = [`${prefix}tenant_id = $1`, `${prefix}deleted_at IS NULL`];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(${prefix}name ILIKE $${params.length} OR ${prefix}phone ILIKE $${params.length})`);
  }

  if (status) {
    params.push(status);
    conditions.push(`${prefix}status = $${params.length}`);
  }

  return { params, where: `WHERE ${conditions.join(" AND ")}` };
}

export async function countRetailCustomers(client, filters = {}) {
  const { params, where } = buildFilters(filters);
  const result = await client.query(`SELECT COUNT(*)::INTEGER AS count FROM retail_customers ${where}`, params);
  return result.rows[0].count;
}

export async function listRetailCustomersPage(client, { limit, offset, ...filters }) {
  const { params, where } = buildFilters(filters, 'rc');
  params.push(limit, offset);
  const result = await client.query(
    `SELECT rc.*, stats.purchase_count, stats.first_purchase_at, stats.last_purchase_at, stats.total_spent, stats.total_paid,
            COALESCE(latest_due.balance_after, rc.opening_due) AS current_due
     FROM retail_customers rc
     LEFT JOIN (
       SELECT customer_id,
              COUNT(*)::INTEGER AS purchase_count,
              MIN(invoice_date) AS first_purchase_at,
              MAX(invoice_date) AS last_purchase_at,
              COALESCE(SUM(total_amount), 0) AS total_spent,
              COALESCE(SUM(paid_amount), 0) AS total_paid
       FROM sales_invoices
       WHERE tenant_id = $1 AND deleted_at IS NULL AND customer_id IS NOT NULL
       GROUP BY customer_id
     ) stats ON stats.customer_id = rc.id
     LEFT JOIN LATERAL (
       SELECT balance_after FROM customer_due_ledger
       WHERE customer_id = rc.id AND tenant_id = rc.tenant_id
       ORDER BY created_at DESC, id DESC LIMIT 1
     ) latest_due ON true
     ${where}
     ORDER BY rc.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapRetailCustomer);
}

export async function listAllActiveRetailCustomers(client, tenantId) {
  const result = await client.query(
    `SELECT rc.*, stats.purchase_count, stats.first_purchase_at, stats.last_purchase_at, stats.total_spent, stats.total_paid
     FROM retail_customers rc
     LEFT JOIN (
       SELECT customer_id,
              COUNT(*)::INTEGER AS purchase_count,
              MIN(invoice_date) AS first_purchase_at,
              MAX(invoice_date) AS last_purchase_at,
              COALESCE(SUM(total_amount), 0) AS total_spent,
              COALESCE(SUM(paid_amount), 0) AS total_paid
       FROM sales_invoices
       WHERE tenant_id = $1 AND deleted_at IS NULL AND customer_id IS NOT NULL
       GROUP BY customer_id
     ) stats ON stats.customer_id = rc.id
     WHERE rc.tenant_id = $1 AND rc.deleted_at IS NULL AND rc.status = 'ACTIVE'
     ORDER BY rc.name ASC`,
    [tenantId],
  );
  return result.rows.map(mapRetailCustomer);
}

export function insertRetailCustomer(client, customer) {
  return client.query(
    `INSERT INTO retail_customers (id, tenant_id, name, phone, address, note, status, loyalty_points_balance, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [customer.id, customer.tenantId, customer.name, customer.phone, customer.address, customer.note, customer.status, customer.loyaltyPointsBalance ?? 0, customer.createdById],
  );
}

export function updateRetailCustomer(client, customer) {
  return client.query(
    `UPDATE retail_customers
     SET name = $3, phone = $4, address = $5, note = $6, status = $7, loyalty_points_balance = $8, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [customer.id, customer.tenantId, customer.name, customer.phone, customer.address, customer.note, customer.status, customer.loyaltyPointsBalance ?? 0],
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

export function findRetailCustomerForUpdate(client, id, tenantId) {
  return client.query(
    "SELECT * FROM retail_customers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL FOR UPDATE LIMIT 1",
    [id, tenantId],
  );
}

export function updateRetailCustomerCurrentDue(client, id, tenantId, currentDue) {
  return client.query(
    "UPDATE retail_customers SET current_due = $3, updated_at = NOW() WHERE id = $1 AND tenant_id = $2",
    [id, tenantId, currentDue],
  );
}

export function updateRetailCustomerLoyaltyBalance(client, id, tenantId, loyaltyPointsBalance) {
  return client.query(
    "UPDATE retail_customers SET loyalty_points_balance = $3, updated_at = NOW() WHERE id = $1 AND tenant_id = $2",
    [id, tenantId, loyaltyPointsBalance],
  );
}
