export class DsrDashboardController {
  constructor(dsrDashboardService) {
    this.dsrDashboardService = dsrDashboardService;
  }

  getDashboard = async (req, res, next) => {
    try {
      res.json(await this.dsrDashboardService.getDashboard(req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
