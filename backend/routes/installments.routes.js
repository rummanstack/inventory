import { Router } from "express";
import { requireFeature } from "../middleware/requireFeature.js";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createInstallmentRoutes(installmentController) {
  const router = Router();

  // Report/collection routes must be registered before "/:id" — otherwise
  // Express would try to match "reports"/"customer-statement" as a plan id.
  router.get("/reports/due-schedule", requireFeature("installment-reports"), requirePermission(PERMISSIONS.VIEW_INSTALLMENT_PLANS), installmentController.getDueScheduleReport);
  router.get("/reports/overdue", requireFeature("installment-reports"), requirePermission(PERMISSIONS.VIEW_INSTALLMENT_PLANS), installmentController.getOverdueReport);
  router.get("/reports/collections", requireFeature("installment-reports"), requirePermission(PERMISSIONS.VIEW_INSTALLMENT_PLANS), installmentController.getCollectionReport);
  router.get("/customer-statement", requireFeature("installment-reports"), requirePermission(PERMISSIONS.VIEW_INSTALLMENT_PLANS), installmentController.getCustomerStatement);
  router.get("/credit-check", requireFeature("installment-plans"), requirePermission(PERMISSIONS.VIEW_INSTALLMENT_PLANS), installmentController.getCreditCheck);
  router.put(
    "/customers/:customerId/credit-settings",
    requireFeature("installment-plans"),
    requirePermission(PERMISSIONS.MANAGE_INSTALLMENT_CREDIT_SETTINGS),
    installmentController.updateCustomerCreditSettings,
  );
  router.post("/payments", requireFeature("installment-plans"), requirePermission(PERMISSIONS.COLLECT_INSTALLMENT_PAYMENT), installmentController.collectPayment);

  router.get("/dashboard", requireFeature("installment-dashboard"), requirePermission(PERMISSIONS.VIEW_INSTALLMENT_PLANS), installmentController.getDashboard);
  router.get("/late-fee-rules", requireFeature("installment-late-fee-rules"), requirePermission(PERMISSIONS.VIEW_INSTALLMENT_PLANS), installmentController.listLateFeeRules);
  router.post("/late-fee-rules", requireFeature("installment-late-fee-rules"), requirePermission(PERMISSIONS.MANAGE_INSTALLMENT_PLANS), installmentController.saveLateFeeRule);
  router.post(
    "/schedule/:scheduleId/apply-late-fee",
    requireFeature("installment-plans"),
    requirePermission(PERMISSIONS.MANAGE_INSTALLMENT_PLANS),
    installmentController.applyLateFee,
  );

  router.get("/", requireFeature("installment-plans"), requirePermission(PERMISSIONS.VIEW_INSTALLMENT_PLANS), installmentController.listPlans);
  router.get("/:id", requireFeature("installment-plans"), requirePermission(PERMISSIONS.VIEW_INSTALLMENT_PLANS), installmentController.getPlan);
  router.get("/:id/agreement-pdf", requireFeature("installment-plans"), requirePermission(PERMISSIONS.VIEW_INSTALLMENT_PLANS), installmentController.getAgreementPdf);
  router.post("/", requireFeature("installment-plans"), requirePermission(PERMISSIONS.MANAGE_INSTALLMENT_PLANS), installmentController.createPlan);
  router.post("/:id/reschedule", requireFeature("installment-plans"), requirePermission(PERMISSIONS.RESCHEDULE_INSTALLMENT_PLAN), installmentController.reschedulePlan);
  router.post("/:id/settle", requireFeature("installment-plans"), requirePermission(PERMISSIONS.MANAGE_INSTALLMENT_PLANS), installmentController.settlePlan);
  router.post("/:id/write-off", requireFeature("installment-plans"), requirePermission(PERMISSIONS.WRITE_OFF_INSTALLMENT_PLAN), installmentController.writeOffPlan);
  router.post("/:id/cancel", requireFeature("installment-plans"), requirePermission(PERMISSIONS.CANCEL_INSTALLMENT_PLAN), installmentController.cancelPlan);

  router.post("/:id/guarantors", requireFeature("installment-plans"), requirePermission(PERMISSIONS.MANAGE_INSTALLMENT_PLANS), installmentController.addGuarantor);
  router.delete("/:id/guarantors/:guarantorId", requireFeature("installment-plans"), requirePermission(PERMISSIONS.MANAGE_INSTALLMENT_PLANS), installmentController.removeGuarantor);
  router.post("/:id/documents", requireFeature("installment-plans"), requirePermission(PERMISSIONS.MANAGE_INSTALLMENT_PLANS), installmentController.attachDocument);
  router.delete("/:id/documents/:documentId", requireFeature("installment-plans"), requirePermission(PERMISSIONS.MANAGE_INSTALLMENT_PLANS), installmentController.removeDocument);

  return router;
}
