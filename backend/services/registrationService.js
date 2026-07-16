import { randomUUID } from "crypto";
import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { validateEmail } from "../lib/email.js";
import { hashPassword, validatePasswordStrength } from "../lib/passwords.js";
import { USER_ROLES } from "../lib/roles.js";
import { BUSINESS_TYPES, BUSINESS_TYPE_VALUES, SELLER_TYPES, SELLER_TYPE_VALUES } from "../lib/businessTypes.js";
import { TENANT_ACTIONS } from "../lib/auditActions.js";
import { setCachedFeatures } from "../lib/tenantFeatureCache.js";
import { setCachedPermissions } from "../lib/permissionCache.js";
import { TENANT_BUSINESS_PERMISSIONS } from "../lib/permissions.js";
import { findTenantById, findTenantBySlug, insertTenant, listRegistrationTenants, setTenantStatus } from "../repositories/tenantRepository.js";
import { replaceTenantFeatures } from "../repositories/tenantFeatureRepository.js";
import { replaceRolePermissions } from "../repositories/rolePermissionRepository.js";
import { findUserByEmail, insertUser } from "../repositories/userRepository.js";
import { defaultFeaturesForBusinessType } from "./tenantService.js";
import { permissionMatchesEnabledFeatures } from "./permissionService.js";
import { logActivity } from "./shared/inventoryHelpers.js";

function slugify(name) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// Grocery signups are FMCG dealer-distribution businesses; electronics and
// pharmacy signups are retail counters. The public form only asks for the
// business type, so the seller type is derived unless explicitly provided.
function defaultSellerTypeForBusinessType(businessType) {
  return businessType === BUSINESS_TYPES.GROCERY ? SELLER_TYPES.DEALER : SELLER_TYPES.RETAILER;
}

export class RegistrationService {
  constructor(databaseManager, { auditService } = {}) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async register(input) {
    const businessName = String(input.businessName || "").trim();
    const ownerName = String(input.ownerName || "").trim();
    const email = String(input.email || "").trim().toLowerCase();
    const phone = String(input.phone || "").trim();
    const password = String(input.password || "");
    const businessType = String(input.businessType || "").trim().toUpperCase();

    assert(businessName, "Business name is required.", 400);
    assert(ownerName, "Your name is required.", 400);
    assert(email, "Email is required.", 400);
    assert(phone, "Phone number is required.", 400);
    assert(BUSINESS_TYPE_VALUES.includes(businessType), "Please choose a valid business type.", 400);
    const emailError = validateEmail(email);
    assert(!emailError, emailError, 400);
    const passwordError = validatePasswordStrength(password);
    assert(!passwordError, passwordError, 400);

    let sellerType = defaultSellerTypeForBusinessType(businessType);
    if (input.sellerType) {
      const requested = String(input.sellerType).trim().toUpperCase();
      assert(SELLER_TYPE_VALUES.includes(requested), "Invalid seller type.", 400);
      sellerType = requested;
    }

    const passwordHash = await hashPassword(password);

    const result = await this.databaseManager.withTransaction(async (client) => {
      const existingUser = await findUserByEmail(client, email);
      assert(!existingUser, "An account with this email already exists.", 409);

      const baseSlug = slugify(businessName) || "business";
      let slug = baseSlug;
      while (await findTenantBySlug(client, slug)) {
        slug = `${baseSlug}-${randomUUID().replace(/-/g, "").slice(0, 4)}`;
      }

      const tenant = await insertTenant(client, {
        id: `tenant_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
        name: businessName,
        slug,
        email,
        plan: "starter",
        status: "pending",
        phone,
        businessType,
        sellerType,
      });

      const defaultFeatures = defaultFeaturesForBusinessType(tenant.businessType);
      await replaceTenantFeatures(client, tenant.id, defaultFeatures);

      const owner = {
        id: createId("user"),
        name: ownerName,
        email,
        passwordHash,
        role: USER_ROLES.SUPER_ADMIN,
        status: "active",
        tenantId: tenant.id,
      };
      await insertUser(client, owner);

      // A self-registration must become usable as soon as the platform
      // approves it. Seed its owner with the complete permission ceiling for
      // the features included in this tenant's plan; feature middleware still
      // remains an independent runtime gate.
      const ownerPermissions = TENANT_BUSINESS_PERMISSIONS.filter((permission) =>
        permissionMatchesEnabledFeatures(permission, defaultFeatures),
      );
      await replaceRolePermissions(client, USER_ROLES.SUPER_ADMIN, tenant.id, ownerPermissions);

      await logActivity(this.auditService, client, { ...owner, tenantId: tenant.id }, {
        actionType: TENANT_ACTIONS.REGISTER,
        entityType: "tenant",
        entityId: tenant.id,
        description: `${ownerName} registered organization ${tenant.name}`,
        metadata: {
          name: tenant.name,
          slug: tenant.slug,
          businessType: tenant.businessType,
          sellerType: tenant.sellerType,
          phone,
        },
        after: { name: tenant.name, slug: tenant.slug, status: tenant.status },
      });

      return {
        response: { id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status },
        tenantId: tenant.id,
        defaultFeatures,
        ownerPermissions,
      };
    });

    // Do not publish uncommitted access data if a later write or COMMIT fails.
    setCachedFeatures(result.tenantId, result.defaultFeatures);
    setCachedPermissions(USER_ROLES.SUPER_ADMIN, result.tenantId, result.ownerPermissions);
    return result.response;
  }

  async listRegistrations() {
    const client = await this.databaseManager.getPool().connect();
    try {
      return await listRegistrationTenants(client);
    } finally {
      client.release();
    }
  }

  async approve(tenantId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const tenant = await findTenantById(client, tenantId);
      assert(tenant, "Registration not found.", 404);
      assert(tenant.status === "pending" || tenant.status === "rejected", "This registration has already been processed.", 409);
      const updated = await setTenantStatus(client, tenantId, "active");
      await logActivity(this.auditService, client, actor, {
        actionType: TENANT_ACTIONS.REGISTRATION_APPROVE,
        entityType: "tenant",
        entityId: tenantId,
        description: `${actor.name} approved registration for ${tenant.name}`,
        before: { status: tenant.status },
        after: { status: updated.status },
        metadata: { name: tenant.name, slug: tenant.slug },
      });
      return updated;
    });
  }

  async reject(tenantId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const tenant = await findTenantById(client, tenantId);
      assert(tenant, "Registration not found.", 404);
      assert(tenant.status === "pending", "Only pending registrations can be rejected.", 409);
      const updated = await setTenantStatus(client, tenantId, "rejected");
      await logActivity(this.auditService, client, actor, {
        actionType: TENANT_ACTIONS.REGISTRATION_REJECT,
        entityType: "tenant",
        entityId: tenantId,
        description: `${actor.name} rejected registration for ${tenant.name}`,
        before: { status: tenant.status },
        after: { status: updated.status },
        metadata: { name: tenant.name, slug: tenant.slug },
      });
      return updated;
    });
  }
}
