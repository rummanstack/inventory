export class DrugBatchController {
  constructor(drugBatchService) {
    this.drugBatchService = drugBatchService;
  }

  listByProduct = async (req, res, next) => {
    try {
      const result = await this.drugBatchService.listByProduct(req.params.productId, req.currentUser);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  listExpiring = async (req, res, next) => {
    try {
      const daysAhead = req.query.daysAhead || 90;
      const result = await this.drugBatchService.listExpiring(req.currentUser, daysAhead);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
