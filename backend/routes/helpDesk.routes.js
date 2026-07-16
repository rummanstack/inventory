import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createHelpDeskRoutes(helpDeskController) {
  const router = Router();
  router.use(requireFeature("help-desk"));

  router.get("/", requirePermission(PERMISSIONS.VIEW_HELP_DESK), helpDeskController.list);
  router.get("/:id", requirePermission(PERMISSIONS.VIEW_HELP_DESK), helpDeskController.get);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_HELP_DESK), helpDeskController.create);
  router.put("/:id", requirePermission(PERMISSIONS.MANAGE_HELP_DESK), helpDeskController.update);
  router.post("/:id/notes", requirePermission(PERMISSIONS.MANAGE_HELP_DESK), helpDeskController.addNote);
  router.post("/:id/transition", requirePermission(PERMISSIONS.MANAGE_HELP_DESK), helpDeskController.transition);

  return router;
}
