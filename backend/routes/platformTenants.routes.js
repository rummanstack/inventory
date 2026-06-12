import { Router } from "express";
import { requirePlatformAdmin } from "../middleware/requirePlatformAdmin.js";

export function createPlatformTenantsRoutes(tenantController) {
  const router = Router();

  router.get("/", requirePlatformAdmin, tenantController.list);
  router.post("/", requirePlatformAdmin, tenantController.create);
  router.patch("/:id", requirePlatformAdmin, tenantController.update);
  router.patch("/:id/status", requirePlatformAdmin, tenantController.setStatus);
  router.get("/:id/features", requirePlatformAdmin, tenantController.getFeatures);
  router.patch("/:id/features", requirePlatformAdmin, tenantController.updateFeatures);

  return router;
}
