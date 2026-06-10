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
    `INSERT INTO tenants (id, name, slug, email, plan, status, logo_url, address)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
    ],
  );
  return mapTenant(result.rows[0]);
}

export async function updateTenant(client, tenant) {
  const result = await client.query(
    `UPDATE tenants
     SET name = $2, email = $3, plan = $4, logo_url = $5, address = $6
     WHERE id = $1
     RETURNING *`,
    [tenant.id, tenant.name, tenant.email, tenant.plan, tenant.logoUrl || null, tenant.address || null],
  );
  return mapTenant(result.rows[0]);
}

export async function setTenantStatus(client, tenantId, status) {
  const result = await client.query("UPDATE tenants SET status = $2 WHERE id = $1 RETURNING *", [tenantId, status]);
  return mapTenant(result.rows[0]);
}
