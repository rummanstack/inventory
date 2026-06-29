import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createGenericMedicinesRoutes(genericMedicineController) {
  const router = Router();

  router.use(requireFeature("batch-tracking"));

  router.get("/", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), genericMedicineController.list);
  router.get("/active", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), genericMedicineController.listActive);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), genericMedicineController.create);
  router.patch("/:id", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), genericMedicineController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), genericMedicineController.remove);

  return router;
}
