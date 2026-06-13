export class PurchaseReceiveController {
  constructor(purchaseReceiveService) {
    this.purchaseReceiveService = purchaseReceiveService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.purchaseReceiveService.listPurchaseReceipts(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  get = async (req, res, next) => {
    try {
      const purchaseReceipt = await this.purchaseReceiveService.getPurchaseReceipt(req.params.id, req.currentUser);
      res.json({ purchaseReceipt });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const purchaseReceipt = await this.purchaseReceiveService.savePurchaseReceipt(req.body, req.currentUser);
      res.status(201).json({ purchaseReceipt });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const purchaseReceipt = await this.purchaseReceiveService.savePurchaseReceipt({ ...req.body, id: req.params.id }, req.currentUser);
      res.json({ purchaseReceipt });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.purchaseReceiveService.removePurchaseReceipt(req.params.id, req.currentUser, req.body?.reason));
    } catch (error) {
      next(error);
    }
  };

  listTrash = async (req, res, next) => {
    try {
      res.json(await this.purchaseReceiveService.listTrashedPurchaseReceipts(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  restore = async (req, res, next) => {
    try {
      res.json(await this.purchaseReceiveService.restorePurchaseReceipt(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
