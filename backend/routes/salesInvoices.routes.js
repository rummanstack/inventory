import { Router } from "express";
import { requirePermission, requireAnyPermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

function requireSalesInvoiceCreateAccess(req, res, next) {
  const saleType = String(req.body?.saleType || "").trim().toUpperCase();
  const isQuickSale = saleType === "QUICK_SALE";
  const feature = isQuickSale ? "retailer-quick-sale" : "retailer-sales-invoices";
  const permission = isQuickSale
    ? PERMISSIONS.MANAGE_RETAIL_QUICK_SALE
    : PERMISSIONS.MANAGE_RETAIL_SALES_INVOICES;

  return requireFeature(feature)(req, res, () => requirePermission(permission)(req, res, next));
}

export function createSalesInvoicesRoutes(salesInvoiceController) {
  const router = Router();

  router.get("/trash", requireFeature("retailer-sales-invoices"), requirePermission(PERMISSIONS.MANAGE_RETAIL_SALES_INVOICES), salesInvoiceController.listTrash);
  router.get("/reports/daily", requireFeature("retailer-daily-sales-report"), requireAnyPermission(PERMISSIONS.MANAGE_RETAIL_DAILY_SALES_REPORT, PERMISSIONS.VIEW_STATE), salesInvoiceController.dailySalesReport);
  router.get("/", requireFeature("retailer-sales-invoices"), requireAnyPermission(PERMISSIONS.VIEW_RETAIL_SALES_INVOICES, PERMISSIONS.VIEW_STATE), salesInvoiceController.list);
  router.get("/:id", requireFeature("retailer-sales-invoices"), requirePermission(PERMISSIONS.VIEW_RETAIL_SALES_INVOICES), salesInvoiceController.get);
  router.post("/", requireSalesInvoiceCreateAccess, salesInvoiceController.create);
  router.delete("/:id", requireFeature("retailer-sales-invoices"), requirePermission(PERMISSIONS.MANAGE_RETAIL_SALES_INVOICES), salesInvoiceController.remove);
  router.post("/:id/restore", requireFeature("retailer-sales-invoices"), requirePermission(PERMISSIONS.MANAGE_RETAIL_SALES_INVOICES), salesInvoiceController.restore);

  return router;
}
