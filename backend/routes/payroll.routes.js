import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createPayrollRoutes(payrollController) {
  const router = Router();

  router.use(requireFeature("payroll"));

  router.get("/", requirePermission(PERMISSIONS.MANAGE_PAYROLL), payrollController.list);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_PAYROLL), payrollController.generate);
  router.get("/:id", requirePermission(PERMISSIONS.MANAGE_PAYROLL), payrollController.get);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_PAYROLL), payrollController.remove);
  router.post("/:id/approve", requirePermission(PERMISSIONS.MANAGE_PAYROLL), payrollController.approve);
  router.post("/:id/pay", requirePermission(PERMISSIONS.MANAGE_PAYROLL), payrollController.pay);
  router.put("/:id/items/:itemId", requirePermission(PERMISSIONS.MANAGE_PAYROLL), payrollController.updateItem);
  router.get("/:id/payslip/:employeeId", requirePermission(PERMISSIONS.MANAGE_PAYROLL), payrollController.getPayslip);

  return router;
}
