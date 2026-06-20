import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createHelpDeskRoutes(helpDeskController) {
  const router = Router();

  router.get("/", requirePermission(PERMISSIONS.VIEW_STATE), helpDeskController.list);
  router.get("/:id", requirePermission(PERMISSIONS.VIEW_STATE), helpDeskController.get);
  router.post("/", requirePermission(PERMISSIONS.VIEW_STATE), helpDeskController.create);
  router.put("/:id", requirePermission(PERMISSIONS.VIEW_STATE), helpDeskController.update);
  router.post("/:id/notes", requirePermission(PERMISSIONS.VIEW_STATE), helpDeskController.addNote);
  router.post("/:id/transition", requirePermission(PERMISSIONS.VIEW_STATE), helpDeskController.transition);

  return router;
}
