export class AiInsightController {
  constructor(aiInsightService) {
    this.aiInsightService = aiInsightService;
  }

  status = async (_req, res, next) => {
    try {
      res.json(this.aiInsightService.getStatus());
    } catch (error) {
      next(error);
    }
  };

  customerInsight = async (req, res, next) => {
    try {
      res.json(await this.aiInsightService.customerInsight(req.params.customerId, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  lowStockAdvice = async (req, res, next) => {
    try {
      res.json(await this.aiInsightService.lowStockAdvice(req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  chat = async (req, res, next) => {
    try {
      res.json(await this.aiInsightService.chat(req.body, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
