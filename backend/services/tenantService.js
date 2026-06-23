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
import { TENANT_FEATURES } from "../lib/features.js";
import { BUSINESS_TYPES, BUSINESS_TYPE_VALUES } from "../lib/businessTypes.js";
import { setCachedFeatures } from "../lib/tenantFeatureCache.js";
import { assert } from "../lib/errors.js";

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

// Dealer/DSR distribution (morning issue, evening settlement, DSR finance/due ledger) is
// a grocery-distribution concept and doesn't apply to electronics retail. Serial/warranty
// tracking is the reverse — an electronics concept that doesn't apply to grocery. New
// tenants get a feature set that matches their business type by default; this only runs
// at creation time so it never silently removes a feature an existing tenant relies on.
const DEALER_DISTRIBUTION_FEATURES = ["dsrs", "customers", "morning-issue", "settlements", "dsr-finance"];
const ELECTRONICS_ONLY_FEATURES = ["product-serials", "warranty-claims"];

function defaultFeaturesForBusinessType(businessType) {
  const excluded = businessType === BUSINESS_TYPES.GROCERY ? ELECTRONICS_ONLY_FEATURES : DEALER_DISTRIBUTION_FEATURES;
  return TENANT_FEATURES.filter((feature) => !excluded.includes(feature));
}

export class TenantService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async listTenants() {
    const client = await this.databaseManager.getPool().connect();
    try {
      return await listTenants(client);
    } finally {
      client.release();
    }
  }

  async createTenant({ name, slug, email, plan = "starter", address, logoUrl, taxRate = 0, loyaltyEnabled = false, loyaltyPointsPer100 = 1, loyaltyPointValue = 1, businessType }) {
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
      };
      const created = await insertTenant(client, tenant);
      const defaultFeatures = defaultFeaturesForBusinessType(created.businessType);
      await replaceTenantFeatures(client, created.id, defaultFeatures);
      setCachedFeatures(created.id, defaultFeatures);
      return created;
    });
  }

  async updateTenant(tenantId, fields) {
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
      };
      return await updateTenant(client, updated);
    } finally {
      client.release();
    }
  }

  async setStatus(tenantId, status) {
    assert(status === "active" || status === "inactive", "status must be active or inactive", 400);
    const client = await this.databaseManager.getPool().connect();
    try {
      const existing = await findTenantById(client, tenantId);
      assert(existing, "Organization not found", 404);
      return await setTenantStatus(client, tenantId, status);
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

  async updateTenantFeatures(tenantId, features) {
    assert(Array.isArray(features), "features must be an array", 400);

    const cleanFeatures = [...new Set(features.map((feature) => String(feature)))];
    for (const feature of cleanFeatures) {
      assert(TENANT_FEATURES.includes(feature), `Unknown feature: ${feature}`, 400);
    }

    const client = await this.databaseManager.getPool().connect();
    try {
      const existing = await findTenantById(client, tenantId);
      assert(existing, "Organization not found", 404);
      await replaceTenantFeatures(client, tenantId, cleanFeatures);
      setCachedFeatures(tenantId, cleanFeatures);
      return cleanFeatures;
    } finally {
      client.release();
    }
  }
}
