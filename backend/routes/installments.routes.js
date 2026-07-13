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
  router.get("/credit-check", requirePermission(PERMISSIONS.VIEW_INSTALLMENT_PLANS), installmentController.getCreditCheck);
  router.put(
    "/customers/:customerId/credit-settings",
    requirePermission(PERMISSIONS.MANAGE_INSTALLMENT_CREDIT_SETTINGS),
    installmentController.updateCustomerCreditSettings,
  );
  router.post("/payments", requirePermission(PERMISSIONS.COLLECT_INSTALLMENT_PAYMENT), installmentController.collectPayment);

  router.get("/dashboard", requirePermission(PERMISSIONS.VIEW_INSTALLMENT_PLANS), installmentController.getDashboard);
  router.get("/late-fee-rules", requirePermission(PERMISSIONS.VIEW_INSTALLMENT_PLANS), installmentController.listLateFeeRules);
  router.post("/late-fee-rules", requirePermission(PERMISSIONS.MANAGE_INSTALLMENT_PLANS), installmentController.saveLateFeeRule);
  router.post(
    "/schedule/:scheduleId/apply-late-fee",
    requirePermission(PERMISSIONS.MANAGE_INSTALLMENT_PLANS),
    installmentController.applyLateFee,
  );

  router.get("/", requirePermission(PERMISSIONS.VIEW_INSTALLMENT_PLANS), installmentController.listPlans);
  router.get("/:id", requirePermission(PERMISSIONS.VIEW_INSTALLMENT_PLANS), installmentController.getPlan);
  router.get("/:id/agreement-pdf", requirePermission(PERMISSIONS.VIEW_INSTALLMENT_PLANS), installmentController.getAgreementPdf);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_INSTALLMENT_PLANS), installmentController.createPlan);
  router.post("/:id/reschedule", requirePermission(PERMISSIONS.RESCHEDULE_INSTALLMENT_PLAN), installmentController.reschedulePlan);
  router.post("/:id/settle", requirePermission(PERMISSIONS.MANAGE_INSTALLMENT_PLANS), installmentController.settlePlan);
  router.post("/:id/write-off", requirePermission(PERMISSIONS.WRITE_OFF_INSTALLMENT_PLAN), installmentController.writeOffPlan);
  router.post("/:id/cancel", requirePermission(PERMISSIONS.CANCEL_INSTALLMENT_PLAN), installmentController.cancelPlan);

  router.post("/:id/guarantors", requirePermission(PERMISSIONS.MANAGE_INSTALLMENT_PLANS), installmentController.addGuarantor);
  router.delete("/:id/guarantors/:guarantorId", requirePermission(PERMISSIONS.MANAGE_INSTALLMENT_PLANS), installmentController.removeGuarantor);
  router.post("/:id/documents", requirePermission(PERMISSIONS.MANAGE_INSTALLMENT_PLANS), installmentController.attachDocument);
  router.delete("/:id/documents/:documentId", requirePermission(PERMISSIONS.MANAGE_INSTALLMENT_PLANS), installmentController.removeDocument);

  return router;
}
