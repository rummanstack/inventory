import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createDsrCashReceiptsRoutes(dsrFinanceController) {
  const router = Router();

  router.get("/", requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), dsrFinanceController.cashReport);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), dsrFinanceController.cashCreate);
  router.patch("/:id", requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), dsrFinanceController.cashUpdate);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), dsrFinanceController.cashDelete);

  return router;
}
