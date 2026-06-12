import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createDsrAdvancesRoutes(dsrFinanceController) {
  const router = Router();

  router.get("/", requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), dsrFinanceController.advanceReport);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), dsrFinanceController.advanceCreate);
  router.patch("/:id", requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), dsrFinanceController.advanceUpdate);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), dsrFinanceController.advanceDelete);

  return router;
}
