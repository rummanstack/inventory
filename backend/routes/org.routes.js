import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createOrgRoutes(orgController) {
  const router = Router();

  router.patch("/", requirePermission(PERMISSIONS.MANAGE_ORG), orgController.update);

  return router;
}
