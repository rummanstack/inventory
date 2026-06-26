export class PayrollController {
  constructor(payrollService) {
    this.payrollService = payrollService;
  }

  list = async (req, res, next) => {
    try {
      const result = await this.payrollService.listPayrolls(req.query, req.currentUser);
      res.json(result);
    } catch (err) { next(err); }
  };

  get = async (req, res, next) => {
    try {
      const result = await this.payrollService.getPayroll(req.params.id, req.currentUser);
      res.json(result);
    } catch (err) { next(err); }
  };

  generate = async (req, res, next) => {
    try {
      const result = await this.payrollService.generatePayroll(req.body, req.currentUser);
      res.status(201).json(result);
    } catch (err) { next(err); }
  };

  updateItem = async (req, res, next) => {
    try {
      await this.payrollService.updateItem(req.params.id, req.params.itemId, req.body, req.currentUser);
      res.json({ success: true });
    } catch (err) { next(err); }
  };

  approve = async (req, res, next) => {
    try {
      await this.payrollService.approvePayroll(req.params.id, req.currentUser);
      res.json({ success: true });
    } catch (err) { next(err); }
  };

  pay = async (req, res, next) => {
    try {
      await this.payrollService.payPayroll(req.params.id, req.body, req.currentUser);
      res.json({ success: true });
    } catch (err) { next(err); }
  };

  remove = async (req, res, next) => {
    try {
      await this.payrollService.deletePayroll(req.params.id, req.currentUser);
      res.json({ success: true });
    } catch (err) { next(err); }
  };

  getPayslip = async (req, res, next) => {
    try {
      const result = await this.payrollService.getPayslip(
        req.params.id, req.params.employeeId, req.currentUser,
      );
      res.json(result);
    } catch (err) { next(err); }
  };
}
