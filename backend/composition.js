import dotenv from "dotenv";
import { backendRoot } from "./config/paths.js";
import { DatabaseManager } from "./db/pool.js";
import { initializeDatabase } from "./services/bootstrapService.js";
import { AuditService } from "./services/auditService.js";
import { AuthService } from "./services/authService.js";
import { DsrFinanceService } from "./services/dsrFinanceService.js";
import { ExpenseService } from "./services/expenseService.js";
import { ProfitService } from "./services/profitService.js";
import { ProductService } from "./services/productService.js";
import { CategoryService } from "./services/categoryService.js";
import { DsrService } from "./services/dsrService.js";
import { IssueService } from "./services/issueService.js";
import { SettlementService } from "./services/settlementService.js";
import { UserService } from "./services/userService.js";
import { BackupService } from "./services/backupService.js";
import { StockMovementService } from "./services/stockMovementService.js";
import { ProductSerialService } from "./services/productSerialService.js";
import { WarrantyClaimService } from "./services/warrantyClaimService.js";
import { RepairJobService } from "./services/repairJobService.js";
import { QuotationService } from "./services/quotationService.js";
import { TradeInService } from "./services/tradeInService.js";
import { BrandService } from "./services/brandService.js";
import { ManufacturerService } from "./services/manufacturerService.js";
import { GenericMedicineService } from "./services/genericMedicineService.js";
import { DsrDueLedgerService } from "./services/dsrDueLedgerService.js";
import { ShopDueLedgerService } from "./services/shopDueLedgerService.js";
import { CustomerService } from "./services/customerService.js";
import { RetailCustomerService } from "./services/retailCustomerService.js";
import { RetailPromotionService } from "./services/retailPromotionService.js";
import { HelpDeskService } from "./services/helpDeskService.js";
import { TenantService } from "./services/tenantService.js";
import { PermissionService } from "./services/permissionService.js";
import { SystemService } from "./services/systemService.js";
import { InvariantService } from "./services/invariantService.js";
import { ErrorLogService } from "./services/errorLogService.js";
import { SupplierService } from "./services/supplierService.js";
import { SupplierDueLedgerService } from "./services/supplierDueLedgerService.js";
import { PurchaseReceiveService } from "./services/purchaseReceiveService.js";
import { SupplierPaymentService } from "./services/supplierPaymentService.js";
import { SalesInvoiceService } from "./services/salesInvoiceService.js";
import { CustomerDueLedgerService } from "./services/customerDueLedgerService.js";
import { CustomerPaymentService } from "./services/customerPaymentService.js";
import { SalesReturnService } from "./services/salesReturnService.js";
import { ContactMessageService } from "./services/contactMessageService.js";
import { FinanceAccountService } from "./services/financeAccountService.js";
import { FinanceDashboardService } from "./services/financeDashboardService.js";
import { RetailCashSessionService } from "./services/retailCashSessionService.js";
import { VisitorChatService } from "./services/visitorChatService.js";
import { SrService } from "./services/srService.js";
import { SrDueLedgerService } from "./services/srDueLedgerService.js";
import { SupplierDiscountService } from "./services/supplierDiscountService.js";
import { EmployeeService } from "./services/employeeService.js";
import { DsrTargetService } from "./services/dsrTargetService.js";
import { SalaryPaymentService } from "./services/salaryPaymentService.js";
import { DrugBatchService } from "./services/drugBatchService.js";

import { ActivityLogController } from "./controllers/activityLogController.js";
import { AuditController } from "./controllers/auditController.js";
import { AuthController } from "./controllers/authController.js";
import { BackupController } from "./controllers/backupController.js";
import { BrandController } from "./controllers/brandController.js";
import { CategoryController } from "./controllers/categoryController.js";
import { ContactMessageController } from "./controllers/contactMessageController.js";
import { CustomerController } from "./controllers/customerController.js";
import { CustomerDueLedgerController } from "./controllers/customerDueLedgerController.js";
import { CustomerPaymentController } from "./controllers/customerPaymentController.js";
import { DrugBatchController } from "./controllers/drugBatchController.js";
import { DsrController } from "./controllers/dsrController.js";
import { DsrDueLedgerController } from "./controllers/dsrDueLedgerController.js";
import { DsrFinanceController } from "./controllers/dsrFinanceController.js";
import { DsrTargetController } from "./controllers/dsrTargetController.js";
import { EmployeeController } from "./controllers/employeeController.js";
import { ExpenseController } from "./controllers/expenseController.js";
import { FinanceAccountController } from "./controllers/financeAccountController.js";
import { FinanceDashboardController } from "./controllers/financeDashboardController.js";
import { GenericMedicineController } from "./controllers/genericMedicineController.js";
import { HelpDeskController } from "./controllers/helpDeskController.js";
import { IssueController } from "./controllers/issueController.js";
import { ManufacturerController } from "./controllers/manufacturerController.js";
import { OrgController } from "./controllers/orgController.js";
import { PermissionController } from "./controllers/permissionController.js";
import { ProductController } from "./controllers/productController.js";
import { ProductSerialController } from "./controllers/productSerialController.js";
import { ProfitController } from "./controllers/profitController.js";
import { PurchaseReceiveController } from "./controllers/purchaseReceiveController.js";
import { QuotationController } from "./controllers/quotationController.js";
import { RepairJobController } from "./controllers/repairJobController.js";
import { RetailCashSessionController } from "./controllers/retailCashSessionController.js";
import { RetailCustomerController } from "./controllers/retailCustomerController.js";
import { RetailPromotionController } from "./controllers/retailPromotionController.js";
import { SalaryPaymentController } from "./controllers/salaryPaymentController.js";
import { SalesInvoiceController } from "./controllers/salesInvoiceController.js";
import { SalesReturnController } from "./controllers/salesReturnController.js";
import { SettlementController } from "./controllers/settlementController.js";
import { ShopDueLedgerController } from "./controllers/shopDueLedgerController.js";
import { SrController } from "./controllers/srController.js";
import { SrDueLedgerController } from "./controllers/srDueLedgerController.js";
import { StockMovementController } from "./controllers/stockMovementController.js";
import { SupplierController } from "./controllers/supplierController.js";
import { SupplierDiscountController } from "./controllers/supplierDiscountController.js";
import { SupplierDueLedgerController } from "./controllers/supplierDueLedgerController.js";
import { SupplierPaymentController } from "./controllers/supplierPaymentController.js";
import { SystemController } from "./controllers/systemController.js";
import { TenantController } from "./controllers/tenantController.js";
import { TradeInController } from "./controllers/tradeInController.js";
import { UploadController } from "./controllers/uploadController.js";
import { UserController } from "./controllers/userController.js";
import { VisitorChatAdminController } from "./controllers/visitorChatAdminController.js";
import { VisitorChatController } from "./controllers/visitorChatController.js";
import { WarrantyClaimController } from "./controllers/warrantyClaimController.js";
import { createApp } from "./app.js";

dotenv.config({ path: `${backendRoot}/.env` });

export async function createBackendApp() {
  const { env } = await import("./config/env.js");
  const databaseManager = new DatabaseManager(env.DATABASE_URL);
  await initializeDatabase(databaseManager, env);

  const auditService = new AuditService(databaseManager);
  const authService = new AuthService(databaseManager, { sessionDays: env.SESSION_DAYS, auditService });
  const productService = new ProductService(databaseManager, { auditService });
  const categoryService = new CategoryService(databaseManager, { auditService });
  const dsrService = new DsrService(databaseManager, { auditService });
  const issueService = new IssueService(databaseManager, { auditService });
  const financeAccountService = new FinanceAccountService(databaseManager, { auditService });
  const supplierDiscountService = new SupplierDiscountService(databaseManager, { auditService, financeAccountService });
  const settlementService = new SettlementService(databaseManager, {
    auditService,
    financeAccountService,
    supplierDiscountService,
  });
  const userService = new UserService(databaseManager, { auditService });
  const expenseService = new ExpenseService(databaseManager, { auditService, financeAccountService });
  const dsrFinanceService = new DsrFinanceService(databaseManager, { auditService, financeAccountService });
  const profitService = new ProfitService(databaseManager);
  const backupService = new BackupService(databaseManager, { auditService });
  const stockMovementService = new StockMovementService(databaseManager);
  const productSerialService = new ProductSerialService(databaseManager, { auditService });
  const warrantyClaimService = new WarrantyClaimService(databaseManager, { auditService });
  const repairJobService = new RepairJobService(databaseManager, { auditService });
  const quotationService = new QuotationService(databaseManager, { auditService });
  const tradeInService = new TradeInService(databaseManager, { auditService, financeAccountService });
  const brandService = new BrandService(databaseManager, { auditService });
  const manufacturerService = new ManufacturerService(databaseManager, { auditService });
  const genericMedicineService = new GenericMedicineService(databaseManager, { auditService });
  const dsrDueLedgerService = new DsrDueLedgerService(databaseManager, { auditService, financeAccountService });
  const shopDueLedgerService = new ShopDueLedgerService(databaseManager, { auditService, financeAccountService });
  const customerService = new CustomerService(databaseManager, { auditService });
  const retailCustomerService = new RetailCustomerService(databaseManager, { auditService });
  const helpDeskService = new HelpDeskService(databaseManager, { auditService });
  const retailPromotionService = new RetailPromotionService(databaseManager, { auditService });
  const tenantService = new TenantService(databaseManager);
  const permissionService = new PermissionService(databaseManager, { auditService, tenantService });
  const systemService = new SystemService(databaseManager);
  const invariantService = new InvariantService(databaseManager);
  const errorLogService = new ErrorLogService(databaseManager);
  const supplierService = new SupplierService(databaseManager, { auditService });
  const supplierDueLedgerService = new SupplierDueLedgerService(databaseManager);
  const purchaseReceiveService = new PurchaseReceiveService(databaseManager, { auditService, financeAccountService });
  const supplierPaymentService = new SupplierPaymentService(databaseManager, { auditService, financeAccountService });
  const salesInvoiceService = new SalesInvoiceService(databaseManager, { auditService, financeAccountService });
  const customerDueLedgerService = new CustomerDueLedgerService(databaseManager);
  const customerPaymentService = new CustomerPaymentService(databaseManager, { auditService, financeAccountService });
  const salesReturnService = new SalesReturnService(databaseManager, { auditService, financeAccountService });
  const contactMessageService = new ContactMessageService(databaseManager);
  const financeDashboardService = new FinanceDashboardService(databaseManager, {
    financeAccountService,
    profitService,
  });
  const retailCashSessionService = new RetailCashSessionService(databaseManager, { auditService });
  const visitorChatService = new VisitorChatService(databaseManager, { auditService });
  const srService = new SrService(databaseManager, { auditService });
  const srDueLedgerService = new SrDueLedgerService(databaseManager, { auditService, financeAccountService });
  const dsrTargetService = new DsrTargetService(databaseManager);
  const employeeService = new EmployeeService(databaseManager, { auditService });
  const salaryPaymentService = new SalaryPaymentService(databaseManager, { auditService, financeAccountService });
  const drugBatchService = new DrugBatchService(databaseManager);

  const controllers = {
    activityLogController: new ActivityLogController(auditService),
    auditController: new AuditController(auditService),
    authController: new AuthController(authService, env, tenantService),
    backupController: new BackupController(backupService, databaseManager, auditService),
    brandController: new BrandController(brandService),
    categoryController: new CategoryController(categoryService),
    contactMessageController: new ContactMessageController(contactMessageService),
    customerController: new CustomerController(customerService),
    customerDueLedgerController: new CustomerDueLedgerController(customerDueLedgerService),
    customerPaymentController: new CustomerPaymentController(customerPaymentService),
    drugBatchController: new DrugBatchController(drugBatchService),
    dsrController: new DsrController(dsrService),
    dsrDueLedgerController: new DsrDueLedgerController(dsrDueLedgerService),
    dsrFinanceController: new DsrFinanceController(dsrFinanceService),
    dsrTargetController: new DsrTargetController(dsrTargetService),
    employeeController: new EmployeeController(employeeService),
    expenseController: new ExpenseController(expenseService),
    financeAccountController: new FinanceAccountController(financeAccountService),
    financeDashboardController: new FinanceDashboardController(financeDashboardService),
    genericMedicineController: new GenericMedicineController(genericMedicineService),
    helpDeskController: new HelpDeskController(helpDeskService),
    issueController: new IssueController(issueService),
    manufacturerController: new ManufacturerController(manufacturerService),
    orgController: new OrgController(tenantService),
    permissionController: new PermissionController(permissionService),
    productController: new ProductController(productService),
    productSerialController: new ProductSerialController(productSerialService),
    profitController: new ProfitController(profitService),
    purchaseReceiveController: new PurchaseReceiveController(purchaseReceiveService),
    quotationController: new QuotationController(quotationService),
    repairJobController: new RepairJobController(repairJobService),
    retailCashSessionController: new RetailCashSessionController(retailCashSessionService),
    retailCustomerController: new RetailCustomerController(retailCustomerService),
    retailPromotionController: new RetailPromotionController(retailPromotionService),
    salaryPaymentController: new SalaryPaymentController(salaryPaymentService),
    salesInvoiceController: new SalesInvoiceController(salesInvoiceService),
    salesReturnController: new SalesReturnController(salesReturnService),
    settlementController: new SettlementController(settlementService),
    shopDueLedgerController: new ShopDueLedgerController(shopDueLedgerService),
    srController: new SrController(srService),
    srDueLedgerController: new SrDueLedgerController(srDueLedgerService),
    stockMovementController: new StockMovementController(stockMovementService),
    supplierController: new SupplierController(supplierService),
    supplierDiscountController: new SupplierDiscountController(supplierDiscountService),
    supplierDueLedgerController: new SupplierDueLedgerController(supplierDueLedgerService),
    supplierPaymentController: new SupplierPaymentController(supplierPaymentService),
    systemController: new SystemController(systemService, errorLogService, env, invariantService),
    tenantController: new TenantController(tenantService),
    tradeInController: new TradeInController(tradeInService),
    uploadController: new UploadController(),
    userController: new UserController(userService),
    visitorChatAdminController: new VisitorChatAdminController(visitorChatService),
    visitorChatController: new VisitorChatController(visitorChatService),
    warrantyClaimController: new WarrantyClaimController(warrantyClaimService),
  };

  const app = createApp({
    controllers,
    authService,
    env,
    auditService,
    errorLogService,
  });

  return { app, databaseManager, env };
}
