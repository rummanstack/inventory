import { NO_FEATURES_SENTINEL } from "../repositories/tenantFeatureRepository.js";
import { refreshAccessCachesIfStale } from "./accessCacheRefresh.js";

const cache = new Map();

export function getCachedFeatures(tenantId) {
  if (!tenantId) {
    return null;
  }
  refreshAccessCachesIfStale();

  return cache.has(tenantId) ? cache.get(tenantId) : null;
}

// An explicitly-empty feature set is cached as [] (deny everything), which is
// different from no entry at all (never configured -> requireFeature fails
// open). The DB-level marker for "explicitly empty" is the sentinel row; it
// must never leak into the cached list.
export function setCachedFeatures(tenantId, features) {
  if (!tenantId) {
    return;
  }

  cache.set(
    tenantId,
    (features || []).filter((feature) => feature !== NO_FEATURES_SENTINEL),
  );
}

export async function loadFeatureCache(pool) {
  const result = await pool.query("SELECT tenant_id, feature FROM tenant_features");
  const grouped = new Map();

  for (const row of result.rows) {
    if (!grouped.has(row.tenant_id)) {
      grouped.set(row.tenant_id, []);
    }
    if (row.feature !== NO_FEATURES_SENTINEL) {
      grouped.get(row.tenant_id).push(row.feature);
    }
  }

  cache.clear();
  for (const [tenantId, features] of grouped) {
    cache.set(tenantId, features);
  }
}
