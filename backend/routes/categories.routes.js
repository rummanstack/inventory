import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createCategoriesRoutes(categoryController) {
  const router = Router();

  router.get("/", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), categoryController.list);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), categoryController.create);
  router.patch("/:id", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), categoryController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), categoryController.remove);

  return router;
}
