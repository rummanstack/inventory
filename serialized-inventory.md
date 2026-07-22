# Serialized Inventory (Barcode + Serial/IMEI Tracking)

This extends the existing serial/IMEI tracking system (`product_serials`) rather than
introducing a second, parallel one — see the "Why extend, not rebuild" note at the bottom.

## 1. Product-level flag

`products.serial_required` (boolean, default `false`) is the `isSerialized` toggle.
The product's own `barcode` column is untouched and still means the same thing it
always did — the product-level barcode used by non-serialized quantity workflows.

- `serial_required = false` → standard quantity-based flow (scan the product barcode,
  update `stock_pieces` via a stock movement). Unaffected by anything below.
- `serial_required = true` → inventory for that product is tracked unit-by-unit in
  `product_serials`; every purchase/sale must name specific units.

## 2. Data model — `product_serials`

| Column | Notes |
|---|---|
| `id` | prefixed id (`serial-...`) |
| `tenant_id` | organization scope |
| `product_id` | FK → `products` |
| `serial_number`, `imei1`, `imei2` | at least one required |
| `barcode` | **new** — this unit's own scannable code, independent of the product's barcode |
| `status` | `IN_STOCK`, `SOLD`, `RETURNED`, `DAMAGED`, `WARRANTY`, `DELETED` |
| `purchase_price`, `sale_price` | **new**, both optional — per-unit economics |
| `purchase_receipt_id` / `_item_id` | which receipt brought this unit in |
| `sales_invoice_id` / `_item_id` | which invoice sold this unit |
| `warranty_start_date`, `warranty_end_date` | |

Uniqueness (serial number, IMEI1, IMEI2, **and now barcode**) is enforced tenant-wide
through a companion table, `product_serial_identifiers` — one row per non-blank value
across all four columns, with a single unique index. This is why a value can never be
reused across *different* identifier types either (e.g. a barcode can't collide with
someone else's serial number).

Quantity is **not** a separate counter that can drift — `products.stock_pieces` is
derived from `stock_movements`, and every serial status change (received, sold,
returned) posts a movement in the same transaction. Counting
`product_serials WHERE status = 'IN_STOCK'` and reading `stock_pieces` will always
agree for a serialized product.

## 3. API endpoints (`/api/product-serials`)

| Method & path | Purpose | Permission |
|---|---|---|
| `GET /` | Paginated list; `search` matches serial number, IMEI1/2, barcode, product name, or SKU | `view_product_serials` |
| `GET /:id` | Single record | `view_product_serials` |
| `GET /available?productId=` | IN_STOCK units for a product (used by the POS serial picker) | broad sale-time access |
| `GET /barcode/:barcode` | **New.** Resolves a scanned barcode straight to its unit + product. Returns `{ serial: null }` (not 404) on a miss, so callers can fall back to a normal product-barcode lookup without a try/catch | same broad sale-time access |
| `POST /` | Create one unit. Barcode auto-generates if omitted | `manage_product_serials` |
| `POST /bulk` | **New.** CSV/bulk import — see below | `manage_product_serials` |
| `PATCH /:id` | Update a unit | `manage_product_serials` |
| `DELETE /:id` | Soft delete | `manage_product_serials` |
| `GET /trash` | Trashed units | `manage_product_serials` |

All gated by the `product-serials` feature flag (except `/available` and
`/barcode/:barcode`, which ride on broader product/sales access so a cashier can scan
without the standalone management permission).

### Auto-generated barcodes

`generateSerialBarcode()` (`backend/lib/productSerials.js`) produces a 12-digit numeric
string prefixed `2` (GS1's restricted-circulation range, so it can never collide with a
real EAN-13 the product might carry). `generateUniqueSerialBarcode()` retries up to 5
times against the live uniqueness check before giving up. This fires whenever a unit is
created without its own barcode — single add, purchase receive, or bulk import.

### Bulk import (`POST /bulk`)

```json
{
  "productId": "prod-...",
  "rows": [
    { "serialNumber": "SN-0001" },
    { "serialNumber": "SN-0002", "barcode": "899...", "purchasePrice": 250, "salePrice": 320 }
  ]
}
```

- Up to 500 rows per call, one transaction — the whole batch fails together (no partial
  imports on a bad row, so a corrected re-upload can't create duplicates).
- `barcode`/`purchasePrice`/`salePrice` are optional per row; a missing barcode
  auto-generates the same as a single manual add.
- The frontend (`ProductSerialsPage` → "Import CSV") accepts `.csv`, `.xlsx`, or `.xls`,
  parses client-side with `xlsx`, and offers a downloadable template. The backend never
  parses files — it only ever receives a plain JSON array, so no new upload/multipart
  handling was needed.

## 4. Receiving stock

`purchase-receive` items already accept `serials: [...]` for serial-required lines.
That array now accepts either shape:

```json
"serials": ["SN-0001", "SN-0002"]                              // legacy — still works
"serials": [{ "serialNumber": "SN-0001" }, { "serialNumber": "SN-0002", "barcode": "...", "purchasePrice": 210 }]
```

Both are normalized to the same internal shape. A unit that doesn't name its own
`purchasePrice` inherits the purchase line's price; a missing `barcode` auto-generates.
This applies on create, edit (the existing reconciliation logic that diffs
previous/next serials by receipt line), and delete/restore.

## 5. Sales

Unchanged core logic — a line still names `serialIds`, each is locked, checked
`IN_STOCK`, checked for no double-selection within the same sale, and flipped to `SOLD`
in the same transaction as the invoice. What's new is *how a serial gets into that
list*: the Sales Invoice form's serial picker now has a barcode-scan input above the
checklist. Scanning/typing a code and pressing Enter calls
`GET /product-serials/barcode/:barcode`, and on a match (right product, `IN_STOCK`, not
already selected) auto-checks that unit — no more hunting through a list by eye.

## 6. Returns

Already handled, and already covers more than the ask: `salesReturnService.js` sets a
returned serial's status to `IN_STOCK`, `DAMAGED`, or `WARRANTY` depending on the
return's recorded condition. No changes made here.

## 7. Search

`GET /product-serials?search=` now matches serial number, IMEI1, IMEI2, **barcode**,
**product name**, and **product SKU** (previously: serial/IMEI columns only).

## 8. UI

- Product form: existing "Serial / IMEI Required" toggle (`serialRequired`) — this *is*
  the `isSerialized` switch, just named for how it originally shipped.
- `ProductSerialsPage` ("Serial / IMEI" in Inventory): add/edit form now has Barcode,
  Purchase Price, and Sale Price fields; the table has a Barcode column; a new
  "Import CSV" button opens the bulk-import modal.
- When filtering the page by a single product, a stat line shows that product's
  `stockPieces` next to the count of serial records matching the current filter — the
  side-by-side "stock vs. serial count" view.

## 9. Backward compatibility

- All schema changes are `ADD COLUMN IF NOT EXISTS` — nothing dropped or renamed.
- `serials: ["SN-1", "SN-2"]` (plain strings) still works everywhere it used to.
- Non-serialized products (`serial_required = false`) never touch any of this code.
- Product-level `barcode` and its generation/printing are untouched.

## Tests

`backend/tests/productSerials.test.js` — 11 tests: creation gating, DB-level duplicate
enforcement (same as before) plus new coverage for barcode auto-generation, manual
barcode + price capture, search by barcode/product name/SKU, POS barcode lookup
(hit and miss), bulk import (happy path + in-batch duplicate rejection, partial-failure
isolation), and purchase-receive capturing per-unit barcode/price with correct
fallback to the line's purchase price.

Full regression after these changes: 24/24 passing across `productSerials.test.js`,
`purchaseReceive.test.js`, and `salesInvoices.test.js`.

## Why extend, not rebuild

The original request specified a fresh `ProductSerial` entity, Prisma models, and NestJS
services/controllers. This codebase runs Express + raw SQL with a
repository/service/controller layering, and already had a working, tested
serial/IMEI system (`product_serials`) covering creation, duplicate prevention, sale
consumption with double-sell prevention, and returns. Building a second, parallel
entity would have meant two overlapping serial-tracking systems in the same app.
Everything above extends the existing one instead: real gaps (per-unit barcode, per-unit
pricing, CSV import, fuller search, barcode-scan-to-serial at the point of sale) were
closed; everything that already worked was left alone.
