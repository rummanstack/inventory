export class SystemController {
  constructor(systemService, errorLogService, env, invariantService) {
    this.systemService = systemService;
    this.errorLogService = errorLogService;
    this.env = env;
    this.invariantService = invariantService;
  }

  health = async (_req, res, next) => {
    try {
      res.json(await this.systemService.getHealth(this.env));
    } catch (error) {
      next(error);
    }
  };

  errorLogs = async (req, res, next) => {
    try {
      res.json(await this.errorLogService.list(req.query));
    } catch (error) {
      next(error);
    }
  };

  invariants = async (req, res, next) => {
    try {
      const tenantId = String(req.query.tenantId || "").trim() || null;
      res.json(await this.invariantService.checkAll(tenantId));
    } catch (error) {
      next(error);
    }
  };
}
