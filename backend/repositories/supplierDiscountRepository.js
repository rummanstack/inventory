export function mapSupplierDiscount(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name || null,
    discountDate: row.discount_date,
    amount: Number(row.amount || 0),
    note: row.note,
    createdById: row.created_by,
    createdByName: row.created_by_name || null,
    createdAt: row.created_at,
  };
}

function buildFilters({ supplierId, dateFrom, dateTo, tenantId }) {
  const params = [tenantId];
  const conditions = ["sd.tenant_id = $1"];

  if (supplierId) {
    params.push(supplierId);
    conditions.push(`sd.supplier_id = $${params.length}`);
  }

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`sd.discount_date >= $${params.length}::date`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`sd.discount_date <= $${params.length}::date`);
  }

  return { params, where: `WHERE ${conditions.join(" AND ")}` };
}

export async function countSupplierDiscounts(client, filters = {}) {
  const { params, where } = buildFilters(filters);
  const result = await client.query(
    `SELECT COUNT(*)::INTEGER AS count FROM supplier_discounts sd ${where}`,
    params,
  );
  return result.rows[0].count;
}

export async function listSupplierDiscountsPage(client, { limit, offset, ...filters }) {
  const { params, where } = buildFilters(filters);
  params.push(limit, offset);
  const result = await client.query(
    `SELECT sd.*, s.name AS supplier_name, u.name AS created_by_name
     FROM supplier_discounts sd
     LEFT JOIN suppliers s ON s.id = sd.supplier_id
     LEFT JOIN users u ON u.id = sd.created_by
     ${where}
     ORDER BY sd.discount_date DESC, sd.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapSupplierDiscount);
}

export function findSupplierDiscountById(client, discountId, tenantId) {
  return client.query(
    `SELECT sd.*, s.name AS supplier_name, u.name AS created_by_name
     FROM supplier_discounts sd
     LEFT JOIN suppliers s ON s.id = sd.supplier_id
     LEFT JOIN users u ON u.id = sd.created_by
     WHERE sd.id = $1 AND sd.tenant_id = $2
     LIMIT 1`,
    [discountId, tenantId],
  );
}

export function findSupplierDiscountForUpdate(client, discountId, tenantId) {
  return client.query(
    `SELECT * FROM supplier_discounts WHERE id = $1 AND tenant_id = $2 FOR UPDATE LIMIT 1`,
    [discountId, tenantId],
  );
}

export function insertSupplierDiscount(client, discount) {
  return client.query(
    `INSERT INTO supplier_discounts (id, tenant_id, supplier_id, discount_date, amount, note, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [discount.id, discount.tenantId, discount.supplierId, discount.discountDate, discount.amount, discount.note, discount.createdById],
  );
}

export function deleteSupplierDiscount(client, discountId, tenantId) {
  return client.query(
    `DELETE FROM supplier_discounts WHERE id = $1 AND tenant_id = $2`,
    [discountId, tenantId],
  );
}
