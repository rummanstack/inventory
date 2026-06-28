export class SalaryPaymentController {
  constructor(salaryPaymentService) {
    this.salaryPaymentService = salaryPaymentService;
  }

  overview = async (req, res, next) => {
    try {
      res.json(await this.salaryPaymentService.getOverview(req.query.month, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  record = async (req, res, next) => {
    try {
      const result = await this.salaryPaymentService.recordPayment(req.body || {}, req.currentUser);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.salaryPaymentService.deletePayment(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
