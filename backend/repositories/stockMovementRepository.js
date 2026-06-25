function mapStockMovement(row) {
  return {
    id: row.id,
    organizationId: row.tenant_id,
    productId: row.product_id,
    productName: row.product_name || null,
    productCategory: row.product_category || null,
    type: row.type,
    quantityIn: Number(row.quantity_in || 0),
    quantityOut: Number(row.quantity_out || 0),
    balanceAfter: Number(row.balance_after || 0),
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    note: row.note,
    createdById: row.created_by,
    createdByName: row.created_by_name || null,
    createdByEmail: row.created_by_email || null,
    createdByRole: row.created_by_role || null,
    businessDate: row.business_date,
    createdAt: row.created_at,
  };
}

function buildFilterClause({ tenantId, productId, type, referenceType, dateFrom, dateTo }, params) {
  params.push(tenantId);
  const conditions = [`stock_movements.tenant_id = $${params.length}`];

  if (productId) {
    params.push(productId);
    conditions.push(`stock_movements.product_id = $${params.length}`);
  }

  if (type) {
    params.push(type);
    conditions.push(`stock_movements.type = $${params.length}`);
  }

  if (referenceType) {
    params.push(referenceType);
    conditions.push(`stock_movements.reference_type = $${params.length}`);
  }

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`COALESCE(stock_movements.business_date, stock_movements.created_at::date) >= $${params.length}::date`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`COALESCE(stock_movements.business_date, stock_movements.created_at::date) <= $${params.length}::date`);
  }

  return `WHERE ${conditions.join(" AND ")}`;
}

function buildSelect() {
  return `SELECT
      stock_movements.*,
      products.name AS product_name,
      categories.name AS product_category,
      users.name AS created_by_name,
      users.email AS created_by_email,
      users.role AS created_by_role
    FROM stock_movements
    LEFT JOIN products
      ON products.id = stock_movements.product_id
      AND products.tenant_id = stock_movements.tenant_id
    LEFT JOIN categories
      ON categories.id = products.category_id
    LEFT JOIN users
      ON users.id = stock_movements.created_by`;
}

export function insertStockMovement(client, movement) {
  return client.query(
    `INSERT INTO stock_movements (
       id,
       tenant_id,
       product_id,
       type,
       quantity_in,
       quantity_out,
       balance_after,
       reference_type,
       reference_id,
       note,
       created_by,
       business_date
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12::date, CURRENT_DATE))
     RETURNING *`,
    [
      movement.id,
      movement.organizationId,
      movement.productId,
      movement.type,
      movement.quantityIn,
      movement.quantityOut,
      movement.balanceAfter,
      movement.referenceType,
      movement.referenceId,
      movement.note,
      movement.createdById,
      movement.businessDate || null,
    ],
  );
}

export async function countStockMovements(client, filters = {}) {
  const params = [];
  const where = buildFilterClause(filters, params);
  const result = await client.query(`SELECT COUNT(*)::INTEGER AS count FROM stock_movements ${where}`, params);
  return result.rows[0].count;
}

// Per-DSR damage totals for a date range — joins settlement reference to recover DSR identity.
export async function listDsrDamageTotals(client, tenantId, dateFrom, dateTo) {
  const result = await client.query(
    `SELECT
       s.dsr_id,
       s.dsr_name,
       s.area,
       SUM(sm.quantity_out)::INTEGER AS total_damaged,
       COUNT(DISTINCT sm.reference_id)::INTEGER AS settlement_count
     FROM stock_movements sm
     JOIN settlements s
       ON s.id = sm.reference_id
       AND s.tenant_id = sm.tenant_id
     WHERE sm.tenant_id = $1
       AND sm.type = 'DAMAGE'
       AND sm.reference_type = 'settlement'
       AND COALESCE(sm.business_date, sm.created_at::date) >= $2::date
       AND COALESCE(sm.business_date, sm.created_at::date) < $3::date
     GROUP BY s.dsr_id, s.dsr_name, s.area
     ORDER BY total_damaged DESC`,
    [tenantId, dateFrom, dateTo],
  );
  return result.rows.map((row) => ({
    dsrId: row.dsr_id,
    dsrName: row.dsr_name,
    area: row.area,
    totalDamaged: Number(row.total_damaged || 0),
    settlementCount: Number(row.settlement_count || 0),
  }));
}

// Per-product damage totals from settlements for a date range.
export async function listProductDamageTotals(client, tenantId, dateFrom, dateTo) {
  const result = await client.query(
    `SELECT
       p.id AS product_id,
       p.name AS product_name,
       SUM(sm.quantity_out)::INTEGER AS total_damaged
     FROM stock_movements sm
     JOIN products p
       ON p.id = sm.product_id
       AND p.tenant_id = sm.tenant_id
     WHERE sm.tenant_id = $1
       AND sm.type = 'DAMAGE'
       AND sm.reference_type = 'settlement'
       AND COALESCE(sm.business_date, sm.created_at::date) >= $2::date
       AND COALESCE(sm.business_date, sm.created_at::date) < $3::date
     GROUP BY p.id, p.name
     ORDER BY total_damaged DESC`,
    [tenantId, dateFrom, dateTo],
  );
  return result.rows.map((row) => ({
    productId: row.product_id,
    productName: row.product_name,
    totalDamaged: Number(row.total_damaged || 0),
  }));
}

export async function listStockMovementsPage(client, { tenantId, productId, type, referenceType, dateFrom, dateTo, limit, offset }) {
  const params = [];
  const where = buildFilterClause({ tenantId, productId, type, referenceType, dateFrom, dateTo }, params);
  params.push(limit, offset);
  const result = await client.query(
    `${buildSelect()}
     ${where}
     ORDER BY COALESCE(stock_movements.business_date, stock_movements.created_at::date) DESC,
              stock_movements.created_at DESC,
              stock_movements.id DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return result.rows.map(mapStockMovement);
}
