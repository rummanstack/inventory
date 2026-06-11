export async function hasTenantFeatureConfig(client, tenantId) {
  const result = await client.query("SELECT 1 FROM tenant_features WHERE tenant_id = $1 LIMIT 1", [tenantId]);
  return result.rows.length > 0;
}

export async function listTenantFeatures(client, tenantId) {
  const result = await client.query("SELECT feature FROM tenant_features WHERE tenant_id = $1", [tenantId]);
  return result.rows.map((row) => row.feature);
}

export async function replaceTenantFeatures(client, tenantId, features) {
  await client.query("DELETE FROM tenant_features WHERE tenant_id = $1", [tenantId]);

  for (const feature of features) {
    await client.query("INSERT INTO tenant_features (tenant_id, feature) VALUES ($1, $2)", [tenantId, feature]);
  }
}
