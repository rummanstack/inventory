import {
  CircleDollarSign,
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  FileText,
  HandCoins,
  KeyRound,
  RotateCcw,
  Settings,
  ShieldCheck,
  TrendingUp,
  Store,
  Trash2,
  Truck,
  Users,
  UserCog,
  Database,
  Activity,
  Bug,
  Wallet,
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
import SystemHealthPage from '../features/system/pages/SystemHealthPage';
import ErrorLogsPage from '../features/system/pages/ErrorLogsPage';
import DsrDueStatementPage from '../features/dsr-due-ledger/pages/DsrDueStatementPage';
import CustomersPage from '../features/customers/pages/CustomersPage';
import TrashPage from '../features/trash/pages/TrashPage';

export const APP_ROUTES = [
  { id: 'dashboard', path: '/dashboard', labelKey: 'nav.dashboard', icon: BarChart3, component: DashboardPage, group: 'overview', permission: 'view_state' },
  { id: 'products', path: '/products', labelKey: 'nav.products', icon: Boxes, component: ProductsPage, group: 'operations', permission: 'view_state', feature: 'products' },
  { id: 'dsrs', path: '/dsrs', labelKey: 'nav.dsrs', icon: Users, component: DsrPage, group: 'operations', permission: 'view_state', feature: 'dsrs' },
  { id: 'customers', path: '/customers', labelKey: 'nav.customers', icon: Store, component: CustomersPage, group: 'operations', permission: 'view_state', feature: 'customers' },
  { id: 'morning-issue', path: '/morning-issue', labelKey: 'nav.morningIssue', icon: Truck, component: MorningIssuePage, group: 'operations', permission: 'create_issues', feature: 'morning-issue' },
  { id: 'settlements', path: '/settlements', labelKey: 'nav.eveningSettlement', icon: RotateCcw, component: EveningSettlementPage, group: 'operations', permission: 'create_settlements', feature: 'settlements' },
  { id: 'reports', path: '/reports', labelKey: 'nav.reports', icon: FileText, component: DailyReportsPage, group: 'operations', permission: 'view_state', feature: 'reports' },
  { id: 'history', path: '/history', labelKey: 'nav.history', icon: ClipboardList, component: HistoryPage, group: 'operations', permission: 'view_state', feature: 'history' },
  { id: 'expenses', path: '/expenses', labelKey: 'nav.expenses', icon: CircleDollarSign, component: ExpensesPage, group: 'finance', permission: 'manage_expenses', feature: 'expenses' },
  { id: 'dsr-finance', path: '/dsr-finance', labelKey: 'nav.dsrFinance', icon: HandCoins, component: DsrFinancePage, group: 'finance', permission: 'manage_dsr_finance', feature: 'dsr-finance' },
  { id: 'month-end-summary', path: '/month-end-summary', labelKey: 'nav.monthEndSummary', icon: BarChart3, component: MonthEndSummaryPage, group: 'finance', permission: 'manage_dsr_finance', feature: 'month-end-summary' },
  { id: 'profit', path: '/profit', labelKey: 'nav.profit', icon: TrendingUp, component: ProfitPage, group: 'finance', permission: 'manage_dsr_finance', feature: 'profit' },
  { id: 'dsr-due-statement', path: '/dsr-due-statement', labelKey: 'nav.dsrDueStatement', icon: Wallet, component: DsrDueStatementPage, group: 'finance', permission: 'manage_dsr_finance', feature: 'dsr-finance' },
  { id: 'activity-logs', path: '/activity-logs', labelKey: 'nav.activityLogs', icon: ClipboardList, component: ActivityLogsPage, group: 'governance', permission: 'view_activity_logs', feature: 'activity-logs' },
  { id: 'trash', path: '/trash', labelKey: 'nav.trash', icon: Trash2, component: TrashPage, group: 'governance', permission: 'view_state', feature: 'trash' },
  { id: 'database-backup', path: '/database-backup', labelKey: 'nav.databaseBackup', icon: Database, component: DatabaseBackupPage, group: 'developer', permission: 'manage_backups' },
  { id: 'org-settings', path: '/settings/organization', labelKey: 'nav.orgSettings', icon: Settings, component: OrgSettingsPage, group: 'governance', permission: 'manage_org' },
  { id: 'permissions', path: '/settings/permissions', labelKey: 'nav.permissions', icon: KeyRound, component: PermissionsPage, group: 'governance', roles: ['system_developer', 'super_admin'] },
  { id: 'users', path: '/settings/users', labelKey: 'nav.users', icon: UserCog, component: UsersPage, group: 'governance', permission: 'manage_users' },
  { id: 'platform', path: '/platform', labelKey: 'nav.platform', icon: ShieldCheck, component: PlatformAdminPage, group: 'developer', role: 'platform_admin' },
  { id: 'profile', path: '/profile', labelKey: 'nav.profile', icon: UserCog, component: ProfilePage },
  { id: 'system-health', path: '/system-health', labelKey: 'nav.systemHealth', icon: Activity, component: SystemHealthPage, group: 'developer', role: 'system_developer' },
  { id: 'error-logs', path: '/error-logs', labelKey: 'nav.errorLogs', icon: Bug, component: ErrorLogsPage, group: 'developer', role: 'system_developer' },
];

export function getRouteLabel(pathname, t = (key) => key) {
  const matchedRoute = [...APP_ROUTES]
    .sort((left, right) => right.path.length - left.path.length)
    .find((route) => pathname === route.path || pathname.startsWith(`${route.path}/`));

  return matchedRoute ? t(matchedRoute.labelKey) : t('nav.dashboard');
}
