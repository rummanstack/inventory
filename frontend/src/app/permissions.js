export const PERMISSIONS = {
  VIEW_STATE: 'view_state',
  MANAGE_PRODUCTS: 'manage_products',
  MANAGE_DSRS: 'manage_dsrs',
  CREATE_ISSUES: 'create_issues',
  UPDATE_ISSUES: 'update_issues',
  CREATE_SETTLEMENTS: 'create_settlements',
  UPDATE_SETTLEMENTS: 'update_settlements',
  MANAGE_EXPENSES: 'manage_expenses',
  MANAGE_DSR_FINANCE: 'manage_dsr_finance',
  VIEW_ACTIVITY_LOGS: 'view_activity_logs',
  MANAGE_USERS: 'manage_users',
};

const ROLE_PERMISSIONS = {
  system_developer: Object.values(PERMISSIONS),
  super_admin: Object.values(PERMISSIONS),
  admin: [
    PERMISSIONS.VIEW_STATE,
    PERMISSIONS.MANAGE_PRODUCTS,
    PERMISSIONS.MANAGE_DSRS,
    PERMISSIONS.CREATE_ISSUES,
    PERMISSIONS.UPDATE_ISSUES,
    PERMISSIONS.CREATE_SETTLEMENTS,
    PERMISSIONS.UPDATE_SETTLEMENTS,
    PERMISSIONS.MANAGE_EXPENSES,
    PERMISSIONS.MANAGE_DSR_FINANCE,
    PERMISSIONS.VIEW_ACTIVITY_LOGS,
  ],
  manager: [
    PERMISSIONS.VIEW_STATE,
    PERMISSIONS.CREATE_ISSUES,
    PERMISSIONS.UPDATE_ISSUES,
    PERMISSIONS.CREATE_SETTLEMENTS,
    PERMISSIONS.UPDATE_SETTLEMENTS,
    PERMISSIONS.MANAGE_EXPENSES,
    PERMISSIONS.MANAGE_DSR_FINANCE,
    PERMISSIONS.VIEW_ACTIVITY_LOGS,
  ],
  operator: [
    PERMISSIONS.VIEW_STATE,
    PERMISSIONS.CREATE_ISSUES,
    PERMISSIONS.CREATE_SETTLEMENTS,
  ],
};

export function hasPermission(role, permission) {
  if (role === 'system_developer') {
    return true;
  }

  return Boolean(role) && (ROLE_PERMISSIONS[role] || []).includes(permission);
}
