export class EmployeeFinanceController {
  constructor(employeeFinanceService) {
    this.employeeFinanceService = employeeFinanceService;
  }

  listAdvances = async (req, res, next) => {
    try {
      res.json({ items: await this.employeeFinanceService.listAdvances(req.query, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  requestAdvance = async (req, res, next) => {
    try {
      const advance = await this.employeeFinanceService.requestAdvance(req.body || {}, req.currentUser);
      res.status(201).json({ advance });
    } catch (error) {
      next(error);
    }
  };

  approveAdvance = async (req, res, next) => {
    try {
      const advance = await this.employeeFinanceService.approveAdvance(req.params.id, req.body || {}, req.currentUser);
      res.json({ advance });
    } catch (error) {
      next(error);
    }
  };

  rejectAdvance = async (req, res, next) => {
    try {
      const advance = await this.employeeFinanceService.rejectAdvance(req.params.id, req.body || {}, req.currentUser);
      res.json({ advance });
    } catch (error) {
      next(error);
    }
  };

  listLoans = async (req, res, next) => {
    try {
      res.json({ items: await this.employeeFinanceService.listLoans(req.query, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  requestLoan = async (req, res, next) => {
    try {
      const loan = await this.employeeFinanceService.requestLoan(req.body || {}, req.currentUser);
      res.status(201).json({ loan });
    } catch (error) {
      next(error);
    }
  };

  approveLoan = async (req, res, next) => {
    try {
      const loan = await this.employeeFinanceService.approveLoan(req.params.id, req.body || {}, req.currentUser);
      res.json({ loan });
    } catch (error) {
      next(error);
    }
  };

  rejectLoan = async (req, res, next) => {
    try {
      const loan = await this.employeeFinanceService.rejectLoan(req.params.id, req.body || {}, req.currentUser);
      res.json({ loan });
    } catch (error) {
      next(error);
    }
  };
}
