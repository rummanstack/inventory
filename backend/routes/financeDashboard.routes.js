import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createFinanceDashboardRoutes(financeDashboardController) {
  const router = Router();

  router.get("/", requirePermission(PERMISSIONS.VIEW_FINANCE_DASHBOARD), financeDashboardController.getDashboard);
  router.get("/range-report", requirePermission(PERMISSIONS.VIEW_FINANCE_DASHBOARD), financeDashboardController.getRangeReport);
  router.get("/monthly-trend", requirePermission(PERMISSIONS.VIEW_STATE), financeDashboardController.getMonthlyTrend);

  return router;
}
