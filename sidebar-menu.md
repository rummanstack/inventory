# Sidebar Menu

Generated from [AppSidebar.jsx](frontend/src/app/AppSidebar.jsx) and [routes.js](frontend/src/app/routes.js).

Each item lists its gate: `permission` (checked via `can()`, now enforced on the real backend API route too — not just sidebar visibility) and `feature` (tenant-toggleable, checked via `hasFeature()` on the frontend and `requireFeature()` on the backend). Every menu item now has its own individually assignable permission and its own tenant feature flag. Items with no `permission` (role-only or fully open) are noted as such. The `system_developer` role bypasses all permission/feature/role checks except in the Developer group, where it's the explicit gate.

## Dashboard
*(standalone item, no group header)*
- Dashboard — permission: `view_state`, feature: `dashboard`

## Sales
- Quick Sale — permission: `manage_retail_quick_sale`, feature: `retailer-quick-sale`
- Sales Invoices — permission: `manage_retail_sales_invoices`, feature: `retailer-sales-invoices`
- Sales Return — permission: `manage_retail_sales_returns`, feature: `retailer-sales-return`
- Customers (retail) — permission: `view_state` (reads only; writes use `manage_retail_customers_write`), feature: `retail-customers`
- Retention Insights — permission: `view_retail_customer_retention`, feature: `retail-customer-retention`
- Customer Due — permission: `manage_retail_customer_due`, feature: `retailer-customer-due`
- Due Collection — permission: `manage_retail_due_collection`, feature: `retailer-due-collection`
- Promotions — permission: `manage_retail_promotions`, feature: `retailer-promotions`

## Inventory
- Products — permission: `view_state`, feature: `products`
- Damaged Stock — permission: `view_state`, feature: `damaged-stock`
- Stock Movement — permission: `view_state`, feature: `stock-movement`
- Low Stock Alerts — permission: `view_state`, feature: `low-stock-alerts`

*Known exception:* these four share `view_state` rather than each getting its own permission. They all read from one app-boot-loaded `productDirectory` (plus a shared `/stock-movements` endpoint) — there's no independent per-page fetch to gate, so splitting the permission would be cosmetic only. The feature flags above are split per item regardless, since those only affect visibility/routing.

## Dealer / DSR
- DSRs — permission: `view_state`, feature: `dsrs`
- Shops — permission: `view_state`, feature: `customers`
- Morning Issue — permission: `create_issues`, feature: `morning-issue`
- Evening Settlement — permission: `create_settlements`, feature: `settlements`
- DSR Finance — permission: `manage_dsr_finance`, feature: `dsr-finance`

## Purchases
- Suppliers — permission: `manage_suppliers`, feature: `suppliers`
- Purchase Receive — permission: `manage_purchases`, feature: `purchase-receive`
- Supplier Payments — permission: `manage_supplier_payments`, feature: `supplier-payments`
- Supplier Statement — permission: `view_supplier_statement`, feature: `supplier-statement`

## Finance
- Finance Dashboard — permission: `view_finance_dashboard`, feature: `finance-dashboard`
- Accounts — permission: `manage_finance_accounts`, feature: `finance-accounts`
- Expenses — permission: `manage_expenses`, feature: `expenses`
- Profit / Loss — permission: `manage_profit_report`, feature: `profit`

## Reports
- Daily Sales Report — permission: `manage_retail_daily_sales_report`, feature: `retailer-daily-sales-report`
- Daily Reports — permission: `view_state`, feature: `reports`
- Profit Report — permission: `manage_retail_profit_report`, feature: `retailer-profit-report`
- History — permission: `view_state`, feature: `history`

## System
- Issue Center — permission: `view_activity_logs` (aggregates several other gated sub-fetches), feature: `activity-logs`
- Activity Logs — permission: `view_activity_logs`, feature: `activity-logs`
- Trash — permission: `view_state` (each tab inside requires its own `manage_*`/`permanent_delete` permission), feature: `trash`

## Settings
- Org Settings — permission: `manage_org`, feature: `org-settings`
- User Management — permission: `manage_users`, feature: `user-management`
- Permissions — roles: `system_developer`, `super_admin` (role-gated, not permission-gated), feature: `permissions`
- Security — no permission gate, feature: `security`
- My Profile — no permission gate, feature: `my-profile`

## Support
- Help Desk — no permission gate, feature: `help-desk`

## Developer
*Role `system_developer` overrides the normal permission/feature checks for this group — these stay hardcoded by design (tenant-wide management must not be delegable to a regular Super Admin).*
- Organizations (Platform admin: create/update tenants, manage features, activate/deactivate — **no delete**) — role: `system_developer`, feature: `platform`
- Database Backup — permission: `manage_backups` (now actually assignable — see below), feature: `database-backup`
- Visitor Chats — role: `system_developer`, feature: `visitor-chats`
- System Health — role: `system_developer`, feature: `system-health`
- Error Logs — role: `system_developer`, feature: `error-logs`

## What changed in the per-menu-item permission/feature split
- 12 new backend permissions replace the old shared `manage_retailers` (9 new), plus clean splits for Profit/Loss (`manage_profit_report`, was sharing `manage_dsr_finance`), Retention Insights (`view_retail_customer_retention`, was sharing `view_state`), and Supplier Statement (`view_supplier_statement`, was mismatched to `manage_suppliers` in the frontend label despite the backend already using `view_state`).
- `manage_backups` is now part of `TENANT_BUSINESS_PERMISSIONS`, so Super Admin can actually grant Database Backup access — previously this was silently unassignable (dead permission check).
- 17 new tenant feature flags cover every previously-unflagged menu item (Dashboard, My Profile, Security, Help Desk, Org Settings, User Management, Permissions, Retail Customers, Retention Insights, Database Backup, the four Developer pages, and the three other Inventory items).
- Feature flags are now enforced on the backend (`requireFeature` middleware), not just used to hide sidebar links — closing a gap where a tenant without a feature enabled could previously still call its API directly.
- `MANAGE_TENANTS` permission constant remains defined but unused — out of scope for this change.
