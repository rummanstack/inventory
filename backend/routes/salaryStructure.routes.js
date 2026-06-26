import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createSalaryStructureRoutes(salaryStructureController) {
  const router = Router();

  router.use(requireFeature("salary-structure"));

  router.get("/", requirePermission(PERMISSIONS.VIEW_EMPLOYEES), salaryStructureController.listAll);
  router.get("/:employeeId", requirePermission(PERMISSIONS.VIEW_EMPLOYEES), salaryStructureController.getByEmployee);
  router.post("/:employeeId", requirePermission(PERMISSIONS.MANAGE_EMPLOYEES), salaryStructureController.save);

  return router;
}
