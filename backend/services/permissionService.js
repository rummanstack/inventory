import { assert } from "../lib/errors.js";
import { ROLE_PERMISSIONS, TENANT_BUSINESS_PERMISSIONS } from "../lib/permissions.js";
import { setCachedPermissions } from "../lib/permissionCache.js";
import { USER_ROLES } from "../lib/roles.js";
import { listRolePermissions, replaceRolePermissions } from "../repositories/rolePermissionRepository.js";

const ALL_PERMISSIONS = TENANT_BUSINESS_PERMISSIONS;

const EDITABLE_ROLES_BY_ACTOR_ROLE = {
  [USER_ROLES.SYSTEM_DEVELOPER]: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.OPERATOR],
  [USER_ROLES.SUPER_ADMIN]: [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.OPERATOR],
};

// Maps a permission to the tenant feature that must be enabled before a
// super_admin can grant it to a sub-role — keeps permission assignment from
// outrunning what the tenant's plan actually has turned on.
const PERMISSION_REQUIRED_FEATURES = {
  manage_suppliers: "suppliers",
  manage_purchases: "purchase-receive",
  manage_supplier_payments: "supplier-payments",
  view_supplier_statement: "supplier-statement",
  manage_retail_quick_sale: "retailer-quick-sale",
  manage_retail_sales_invoices: "retailer-sales-invoices",
  manage_retail_sales_returns: "retailer-sales-return",
  manage_retail_customer_due: "retailer-customer-due",
  manage_retail_due_collection: "retailer-due-collection",
  manage_retail_promotions: "retailer-promotions",
  manage_retail_daily_sales_report: "retailer-daily-sales-report",
  manage_retail_profit_report: "retailer-profit-report",
  manage_retail_customers_write: "retail-customers",
  view_retail_customer_retention: "retail-customer-retention",
  manage_profit_report: "profit",
  view_product_serials: "product-serials",
  manage_product_serials: "product-serials",
  view_warranty_claims: "warranty-claims",
  manage_warranty_claims: "warranty-claims",
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

  async getPermissions(actor) {
    const roles = editableRolesFor(actor);
    assert(roles.length > 0, "Forbidden.", 403);

    const client = await this.databaseManager.getPool().connect();
    try {
      const result = [];
      for (const role of roles) {
        const stored = await listRolePermissions(client, role, actor.tenantId);
        result.push({
          role,
          permissions: stored.length > 0 ? stored : ROLE_PERMISSIONS[role] || [],
        });
      }
      return { roles: result, allPermissions: ALL_PERMISSIONS };
    } finally {
      client.release();
    }
  }

  async updateRolePermissions(role, permissions, actor) {
    const editableRoles = editableRolesFor(actor);
    assert(editableRoles.includes(role), "Forbidden.", 403);
    assert(Array.isArray(permissions), "Permissions must be an array.");

    const cleanPermissions = [...new Set(permissions.map((permission) => String(permission)))];
    for (const permission of cleanPermissions) {
      assert(ALL_PERMISSIONS.includes(permission), `Unknown permission: ${permission}`);
    }

    if (actor.role === USER_ROLES.SUPER_ADMIN) {
      const tenantFeatures = await this.tenantService.getTenantFeatures(actor.tenantId);
      for (const permission of cleanPermissions) {
        const requiredFeature = PERMISSION_REQUIRED_FEATURES[permission];
        assert(
          !requiredFeature || tenantFeatures.includes(requiredFeature),
          `Your organization does not have access to enable: ${permission}`,
          403,
        );
      }
    }

    await this.databaseManager.withTransaction(async (client) => {
      await replaceRolePermissions(client, role, actor.tenantId, cleanPermissions);

      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: "permissions.update",
        entityType: "role",
        entityId: role,
        description: `${actor.name} updated permissions for role ${role}`,
        metadata: { role, permissions: cleanPermissions },
      });
    });

    setCachedPermissions(role, actor.tenantId, cleanPermissions);

    return this.getPermissions(actor);
  }
}
