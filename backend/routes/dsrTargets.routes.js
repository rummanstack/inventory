import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createDsrTargetsRoutes(controller) {
  const router = Router();

  router.use(requireFeature("dsrs"));

  router.get("/summary", requirePermission(PERMISSIONS.VIEW_STATE), controller.getSummary);
  router.get("/", requirePermission(PERMISSIONS.VIEW_STATE), controller.getTargets);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_DSRS), controller.setTargets);

  return router;
}
