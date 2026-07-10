export class TradePromotionRuleController {
  constructor(tradePromotionRuleService) {
    this.tradePromotionRuleService = tradePromotionRuleService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.tradePromotionRuleService.listRules(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  get = async (req, res, next) => {
    try {
      res.json(await this.tradePromotionRuleService.getRule(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      res.status(201).json(await this.tradePromotionRuleService.createRule(req.body, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      res.json(await this.tradePromotionRuleService.updateRule(req.params.id, req.body, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.tradePromotionRuleService.removeRule(req.params.id, req.currentUser, req.body?.reason));
    } catch (error) {
      next(error);
    }
  };

  restore = async (req, res, next) => {
    try {
      res.json(await this.tradePromotionRuleService.restoreRule(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  permanentlyDelete = async (req, res, next) => {
    try {
      res.json(await this.tradePromotionRuleService.permanentlyDeleteRule(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  listTrash = async (req, res, next) => {
    try {
      res.json(await this.tradePromotionRuleService.listTrashed(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
