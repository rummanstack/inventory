import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createSalaryPaymentsRoutes(salaryPaymentController) {
  const router = Router();
  router.use(requireFeature("salary-payments"));

  router.get("/overview", requirePermission(PERMISSIONS.MANAGE_PAYROLL), salaryPaymentController.overview);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_PAYROLL), salaryPaymentController.record);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_PAYROLL), salaryPaymentController.remove);

  return router;
}
