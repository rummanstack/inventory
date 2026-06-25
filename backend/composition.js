import dotenv from 'dotenv';
import { backendRoot } from './config/paths.js';
import { DatabaseManager } from './db/pool.js';
import { initializeDatabase } from './services/bootstrapService.js';
import { AuditService } from './services/auditService.js';
import { AuthService } from './services/authService.js';
import { DsrFinanceService } from './services/dsrFinanceService.js';
import { ExpenseService } from './services/expenseService.js';
import { ProfitService } from './services/profitService.js';
import { ProductService } from './services/productService.js';
import { CategoryService } from './services/categoryService.js';
import { DsrService } from './services/dsrService.js';
import { IssueService } from './services/issueService.js';
import { SettlementService } from './services/settlementService.js';
import { UserService } from './services/userService.js';
import { BackupService } from './services/backupService.js';
import { StockMovementService } from './services/stockMovementService.js';
import { ProductSerialService } from './services/productSerialService.js';
import { WarrantyClaimService } from './services/warrantyClaimService.js';
import { RepairJobService } from './services/repairJobService.js';
import { QuotationService } from './services/quotationService.js';
import { TradeInService } from './services/tradeInService.js';
import { BrandService } from './services/brandService.js';
import { DsrDueLedgerService } from './services/dsrDueLedgerService.js';
import { ShopDueLedgerService } from './services/shopDueLedgerService.js';
import { CustomerService } from './services/customerService.js';
import { RetailCustomerService } from './services/retailCustomerService.js';
import { RetailPromotionService } from './services/retailPromotionService.js';
import { HelpDeskService } from './services/helpDeskService.js';
import { TenantService } from './services/tenantService.js';
import { PermissionService } from './services/permissionService.js';
import { SystemService } from './services/systemService.js';
import { InvariantService } from './services/invariantService.js';
import { ErrorLogService } from './services/errorLogService.js';
import { SupplierService } from './services/supplierService.js';
import { SupplierDueLedgerService } from './services/supplierDueLedgerService.js';
import { PurchaseReceiveService } from './services/purchaseReceiveService.js';
import { SupplierPaymentService } from './services/supplierPaymentService.js';
import { SalesInvoiceService } from './services/salesInvoiceService.js';
import { CustomerDueLedgerService } from './services/customerDueLedgerService.js';
import { CustomerPaymentService } from './services/customerPaymentService.js';
import { SalesReturnService } from './services/salesReturnService.js';
import { ContactMessageService } from './services/contactMessageService.js';
import { FinanceAccountService } from './services/financeAccountService.js';
import { FinanceDashboardService } from './services/financeDashboardService.js';
import { DsrDashboardService } from './services/dsrDashboardService.js';
import { RetailCashSessionService } from './services/retailCashSessionService.js';
import { VisitorChatService } from './services/visitorChatService.js';
import { SrService } from './services/srService.js';
import { SrDueLedgerService } from './services/srDueLedgerService.js';
import { createApp } from './app.js';

dotenv.config({ path: `${backendRoot}/.env` });

// Single composition root: server.js (long-running process) and runtime.js (serverless
// handler) both delegate here so the two entry points can never build different dependency
// graphs again — every service that needs financeAccountService gets it, every service that
// exists gets constructed, in exactly one place.
export async function createBackendApp() {
  const { env } = await import('./config/env.js');
  const databaseManager = new DatabaseManager(env.DATABASE_URL);
  await initializeDatabase(databaseManager, env);

  const auditService = new AuditService(databaseManager);
  const authService = new AuthService(databaseManager, { sessionDays: env.SESSION_DAYS, auditService });
  const productService = new ProductService(databaseManager, { auditService });
  const categoryService = new CategoryService(databaseManager, { auditService });
  const dsrService = new DsrService(databaseManager, { auditService });
  const issueService = new IssueService(databaseManager, { auditService });
  const financeAccountService = new FinanceAccountService(databaseManager, { auditService });
  const settlementService = new SettlementService(databaseManager, { auditService, financeAccountService });
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
  const financeDashboardService = new FinanceDashboardService(databaseManager, { financeAccountService, profitService });
  const dsrDashboardService = new DsrDashboardService(databaseManager);
  const retailCashSessionService = new RetailCashSessionService(databaseManager, { auditService });
  const visitorChatService = new VisitorChatService(databaseManager, { auditService });
  const srService = new SrService(databaseManager, { auditService });
  const srDueLedgerService = new SrDueLedgerService(databaseManager, { auditService, financeAccountService });

  const app = createApp({
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
    productSerialService,
    warrantyClaimService,
    repairJobService,
    dsrDueLedgerService,
    shopDueLedgerService,
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
    dsrDashboardService,
    retailCustomerService,
    retailCashSessionService,
    retailPromotionService,
    helpDeskService,
    visitorChatService,
    quotationService,
    tradeInService,
    brandService,
    srService,
    srDueLedgerService,
  });

  return { app, databaseManager, env };
}
