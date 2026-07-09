import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createPayrollRoutes(payrollController) {
  const router = Router();

  router.use(requireFeature("payroll"));

  router.get("/salary-structures", requirePermission(PERMISSIONS.VIEW_PAYROLL), payrollController.listSalaryStructures);
  router.post("/salary-structures", requirePermission(PERMISSIONS.GENERATE_PAYROLL), payrollController.saveSalaryStructure);
  router.get("/runs", requirePermission(PERMISSIONS.VIEW_PAYROLL), payrollController.listRuns);
  router.get("/runs/:id", requirePermission(PERMISSIONS.VIEW_PAYROLL), payrollController.getRun);
  router.post("/runs/generate", requirePermission(PERMISSIONS.GENERATE_PAYROLL), payrollController.generate);
  router.post("/runs/:id/approve", requirePermission(PERMISSIONS.APPROVE_PAYROLL), payrollController.approve);
  router.post("/runs/:id/pay", requirePermission(PERMISSIONS.APPROVE_PAYROLL), payrollController.pay);
  router.get("/runs/:id/payslips/:employeeId", requirePermission(PERMISSIONS.VIEW_PAYROLL), payrollController.payslip);
  router.get("/register", requirePermission(PERMISSIONS.VIEW_PAYROLL), payrollController.register);

  return router;
}

