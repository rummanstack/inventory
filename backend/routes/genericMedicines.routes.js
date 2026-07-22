import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createGenericMedicinesRoutes(genericMedicineController) {
  const router = Router();

  // Lookups used only from inside the Products page's form — no page of their own.
  router.use(requireFeature("products"));

  router.get("/", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), genericMedicineController.list);
  router.get("/active", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), genericMedicineController.listActive);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), genericMedicineController.create);
  router.patch("/:id", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), genericMedicineController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), genericMedicineController.remove);

  return router;
}
