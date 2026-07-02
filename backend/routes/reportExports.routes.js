import { Router } from "express";

export function createReportExportsRoutes(reportExportController) {
  const router = Router();

  router.post("/pdf", reportExportController.pdf);
  router.post("/excel", reportExportController.excel);

  return router;
}
