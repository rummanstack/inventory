import { USER_ROLES } from "./roles.js";
import { getCachedPermissions } from "./permissionCache.js";

export const PERMISSIONS = {
  VIEW_STATE: "view_state",
  VIEW_PRODUCTS: "view_products",
  MANAGE_PRODUCTS: "manage_products",
  VIEW_DSRS: "view_dsrs",
  MANAGE_DSRS: "manage_dsrs",
  VIEW_CUSTOMERS: "view_customers",
  MANAGE_CUSTOMERS: "manage_customers",
  VIEW_SRS: "view_srs",
  MANAGE_SRS: "manage_srs",
  CREATE_ISSUES: "create_issues",
  UPDATE_ISSUES: "update_issues",
  CREATE_SETTLEMENTS: "create_settlements",
  UPDATE_SETTLEMENTS: "update_settlements",
  MANAGE_EXPENSES: "manage_expenses",
  MANAGE_DSR_FINANCE: "manage_dsr_finance",
  VIEW_ACTIVITY_LOGS: "view_activity_logs",
  MANAGE_USERS: "manage_users",
  MANAGE_BACKUPS: "manage_backups",
  MANAGE_ORG: "manage_org",
  PERMANENT_DELETE: "permanent_delete",
  VIEW_SUPPLIERS: "view_suppliers",
  MANAGE_SUPPLIERS: "manage_suppliers",
  VIEW_PURCHASES: "view_purchases",
  MANAGE_PURCHASES: "manage_purchases",
  VIEW_SUPPLIER_PAYMENTS: "view_supplier_payments",
  MANAGE_SUPPLIER_PAYMENTS: "manage_supplier_payments",
  VIEW_PURCHASE_RETURNS: "view_purchase_returns",
  MANAGE_PURCHASE_RETURNS: "manage_purchase_returns",
  MANAGE_FINANCE_ACCOUNTS: "manage_finance_accounts",
  VIEW_FINANCE_DASHBOARD: "view_finance_dashboard",
  MANAGE_RETAIL_QUICK_SALE: "manage_retail_quick_sale",
  VIEW_RETAIL_SALES_INVOICES: "view_retail_sales_invoices",
  MANAGE_RETAIL_SALES_INVOICES: "manage_retail_sales_invoices",
  VIEW_RETAIL_SALES_RETURNS: "view_retail_sales_returns",
  MANAGE_RETAIL_SALES_RETURNS: "manage_retail_sales_returns",
  VIEW_RETAIL_CUSTOMER_DUE: "view_retail_customer_due",
  MANAGE_RETAIL_CUSTOMER_DUE: "manage_retail_customer_due",
  VIEW_RETAIL_DUE_COLLECTION: "view_retail_due_collection",
  MANAGE_RETAIL_DUE_COLLECTION: "manage_retail_due_collection",
  MANAGE_RETAIL_PROMOTIONS: "manage_retail_promotions",
  MANAGE_RETAIL_DAILY_SALES_REPORT: "manage_retail_daily_sales_report",
  VIEW_RETAIL_CUSTOMERS: "view_retail_customers",
  MANAGE_RETAIL_CUSTOMERS_WRITE: "manage_retail_customers_write",
  VIEW_RETAIL_CUSTOMER_RETENTION: "view_retail_customer_retention",
  MANAGE_PROFIT_REPORT: "manage_profit_report",
  VIEW_SUPPLIER_STATEMENT: "view_supplier_statement",
  VIEW_PRODUCT_SERIALS: "view_product_serials",
  MANAGE_PRODUCT_SERIALS: "manage_product_serials",
  VIEW_WARRANTY_CLAIMS: "view_warranty_claims",
  MANAGE_WARRANTY_CLAIMS: "manage_warranty_claims",
  VIEW_REPAIR_JOBS: "view_repair_jobs",
  MANAGE_REPAIR_JOBS: "manage_repair_jobs",
  VIEW_QUOTATIONS: "view_quotations",
  MANAGE_QUOTATIONS: "manage_quotations",
  VIEW_TRADE_INS: "view_trade_ins",
  MANAGE_TRADE_INS: "manage_trade_ins",
  VIEW_EMPLOYEES: "view_employees",
  MANAGE_EMPLOYEES: "manage_employees",
  MANAGE_DEPARTMENTS: "manage_departments",
  MANAGE_DESIGNATIONS: "manage_designations",
  VIEW_ATTENDANCE: "attendance.view",
  MANAGE_ATTENDANCE: "attendance.manage",
  MANAGE_LEAVE: "leave.manage",
  APPROVE_LEAVE: "leave.approve",
  VIEW_PAYROLL: "payroll.view",
  GENERATE_PAYROLL: "payroll.generate",
  APPROVE_PAYROLL: "payroll.approve",
  MANAGE_ADVANCES: "advance.manage",
  MANAGE_LOANS: "loan.manage",
  MANAGE_PAYROLL: "manage_payroll",
  VIEW_EXPIRY_ALERTS: "view_expiry_alerts",
  MANAGE_BATCH_TRACKING: "manage_batch_tracking",
  VIEW_GENERAL_LEDGER: "view_general_ledger",
  VIEW_TRIAL_BALANCE: "view_trial_balance",
  VIEW_BALANCE_SHEET: "view_balance_sheet",
  VIEW_PROFIT_AND_LOSS: "view_profit_and_loss",
};

// The full catalog of permissions that can be assigned to any tenant-facing
// role. This is a vocabulary, not a grant — system_developer owns it in
// code; who actually HAS which permission lives entirely in the
// role_permissions table (see permissionService.js).
export const TENANT_BUSINESS_PERMISSIONS = [
  PERMISSIONS.VIEW_STATE,
  PERMISSIONS.VIEW_PRODUCTS,
  PERMISSIONS.MANAGE_PRODUCTS,
  PERMISSIONS.VIEW_DSRS,
  PERMISSIONS.MANAGE_DSRS,
  PERMISSIONS.VIEW_CUSTOMERS,
  PERMISSIONS.MANAGE_CUSTOMERS,
  PERMISSIONS.VIEW_SRS,
  PERMISSIONS.MANAGE_SRS,
  PERMISSIONS.CREATE_ISSUES,
  PERMISSIONS.UPDATE_ISSUES,
  PERMISSIONS.CREATE_SETTLEMENTS,
  PERMISSIONS.UPDATE_SETTLEMENTS,
  PERMISSIONS.MANAGE_EXPENSES,
  PERMISSIONS.MANAGE_DSR_FINANCE,
  PERMISSIONS.VIEW_ACTIVITY_LOGS,
  PERMISSIONS.MANAGE_USERS,
  PERMISSIONS.MANAGE_BACKUPS,
  PERMISSIONS.MANAGE_ORG,
  PERMISSIONS.PERMANENT_DELETE,
  PERMISSIONS.VIEW_SUPPLIERS,
  PERMISSIONS.MANAGE_SUPPLIERS,
  PERMISSIONS.VIEW_PURCHASES,
  PERMISSIONS.MANAGE_PURCHASES,
  PERMISSIONS.VIEW_SUPPLIER_PAYMENTS,
  PERMISSIONS.MANAGE_SUPPLIER_PAYMENTS,
  PERMISSIONS.VIEW_PURCHASE_RETURNS,
  PERMISSIONS.MANAGE_PURCHASE_RETURNS,
  PERMISSIONS.MANAGE_FINANCE_ACCOUNTS,
  PERMISSIONS.VIEW_FINANCE_DASHBOARD,
  PERMISSIONS.MANAGE_RETAIL_QUICK_SALE,
  PERMISSIONS.VIEW_RETAIL_SALES_INVOICES,
  PERMISSIONS.MANAGE_RETAIL_SALES_INVOICES,
  PERMISSIONS.VIEW_RETAIL_SALES_RETURNS,
  PERMISSIONS.MANAGE_RETAIL_SALES_RETURNS,
  PERMISSIONS.VIEW_RETAIL_CUSTOMER_DUE,
  PERMISSIONS.MANAGE_RETAIL_CUSTOMER_DUE,
  PERMISSIONS.VIEW_RETAIL_DUE_COLLECTION,
  PERMISSIONS.MANAGE_RETAIL_DUE_COLLECTION,
  PERMISSIONS.MANAGE_RETAIL_PROMOTIONS,
  PERMISSIONS.MANAGE_RETAIL_DAILY_SALES_REPORT,
  PERMISSIONS.VIEW_RETAIL_CUSTOMERS,
  PERMISSIONS.MANAGE_RETAIL_CUSTOMERS_WRITE,
  PERMISSIONS.VIEW_RETAIL_CUSTOMER_RETENTION,
  PERMISSIONS.MANAGE_PROFIT_REPORT,
  PERMISSIONS.VIEW_SUPPLIER_STATEMENT,
  PERMISSIONS.VIEW_PRODUCT_SERIALS,
  PERMISSIONS.MANAGE_PRODUCT_SERIALS,
  PERMISSIONS.VIEW_WARRANTY_CLAIMS,
  PERMISSIONS.MANAGE_WARRANTY_CLAIMS,
  PERMISSIONS.VIEW_REPAIR_JOBS,
  PERMISSIONS.MANAGE_REPAIR_JOBS,
  PERMISSIONS.VIEW_QUOTATIONS,
  PERMISSIONS.MANAGE_QUOTATIONS,
  PERMISSIONS.VIEW_TRADE_INS,
  PERMISSIONS.MANAGE_TRADE_INS,
  PERMISSIONS.VIEW_EMPLOYEES,
  PERMISSIONS.MANAGE_EMPLOYEES,
  PERMISSIONS.MANAGE_DEPARTMENTS,
  PERMISSIONS.MANAGE_DESIGNATIONS,
  PERMISSIONS.VIEW_ATTENDANCE,
  PERMISSIONS.MANAGE_ATTENDANCE,
  PERMISSIONS.MANAGE_LEAVE,
  PERMISSIONS.APPROVE_LEAVE,
  PERMISSIONS.VIEW_PAYROLL,
  PERMISSIONS.GENERATE_PAYROLL,
  PERMISSIONS.APPROVE_PAYROLL,
  PERMISSIONS.MANAGE_ADVANCES,
  PERMISSIONS.MANAGE_LOANS,
  PERMISSIONS.MANAGE_PAYROLL,
  PERMISSIONS.VIEW_EXPIRY_ALERTS,
  PERMISSIONS.MANAGE_BATCH_TRACKING,
  PERMISSIONS.VIEW_GENERAL_LEDGER,
  PERMISSIONS.VIEW_TRIAL_BALANCE,
  PERMISSIONS.VIEW_BALANCE_SHEET,
  PERMISSIONS.VIEW_PROFIT_AND_LOSS,
];

// system_developer is the platform root: unconditional, full access, never
// configured by anyone. Every other role (including super_admin) has no
// grant of its own in code — what each role can do lives entirely in the
// role_permissions table, assigned by system_developer (any role) or
// super_admin (admin/manager/operator, within their own tenant). A role
// with no rows in that table has zero permissions until configured.
export const ROLE_PERMISSIONS = {
  [USER_ROLES.SYSTEM_DEVELOPER]: [...Object.values(PERMISSIONS)],
};

export function getRolePermissions(role, tenantId) {
  if (role === USER_ROLES.SYSTEM_DEVELOPER) {
    return ROLE_PERMISSIONS[role] || [];
  }

  return getCachedPermissions(role, tenantId) || [];
}

export function hasPermission(role, permission, tenantId) {
  if (role === USER_ROLES.SYSTEM_DEVELOPER) {
    return true;
  }

  return getRolePermissions(role, tenantId).includes(permission);
}




