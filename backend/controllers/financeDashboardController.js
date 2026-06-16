export class FinanceDashboardController {
  constructor(financeDashboardService) {
    this.financeDashboardService = financeDashboardService;
  }

  getDashboard = async (req, res, next) => {
    try {
      res.json(await this.financeDashboardService.getDashboard(req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  getRangeReport = async (req, res, next) => {
    try {
      res.json(await this.financeDashboardService.getRangeReport(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
