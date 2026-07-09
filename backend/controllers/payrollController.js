export class PayrollController {
  constructor(payrollService) {
    this.payrollService = payrollService;
  }

  listSalaryStructures = async (req, res, next) => {
    try {
      res.json({ items: await this.payrollService.listSalaryStructures(req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  saveSalaryStructure = async (req, res, next) => {
    try {
      const salaryStructure = await this.payrollService.saveSalaryStructure(req.body || {}, req.currentUser);
      res.json({ salaryStructure });
    } catch (error) {
      next(error);
    }
  };

  listRuns = async (req, res, next) => {
    try {
      res.json({ items: await this.payrollService.listPayrollRuns(req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  getRun = async (req, res, next) => {
    try {
      res.json(await this.payrollService.getPayrollRun(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  generate = async (req, res, next) => {
    try {
      const result = await this.payrollService.generatePayroll(req.body || {}, req.currentUser);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  approve = async (req, res, next) => {
    try {
      const run = await this.payrollService.approvePayroll(req.params.id, req.body || {}, req.currentUser);
      res.json({ run });
    } catch (error) {
      next(error);
    }
  };

  pay = async (req, res, next) => {
    try {
      const run = await this.payrollService.payPayroll(req.params.id, req.body || {}, req.currentUser);
      res.json({ run });
    } catch (error) {
      next(error);
    }
  };
  payslip = async (req, res, next) => {
    try {
      res.json(await this.payrollService.getPayslip(req.params.id, req.params.employeeId, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  register = async (req, res, next) => {
    try {
      res.json(await this.payrollService.payrollRegister(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}

