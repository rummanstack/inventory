import { Router } from "express";
import { requireFeature } from "../middleware/requireFeature.js";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createInstallmentRoutes(installmentController) {
  const router = Router();
  router.use(requireFeature("installment-sales"));

  // Report/collection routes must be registered before "/:id" — otherwise
  // Express would try to match "reports"/"customer-statement" as a plan id.
  router.get("/reports/due-schedule", requirePermission(PERMISSIONS.VIEW_INSTALLMENT_PLANS), installmentController.getDueScheduleReport);
  router.get("/reports/overdue", requirePermission(PERMISSIONS.VIEW_INSTALLMENT_PLANS), installmentController.getOverdueReport);
  router.get("/reports/collections", requirePermission(PERMISSIONS.VIEW_INSTALLMENT_PLANS), installmentController.getCollectionReport);
  router.get("/customer-statement", requirePermission(PERMISSIONS.VIEW_INSTALLMENT_PLANS), installmentController.getCustomerStatement);
  router.post("/payments", requirePermission(PERMISSIONS.COLLECT_INSTALLMENT_PAYMENT), installmentController.collectPayment);

  router.get("/", requirePermission(PERMISSIONS.VIEW_INSTALLMENT_PLANS), installmentController.listPlans);
  router.get("/:id", requirePermission(PERMISSIONS.VIEW_INSTALLMENT_PLANS), installmentController.getPlan);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_INSTALLMENT_PLANS), installmentController.createPlan);
  router.post("/:id/reschedule", requirePermission(PERMISSIONS.RESCHEDULE_INSTALLMENT_PLAN), installmentController.reschedulePlan);
  router.post("/:id/settle", requirePermission(PERMISSIONS.MANAGE_INSTALLMENT_PLANS), installmentController.settlePlan);
  router.post("/:id/write-off", requirePermission(PERMISSIONS.WRITE_OFF_INSTALLMENT_PLAN), installmentController.writeOffPlan);
  router.post("/:id/cancel", requirePermission(PERMISSIONS.CANCEL_INSTALLMENT_PLAN), installmentController.cancelPlan);

  return router;
}
