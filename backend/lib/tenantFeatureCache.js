const cache = new Map();

export function getCachedFeatures(tenantId) {
  if (!tenantId) {
    return null;
  }

  return cache.has(tenantId) ? cache.get(tenantId) : null;
}

// Mirrors tenantFeatureRepository's hasTenantFeatureConfig: zero rows means
// "never configured", which getTenantFeatures() treats as all-enabled — so an
// explicit empty list must drop the cache entry rather than cache `[]`.
export function setCachedFeatures(tenantId, features) {
  if (!tenantId) {
    return;
  }

  if (!features || features.length === 0) {
    cache.delete(tenantId);
    return;
  }

  cache.set(tenantId, features);
}

export async function loadFeatureCache(pool) {
  const result = await pool.query("SELECT tenant_id, feature FROM tenant_features");
  const grouped = new Map();

  for (const row of result.rows) {
    if (!grouped.has(row.tenant_id)) {
      grouped.set(row.tenant_id, []);
    }
    grouped.get(row.tenant_id).push(row.feature);
  }

  cache.clear();
  for (const [tenantId, features] of grouped) {
    cache.set(tenantId, features);
  }
}
