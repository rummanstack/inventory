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
import { assert } from "../lib/errors.js";

function normalizeTaxRate(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.min(Math.max(0, parsed), 100);
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

  async createTenant({ name, slug, email, plan = "starter", address, logoUrl, taxRate = 0 }) {
    assert(name && slug && email, "name, slug and email are required", 400);
    const client = await this.databaseManager.getPool().connect();
    try {
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
      };
      return await insertTenant(client, tenant);
    } finally {
      client.release();
    }
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
      return cleanFeatures;
    } finally {
      client.release();
    }
  }
}
