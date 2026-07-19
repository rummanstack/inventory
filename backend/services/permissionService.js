import { assert } from "../lib/errors.js";
import { PERMISSIONS, TENANT_BUSINESS_PERMISSIONS } from "../lib/permissions.js";
import { setCachedPermissions } from "../lib/permissionCache.js";
import { USER_ROLES } from "../lib/roles.js";
import { listEffectiveRolePermissions, replaceRolePermissions } from "../repositories/rolePermissionRepository.js";
import { findTenantById } from "../repositories/tenantRepository.js";

const ALL_PERMISSIONS = TENANT_BUSINESS_PERMISSIONS;

const EDITABLE_ROLES_BY_ACTOR_ROLE = {
  // system_developer sets the ceiling for every tenant-facing role,
  // including super_admin Ã¢â‚¬â€ a tenant's owner-level access is no longer
  // hardcoded, it's whatever the platform operator configures per tenant.
  [USER_ROLES.SYSTEM_DEVELOPER]: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.OPERATOR],
  // super_admin can delegate to their own sub-roles but can't touch its
  // own row Ã¢â‚¬â€ prevents a tenant from self-escalating past what
  // system_developer granted it.
  [USER_ROLES.SUPER_ADMIN]: [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.OPERATOR],
};

// Maps a permission to the tenant feature that must be enabled before a
// super_admin can grant it to a sub-role - keeps permission assignment from
// outrunning what the tenant's plan actually has turned on.
export const PERMISSION_REQUIRED_FEATURES = {
  manage_expenses: "expenses",
  manage_dsr_finance: "dsr-finance",
  manage_users: "user-management",
  manage_org: "org-settings",
  view_help_desk: "help-desk",
  manage_help_desk: "help-desk",
  manage_finance_accounts: "finance-accounts",
  view_finance_dashboard: "finance-dashboard",
  create_issues: "morning-issue",
  update_issues: "morning-issue",
  create_settlements: "settlements",
  update_settlements: "settlements",
  view_activity_logs: ["activity-logs", "issue-center"],
  view_products: ["products", "stock-movement", "low-stock-alerts", "damaged-stock"],
  manage_products: "products",
  view_product_browser: "product-browser",
  view_dsrs: "dsrs",
  manage_dsrs: "dsrs",
  view_customers: ["customers", "shop-due-ledger"],
  manage_customers: "customers",
  view_srs: ["srs", "sr-due-ledger"],
  manage_srs: "srs",
  manage_suppliers: "suppliers",
  view_suppliers: "suppliers",
  manage_purchases: "purchase-receive",
  view_purchases: "purchase-receive",
  manage_supplier_payments: "supplier-payments",
  view_supplier_payments: ["supplier-payments", "supplier-discounts"],
  view_supplier_statement: "supplier-statement",
  view_purchase_returns: "purchase-returns",
  manage_purchase_returns: "purchase-returns",
  manage_retail_quick_sale: ["retailer-quick-sale", "retailer-cash-sessions"],
  view_retail_sales_invoices: "retailer-sales-invoices",
  manage_retail_sales_invoices: "retailer-sales-invoices",
  view_retail_sales_returns: "retailer-sales-return",
  manage_retail_sales_returns: "retailer-sales-return",
  view_installment_plans: "installment-sales",
  manage_installment_plans: "installment-sales",
  collect_installment_payment: "installment-sales",
  reschedule_installment_plan: "installment-sales",
  cancel_installment_plan: "installment-sales",
  write_off_installment_plan: "installment-sales",
  override_installment_credit_limit: "installment-sales",
  manage_installment_credit_settings: "installment-sales",
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
  view_trade_promotions: "trade-promotions",
  manage_trade_promotion_rules: "trade-promotions",
  manage_trade_promotion_settlements: "trade-promotions",
  view_repair_jobs: "repair-jobs",
  manage_repair_jobs: "repair-jobs",
  view_quotations: "quotations",
  manage_quotations: "quotations",
  view_trade_ins: "trade-ins",
  manage_trade_ins: "trade-ins",
  view_employees: "employees",
  manage_employees: "employees",
  manage_departments: "departments",
  manage_designations: "designations",
  "attendance.view": "attendance",
  "attendance.manage": "attendance",
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
  "journal.create": "journal-vouchers",
  "journal.edit": "journal-vouchers",
  "journal.approve": "journal-vouchers",
  "journal.post": "journal-vouchers",
  "journal.reverse": "journal-vouchers",
  "journal.override": "journal-vouchers",
  "fiscal_year.close": "fiscal-years",
  "fiscal_year.reopen": "fiscal-years",
  "period.lock": "fiscal-years",
  "period.unlock": "fiscal-years",
  "closing.execute": "fiscal-years",
  "opening_balance.generate": "opening-balances",
  "accounting.admin": "accounting-dashboard",
  "voucher.view": [
    "voucher-register",
    "journal-register",
    "journal-vouchers",
    "receipt-vouchers",
    "payment-vouchers",
    "contra-vouchers",
  ],
  "voucher.receipt": "receipt-vouchers",
  "voucher.payment": "payment-vouchers",
  "voucher.contra": "contra-vouchers",
  "report.trial_balance": "trial-balance",
  "report.general_ledger": "general-ledger",
  "report.account_ledger": "account-ledger",
  "report.customer_ledger": "customer-ledger",
  "report.supplier_ledger": "supplier-ledger",
  "report.cash_book": "cash-book",
  "report.bank_book": "bank-book",
  "report.balance_sheet": "balance-sheet",
  "report.profit_loss": "profit-and-loss",
  "report.cash_flow": "cash-flow",
};

// Permission assignment is intentionally explicit: a write permission cannot
// be stored without the read/base permission needed to use it safely in the UI
// and API. The same map is returned to the client so it can keep selections
// structurally valid before submitting them.
export const PERMISSION_DEPENDENCIES = {
  [PERMISSIONS.MANAGE_HELP_DESK]: [PERMISSIONS.VIEW_HELP_DESK],
  [PERMISSIONS.MANAGE_PRODUCTS]: [PERMISSIONS.VIEW_PRODUCTS],
  [PERMISSIONS.MANAGE_DSRS]: [PERMISSIONS.VIEW_DSRS],
  [PERMISSIONS.MANAGE_CUSTOMERS]: [PERMISSIONS.VIEW_CUSTOMERS],
  [PERMISSIONS.MANAGE_SRS]: [PERMISSIONS.VIEW_SRS],
  [PERMISSIONS.MANAGE_SUPPLIERS]: [PERMISSIONS.VIEW_SUPPLIERS],
  [PERMISSIONS.MANAGE_PURCHASES]: [PERMISSIONS.VIEW_PURCHASES],
  [PERMISSIONS.MANAGE_SUPPLIER_PAYMENTS]: [PERMISSIONS.VIEW_SUPPLIER_PAYMENTS],
  [PERMISSIONS.MANAGE_PURCHASE_RETURNS]: [PERMISSIONS.VIEW_PURCHASE_RETURNS],
  [PERMISSIONS.MANAGE_RETAIL_SALES_INVOICES]: [PERMISSIONS.VIEW_RETAIL_SALES_INVOICES],
  [PERMISSIONS.MANAGE_RETAIL_SALES_RETURNS]: [PERMISSIONS.VIEW_RETAIL_SALES_RETURNS],
  [PERMISSIONS.MANAGE_INSTALLMENT_PLANS]: [PERMISSIONS.VIEW_INSTALLMENT_PLANS],
  [PERMISSIONS.COLLECT_INSTALLMENT_PAYMENT]: [PERMISSIONS.VIEW_INSTALLMENT_PLANS],
  [PERMISSIONS.RESCHEDULE_INSTALLMENT_PLAN]: [PERMISSIONS.VIEW_INSTALLMENT_PLANS],
  [PERMISSIONS.CANCEL_INSTALLMENT_PLAN]: [PERMISSIONS.VIEW_INSTALLMENT_PLANS],
  [PERMISSIONS.WRITE_OFF_INSTALLMENT_PLAN]: [PERMISSIONS.VIEW_INSTALLMENT_PLANS],
  [PERMISSIONS.OVERRIDE_INSTALLMENT_CREDIT_LIMIT]: [PERMISSIONS.VIEW_INSTALLMENT_PLANS],
  [PERMISSIONS.MANAGE_INSTALLMENT_CREDIT_SETTINGS]: [PERMISSIONS.VIEW_INSTALLMENT_PLANS],
  [PERMISSIONS.MANAGE_RETAIL_CUSTOMER_DUE]: [PERMISSIONS.VIEW_RETAIL_CUSTOMER_DUE],
  [PERMISSIONS.MANAGE_RETAIL_DUE_COLLECTION]: [PERMISSIONS.VIEW_RETAIL_DUE_COLLECTION],
  [PERMISSIONS.MANAGE_RETAIL_CUSTOMERS_WRITE]: [PERMISSIONS.VIEW_RETAIL_CUSTOMERS],
  [PERMISSIONS.MANAGE_PRODUCT_SERIALS]: [PERMISSIONS.VIEW_PRODUCT_SERIALS],
  [PERMISSIONS.MANAGE_WARRANTY_CLAIMS]: [PERMISSIONS.VIEW_WARRANTY_CLAIMS],
  [PERMISSIONS.MANAGE_TRADE_PROMOTION_RULES]: [PERMISSIONS.VIEW_TRADE_PROMOTIONS],
  [PERMISSIONS.MANAGE_TRADE_PROMOTION_SETTLEMENTS]: [PERMISSIONS.VIEW_TRADE_PROMOTIONS],
  [PERMISSIONS.MANAGE_REPAIR_JOBS]: [PERMISSIONS.VIEW_REPAIR_JOBS],
  [PERMISSIONS.MANAGE_QUOTATIONS]: [PERMISSIONS.VIEW_QUOTATIONS],
  [PERMISSIONS.MANAGE_TRADE_INS]: [PERMISSIONS.VIEW_TRADE_INS],
  [PERMISSIONS.MANAGE_EMPLOYEES]: [PERMISSIONS.VIEW_EMPLOYEES],
  [PERMISSIONS.MANAGE_ATTENDANCE]: [PERMISSIONS.VIEW_ATTENDANCE],
  [PERMISSIONS.APPROVE_LEAVE]: [PERMISSIONS.MANAGE_LEAVE],
  [PERMISSIONS.GENERATE_PAYROLL]: [PERMISSIONS.VIEW_PAYROLL],
  [PERMISSIONS.APPROVE_PAYROLL]: [PERMISSIONS.VIEW_PAYROLL],
  [PERMISSIONS.MANAGE_CHART_OF_ACCOUNTS]: [PERMISSIONS.VIEW_CHART_OF_ACCOUNTS],
  [PERMISSIONS.MANAGE_ACCOUNTING_PERIODS]: [PERMISSIONS.MANAGE_FISCAL_YEARS],
  [PERMISSIONS.MANAGE_OPENING_BALANCES]: [PERMISSIONS.VIEW_OPENING_BALANCES],
  [PERMISSIONS.OPENING_BALANCE_GENERATE]: [PERMISSIONS.VIEW_OPENING_BALANCES],
  [PERMISSIONS.JOURNAL_CREATE]: [PERMISSIONS.VOUCHER_VIEW],
  [PERMISSIONS.JOURNAL_EDIT]: [PERMISSIONS.VOUCHER_VIEW],
  [PERMISSIONS.JOURNAL_APPROVE]: [PERMISSIONS.VOUCHER_VIEW],
  [PERMISSIONS.JOURNAL_POST]: [PERMISSIONS.VOUCHER_VIEW],
  [PERMISSIONS.JOURNAL_REVERSE]: [PERMISSIONS.VOUCHER_VIEW],
  [PERMISSIONS.JOURNAL_OVERRIDE]: [PERMISSIONS.VOUCHER_VIEW],
  [PERMISSIONS.VOUCHER_RECEIPT]: [PERMISSIONS.VOUCHER_VIEW],
  [PERMISSIONS.VOUCHER_PAYMENT]: [PERMISSIONS.VOUCHER_VIEW],
  [PERMISSIONS.VOUCHER_CONTRA]: [PERMISSIONS.VOUCHER_VIEW],
};

export function permissionMatchesEnabledFeatures(permission, enabledFeatures) {
  const requirement = PERMISSION_REQUIRED_FEATURES[permission];
  if (!requirement) return true;
  const alternatives = Array.isArray(requirement) ? requirement : [requirement];
  return alternatives.some((feature) => enabledFeatures.includes(feature));
}

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
      return {
        roles: result,
        allPermissions: ALL_PERMISSIONS,
        permissionRequiredFeatures: PERMISSION_REQUIRED_FEATURES,
        permissionDependencies: PERMISSION_DEPENDENCIES,
        tenantId,
      };
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

    for (const permission of cleanPermissions) {
      const missingDependencies = (PERMISSION_DEPENDENCIES[permission] || []).filter(
        (dependency) => !cleanPermissions.includes(dependency),
      );
      assert(
        missingDependencies.length === 0,
        `Permission ${permission} requires: ${missingDependencies.join(", ")}`,
      );
    }

    if (actor.role === USER_ROLES.SUPER_ADMIN) {
      // Only gate permissions being ADDED by this save. Permissions the role
      // already holds may map to features that were since disabled Ã¢â‚¬â€ they are
      // hidden on the page but still ride along in the payload, and rejecting
      // them would make every save fail.
      const { actorPermissions, existing } = await this.databaseManager.withClient(async (client) => ({
        actorPermissions: await listEffectiveRolePermissions(client, actor.role, tenantId),
        existing: await listEffectiveRolePermissions(client, role, tenantId),
      }));
      for (const permission of cleanPermissions) {
        assert(
          actorPermissions.includes(permission),
          `You cannot grant a permission you do not have: ${permission}`,
          403,
        );
      }
      const added = cleanPermissions.filter((permission) => !existing.includes(permission));
      const tenantFeatures = await this.tenantService.getTenantFeatures(tenantId);
      for (const permission of added) {
        assert(
          permissionMatchesEnabledFeatures(permission, tenantFeatures),
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




