export class OrgController {
  constructor(tenantService) {
    this.tenantService = tenantService;
  }

  update = async (req, res, next) => {
    try {
      const tenant = await this.tenantService.updateTenant(req.currentUser.tenantId, req.body, req.currentUser);
      res.json({ tenant });
    } catch (error) {
      next(error);
    }
  };
}
