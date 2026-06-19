import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createRetailCashSessionsRoutes(retailCashSessionController) {
  const router = Router();

  router.get("/current", requirePermission(PERMISSIONS.MANAGE_RETAILERS), retailCashSessionController.getCurrentSession);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_RETAILERS), retailCashSessionController.startSession);
  router.post("/:id/stop", requirePermission(PERMISSIONS.MANAGE_RETAILERS), retailCashSessionController.stopSession);

  return router;
}
