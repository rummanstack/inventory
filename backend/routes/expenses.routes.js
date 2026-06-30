import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createExpensesRoutes(expenseController) {
  const router = Router();

  router.use(requireFeature("expenses"));

  router.get("/", requirePermission(PERMISSIONS.MANAGE_EXPENSES), expenseController.report);
  router.get("/trash", requirePermission(PERMISSIONS.MANAGE_EXPENSES), expenseController.listTrash);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_EXPENSES), expenseController.create);
  router.patch("/:id", requirePermission(PERMISSIONS.MANAGE_EXPENSES), expenseController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_EXPENSES), expenseController.remove);
  router.post("/:id/restore", requirePermission(PERMISSIONS.MANAGE_EXPENSES), expenseController.restore);
  router.delete("/:id/permanent", requirePermission(PERMISSIONS.PERMANENT_DELETE), expenseController.permanentlyDelete);

  return router;
}
