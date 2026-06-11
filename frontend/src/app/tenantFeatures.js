// Tenant-toggleable feature keys, mapped to the nav label translation key.
// Kept separate from routes.js to avoid a circular import with pages
// (e.g. PlatformAdminPage) that need this list but are also referenced by routes.js.
export const TENANT_FEATURE_ROUTES = [
  { feature: 'products', labelKey: 'nav.products' },
  { feature: 'dsrs', labelKey: 'nav.dsrs' },
  { feature: 'customers', labelKey: 'nav.customers' },
  { feature: 'morning-issue', labelKey: 'nav.morningIssue' },
  { feature: 'settlements', labelKey: 'nav.eveningSettlement' },
  { feature: 'reports', labelKey: 'nav.reports' },
  { feature: 'history', labelKey: 'nav.history' },
  { feature: 'expenses', labelKey: 'nav.expenses' },
  { feature: 'dsr-finance', labelKey: 'nav.dsrFinance' },
  { feature: 'month-end-summary', labelKey: 'nav.monthEndSummary' },
  { feature: 'profit', labelKey: 'nav.profit' },
  { feature: 'activity-logs', labelKey: 'nav.activityLogs' },
];
