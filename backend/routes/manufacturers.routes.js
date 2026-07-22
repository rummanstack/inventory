import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createManufacturersRoutes(manufacturerController) {
  const router = Router();

  // Lookups used only from inside the Products page's form — no page of their own.
  router.use(requireFeature("products"));

  router.get("/", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), manufacturerController.list);
  router.get("/active", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), manufacturerController.listActive);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), manufacturerController.create);
  router.patch("/:id", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), manufacturerController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), manufacturerController.remove);

  return router;
}
