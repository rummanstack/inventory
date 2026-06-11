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
}
