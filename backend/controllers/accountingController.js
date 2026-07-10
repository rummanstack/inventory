export class AccountingController {
  constructor(accountingService) {
    this.accountingService = accountingService;
  }

  dashboard = async (req, res, next) => {
    try {
      res.json(await this.accountingService.getDashboard(req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  listAccounts = async (req, res, next) => {
    try {
      res.json({ accounts: await this.accountingService.listAccounts(req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  createAccount = async (req, res, next) => {
    try {
      res.status(201).json({ account: await this.accountingService.createAccount(req.body || {}, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  updateAccount = async (req, res, next) => {
    try {
      res.json({ account: await this.accountingService.updateAccount(req.params.code, req.body || {}, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  listFiscalYears = async (req, res, next) => {
    try {
      res.json({ fiscalYears: await this.accountingService.listFiscalYears(req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  createFiscalYear = async (req, res, next) => {
    try {
      res.status(201).json({ fiscalYear: await this.accountingService.createFiscalYear(req.body || {}, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  activateFiscalYear = async (req, res, next) => {
    try {
      res.json({ fiscalYear: await this.accountingService.activateFiscalYear(req.params.id, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  closeFiscalYear = async (req, res, next) => {
    try {
      res.json({ fiscalYear: await this.accountingService.closeFiscalYear(req.params.id, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  openPeriod = async (req, res, next) => {
    try {
      res.json({ period: await this.accountingService.transitionPeriod(req.params.id, 'open', req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  closePeriod = async (req, res, next) => {
    try {
      res.json({ period: await this.accountingService.transitionPeriod(req.params.id, 'close', req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  lockPeriod = async (req, res, next) => {
    try {
      res.json({ period: await this.accountingService.transitionPeriod(req.params.id, 'lock', req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  reopenPeriod = async (req, res, next) => {
    try {
      res.json({ period: await this.accountingService.transitionPeriod(req.params.id, 'reopen', req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  listOpeningBalances = async (req, res, next) => {
    try {
      res.json({ openingBalances: await this.accountingService.listOpeningBalances(req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  createOpeningBalance = async (req, res, next) => {
    try {
      res.status(201).json({ openingBalance: await this.accountingService.createOpeningBalance(req.body || {}, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  updateOpeningBalance = async (req, res, next) => {
    try {
      res.json({ openingBalance: await this.accountingService.updateOpeningBalance(req.params.id, req.body || {}, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  getSettings = async (req, res, next) => {
    try {
      res.json({ settings: await this.accountingService.getSettings(req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  updateSettings = async (req, res, next) => {
    try {
      res.json({ settings: await this.accountingService.updateSettings(req.body || {}, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };
}
