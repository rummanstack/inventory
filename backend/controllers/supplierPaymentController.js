export class SupplierPaymentController {
  constructor(supplierPaymentService) {
    this.supplierPaymentService = supplierPaymentService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.supplierPaymentService.listSupplierPayments(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  get = async (req, res, next) => {
    try {
      const payment = await this.supplierPaymentService.getSupplierPayment(req.params.id, req.currentUser);
      res.json({ payment });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const payment = await this.supplierPaymentService.saveSupplierPayment(req.body, req.currentUser);
      res.status(201).json({ payment });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const payment = await this.supplierPaymentService.saveSupplierPayment({ ...req.body, id: req.params.id }, req.currentUser);
      res.json({ payment });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.supplierPaymentService.removeSupplierPayment(req.params.id, req.currentUser, req.body?.reason));
    } catch (error) {
      next(error);
    }
  };

  listTrash = async (req, res, next) => {
    try {
      res.json(await this.supplierPaymentService.listTrashedSupplierPayments(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  restore = async (req, res, next) => {
    try {
      res.json(await this.supplierPaymentService.restoreSupplierPayment(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
