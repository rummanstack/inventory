export class RetailCashSessionController {
  constructor(retailCashSessionService) {
    this.retailCashSessionService = retailCashSessionService;
  }

  getCurrentSession = async (req, res, next) => {
    try {
      res.json(await this.retailCashSessionService.getCurrentSession(req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  startSession = async (req, res, next) => {
    try {
      const result = await this.retailCashSessionService.startSession(req.body || {}, req.currentUser);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  stopSession = async (req, res, next) => {
    try {
      res.json(await this.retailCashSessionService.stopSession(req.params.id, req.body || {}, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
