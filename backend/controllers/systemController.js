export class SystemController {
  constructor(systemService, errorLogService, env) {
    this.systemService = systemService;
    this.errorLogService = errorLogService;
    this.env = env;
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
}
