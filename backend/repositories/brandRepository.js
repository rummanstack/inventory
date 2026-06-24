export function mapBrand(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    productCount: row.product_count !== undefined ? Number(row.product_count) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listBrands(client, tenantId) {
  const result = await client.query(
    `SELECT b.*, COUNT(p.id)::INTEGER AS product_count
     FROM brands b
     LEFT JOIN products p ON LOWER(p.brand) = LOWER(b.name) AND p.tenant_id = b.tenant_id AND p.deleted_at IS NULL
     WHERE b.tenant_id = $1
     GROUP BY b.id
     ORDER BY b.name ASC`,
    [tenantId],
  );
  return result.rows.map(mapBrand);
}

export async function findBrandByName(client, tenantId, name) {
  const result = await client.query(
    `SELECT * FROM brands WHERE tenant_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
    [tenantId, name],
  );
  return result.rows[0] || null;
}

export async function findBrandById(client, brandId, tenantId) {
  const result = await client.query(
    `SELECT * FROM brands WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    [brandId, tenantId],
  );
  return result.rows[0] || null;
}

export function insertBrand(client, brand) {
  return client.query(
    `INSERT INTO brands (id, tenant_id, name) VALUES ($1, $2, $3) RETURNING *`,
    [brand.id, brand.tenantId, brand.name],
  );
}

export function updateBrand(client, brand) {
  return client.query(
    `UPDATE brands SET name = $3, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *`,
    [brand.id, brand.tenantId, brand.name],
  );
}

export function deleteBrand(client, brandId, tenantId) {
  return client.query(`DELETE FROM brands WHERE id = $1 AND tenant_id = $2`, [brandId, tenantId]);
}
