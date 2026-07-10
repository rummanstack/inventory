export class TradePromotionSettlementController {
  constructor(tradePromotionSettlementService) {
    this.tradePromotionSettlementService = tradePromotionSettlementService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.tradePromotionSettlementService.listSettlements(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  get = async (req, res, next) => {
    try {
      res.json(await this.tradePromotionSettlementService.getSettlement(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      res.status(201).json(await this.tradePromotionSettlementService.createSettlement(req.body, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.tradePromotionSettlementService.removeSettlement(req.params.id, req.currentUser, req.body?.reason));
    } catch (error) {
      next(error);
    }
  };

  restore = async (req, res, next) => {
    try {
      res.json(await this.tradePromotionSettlementService.restoreSettlement(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
