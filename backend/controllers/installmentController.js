export class InstallmentController {
  constructor(installmentPlanService) {
    this.installmentPlanService = installmentPlanService;
  }

  createPlan = async (req, res, next) => {
    try {
      const result = await this.installmentPlanService.createPlan(req.body, req.currentUser);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  getPlan = async (req, res, next) => {
    try {
      const result = await this.installmentPlanService.getPlan(req.params.id, req.currentUser);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  listPlans = async (req, res, next) => {
    try {
      const result = await this.installmentPlanService.listPlans(req.query, req.currentUser);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  collectPayment = async (req, res, next) => {
    try {
      const result = await this.installmentPlanService.collectPayment(req.body, req.currentUser);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };
}
