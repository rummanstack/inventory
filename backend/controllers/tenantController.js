import { TENANT_FEATURES } from "../lib/features.js";

export class TenantController {
  constructor(tenantService) {
    this.tenantService = tenantService;
  }

  list = async (_req, res, next) => {
    try {
      res.json({ tenants: await this.tenantService.listTenants() });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const tenant = await this.tenantService.createTenant(req.body, req.currentUser);
      res.status(201).json({ tenant });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const tenant = await this.tenantService.updateTenant(req.params.id, req.body, req.currentUser);
      res.json({ tenant });
    } catch (error) {
      next(error);
    }
  };

  setStatus = async (req, res, next) => {
    try {
      const tenant = await this.tenantService.setStatus(req.params.id, req.body.status, req.currentUser);
      res.json({ tenant });
    } catch (error) {
      next(error);
    }
  };

  getFeatures = async (req, res, next) => {
    try {
      const features = await this.tenantService.getTenantFeatures(req.params.id);
      res.json({ features, allFeatures: TENANT_FEATURES });
    } catch (error) {
      next(error);
    }
  };

  updateFeatures = async (req, res, next) => {
    try {
      const features = await this.tenantService.updateTenantFeatures(req.params.id, req.body.features, req.currentUser);
      res.json({ features });
    } catch (error) {
      next(error);
    }
  };
}
