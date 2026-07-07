export class JournalController {
  constructor(journalService) {
    this.journalService = journalService;
  }

  chartOfAccounts = async (req, res, next) => {
    try {
      res.json({ accounts: await this.journalService.getChartOfAccounts() });
    } catch (error) {
      next(error);
    }
  };

  generalLedger = async (req, res, next) => {
    try {
      res.json({ lines: await this.journalService.getGeneralLedger(req.query, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  trialBalance = async (req, res, next) => {
    try {
      res.json(await this.journalService.getTrialBalance(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  balanceSheet = async (req, res, next) => {
    try {
      res.json(await this.journalService.getBalanceSheet(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  profitAndLoss = async (req, res, next) => {
    try {
      res.json(await this.journalService.getProfitAndLoss(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
