import { Router } from "express";
import { requireFeature } from "../middleware/requireFeature.js";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createInstallmentRoutes(installmentController) {
  const router = Router();
  router.use(requireFeature("installment-sales"));

  router.get("/", requirePermission(PERMISSIONS.VIEW_INSTALLMENT_PLANS), installmentController.listPlans);
  router.get("/:id", requirePermission(PERMISSIONS.VIEW_INSTALLMENT_PLANS), installmentController.getPlan);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_INSTALLMENT_PLANS), installmentController.createPlan);
  router.post("/payments", requirePermission(PERMISSIONS.COLLECT_INSTALLMENT_PAYMENT), installmentController.collectPayment);

  return router;
}
