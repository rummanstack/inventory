import {
  CircleDollarSign,
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  FileText,
  HandCoins,
  KeyRound,
  Receipt,
  RotateCcw,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Store,
  Trash2,
  Truck,
  Users,
  UserCog,
  Database,
  Activity,
  Bug,
  PackageX,
  Wallet,
  LayoutDashboard,
  Landmark,
  Tag,
  MessageCircle,
  ArrowLeftRight,
  AlertTriangle,
  Fingerprint,
  Wrench,
} from 'lucide-react';
import DashboardPage from '../features/dashboard/pages/DashboardPage';
import ActivityLogsPage from '../features/activity-logs/pages/ActivityLogsPage';
import IssueCenterPage from '../features/issue-center/pages/IssueCenterPage';
import DsrPage from '../features/dsrs/pages/DsrPage';
import HistoryPage from '../features/history/pages/HistoryPage';
import ExpensesPage from '../features/expenses/pages/ExpensesPage';
import DsrFinancePage from '../features/dsr-finance/pages/DsrFinancePage';
import ProfitPage from '../features/profit/pages/ProfitPage';
import MorningIssuePage from '../features/morning-issue/pages/MorningIssuePage';
import ProductsPage from '../features/products/pages/ProductsPage';
import DailyReportsPage from '../features/reports/pages/DailyReportsPage';
import EveningSettlementPage from '../features/settlements/pages/EveningSettlementPage';
import DatabaseBackupPage from '../features/database-backup/pages/DatabaseBackupPage';
import OrgSettingsPage from '../features/settings/pages/OrgSettingsPage';
import PermissionsPage from '../features/permissions/pages/PermissionsPage';
import UsersPage from '../features/users/pages/UsersPage';
import PlatformAdminPage from '../features/platform/pages/PlatformAdminPage';
import VisitorChatsPage from '../features/platform/pages/VisitorChatsPage';
import ProfilePage from '../features/profile/pages/ProfilePage';
import SecurityPage from '../features/security/pages/SecurityPage';
import SystemHealthPage from '../features/system/pages/SystemHealthPage';
import ErrorLogsPage from '../features/system/pages/ErrorLogsPage';
import ShopsPage from '../features/shops/pages/ShopsPage';
import RetailCustomersPage from '../features/retail-customers/pages/RetailCustomersPage';
import RetailCustomerRetentionPage from '../features/retail-customers/pages/RetailCustomerRetentionPage';
import HelpDeskPage from '../features/help-desk/pages/HelpDeskPage';
import TrashPage from '../features/trash/pages/TrashPage';
import DamagedStockPage from '../features/damaged-stock/pages/DamagedStockPage';
import SuppliersPage from '../features/suppliers/pages/SuppliersPage';
import PurchaseReceivePage from '../features/purchase-receive/pages/PurchaseReceivePage';
import SupplierPaymentsPage from '../features/supplier-payments/pages/SupplierPaymentsPage';
import SupplierStatementPage from '../features/supplier-statement/pages/SupplierStatementPage';
import QuickSalePage from '../features/retailer/quick-sale/pages/QuickSalePage';
import SalesInvoicesPage from '../features/retailer/sales-invoices/pages/SalesInvoicesPage';
import RetailPromotionsPage from '../features/retailer/promotions/pages/RetailPromotionsPage';
import CustomerDuePage from '../features/retailer/customer-due/pages/CustomerDuePage';
import DueCollectionPage from '../features/retailer/due-collection/pages/DueCollectionPage';
import SalesReturnPage from '../features/retailer/sales-return/pages/SalesReturnPage';
import DailySalesReportPage from '../features/retailer/daily-sales-report/pages/DailySalesReportPage';
import FinanceDashboardPage from '../features/finance-dashboard/pages/FinanceDashboardPage';
import FinanceAccountsPage from '../features/finance-accounts/pages/FinanceAccountsPage';
import StockMovementPage from '../features/stock-movement/pages/StockMovementPage';
import LowStockAlertsPage from '../features/low-stock-alerts/pages/LowStockAlertsPage';
import ProductSerialsPage from '../features/product-serials/pages/ProductSerialsPage';
import WarrantyClaimsPage from '../features/warranty-claims/pages/WarrantyClaimsPage';
import RepairJobsPage from '../features/repair-jobs/pages/RepairJobsPage';

export const APP_ROUTES = [
  { id: 'dashboard', path: '/dashboard', labelKey: 'nav.dashboard', icon: BarChart3, component: DashboardPage, group: 'overview', permission: 'view_state', feature: 'dashboard' },

  // Sales
  { id: 'retailer-quick-sale', path: '/retailer/quick-sale', labelKey: 'nav.retailerQuickSale', icon: ShoppingBag, component: QuickSalePage, group: 'sales', permission: 'manage_retail_quick_sale', feature: 'retailer-quick-sale' },
  { id: 'retailer-sales-invoices', path: '/retailer/sales-invoices', labelKey: 'nav.retailerSalesInvoices', icon: Receipt, component: SalesInvoicesPage, group: 'sales', permission: 'manage_retail_sales_invoices', feature: 'retailer-sales-invoices' },
  { id: 'retailer-sales-return', path: '/retailer/sales-return', labelKey: 'nav.retailerSalesReturn', icon: RotateCcw, component: SalesReturnPage, group: 'sales', permission: 'manage_retail_sales_returns', feature: 'retailer-sales-return' },
  { id: 'retail-customers', path: '/retail-customers', labelKey: 'nav.retailCustomers', icon: Users, component: RetailCustomersPage, group: 'sales', permission: 'view_state', feature: 'retail-customers' },
  { id: 'retail-customer-retention', path: '/retail-customers/retention', labelKey: 'nav.retailCustomerRetention', icon: TrendingUp, component: RetailCustomerRetentionPage, group: 'sales', permission: 'view_retail_customer_retention', feature: 'retail-customer-retention' },
  { id: 'retailer-customer-due', path: '/retailer/customer-due', labelKey: 'nav.retailerCustomerDue', icon: Wallet, component: CustomerDuePage, group: 'sales', permission: 'manage_retail_customer_due', feature: 'retailer-customer-due' },
  { id: 'retailer-due-collection', path: '/retailer/due-collection', labelKey: 'nav.retailerDueCollection', icon: HandCoins, component: DueCollectionPage, group: 'sales', permission: 'manage_retail_due_collection', feature: 'retailer-due-collection' },
  { id: 'retailer-promotions', path: '/retailer/promotions', labelKey: 'nav.retailerPromotions', icon: Tag, component: RetailPromotionsPage, group: 'sales', permission: 'manage_retail_promotions', feature: 'retailer-promotions' },

  // Inventory
  { id: 'products', path: '/products', labelKey: 'nav.products', icon: Boxes, component: ProductsPage, group: 'inventory', permission: 'view_state', feature: 'products' },
  { id: 'damaged-stock', path: '/damaged-stock', labelKey: 'nav.damagedStock', icon: PackageX, component: DamagedStockPage, group: 'inventory', permission: 'view_state', feature: 'damaged-stock' },
  { id: 'stock-movement', path: '/stock-movement', labelKey: 'nav.stockMovement', icon: ArrowLeftRight, component: StockMovementPage, group: 'inventory', permission: 'view_state', feature: 'stock-movement' },
  { id: 'low-stock-alerts', path: '/low-stock-alerts', labelKey: 'nav.lowStockAlerts', icon: AlertTriangle, component: LowStockAlertsPage, group: 'inventory', permission: 'view_state', feature: 'low-stock-alerts' },
  { id: 'product-serials', path: '/product-serials', labelKey: 'nav.productSerials', icon: Fingerprint, component: ProductSerialsPage, group: 'inventory', permission: 'view_product_serials', feature: 'product-serials' },

  // Warranty
  { id: 'warranty-claims', path: '/warranty-claims', labelKey: 'nav.warrantyClaims', icon: Wrench, component: WarrantyClaimsPage, group: 'warranty', permission: 'view_warranty_claims', feature: 'warranty-claims' },
  { id: 'repair-jobs', path: '/repair-jobs', labelKey: 'nav.repairJobs', icon: Wrench, component: RepairJobsPage, group: 'warranty', permission: 'view_repair_jobs', feature: 'repair-jobs' },

  // Dealer / DSR
  { id: 'dsrs', path: '/dsrs', labelKey: 'nav.dsrs', icon: Users, component: DsrPage, group: 'dealer', permission: 'view_state', feature: 'dsrs' },
  { id: 'customers', path: '/customers', labelKey: 'nav.shops', icon: Store, component: ShopsPage, group: 'dealer', permission: 'view_state', feature: 'customers' },
  { id: 'morning-issue', path: '/morning-issue', labelKey: 'nav.morningIssue', icon: Truck, component: MorningIssuePage, group: 'dealer', permission: 'create_issues', feature: 'morning-issue' },
  { id: 'settlements', path: '/settlements', labelKey: 'nav.eveningSettlement', icon: RotateCcw, component: EveningSettlementPage, group: 'dealer', permission: 'create_settlements', feature: 'settlements' },
  { id: 'dsr-finance', path: '/dsr-finance', labelKey: 'nav.dsrFinance', icon: HandCoins, component: DsrFinancePage, group: 'dealer', permission: 'manage_dsr_finance', feature: 'dsr-finance' },

  // Purchases
  { id: 'suppliers', path: '/suppliers', labelKey: 'nav.suppliers', icon: Building2, component: SuppliersPage, group: 'purchases', permission: 'manage_suppliers', feature: 'suppliers' },
  { id: 'purchase-receive', path: '/purchase-receive', labelKey: 'nav.purchaseReceive', icon: ShoppingCart, component: PurchaseReceivePage, group: 'purchases', permission: 'manage_purchases', feature: 'purchase-receive' },
  { id: 'supplier-payments', path: '/supplier-payments', labelKey: 'nav.supplierPayments', icon: Wallet, component: SupplierPaymentsPage, group: 'purchases', permission: 'manage_supplier_payments', feature: 'supplier-payments' },
  { id: 'supplier-statement', path: '/supplier-statement', labelKey: 'nav.supplierStatement', icon: FileText, component: SupplierStatementPage, group: 'purchases', permission: 'view_supplier_statement', feature: 'supplier-statement' },

  // Finance
  { id: 'finance-dashboard', path: '/finance-dashboard', labelKey: 'nav.financeDashboard', icon: LayoutDashboard, component: FinanceDashboardPage, group: 'finance', permission: 'view_finance_dashboard', feature: 'finance-dashboard' },
  { id: 'finance-accounts', path: '/finance-accounts', labelKey: 'nav.financeAccounts', icon: Landmark, component: FinanceAccountsPage, group: 'finance', permission: 'manage_finance_accounts', feature: 'finance-accounts' },
  { id: 'expenses', path: '/expenses', labelKey: 'nav.expenses', icon: CircleDollarSign, component: ExpensesPage, group: 'finance', permission: 'manage_expenses', feature: 'expenses' },
  { id: 'profit', path: '/profit', labelKey: 'nav.profit', icon: TrendingUp, component: ProfitPage, group: 'finance', permission: 'manage_profit_report', feature: 'profit' },

  // Reports
  { id: 'retailer-daily-sales-report', path: '/retailer/daily-sales-report', labelKey: 'nav.retailerDailySalesReport', icon: FileText, component: DailySalesReportPage, group: 'reports', permission: 'manage_retail_daily_sales_report', feature: 'retailer-daily-sales-report' },
  { id: 'reports', path: '/reports', labelKey: 'nav.reports', icon: FileText, component: DailyReportsPage, group: 'reports', permission: 'view_state', feature: 'reports' },
  { id: 'history', path: '/history', labelKey: 'nav.history', icon: ClipboardList, component: HistoryPage, group: 'reports', permission: 'view_state', feature: 'history' },

  // System
  { id: 'issue-center', path: '/issue-center', labelKey: 'nav.issueCenter', icon: Bug, component: IssueCenterPage, group: 'system', permission: 'view_activity_logs', feature: 'activity-logs' },
  { id: 'activity-logs', path: '/activity-logs', labelKey: 'nav.activityLogs', icon: ClipboardList, component: ActivityLogsPage, group: 'system', permission: 'view_activity_logs', feature: 'activity-logs' },
  { id: 'trash', path: '/trash', labelKey: 'nav.trash', icon: Trash2, component: TrashPage, group: 'system', permission: 'view_state', feature: 'trash' },

  // Settings
  { id: 'org-settings', path: '/settings/organization', labelKey: 'nav.orgSettings', icon: Settings, component: OrgSettingsPage, group: 'settings', permission: 'manage_org', feature: 'org-settings' },
  { id: 'users', path: '/settings/users', labelKey: 'nav.users', icon: UserCog, component: UsersPage, group: 'settings', permission: 'manage_users', feature: 'user-management' },
  { id: 'permissions', path: '/settings/permissions', labelKey: 'nav.permissions', icon: KeyRound, component: PermissionsPage, group: 'settings', roles: ['system_developer', 'super_admin'], feature: 'permissions' },
  { id: 'security', path: '/security', labelKey: 'nav.security', icon: ShieldCheck, component: SecurityPage, group: 'settings', feature: 'security' },
  { id: 'profile', path: '/profile', labelKey: 'nav.profile', icon: UserCog, component: ProfilePage, group: 'settings', feature: 'my-profile' },

  // Support
  { id: 'help-desk', path: '/help-desk', labelKey: 'nav.helpDesk', icon: ShieldCheck, component: HelpDeskPage, group: 'support', feature: 'help-desk' },

  // Developer
  { id: 'platform', path: '/platform', labelKey: 'nav.platform', icon: ShieldCheck, component: PlatformAdminPage, group: 'developer', role: 'system_developer', feature: 'platform' },
  { id: 'database-backup', path: '/database-backup', labelKey: 'nav.databaseBackup', icon: Database, component: DatabaseBackupPage, group: 'developer', permission: 'manage_backups', feature: 'database-backup' },
  { id: 'visitor-chats', path: '/platform/visitor-chats', labelKey: 'nav.visitorChats', icon: MessageCircle, component: VisitorChatsPage, group: 'developer', role: 'system_developer', feature: 'visitor-chats' },
  { id: 'system-health', path: '/system-health', labelKey: 'nav.systemHealth', icon: Activity, component: SystemHealthPage, group: 'developer', role: 'system_developer', feature: 'system-health' },
  { id: 'error-logs', path: '/error-logs', labelKey: 'nav.errorLogs', icon: Bug, component: ErrorLogsPage, group: 'developer', role: 'system_developer', feature: 'error-logs' },
];

export const SIDEBAR_SECTIONS = ['overview', 'sales', 'inventory', 'warranty', 'dealer', 'purchases', 'finance', 'reports', 'system', 'settings', 'support', 'developer'];

export function getRouteLabel(pathname, t = (key) => key) {
  const matchedRoute = [...APP_ROUTES]
    .sort((left, right) => right.path.length - left.path.length)
    .find((route) => pathname === route.path || pathname.startsWith(`${route.path}/`));

  return matchedRoute ? t(matchedRoute.labelKey) : t('nav.dashboard');
}
