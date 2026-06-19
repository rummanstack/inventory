export function mapTenant(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    email: row.email,
    plan: row.plan,
    status: row.status,
    logoUrl: row.logo_url || null,
    address: row.address || null,
    taxRate: Number(row.tax_rate || 0),
    loyaltyEnabled: row.loyalty_enabled === true || row.loyalty_enabled === 'true' || row.loyalty_enabled === 1,
    loyaltyPointsPer100: Number(row.loyalty_points_per_100 || 0),
    loyaltyPointValue: Number(row.loyalty_point_value || 0),
    createdAt: row.created_at,
  };
}

export async function findTenantBySlug(client, slug) {
  const result = await client.query("SELECT * FROM tenants WHERE slug = $1 LIMIT 1", [slug]);
  return mapTenant(result.rows[0]);
}

export async function findTenantById(client, id) {
  const result = await client.query("SELECT * FROM tenants WHERE id = $1 LIMIT 1", [id]);
  return mapTenant(result.rows[0]);
}

export async function listTenants(client) {
  const result = await client.query("SELECT * FROM tenants ORDER BY created_at ASC");
  return result.rows.map(mapTenant);
}

export async function countTenants(client) {
  const result = await client.query("SELECT COUNT(*)::INTEGER AS count FROM tenants");
  return result.rows[0].count;
}

export async function insertTenant(client, tenant) {
  const result = await client.query(
    `INSERT INTO tenants (id, name, slug, email, plan, status, logo_url, address, tax_rate, loyalty_enabled, loyalty_points_per_100, loyalty_point_value)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      tenant.id,
      tenant.name,
      tenant.slug,
      tenant.email,
      tenant.plan || "starter",
      tenant.status || "active",
      tenant.logoUrl || null,
      tenant.address || null,
      tenant.taxRate ?? 0,
      tenant.loyaltyEnabled ?? false,
      tenant.loyaltyPointsPer100 ?? 1,
      tenant.loyaltyPointValue ?? 1,
    ],
  );
  return mapTenant(result.rows[0]);
}

export async function updateTenant(client, tenant) {
  const result = await client.query(
    `UPDATE tenants
     SET name = $2, email = $3, plan = $4, logo_url = $5, address = $6, tax_rate = $7,
         loyalty_enabled = $8, loyalty_points_per_100 = $9, loyalty_point_value = $10
     WHERE id = $1
     RETURNING *`,
    [
      tenant.id,
      tenant.name,
      tenant.email,
      tenant.plan,
      tenant.logoUrl || null,
      tenant.address || null,
      tenant.taxRate ?? 0,
      tenant.loyaltyEnabled ?? false,
      tenant.loyaltyPointsPer100 ?? 1,
      tenant.loyaltyPointValue ?? 1,
    ],
  );
  return mapTenant(result.rows[0]);
}

export async function setTenantStatus(client, tenantId, status) {
  const result = await client.query("UPDATE tenants SET status = $2 WHERE id = $1 RETURNING *", [tenantId, status]);
  return mapTenant(result.rows[0]);
}
