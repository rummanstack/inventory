export class SettlementController {
  constructor(settlementService) {
    this.settlementService = settlementService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.settlementService.listSettlements(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const settlement = await this.settlementService.saveSettlement(req.body, req.currentUser);
      res.status(201).json({ settlement });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const settlement = await this.settlementService.updateSettlement(req.params.id, req.body, req.currentUser);
      res.json({ settlement });
    } catch (error) {
      next(error);
    }
  };

  settlementReport = async (req, res, next) => {
    try {
      res.json(await this.settlementService.getSettlementReport(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
