export class SalesReturnController {
  constructor(salesReturnService) {
    this.salesReturnService = salesReturnService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.salesReturnService.listSalesReturns(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  get = async (req, res, next) => {
    try {
      const salesReturn = await this.salesReturnService.getSalesReturn(req.params.id, req.currentUser);
      res.json({ salesReturn });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const salesReturn = await this.salesReturnService.saveSalesReturn(req.body, req.currentUser);
      res.status(201).json({ salesReturn });
    } catch (error) {
      next(error);
    }
  };

  salesReturnReport = async (req, res, next) => {
    try {
      res.json(await this.salesReturnService.getSalesReturnReport(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
