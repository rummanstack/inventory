// Starting point for a role's permission checkboxes, tailored per business
// vertical. Presets only pre-fill the (unsaved) checkbox state on the
// Permissions page — applying one never saves by itself, and any permission
// whose feature isn't enabled for the tenant is silently skipped rather than
// causing a rejected save. Add more here as new verticals/clients settle
// into a repeatable pattern; there's no cap on how many can exist per role.
export const PERMISSION_PRESETS = [
  {
    id: 'fmcg-admin',
    labelKey: 'permissions.presets.fmcgAdmin',
    role: 'admin',
    permissions: [
      'view_state', 'manage_products', 'view_product_browser',
      'manage_dsrs', 'manage_customers', 'manage_srs',
      'create_issues', 'update_issues', 'create_settlements', 'update_settlements',
      'manage_dsr_finance', 'manage_expenses',
      'manage_suppliers', 'manage_purchases', 'manage_supplier_payments', 'manage_purchase_returns', 'view_supplier_statement',
      'manage_finance_accounts', 'view_finance_dashboard', 'manage_profit_report',
      'manage_trade_promotion_rules', 'manage_trade_promotion_settlements',
      'manage_users', 'manage_org', 'view_activity_logs',
    ],
  },
  {
    id: 'fmcg-manager',
    labelKey: 'permissions.presets.fmcgManager',
    role: 'manager',
    permissions: [
      'view_state', 'view_products',
      'manage_dsrs', 'manage_customers', 'view_srs',
      'create_issues', 'update_issues', 'create_settlements', 'update_settlements', 'manage_dsr_finance',
      'view_suppliers', 'manage_purchases', 'view_supplier_payments', 'manage_expenses',
      'view_finance_dashboard', 'manage_profit_report', 'view_trade_promotions', 'view_activity_logs',
    ],
  },
  {
    id: 'fmcg-operator',
    labelKey: 'permissions.presets.fmcgOperator',
    role: 'operator',
    permissions: [
      'view_state', 'view_products', 'view_dsrs', 'create_issues', 'create_settlements', 'view_customers', 'view_srs',
    ],
  },
  {
    id: 'electronics-admin',
    labelKey: 'permissions.presets.electronicsAdmin',
    role: 'admin',
    permissions: [
      'view_state', 'manage_products', 'view_product_browser',
      'manage_retail_quick_sale', 'manage_retail_sales_invoices', 'manage_retail_sales_returns',
      'manage_retail_customer_due', 'manage_retail_due_collection', 'manage_retail_promotions',
      'manage_retail_daily_sales_report', 'manage_retail_customers_write', 'view_retail_customer_retention',
      'manage_product_serials', 'manage_warranty_claims', 'manage_repair_jobs', 'manage_quotations', 'manage_trade_ins',
      'manage_suppliers', 'manage_purchases', 'manage_supplier_payments',
      'manage_finance_accounts', 'view_finance_dashboard', 'manage_expenses', 'manage_profit_report',
      'manage_users', 'manage_org', 'view_activity_logs',
    ],
  },
  {
    id: 'electronics-manager',
    labelKey: 'permissions.presets.electronicsManager',
    role: 'manager',
    permissions: [
      'view_state', 'manage_products',
      'manage_retail_quick_sale', 'manage_retail_sales_invoices', 'view_retail_sales_returns',
      'manage_retail_customer_due', 'view_retail_due_collection', 'view_retail_customers',
      'manage_product_serials', 'manage_warranty_claims', 'manage_repair_jobs', 'manage_quotations', 'view_trade_ins',
      'view_suppliers', 'view_purchases', 'manage_expenses', 'view_finance_dashboard', 'manage_profit_report',
    ],
  },
  {
    id: 'electronics-operator',
    labelKey: 'permissions.presets.electronicsOperator',
    role: 'operator',
    permissions: [
      'view_state', 'view_products', 'manage_retail_quick_sale', 'view_retail_sales_invoices',
      'view_retail_customers', 'view_retail_customer_due', 'view_product_serials', 'view_warranty_claims',
      'view_repair_jobs', 'view_quotations',
    ],
  },
  {
    id: 'pharmacy-admin',
    labelKey: 'permissions.presets.pharmacyAdmin',
    role: 'admin',
    permissions: [
      'view_state', 'manage_products', 'view_product_browser', 'manage_batch_tracking', 'view_expiry_alerts',
      'manage_retail_quick_sale', 'manage_retail_sales_invoices', 'manage_retail_sales_returns',
      'manage_retail_customer_due', 'manage_retail_due_collection', 'manage_retail_customers_write', 'view_retail_customer_retention',
      'manage_suppliers', 'manage_purchases', 'manage_supplier_payments',
      'manage_finance_accounts', 'view_finance_dashboard', 'manage_expenses', 'manage_profit_report',
      'manage_users', 'manage_org', 'view_activity_logs',
    ],
  },
  {
    id: 'pharmacy-manager',
    labelKey: 'permissions.presets.pharmacyManager',
    role: 'manager',
    permissions: [
      'view_state', 'manage_products', 'manage_batch_tracking', 'view_expiry_alerts',
      'manage_retail_quick_sale', 'manage_retail_sales_invoices',
      'manage_retail_customer_due', 'view_retail_customers',
      'view_suppliers', 'view_purchases', 'manage_expenses', 'view_finance_dashboard', 'manage_profit_report',
    ],
  },
  {
    id: 'pharmacy-operator',
    labelKey: 'permissions.presets.pharmacyOperator',
    role: 'operator',
    permissions: [
      'view_state', 'view_products', 'view_expiry_alerts', 'manage_retail_quick_sale',
      'view_retail_sales_invoices', 'view_retail_customers', 'view_retail_customer_due',
    ],
  },
];
