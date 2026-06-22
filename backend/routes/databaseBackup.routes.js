import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createDatabaseBackupRoutes(backupController) {
  const router = Router();
  router.use(requireFeature("database-backup"));

  router.get("/", requirePermission(PERMISSIONS.MANAGE_BACKUPS), backupController.download);
  router.get("/history", requirePermission(PERMISSIONS.MANAGE_BACKUPS), backupController.history);

  return router;
}
