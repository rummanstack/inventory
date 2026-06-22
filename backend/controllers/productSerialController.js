export class ProductSerialController {
  constructor(productSerialService) {
    this.productSerialService = productSerialService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.productSerialService.listSerials(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  get = async (req, res, next) => {
    try {
      res.json(await this.productSerialService.getSerial(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  listAvailable = async (req, res, next) => {
    try {
      res.json(await this.productSerialService.listAvailable(req.query.productId, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      res.status(201).json(await this.productSerialService.createSerial(req.body, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      res.json(await this.productSerialService.updateSerial(req.params.id, req.body, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.productSerialService.removeSerial(req.params.id, req.currentUser, req.body?.reason));
    } catch (error) {
      next(error);
    }
  };

  listTrash = async (req, res, next) => {
    try {
      res.json(await this.productSerialService.listTrashed(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
