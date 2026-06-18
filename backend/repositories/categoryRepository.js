export function mapCategory(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    productCount: row.product_count !== undefined ? Number(row.product_count) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCategories(client, tenantId) {
  const result = await client.query(
    `SELECT c.*, COUNT(p.id)::INTEGER AS product_count
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id AND p.deleted_at IS NULL
     WHERE c.tenant_id = $1
     GROUP BY c.id
     ORDER BY c.name ASC`,
    [tenantId],
  );
  return result.rows.map(mapCategory);
}

export async function findCategoryByName(client, tenantId, name) {
  const result = await client.query(
    `SELECT * FROM categories WHERE tenant_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
    [tenantId, name],
  );
  return result.rows[0] || null;
}

export async function findCategoryById(client, categoryId, tenantId) {
  const result = await client.query(
    `SELECT * FROM categories WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    [categoryId, tenantId],
  );
  return result.rows[0] || null;
}

export function insertCategory(client, category) {
  return client.query(
    `INSERT INTO categories (id, tenant_id, name) VALUES ($1, $2, $3) RETURNING *`,
    [category.id, category.tenantId, category.name],
  );
}

export function updateCategory(client, category) {
  return client.query(
    `UPDATE categories SET name = $3, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *`,
    [category.id, category.tenantId, category.name],
  );
}

export function deleteCategory(client, categoryId, tenantId) {
  return client.query(`DELETE FROM categories WHERE id = $1 AND tenant_id = $2`, [categoryId, tenantId]);
}
