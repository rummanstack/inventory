import { assert } from "../lib/errors.js";
import { TENANT_BUSINESS_PERMISSIONS } from "../lib/permissions.js";
import { setCachedPermissions } from "../lib/permissionCache.js";
import { USER_ROLES } from "../lib/roles.js";
import { listEffectiveRolePermissions, replaceRolePermissions } from "../repositories/rolePermissionRepository.js";
import { findTenantById } from "../repositories/tenantRepository.js";

const ALL_PERMISSIONS = TENANT_BUSINESS_PERMISSIONS;

const EDITABLE_ROLES_BY_ACTOR_ROLE = {
  // system_developer sets the ceiling for every tenant-facing role,
  // including super_admin — a tenant's owner-level access is no longer
  // hardcoded, it's whatever the platform operator configures per tenant.
  [USER_ROLES.SYSTEM_DEVELOPER]: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.OPERATOR],
  // super_admin can delegate to their own sub-roles but can't touch its
  // own row — prevents a tenant from self-escalating past what
  // system_developer granted it.
  [USER_ROLES.SUPER_ADMIN]: [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.OPERATOR],
};

// Maps a permission to the tenant feature that must be enabled before a
// super_admin can grant it to a sub-role - keeps permission assignment from
// outrunning what the tenant's plan actually has turned on.
const PERMISSION_REQUIRED_FEATURES = {
  manage_expenses: "expenses",
  manage_dsr_finance: "dsr-finance",
  manage_users: "user-management",
  manage_org: "org-settings",
  manage_finance_accounts: "finance-accounts",
  view_finance_dashboard: "finance-dashboard",
  create_issues: "morning-issue",
  create_settlements: "settlements",
  view_products: "products",
  manage_products: "products",
  view_dsrs: "dsrs",
  manage_dsrs: "dsrs",
  view_customers: "customers",
  manage_customers: "customers",
  view_srs: "srs",
  manage_srs: "srs",
  manage_suppliers: "suppliers",
  view_suppliers: "suppliers",
  manage_purchases: "purchase-receive",
  view_purchases: "purchase-receive",
  manage_supplier_payments: "supplier-payments",
  view_supplier_payments: "supplier-payments",
  view_supplier_statement: "supplier-statement",
  view_purchase_returns: "purchase-returns",
  manage_purchase_returns: "purchase-returns",
  manage_retail_quick_sale: "retailer-quick-sale",
  view_retail_sales_invoices: "retailer-sales-invoices",
  manage_retail_sales_invoices: "retailer-sales-invoices",
  view_retail_sales_returns: "retailer-sales-return",
  manage_retail_sales_returns: "retailer-sales-return",
  view_retail_customer_due: "retailer-customer-due",
  manage_retail_customer_due: "retailer-customer-due",
  view_retail_due_collection: "retailer-due-collection",
  manage_retail_due_collection: "retailer-due-collection",
  manage_retail_promotions: "retailer-promotions",
  manage_retail_daily_sales_report: "retailer-daily-sales-report",
  view_retail_customers: "retail-customers",
  manage_retail_customers_write: "retail-customers",
  view_retail_customer_retention: "retail-customer-retention",
  manage_profit_report: "profit",
  view_product_serials: "product-serials",
  manage_product_serials: "product-serials",
  view_warranty_claims: "warranty-claims",
  manage_warranty_claims: "warranty-claims",
  view_repair_jobs: "repair-jobs",
  manage_repair_jobs: "repair-jobs",
  view_quotations: "quotations",
  manage_quotations: "quotations",
  view_trade_ins: "trade-ins",
  manage_trade_ins: "trade-ins",
  view_employees: "employees",
  manage_employees: "employees",
  manage_payroll: "salary-payments",
  "leave.manage": "leave_management",
  "leave.approve": "leave_management",
  "payroll.view": "payroll",
  "payroll.generate": "payroll",
  "payroll.approve": "payroll",
  "advance.manage": "employee_advances",
  "loan.manage": "employee_loans",
  "hr.reports": "hr-reports",
  view_expiry_alerts: "batch-tracking",
  manage_batch_tracking: "batch-tracking",
  manage_backups: "database-backup",
  view_general_ledger: "general-ledger",
  view_trial_balance: "trial-balance",
  view_balance_sheet: "balance-sheet",
  view_profit_and_loss: "profit-and-loss",
  view_chart_of_accounts: "chart-of-accounts",
  manage_chart_of_accounts: "chart-of-accounts",
  view_accounting_dashboard: "accounting-dashboard",
  manage_accounting_settings: "accounting-settings",
  manage_fiscal_years: "fiscal-years",
  manage_accounting_periods: "fiscal-years",
  view_opening_balances: "opening-balances",
  manage_opening_balances: "opening-balances",
};

function editableRolesFor(actor) {
  return EDITABLE_ROLES_BY_ACTOR_ROLE[actor.role] || [];
}

export class PermissionService {
  constructor(databaseManager, { auditService, tenantService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
    this.tenantService = tenantService;
  }

  // system_developer has no tenant of its own, so it must name one; every
  // other actor is always scoped to their own tenant.
  async resolveTenantId(actor, requestedTenantId) {
    if (actor.role !== USER_ROLES.SYSTEM_DEVELOPER) {
      return actor.tenantId;
    }

    assert(requestedTenantId, "A tenant is required.");
    const tenant = await this.databaseManager.withClient((client) => findTenantById(client, requestedTenantId));
    assert(tenant, "Organization not found.");
    return tenant.id;
  }

  async getPermissions(actor, requestedTenantId) {
    const roles = editableRolesFor(actor);
    assert(roles.length > 0, "Forbidden.", 403);

    const tenantId = await this.resolveTenantId(actor, requestedTenantId);

    const client = await this.databaseManager.getPool().connect();
    try {
      const result = [];
      for (const role of roles) {
        const stored = await listEffectiveRolePermissions(client, role, tenantId);
        result.push({ role, permissions: stored });
      }
      return { roles: result, allPermissions: ALL_PERMISSIONS, permissionRequiredFeatures: PERMISSION_REQUIRED_FEATURES, tenantId };
    } finally {
      client.release();
    }
  }

  async updateRolePermissions(role, permissions, actor, requestedTenantId) {
    const editableRoles = editableRolesFor(actor);
    assert(editableRoles.includes(role), "Forbidden.", 403);
    assert(Array.isArray(permissions), "Permissions must be an array.");

    const tenantId = await this.resolveTenantId(actor, requestedTenantId);

    const cleanPermissions = [...new Set(permissions.map((permission) => String(permission)))];
    for (const permission of cleanPermissions) {
      assert(ALL_PERMISSIONS.includes(permission), `Unknown permission: ${permission}`);
    }

    if (actor.role === USER_ROLES.SUPER_ADMIN) {
      // Only gate permissions being ADDED by this save. Permissions the role
      // already holds may map to features that were since disabled — they are
      // hidden on the page but still ride along in the payload, and rejecting
      // them would make every save fail.
      const existing = await this.databaseManager.withClient((client) =>
        listEffectiveRolePermissions(client, role, tenantId),
      );
      const added = cleanPermissions.filter((permission) => !existing.includes(permission));
      const tenantFeatures = await this.tenantService.getTenantFeatures(actor.tenantId);
      for (const permission of added) {
        const requiredFeature = PERMISSION_REQUIRED_FEATURES[permission];
        assert(
          !requiredFeature || tenantFeatures.includes(requiredFeature),
          `Your organization does not have access to enable: ${permission}`,
          403,
        );
      }
    }

    await this.databaseManager.withTransaction(async (client) => {
      await replaceRolePermissions(client, role, tenantId, cleanPermissions);

      await this.auditService.record(client, {
        tenantId,
        userId: actor.id,
        actionType: "permissions.update",
        entityType: "role",
        entityId: role,
        description: `${actor.name} updated permissions for role ${role}`,
        metadata: { role, permissions: cleanPermissions, tenantId },
      });
    });

    setCachedPermissions(role, tenantId, cleanPermissions);

    return this.getPermissions(actor, tenantId);
  }
}




