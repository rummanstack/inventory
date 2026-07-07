export class PurchaseReturnController {
  constructor(purchaseReturnService) {
    this.purchaseReturnService = purchaseReturnService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.purchaseReturnService.listPurchaseReturns(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  get = async (req, res, next) => {
    try {
      const purchaseReturn = await this.purchaseReturnService.getPurchaseReturn(req.params.id, req.currentUser);
      res.json({ purchaseReturn });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const purchaseReturn = await this.purchaseReturnService.savePurchaseReturn(req.body, req.currentUser);
      res.status(201).json({ purchaseReturn });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.purchaseReturnService.removePurchaseReturn(req.params.id, req.currentUser, req.body?.reason));
    } catch (error) {
      next(error);
    }
  };
}
