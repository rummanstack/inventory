import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createDsrTargetsRoutes(controller) {
  const router = Router();

  router.get("/summary", requirePermission(PERMISSIONS.VIEW_STATE), controller.getSummary);
  router.get("/", requirePermission(PERMISSIONS.VIEW_STATE), controller.getTargets);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_DSRS), controller.setTargets);

  return router;
}
