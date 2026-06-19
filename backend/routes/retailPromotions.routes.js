import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createRetailPromotionsRoutes(retailPromotionController) {
  const router = Router();

  router.get("/", requirePermission(PERMISSIONS.MANAGE_RETAILERS), retailPromotionController.list);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_RETAILERS), retailPromotionController.create);
  router.patch("/:id", requirePermission(PERMISSIONS.MANAGE_RETAILERS), retailPromotionController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_RETAILERS), retailPromotionController.remove);

  return router;
}
