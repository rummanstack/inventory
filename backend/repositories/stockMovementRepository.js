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
    createdAt: row.created_at,
  };
}

function buildFilterClause({ tenantId, productId, type, dateFrom, dateTo }, params) {
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

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`stock_movements.created_at >= $${params.length}::date`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`stock_movements.created_at < ($${params.length}::date + INTERVAL '1 day')`);
  }

  return `WHERE ${conditions.join(" AND ")}`;
}

function buildSelect() {
  return `SELECT
      stock_movements.*,
      products.name AS product_name,
      products.category AS product_category,
      users.name AS created_by_name,
      users.email AS created_by_email,
      users.role AS created_by_role
    FROM stock_movements
    LEFT JOIN products
      ON products.id = stock_movements.product_id
      AND products.tenant_id = stock_movements.tenant_id
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
       created_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
    ],
  );
}

export async function countStockMovements(client, filters = {}) {
  const params = [];
  const where = buildFilterClause(filters, params);
  const result = await client.query(`SELECT COUNT(*)::INTEGER AS count FROM stock_movements ${where}`, params);
  return result.rows[0].count;
}

export async function listStockMovementsPage(client, { tenantId, productId, dateFrom, dateTo, limit, offset }) {
  const params = [];
  const where = buildFilterClause({ tenantId, productId, dateFrom, dateTo }, params);
  params.push(limit, offset);
  const result = await client.query(
    `${buildSelect()}
     ${where}
     ORDER BY stock_movements.created_at DESC, stock_movements.id DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return result.rows.map(mapStockMovement);
}
