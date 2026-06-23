import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createSalesInvoicesRoutes(salesInvoiceController) {
  const router = Router();

  router.get("/trash", requireFeature("retailer-sales-invoices"), requirePermission(PERMISSIONS.MANAGE_RETAIL_SALES_INVOICES), salesInvoiceController.listTrash);
  router.get("/reports/daily", requireFeature("retailer-daily-sales-report"), requirePermission(PERMISSIONS.MANAGE_RETAIL_DAILY_SALES_REPORT), salesInvoiceController.dailySalesReport);
  router.get("/", requireFeature("retailer-sales-invoices"), requirePermission(PERMISSIONS.MANAGE_RETAIL_SALES_INVOICES), salesInvoiceController.list);
  router.get("/:id", requireFeature("retailer-sales-invoices"), requirePermission(PERMISSIONS.MANAGE_RETAIL_SALES_INVOICES), salesInvoiceController.get);
  router.post("/", requireFeature("retailer-sales-invoices"), requirePermission(PERMISSIONS.MANAGE_RETAIL_SALES_INVOICES), salesInvoiceController.create);
  router.delete("/:id", requireFeature("retailer-sales-invoices"), requirePermission(PERMISSIONS.MANAGE_RETAIL_SALES_INVOICES), salesInvoiceController.remove);
  router.post("/:id/restore", requireFeature("retailer-sales-invoices"), requirePermission(PERMISSIONS.MANAGE_RETAIL_SALES_INVOICES), salesInvoiceController.restore);

  return router;
}
