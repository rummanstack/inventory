import { VoucherService } from "../services/voucherService.js";
import { FinancialReportingService } from "../services/financialReportingService.js";
import { AccountingService } from "../services/accountingService.js";
import { AiInsightService } from "../services/aiInsightService.js";
import { AccountingControlService } from "../services/accountingControlService.js";
import { AttendanceService } from "../services/attendanceService.js";
import { LeaveService } from "../services/leaveService.js";
import { PayrollService } from "../services/payrollService.js";
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
import { DsrService } from "../services/dsrService.js";
import { DsrTargetService } from "../services/dsrTargetService.js";
import { DepartmentService } from "../services/departmentService.js";
import { DesignationService } from "../services/designationService.js";
import { EmployeeService } from "../services/employeeService.js";
import { EmployeeFinanceService } from "../services/employeeFinanceService.js";
import { ErrorLogService } from "../services/errorLogService.js";
import { ExpenseService } from "../services/expenseService.js";
import { FinanceAccountService } from "../services/financeAccountService.js";
import { JournalService } from "../services/journalService.js";
import { FinanceDashboardService } from "../services/financeDashboardService.js";
import { GenericMedicineService } from "../services/genericMedicineService.js";
import { GeminiProvider } from "../services/geminiProvider.js";
import { HelpDeskService } from "../services/helpDeskService.js";
import { InstallmentPlanService } from "../services/installmentPlanService.js";
import { InvariantService } from "../services/invariantService.js";
import { IssueService } from "../services/issueService.js";
import { ManufacturerService } from "../services/manufacturerService.js";
import { NotificationService } from "../services/notificationService.js";
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
import { TradePromotionRuleService } from "../services/tradePromotionRuleService.js";
import { TradePromotionEngineService } from "../services/tradePromotionEngineService.js";
import { TradePromotionSettlementService } from "../services/tradePromotionSettlementService.js";
import { UserService } from "../services/userService.js";
import { VisitorChatService } from "../services/visitorChatService.js";
import { WarrantyClaimService } from "../services/warrantyClaimService.js";

export function createServiceRegistry({ databaseManager, env }) {
  const aiProvider = new GeminiProvider(env);

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
    voucherService: null,
    financialReportingService: null,
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
    dsrService: new DsrService(databaseManager, { auditService: platform.auditService }),
    dsrTargetService: new DsrTargetService(databaseManager, {
      auditService: platform.auditService,
    }),
    issueService: new IssueService(databaseManager, { auditService: platform.auditService, journalService }),
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

  // Constructed before `suppliers` (mirrors why journalService itself is built
  // early) because purchaseReceiveService below needs a live reference to
  // tradePromotionEngineService so it can evaluate promotion rules whenever a
  // purchase is created/edited/deleted/restored. tradePromotionEngineService
  // and tradePromotionSettlementService are filled in below, once
  // journalService/financeAccountService are available to inject into them.
  const tradePromotions = {
    tradePromotionRuleService: new TradePromotionRuleService(databaseManager, { auditService: platform.auditService }),
    tradePromotionEngineService: new TradePromotionEngineService(databaseManager, {
      auditService: platform.auditService,
      journalService,
    }),
    tradePromotionSettlementService: new TradePromotionSettlementService(databaseManager, {
      auditService: platform.auditService,
      journalService,
      financeAccountService: finance.financeAccountService,
    }),
  };

  const suppliers = {
    purchaseReceiveService: new PurchaseReceiveService(databaseManager, {
      auditService: platform.auditService,
      financeAccountService: finance.financeAccountService,
      journalService,
      tradePromotionEngineService: tradePromotions.tradePromotionEngineService,
    }),
    purchaseReturnService: new PurchaseReturnService(databaseManager, {
      auditService: platform.auditService,
      journalService,
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
    journalService,
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
    quotationService: new QuotationService(databaseManager, {
      auditService: platform.auditService,
      financeAccountService: finance.financeAccountService,
      journalService,
    }),
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
      journalService,
    }),
    warrantyClaimService: new WarrantyClaimService(databaseManager, {
      auditService: platform.auditService,
    }),
  };

  // Constructed early so it can be handed to installmentPlanService below;
  // also assigned onto `platform` further down for every other caller.
  const reportExportService = new ReportExportService();
  const notificationService = new NotificationService();

  // Constructed after `operations` closes because it needs a live reference to
  // salesInvoiceService (an installment sale creates its underlying invoice via
  // salesInvoiceService.createSalesInvoiceRecord, inside the same transaction).
  operations.installmentPlanService = new InstallmentPlanService(databaseManager, {
    auditService: platform.auditService,
    financeAccountService: finance.financeAccountService,
    salesInvoiceService: operations.salesInvoiceService,
    journalService,
    reportExportService,
    notificationService,
  });

  const hr = {
    attendanceService: new AttendanceService(databaseManager, { auditService: platform.auditService }),
    leaveService: new LeaveService(databaseManager, { auditService: platform.auditService }),
    departmentService: new DepartmentService(databaseManager, { auditService: platform.auditService }),
    designationService: new DesignationService(databaseManager, { auditService: platform.auditService }),
    employeeService: new EmployeeService(databaseManager, { auditService: platform.auditService }),
    employeeFinanceService: new EmployeeFinanceService(databaseManager, { auditService: platform.auditService }),
    payrollService: new PayrollService(databaseManager, { auditService: platform.auditService, journalService, financeAccountService: finance.financeAccountService }),
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
  platform.reportExportService = reportExportService;
  platform.notificationService = notificationService;

  finance.accountingService = new AccountingService(databaseManager, {
    auditService: platform.auditService,
    journalService,
  });

  finance.accountingControlService = new AccountingControlService(databaseManager, {
    auditService: platform.auditService,
    journalService,
  });

  finance.voucherService = new VoucherService(databaseManager, {
    auditService: platform.auditService,
    journalService,
  });

  finance.financialReportingService = new FinancialReportingService(databaseManager, {
    auditService: platform.auditService,
  });

  finance.financeDashboardService = new FinanceDashboardService(databaseManager, {
    financeAccountService: finance.financeAccountService,
    profitService: finance.profitService,
  });

  const ai = {
    aiInsightService: new AiInsightService(databaseManager, { provider: aiProvider, env }),
  };

  return {
    ai,
    platform,
    finance,
    catalog,
    customers,
    field,
    suppliers,
    operations,
    hr,
    tradePromotions,
  };
}



