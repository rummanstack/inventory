export function mapRetailPromotion(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description || '',
    active: row.active === true || row.active === 'true' || row.active === 1,
    level: row.level || 'LINE',
    targetType: row.target_type || 'PRODUCT',
    targetId: row.target_id || null,
    saleType: row.sale_type || 'ALL',
    discountType: row.discount_type || 'PERCENT',
    discountValue: Number(row.discount_value || 0),
    minQuantity: Number(row.min_quantity || 0),
    minSubtotal: Number(row.min_subtotal || 0),
    startDate: row.start_date || null,
    endDate: row.end_date || null,
    priority: Number(row.priority || 100),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listRetailPromotions(client, tenantId) {
  const result = await client.query(
    `SELECT *
     FROM retail_promotions rp
     WHERE rp.tenant_id = $1
     ORDER BY rp.active DESC, rp.priority ASC, rp.created_at DESC`,
    [tenantId],
  );
  return result.rows.map(mapRetailPromotion);
}

export async function listActiveRetailPromotionsForDate(client, tenantId, invoiceDate) {
  const result = await client.query(
    `SELECT *
     FROM retail_promotions rp
     WHERE rp.tenant_id = $1
       AND rp.active = TRUE
       AND (rp.start_date IS NULL OR rp.start_date <= $2::date)
       AND (rp.end_date IS NULL OR rp.end_date >= $2::date)
     ORDER BY rp.priority ASC, rp.created_at ASC`,
    [tenantId, invoiceDate],
  );
  return result.rows.map(mapRetailPromotion);
}

export function findRetailPromotionById(client, promotionId, tenantId) {
  return client.query(
    "SELECT * FROM retail_promotions WHERE id = $1 AND tenant_id = $2 LIMIT 1",
    [promotionId, tenantId],
  );
}

export function insertRetailPromotion(client, promotion) {
  return client.query(
    `INSERT INTO retail_promotions (
      id, tenant_id, name, description, active, level, target_type, target_id,
      sale_type, discount_type, discount_value, min_quantity, min_subtotal,
      start_date, end_date, priority
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *`,
    [
      promotion.id,
      promotion.tenantId,
      promotion.name,
      promotion.description,
      promotion.active,
      promotion.level,
      promotion.targetType,
      promotion.targetId,
      promotion.saleType,
      promotion.discountType,
      promotion.discountValue,
      promotion.minQuantity,
      promotion.minSubtotal,
      promotion.startDate,
      promotion.endDate,
      promotion.priority,
    ],
  );
}

export function updateRetailPromotion(client, promotion) {
  return client.query(
    `UPDATE retail_promotions
     SET name = $3, description = $4, active = $5, level = $6, target_type = $7, target_id = $8,
         sale_type = $9, discount_type = $10, discount_value = $11, min_quantity = $12,
         min_subtotal = $13, start_date = $14, end_date = $15, priority = $16, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [
      promotion.id,
      promotion.tenantId,
      promotion.name,
      promotion.description,
      promotion.active,
      promotion.level,
      promotion.targetType,
      promotion.targetId,
      promotion.saleType,
      promotion.discountType,
      promotion.discountValue,
      promotion.minQuantity,
      promotion.minSubtotal,
      promotion.startDate,
      promotion.endDate,
      promotion.priority,
    ],
  );
}

export function deleteRetailPromotion(client, promotionId, tenantId) {
  return client.query("DELETE FROM retail_promotions WHERE id = $1 AND tenant_id = $2", [promotionId, tenantId]);
}
