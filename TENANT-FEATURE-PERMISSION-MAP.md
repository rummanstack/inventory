# Tenant Feature to Page Permission Map

This map is based on:
- `frontend/src/features/platform/components/TenantFeaturesModal.jsx`
- `frontend/src/app/routes.js`
- `frontend/src/features/permissions/pages/PermissionsPage.jsx`
- `backend/services/permissionService.js`

## How to read this

- `Tenant feature checkbox`: the feature key shown in the tenant features modal.
- `Page/menu`: the user-facing page or sidebar item tied to that feature.
- `Route permission`: the permission required to access the route from the app router/sidebar.
- `Extra action permissions`: additional permissions used inside the page for create/edit/delete actions.
- `Notes`: special cases like role-only pages or feature-only pages.

## Overview

| Tenant feature checkbox | Page/menu | Route path | Route permission | Extra action permissions | Notes |
|---|---|---|---|---|---|
| `dashboard` | Dashboard | `/dashboard` | `view_state` | - | Main overview page. |

## Point of Sale

| Tenant feature checkbox | Page/menu | Route path | Route permission | Extra action permissions | Notes |
|---|---|---|---|---|---|
| `retailer-quick-sale` | Quick Sale | `/retailer/quick-sale` | `manage_retail_quick_sale` | - | Same permission is also used by Cash Session Report. |
| `retailer-cash-sessions` | Cash Session | `/retailer/cash-sessions` | `manage_retail_quick_sale` | - | No separate permission exists for this page. |
| `quotations` | Quotations | `/quotations` | `view_quotations` | `manage_quotations` | View permission opens page, manage permission enables write actions. |
| `retailer-promotions` | Promotions | `/retailer/promotions` | `manage_retail_promotions` | - | Full page is gated by promotions permission. |
| `trade-ins` | Exchange | `/trade-ins` | `view_trade_ins` | `manage_trade_ins` | View permission opens page, manage permission enables write actions. |
| `retailer-sales-invoices` | Sales Invoices | `/retailer/sales-invoices` | `manage_retail_sales_invoices` | - | Full page is gated by sales invoice permission. |
| `retailer-sales-return` | Sales Return | `/retailer/sales-return` | `manage_retail_sales_returns` | - | Full page is gated by sales return permission. |

## Customers

| Tenant feature checkbox | Page/menu | Route path | Route permission | Extra action permissions | Notes |
|---|---|---|---|---|---|
| `retail-customers` | Customers | `/retail-customers` | `view_state` | `manage_retail_customers_write` | Route opens with `view_state`; write actions use retail customer write permission. |
| `retail-customer-retention` | Retention Insights | `/retail-customers/retention` | `view_retail_customer_retention` | - | Dedicated permission. |
| `retailer-customer-due` | Customer Due | `/retailer/customer-due` | `manage_retail_customer_due` | - | Full page is gated by customer due permission. |
| `retailer-due-collection` | Due Collection | `/retailer/due-collection` | `manage_retail_due_collection` | - | Full page is gated by due collection permission. |

## Inventory

| Tenant feature checkbox | Page/menu | Route path | Route permission | Extra action permissions | Notes |
|---|---|---|---|---|---|
| `products` | Products | `/products` | `view_state` | `manage_products` | Route opens with `view_state`; add/edit/delete use product management permission. |
| `stock-movement` | Stock Movement | `/stock-movement` | `view_state` | - | Read-focused page. |
| `low-stock-alerts` | Low Stock Alerts | `/low-stock-alerts` | `view_state` | - | Read-focused page. |
| `product-serials` | Serial / IMEI | `/product-serials` | `view_product_serials` | `manage_product_serials` | View permission opens page, manage permission enables write actions. |
| `damaged-stock` | Damaged Stock | `/damaged-stock` | `view_state` | `manage_products` | Route uses `view_state`; some stock adjustment actions depend on product management permission. |

## Distribution

| Tenant feature checkbox | Page/menu | Route path | Route permission | Extra action permissions | Notes |
|---|---|---|---|---|---|
| `dsrs` | DSRs | `/dsrs` | `view_state` | `manage_dsrs` | Route opens with `view_state`; write actions use DSR management permission. |
| `morning-issue` | Morning Issue | `/morning-issue` | `create_issues` | `update_issues` | Page route requires create permission; editing existing items also checks update permission. |
| `settlements` | Evening Settlement | `/settlements` | `create_settlements` | `update_settlements` | Page route requires create permission; editing existing settlements also checks update permission. |
| `dsr-finance` | Due Settlement | `/dsr-finance` | `manage_dsr_finance` | - | Dedicated permission. |

## Shops & SRs

| Tenant feature checkbox | Page/menu | Route path | Route permission | Extra action permissions | Notes |
|---|---|---|---|---|---|
| `customers` | Shops | `/customers` | `view_state` | `manage_customers` | Route opens with `view_state`; write actions use shop/customer management permission. |
| `shop-due-ledger` | Shop Due Ledger | `/shop-due-ledger` | `view_state` | `manage_customers` | Route opens with `view_state`; some actions depend on shop/customer management permission. |
| `srs` | SRs | `/srs` | `manage_srs` | - | Full page is gated by SR management permission. |
| `sr-due-ledger` | SR Due Ledger | `/sr-due-ledger` | `manage_srs` | - | Uses same permission as SRs. |

## Purchases

| Tenant feature checkbox | Page/menu | Route path | Route permission | Extra action permissions | Notes |
|---|---|---|---|---|---|
| `suppliers` | Suppliers | `/suppliers` | `manage_suppliers` | - | Dedicated permission. |
| `purchase-receive` | Purchase Receive | `/purchase-receive` | `manage_purchases` | - | Dedicated permission. |
| `supplier-payments` | Supplier Payments | `/supplier-payments` | `manage_supplier_payments` | - | Dedicated permission. |
| `supplier-discounts` | Supplier Discounts | `/supplier-discounts` | `manage_supplier_payments` | - | Uses supplier payments permission. |
| `supplier-statement` | Supplier Statement | `/supplier-statement` | `view_supplier_statement` | - | Read-focused page. |

## Warranty & Repair

| Tenant feature checkbox | Page/menu | Route path | Route permission | Extra action permissions | Notes |
|---|---|---|---|---|---|
| `warranty-claims` | Warranty Claims | `/warranty-claims` | `view_warranty_claims` | `manage_warranty_claims` | View permission opens page, manage permission enables write actions. |
| `repair-jobs` | Repair Jobs | `/repair-jobs` | `view_repair_jobs` | `manage_repair_jobs` | View permission opens page, manage permission enables write actions. |

## Finance

| Tenant feature checkbox | Page/menu | Route path | Route permission | Extra action permissions | Notes |
|---|---|---|---|---|---|
| `finance-dashboard` | Finance Dashboard | `/finance-dashboard` | `view_finance_dashboard` | - | Read-focused page. |
| `finance-accounts` | Accounts | `/finance-accounts` | `manage_finance_accounts` | - | Dedicated permission. |
| `expenses` | Expenses | `/expenses` | `manage_expenses` | - | Dedicated permission. |
| `profit` | Profit / Loss | `/profit` | `manage_profit_report` | - | Dedicated permission. |

## Reports

| Tenant feature checkbox | Page/menu | Route path | Route permission | Extra action permissions | Notes |
|---|---|---|---|---|---|
| `retailer-daily-sales-report` | Daily Sales Report | `/retailer/daily-sales-report` | `manage_retail_daily_sales_report` | - | Dedicated permission. |
| `reports` | Daily Reports | `/reports` | `view_state` | - | Main DSR report page. |
| `purchase-report` | Purchase Report | `/reports/purchase` | `manage_purchases` | - | Reuses purchase permission. |
| `stock-movement-report` | Stock Movement Report | `/reports/stock-movement` | `view_state` | - | Read-focused report. |
| `settlement-report` | Settlement Report | `/reports/settlement` | `create_settlements` | - | Reuses settlement creation permission. |
| `supplier-payment-report` | Supplier Payment Report | `/reports/supplier-payment` | `manage_supplier_payments` | - | Reuses supplier payments permission. |
| `sales-return-report` | Sales Return Report | `/reports/sales-return` | `manage_retail_sales_returns` | - | Reuses sales return permission. |
| `customer-due-report` | Customer Due Report | `/reports/customer-due` | `manage_retail_customer_due` | - | Reuses customer due permission. |
| `cash-session-report` | Cash Session Report | `/reports/cash-session` | `manage_retail_quick_sale` | - | Reuses quick sale permission. |
| `damaged-stock-report` | Damaged Stock Report | `/reports/damaged-stock` | `view_state` | - | Read-focused report. |
| `batch-tracking` | Batch Sales Report | `/reports/batch-sales` | `manage_batch_tracking` | - | Pharmacy batch tracking/report feature. |
| `history` | History | `/history` | `view_state` | - | Read-focused page. |
| `activity-logs` | Activity Logs | `/activity-logs` | `view_activity_logs` | - | Separate tenant feature checkbox. |

## HR & Payroll

| Tenant feature checkbox | Page/menu | Route path | Route permission | Extra action permissions | Notes |
|---|---|---|---|---|---|
| `employees` | Employees | `/hr/employees` | `view_employees` | `manage_employees` | View permission opens page, manage permission enables write actions. |
| `salary-payments` | Salary | `/hr/salary` | `manage_payroll` | - | Dedicated permission. |

## System & Settings

| Tenant feature checkbox | Page/menu | Route path | Route permission | Extra action permissions | Notes |
|---|---|---|---|---|---|
| `user-management` | User Management | `/settings/users` | `manage_users` | - | Dedicated permission. |
| `permissions` | Permissions | `/settings/permissions` | - | - | No route permission. Access is role-based: `system_developer` or `super_admin`. |
| `org-settings` | Org Settings | `/settings/organization` | `manage_org` | - | Dedicated permission. |
| `security` | Security | `/security` | - | `manage_users` | Route has no permission in `APP_ROUTES`; page uses `manage_users` for user-management actions only. |
| `issue-center` | Issue Center | `/issue-center` | `view_activity_logs` | - | Own tenant feature checkbox; still uses activity-log permission/data. |
| `trash` | Trash | `/trash` | `view_state` | `permanent_delete` | Route opens with `view_state`; hard delete uses permanent delete permission. |

## Not in tenant feature checkbox list

These exist in routes, but are not shown as tenant feature checkboxes in `TenantFeaturesModal` because that modal excludes `developer` and `hidden` route groups.

| Feature key | Page/menu | Route path | Access rule |
|---|---|---|---|
| `my-profile` | My Profile | `/profile` | Hidden route, linked from sidebar profile card. |
| `help-desk` | Help Desk | `/help-desk` | Hidden route, not shown in tenant feature checkboxes. |
| `platform` | Organizations | `/platform` | Developer-only (`system_developer`). |
| `system-health` | System Health | `/system-health` | Developer-only (`system_developer`). |
| `error-logs` | Error Logs | `/error-logs` | Developer-only (`system_developer`). |
| `database-backup` | Database Backup | `/database-backup` | Developer section route using `manage_backups`. |
| `visitor-chats` | Visitor Chats | `/platform/visitor-chats` | Developer-only (`system_developer`). |
| `contact-messages` | Contact Messages | `/platform/contact-messages` | Developer-only (`system_developer`). |

## Important consistency notes

- `PermissionsPage.jsx` says its feature gate map mirrors `backend/services/permissionService.js`, but the backend file currently does **not** include feature gates for:
  - `view_repair_jobs`
  - `manage_repair_jobs`
  - `manage_batch_tracking`
  - `manage_backups`
- Frontend routes still correctly gate those pages by route permission or role, but super-admin permission assignment feature-gating in the backend may not be fully aligned for those permissions.
- Several modules intentionally use `view_state` for route access and a separate write permission for management actions. The biggest examples are `products`, `retail-customers`, `dsrs`, `shops`, `shop-due-ledger`, `damaged-stock`, and `trash`.
