export class ProfitController {
  constructor(profitService) {
    this.profitService = profitService;
  }

  report = async (req, res, next) => {
    try {
      const report = await this.profitService.getProfitReport(req.query, req.currentUser);
      res.json(report);
    } catch (error) {
      next(error);
    }
  };
}
