import { Router } from "express";
import { requireRoles } from "../middleware/requireRole.js";
import { USER_ROLES } from "../lib/roles.js";

export function createSystemRoutes(systemController) {
  const router = Router();

  router.get("/health", requireRoles(USER_ROLES.SYSTEM_DEVELOPER), systemController.health);
  router.get("/error-logs", requireRoles(USER_ROLES.SYSTEM_DEVELOPER), systemController.errorLogs);

  return router;
}
