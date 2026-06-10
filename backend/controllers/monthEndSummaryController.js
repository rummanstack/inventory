export class MonthEndSummaryController {
  constructor(monthEndSummaryService) {
    this.monthEndSummaryService = monthEndSummaryService;
  }

  getSummary = async (req, res, next) => {
    try {
      const summary = await this.monthEndSummaryService.getSummary(req.query, req.currentUser);
      res.json(summary);
    } catch (error) {
      next(error);
    }
  };
}
