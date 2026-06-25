export class SrDueLedgerController {
  constructor(srDueLedgerService) {
    this.srDueLedgerService = srDueLedgerService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.srDueLedgerService.listLedger(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  statement = async (req, res, next) => {
    try {
      res.json(await this.srDueLedgerService.getStatement(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  balance = async (req, res, next) => {
    try {
      res.json(await this.srDueLedgerService.getBalance(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  collect = async (req, res, next) => {
    try {
      res.json(await this.srDueLedgerService.settleDue(req.body, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
