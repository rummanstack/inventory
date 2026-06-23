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

  byDsr = async (req, res, next) => {
    try {
      res.json(await this.profitService.getDsrProfitBreakdown(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  byProduct = async (req, res, next) => {
    try {
      res.json(await this.profitService.getProductProfitBreakdown(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  byCategory = async (req, res, next) => {
    try {
      res.json(await this.profitService.getCategoryProfitBreakdown(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  byCustomer = async (req, res, next) => {
    try {
      res.json(await this.profitService.getCustomerProfitBreakdown(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
