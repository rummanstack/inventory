import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createProductSerialsRoutes(productSerialController) {
  const router = Router();
  router.use(requireFeature("products"));

  router.get("/available", requirePermission(PERMISSIONS.VIEW_STATE), productSerialController.listAvailable);

  return router;
}
