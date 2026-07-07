import { AuditService } from "../services/auditService.js";
import { AuthService } from "../services/authService.js";
import { BackupService } from "../services/backupService.js";
import { BrandService } from "../services/brandService.js";
import { CategoryService } from "../services/categoryService.js";
import { ContactMessageService } from "../services/contactMessageService.js";
import { CustomerDueLedgerService } from "../services/customerDueLedgerService.js";
import { CustomerPaymentService } from "../services/customerPaymentService.js";
import { CustomerService } from "../services/customerService.js";
import { DrugBatchService } from "../services/drugBatchService.js";
import { DsrDueLedgerService } from "../services/dsrDueLedgerService.js";
import { DsrFinanceService } from "../services/dsrFinanceService.js";
import { DsrService } from "../services/dsrService.js";
import { DsrTargetService } from "../services/dsrTargetService.js";
import { EmployeeService } from "../services/employeeService.js";
import { ErrorLogService } from "../services/errorLogService.js";
import { ExpenseService } from "../services/expenseService.js";
import { FinanceAccountService } from "../services/financeAccountService.js";
import { JournalService } from "../services/journalService.js";
import { FinanceDashboardService } from "../services/financeDashboardService.js";
import { GenericMedicineService } from "../services/genericMedicineService.js";
import { HelpDeskService } from "../services/helpDeskService.js";
import { InvariantService } from "../services/invariantService.js";
import { IssueService } from "../services/issueService.js";
import { ManufacturerService } from "../services/manufacturerService.js";
import { PermissionService } from "../services/permissionService.js";
import { ProductSerialService } from "../services/productSerialService.js";
import { ProductService } from "../services/productService.js";
import { ProfitService } from "../services/profitService.js";
import { PurchaseReceiveService } from "../services/purchaseReceiveService.js";
import { PurchaseReturnService } from "../services/purchaseReturnService.js";
import { QuotationService } from "../services/quotationService.js";
import { RepairJobService } from "../services/repairJobService.js";
import { ReportExportService } from "../services/reportExportService.js";
import { RetailCashSessionService } from "../services/retailCashSessionService.js";
import { RetailCustomerService } from "../services/retailCustomerService.js";
import { RetailPromotionService } from "../services/retailPromotionService.js";
import { SalaryPaymentService } from "../services/salaryPaymentService.js";
import { SalesInvoiceService } from "../services/salesInvoiceService.js";
import { SalesReturnService } from "../services/salesReturnService.js";
import { SettlementService } from "../services/settlementService.js";
import { ShopDueLedgerService } from "../services/shopDueLedgerService.js";
import { SrDueLedgerService } from "../services/srDueLedgerService.js";
import { SrService } from "../services/srService.js";
import { StockMovementService } from "../services/stockMovementService.js";
import { SupplierDiscountService } from "../services/supplierDiscountService.js";
import { SupplierDueLedgerService } from "../services/supplierDueLedgerService.js";
import { SupplierPaymentService } from "../services/supplierPaymentService.js";
import { SupplierService } from "../services/supplierService.js";
import { SystemService } from "../services/systemService.js";
import { RegistrationService } from "../services/registrationService.js";
import { TenantService } from "../services/tenantService.js";
import { TradeInService } from "../services/tradeInService.js";
import { UserService } from "../services/userService.js";
import { VisitorChatService } from "../services/visitorChatService.js";
import { WarrantyClaimService } from "../services/warrantyClaimService.js";

export function createServiceRegistry({ databaseManager, env }) {
  const platform = {
    auditService: new AuditService(databaseManager),
    backupService: null,
    errorLogService: null,
    invariantService: null,
    reportExportService: null,
    permissionService: null,
    registrationService: null,
    systemService: null,
    tenantService: null,
    userService: null,
  };

  // Constructed before the `finance` object it lives in because
  // financeAccountService (below) and every other domain service that posts
  // to the general ledger need a reference to it.
  const journalService = new JournalService(databaseManager);

  const finance = {
    financeAccountService: new FinanceAccountService(databaseManager, {
      auditService: platform.auditService,
      journalService,
    }),
    financeDashboardService: null,
    journalService,
    profitService: new ProfitService(databaseManager),
  };

  const catalog = {
    brandService: new BrandService(databaseManager, { auditService: platform.auditService }),
    categoryService: new CategoryService(databaseManager, { auditService: platform.auditService }),
    genericMedicineService: new GenericMedicineService(databaseManager, { auditService: platform.auditService }),
    manufacturerService: new ManufacturerService(databaseManager, { auditService: platform.auditService }),
    productSerialService: new ProductSerialService(databaseManager, { auditService: platform.auditService }),
    productService: new ProductService(databaseManager, { auditService: platform.auditService }),
    stockMovementService: new StockMovementService(databaseManager),
    drugBatchService: new DrugBatchService(databaseManager),
  };

  const customers = {
    contactMessageService: new ContactMessageService(databaseManager, {
      auditService: platform.auditService,
    }),
    customerDueLedgerService: new CustomerDueLedgerService(databaseManager),
    customerPaymentService: new CustomerPaymentService(databaseManager, {
      auditService: platform.auditService,
      financeAccountService: finance.financeAccountService,
      journalService,
    }),
    customerService: new CustomerService(databaseManager, { auditService: platform.auditService }),
    retailCustomerService: new RetailCustomerService(databaseManager, { auditService: platform.auditService }),
    retailPromotionService: new RetailPromotionService(databaseManager, { auditService: platform.auditService }),
    tradeInService: new TradeInService(databaseManager, {
      auditService: platform.auditService,
      financeAccountService: finance.financeAccountService,
    }),
    visitorChatService: new VisitorChatService(databaseManager, { auditService: platform.auditService }),
  };

  const field = {
    dsrDueLedgerService: new DsrDueLedgerService(databaseManager, {
      auditService: platform.auditService,
      financeAccountService: finance.financeAccountService,
    }),
    dsrFinanceService: new DsrFinanceService(databaseManager, {
      auditService: platform.auditService,
      financeAccountService: finance.financeAccountService,
    }),
    dsrService: new DsrService(databaseManager, { auditService: platform.auditService }),
    dsrTargetService: new DsrTargetService(databaseManager, {
      auditService: platform.auditService,
    }),
    issueService: new IssueService(databaseManager, { auditService: platform.auditService }),
    settlementService: null,
    shopDueLedgerService: new ShopDueLedgerService(databaseManager, {
      auditService: platform.auditService,
      financeAccountService: finance.financeAccountService,
    }),
    srDueLedgerService: new SrDueLedgerService(databaseManager, {
      auditService: platform.auditService,
      financeAccountService: finance.financeAccountService,
    }),
    srService: new SrService(databaseManager, { auditService: platform.auditService }),
  };

  const suppliers = {
    purchaseReceiveService: new PurchaseReceiveService(databaseManager, {
      auditService: platform.auditService,
      financeAccountService: finance.financeAccountService,
      journalService,
    }),
    purchaseReturnService: new PurchaseReturnService(databaseManager, {
      auditService: platform.auditService,
    }),
    supplierDiscountService: new SupplierDiscountService(databaseManager, {
      auditService: platform.auditService,
      financeAccountService: finance.financeAccountService,
    }),
    supplierDueLedgerService: new SupplierDueLedgerService(databaseManager),
    supplierPaymentService: new SupplierPaymentService(databaseManager, {
      auditService: platform.auditService,
      financeAccountService: finance.financeAccountService,
      journalService,
    }),
    supplierService: new SupplierService(databaseManager, { auditService: platform.auditService }),
  };

  field.settlementService = new SettlementService(databaseManager, {
    auditService: platform.auditService,
    financeAccountService: finance.financeAccountService,
    supplierDiscountService: suppliers.supplierDiscountService,
  });

  const operations = {
    authService: new AuthService(databaseManager, {
      sessionDays: env.SESSION_DAYS,
      auditService: platform.auditService,
    }),
    expenseService: new ExpenseService(databaseManager, {
      auditService: platform.auditService,
      financeAccountService: finance.financeAccountService,
      journalService,
    }),
    helpDeskService: new HelpDeskService(databaseManager, { auditService: platform.auditService }),
    quotationService: new QuotationService(databaseManager, { auditService: platform.auditService }),
    repairJobService: new RepairJobService(databaseManager, { auditService: platform.auditService }),
    retailCashSessionService: new RetailCashSessionService(databaseManager, {
      auditService: platform.auditService,
    }),
    salesInvoiceService: new SalesInvoiceService(databaseManager, {
      auditService: platform.auditService,
      financeAccountService: finance.financeAccountService,
      journalService,
    }),
    salesReturnService: new SalesReturnService(databaseManager, {
      auditService: platform.auditService,
      financeAccountService: finance.financeAccountService,
    }),
    warrantyClaimService: new WarrantyClaimService(databaseManager, {
      auditService: platform.auditService,
    }),
  };

  const hr = {
    employeeService: new EmployeeService(databaseManager, { auditService: platform.auditService }),
    salaryPaymentService: new SalaryPaymentService(databaseManager, {
      auditService: platform.auditService,
      financeAccountService: finance.financeAccountService,
    }),
  };

  platform.tenantService = new TenantService(databaseManager, {
    auditService: platform.auditService,
  });
  platform.registrationService = new RegistrationService(databaseManager, {
    auditService: platform.auditService,
  });
  platform.userService = new UserService(databaseManager, { auditService: platform.auditService });
  platform.permissionService = new PermissionService(databaseManager, {
    auditService: platform.auditService,
    tenantService: platform.tenantService,
  });
  platform.systemService = new SystemService(databaseManager);
  platform.invariantService = new InvariantService(databaseManager);
  platform.errorLogService = new ErrorLogService(databaseManager);
  platform.backupService = new BackupService(databaseManager, { auditService: platform.auditService });
  platform.reportExportService = new ReportExportService();

  finance.financeDashboardService = new FinanceDashboardService(databaseManager, {
    financeAccountService: finance.financeAccountService,
    profitService: finance.profitService,
  });

  return {
    platform,
    finance,
    catalog,
    customers,
    field,
    suppliers,
    operations,
    hr,
  };
}
