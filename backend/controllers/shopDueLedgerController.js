export class ShopDueLedgerController {
  constructor(shopDueLedgerService) {
    this.shopDueLedgerService = shopDueLedgerService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.shopDueLedgerService.listLedger(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  statement = async (req, res, next) => {
    try {
      res.json(await this.shopDueLedgerService.getStatement(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  balance = async (req, res, next) => {
    try {
      res.json(await this.shopDueLedgerService.getBalance(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  recordDue = async (req, res, next) => {
    try {
      res.json(await this.shopDueLedgerService.recordDue(req.body, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  collect = async (req, res, next) => {
    try {
      res.json(await this.shopDueLedgerService.collectDue(req.body, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
