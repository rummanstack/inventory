export class SupplierDueLedgerController {
  constructor(supplierDueLedgerService) {
    this.supplierDueLedgerService = supplierDueLedgerService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.supplierDueLedgerService.listLedger(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  statement = async (req, res, next) => {
    try {
      res.json(await this.supplierDueLedgerService.getStatement(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  balance = async (req, res, next) => {
    try {
      res.json(await this.supplierDueLedgerService.getBalance(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
