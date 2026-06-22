import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createWarrantyClaimsRoutes(warrantyClaimController) {
  const router = Router();
  router.use(requireFeature("warranty-claims"));

  router.get("/trash", requirePermission(PERMISSIONS.MANAGE_WARRANTY_CLAIMS), warrantyClaimController.listTrash);
  router.get("/search-serial", requirePermission(PERMISSIONS.VIEW_WARRANTY_CLAIMS), warrantyClaimController.searchSerial);
  router.get("/", requirePermission(PERMISSIONS.VIEW_WARRANTY_CLAIMS), warrantyClaimController.list);
  router.get("/:id", requirePermission(PERMISSIONS.VIEW_WARRANTY_CLAIMS), warrantyClaimController.get);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_WARRANTY_CLAIMS), warrantyClaimController.create);
  router.patch("/:id", requirePermission(PERMISSIONS.MANAGE_WARRANTY_CLAIMS), warrantyClaimController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_WARRANTY_CLAIMS), warrantyClaimController.remove);

  return router;
}
