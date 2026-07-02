# Permission → Feature Mapping Reference

Ground-truth reference for `PERMISSION_REQUIRED_FEATURES`, the map that
decides which tenant feature must be enabled before a `super_admin` can
grant a given permission to `admin`/`manager`/`operator`.

**Single source of truth:** `backend/services/permissionService.js`. It is
returned to the frontend as `permissionRequiredFeatures` in the
`GET /permissions` response and consumed by `PermissionsPage.jsx` — there
is no second hardcoded copy anymore (there used to be one in the frontend;
it silently drifted out of sync and caused a real bug, which is why this
doc exists). **Do not add a new copy anywhere.** If you add a permission
that should be feature-gated, add it to the one map in
`permissionService.js` only.

This file is a snapshot for quick lookup and orientation. If it looks
wrong, trust the code over this doc — regenerate with the script at the
bottom.

## How to read this

- A permission listed here can only be granted by a `super_admin` to a
  sub-role if the named feature is enabled for that tenant (enforced in
  `updateRolePermissions`).
- A permission **not** listed here is assignable regardless of feature
  state — either because it's shared across multiple features/routes (no
  single feature to pin it to) or it's an action-level permission with no
  dedicated nav route at all.
- `system_developer` is never subject to this ceiling — it can grant
  anything to any role for any tenant regardless of that tenant's feature
  set.

## The mapping (54 of 59 permissions)

| Permission | Required feature |
|---|---|
| `manage_expenses` | `expenses` |
| `manage_dsr_finance` | `dsr-finance` |
| `manage_users` | `user-management` |
| `manage_org` | `org-settings` |
| `manage_finance_accounts` | `finance-accounts` |
| `view_finance_dashboard` | `finance-dashboard` |
| `create_issues` | `morning-issue` |
| `create_settlements` | `settlements` |
| `view_products` | `products` |
| `manage_products` | `products` |
| `view_dsrs` | `dsrs` |
| `manage_dsrs` | `dsrs` |
| `view_customers` | `customers` |
| `manage_customers` | `customers` |
| `view_srs` | `srs` |
| `manage_srs` | `srs` |
| `manage_suppliers` | `suppliers` |
| `view_suppliers` | `suppliers` |
| `manage_purchases` | `purchase-receive` |
| `view_purchases` | `purchase-receive` |
| `manage_supplier_payments` | `supplier-payments` |
| `view_supplier_payments` | `supplier-payments` |
| `view_supplier_statement` | `supplier-statement` |
| `manage_retail_quick_sale` | `retailer-quick-sale` |
| `view_retail_sales_invoices` | `retailer-sales-invoices` |
| `manage_retail_sales_invoices` | `retailer-sales-invoices` |
| `view_retail_sales_returns` | `retailer-sales-return` |
| `manage_retail_sales_returns` | `retailer-sales-return` |
| `view_retail_customer_due` | `retailer-customer-due` |
| `manage_retail_customer_due` | `retailer-customer-due` |
| `view_retail_due_collection` | `retailer-due-collection` |
| `manage_retail_due_collection` | `retailer-due-collection` |
| `manage_retail_promotions` | `retailer-promotions` |
| `manage_retail_daily_sales_report` | `retailer-daily-sales-report` |
| `view_retail_customers` | `retail-customers` |
| `manage_retail_customers_write` | `retail-customers` |
| `view_retail_customer_retention` | `retail-customer-retention` |
| `manage_profit_report` | `profit` |
| `view_product_serials` | `product-serials` |
| `manage_product_serials` | `product-serials` |
| `view_warranty_claims` | `warranty-claims` |
| `manage_warranty_claims` | `warranty-claims` |
| `view_repair_jobs` | `repair-jobs` |
| `manage_repair_jobs` | `repair-jobs` |
| `view_quotations` | `quotations` |
| `manage_quotations` | `quotations` |
| `view_trade_ins` | `trade-ins` |
| `manage_trade_ins` | `trade-ins` |
| `view_employees` | `employees` |
| `manage_employees` | `employees` |
| `manage_payroll` | `salary-payments` |
| `view_expiry_alerts` | `batch-tracking` |
| `manage_batch_tracking` | `batch-tracking` |
| `manage_backups` | `database-backup` |

## Deliberately unmapped (5 of 59)

| Permission | Why it has no single required feature |
|---|---|
| `view_state` | Shared by 3 routes with different features: `dashboard`, `reports`, `trash`. No single feature to pin it to. |
| `view_activity_logs` | Shared by 2 routes: `activity-logs`, `issue-center`. Same reason. |
| `update_issues` | Action-level permission (gates a PATCH inside the morning-issue flow), not tied to its own nav route. |
| `update_settlements` | Action-level permission (gates a PATCH inside the settlement flow), same as above. |
| `permanent_delete` | Action-level permission (hard-delete endpoints across several route files), not a page. |

If a permission ever appears here that maps to exactly **one** route's
feature, that's a bug — see the verification script below.

## Regenerating / verifying this table

Run from the repo root (Node, ESM):

```js
node --input-type=module -e "
import { TENANT_BUSINESS_PERMISSIONS } from './backend/lib/permissions.js';
import fs from 'fs';

const src = fs.readFileSync('./backend/services/permissionService.js', 'utf8');
const block = src.match(/const PERMISSION_REQUIRED_FEATURES = \{([\s\S]*?)\};/)[1];
const map = {};
for (const m of block.matchAll(/(\w+):\s*\"([^\"]+)\"/g)) map[m[1]] = m[2];

console.log('total:', TENANT_BUSINESS_PERMISSIONS.length, '| mapped:', Object.keys(map).length);
console.log('unmapped:', TENANT_BUSINESS_PERMISSIONS.filter(p => !map[p]));
"
```

To check whether an "unmapped" permission has secretly become single-feature
(and should be added to the map), cross-reference against
`frontend/src/app/routes.js`:

```js
node -e "
const fs = require('fs');
const routesSrc = fs.readFileSync('./frontend/src/app/routes.js', 'utf8');
const rows = [...routesSrc.matchAll(/permission:\s*'([^']+)',\s*feature:\s*'([^']+)'/g)];
const byPerm = {};
for (const [, perm, feat] of rows) (byPerm[perm] ||= new Set()).add(feat);
for (const [perm, feats] of Object.entries(byPerm)) console.log(perm, '->', [...feats].join(', '));
"
```

If any permission maps to exactly one feature and has no entry in
`PERMISSION_REQUIRED_FEATURES`, add it there (one map, one place —
`backend/services/permissionService.js`).
