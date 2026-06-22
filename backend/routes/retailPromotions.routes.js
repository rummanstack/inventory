import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createRetailPromotionsRoutes(retailPromotionController) {
  const router = Router();
  router.use(requireFeature("retailer-promotions"));

  router.get("/", requirePermission(PERMISSIONS.MANAGE_RETAIL_PROMOTIONS), retailPromotionController.list);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_RETAIL_PROMOTIONS), retailPromotionController.create);
  router.patch("/:id", requirePermission(PERMISSIONS.MANAGE_RETAIL_PROMOTIONS), retailPromotionController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_RETAIL_PROMOTIONS), retailPromotionController.remove);

  return router;
}
