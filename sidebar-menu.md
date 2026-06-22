# Sidebar Menu

Generated from [AppSidebar.jsx](frontend/src/app/AppSidebar.jsx) and [routes.js](frontend/src/app/routes.js).

Each item lists its gate: `permission` (checked via `can()`), `feature` (tenant-toggleable, checked via `hasFeature()`), and/or `role`/`roles` (exact role match). Items with no gate are visible to everyone. The `system_developer` role bypasses all permission/feature/role checks except in the Developer group, where it's the explicit gate.

## Dashboard
*(standalone item, no group header)*
- Dashboard — permission: `view_state`

## Sales
- Quick Sale — permission: `manage_retailers`, feature: `retailer-quick-sale`
- Sales Invoices — permission: `manage_retailers`, feature: `retailer-sales-invoices`
- Sales Return — permission: `manage_retailers`, feature: `retailer-sales-return`
- Customers (retail) — permission: `view_state`
- Retention Insights — permission: `view_state`
- Customer Due — permission: `manage_retailers`, feature: `retailer-customer-due`
- Due Collection — permission: `manage_retailers`, feature: `retailer-due-collection`
- Promotions — permission: `manage_retailers`, feature: `retailer-promotions`

## Inventory
- Products — permission: `view_state`, feature: `products`
- Damaged Stock — permission: `view_state`, feature: `products`
- Stock Movement — permission: `view_state`, feature: `products` (new page; reuses the existing `StockLedgerPanel` component, global view across all products)
- Low Stock Alerts — permission: `view_state`, feature: `products` (new page; uses the existing `getLowStockProducts`/`getLowStockThreshold` helpers already used by the Dashboard widget)

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
- Supplier Statement — permission: `manage_suppliers`, feature: `supplier-statement`

## Finance
- Finance Dashboard — permission: `view_finance_dashboard`, feature: `finance-dashboard`
- Accounts — permission: `manage_finance_accounts`, feature: `finance-accounts`
- Expenses — permission: `manage_expenses`, feature: `expenses`
- Profit / Loss — permission: `manage_dsr_finance`, feature: `profit`

## Reports
- Daily Sales Report — permission: `manage_retailers`, feature: `retailer-daily-sales-report`
- Daily Reports — permission: `view_state`, feature: `reports`
- Profit Report — permission: `manage_retailers`, feature: `retailer-profit-report`
- History — permission: `view_state`, feature: `history`

## System
- Issue Center — permission: `view_activity_logs`, feature: `activity-logs`
- Activity Logs — permission: `view_activity_logs`, feature: `activity-logs`
- Trash — permission: `view_state`, feature: `trash`

## Settings
- Org Settings — permission: `manage_org`
- User Management — permission: `manage_users`
- Permissions — roles: `system_developer`, `super_admin`
- Security — no gate (now wired into the sidebar; previously had no `group` and was unreachable from the menu)
- My Profile — no gate

## Support
- Help Desk — no gate (visible to everyone)

## Developer
*Role `system_developer` overrides the normal permission/feature checks for this group.*
- Organizations (Platform admin: create/update tenants, manage features, activate/deactivate — **no delete**) — role: `system_developer`
- Database Backup — permission: `manage_backups` (in practice, only `system_developer` can ever reach this — see note below)
- Visitor Chats — role: `system_developer`
- System Health — role: `system_developer`
- Error Logs — role: `system_developer`

## Known issues (unchanged from before this reorg)
- `manage_backups` is not part of `TENANT_BUSINESS_PERMISSIONS` in [permissions.js](backend/lib/permissions.js), so it can never actually be granted to a non-`system_developer` role via the Permissions page. The permission check on Database Backup is effectively dead code.
- `MANAGE_TENANTS` permission constant is defined but unused anywhere in the codebase.
- Organizations (tenant) management has no delete action — only create, update, feature toggles, and activate/deactivate.
