import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createSettlementsRoutes(settlementController) {
  const router = Router();

  // /reports has its own feature key so it can be enabled independently of core settlements
  router.get("/reports", requireFeature("settlement-report"), requirePermission(PERMISSIONS.CREATE_SETTLEMENTS), settlementController.settlementReport);

  router.use(requireFeature("settlements"));

  router.get("/", requirePermission(PERMISSIONS.VIEW_STATE), settlementController.list);
  router.post("/", requirePermission(PERMISSIONS.CREATE_SETTLEMENTS), settlementController.create);
  router.put("/:id", requirePermission(PERMISSIONS.UPDATE_SETTLEMENTS), settlementController.update);

  return router;
}
