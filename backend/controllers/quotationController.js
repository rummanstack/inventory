export class QuotationController {
  constructor(quotationService) {
    this.quotationService = quotationService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.quotationService.listQuotations(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  get = async (req, res, next) => {
    try {
      res.json(await this.quotationService.getQuotation(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const result = await this.quotationService.createQuotation(req.body || {}, req.currentUser);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      res.json(await this.quotationService.updateQuotation(req.params.id, req.body || {}, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  convert = async (req, res, next) => {
    try {
      res.json(await this.quotationService.convertToInvoice(req.params.id, req.body || {}, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.quotationService.removeQuotation(req.params.id, req.currentUser, req.body?.reason));
    } catch (error) {
      next(error);
    }
  };

  listTrash = async (req, res, next) => {
    try {
      res.json(await this.quotationService.listTrashed(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
