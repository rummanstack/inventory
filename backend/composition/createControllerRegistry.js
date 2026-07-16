import { VoucherController } from "../controllers/voucherController.js";
import { FinancialReportingController } from "../controllers/financialReportingController.js";
import { AccountingController } from "../controllers/accountingController.js";
import { AiInsightController } from "../controllers/aiInsightController.js";
import { ActivityLogController } from "../controllers/activityLogController.js";
import { AttendanceController } from "../controllers/attendanceController.js";
import { LeaveController } from "../controllers/leaveController.js";
import { PayrollController } from "../controllers/payrollController.js";
import { AuditController } from "../controllers/auditController.js";
import { AuthController } from "../controllers/authController.js";
import { BackupController } from "../controllers/backupController.js";
import { BrandController } from "../controllers/brandController.js";
import { CategoryController } from "../controllers/categoryController.js";
import { ContactMessageController } from "../controllers/contactMessageController.js";
import { CustomerController } from "../controllers/customerController.js";
import { CustomerDueLedgerController } from "../controllers/customerDueLedgerController.js";
import { CustomerPaymentController } from "../controllers/customerPaymentController.js";
import { DrugBatchController } from "../controllers/drugBatchController.js";
import { DsrController } from "../controllers/dsrController.js";
import { DsrDueLedgerController } from "../controllers/dsrDueLedgerController.js";
import { DsrTargetController } from "../controllers/dsrTargetController.js";
import { DepartmentController } from "../controllers/departmentController.js";
import { DesignationController } from "../controllers/designationController.js";
import { EmployeeController } from "../controllers/employeeController.js";
import { EmployeeFinanceController } from "../controllers/employeeFinanceController.js";
import { ExpenseController } from "../controllers/expenseController.js";
import { FinanceAccountController } from "../controllers/financeAccountController.js";
import { FinanceDashboardController } from "../controllers/financeDashboardController.js";
import { JournalController } from "../controllers/journalController.js";
import { GenericMedicineController } from "../controllers/genericMedicineController.js";
import { HelpDeskController } from "../controllers/helpDeskController.js";
import { InstallmentController } from "../controllers/installmentController.js";
import { IssueController } from "../controllers/issueController.js";
import { LandingChatController } from "../controllers/landingChatController.js";
import { ManufacturerController } from "../controllers/manufacturerController.js";
import { OrgController } from "../controllers/orgController.js";
import { PermissionController } from "../controllers/permissionController.js";
import { ReportExportController } from "../controllers/reportExportController.js";
import { ProductController } from "../controllers/productController.js";
import { ProductSerialController } from "../controllers/productSerialController.js";
import { ProfitController } from "../controllers/profitController.js";
import { PurchaseReceiveController } from "../controllers/purchaseReceiveController.js";
import { PurchaseReturnController } from "../controllers/purchaseReturnController.js";
import { QuotationController } from "../controllers/quotationController.js";
import { RegistrationController } from "../controllers/registrationController.js";
import { RepairJobController } from "../controllers/repairJobController.js";
import { RetailCashSessionController } from "../controllers/retailCashSessionController.js";
import { RetailCustomerController } from "../controllers/retailCustomerController.js";
import { RetailPromotionController } from "../controllers/retailPromotionController.js";
import { SalaryPaymentController } from "../controllers/salaryPaymentController.js";
import { SalesInvoiceController } from "../controllers/salesInvoiceController.js";
import { SalesReturnController } from "../controllers/salesReturnController.js";
import { SettlementController } from "../controllers/settlementController.js";
import { ShopDueLedgerController } from "../controllers/shopDueLedgerController.js";
import { SrController } from "../controllers/srController.js";
import { SrDueLedgerController } from "../controllers/srDueLedgerController.js";
import { StockMovementController } from "../controllers/stockMovementController.js";
import { SupplierController } from "../controllers/supplierController.js";
import { SupplierDiscountController } from "../controllers/supplierDiscountController.js";
import { SupplierDueLedgerController } from "../controllers/supplierDueLedgerController.js";
import { SupplierPaymentController } from "../controllers/supplierPaymentController.js";
import { SystemController } from "../controllers/systemController.js";
import { TenantController } from "../controllers/tenantController.js";
import { TradeInController } from "../controllers/tradeInController.js";
import { TradePromotionRuleController } from "../controllers/tradePromotionRuleController.js";
import { TradePromotionEarningController } from "../controllers/tradePromotionEarningController.js";
import { TradePromotionSettlementController } from "../controllers/tradePromotionSettlementController.js";
import { UploadController } from "../controllers/uploadController.js";
import { UserController } from "../controllers/userController.js";
import { VisitorChatAdminController } from "../controllers/visitorChatAdminController.js";
import { VisitorChatController } from "../controllers/visitorChatController.js";
import { WarrantyClaimController } from "../controllers/warrantyClaimController.js";

export function createControllerRegistry({ services, env, databaseManager }) {
  return {
    ai: {
      aiInsightController: new AiInsightController(services.ai.aiInsightService),
    },
    public: {
      authController: new AuthController(services.operations.authService, env, services.platform.tenantService),
      contactMessageController: new ContactMessageController(services.customers.contactMessageService),
      landingChatController: new LandingChatController(services.ai.landingChatService),
      registrationController: new RegistrationController(services.platform.registrationService),
      visitorChatController: new VisitorChatController(services.customers.visitorChatService),
    },
    platform: {
      backupController: new BackupController(
        services.platform.backupService,
        databaseManager,
        services.platform.auditService,
      ),
      systemController: new SystemController(
        services.platform.systemService,
        services.platform.errorLogService,
        env,
        services.platform.invariantService,
      ),
      tenantController: new TenantController(services.platform.tenantService),
      visitorChatAdminController: new VisitorChatAdminController(services.customers.visitorChatService),
    },
    tenant: {
      activityLogController: new ActivityLogController(services.platform.auditService),
      auditController: new AuditController(services.platform.auditService),
      reportExportController: new ReportExportController(services.platform.reportExportService, services.platform.auditService),
      orgController: new OrgController(services.platform.tenantService),
      permissionController: new PermissionController(services.platform.permissionService),
      uploadController: new UploadController(services.platform.auditService, services.platform.photoStorageService),
      userController: new UserController(services.platform.userService),
    },
    catalog: {
      brandController: new BrandController(services.catalog.brandService),
      categoryController: new CategoryController(services.catalog.categoryService),
      drugBatchController: new DrugBatchController(services.catalog.drugBatchService),
      genericMedicineController: new GenericMedicineController(services.catalog.genericMedicineService),
      manufacturerController: new ManufacturerController(services.catalog.manufacturerService),
      productController: new ProductController(services.catalog.productService),
      productSerialController: new ProductSerialController(services.catalog.productSerialService),
      stockMovementController: new StockMovementController(services.catalog.stockMovementService),
    },
    customers: {
      contactMessageAdminController: new ContactMessageController(services.customers.contactMessageService),
      customerController: new CustomerController(services.customers.customerService),
      customerDueLedgerController: new CustomerDueLedgerController(services.customers.customerDueLedgerService),
      customerPaymentController: new CustomerPaymentController(services.customers.customerPaymentService),
      retailCustomerController: new RetailCustomerController(services.customers.retailCustomerService),
      retailPromotionController: new RetailPromotionController(services.customers.retailPromotionService),
      tradeInController: new TradeInController(services.customers.tradeInService),
    },
    operations: {
      expenseController: new ExpenseController(services.operations.expenseService),
      helpDeskController: new HelpDeskController(services.operations.helpDeskService),
      installmentController: new InstallmentController(services.operations.installmentPlanService),
      profitController: new ProfitController(services.finance.profitService),
      quotationController: new QuotationController(services.operations.quotationService),
      repairJobController: new RepairJobController(services.operations.repairJobService),
      retailCashSessionController: new RetailCashSessionController(services.operations.retailCashSessionService),
      salesInvoiceController: new SalesInvoiceController(services.operations.salesInvoiceService),
      salesReturnController: new SalesReturnController(services.operations.salesReturnService),
      warrantyClaimController: new WarrantyClaimController(services.operations.warrantyClaimService),
    },
    field: {
      dsrController: new DsrController(services.field.dsrService),
      dsrDueLedgerController: new DsrDueLedgerController(services.field.dsrDueLedgerService),
      dsrTargetController: new DsrTargetController(services.field.dsrTargetService),
      issueController: new IssueController(services.field.issueService),
      settlementController: new SettlementController(services.field.settlementService),
      shopDueLedgerController: new ShopDueLedgerController(services.field.shopDueLedgerService),
      srController: new SrController(services.field.srService),
      srDueLedgerController: new SrDueLedgerController(services.field.srDueLedgerService),
    },
    suppliers: {
      purchaseReceiveController: new PurchaseReceiveController(services.suppliers.purchaseReceiveService),
      purchaseReturnController: new PurchaseReturnController(services.suppliers.purchaseReturnService),
      supplierController: new SupplierController(services.suppliers.supplierService),
      supplierDiscountController: new SupplierDiscountController(services.suppliers.supplierDiscountService),
      supplierDueLedgerController: new SupplierDueLedgerController(services.suppliers.supplierDueLedgerService),
      supplierPaymentController: new SupplierPaymentController(services.suppliers.supplierPaymentService),
    },
    finance: {
      accountingController: new AccountingController(
        services.finance.accountingService,
        services.finance.accountingControlService,
      ),
      voucherController: new VoucherController(services.finance.voucherService),
      financialReportingController: new FinancialReportingController(services.finance.financialReportingService),
      financeAccountController: new FinanceAccountController(services.finance.financeAccountService),
      financeDashboardController: new FinanceDashboardController(services.finance.financeDashboardService),
      journalController: new JournalController(services.finance.journalService),
    },
    hr: {
      attendanceController: new AttendanceController(services.hr.attendanceService),
      leaveController: new LeaveController(services.hr.leaveService),
      departmentController: new DepartmentController(services.hr.departmentService),
      designationController: new DesignationController(services.hr.designationService),
      employeeController: new EmployeeController(services.hr.employeeService),
      employeeFinanceController: new EmployeeFinanceController(services.hr.employeeFinanceService),
      payrollController: new PayrollController(services.hr.payrollService),
      salaryPaymentController: new SalaryPaymentController(services.hr.salaryPaymentService),
    },
    tradePromotions: {
      tradePromotionRuleController: new TradePromotionRuleController(services.tradePromotions.tradePromotionRuleService),
      tradePromotionEarningController: new TradePromotionEarningController(services.tradePromotions.tradePromotionEngineService),
      tradePromotionSettlementController: new TradePromotionSettlementController(services.tradePromotions.tradePromotionSettlementService),
    },
  };
}







