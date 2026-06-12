import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createSettlementsRoutes(settlementController) {
  const router = Router();

  router.get("/", requirePermission(PERMISSIONS.VIEW_STATE), settlementController.list);
  router.post("/", requirePermission(PERMISSIONS.CREATE_SETTLEMENTS), settlementController.create);
  router.put("/:id", requirePermission(PERMISSIONS.UPDATE_SETTLEMENTS), settlementController.update);

  return router;
}
