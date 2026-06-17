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
} from 'lucide-react';
import DashboardPage from '../features/dashboard/pages/DashboardPage';
import ActivityLogsPage from '../features/activity-logs/pages/ActivityLogsPage';
import DsrPage from '../features/dsrs/pages/DsrPage';
import HistoryPage from '../features/history/pages/HistoryPage';
import ExpensesPage from '../features/expenses/pages/ExpensesPage';
import DsrFinancePage from '../features/dsr-finance/pages/DsrFinancePage';
import MonthEndSummaryPage from '../features/month-end-summary/pages/MonthEndSummaryPage';
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
import ProfilePage from '../features/profile/pages/ProfilePage';
import SecurityPage from '../features/security/pages/SecurityPage';
import SystemHealthPage from '../features/system/pages/SystemHealthPage';
import ErrorLogsPage from '../features/system/pages/ErrorLogsPage';
import CustomersPage from '../features/customers/pages/CustomersPage';
import RetailCustomersPage from '../features/retail-customers/pages/RetailCustomersPage';
import TrashPage from '../features/trash/pages/TrashPage';
import DamagedStockPage from '../features/damaged-stock/pages/DamagedStockPage';
import SuppliersPage from '../features/suppliers/pages/SuppliersPage';
import PurchaseReceivePage from '../features/purchase-receive/pages/PurchaseReceivePage';
import SupplierPaymentsPage from '../features/supplier-payments/pages/SupplierPaymentsPage';
import SupplierStatementPage from '../features/supplier-statement/pages/SupplierStatementPage';
import QuickSalePage from '../features/retailer/quick-sale/pages/QuickSalePage';
import SalesInvoicesPage from '../features/retailer/sales-invoices/pages/SalesInvoicesPage';
import CustomerDuePage from '../features/retailer/customer-due/pages/CustomerDuePage';
import DueCollectionPage from '../features/retailer/due-collection/pages/DueCollectionPage';
import SalesReturnPage from '../features/retailer/sales-return/pages/SalesReturnPage';
import DailySalesReportPage from '../features/retailer/daily-sales-report/pages/DailySalesReportPage';
import RetailerProfitReportPage from '../features/retailer/profit-report/pages/RetailerProfitReportPage';
import FinanceDashboardPage from '../features/finance-dashboard/pages/FinanceDashboardPage';
import FinanceAccountsPage from '../features/finance-accounts/pages/FinanceAccountsPage';

export const APP_ROUTES = [
  { id: 'dashboard', path: '/dashboard', labelKey: 'nav.dashboard', icon: BarChart3, component: DashboardPage, group: 'overview', permission: 'view_state' },
  { id: 'products', path: '/products', labelKey: 'nav.products', icon: Boxes, component: ProductsPage, group: 'inventory', permission: 'view_state', feature: 'products' },
  { id: 'damaged-stock', path: '/damaged-stock', labelKey: 'nav.damagedStock', icon: PackageX, component: DamagedStockPage, group: 'inventory', permission: 'view_state', feature: 'products' },
  { id: 'dsrs', path: '/dsrs', labelKey: 'nav.dsrs', icon: Users, component: DsrPage, group: 'operations', permission: 'view_state', feature: 'dsrs' },
  { id: 'customers', path: '/customers', labelKey: 'nav.shops', icon: Store, component: CustomersPage, group: 'operations', permission: 'view_state', feature: 'customers' },
  { id: 'retail-customers', path: '/retail-customers', labelKey: 'nav.retailCustomers', icon: Users, component: RetailCustomersPage, group: 'retailer', permission: 'view_state' },
  { id: 'suppliers', path: '/suppliers', labelKey: 'nav.suppliers', icon: Building2, component: SuppliersPage, group: 'suppliers', permission: 'manage_suppliers', feature: 'suppliers' },
  { id: 'purchase-receive', path: '/purchase-receive', labelKey: 'nav.purchaseReceive', icon: ShoppingCart, component: PurchaseReceivePage, group: 'suppliers', permission: 'manage_purchases', feature: 'purchase-receive' },
  { id: 'supplier-statement', path: '/supplier-statement', labelKey: 'nav.supplierStatement', icon: FileText, component: SupplierStatementPage, group: 'suppliers', permission: 'manage_suppliers', feature: 'supplier-statement' },
  { id: 'morning-issue', path: '/morning-issue', labelKey: 'nav.morningIssue', icon: Truck, component: MorningIssuePage, group: 'operations', permission: 'create_issues', feature: 'morning-issue' },
  { id: 'settlements', path: '/settlements', labelKey: 'nav.eveningSettlement', icon: RotateCcw, component: EveningSettlementPage, group: 'operations', permission: 'create_settlements', feature: 'settlements' },
  { id: 'retailer-quick-sale', path: '/retailer/quick-sale', labelKey: 'nav.retailerQuickSale', icon: ShoppingBag, component: QuickSalePage, group: 'retailer', permission: 'manage_retailers', feature: 'retailer-quick-sale' },
  { id: 'retailer-sales-invoices', path: '/retailer/sales-invoices', labelKey: 'nav.retailerSalesInvoices', icon: Receipt, component: SalesInvoicesPage, group: 'retailer', permission: 'manage_retailers', feature: 'retailer-sales-invoices' },
  { id: 'retailer-customer-due', path: '/retailer/customer-due', labelKey: 'nav.retailerCustomerDue', icon: Wallet, component: CustomerDuePage, group: 'retailer', permission: 'manage_retailers', feature: 'retailer-customer-due' },
  { id: 'retailer-due-collection', path: '/retailer/due-collection', labelKey: 'nav.retailerDueCollection', icon: HandCoins, component: DueCollectionPage, group: 'retailer', permission: 'manage_retailers', feature: 'retailer-due-collection' },
  { id: 'retailer-sales-return', path: '/retailer/sales-return', labelKey: 'nav.retailerSalesReturn', icon: RotateCcw, component: SalesReturnPage, group: 'retailer', permission: 'manage_retailers', feature: 'retailer-sales-return' },
  { id: 'retailer-daily-sales-report', path: '/retailer/daily-sales-report', labelKey: 'nav.retailerDailySalesReport', icon: FileText, component: DailySalesReportPage, group: 'retailer', permission: 'manage_retailers', feature: 'retailer-daily-sales-report' },
  { id: 'retailer-profit-report', path: '/retailer/profit-report', labelKey: 'nav.retailerProfitReport', icon: TrendingUp, component: RetailerProfitReportPage, group: 'retailer', permission: 'manage_retailers', feature: 'retailer-profit-report' },
  { id: 'dsr-finance', path: '/dsr-finance', labelKey: 'nav.dsrFinance', icon: HandCoins, component: DsrFinancePage, group: 'finance', permission: 'manage_dsr_finance', feature: 'dsr-finance' },
  { id: 'reports', path: '/reports', labelKey: 'nav.reports', icon: FileText, component: DailyReportsPage, group: 'reports', permission: 'view_state', feature: 'reports' },
  { id: 'history', path: '/history', labelKey: 'nav.history', icon: ClipboardList, component: HistoryPage, group: 'reports', permission: 'view_state', feature: 'history' },
  { id: 'finance-dashboard', path: '/finance-dashboard', labelKey: 'nav.financeDashboard', icon: LayoutDashboard, component: FinanceDashboardPage, group: 'finance', permission: 'view_finance_dashboard', feature: 'finance-dashboard' },
  { id: 'finance-accounts', path: '/finance-accounts', labelKey: 'nav.financeAccounts', icon: Landmark, component: FinanceAccountsPage, group: 'finance', permission: 'manage_finance_accounts', feature: 'finance-accounts' },
  { id: 'expenses', path: '/expenses', labelKey: 'nav.expenses', icon: CircleDollarSign, component: ExpensesPage, group: 'finance', permission: 'manage_expenses', feature: 'expenses' },
  { id: 'supplier-payments', path: '/supplier-payments', labelKey: 'nav.supplierPayments', icon: Wallet, component: SupplierPaymentsPage, group: 'suppliers', permission: 'manage_supplier_payments', feature: 'supplier-payments' },
  { id: 'month-end-summary', path: '/month-end-summary', labelKey: 'nav.monthEndSummary', icon: BarChart3, component: MonthEndSummaryPage, group: 'reports', permission: 'manage_dsr_finance', feature: 'month-end-summary' },
  { id: 'profit', path: '/profit', labelKey: 'nav.profit', icon: TrendingUp, component: ProfitPage, group: 'reports', permission: 'manage_dsr_finance', feature: 'profit' },
  { id: 'activity-logs', path: '/activity-logs', labelKey: 'nav.activityLogs', icon: ClipboardList, component: ActivityLogsPage, group: 'reports', permission: 'view_activity_logs', feature: 'activity-logs' },
  { id: 'trash', path: '/trash', labelKey: 'nav.trash', icon: Trash2, component: TrashPage, group: 'governance', permission: 'view_state', feature: 'trash' },
  { id: 'database-backup', path: '/database-backup', labelKey: 'nav.databaseBackup', icon: Database, component: DatabaseBackupPage, group: 'developer', permission: 'manage_backups' },
  { id: 'org-settings', path: '/settings/organization', labelKey: 'nav.orgSettings', icon: Settings, component: OrgSettingsPage, group: 'settings', permission: 'manage_org' },
  { id: 'permissions', path: '/settings/permissions', labelKey: 'nav.permissions', icon: KeyRound, component: PermissionsPage, group: 'settings', roles: ['system_developer', 'super_admin'] },
  { id: 'users', path: '/settings/users', labelKey: 'nav.users', icon: UserCog, component: UsersPage, group: 'settings', permission: 'manage_users' },
  { id: 'platform', path: '/platform', labelKey: 'nav.platform', icon: ShieldCheck, component: PlatformAdminPage, group: 'developer', role: 'platform_admin' },
  { id: 'profile', path: '/profile', labelKey: 'nav.profile', icon: UserCog, component: ProfilePage, group: 'settings' },
  { id: 'security', path: '/security', labelKey: 'nav.security', icon: ShieldCheck, component: SecurityPage },
  { id: 'system-health', path: '/system-health', labelKey: 'nav.systemHealth', icon: Activity, component: SystemHealthPage, group: 'developer', role: 'system_developer' },
  { id: 'error-logs', path: '/error-logs', labelKey: 'nav.errorLogs', icon: Bug, component: ErrorLogsPage, group: 'developer', role: 'system_developer' },
];

export function getRouteLabel(pathname, t = (key) => key) {
  const matchedRoute = [...APP_ROUTES]
    .sort((left, right) => right.path.length - left.path.length)
    .find((route) => pathname === route.path || pathname.startsWith(`${route.path}/`));

  return matchedRoute ? t(matchedRoute.labelKey) : t('nav.dashboard');
}
