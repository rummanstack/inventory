// Feature keys correspond to APP_ROUTES ids in the frontend that can be
// individually enabled or disabled per tenant by a platform admin.
export const TENANT_FEATURES = [
  // Overview
  'dashboard',

  // Point of Sale
  'retailer-quick-sale',
  'retailer-cash-sessions',
  'quotations',
  'retailer-promotions',
  'trade-ins',
  'retailer-sales-invoices',
  'retailer-sales-return',
  'installment-sales',

  // Customers
  'retail-customers',
  'retail-customer-retention',
  'retailer-customer-due',
  'retailer-due-collection',

  // Inventory
  'products',
  'stock-movement',
  'low-stock-alerts',
  'product-serials',
  'damaged-stock',

  // DSR Operations
  'dsrs',
  'morning-issue',
  'settlements',
  'dsr-finance',

  // Shops & SRs
  'customers',
  'shop-due-ledger',
  'srs',
  'sr-due-ledger',

  // Purchases
  'suppliers',
  'purchase-receive',
  'purchase-returns',
  'supplier-payments',
  'supplier-discounts',
  'supplier-statement',
  'trade-promotions',

  // Warranty & Repair
  'warranty-claims',
  'repair-jobs',

  // Finance
  'finance-dashboard',
  'finance-accounts',
  'expenses',
  'profit',

  // Accounting
  'accounting-dashboard',
  'chart-of-accounts',
  'fiscal-years',
  'opening-balances',
  'accounting-settings',
  'journal-vouchers',
  'receipt-vouchers',
  'payment-vouchers',
  'contra-vouchers',
  'voucher-register',
  'journal-register',
  'general-ledger',
  'trial-balance',
  'balance-sheet',
  'profit-and-loss',
  'account-ledger',
  'customer-ledger',
  'supplier-ledger',
  'cash-book',
  'bank-book',
  'cash-flow',

  // Reports
  'retailer-daily-sales-report',
  'reports',
  'purchase-report',
  'stock-movement-report',
  'settlement-report',
  'supplier-payment-report',
  'sales-return-report',
  'customer-due-report',
  'cash-session-report',
  'damaged-stock-report',
  'batch-tracking',
  'history',
  'activity-logs',

  // HR & Payroll
  'departments',
  'designations',
  'employees',
  'salary-payments',
  'attendance',
  'leave_management',
  'payroll',
  'employee_advances',
  'employee_loans',
  'hr-reports',

  // System & Settings
  'user-management',
  'permissions',
  'org-settings',
  'security',
  'issue-center',
  'trash',
  'database-backup',

  // Hidden or non-sidebar routes
  'my-profile',
  'help-desk',
  'ai-assistant',

  // Developer
  'platform',
  'system-health',
  'error-logs',
  'visitor-chats',
  'contact-messages',
  'registration-requests',
];




