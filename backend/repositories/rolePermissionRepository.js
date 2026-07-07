import { GLOBAL_SCOPE } from "../lib/permissionCache.js";

function scopeFor(tenantId) {
  return tenantId || GLOBAL_SCOPE;
}

export async function listRolePermissions(client, role, tenantId) {
  const scope = scopeFor(tenantId);
  const result = await client.query("SELECT permission FROM role_permissions WHERE role = $1 AND tenant_id = $2", [
    role,
    scope,
  ]);
  return result.rows.map((row) => row.permission);
}

export async function replaceRolePermissions(client, role, tenantId, permissions) {
  const scope = scopeFor(tenantId);
  await client.query("DELETE FROM role_permissions WHERE role = $1 AND tenant_id = $2", [role, scope]);

  for (const permission of permissions) {
    await client.query("INSERT INTO role_permissions (role, tenant_id, permission) VALUES ($1, $2, $3)", [
      role,
      scope,
      permission,
    ]);
  }
}

// Mirrors getCachedPermissions' runtime fallback: a tenant with no scoped rows
// inherits the GLOBAL_SCOPE bucket. The Permissions page must read through the
// same rule, otherwise it shows an empty matrix for a role that actually has
// inherited permissions — and saving from that view wipes them.
export async function listEffectiveRolePermissions(client, role, tenantId) {
  const scoped = await listRolePermissions(client, role, tenantId);
  if (scoped.length > 0 || scopeFor(tenantId) === GLOBAL_SCOPE) {
    return scoped;
  }
  return listRolePermissions(client, role, null);
}

export async function hasAnyRolePermissions(client, role, tenantId) {
  const scope = scopeFor(tenantId);
  const result = await client.query("SELECT 1 FROM role_permissions WHERE role = $1 AND tenant_id = $2 LIMIT 1", [
    role,
    scope,
  ]);
  return result.rows.length > 0;
}
