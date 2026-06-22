import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createOrgRoutes(orgController) {
  const router = Router();
  router.use(requireFeature("org-settings"));

  router.patch("/", requirePermission(PERMISSIONS.MANAGE_ORG), orgController.update);

  return router;
}
