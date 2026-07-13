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

  getDueScheduleReport = async (req, res, next) => {
    try {
      const result = await this.installmentPlanService.getDueScheduleReport(req.query, req.currentUser);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getOverdueReport = async (req, res, next) => {
    try {
      const result = await this.installmentPlanService.getOverdueReport(req.currentUser);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getCollectionReport = async (req, res, next) => {
    try {
      const result = await this.installmentPlanService.getCollectionReport(req.query, req.currentUser);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getCustomerStatement = async (req, res, next) => {
    try {
      const result = await this.installmentPlanService.getCustomerStatement(req.query, req.currentUser);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  reschedulePlan = async (req, res, next) => {
    try {
      const result = await this.installmentPlanService.reschedulePlan({ ...req.body, planId: req.params.id }, req.currentUser);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  settlePlan = async (req, res, next) => {
    try {
      const result = await this.installmentPlanService.settlePlan({ ...req.body, planId: req.params.id }, req.currentUser);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  writeOffPlan = async (req, res, next) => {
    try {
      const result = await this.installmentPlanService.writeOffPlan({ ...req.body, planId: req.params.id }, req.currentUser);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  cancelPlan = async (req, res, next) => {
    try {
      const result = await this.installmentPlanService.cancelPlan({ ...req.body, planId: req.params.id }, req.currentUser);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getCreditCheck = async (req, res, next) => {
    try {
      const result = await this.installmentPlanService.getCreditCheck(req.query, req.currentUser);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  updateCustomerCreditSettings = async (req, res, next) => {
    try {
      const result = await this.installmentPlanService.updateCustomerCreditSettings(
        { ...req.body, customerId: req.params.customerId },
        req.currentUser,
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  addGuarantor = async (req, res, next) => {
    try {
      const result = await this.installmentPlanService.addGuarantor({ ...req.body, planId: req.params.id }, req.currentUser);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  removeGuarantor = async (req, res, next) => {
    try {
      const result = await this.installmentPlanService.removeGuarantor(
        { planId: req.params.id, guarantorId: req.params.guarantorId },
        req.currentUser,
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  attachDocument = async (req, res, next) => {
    try {
      const result = await this.installmentPlanService.attachDocument({ ...req.body, planId: req.params.id }, req.currentUser);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  removeDocument = async (req, res, next) => {
    try {
      const result = await this.installmentPlanService.removeDocument(
        { planId: req.params.id, documentId: req.params.documentId },
        req.currentUser,
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
