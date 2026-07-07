// A tenant with ZERO rows means "never configured" and fails open (all features
// enabled). An explicitly-empty feature set must therefore leave a marker row,
// otherwise unchecking every feature deletes all rows and the full catalog
// comes back on the next cache load / server restart.
export const NO_FEATURES_SENTINEL = "__none__";

export async function hasTenantFeatureConfig(client, tenantId) {
  const result = await client.query("SELECT 1 FROM tenant_features WHERE tenant_id = $1 LIMIT 1", [tenantId]);
  return result.rows.length > 0;
}

export async function listTenantFeatures(client, tenantId) {
  const result = await client.query("SELECT feature FROM tenant_features WHERE tenant_id = $1 AND feature != $2", [
    tenantId,
    NO_FEATURES_SENTINEL,
  ]);
  return result.rows.map((row) => row.feature);
}

export async function replaceTenantFeatures(client, tenantId, features) {
  await client.query("DELETE FROM tenant_features WHERE tenant_id = $1", [tenantId]);

  const rows = features.length > 0 ? features : [NO_FEATURES_SENTINEL];
  for (const feature of rows) {
    await client.query("INSERT INTO tenant_features (tenant_id, feature) VALUES ($1, $2)", [tenantId, feature]);
  }
}
