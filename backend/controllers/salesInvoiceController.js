export class SalesInvoiceController {
  constructor(salesInvoiceService) {
    this.salesInvoiceService = salesInvoiceService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.salesInvoiceService.listSalesInvoices(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  get = async (req, res, next) => {
    try {
      const invoice = await this.salesInvoiceService.getSalesInvoice(req.params.id, req.currentUser);
      res.json({ invoice });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const invoice = await this.salesInvoiceService.saveSalesInvoice(req.body, req.currentUser);
      res.status(201).json({ invoice });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.salesInvoiceService.removeSalesInvoice(req.params.id, req.currentUser, req.body?.reason));
    } catch (error) {
      next(error);
    }
  };

  listTrash = async (req, res, next) => {
    try {
      res.json(await this.salesInvoiceService.listTrashedSalesInvoices(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  restore = async (req, res, next) => {
    try {
      res.json(await this.salesInvoiceService.restoreSalesInvoice(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  dailySalesReport = async (req, res, next) => {
    try {
      res.json(await this.salesInvoiceService.getDailySalesReport(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

}
