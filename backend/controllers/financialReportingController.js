export class FinancialReportingController {
  constructor(financialReportingService) {
    this.financialReportingService = financialReportingService;
  }

  referenceData = async (req, res, next) => {
    try {
      res.json(await this.financialReportingService.getReferenceData(req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  trialBalance = async (req, res, next) => {
    try {
      res.json(await this.financialReportingService.getTrialBalance(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  generalLedger = async (req, res, next) => {
    try {
      res.json(await this.financialReportingService.getGeneralLedger(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  accountLedger = async (req, res, next) => {
    try {
      res.json(await this.financialReportingService.getGeneralLedger(req.query, req.currentUser, { requireAccount: true }));
    } catch (error) {
      next(error);
    }
  };

  customerLedger = async (req, res, next) => {
    try {
      res.json(await this.financialReportingService.getCustomerLedger(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  supplierLedger = async (req, res, next) => {
    try {
      res.json(await this.financialReportingService.getSupplierLedger(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  cashBook = async (req, res, next) => {
    try {
      res.json(await this.financialReportingService.getCashBook(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  bankBook = async (req, res, next) => {
    try {
      res.json(await this.financialReportingService.getBankBook(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  profitAndLoss = async (req, res, next) => {
    try {
      res.json(await this.financialReportingService.getProfitAndLoss(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  balanceSheet = async (req, res, next) => {
    try {
      res.json(await this.financialReportingService.getBalanceSheet(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  cashFlow = async (req, res, next) => {
    try {
      res.json(await this.financialReportingService.getCashFlow(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
