import dotenv from 'dotenv';
import { createApp } from './app.js';
import { backendRoot } from './config/paths.js';
import { DatabaseManager } from './db/pool.js';
import { initializeDatabase } from './services/bootstrapService.js';
import { AuditService } from './services/auditService.js';
import { AuthService } from './services/authService.js';
import { DsrFinanceService } from './services/dsrFinanceService.js';
import { MonthEndSummaryService } from './services/monthEndSummaryService.js';
import { ExpenseService } from './services/expenseService.js';
import { ProfitService } from './services/profitService.js';
import { ProductService } from './services/productService.js';
import { DsrService } from './services/dsrService.js';
import { IssueService } from './services/issueService.js';
import { SettlementService } from './services/settlementService.js';
import { UserService } from './services/userService.js';
import { BackupService } from './services/backupService.js';
import { StockMovementService } from './services/stockMovementService.js';
import { DsrDueLedgerService } from './services/dsrDueLedgerService.js';
import { CustomerService } from './services/customerService.js';
import { TenantService } from './services/tenantService.js';
import { PermissionService } from './services/permissionService.js';
import { SystemService } from './services/systemService.js';
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

dotenv.config({ path: `${backendRoot}/.env` });

async function start() {
  const { env } = await import('./config/env.js');
  const databaseManager = new DatabaseManager(env.DATABASE_URL);
  await initializeDatabase(databaseManager, env);

  const auditService = new AuditService(databaseManager);
  const authService = new AuthService(databaseManager, { sessionDays: env.SESSION_DAYS, auditService });
  const productService = new ProductService(databaseManager, { auditService });
  const dsrService = new DsrService(databaseManager, { auditService });
  const issueService = new IssueService(databaseManager, { auditService });
  const financeAccountService = new FinanceAccountService(databaseManager, { auditService });
  const settlementService = new SettlementService(databaseManager, { auditService, financeAccountService });
  const userService = new UserService(databaseManager, { auditService });
  const expenseService = new ExpenseService(databaseManager, { auditService, financeAccountService });
  const dsrFinanceService = new DsrFinanceService(databaseManager, { auditService, financeAccountService });
  const monthEndSummaryService = new MonthEndSummaryService(databaseManager);
  const profitService = new ProfitService(databaseManager);
  const backupService = new BackupService(databaseManager, { auditService });
  const stockMovementService = new StockMovementService(databaseManager);
  const dsrDueLedgerService = new DsrDueLedgerService(databaseManager, { auditService, financeAccountService });
  const customerService = new CustomerService(databaseManager, { auditService });
  const tenantService = new TenantService(databaseManager);
  const permissionService = new PermissionService(databaseManager, { auditService, tenantService });
  const systemService = new SystemService(databaseManager);
  const errorLogService = new ErrorLogService(databaseManager);
  const supplierService = new SupplierService(databaseManager, { auditService });
  const supplierDueLedgerService = new SupplierDueLedgerService(databaseManager);
  const purchaseReceiveService = new PurchaseReceiveService(databaseManager, { auditService, financeAccountService });
  const supplierPaymentService = new SupplierPaymentService(databaseManager, { auditService, financeAccountService });
  const salesInvoiceService = new SalesInvoiceService(databaseManager, { auditService, financeAccountService });
  const customerDueLedgerService = new CustomerDueLedgerService(databaseManager);
  const customerPaymentService = new CustomerPaymentService(databaseManager, { auditService, financeAccountService });
  const salesReturnService = new SalesReturnService(databaseManager, { auditService });
  const contactMessageService = new ContactMessageService(databaseManager);
  const financeDashboardService = new FinanceDashboardService(databaseManager, { financeAccountService, profitService });
  const app = createApp({ authService, env, productService, dsrService, issueService, settlementService, auditService, userService, expenseService, dsrFinanceService, monthEndSummaryService, profitService, backupService, stockMovementService, dsrDueLedgerService, customerService, databaseManager, tenantService, permissionService, systemService, errorLogService, supplierService, supplierDueLedgerService, purchaseReceiveService, supplierPaymentService, salesInvoiceService, customerDueLedgerService, customerPaymentService, salesReturnService, contactMessageService, financeAccountService, financeDashboardService });

  app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
    console.log(`Database: ${process.env.npm_lifecycle_event === 'dev' && process.env.DEV_DATABASE_URL ? 'DEV_DATABASE_URL (test)' : 'DATABASE_URL (live)'}`);
    if (databaseManager.isUsingFallbackDatabase()) {
      console.log('DATABASE_URL database name was unavailable, using "postgres" instead.');
    }
  });
}

start().catch((error) => {
  console.error('Failed to start server');
  console.error(error);
  process.exit(1);
});
