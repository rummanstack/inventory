export function mapManufacturer(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    shortName: row.short_name || '',
    country: row.country || '',
    dgdaLicense: row.dgda_license || '',
    phone: row.phone || '',
    address: row.address || '',
    status: row.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    productCount: row.product_count !== undefined ? Number(row.product_count) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listManufacturers(client, tenantId) {
  const result = await client.query(
    `SELECT m.*, COUNT(p.id)::INTEGER AS product_count
     FROM manufacturers m
     LEFT JOIN products p ON p.manufacturer_id = m.id AND p.tenant_id = m.tenant_id AND p.deleted_at IS NULL
     WHERE m.tenant_id = $1
     GROUP BY m.id
     ORDER BY m.name ASC`,
    [tenantId],
  );
  return result.rows.map(mapManufacturer);
}

export async function listActiveManufacturers(client, tenantId) {
  const result = await client.query(
    `SELECT * FROM manufacturers WHERE tenant_id = $1 AND status = 'ACTIVE' ORDER BY name ASC`,
    [tenantId],
  );
  return result.rows.map(mapManufacturer);
}

export async function findManufacturerByName(client, tenantId, name) {
  const result = await client.query(
    `SELECT * FROM manufacturers WHERE tenant_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
    [tenantId, name],
  );
  return result.rows[0] || null;
}

export async function findManufacturerById(client, manufacturerId, tenantId) {
  const result = await client.query(
    `SELECT * FROM manufacturers WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    [manufacturerId, tenantId],
  );
  return result.rows[0] || null;
}

export function insertManufacturer(client, m) {
  return client.query(
    `INSERT INTO manufacturers (id, tenant_id, name, short_name, country, dgda_license, phone, address, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [m.id, m.tenantId, m.name, m.shortName, m.country, m.dgdaLicense, m.phone, m.address, m.status],
  );
}

export function updateManufacturer(client, m) {
  return client.query(
    `UPDATE manufacturers
     SET name = $3, short_name = $4, country = $5, dgda_license = $6,
         phone = $7, address = $8, status = $9, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [m.id, m.tenantId, m.name, m.shortName, m.country, m.dgdaLicense, m.phone, m.address, m.status],
  );
}

export function deleteManufacturer(client, manufacturerId, tenantId) {
  return client.query(
    `DELETE FROM manufacturers WHERE id = $1 AND tenant_id = $2`,
    [manufacturerId, tenantId],
  );
}
