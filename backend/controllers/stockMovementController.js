export class StockMovementController {
  constructor(stockMovementService) {
    this.stockMovementService = stockMovementService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.stockMovementService.listMovements(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  stockMovementReport = async (req, res, next) => {
    try {
      res.json(await this.stockMovementService.getStockMovementReport(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  damagedStockReport = async (req, res, next) => {
    try {
      res.json(await this.stockMovementService.getDamagedStockReport(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
