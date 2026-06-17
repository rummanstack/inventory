import { Router } from "express";
import { requirePlatformAdmin } from "../middleware/requirePlatformAdmin.js";

export function createPlatformBackupRoutes(backupController) {
  const router = Router();

  router.get("/", requirePlatformAdmin, backupController.downloadFull);

  return router;
}
