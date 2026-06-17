import { Router } from "express";
import { AuthController } from "../controllers/authController.js";
import { DsrFinanceController } from "../controllers/dsrFinanceController.js";
import { MonthEndSummaryController } from "../controllers/monthEndSummaryController.js";
import { ProfitController } from "../controllers/profitController.js";
import { BackupController } from "../controllers/backupController.js";
import { DsrController } from "../controllers/dsrController.js";
import { ActivityLogController } from "../controllers/activityLogController.js";
import { AuditController } from "../controllers/auditController.js";
import { ExpenseController } from "../controllers/expenseController.js";
import { IssueController } from "../controllers/issueController.js";
import { ProductController } from "../controllers/productController.js";
import { StockMovementController } from "../controllers/stockMovementController.js";
import { DsrDueLedgerController } from "../controllers/dsrDueLedgerController.js";
import { CustomerController } from "../controllers/customerController.js";
import { RetailCustomerController } from "../controllers/retailCustomerController.js";
import { UserController } from "../controllers/userController.js";
import { SettlementController } from "../controllers/settlementController.js";
import { TenantController } from "../controllers/tenantController.js";
import { OrgController } from "../controllers/orgController.js";
import { PermissionController } from "../controllers/permissionController.js";
import { SystemController } from "../controllers/systemController.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireActiveTenant } from "../middleware/requireActiveTenant.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import { createPublicAuthRoutes, createAuthenticatedAuthRoutes } from "./auth.routes.js";
import { createProfileRoutes } from "./profile.routes.js";
import { createPlatformTenantsRoutes } from "./platformTenants.routes.js";
import { createPlatformBackupRoutes } from "./platformBackup.routes.js";
import { createSystemRoutes } from "./system.routes.js";
import { createOrgRoutes } from "./org.routes.js";
import { createPermissionsRoutes } from "./permissions.routes.js";
import { createUsersRoutes } from "./users.routes.js";
import { createActivityLogsRoutes } from "./activityLogs.routes.js";
import { createAuditRoutes } from "./audit.routes.js";
import { createExpensesRoutes } from "./expenses.routes.js";
import { createDsrAdvancesRoutes } from "./dsrAdvances.routes.js";
import { createMonthEndSummaryRoutes } from "./monthEndSummary.routes.js";
import { createProfitReportRoutes } from "./profitReport.routes.js";
import { createDatabaseBackupRoutes } from "./databaseBackup.routes.js";
import { createProductsRoutes } from "./products.routes.js";
import { createStockMovementsRoutes } from "./stockMovements.routes.js";
import { createDsrDueLedgerRoutes } from "./dsrDueLedger.routes.js";
import { createDsrsRoutes } from "./dsrs.routes.js";
import { createCustomersRoutes } from "./customers.routes.js";
import { createRetailCustomersRoutes } from "./retailCustomers.routes.js";
import { createIssuesRoutes } from "./issues.routes.js";
import { createSettlementsRoutes } from "./settlements.routes.js";
import { SupplierController } from "../controllers/supplierController.js";
import { SupplierDueLedgerController } from "../controllers/supplierDueLedgerController.js";
import { PurchaseReceiveController } from "../controllers/purchaseReceiveController.js";
import { SupplierPaymentController } from "../controllers/supplierPaymentController.js";
import { createSuppliersRoutes } from "./suppliers.routes.js";
import { createSupplierDueLedgerRoutes } from "./supplierDueLedger.routes.js";
import { createPurchaseReceiveRoutes } from "./purchaseReceive.routes.js";
import { createSupplierPaymentsRoutes } from "./supplierPayments.routes.js";
import { SalesInvoiceController } from "../controllers/salesInvoiceController.js";
import { CustomerDueLedgerController } from "../controllers/customerDueLedgerController.js";
import { CustomerPaymentController } from "../controllers/customerPaymentController.js";
import { SalesReturnController } from "../controllers/salesReturnController.js";
import { createSalesInvoicesRoutes } from "./salesInvoices.routes.js";
import { createCustomerDueLedgerRoutes } from "./customerDueLedger.routes.js";
import { createCustomerPaymentsRoutes } from "./customerPayments.routes.js";
import { createSalesReturnsRoutes } from "./salesReturns.routes.js";
import { ContactMessageController } from "../controllers/contactMessageController.js";
import { createContactRoutes } from "./contact.routes.js";
import { FinanceAccountController } from "../controllers/financeAccountController.js";
import { FinanceDashboardController } from "../controllers/financeDashboardController.js";
import { createFinanceAccountsRoutes } from "./financeAccounts.routes.js";
import { createFinanceDashboardRoutes } from "./financeDashboard.routes.js";

export function createApiRouter({
  authService,
  env,
  productService,
  dsrService,
  issueService,
  settlementService,
  auditService,
  userService,
  expenseService,
  dsrFinanceService,
  monthEndSummaryService,
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
}) {
  const router = Router();
  const authController = new AuthController(authService, env, tenantService);
  const productController = new ProductController(productService);
  const stockMovementController = new StockMovementController(stockMovementService);
  const dsrDueLedgerController = new DsrDueLedgerController(dsrDueLedgerService);
  const dsrController = new DsrController(dsrService);
  const customerController = new CustomerController(customerService);
  const retailCustomerController = new RetailCustomerController(retailCustomerService);
  const issueController = new IssueController(issueService);
  const settlementController = new SettlementController(settlementService);
  const activityLogController = new ActivityLogController(auditService);
  const auditController = new AuditController(auditService);
  const userController = new UserController(userService);
  const expenseController = new ExpenseController(expenseService);
  const dsrFinanceController = new DsrFinanceController(dsrFinanceService);
  const monthEndSummaryController = new MonthEndSummaryController(monthEndSummaryService);
  const profitController = new ProfitController(profitService);
  const backupController = new BackupController(backupService, databaseManager, auditService);
  const tenantController = new TenantController(tenantService);
  const orgController = new OrgController(tenantService);
  const permissionController = new PermissionController(permissionService);
  const systemController = new SystemController(systemService, errorLogService, env, invariantService);
  const supplierController = new SupplierController(supplierService);
  const supplierDueLedgerController = new SupplierDueLedgerController(supplierDueLedgerService);
  const purchaseReceiveController = new PurchaseReceiveController(purchaseReceiveService);
  const supplierPaymentController = new SupplierPaymentController(supplierPaymentService);
  const salesInvoiceController = new SalesInvoiceController(salesInvoiceService);
  const customerDueLedgerController = new CustomerDueLedgerController(customerDueLedgerService);
  const customerPaymentController = new CustomerPaymentController(customerPaymentService);
  const salesReturnController = new SalesReturnController(salesReturnService);
  const contactMessageController = new ContactMessageController(contactMessageService);
  const financeAccountController = new FinanceAccountController(financeAccountService);
  const financeDashboardController = new FinanceDashboardController(financeDashboardService);

  const loginRateLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });
  const authRateLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });
  const contactRateLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });

  router.use("/auth", createPublicAuthRoutes(authController, { loginRateLimiter, authRateLimiter }));

  // Public contact form — no auth required
  router.use("/contact", createContactRoutes(contactMessageController, { contactRateLimiter }));

  router.use(requireAuth(authService, env, auditService));

  router.use("/auth", createAuthenticatedAuthRoutes(authController));
  router.use("/profile", createProfileRoutes(userController));

  // Platform admin routes — no tenant required, system_developer only
  router.use("/platform/tenants", createPlatformTenantsRoutes(tenantController));
  router.use("/platform/backup", createPlatformBackupRoutes(backupController));

  // System developer routes — no tenant required, system_developer only
  router.use("/system", createSystemRoutes(systemController));

  // All business routes require an active tenant subscription
  router.use(requireActiveTenant);

  router.use("/org", createOrgRoutes(orgController));
  router.use("/permissions", createPermissionsRoutes(permissionController));
  router.use("/users", createUsersRoutes(userController));
  router.use("/activity-logs", createActivityLogsRoutes(activityLogController));
  router.use("/audit", createAuditRoutes(auditController));
  router.use("/expenses", createExpensesRoutes(expenseController));
  router.use("/dsr-advances", createDsrAdvancesRoutes(dsrFinanceController));
  router.use("/month-end-summary", createMonthEndSummaryRoutes(monthEndSummaryController));
  router.use("/profit-report", createProfitReportRoutes(profitController));
  router.use("/database-backup", createDatabaseBackupRoutes(backupController));
  router.use("/products", createProductsRoutes(productController));
  router.use("/stock-movements", createStockMovementsRoutes(stockMovementController));
  router.use("/dsr-due-ledger", createDsrDueLedgerRoutes(dsrDueLedgerController));
  router.use("/dsrs", createDsrsRoutes(dsrController));
  router.use("/customers", createCustomersRoutes(customerController));
  router.use("/retail-customers", createRetailCustomersRoutes(retailCustomerController));
  router.use("/issues", createIssuesRoutes(issueController));
  router.use("/settlements", createSettlementsRoutes(settlementController));
  router.use("/suppliers", createSuppliersRoutes(supplierController));
  router.use("/supplier-due-ledger", createSupplierDueLedgerRoutes(supplierDueLedgerController));
  router.use("/purchase-receive", createPurchaseReceiveRoutes(purchaseReceiveController));
  router.use("/supplier-payments", createSupplierPaymentsRoutes(supplierPaymentController));
  router.use("/sales-invoices", createSalesInvoicesRoutes(salesInvoiceController));
  router.use("/customer-due-ledger", createCustomerDueLedgerRoutes(customerDueLedgerController));
  router.use("/customer-payments", createCustomerPaymentsRoutes(customerPaymentController));
  router.use("/sales-returns", createSalesReturnsRoutes(salesReturnController));
  router.use("/finance-accounts", createFinanceAccountsRoutes(financeAccountController));
  router.use("/finance-dashboard", createFinanceDashboardRoutes(financeDashboardController));

  return router;
}
