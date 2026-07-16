import { Router } from "express";
import { PERMISSIONS } from "../lib/permissions.js";
import { requirePermission } from "../middleware/requireRole.js";

export function createAuditRoutes(auditController) {
  const router = Router();

  router.post("/print", auditController.recordPrint);
  router.get(
    "/entity/:entityType/:entityId",
    requirePermission(PERMISSIONS.VIEW_ACTIVITY_LOGS),
    auditController.entityHistory,
  );

  return router;
}
