import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createDsrCashReceiptsRoutes(dsrFinanceController) {
  const router = Router();
  router.use(requireFeature("dsr-finance"));

  router.get("/", requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), dsrFinanceController.cashReport);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), dsrFinanceController.cashCreate);
  router.patch("/:id", requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), dsrFinanceController.cashUpdate);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), dsrFinanceController.cashDelete);

  return router;
}
