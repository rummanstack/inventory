import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createBrandsRoutes(brandController) {
  const router = Router();

  router.get("/", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), brandController.list);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), brandController.create);
  router.patch("/:id", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), brandController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), brandController.remove);

  return router;
}
