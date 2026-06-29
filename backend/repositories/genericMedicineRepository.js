export function mapGenericMedicine(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description || '',
    status: row.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    productCount: row.product_count !== undefined ? Number(row.product_count) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listGenericMedicines(client, tenantId) {
  const result = await client.query(
    `SELECT g.*, COUNT(p.id)::INTEGER AS product_count
     FROM generic_medicines g
     LEFT JOIN products p ON p.generic_medicine_id = g.id AND p.tenant_id = g.tenant_id AND p.deleted_at IS NULL
     WHERE g.tenant_id = $1
     GROUP BY g.id
     ORDER BY g.name ASC`,
    [tenantId],
  );
  return result.rows.map(mapGenericMedicine);
}

export async function listActiveGenericMedicines(client, tenantId) {
  const result = await client.query(
    `SELECT * FROM generic_medicines WHERE tenant_id = $1 AND status = 'ACTIVE' ORDER BY name ASC`,
    [tenantId],
  );
  return result.rows.map(mapGenericMedicine);
}

export async function findGenericMedicineByName(client, tenantId, name) {
  const result = await client.query(
    `SELECT * FROM generic_medicines WHERE tenant_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
    [tenantId, name],
  );
  return result.rows[0] || null;
}

export async function findGenericMedicineById(client, id, tenantId) {
  const result = await client.query(
    `SELECT * FROM generic_medicines WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    [id, tenantId],
  );
  return result.rows[0] || null;
}

export function insertGenericMedicine(client, g) {
  return client.query(
    `INSERT INTO generic_medicines (id, tenant_id, name, description, status)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [g.id, g.tenantId, g.name, g.description, g.status],
  );
}

export function updateGenericMedicine(client, g) {
  return client.query(
    `UPDATE generic_medicines
     SET name = $3, description = $4, status = $5, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 RETURNING *`,
    [g.id, g.tenantId, g.name, g.description, g.status],
  );
}

export function deleteGenericMedicine(client, id, tenantId) {
  return client.query(
    `DELETE FROM generic_medicines WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId],
  );
}
