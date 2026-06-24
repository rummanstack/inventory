export class TradeInController {
  constructor(tradeInService) {
    this.tradeInService = tradeInService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.tradeInService.listTradeIns(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  get = async (req, res, next) => {
    try {
      res.json(await this.tradeInService.getTradeIn(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const result = await this.tradeInService.createTradeIn(req.body || {}, req.currentUser);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.tradeInService.removeTradeIn(req.params.id, req.currentUser, req.body?.reason));
    } catch (error) {
      next(error);
    }
  };

  listTrash = async (req, res, next) => {
    try {
      res.json(await this.tradeInService.listTrashed(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
