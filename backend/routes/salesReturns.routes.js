import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createSalesReturnsRoutes(salesReturnController) {
  const router = Router();

  router.get("/", requirePermission(PERMISSIONS.MANAGE_RETAILERS), salesReturnController.list);
  router.get("/:id", requirePermission(PERMISSIONS.MANAGE_RETAILERS), salesReturnController.get);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_RETAILERS), salesReturnController.create);

  return router;
}
