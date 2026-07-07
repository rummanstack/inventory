import { refreshAccessCachesIfStale } from "./accessCacheRefresh.js";

const cache = new Map();

export const GLOBAL_SCOPE = "global";

// Every role, including super_admin, is scoped per-tenant now — a tenant
// with no explicit override falls through to the GLOBAL_SCOPE bucket (used
// only if something has been written there), never to a hardcoded default.
function scopeFor(tenantId) {
  return tenantId || GLOBAL_SCOPE;
}

function cacheKey(role, scope) {
  return `${role}::${scope}`;
}

export function getCachedPermissions(role, tenantId) {
  refreshAccessCachesIfStale();
  const scope = scopeFor(tenantId);
  const scoped = cache.get(cacheKey(role, scope));
  if (scoped) return scoped;

  if (scope !== GLOBAL_SCOPE) {
    return cache.get(cacheKey(role, GLOBAL_SCOPE)) || null;
  }

  return null;
}

export function setCachedPermissions(role, tenantId, permissions) {
  cache.set(cacheKey(role, scopeFor(tenantId)), permissions);
}

export async function loadPermissionCache(pool) {
  const result = await pool.query("SELECT role, tenant_id, permission FROM role_permissions");
  const grouped = new Map();

  for (const row of result.rows) {
    const key = cacheKey(row.role, row.tenant_id);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(row.permission);
  }

  cache.clear();
  for (const [key, permissions] of grouped) {
    cache.set(key, permissions);
  }
}
