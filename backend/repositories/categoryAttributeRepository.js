export function mapCategoryAttribute(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    categoryId: row.category_id,
    key: row.key,
    label: row.label,
    dataType: row.data_type,
    unit: row.unit,
    options: row.options,
    sortOrder: row.sort_order,
    showInComparison: row.show_in_comparison,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCategoryAttributes(client, tenantId, categoryId) {
  const result = await client.query(
    `SELECT * FROM category_attribute_definitions
     WHERE tenant_id = $1 AND category_id = $2
     ORDER BY sort_order ASC, label ASC`,
    [tenantId, categoryId],
  );
  return result.rows.map(mapCategoryAttribute);
}

export async function listCategoryAttributesForCategories(client, tenantId, categoryIds) {
  if (categoryIds.length === 0) return [];
  const result = await client.query(
    `SELECT * FROM category_attribute_definitions
     WHERE tenant_id = $1 AND category_id = ANY($2::text[])
     ORDER BY category_id, sort_order ASC, label ASC`,
    [tenantId, categoryIds],
  );
  return result.rows.map(mapCategoryAttribute);
}

export async function findCategoryAttributeById(client, tenantId, id) {
  const result = await client.query(
    `SELECT * FROM category_attribute_definitions WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
    [tenantId, id],
  );
  return result.rows[0] ? mapCategoryAttribute(result.rows[0]) : null;
}

export async function findCategoryAttributeByKey(client, tenantId, categoryId, key) {
  const result = await client.query(
    `SELECT * FROM category_attribute_definitions
     WHERE tenant_id = $1 AND category_id = $2 AND LOWER(key) = LOWER($3) LIMIT 1`,
    [tenantId, categoryId, key],
  );
  return result.rows[0] ? mapCategoryAttribute(result.rows[0]) : null;
}

export async function insertCategoryAttribute(client, attribute) {
  const result = await client.query(
    `INSERT INTO category_attribute_definitions
       (id, tenant_id, category_id, key, label, data_type, unit, options, sort_order, show_in_comparison)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      attribute.id,
      attribute.tenantId,
      attribute.categoryId,
      attribute.key,
      attribute.label,
      attribute.dataType,
      attribute.unit,
      JSON.stringify(attribute.options),
      attribute.sortOrder,
      attribute.showInComparison,
    ],
  );
  return mapCategoryAttribute(result.rows[0]);
}

export async function updateCategoryAttribute(client, attribute) {
  const result = await client.query(
    `UPDATE category_attribute_definitions
     SET label = $3, data_type = $4, unit = $5, options = $6, sort_order = $7,
         show_in_comparison = $8, updated_at = NOW()
     WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
    [
      attribute.tenantId,
      attribute.id,
      attribute.label,
      attribute.dataType,
      attribute.unit,
      JSON.stringify(attribute.options),
      attribute.sortOrder,
      attribute.showInComparison,
    ],
  );
  return result.rows[0] ? mapCategoryAttribute(result.rows[0]) : null;
}

export async function deleteCategoryAttribute(client, tenantId, id) {
  await client.query(
    `DELETE FROM category_attribute_definitions WHERE tenant_id = $1 AND id = $2`,
    [tenantId, id],
  );
}
