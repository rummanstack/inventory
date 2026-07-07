import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireActiveTenant } from "../middleware/requireActiveTenant.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import { createPublicAuthRoutes, createAuthenticatedAuthRoutes } from "./auth.routes.js";
import { createProfileRoutes } from "./profile.routes.js";
import { createUploadsRoutes } from "./uploads.routes.js";
import { createPlatformTenantsRoutes } from "./platformTenants.routes.js";
import { createPlatformBackupRoutes } from "./platformBackup.routes.js";
import { createSystemRoutes } from "./system.routes.js";
import { createOrgRoutes } from "./org.routes.js";
import { createPermissionsRoutes } from "./permissions.routes.js";
import { createReportExportsRoutes } from "./reportExports.routes.js";
import { createUsersRoutes } from "./users.routes.js";
import { createActivityLogsRoutes } from "./activityLogs.routes.js";
import { createAuditRoutes } from "./audit.routes.js";
import { createExpensesRoutes } from "./expenses.routes.js";
import { createDsrAdvancesRoutes } from "./dsrAdvances.routes.js";
import { createProfitReportRoutes } from "./profitReport.routes.js";
import { createJournalRoutes } from "./journal.routes.js";
import { createDatabaseBackupRoutes } from "./databaseBackup.routes.js";
import { createProductsRoutes } from "./products.routes.js";
import { createCategoriesRoutes } from "./categories.routes.js";
import { createStockMovementsRoutes } from "./stockMovements.routes.js";
import { createProductSerialsRoutes } from "./productSerials.routes.js";
import { createWarrantyClaimsRoutes } from "./warrantyClaims.routes.js";
import { createRepairJobsRoutes } from "./repairJobs.routes.js";
import { createDsrDueLedgerRoutes } from "./dsrDueLedger.routes.js";
import { createShopDueLedgerRoutes } from "./shopDueLedger.routes.js";
import { createDsrsRoutes } from "./dsrs.routes.js";
import { createCustomersRoutes } from "./customers.routes.js";
import { createRetailCustomersRoutes } from "./retailCustomers.routes.js";
import { createRetailPromotionsRoutes } from "./retailPromotions.routes.js";
import { createIssuesRoutes } from "./issues.routes.js";
import { createHelpDeskRoutes } from "./helpDesk.routes.js";
import { createSettlementsRoutes } from "./settlements.routes.js";
import { createSuppliersRoutes } from "./suppliers.routes.js";
import { createSupplierDueLedgerRoutes } from "./supplierDueLedger.routes.js";
import { createPurchaseReceiveRoutes } from "./purchaseReceive.routes.js";
import { createPurchaseReturnsRoutes } from "./purchaseReturns.routes.js";
import { createSupplierPaymentsRoutes } from "./supplierPayments.routes.js";
import { createSupplierDiscountsRoutes } from "./supplierDiscounts.routes.js";
import { createSalesInvoicesRoutes } from "./salesInvoices.routes.js";
import { createCustomerDueLedgerRoutes } from "./customerDueLedger.routes.js";
import { createCustomerPaymentsRoutes } from "./customerPayments.routes.js";
import { createSalesReturnsRoutes } from "./salesReturns.routes.js";
import { createContactRoutes } from "./contact.routes.js";
import { createPublicRegistrationRoutes, createPlatformRegistrationsRoutes } from "./registration.routes.js";
import { createVisitorChatRoutes } from "./visitorChat.routes.js";
import { createVisitorChatAdminRoutes } from "./visitorChatAdmin.routes.js";
import { createContactMessagesRoutes } from "./contactMessages.routes.js";
import { createFinanceAccountsRoutes } from "./financeAccounts.routes.js";
import { createFinanceDashboardRoutes } from "./financeDashboard.routes.js";
import { createRetailCashSessionsRoutes } from "./retailCashSessions.routes.js";
import { createQuotationsRoutes } from "./quotations.routes.js";
import { createTradeInsRoutes } from "./tradeIns.routes.js";
import { createBrandsRoutes } from "./brands.routes.js";
import { createManufacturersRoutes } from "./manufacturers.routes.js";
import { createGenericMedicinesRoutes } from "./genericMedicines.routes.js";
import { createSrsRoutes } from "./srs.routes.js";
import { createSrDueLedgerRoutes } from "./srDueLedger.routes.js";
import { createDsrTargetsRoutes } from "./dsrTargets.routes.js";
import { createEmployeesRoutes } from "./employees.routes.js";
import { createSalaryPaymentsRoutes } from "./salaryPayments.routes.js";
import { createDrugBatchesRoutes } from "./drugBatches.routes.js";

export function createApiRouter({ controllers, authService, env, auditService }) {
  const router = Router();
  const {
    public: { authController, contactMessageController, registrationController, visitorChatController },
    platform: { backupController, systemController, tenantController, visitorChatAdminController },
    tenant: {
      activityLogController,
      auditController,
      orgController,
      permissionController,
      reportExportController,
      uploadController,
      userController,
    },
    catalog: {
      brandController,
      categoryController,
      drugBatchController,
      genericMedicineController,
      manufacturerController,
      productController,
      productSerialController,
      stockMovementController,
    },
    customers: {
      contactMessageAdminController,
      customerController,
      customerDueLedgerController,
      customerPaymentController,
      retailCustomerController,
      retailPromotionController,
      tradeInController,
    },
    operations: {
      expenseController,
      helpDeskController,
      profitController,
      quotationController,
      repairJobController,
      retailCashSessionController,
      salesInvoiceController,
      salesReturnController,
      warrantyClaimController,
    },
    field: {
      dsrController,
      dsrDueLedgerController,
      dsrFinanceController,
      dsrTargetController,
      issueController,
      settlementController,
      shopDueLedgerController,
      srController,
      srDueLedgerController,
    },
    suppliers: {
      purchaseReceiveController,
      purchaseReturnController,
      supplierController,
      supplierDiscountController,
      supplierDueLedgerController,
      supplierPaymentController,
    },
    finance: { financeAccountController, financeDashboardController, journalController },
    hr: { employeeController, salaryPaymentController },
  } = controllers;

  const loginRateLimiter = createRateLimiter({ name: "auth-login", windowMs: 15 * 60 * 1000, max: 20 });
  const authRateLimiter = createRateLimiter({ name: "auth-recovery", windowMs: 15 * 60 * 1000, max: 20 });
  const contactRateLimiter = createRateLimiter({ name: "contact-submit", windowMs: 15 * 60 * 1000, max: 10 });
  const registerRateLimiter = createRateLimiter({ name: "public-register", windowMs: 15 * 60 * 1000, max: 5 });
  const visitorChatRateLimiter = createRateLimiter({
    name: "visitor-chat-post",
    windowMs: 15 * 60 * 1000,
    max: 60,
  });

  router.use("/auth", createPublicAuthRoutes(authController, { loginRateLimiter, authRateLimiter }));

  // Public contact form - no auth required
  router.use("/contact", createContactRoutes(contactMessageController, { contactRateLimiter }));

  // Public business self-registration - creates a pending tenant awaiting platform approval
  router.use("/register", createPublicRegistrationRoutes(registrationController, { registerRateLimiter }));

  // Public visitor chat widget - no auth required
  router.use("/visitor-chat", createVisitorChatRoutes(visitorChatController, { visitorChatRateLimiter }));

  router.use(requireAuth(authService, env, auditService));

  router.use("/auth", createAuthenticatedAuthRoutes(authController));
  router.use("/profile", createProfileRoutes(userController));
  router.use("/uploads", createUploadsRoutes(uploadController));

  // Platform admin routes - no tenant required, system_developer only
  router.use("/platform/tenants", createPlatformTenantsRoutes(tenantController));
  router.use("/platform/backup", createPlatformBackupRoutes(backupController));
  router.use("/platform/visitor-chats", createVisitorChatAdminRoutes(visitorChatAdminController));
  router.use("/platform/contact-messages", createContactMessagesRoutes(contactMessageAdminController));
  router.use("/platform/registrations", createPlatformRegistrationsRoutes(registrationController));

  // System developer routes - no tenant required, system_developer only
  router.use("/system", createSystemRoutes(systemController));

  // All business routes require an active tenant subscription
  router.use(requireActiveTenant);

  router.use("/org", createOrgRoutes(orgController));
  router.use("/permissions", createPermissionsRoutes(permissionController));
  router.use("/users", createUsersRoutes(userController));
  router.use("/activity-logs", createActivityLogsRoutes(activityLogController));
  router.use("/audit", createAuditRoutes(auditController));
  router.use("/report-exports", createReportExportsRoutes(reportExportController));
  router.use("/expenses", createExpensesRoutes(expenseController));
  router.use("/dsr-advances", createDsrAdvancesRoutes(dsrFinanceController));
  router.use("/profit-report", createProfitReportRoutes(profitController));
  router.use("/journal", createJournalRoutes(journalController));
  router.use("/database-backup", createDatabaseBackupRoutes(backupController));
  router.use("/products", createProductsRoutes(productController));
  router.use("/categories", createCategoriesRoutes(categoryController));
  router.use("/brands", createBrandsRoutes(brandController));
  router.use("/manufacturers", createManufacturersRoutes(manufacturerController));
  router.use("/generic-medicines", createGenericMedicinesRoutes(genericMedicineController));
  router.use("/stock-movements", createStockMovementsRoutes(stockMovementController));
  router.use("/product-serials", createProductSerialsRoutes(productSerialController));
  router.use("/warranty-claims", createWarrantyClaimsRoutes(warrantyClaimController));
  router.use("/repair-jobs", createRepairJobsRoutes(repairJobController));
  router.use("/quotations", createQuotationsRoutes(quotationController));
  router.use("/trade-ins", createTradeInsRoutes(tradeInController));
  router.use("/dsr-due-ledger", createDsrDueLedgerRoutes(dsrDueLedgerController));
  router.use("/shop-due-ledger", createShopDueLedgerRoutes(shopDueLedgerController));
  router.use("/dsrs", createDsrsRoutes(dsrController));
  router.use("/customers", createCustomersRoutes(customerController));
  router.use("/retail-customers", createRetailCustomersRoutes(retailCustomerController));
  router.use("/help-desk", createHelpDeskRoutes(helpDeskController));
  router.use("/issues", createIssuesRoutes(issueController));
  router.use("/settlements", createSettlementsRoutes(settlementController));
  router.use("/suppliers", createSuppliersRoutes(supplierController));
  router.use("/supplier-due-ledger", createSupplierDueLedgerRoutes(supplierDueLedgerController));
  router.use("/purchase-receive", createPurchaseReceiveRoutes(purchaseReceiveController));
  router.use("/purchase-returns", createPurchaseReturnsRoutes(purchaseReturnController));
  router.use("/supplier-payments", createSupplierPaymentsRoutes(supplierPaymentController));
  router.use("/supplier-discounts", createSupplierDiscountsRoutes(supplierDiscountController));
  router.use("/sales-invoices", createSalesInvoicesRoutes(salesInvoiceController));
  router.use("/retail-promotions", createRetailPromotionsRoutes(retailPromotionController));
  router.use("/customer-due-ledger", createCustomerDueLedgerRoutes(customerDueLedgerController));
  router.use("/customer-payments", createCustomerPaymentsRoutes(customerPaymentController));
  router.use("/sales-returns", createSalesReturnsRoutes(salesReturnController));
  router.use("/finance-accounts", createFinanceAccountsRoutes(financeAccountController));
  router.use("/finance-dashboard", createFinanceDashboardRoutes(financeDashboardController));
  router.use("/retail-cash-sessions", createRetailCashSessionsRoutes(retailCashSessionController));
  router.use("/srs", createSrsRoutes(srController));
  router.use("/sr-due-ledger", createSrDueLedgerRoutes(srDueLedgerController));
  router.use("/dsr-targets", createDsrTargetsRoutes(dsrTargetController));
  router.use("/employees", createEmployeesRoutes(employeeController));
  router.use("/salary-payments", createSalaryPaymentsRoutes(salaryPaymentController));
  router.use("/drug-batches", createDrugBatchesRoutes(drugBatchController));

  return router;
}
