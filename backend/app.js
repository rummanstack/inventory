import fs from "node:fs";
import path from "node:path";
import express from "express";
import { backendDistPath, backendRoot, frontendDistPath } from "./config/paths.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { createApiRouter } from "./routes/api.js";

export function createApp({
  authService,
  env,
  productService,
  categoryService,
  dsrService,
  issueService,
  settlementService,
  auditService,
  userService,
  expenseService,
  dsrFinanceService,
  profitService,
  backupService,
  stockMovementService,
  dsrDueLedgerService,
  customerService,
  databaseManager,
  tenantService,
  permissionService,
  systemService,
  invariantService,
  errorLogService,
  supplierService,
  supplierDueLedgerService,
  purchaseReceiveService,
  supplierPaymentService,
  salesInvoiceService,
  customerDueLedgerService,
  customerPaymentService,
  salesReturnService,
  contactMessageService,
  financeAccountService,
  financeDashboardService,
  retailCustomerService,
  retailCashSessionService,
  retailPromotionService,
  helpDeskService,
}) {
  const app = express();

  app.set("trust proxy", 1);
  app.use(express.json());
  app.use("/uploads", express.static(path.join(backendRoot, "uploads")));
  app.use(
    "/api",
    createApiRouter({
      authService,
      env,
      productService,
      categoryService,
      dsrService,
      issueService,
      settlementService,
      auditService,
      userService,
      expenseService,
      dsrFinanceService,
      profitService,
      backupService,
      stockMovementService,
      dsrDueLedgerService,
      customerService,
      databaseManager,
      tenantService,
      permissionService,
      systemService,
      invariantService,
      errorLogService,
      supplierService,
      supplierDueLedgerService,
      purchaseReceiveService,
      supplierPaymentService,
      salesInvoiceService,
      customerDueLedgerService,
      customerPaymentService,
      salesReturnService,
      contactMessageService,
      financeAccountService,
      financeDashboardService,
      retailCustomerService,
      retailCashSessionService,
      retailPromotionService,
      helpDeskService,
    }),
  );

  const staticRoot = fs.existsSync(backendDistPath) ? backendDistPath : frontendDistPath;

  if (fs.existsSync(staticRoot)) {
    app.use(express.static(staticRoot));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(staticRoot, "index.html"));
    });
  }

  app.use(errorHandler(errorLogService));

  return app;
}
