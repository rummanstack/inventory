export class SettlementController {
  constructor(inventoryService) {
    this.inventoryService = inventoryService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.inventoryService.listSettlements(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const settlement = await this.inventoryService.saveSettlement(req.body, req.currentUser);
      res.status(201).json({ settlement });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const settlement = await this.inventoryService.updateSettlement(req.params.id, req.body, req.currentUser);
      res.json({ settlement });
    } catch (error) {
      next(error);
    }
  };
}
