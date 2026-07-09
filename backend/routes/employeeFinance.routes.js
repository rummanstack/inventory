import { Router } from "express";
import { requireFeature } from "../middleware/requireFeature.js";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createEmployeeFinanceRoutes(employeeFinanceController) {
  const router = Router();

  router.get("/advances", requireFeature("employee_advances"), requirePermission(PERMISSIONS.MANAGE_ADVANCES), employeeFinanceController.listAdvances);
  router.post("/advances", requireFeature("employee_advances"), requirePermission(PERMISSIONS.MANAGE_ADVANCES), employeeFinanceController.requestAdvance);
  router.post("/advances/:id/approve", requireFeature("employee_advances"), requirePermission(PERMISSIONS.MANAGE_ADVANCES), employeeFinanceController.approveAdvance);
  router.post("/advances/:id/reject", requireFeature("employee_advances"), requirePermission(PERMISSIONS.MANAGE_ADVANCES), employeeFinanceController.rejectAdvance);

  router.get("/loans", requireFeature("employee_loans"), requirePermission(PERMISSIONS.MANAGE_LOANS), employeeFinanceController.listLoans);
  router.post("/loans", requireFeature("employee_loans"), requirePermission(PERMISSIONS.MANAGE_LOANS), employeeFinanceController.requestLoan);
  router.post("/loans/:id/approve", requireFeature("employee_loans"), requirePermission(PERMISSIONS.MANAGE_LOANS), employeeFinanceController.approveLoan);
  router.post("/loans/:id/reject", requireFeature("employee_loans"), requirePermission(PERMISSIONS.MANAGE_LOANS), employeeFinanceController.rejectLoan);

  return router;
}
