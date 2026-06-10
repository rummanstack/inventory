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
      const tenant = await this.tenantService.createTenant(req.body);
      res.status(201).json({ tenant });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const tenant = await this.tenantService.updateTenant(req.params.id, req.body);
      res.json({ tenant });
    } catch (error) {
      next(error);
    }
  };

  setStatus = async (req, res, next) => {
    try {
      const tenant = await this.tenantService.setStatus(req.params.id, req.body.status);
      res.json({ tenant });
    } catch (error) {
      next(error);
    }
  };
}
