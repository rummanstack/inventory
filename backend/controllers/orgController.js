export class OrgController {
  constructor(tenantService) {
    this.tenantService = tenantService;
  }

  update = async (req, res, next) => {
    try {
      // businessType (and sellerType) drive which industry-specific modules a tenant
      // gets by default and are set at onboarding — only a platform admin can change
      // them (via /platform/tenants/:id), never the tenant owner through org settings.
      const { businessType, sellerType, ...allowedFields } = req.body;
      const tenant = await this.tenantService.updateTenant(req.currentUser.tenantId, allowedFields, req.currentUser);
      res.json({ tenant });
    } catch (error) {
      next(error);
    }
  };
}
