export class RetailPromotionController {
  constructor(retailPromotionService) {
    this.retailPromotionService = retailPromotionService;
  }

  list = async (req, res, next) => {
    try {
      res.json({ promotions: await this.retailPromotionService.listRetailPromotions(req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      res.status(201).json({ promotion: await this.retailPromotionService.createRetailPromotion(req.body, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      res.json({ promotion: await this.retailPromotionService.updateRetailPromotion(req.params.id, req.body, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.retailPromotionService.deleteRetailPromotion(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
