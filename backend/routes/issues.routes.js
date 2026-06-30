import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createIssuesRoutes(issueController) {
  const router = Router();

  router.use(requireFeature("morning-issue"));

  router.get("/", requirePermission(PERMISSIONS.VIEW_STATE), issueController.list);
  router.post("/", requirePermission(PERMISSIONS.CREATE_ISSUES), issueController.create);
  router.put("/:id", requirePermission(PERMISSIONS.UPDATE_ISSUES), issueController.update);

  return router;
}
