export class DashboardController {
  constructor(dashboardService) {
    this.dashboardService = dashboardService;
  }

  getDashboard = async (req, res, next) => {
    try {
      res.json(await this.dashboardService.getDashboard(req.query || {}, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
