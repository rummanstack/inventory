export class CustomerDueLedgerController {
  constructor(customerDueLedgerService) {
    this.customerDueLedgerService = customerDueLedgerService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.customerDueLedgerService.listLedger(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  statement = async (req, res, next) => {
    try {
      res.json(await this.customerDueLedgerService.getStatement(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  balance = async (req, res, next) => {
    try {
      res.json(await this.customerDueLedgerService.getBalance(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
