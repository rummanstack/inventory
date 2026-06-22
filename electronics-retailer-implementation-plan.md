# Electronics Retailer Sales Implementation Plan

## Goal

Make the current StockLedger retailer module suitable for real electronics shops.

Focus only on:

- Piece-based electronics sales
- Barcode / SKU search
- Brand and model support
- Serial / IMEI tracking
- Warranty tracking
- Customer due and payment
- Sales return
- Invoice print

Do **not** add these now:

- Loose sale
- Multi-unit conversion
- Separate wholesale module
- Separate dealer sale module
- Advanced accounting
- Multiple warehouses

---

## Current System Context

The project already has these important tables:

- `products`
- `sales_invoices`
- `sales_invoice_items`
- `retail_customers`
- `customer_due_ledger`
- `customer_payments`
- `sales_returns`
- `sales_return_items`
- `stock_movements`
- `purchase_receipts`
- `purchase_receipt_items`
- `suppliers`
- `supplier_due_ledger`
- `supplier_payments`
- `retail_cash_sessions`

So this task should be an **extension of the current retailer module**, not a full rewrite.

---

# Phase 1: Product Fields for Electronics

## Objective

Improve `products` so electronics shops can manage barcode, brand, model, serial requirement, and warranty.

## Add Columns to `products`

Add these fields:

```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS model TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS serial_required BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty_months INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
```

## Add Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(tenant_id, barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(tenant_id, brand);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(tenant_id, status);
```

## Product Form UI Changes

Add fields in product create/edit form:

- SKU
- Barcode
- Brand
- Model
- Serial / IMEI Required: Yes / No
- Warranty Months
- Status
- Description
- Image URL, optional

## Validation Rules

- `name` is required.
- `pieces_per_case` must stay integer.
- `stock_pieces` must stay integer.
- `purchase_price`, `wholesale_price`, `retail_price` must be non-negative.
- `warranty_months` must be `0` or positive integer.
- If `serial_required = true`, stock must be supported by serial entries later.

---

# Phase 2: Product Serial / IMEI Tracking

## Objective

Track individual serial/IMEI numbers for electronics products like phones, TVs, fridges, laptops, routers, etc.

## Create Table: `product_serials`

```sql
CREATE TABLE IF NOT EXISTS product_serials (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  product_id TEXT NOT NULL REFERENCES products(id),

  serial_number TEXT NOT NULL DEFAULT '',
  imei1 TEXT NOT NULL DEFAULT '',
  imei2 TEXT NOT NULL DEFAULT '',

  status TEXT NOT NULL DEFAULT 'IN_STOCK',

  purchase_receipt_id TEXT REFERENCES purchase_receipts(id) ON DELETE SET NULL,
  purchase_receipt_item_id TEXT REFERENCES purchase_receipt_items(id) ON DELETE SET NULL,

  sales_invoice_id TEXT REFERENCES sales_invoices(id) ON DELETE SET NULL,
  sales_invoice_item_id TEXT REFERENCES sales_invoice_items(id) ON DELETE SET NULL,

  warranty_start_date DATE,
  warranty_end_date DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  deleted_at TIMESTAMPTZ,
  deleted_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  delete_reason TEXT NOT NULL DEFAULT ''
);
```

## Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_product_serials_tenant_product ON product_serials(tenant_id, product_id);
CREATE INDEX IF NOT EXISTS idx_product_serials_status ON product_serials(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_product_serials_serial_number ON product_serials(tenant_id, serial_number);
CREATE INDEX IF NOT EXISTS idx_product_serials_imei1 ON product_serials(tenant_id, imei1);
CREATE INDEX IF NOT EXISTS idx_product_serials_imei2 ON product_serials(tenant_id, imei2);
CREATE INDEX IF NOT EXISTS idx_product_serials_sale ON product_serials(tenant_id, sales_invoice_id);
```

## Serial Status Values

Use these statuses:

```txt
IN_STOCK
SOLD
RETURNED
DAMAGED
WARRANTY
DELETED
```

## Business Rules

- For `serial_required = true`, every stock item should have one serial/IMEI row.
- For `serial_required = false`, no serial entry is required.
- Serial/IMEI should be unique per tenant where not empty.
- Only `IN_STOCK` serials can be sold.
- Sold serials should be linked to invoice and invoice item.

Recommended uniqueness checks in application logic:

- `serial_number` unique per tenant if present
- `imei1` unique per tenant if present
- `imei2` unique per tenant if present

---

# Phase 3: Connect Serials to Sales Items

## Objective

Allow one sales invoice item to contain one or more serial/IMEI numbers.

## Create Table: `sales_item_serials`

```sql
CREATE TABLE IF NOT EXISTS sales_item_serials (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  sales_invoice_id TEXT NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  sales_invoice_item_id TEXT NOT NULL REFERENCES sales_invoice_items(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  product_serial_id TEXT NOT NULL REFERENCES product_serials(id),

  serial_number_snapshot TEXT NOT NULL DEFAULT '',
  imei1_snapshot TEXT NOT NULL DEFAULT '',
  imei2_snapshot TEXT NOT NULL DEFAULT '',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_sales_item_serials_invoice ON sales_item_serials(tenant_id, sales_invoice_id);
CREATE INDEX IF NOT EXISTS idx_sales_item_serials_item ON sales_item_serials(tenant_id, sales_invoice_item_id);
CREATE INDEX IF NOT EXISTS idx_sales_item_serials_serial ON sales_item_serials(tenant_id, product_serial_id);
```

## Sale Rule

If product is serial required:

```txt
sales_invoice_items.quantity_pieces must equal selected serial count
```

Example:

```txt
Samsung A15 quantity = 3
Selected serials = 3
Allowed
```

```txt
Samsung A15 quantity = 3
Selected serials = 2
Block sale
```

---

# Phase 4: Improve Sales Invoice Tables

## Objective

Make invoices reliable for electronics sales and invoice print.

## Add Columns to `sales_invoices`

```sql
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS customer_name_snapshot TEXT NOT NULL DEFAULT '';
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS customer_phone_snapshot TEXT NOT NULL DEFAULT '';
```

## Payment Status — already exists, no column needed

Payment status is **already computed live** from `due_amount`/`paid_amount` — do not add a stored `payment_status` column, it would become a second source of truth that can drift from the real values.

- Backend: `backend/repositories/salesInvoiceRepository.js` (`buildFilters`, ~line 95-101) already filters by the same PAID/PARTIAL/DUE logic.
- Frontend: `paymentStatusOf()` in `frontend/src/models/inventoryViewData.js` (~line 206-210) already computes it for display.

## Calculation Rules

```txt
subtotal = sum of item line totals before invoice discount
invoice discount = sales_invoices.discount
tax_amount = calculated tax total
total_amount = subtotal - discount + tax_amount - loyalty_redeem_amount
due_amount = total_amount - paid_amount
```

Payment status (derived, not stored):

```txt
if due_amount <= 0 => PAID
if paid_amount > 0 and due_amount > 0 => PARTIAL
if paid_amount = 0 and due_amount > 0 => DUE
```

## Walk-in Customer Rule

```txt
WALK_IN customer must be fully paid.
Registered retail customer can have due.
```

Validation:

```txt
if customer_type = WALK_IN and due_amount > 0:
  reject invoice
```

---

# Phase 5: Improve Sales Invoice Items

## Objective

Keep invoice item history safe even if product information changes later.

## Add Columns to `sales_invoice_items`

```sql
ALTER TABLE sales_invoice_items ADD COLUMN IF NOT EXISTS brand_snapshot TEXT NOT NULL DEFAULT '';
ALTER TABLE sales_invoice_items ADD COLUMN IF NOT EXISTS model_snapshot TEXT NOT NULL DEFAULT '';
ALTER TABLE sales_invoice_items ADD COLUMN IF NOT EXISTS barcode_snapshot TEXT NOT NULL DEFAULT '';
ALTER TABLE sales_invoice_items ADD COLUMN IF NOT EXISTS warranty_months_snapshot INTEGER NOT NULL DEFAULT 0;
```

## Item Creation Rule

When adding a product to invoice, copy current product values:

```txt
product_name = products.name
brand_snapshot = products.brand
model_snapshot = products.model
barcode_snapshot = products.barcode
warranty_months_snapshot = products.warranty_months
cost_price_snapshot = products.purchase_price
actual_sale_price = selected sale price
```

## Profit Rule

```txt
item profit = (actual_sale_price - cost_price_snapshot) * quantity_pieces - line_discount
invoice total_profit = sum item profit
```

---

# Phase 6: Purchase Receive Serial Entry

## Objective

When purchasing serial-required products, require serial/IMEI entry.

## Backend Rule

During purchase receive:

1. Save `purchase_receipts`.
2. Save `purchase_receipt_items`.
3. Increase `products.stock_pieces`.
4. Insert `stock_movements` with `PURCHASE_IN`.
5. If product `serial_required = true`, require serial entries equal to purchased quantity.
6. Insert rows into `product_serials` with `status = IN_STOCK`.

## Validation

For each purchase item:

```txt
if product.serial_required = true:
  serial count must equal quantity_pieces
```

Example:

```txt
Product: Samsung A15
Purchase quantity: 5
Required serial/IMEI count: 5
```

## UI Change

In Purchase Receive page:

- If selected product is serial required, show button/section: `Add Serial / IMEI`.
- Allow bulk paste serials/IMEIs line by line.
- Show count validation: `5 required, 5 entered`.

---

# Phase 7: Retail Sale Serial Selection

## Objective

Allow electronics shop to sell products with serial/IMEI.

## Sale UI Flow

1. Select customer.
2. Search product by name, barcode, or SKU.
3. Add product to invoice.
4. If product is serial required:
   - Show available serial/IMEI list from `product_serials` where `status = IN_STOCK`.
   - User selects serial/IMEI.
   - Quantity auto matches selected serial count.
5. If product is not serial required:
   - User enters quantity normally.
6. Save invoice.

## Backend Save Flow

When saving invoice:

1. Validate stock availability.
2. Validate selected serials are available.
3. Create `sales_invoices`.
4. Create `sales_invoice_items`.
5. Create `sales_item_serials`.
6. Reduce `products.stock_pieces`.
7. Update selected `product_serials`:
   - `status = SOLD`
   - set `sales_invoice_id`
   - set `sales_invoice_item_id`
   - set `warranty_start_date = invoice_date`
   - set `warranty_end_date = invoice_date + warranty_months_snapshot`
8. Insert `stock_movements` with `SALE_OUT`.
9. If due exists, insert `customer_due_ledger`.
10. If payment exists, insert `customer_payments` or finance transaction as current system already does.

---

# Phase 8: Invoice Print for Electronics

## Objective

Print invoice with serial/IMEI and warranty details.

## Invoice Must Show

- Business name
- Invoice number
- Date
- Customer name
- Customer phone
- Product name
- Brand
- Model
- Serial / IMEI
- Warranty months
- Warranty end date
- Quantity
- Unit price
- Discount
- Total
- Paid amount
- Due amount
- Payment method

## Example Print Line

```txt
Samsung A15 / Brand: Samsung / Model: A15 128GB
IMEI: 352728282928282
Warranty: 12 months, valid until 2027-06-22
Qty: 1 | Price: 18,500 | Total: 18,500
```

---

# Phase 9: Sales Return With Serial Support

## Objective

Allow returns for electronics products while keeping serial status correct.

## Existing Tables

Use existing:

- `sales_returns`
- `sales_return_items`

## Add Optional Column to `sales_return_items`

```sql
ALTER TABLE sales_return_items ADD COLUMN IF NOT EXISTS condition TEXT NOT NULL DEFAULT 'GOOD';
```

Condition values:

```txt
GOOD
DAMAGED
WARRANTY
```

## Return Logic

When returning serial product:

1. Validate invoice exists.
2. Validate item belongs to invoice.
3. Validate return quantity does not exceed sold quantity minus already returned quantity.
4. For serial product, select returned serial/IMEI.
5. Create `sales_returns`.
6. Create `sales_return_items`.
7. Increase `products.stock_pieces` if condition is `GOOD`.
8. Update `product_serials.status`:
   - `GOOD` => `RETURNED` or `IN_STOCK`
   - `DAMAGED` => `DAMAGED`
   - `WARRANTY` => `WARRANTY`
9. Insert `stock_movements` with `RETURN_IN` if stock increases.
10. Adjust customer due/payment based on refund method.

Recommended simple rule:

```txt
GOOD return = back to stock
DAMAGED return = damaged stock
WARRANTY return = warranty process
```

---

# Phase 10: Warranty Claims

## Objective

Allow electronics shops to receive and track warranty/service claims.

## Create Table: `warranty_claims`

```sql
CREATE TABLE IF NOT EXISTS warranty_claims (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),

  claim_number TEXT NOT NULL,
  customer_id TEXT,
  sales_invoice_id TEXT REFERENCES sales_invoices(id) ON DELETE SET NULL,
  sales_invoice_item_id TEXT REFERENCES sales_invoice_items(id) ON DELETE SET NULL,
  product_id TEXT NOT NULL REFERENCES products(id),
  product_serial_id TEXT REFERENCES product_serials(id) ON DELETE SET NULL,

  problem_note TEXT NOT NULL DEFAULT '',
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,

  status TEXT NOT NULL DEFAULT 'RECEIVED',

  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  resolution_note TEXT NOT NULL DEFAULT '',

  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  deleted_at TIMESTAMPTZ,
  deleted_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  delete_reason TEXT NOT NULL DEFAULT '',

  UNIQUE (tenant_id, claim_number)
);
```

## Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_warranty_claims_tenant_status ON warranty_claims(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_invoice ON warranty_claims(tenant_id, sales_invoice_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_serial ON warranty_claims(tenant_id, product_serial_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_date ON warranty_claims(tenant_id, received_date DESC);
```

## Status Values

```txt
RECEIVED
SENT_TO_SUPPLIER
REPAIRED
REPLACED
REJECTED
DELIVERED
```

## Warranty Flow

1. Search by IMEI/serial.
2. Find sold invoice.
3. Check warranty end date.
4. Create claim.
5. Track claim status.
6. Close claim after delivered/rejected.

---

# Phase 11: Reports Needed

## Add / Improve Reports

For electronics retailer, add these reports:

### 1. Serial Stock Report

Filters:

- Product
- Brand
- Status
- Serial / IMEI search

Show:

- Product
- Brand
- Model
- Serial / IMEI
- Status
- Purchase date
- Sale invoice
- Warranty end date

### 2. Warranty Report

Filters:

- Status
- Date range
- Supplier
- Product

Show:

- Claim number
- Customer
- Product
- Serial / IMEI
- Problem
- Status
- Received date

### 3. Electronics Sales Report

Add to current sales report:

- Brand
- Model
- Serial / IMEI
- Warranty info

---

# Phase 12: Permissions and Tenant Features

> The app already gives every sidebar menu item its own individual backend permission and tenant feature flag, both enforced server-side (not just used to hide links) — see `backend/lib/permissions.js`, `backend/lib/features.js`, `backend/middleware/requireFeature.js`, and the per-menu grouping in `frontend/src/features/permissions/pages/PermissionsPage.jsx`. The two new menu items below must follow that existing convention, not introduce a separate scheme.

## Add Tenant Features

One feature key per new menu item, added to `TENANT_FEATURES` in `backend/lib/features.js` and `TENANT_FEATURE_ROUTES` in `frontend/src/app/tenantFeatures.js`:

```txt
product-serials      (Serial / IMEI menu item)
warranty-claims       (Warranty Claims menu item)
```

Drop `electronics-retail` — it doesn't map to any single menu item, which breaks the established 1:1 convention. If a master on/off switch for the whole electronics feature set is actually wanted, that's a separate decision to make explicitly later, not bundled in here.

## Add Permissions

Route-gating permission (one per new menu item, same role as `view_state` on other list pages):

```txt
view_product_serials      — gates the Serial / IMEI page route + its API reads
view_warranty_claims      — gates the Warranty Claims page route + its API reads
```

In-page action permissions (gate write actions inside those pages, same pattern as `manage_products` already gating the Add/Edit buttons inside the Products page — see `EXTRA_GROUP_PERMISSIONS` in `PermissionsPage.jsx`):

```txt
manage_product_serials    — add/edit/delete a serial record
manage_warranty_claims     — create/update a warranty claim
```

## Sidebar Placement

The sidebar was reorganized earlier — "Retailer" is now **Sales**, and Daily Sales Report / Profit Report already live under **Reports**, not under Sales. Place the two new items into the existing structure (`frontend/src/app/routes.js`, `SIDEBAR_SECTIONS`):

```txt
Inventory (existing group — add to it)
- Products
- Damaged Stock
- Stock Movement
- Low Stock Alerts
- Serial / IMEI            <- new

Warranty (new group, or fold into Support — decide before implementing)
- Warranty Claims          <- new
```

---

# Phase 13: API Endpoints

## Product APIs

Note: current product search (`listProductsPage()` in `backend/repositories/productRepository.js`) only does an `ILIKE` substring match on name/category — there is no barcode/SKU lookup today. The barcode/SKU search endpoint below is a genuinely new capability, not a tweak to an existing one.

Update existing product APIs to support:

- sku
- barcode
- brand
- model
- serial_required
- warranty_months
- status

## New Serial APIs

Create endpoints:

```txt
GET    /api/product-serials
GET    /api/product-serials/:id
POST   /api/product-serials
PATCH  /api/product-serials/:id
DELETE /api/product-serials/:id
GET    /api/product-serials/available?productId=...
GET    /api/product-serials/search?q=...
```

## Warranty APIs

```txt
GET    /api/warranty-claims
GET    /api/warranty-claims/:id
POST   /api/warranty-claims
PATCH  /api/warranty-claims/:id
DELETE /api/warranty-claims/:id
GET    /api/warranty-claims/search-serial?q=...
```

## Sales API Update

Update sale create endpoint to accept:

```json
{
  "items": [
    {
      "productId": "...",
      "quantityPieces": 1,
      "actualSalePrice": 18500,
      "serialIds": ["serial-id-1"]
    }
  ]
}
```

---

# Phase 14: Frontend Pages

## Product Form

Add fields:

- SKU
- Barcode
- Brand
- Model
- Serial required
- Warranty months
- Status

## Serial / IMEI Page

Create page:

```txt
Inventory > Serial / IMEI
```

Features:

- List serials
- Search by serial/IMEI
- Filter by product/status
- Add manual serial
- Edit serial
- View linked sale invoice

## Purchase Receive Page

Add serial entry modal for serial-required products.

Features:

- Bulk paste serials
- Validate count equals purchase quantity
- Prevent duplicate serial/IMEI

## Quick Sale / Sales Invoice Page

Update product row:

- Search by barcode/SKU/name
- If serial required, open serial selector
- Quantity auto equals selected serial count
- Show selected serials under product row

## Warranty Claims Page

Create page:

```txt
Warranty / Service > Warranty Claims
```

Features:

- Search by serial/IMEI
- Create claim
- Update status
- Add resolution note
- Link to invoice

---

# Phase 15: Testing Checklist

## Product Tests

- Create product without serial requirement.
- Create product with serial requirement.
- Search product by barcode.
- Search product by SKU.
- Product warranty months saves correctly.

## Purchase Tests

- Purchase non-serial product without serials.
- Purchase serial-required product with exact serial count.
- Block purchase if serial count is less than quantity.
- Block duplicate IMEI/serial.
- Stock increases correctly.
- Stock movement created correctly.

## Sale Tests

- Sell non-serial product normally.
- Sell serial-required product with selected serial.
- Block sale if serial not selected.
- Block sale if serial status is not `IN_STOCK`.
- Quantity matches selected serial count.
- Stock decreases correctly.
- Serial status becomes `SOLD`.
- Invoice prints serial/IMEI.
- Warranty dates are generated.

## Due Tests

- Walk-in customer cannot have due.
- Registered customer can have due.
- Due ledger updates correctly.
- Due collection reduces due.

## Return Tests

- Return non-serial product.
- Return serial product.
- Returned serial status updates correctly.
- Stock movement created correctly.
- Customer due/payment adjusted correctly.

## Warranty Tests

- Search sold item by serial/IMEI.
- Create warranty claim.
- Update claim status.
- Close claim.

---

# Implementation Order for Codex / Claude

Follow this exact order:

```txt
1. Update schema.js with product electronics fields.
2. Add product_serials table.
3. Add sales_item_serials table.
4. Add warranty_claims table.
5. Add sales invoice/customer snapshot and payment_status fields.
6. Add sales invoice item snapshot fields.
7. Update backend product create/update/list APIs.
8. Update purchase receive logic for serial-required products.
9. Update sale invoice creation logic for serial selection and stock changes.
10. Update sales return logic for serial products.
11. Add warranty claim backend APIs.
12. Update frontend product form.
13. Add Serial / IMEI page.
14. Update purchase receive UI for serial entry.
15. Update Quick Sale / Sales Invoice UI for serial selection.
16. Add Warranty Claims page.
17. Update invoice print design.
18. Add tests / invariant checks.
```

---

# Important Safety Rules

## Never Allow Overselling

```txt
products.stock_pieces cannot go below 0
```

## Never Sell Sold Serial Again

```txt
Only product_serials.status = IN_STOCK can be sold
```

## Keep Invoice History Stable

Always use snapshot fields in invoice items.

## Keep Stock Movement for Every Stock Change

Every stock increase/decrease must create a `stock_movements` row.

## Keep Tenant Isolation

Every query must filter by `tenant_id`.

## Use Transactions

Use database transaction for:

- Purchase receive
- Sales invoice create
- Sales return
- Warranty replacement if stock changes

---

# Final Acceptance Criteria

The work is complete when:

- Electronics product can be created with barcode, brand, model, warranty and serial requirement.
- Serial/IMEI can be entered during purchase.
- Serial/IMEI can be selected during sale.
- Sold serial cannot be sold again.
- Invoice print shows serial/IMEI and warranty.
- Stock decreases after sale.
- Stock movement is created after sale.
- Registered customer due works.
- Walk-in due is blocked.
- Sales return works with serial product.
- Warranty claim can be created by searching serial/IMEI.
