import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createQuotationsRoutes(quotationController) {
  const router = Router();
  router.use(requireFeature("quotations"));

  router.get("/trash", requirePermission(PERMISSIONS.MANAGE_QUOTATIONS), quotationController.listTrash);
  router.get("/", requirePermission(PERMISSIONS.VIEW_QUOTATIONS), quotationController.list);
  router.get("/:id", requirePermission(PERMISSIONS.VIEW_QUOTATIONS), quotationController.get);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_QUOTATIONS), quotationController.create);
  router.post("/:id/convert", requirePermission(PERMISSIONS.MANAGE_QUOTATIONS), quotationController.convert);
  router.patch("/:id", requirePermission(PERMISSIONS.MANAGE_QUOTATIONS), quotationController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_QUOTATIONS), quotationController.remove);

  return router;
}
