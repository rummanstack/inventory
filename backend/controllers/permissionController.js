export class PermissionController {
  constructor(permissionService) {
    this.permissionService = permissionService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.permissionService.getPermissions(req.currentUser, req.query.tenantId));
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const result = await this.permissionService.updateRolePermissions(
        req.params.role,
        req.body.permissions,
        req.currentUser,
        req.body.tenantId,
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
