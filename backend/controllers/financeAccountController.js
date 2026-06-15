export class FinanceAccountController {
  constructor(financeAccountService) {
    this.financeAccountService = financeAccountService;
  }

  listAccounts = async (req, res, next) => {
    try {
      const accounts = await this.financeAccountService.listAccounts(req.currentUser);
      res.json({ accounts });
    } catch (error) {
      next(error);
    }
  };

  listTransactions = async (req, res, next) => {
    try {
      res.json(await this.financeAccountService.listTransactions(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  createTransaction = async (req, res, next) => {
    try {
      const transaction = await this.financeAccountService.recordTransaction(req.body, req.currentUser);
      res.status(201).json({ transaction });
    } catch (error) {
      next(error);
    }
  };

  createTransfer = async (req, res, next) => {
    try {
      res.status(201).json(await this.financeAccountService.recordTransfer(req.body, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  removeTransaction = async (req, res, next) => {
    try {
      res.json(await this.financeAccountService.removeTransaction(req.params.id, req.currentUser, req.body?.reason));
    } catch (error) {
      next(error);
    }
  };
}
