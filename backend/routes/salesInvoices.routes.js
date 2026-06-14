import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createSalesInvoicesRoutes(salesInvoiceController) {
  const router = Router();

  router.get("/trash", requirePermission(PERMISSIONS.MANAGE_RETAILERS), salesInvoiceController.listTrash);
  router.get("/reports/daily", requirePermission(PERMISSIONS.MANAGE_RETAILERS), salesInvoiceController.dailySalesReport);
  router.get("/reports/profit", requirePermission(PERMISSIONS.MANAGE_RETAILERS), salesInvoiceController.profitReport);
  router.get("/", requirePermission(PERMISSIONS.MANAGE_RETAILERS), salesInvoiceController.list);
  router.get("/:id", requirePermission(PERMISSIONS.MANAGE_RETAILERS), salesInvoiceController.get);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_RETAILERS), salesInvoiceController.create);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_RETAILERS), salesInvoiceController.remove);
  router.post("/:id/restore", requirePermission(PERMISSIONS.MANAGE_RETAILERS), salesInvoiceController.restore);

  return router;
}
