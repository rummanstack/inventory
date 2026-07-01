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


  listBatchSalesReport = async (req, res, next) => {
    try {
      const result = await this.drugBatchService.batchSalesReport(req.query, req.currentUser);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
