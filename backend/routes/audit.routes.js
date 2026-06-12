import { Router } from "express";

export function createAuditRoutes(auditController) {
  const router = Router();

  router.post("/print", auditController.recordPrint);
  router.get("/entity/:entityType/:entityId", auditController.entityHistory);

  return router;
}
