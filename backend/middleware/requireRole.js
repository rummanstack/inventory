import { assert } from "../lib/errors.js";
import { hasPermission, PERMISSIONS } from "../lib/permissions.js";

export function requirePermission(permission) {
  return (req, _res, next) => {
    const role = req.currentUser?.role;
    const allowed = Array.isArray(req.currentPermissions)
      ? req.currentPermissions.includes(permission)
      : hasPermission(role, permission, req.currentUser?.tenantId);
    assert(role && allowed, "Forbidden.", 403);
    next();
  };
}

export function requireAnyPermission(...permissions) {
  return (req, _res, next) => {
    const role = req.currentUser?.role;
    const tenantId = req.currentUser?.tenantId;
    const allowed = permissions.some((permission) =>
      role && (Array.isArray(req.currentPermissions)
        ? req.currentPermissions.includes(permission)
        : hasPermission(role, permission, tenantId)),
    );
    assert(allowed, "Forbidden.", 403);
    next();
  };
}

export function requireAdminAccess() {
  return requireAnyPermission(PERMISSIONS.MANAGE_PRODUCTS, PERMISSIONS.VIEW_ACTIVITY_LOGS);
}

export function requireRoles(...roles) {
  return (req, _res, next) => {
    assert(roles.includes(req.currentUser?.role), "Forbidden.", 403);
    next();
  };
}
