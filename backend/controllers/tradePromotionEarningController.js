export class TradePromotionEarningController {
  constructor(tradePromotionEngineService) {
    this.tradePromotionEngineService = tradePromotionEngineService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.tradePromotionEngineService.listEarnings(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  get = async (req, res, next) => {
    try {
      res.json(await this.tradePromotionEngineService.getEarning(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  pendingReport = async (req, res, next) => {
    try {
      res.json(await this.tradePromotionEngineService.getPendingPromotionsReport(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  settledReport = async (req, res, next) => {
    try {
      res.json(await this.tradePromotionEngineService.getSettledPromotionsReport(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  supplierSummaryReport = async (req, res, next) => {
    try {
      res.json(await this.tradePromotionEngineService.getSupplierPromotionSummaryReport(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  productSummaryReport = async (req, res, next) => {
    try {
      res.json(await this.tradePromotionEngineService.getProductPromotionSummaryReport(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  dateWiseReport = async (req, res, next) => {
    try {
      res.json(await this.tradePromotionEngineService.getDateWisePromotionReportSummary(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
