export class PermissionController {
  constructor(permissionService) {
    this.permissionService = permissionService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.permissionService.getPermissions(req.currentUser));
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
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
