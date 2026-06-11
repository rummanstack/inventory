export class DsrDueLedgerController {
  constructor(dsrDueLedgerService) {
    this.dsrDueLedgerService = dsrDueLedgerService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.dsrDueLedgerService.listLedger(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  statement = async (req, res, next) => {
    try {
      res.json(await this.dsrDueLedgerService.getStatement(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  balance = async (req, res, next) => {
    try {
      res.json(await this.dsrDueLedgerService.getBalance(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  settle = async (req, res, next) => {
    try {
      res.json(await this.dsrDueLedgerService.settleDue(req.body, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
