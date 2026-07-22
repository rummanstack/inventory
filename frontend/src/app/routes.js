import { lazy } from 'react';
import {
  CircleDollarSign,
  BarChart3,
  Banknote,
  Boxes,
  Building2,
  ClipboardList,
  CreditCard,
  FileText,
  HandCoins,
  KeyRound,
  Inbox,
  Receipt,
  RotateCcw,
  Undo2,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Trash2,
  Truck,
  Users,
  UserCheck,
  UserCog,
  IdCard,
  Database,
  Activity,
  Bug,
  PackageX,
  Wallet,
  LayoutDashboard,
  LayoutGrid,
  Landmark,
  Tag,
  MessageCircle,
  ArrowLeftRight,
  AlertTriangle,
  Fingerprint,
  Vault,
  Wrench,
  BookOpen,
  Scale,
  BriefcaseBusiness,
  Gift,
} from 'lucide-react';
const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage'));
const ActivityLogsPage = lazy(() => import('../features/activity-logs/pages/ActivityLogsPage'));
const IssueCenterPage = lazy(() => import('../features/issue-center/pages/IssueCenterPage'));
const DsrPage = lazy(() => import('../features/dsrs/pages/DsrPage'));
const ExpensesPage = lazy(() => import('../features/expenses/pages/ExpensesPage'));
const DsrFinancePage = lazy(() => import('../features/dsr-finance/pages/DsrFinancePage'));
const ProfitPage = lazy(() => import('../features/profit/pages/ProfitPage'));
const TrialBalancePage = lazy(() => import('../features/journal/pages/TrialBalancePage'));
const GeneralLedgerPage = lazy(() => import('../features/journal/pages/GeneralLedgerPage'));
const AccountLedgerPage = lazy(() => import('../features/journal/pages/AccountLedgerPage'));
const CustomerLedgerPage = lazy(() => import('../features/journal/pages/CustomerLedgerPage'));
const SupplierLedgerPage = lazy(() => import('../features/journal/pages/SupplierLedgerPage'));
const CashBookPage = lazy(() => import('../features/journal/pages/CashBookPage'));
const BankBookPage = lazy(() => import('../features/journal/pages/BankBookPage'));
const BalanceSheetPage = lazy(() => import('../features/journal/pages/BalanceSheetPage'));
const ProfitAndLossPage = lazy(() => import('../features/journal/pages/ProfitAndLossPage'));
const CashFlowPage = lazy(() => import('../features/journal/pages/CashFlowPage'));
const AccountingDashboardPage = lazy(() => import('../features/accounting-foundation/pages/AccountingDashboardPage'));
const ChartOfAccountsPage = lazy(() => import('../features/accounting-foundation/pages/ChartOfAccountsPage'));
const FiscalYearsPage = lazy(() => import('../features/accounting-foundation/pages/FiscalYearsPage'));
const OpeningBalancesPage = lazy(() => import('../features/accounting-foundation/pages/OpeningBalancesPage'));
const AccountingSettingsPage = lazy(() => import('../features/accounting-foundation/pages/AccountingSettingsPage'));
const JournalVouchersPage = lazy(() => import('../features/vouchers/pages/JournalVouchersPage.jsx'));
const ReceiptVouchersPage = lazy(() => import('../features/vouchers/pages/ReceiptVouchersPage.jsx'));
const PaymentVouchersPage = lazy(() => import('../features/vouchers/pages/PaymentVouchersPage.jsx'));
const ContraVouchersPage = lazy(() => import('../features/vouchers/pages/ContraVouchersPage.jsx'));
const VoucherRegisterPage = lazy(() => import('../features/vouchers/pages/VoucherRegisterPage.jsx'));
const JournalRegisterPage = lazy(() => import('../features/vouchers/pages/JournalRegisterPage.jsx'));
const MorningIssuePage = lazy(() => import('../features/morning-issue/pages/MorningIssuePage'));
const ProductsPage = lazy(() => import('../features/products/pages/ProductsPage'));
const DailyReportsPage = lazy(() => import('../features/reports/pages/DailyReportsPage'));
const HistoryPage = lazy(() => import('../features/history/pages/HistoryPage'));
const BatchSalesReportPage = lazy(() => import('../features/pharmacy/pages/BatchSalesReportPage'));
const ExpiryAlertsPage = lazy(() => import('../features/pharmacy/pages/ExpiryAlertsPage'));
const EveningSettlementPage = lazy(() => import('../features/settlements/pages/EveningSettlementPage'));
const DatabaseBackupPage = lazy(() => import('../features/database-backup/pages/DatabaseBackupPage'));
const OrgSettingsPage = lazy(() => import('../features/settings/pages/OrgSettingsPage'));
const PermissionsPage = lazy(() => import('../features/permissions/pages/PermissionsPage'));
const UsersPage = lazy(() => import('../features/users/pages/UsersPage'));
const PlatformAdminPage = lazy(() => import('../features/platform/pages/PlatformAdminPage'));
const VisitorChatsPage = lazy(() => import('../features/platform/pages/VisitorChatsPage'));
const ContactMessagesPage = lazy(() => import('../features/platform/pages/ContactMessagesPage'));
const RegistrationRequestsPage = lazy(() => import('../features/platform/pages/RegistrationRequestsPage'));
const ProfilePage = lazy(() => import('../features/profile/pages/ProfilePage'));
const SecurityPage = lazy(() => import('../features/security/pages/SecurityPage'));
const SystemHealthPage = lazy(() => import('../features/system/pages/SystemHealthPage'));
const ErrorLogsPage = lazy(() => import('../features/system/pages/ErrorLogsPage'));
const ShopsPage = lazy(() => import('../features/shops/pages/ShopsPage'));
const ShopDueLedgerPage = lazy(() => import('../features/shops/pages/ShopDueLedgerPage'));
const SrPage = lazy(() => import('../features/srs/pages/SrPage'));
const SrDueLedgerPage = lazy(() => import('../features/sr-due-ledger/pages/SrDueLedgerPage'));
const RetailCustomersPage = lazy(() => import('../features/retail-customers/pages/RetailCustomersPage'));
const RetailCustomerRetentionPage = lazy(() => import('../features/retail-customers/pages/RetailCustomerRetentionPage'));
const HelpDeskPage = lazy(() => import('../features/help-desk/pages/HelpDeskPage'));
const TrashPage = lazy(() => import('../features/trash/pages/TrashPage'));
const DamagedStockPage = lazy(() => import('../features/damaged-stock/pages/DamagedStockPage'));
const SuppliersPage = lazy(() => import('../features/suppliers/pages/SuppliersPage'));
const PurchaseReceivePage = lazy(() => import('../features/purchase-receive/pages/PurchaseReceivePage'));
const PurchaseReturnsPage = lazy(() => import('../features/purchase-returns/pages/PurchaseReturnsPage'));
const SupplierPaymentsPage = lazy(() => import('../features/supplier-payments/pages/SupplierPaymentsPage'));
const SupplierDiscountsPage = lazy(() => import('../features/supplier-discounts/pages/SupplierDiscountsPage'));
const SupplierStatementPage = lazy(() => import('../features/supplier-statement/pages/SupplierStatementPage'));
const TradePromotionRulesPage = lazy(() => import('../features/trade-promotions/rules/pages/TradePromotionRulesPage'));
const TradePromotionEarningsPage = lazy(() => import('../features/trade-promotions/earnings/pages/TradePromotionEarningsPage'));
const TradePromotionSettlementsPage = lazy(() => import('../features/trade-promotions/settlements/pages/TradePromotionSettlementsPage'));
const TradePromotionReportsPage = lazy(() => import('../features/trade-promotions/reports/pages/TradePromotionReportsPage'));
const QuickSalePage = lazy(() => import('../features/retailer/quick-sale/pages/QuickSalePage'));
const ProductBrowserPage = lazy(() => import('../features/product-browser/pages/ProductBrowserPage'));
const SalesInvoicesPage = lazy(() => import('../features/retailer/sales-invoices/pages/SalesInvoicesPage'));
const RetailPromotionsPage = lazy(() => import('../features/retailer/promotions/pages/RetailPromotionsPage'));
const CustomerDuePage = lazy(() => import('../features/retailer/customer-due/pages/CustomerDuePage'));
const DueCollectionPage = lazy(() => import('../features/retailer/due-collection/pages/DueCollectionPage'));
const SalesReturnPage = lazy(() => import('../features/retailer/sales-return/pages/SalesReturnPage'));
const DailySalesReportPage = lazy(() => import('../features/retailer/daily-sales-report/pages/DailySalesReportPage'));
const FinanceDashboardPage = lazy(() => import('../features/finance-dashboard/pages/FinanceDashboardPage'));
const FinanceAccountsPage = lazy(() => import('../features/finance-accounts/pages/FinanceAccountsPage'));
const StockMovementPage = lazy(() => import('../features/stock-movement/pages/StockMovementPage'));
const LowStockAlertsPage = lazy(() => import('../features/low-stock-alerts/pages/LowStockAlertsPage'));
const ProductSerialsPage = lazy(() => import('../features/product-serials/pages/ProductSerialsPage'));
const WarrantyClaimsPage = lazy(() => import('../features/warranty-claims/pages/WarrantyClaimsPage'));
const RepairJobsPage = lazy(() => import('../features/repair-jobs/pages/RepairJobsPage'));
const CashSessionsPage = lazy(() => import('../features/retailer/cash-sessions/pages/CashSessionsPage'));
const QuotationsPage = lazy(() => import('../features/quotations/pages/QuotationsPage'));
const TradeInsPage = lazy(() => import('../features/trade-ins/pages/TradeInsPage'));
const DepartmentsPage = lazy(() => import('../features/hr/departments/pages/DepartmentsPage'));
const DesignationsPage = lazy(() => import('../features/hr/designations/pages/DesignationsPage'));
const EmployeesPage = lazy(() => import('../features/hr/employees/pages/EmployeesPage'));
const SalaryPaymentsPage = lazy(() => import('../features/hr/salary-payments/pages/SalaryPaymentsPage'));
const AttendancePage = lazy(() => import('../features/hr/attendance/pages/AttendancePage'));
const LeavePage = lazy(() => import('../features/hr/leave/pages/LeavePage'));
const PayrollPage = lazy(() => import('../features/hr/payroll/pages/PayrollPage'));
const AdvancesPage = lazy(() => import('../features/hr/employee-finance/pages/AdvancesPage'));
const LoansPage = lazy(() => import('../features/hr/employee-finance/pages/LoansPage'));
const HrReportsPage = lazy(() => import('../features/hr/reports/pages/HrReportsPage'));
const InstallmentPlansPage = lazy(() => import('../features/installment-sales/pages/InstallmentPlansPage'));
const InstallmentPlanDetailPage = lazy(() => import('../features/installment-sales/pages/InstallmentPlanDetailPage'));
const InstallmentReportsPage = lazy(() => import('../features/installment-sales/pages/InstallmentReportsPage'));
const InstallmentDashboardPage = lazy(() => import('../features/installment-sales/pages/InstallmentDashboardPage'));
const LateFeeRulesPage = lazy(() => import('../features/installment-sales/pages/LateFeeRulesPage'));

export const APP_ROUTES = [
  // 1. Dashboard
  { id: 'dashboard', path: '/dashboard', labelKey: 'nav.dashboard', icon: BarChart3, component: DashboardPage, group: 'overview', permission: 'view_state', feature: 'dashboard' },

  // 2. Point of Sale
  { id: 'retailer-quick-sale', path: '/retailer/quick-sale', labelKey: 'nav.retailerQuickSale', icon: ShoppingBag, component: QuickSalePage, group: 'pos', permission: 'manage_retail_quick_sale', feature: 'retailer-quick-sale' },
  { id: 'product-browser', path: '/product-browser', labelKey: 'nav.productBrowser', icon: LayoutGrid, component: ProductBrowserPage, group: 'pos', permission: 'view_product_browser', feature: 'product-browser' },
  { id: 'cash-session-history', path: '/retailer/cash-sessions', labelKey: 'nav.cashSessionHistory', icon: Vault, component: CashSessionsPage, group: 'pos', permission: 'manage_retail_quick_sale', feature: 'retailer-cash-sessions' },
  { id: 'quotations', path: '/quotations', labelKey: 'nav.quotations', icon: FileText, component: QuotationsPage, group: 'pos', permission: 'view_quotations', feature: 'quotations' },
  { id: 'retailer-promotions', path: '/retailer/promotions', labelKey: 'nav.retailerPromotions', icon: Tag, component: RetailPromotionsPage, group: 'pos', permission: 'manage_retail_promotions', feature: 'retailer-promotions' },
  { id: 'trade-ins', path: '/trade-ins', labelKey: 'nav.tradeIns', icon: ArrowLeftRight, component: TradeInsPage, group: 'pos', permission: 'view_trade_ins', feature: 'trade-ins' },
  { id: 'retailer-sales-invoices', path: '/retailer/sales-invoices', labelKey: 'nav.retailerSalesInvoices', icon: Receipt, component: SalesInvoicesPage, group: 'pos', permission: 'view_retail_sales_invoices', feature: 'retailer-sales-invoices' },
  { id: 'retailer-sales-return', path: '/retailer/sales-return', labelKey: 'nav.retailerSalesReturn', icon: RotateCcw, component: SalesReturnPage, group: 'pos', permission: 'view_retail_sales_returns', feature: 'retailer-sales-return' },

  // 3. Customers
  { id: 'retail-customers', path: '/retail-customers', labelKey: 'nav.retailCustomers', icon: Users, component: RetailCustomersPage, group: 'customers', permission: 'view_retail_customers', feature: 'retail-customers' },
  { id: 'retail-customer-retention', path: '/retail-customers/retention', labelKey: 'nav.retailCustomerRetention', icon: TrendingUp, component: RetailCustomerRetentionPage, group: 'customers', permission: 'view_retail_customer_retention', feature: 'retail-customer-retention' },
  { id: 'retailer-customer-due', path: '/retailer/customer-due', labelKey: 'nav.retailerCustomerDue', icon: Wallet, component: CustomerDuePage, group: 'customers', permission: 'view_retail_customer_due', feature: 'retailer-customer-due' },
  { id: 'retailer-due-collection', path: '/retailer/due-collection', labelKey: 'nav.retailerDueCollection', icon: HandCoins, component: DueCollectionPage, group: 'customers', permission: 'view_retail_due_collection', feature: 'retailer-due-collection' },

  // 3.5 Retail Installments
  { id: 'installment-plans', path: '/installment-sales', labelKey: 'nav.installmentPlans', icon: CreditCard, component: InstallmentPlansPage, group: 'installment-sales', permission: 'view_installment_plans', feature: 'installment-sales' },
  { id: 'installment-plan-detail', path: '/installment-sales/:id', labelKey: 'nav.installmentPlanDetail', icon: CreditCard, component: InstallmentPlanDetailPage, group: 'hidden', permission: 'view_installment_plans', feature: 'installment-sales' },
  { id: 'installment-reports', path: '/installment-sales/reports', labelKey: 'nav.installmentReports', icon: FileText, component: InstallmentReportsPage, group: 'installment-sales', permission: 'view_installment_plans', feature: 'installment-sales' },
  { id: 'installment-dashboard', path: '/installment-sales/dashboard', labelKey: 'nav.installmentDashboard', icon: LayoutDashboard, component: InstallmentDashboardPage, group: 'installment-sales', permission: 'view_installment_plans', feature: 'installment-sales' },
  { id: 'installment-late-fee-rules', path: '/installment-sales/late-fee-rules', labelKey: 'nav.installmentLateFeeRules', icon: Gift, component: LateFeeRulesPage, group: 'installment-sales', permission: 'manage_installment_plans', feature: 'installment-sales' },

  // 4. Inventory
  { id: 'products', path: '/products', labelKey: 'nav.products', icon: Boxes, component: ProductsPage, group: 'inventory', permission: 'view_products', feature: 'products' },
  { id: 'stock-movement', path: '/stock-movement', labelKey: 'nav.stockMovement', icon: ArrowLeftRight, component: StockMovementPage, group: 'inventory', permission: 'view_products', feature: 'stock-movement' },
  { id: 'low-stock-alerts', path: '/low-stock-alerts', labelKey: 'nav.lowStockAlerts', icon: AlertTriangle, component: LowStockAlertsPage, group: 'inventory', permission: 'view_products', feature: 'low-stock-alerts' },
  { id: 'product-serials', path: '/product-serials', labelKey: 'nav.productSerials', icon: Fingerprint, component: ProductSerialsPage, group: 'inventory', permission: 'view_product_serials', feature: 'product-serials' },
  { id: 'damaged-stock', path: '/damaged-stock', labelKey: 'nav.damagedStock', icon: PackageX, component: DamagedStockPage, group: 'inventory', permission: 'view_products', feature: 'damaged-stock' },

  // 5. Purchases
  { id: 'suppliers', path: '/suppliers', labelKey: 'nav.suppliers', icon: Building2, component: SuppliersPage, group: 'purchases', permission: 'view_suppliers', feature: 'suppliers' },
  { id: 'purchase-receive', path: '/purchase-receive', labelKey: 'nav.purchaseReceive', icon: ShoppingCart, component: PurchaseReceivePage, group: 'purchases', permission: 'view_purchases', feature: 'purchase-receive' },
  { id: 'purchase-returns', path: '/purchase-returns', labelKey: 'nav.purchaseReturns', icon: Undo2, component: PurchaseReturnsPage, group: 'purchases', permission: 'view_purchase_returns', feature: 'purchase-returns' },
  { id: 'supplier-payments', path: '/supplier-payments', labelKey: 'nav.supplierPayments', icon: Wallet, component: SupplierPaymentsPage, group: 'purchases', permission: 'view_supplier_payments', feature: 'supplier-payments' },
  { id: 'supplier-discounts', path: '/supplier-discounts', labelKey: 'nav.supplierDiscounts', icon: Tag, component: SupplierDiscountsPage, group: 'purchases', permission: 'view_supplier_payments', feature: 'supplier-discounts' },
  { id: 'supplier-statement', path: '/supplier-statement', labelKey: 'nav.supplierStatement', icon: FileText, component: SupplierStatementPage, group: 'purchases', permission: 'view_supplier_statement', feature: 'supplier-statement' },

  // 5.5 Trade Promotions
  { id: 'trade-promotion-rules', path: '/trade-promotions/rules', labelKey: 'nav.tradePromotionRules', icon: Gift, component: TradePromotionRulesPage, group: 'trade-promotions', permission: 'manage_trade_promotion_rules', feature: 'trade-promotions' },
  { id: 'trade-promotion-earnings', path: '/trade-promotions/earnings', labelKey: 'nav.tradePromotionEarnings', icon: HandCoins, component: TradePromotionEarningsPage, group: 'trade-promotions', permission: 'view_trade_promotions', feature: 'trade-promotions' },
  { id: 'trade-promotion-settlements', path: '/trade-promotions/settlements', labelKey: 'nav.tradePromotionSettlements', icon: CircleDollarSign, component: TradePromotionSettlementsPage, group: 'trade-promotions', permission: 'manage_trade_promotion_settlements', feature: 'trade-promotions' },
  { id: 'trade-promotion-reports', path: '/trade-promotions/reports', labelKey: 'nav.tradePromotionReports', icon: BarChart3, component: TradePromotionReportsPage, group: 'trade-promotions', permission: 'view_trade_promotions', feature: 'trade-promotions' },

  // 6a. DSR Operations
  { id: 'dsrs', path: '/dsrs', labelKey: 'nav.dsrs', icon: Users, component: DsrPage, group: 'dsr', permission: 'view_dsrs', feature: 'dsrs' },
  { id: 'morning-issue', path: '/morning-issue', labelKey: 'nav.morningIssue', icon: Truck, component: MorningIssuePage, group: 'dsr', permission: 'create_issues', feature: 'morning-issue' },
  { id: 'settlements', path: '/settlements', labelKey: 'nav.eveningSettlement', icon: RotateCcw, component: EveningSettlementPage, group: 'dsr', permission: 'create_settlements', feature: 'settlements' },
  { id: 'dsr-finance', path: '/dsr-finance', labelKey: 'nav.dsrFinance', icon: HandCoins, component: DsrFinancePage, group: 'dsr', permission: 'manage_dsr_finance', feature: 'dsr-finance' },

  // 6b. Shops & SRs
  { id: 'customers', path: '/customers', labelKey: 'nav.shops', icon: ShoppingBag, component: ShopsPage, group: 'shops', permission: 'view_customers', feature: 'customers' },
  { id: 'shop-due-ledger', path: '/shop-due-ledger', labelKey: 'nav.shopDueLedger', icon: Wallet, component: ShopDueLedgerPage, group: 'shops', permission: 'view_customers', feature: 'shop-due-ledger' },
  { id: 'srs', path: '/srs', labelKey: 'nav.srs', icon: IdCard, component: SrPage, group: 'shops', permission: 'view_srs', feature: 'srs' },
  { id: 'sr-due-ledger', path: '/sr-due-ledger', labelKey: 'nav.srDueLedger', icon: HandCoins, component: SrDueLedgerPage, group: 'shops', permission: 'view_srs', feature: 'sr-due-ledger' },

  // 7. Warranty & Repair
  { id: 'warranty-claims', path: '/warranty-claims', labelKey: 'nav.warrantyClaims', icon: Wrench, component: WarrantyClaimsPage, group: 'warranty', permission: 'view_warranty_claims', feature: 'warranty-claims' },
  { id: 'repair-jobs', path: '/repair-jobs', labelKey: 'nav.repairJobs', icon: Wrench, component: RepairJobsPage, group: 'warranty', permission: 'view_repair_jobs', feature: 'repair-jobs' },

  // 8. Finance
  { id: 'finance-dashboard', path: '/finance-dashboard', labelKey: 'nav.financeDashboard', icon: LayoutDashboard, component: FinanceDashboardPage, group: 'finance', permission: 'view_finance_dashboard', feature: 'finance-dashboard' },
  { id: 'finance-accounts', path: '/finance-accounts', labelKey: 'nav.financeAccounts', icon: Landmark, component: FinanceAccountsPage, group: 'finance', permission: 'manage_finance_accounts', feature: 'finance-accounts' },
  { id: 'expenses', path: '/expenses', labelKey: 'nav.expenses', icon: CircleDollarSign, component: ExpensesPage, group: 'finance', permission: 'manage_expenses', feature: 'expenses' },
  { id: 'profit', path: '/profit', labelKey: 'nav.profit', icon: TrendingUp, component: ProfitPage, group: 'finance', permission: 'manage_profit_report', feature: 'profit' },

  // Accounting
  { id: 'accounting-dashboard', path: '/accounting/dashboard', labelKey: 'nav.accountingDashboard', icon: LayoutDashboard, component: AccountingDashboardPage, group: 'accounting', permission: 'view_accounting_dashboard', feature: 'accounting-dashboard' },
  { id: 'chart-of-accounts', path: '/accounting/chart-of-accounts', labelKey: 'nav.chartOfAccounts', icon: BookOpen, component: ChartOfAccountsPage, group: 'accounting', permission: 'view_chart_of_accounts', feature: 'chart-of-accounts' },
  { id: 'fiscal-years', path: '/accounting/fiscal-years', labelKey: 'nav.fiscalYears', icon: BriefcaseBusiness, component: FiscalYearsPage, group: 'accounting', permission: 'manage_fiscal_years', feature: 'fiscal-years' },
  { id: 'opening-balances', path: '/accounting/opening-balances', labelKey: 'nav.openingBalances', icon: Wallet, component: OpeningBalancesPage, group: 'accounting', permission: 'view_opening_balances', feature: 'opening-balances' },
  { id: 'accounting-settings', path: '/accounting/settings', labelKey: 'nav.accountingSettings', icon: Settings, component: AccountingSettingsPage, group: 'accounting', permission: 'manage_accounting_settings', feature: 'accounting-settings' },
  { id: 'journal-vouchers', path: '/accounting/journal-vouchers', labelKey: 'nav.journalVouchers', icon: BookOpen, component: JournalVouchersPage, group: 'accounting', permission: 'voucher.view', feature: 'journal-vouchers' },
  { id: 'receipt-vouchers', path: '/accounting/receipt-vouchers', labelKey: 'nav.receiptVouchers', icon: Receipt, component: ReceiptVouchersPage, group: 'accounting', permission: 'voucher.view', feature: 'receipt-vouchers' },
  { id: 'payment-vouchers', path: '/accounting/payment-vouchers', labelKey: 'nav.paymentVouchers', icon: Wallet, component: PaymentVouchersPage, group: 'accounting', permission: 'voucher.view', feature: 'payment-vouchers' },
  { id: 'contra-vouchers', path: '/accounting/contra-vouchers', labelKey: 'nav.contraVouchers', icon: ArrowLeftRight, component: ContraVouchersPage, group: 'accounting', permission: 'voucher.view', feature: 'contra-vouchers' },
  { id: 'voucher-register', path: '/accounting/voucher-register', labelKey: 'nav.voucherRegister', icon: ClipboardList, component: VoucherRegisterPage, group: 'accounting', permission: 'voucher.view', feature: 'voucher-register' },
  { id: 'journal-register', path: '/accounting/journal-register', labelKey: 'nav.journalRegister', icon: BookOpen, component: JournalRegisterPage, group: 'accounting', permission: 'voucher.view', feature: 'journal-register' },
  { id: 'general-ledger', path: '/general-ledger', labelKey: 'nav.generalLedger', icon: BookOpen, component: GeneralLedgerPage, group: 'accounting', permission: 'report.general_ledger', feature: 'general-ledger' },
  { id: 'account-ledger', path: '/account-ledger', labelKey: 'nav.accountLedger', icon: BookOpen, component: AccountLedgerPage, group: 'accounting', permission: 'report.account_ledger', feature: 'account-ledger' },
  { id: 'customer-ledger', path: '/customer-ledger', labelKey: 'nav.customerLedger', icon: Users, component: CustomerLedgerPage, group: 'accounting', permission: 'report.customer_ledger', feature: 'customer-ledger' },
  { id: 'supplier-ledger', path: '/supplier-ledger', labelKey: 'nav.supplierLedger', icon: Building2, component: SupplierLedgerPage, group: 'accounting', permission: 'report.supplier_ledger', feature: 'supplier-ledger' },
  { id: 'cash-book', path: '/cash-book', labelKey: 'nav.cashBook', icon: Wallet, component: CashBookPage, group: 'accounting', permission: 'report.cash_book', feature: 'cash-book' },
  { id: 'bank-book', path: '/bank-book', labelKey: 'nav.bankBook', icon: Landmark, component: BankBookPage, group: 'accounting', permission: 'report.bank_book', feature: 'bank-book' },
  { id: 'trial-balance', path: '/trial-balance', labelKey: 'nav.trialBalance', icon: Scale, component: TrialBalancePage, group: 'accounting', permission: 'report.trial_balance', feature: 'trial-balance' },
  { id: 'balance-sheet', path: '/balance-sheet', labelKey: 'nav.balanceSheet', icon: Landmark, component: BalanceSheetPage, group: 'accounting', permission: 'report.balance_sheet', feature: 'balance-sheet' },
  { id: 'profit-and-loss', path: '/profit-and-loss', labelKey: 'nav.profitAndLoss', icon: TrendingUp, component: ProfitAndLossPage, group: 'accounting', permission: 'report.profit_loss', feature: 'profit-and-loss' },
  { id: 'cash-flow', path: '/cash-flow', labelKey: 'nav.cashFlow', icon: Activity, component: CashFlowPage, group: 'accounting', permission: 'report.cash_flow', feature: 'cash-flow' },

  // 9. Reports
  { id: 'retailer-daily-sales-report', path: '/retailer/daily-sales-report', labelKey: 'nav.retailerDailySalesReport', icon: FileText, component: DailySalesReportPage, group: 'reports', permission: 'manage_retail_daily_sales_report', feature: 'retailer-daily-sales-report' },
  { id: 'reports', path: '/reports', labelKey: 'nav.reports', icon: FileText, component: DailyReportsPage, group: 'reports', permission: 'view_state', feature: 'reports' },
  { id: 'history', path: '/history', labelKey: 'nav.history', icon: RotateCcw, component: HistoryPage, group: 'reports', permission: 'view_state', feature: 'history' },
  { id: 'batch-sales-report', path: '/reports/batch-sales', labelKey: 'nav.batchSalesReport', icon: ClipboardList, component: BatchSalesReportPage, group: 'reports', permission: 'manage_batch_tracking', feature: 'batch-tracking' },
  { id: 'expiry-alerts', path: '/reports/expiry-alerts', labelKey: 'nav.expiryAlerts', icon: AlertTriangle, component: ExpiryAlertsPage, group: 'reports', permission: 'view_expiry_alerts', feature: 'batch-tracking' },
  { id: 'activity-logs', path: '/activity-logs', labelKey: 'nav.activityLogs', icon: ClipboardList, component: ActivityLogsPage, group: 'reports', permission: 'view_activity_logs', feature: 'activity-logs' },

  // 10. System & Settings
  { id: 'users', path: '/settings/users', labelKey: 'nav.users', icon: UserCog, component: UsersPage, group: 'system', permission: 'manage_users', feature: 'user-management' },
  { id: 'permissions', path: '/settings/permissions', labelKey: 'nav.permissions', icon: KeyRound, component: PermissionsPage, group: 'system', roles: ['system_developer', 'super_admin'], feature: 'permissions' },
  { id: 'org-settings', path: '/settings/organization', labelKey: 'nav.orgSettings', icon: Settings, component: OrgSettingsPage, group: 'system', permission: 'manage_org', feature: 'org-settings' },
  { id: 'security', path: '/security', labelKey: 'nav.security', icon: ShieldCheck, component: SecurityPage, group: 'system', feature: 'security' },
  { id: 'issue-center', path: '/issue-center', labelKey: 'nav.issueCenter', icon: Bug, component: IssueCenterPage, group: 'system', permission: 'view_activity_logs', feature: 'issue-center' },
  { id: 'trash', path: '/trash', labelKey: 'nav.trash', icon: Trash2, component: TrashPage, group: 'system', permission: 'view_state', feature: 'trash' },
  // removed from sidebar — page still routable via user avatar dropdown
  { id: 'profile', path: '/profile', labelKey: 'nav.profile', icon: UserCog, component: ProfilePage, group: 'hidden', feature: 'my-profile' },
  // removed from sidebar — will be floating button
  { id: 'help-desk', path: '/help-desk', labelKey: 'nav.helpDesk', icon: ShieldCheck, component: HelpDeskPage, group: 'hidden', permission: 'view_help_desk', feature: 'help-desk' },

  // 9.5 HR / Salary
  { id: 'departments', path: '/hr/departments', labelKey: 'nav.departments', icon: Building2, component: DepartmentsPage, group: 'hr', permission: 'manage_departments', feature: 'departments' },
  { id: 'designations', path: '/hr/designations', labelKey: 'nav.designations', icon: BriefcaseBusiness, component: DesignationsPage, group: 'hr', permission: 'manage_designations', feature: 'designations' },
  { id: 'employees', path: '/hr/employees', labelKey: 'nav.employees', icon: Users, component: EmployeesPage, group: 'hr', permission: 'view_employees', feature: 'employees' },
  { id: 'salary-payments', path: '/hr/salary', labelKey: 'nav.salaryPayments', icon: Banknote, component: SalaryPaymentsPage, group: 'hr', permission: 'manage_payroll', feature: 'salary-payments' },
  { id: 'attendance', path: '/hr/attendance', labelKey: 'nav.attendance', icon: ClipboardList, component: AttendancePage, group: 'hr', permission: 'attendance.view', feature: 'attendance' },
  { id: 'leave', path: '/hr/leave', labelKey: 'nav.leave', icon: ClipboardList, component: LeavePage, group: 'hr', permission: 'leave.manage', feature: 'leave_management' },
  { id: 'payroll', path: '/hr/payroll', labelKey: 'nav.payroll', icon: Banknote, component: PayrollPage, group: 'hr', permission: 'payroll.view', feature: 'payroll' },
  { id: 'employee-advances', path: '/hr/advances', labelKey: 'nav.employeeAdvances', icon: HandCoins, component: AdvancesPage, group: 'hr', permission: 'advance.manage', feature: 'employee_advances' },
  { id: 'employee-loans', path: '/hr/loans', labelKey: 'nav.employeeLoans', icon: CreditCard, component: LoansPage, group: 'hr', permission: 'loan.manage', feature: 'employee_loans' },
  { id: 'hr-reports', path: '/hr/reports', labelKey: 'nav.hrReports', icon: FileText, component: HrReportsPage, group: 'hr', permission: 'hr.reports', feature: 'hr-reports' },

  // 11. Developer
  { id: 'platform', path: '/platform', labelKey: 'nav.platform', icon: ShieldCheck, component: PlatformAdminPage, group: 'developer', role: 'system_developer', feature: 'platform' },
  { id: 'system-health', path: '/system-health', labelKey: 'nav.systemHealth', icon: Activity, component: SystemHealthPage, group: 'developer', role: 'system_developer', feature: 'system-health' },
  { id: 'error-logs', path: '/error-logs', labelKey: 'nav.errorLogs', icon: Bug, component: ErrorLogsPage, group: 'developer', role: 'system_developer', feature: 'error-logs' },
  { id: 'database-backup', path: '/database-backup', labelKey: 'nav.databaseBackup', icon: Database, component: DatabaseBackupPage, group: 'system', permission: 'manage_backups', feature: 'database-backup' },
  { id: 'visitor-chats', path: '/platform/visitor-chats', labelKey: 'nav.visitorChats', icon: MessageCircle, component: VisitorChatsPage, group: 'developer', role: 'system_developer', feature: 'visitor-chats' },
  { id: 'contact-messages', path: '/platform/contact-messages', labelKey: 'nav.contactMessages', icon: Inbox, component: ContactMessagesPage, group: 'developer', role: 'system_developer', feature: 'contact-messages' },
  { id: 'registration-requests', path: '/platform/registrations', labelKey: 'nav.registrationRequests', icon: UserCheck, component: RegistrationRequestsPage, group: 'developer', role: 'system_developer', feature: 'registration-requests' },
];

export const SIDEBAR_SECTIONS = ['overview', 'pos', 'customers', 'installment-sales', 'inventory', 'dsr', 'shops', 'purchases', 'trade-promotions', 'warranty', 'finance', 'accounting', 'reports', 'hr', 'system', 'developer'];

export function canAccessRoute(route, { user, can, hasFeature }) {
  if (!route) return false;
  if (route.group === 'developer') {
    if (user?.role === 'system_developer') return true;
    if (route.role) return user?.role === route.role;
    if (route.roles) return route.roles.includes(user?.role);
    if (route.permission) return can(route.permission);
    return false;
  }
  if (user?.role === 'system_developer') return route.id !== 'org-settings';
  if (route.permission && !can(route.permission)) return false;
  if (route.role && user?.role !== route.role) return false;
  if (route.roles && !route.roles.includes(user?.role)) return false;
  return hasFeature(route.feature);
}

export function getFirstAccessibleRoute(access) {
  if (access?.user?.role === 'system_developer') {
    const platformRoute = APP_ROUTES.find((route) => route.id === 'platform' && canAccessRoute(route, access));
    if (platformRoute) return platformRoute;
  }

  const visibleRoute = APP_ROUTES.find((route) => route.group !== 'hidden' && canAccessRoute(route, access));
  return visibleRoute || APP_ROUTES.find((route) => canAccessRoute(route, access)) || null;
}

export function buildGroupedRoutes(access) {
  return SIDEBAR_SECTIONS
    .map((section) => ({
      section,
      routes: APP_ROUTES.filter((route) => route.group === section && canAccessRoute(route, access)),
    }))
    .filter((group) => group.routes.length > 0);
}

export function getRouteLabel(pathname, t = (key) => key) {
  const matchedRoute = [...APP_ROUTES]
    .sort((left, right) => right.path.length - left.path.length)
    .find((route) => pathname === route.path || pathname.startsWith(`${route.path}/`));

  return matchedRoute ? t(matchedRoute.labelKey) : t('nav.dashboard');
}





