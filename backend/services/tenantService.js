import { randomUUID } from "crypto";
import {
  findTenantById,
  findTenantBySlug,
  insertTenant,
  listTenants,
  setTenantStatus,
  updateTenant,
} from "../repositories/tenantRepository.js";
import {
  hasTenantFeatureConfig,
  listTenantFeatures,
  replaceTenantFeatures,
} from "../repositories/tenantFeatureRepository.js";
import { TENANT_ACTIONS } from "../lib/auditActions.js";
import { TENANT_FEATURES } from "../lib/features.js";
import { BUSINESS_TYPES, BUSINESS_TYPE_VALUES, SELLER_TYPES, SELLER_TYPE_VALUES } from "../lib/businessTypes.js";
import { setCachedFeatures } from "../lib/tenantFeatureCache.js";
import { assert } from "../lib/errors.js";
import { logActivity } from "./shared/inventoryHelpers.js";

function normalizeTaxRate(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.min(Math.max(0, parsed), 100);
}

function normalizeLoyaltyEnabled(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function normalizeLoyaltyPointsPer100(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.min(Math.max(0, parsed), 1000);
}

function normalizeLoyaltyPointValue(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.min(Math.max(0, parsed), 1000000);
}

// business_type drives which industry-specific fields/flows (electronics serials &
// warranty vs. grocery expiry/batch) apply later — it's independent of tenant_features
// (which menus are on) and role_permissions (what a role can do).
function normalizeBusinessType(value, fallback = BUSINESS_TYPES.ELECTRONICS) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const businessType = String(value).trim().toUpperCase();
  assert(BUSINESS_TYPE_VALUES.includes(businessType), `Invalid business type: ${value}`, 400);
  return businessType;
}

function normalizeSellerType(value, fallback = SELLER_TYPES.DEALER) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const sellerType = String(value).trim().toUpperCase();
  assert(SELLER_TYPE_VALUES.includes(sellerType), `Invalid seller type: ${value}`, 400);
  return sellerType;
}

// Dealer/DSR distribution (morning issue, evening settlement, DSR finance/due ledger) is
// a grocery-distribution concept and doesn't apply to electronics retail. Serial/warranty
// tracking is the reverse — an electronics concept that doesn't apply to grocery. New
// tenants get a feature set that matches their business type by default; this only runs
// at creation time so it never silently removes a feature an existing tenant relies on.
const DEALER_DISTRIBUTION_FEATURES = ["dsrs", "customers", "morning-issue", "settlements", "dsr-finance"];
const ELECTRONICS_ONLY_FEATURES = ["product-serials", "warranty-claims", "repair-jobs", "trade-ins"];
const PHARMACY_EXCLUDED_FEATURES = ["product-serials", "warranty-claims", "repair-jobs", "trade-ins"];

function defaultFeaturesForBusinessType(businessType) {
  let excluded = DEALER_DISTRIBUTION_FEATURES;
  if (businessType === BUSINESS_TYPES.GROCERY) excluded = ELECTRONICS_ONLY_FEATURES;
  if (businessType === BUSINESS_TYPES.DRUG_PHARMACY) excluded = PHARMACY_EXCLUDED_FEATURES;
  return TENANT_FEATURES.filter((feature) => !excluded.includes(feature));
}

export class TenantService {
  constructor(databaseManager, { auditService } = {}) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async listTenants() {
    const client = await this.databaseManager.getPool().connect();
    try {
      return await listTenants(client);
    } finally {
      client.release();
    }
  }

  async createTenant({ name, slug, email, plan = "starter", address, logoUrl, taxRate = 0, loyaltyEnabled = false, loyaltyPointsPer100 = 1, loyaltyPointValue = 1, businessType, sellerType }, actor) {
    assert(name && slug && email, "name, slug and email are required", 400);
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findTenantBySlug(client, slug);
      assert(!existing, "Organization code already in use", 409);
      const tenant = {
        id: `tenant_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
        name,
        slug: slug.toLowerCase().trim(),
        email,
        plan,
        status: "active",
        address: address || null,
        logoUrl: logoUrl || null,
        taxRate: normalizeTaxRate(taxRate),
        loyaltyEnabled: normalizeLoyaltyEnabled(loyaltyEnabled),
        loyaltyPointsPer100: normalizeLoyaltyPointsPer100(loyaltyPointsPer100),
        loyaltyPointValue: normalizeLoyaltyPointValue(loyaltyPointValue),
        businessType: normalizeBusinessType(businessType),
        sellerType: normalizeSellerType(sellerType),
      };
      const created = await insertTenant(client, tenant);
      const defaultFeatures = defaultFeaturesForBusinessType(created.businessType);
      await replaceTenantFeatures(client, created.id, defaultFeatures);
      setCachedFeatures(created.id, defaultFeatures);
      await logActivity(this.auditService, client, actor, {
        actionType: TENANT_ACTIONS.CREATE,
        entityType: "tenant",
        entityId: created.id,
        description: `${actor.name} created organization ${created.name}`,
        metadata: {
          name: created.name,
          slug: created.slug,
          plan: created.plan,
          businessType: created.businessType,
          sellerType: created.sellerType,
        },
        after: {
          name: created.name,
          slug: created.slug,
          plan: created.plan,
          status: created.status,
          businessType: created.businessType,
          sellerType: created.sellerType,
        },
      });
      return created;
    });
  }

  async updateTenant(tenantId, fields, actor) {
    const client = await this.databaseManager.getPool().connect();
    try {
      const existing = await findTenantById(client, tenantId);
      assert(existing, "Organization not found", 404);
      if (fields.slug && fields.slug !== existing.slug) {
        const conflict = await findTenantBySlug(client, fields.slug);
        assert(!conflict, "Organization code already in use", 409);
      }
      const updated = {
        ...existing,
        name: fields.name ?? existing.name,
        slug: fields.slug ? fields.slug.toLowerCase().trim() : existing.slug,
        email: fields.email ?? existing.email,
        plan: fields.plan ?? existing.plan,
        address: fields.address !== undefined ? fields.address : existing.address,
        logoUrl: fields.logoUrl !== undefined ? fields.logoUrl : existing.logoUrl,
        taxRate: fields.taxRate !== undefined ? normalizeTaxRate(fields.taxRate) : existing.taxRate ?? 0,
        loyaltyEnabled: fields.loyaltyEnabled !== undefined ? normalizeLoyaltyEnabled(fields.loyaltyEnabled) : existing.loyaltyEnabled ?? false,
        loyaltyPointsPer100: fields.loyaltyPointsPer100 !== undefined ? normalizeLoyaltyPointsPer100(fields.loyaltyPointsPer100) : existing.loyaltyPointsPer100 ?? 1,
        loyaltyPointValue: fields.loyaltyPointValue !== undefined ? normalizeLoyaltyPointValue(fields.loyaltyPointValue) : existing.loyaltyPointValue ?? 1,
        businessType: fields.businessType !== undefined ? normalizeBusinessType(fields.businessType) : existing.businessType ?? BUSINESS_TYPES.ELECTRONICS,
        sellerType: fields.sellerType !== undefined ? normalizeSellerType(fields.sellerType) : existing.sellerType ?? SELLER_TYPES.DEALER,
      };
      const saved = await updateTenant(client, updated);
      await logActivity(this.auditService, client, actor, {
        actionType: TENANT_ACTIONS.UPDATE,
        entityType: "tenant",
        entityId: tenantId,
        description: `${actor.name} updated organization ${saved.name}`,
        metadata: {
          name: saved.name,
          slug: saved.slug,
          plan: saved.plan,
        },
        before: {
          name: existing.name,
          slug: existing.slug,
          email: existing.email,
          plan: existing.plan,
          status: existing.status,
          businessType: existing.businessType,
          sellerType: existing.sellerType,
        },
        after: {
          name: saved.name,
          slug: saved.slug,
          email: saved.email,
          plan: saved.plan,
          status: saved.status,
          businessType: saved.businessType,
          sellerType: saved.sellerType,
        },
      });
      return saved;
    } finally {
      client.release();
    }
  }

  async setStatus(tenantId, status, actor) {
    assert(status === "active" || status === "inactive", "status must be active or inactive", 400);
    const client = await this.databaseManager.getPool().connect();
    try {
      const existing = await findTenantById(client, tenantId);
      assert(existing, "Organization not found", 404);
      const updated = await setTenantStatus(client, tenantId, status);
      await logActivity(this.auditService, client, actor, {
        actionType: TENANT_ACTIONS.STATUS_UPDATE,
        entityType: "tenant",
        entityId: tenantId,
        description: `${actor.name} changed organization ${updated.name} status to ${status}`,
        before: { status: existing.status },
        after: { status: updated.status },
        metadata: { name: updated.name },
      });
      return updated;
    } finally {
      client.release();
    }
  }

  async getTenantFeatures(tenantId) {
    const client = await this.databaseManager.getPool().connect();
    try {
      const configured = await hasTenantFeatureConfig(client, tenantId);
      if (!configured) {
        return [...TENANT_FEATURES];
      }
      return await listTenantFeatures(client, tenantId);
    } finally {
      client.release();
    }
  }

  async updateTenantFeatures(tenantId, features, actor) {
    assert(Array.isArray(features), "features must be an array", 400);

    const cleanFeatures = [...new Set(features.map((feature) => String(feature)))];
    for (const feature of cleanFeatures) {
      assert(TENANT_FEATURES.includes(feature), `Unknown feature: ${feature}`, 400);
    }

    const client = await this.databaseManager.getPool().connect();
    try {
      const existing = await findTenantById(client, tenantId);
      assert(existing, "Organization not found", 404);
      const configured = await hasTenantFeatureConfig(client, tenantId);
      const previousFeatures = configured ? await listTenantFeatures(client, tenantId) : [...TENANT_FEATURES];
      await replaceTenantFeatures(client, tenantId, cleanFeatures);
      setCachedFeatures(tenantId, cleanFeatures);
      await logActivity(this.auditService, client, actor, {
        actionType: TENANT_ACTIONS.FEATURES_UPDATE,
        entityType: "tenant",
        entityId: tenantId,
        description: `${actor.name} updated features for organization ${existing.name}`,
        before: { features: previousFeatures },
        after: { features: cleanFeatures },
        metadata: { name: existing.name, featureCount: cleanFeatures.length },
      });
      return cleanFeatures;
    } finally {
      client.release();
    }
  }
}
