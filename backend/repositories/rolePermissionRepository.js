import { GLOBAL_SCOPE } from "../lib/permissionCache.js";
import { USER_ROLES } from "../lib/roles.js";

function scopeFor(role, tenantId) {
  return role === USER_ROLES.SUPER_ADMIN ? GLOBAL_SCOPE : tenantId || GLOBAL_SCOPE;
}

export async function listRolePermissions(client, role, tenantId) {
  const scope = scopeFor(role, tenantId);
  const result = await client.query("SELECT permission FROM role_permissions WHERE role = $1 AND tenant_id = $2", [
    role,
    scope,
  ]);
  return result.rows.map((row) => row.permission);
}

export async function replaceRolePermissions(client, role, tenantId, permissions) {
  const scope = scopeFor(role, tenantId);
  await client.query("DELETE FROM role_permissions WHERE role = $1 AND tenant_id = $2", [role, scope]);

  for (const permission of permissions) {
    await client.query("INSERT INTO role_permissions (role, tenant_id, permission) VALUES ($1, $2, $3)", [
      role,
      scope,
      permission,
    ]);
  }
}

export async function hasAnyRolePermissions(client, role, tenantId) {
  const scope = scopeFor(role, tenantId);
  const result = await client.query("SELECT 1 FROM role_permissions WHERE role = $1 AND tenant_id = $2 LIMIT 1", [
    role,
    scope,
  ]);
  return result.rows.length > 0;
}
