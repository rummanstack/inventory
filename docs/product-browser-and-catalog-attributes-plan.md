# Product Browser + Flexible Electronics Catalog — Implementation Plan

## Goal

Two concrete, connected requirements:

1. **In-shop Product Browser**: a customer-facing view (tablet/kiosk in the store) where a shopper can search, filter, view details, and **compare** products side by side, then decide. Staff can push the chosen product into the existing Quick Sale flow via a single "Add to Current Sale" action.
2. **Diverse electronics catalog**: the shop sells everything from TVs and Fridges to Laptops, Mice, Irons, Ovens, and Fans — categories with completely different spec sheets (screen size vs. cooling capacity vs. RAM vs. wattage). The catalog must support this **without a schema migration every time a new category shows up**.

Hard constraint carried over from the original architecture brief: **the Browser must never write to inventory or invoices.** The only write path is "Add to Current Sale," which goes through the existing Quick Sale save flow untouched.

---

## Current state (verified against the code, 2026-07-19)

- `products` ([backend/db/schema.js:99](backend/db/schema.js#L99), plus accumulated `ALTER TABLE`s through line ~2270) already has `sku`, `barcode`, `brand`, `model` (free text, not FK'd), `warranty_months`, `status`, `description`, and a **single** `image_url` string. There is **no JSONB/specs column and no per-category attribute concept anywhere.**
- `categories` ([backend/db/schema.js:980](backend/db/schema.js#L980)) is flat (no hierarchy) and carries no metadata about which fields apply to a category.
- `manufacturers` ([backend/db/schema.js:1473](backend/db/schema.js#L1473)) is pharmacy-only in practice (`dgda_license` column, gated behind `isPharmacy` in `ProductsPage.jsx` and `requireFeature("batch-tracking")` on its router). Electronics brand data lives in the free-text `products.brand` column plus a simple `brands` lookup table — that pattern is fine and doesn't need to change.
- `ProductFormModal.jsx` ([frontend/src/features/products/components/ProductFormModal.jsx](frontend/src/features/products/components/ProductFormModal.jsx)) has one fixed field set that branches only on `tenant.businessType` (electronics vs. pharmacy) — no per-category dynamic fields exist today.
- Product search is `ILIKE '%term%'` on btree indexes only ([backend/repositories/productRepository.js:56](backend/repositories/productRepository.js#L56)) — no trigram/full-text index, so it's not typo-tolerant.
- The shared `productDirectory` used by Quick Sale (`listAllActiveProductsLite`, [backend/repositories/productRepository.js:107](backend/repositories/productRepository.js#L107)) doesn't select `image_url` or `description` — it's a lightweight list for dropdowns, not a browsing payload. **The Browser must not repurpose this** — it needs its own endpoint so Quick Sale's existing payload/behavior is untouched.
- `useSalesInvoiceFormViewModel.js` ([frontend/src/features/retailer/sales-invoices/viewmodels/useSalesInvoiceFormViewModel.js](frontend/src/features/retailer/sales-invoices/viewmodels/useSalesInvoiceFormViewModel.js)) has `addItem()` (adds a blank row, doesn't return its id) and `updateItem(rowId, field, value)` (attaches a product to a row) as two separate steps — there is currently no single "add this specific product" call. This is the exact seam "Add to Current Sale" needs.

---

## Scope decisions

To keep this additive and migration-free going forward, without over-building for a 2–10 customer stage:

| Item | Decision |
|---|---|
| Per-category specs | **`specs JSONB` column on `products`**, not a full EAV table. Schema-less by design — a new category never needs a migration. |
| What fields to show/collect per category | **New `category_attribute_definitions` table** (tenant + category scoped) describing key, label, data type, unit, options. Drives both the product form and the comparison table. This is the minimal version of "Category Attribute Definitions" — no templates, no families, no variants. |
| Multi-image | **New `product_images` table** (ordered list). Replaces the single `image_url` for browsing/gallery use; existing `image_url` is migrated in as the first image. |
| Brands / Manufacturers | **No change.** Keep free-text `brand` + existing `brands` table. Do not touch pharmacy's `manufacturers` table. |
| Search | Enable `pg_trgm`, add a GIN trigram index on `products.name` (and `brand`/`model`) for forgiving in-store search. Purely additive. |
| Categories nesting | **Not doing it.** TV/Fridge/AC/Laptop/Mouse/Iron/Oven/Fan are naturally flat top-level categories; nesting adds complexity with no current need. |
| Variants, warehouses, multi-currency, purchasing overhaul, public catalog | **Explicitly out of scope.** Nothing in this goal requires them; revisit only if a real customer need appears. |

---

## Data model changes

```sql
-- 1. Flexible specs, no future migrations needed per category
ALTER TABLE products ADD COLUMN IF NOT EXISTS specs JSONB NOT NULL DEFAULT '{}';

-- 2. What spec fields exist for a given category, and how to render them
CREATE TABLE IF NOT EXISTS category_attribute_definitions (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id),
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,          -- e.g. "screen_size_inch", "cooling_capacity_ton"
  label       TEXT NOT NULL,          -- e.g. "Screen Size"
  data_type   TEXT NOT NULL DEFAULT 'text',  -- text | number | boolean | select
  unit        TEXT NOT NULL DEFAULT '',      -- e.g. "inch", "ton", "W"
  options     JSONB NOT NULL DEFAULT '[]',   -- for data_type = select
  sort_order  INTEGER NOT NULL DEFAULT 0,
  show_in_comparison BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, category_id, key)
);

-- 3. Multi-image gallery
CREATE TABLE IF NOT EXISTS product_images (
  id         TEXT PRIMARY KEY,
  tenant_id  TEXT NOT NULL REFERENCES tenants(id),
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id, sort_order);

-- backfill existing single image
INSERT INTO product_images (id, tenant_id, product_id, url, sort_order)
SELECT 'pimg-' || md5(p.id), p.tenant_id, p.id, p.image_url, 0
FROM products p
WHERE p.image_url IS NOT NULL AND p.image_url <> '';

-- 4. Forgiving search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
```

`specs` filtering for the browser uses plain JSONB operators, e.g.:
```sql
WHERE p.specs->>'screen_size_inch' IS NOT NULL
  AND (p.specs->>'screen_size_inch')::numeric BETWEEN $1 AND $2
```
No GIN index needed on `specs` at this catalog size (tens/hundreds of SKUs, not millions) — a btree/JSONB scan is fine; add `GIN(specs jsonb_path_ops)` later only if it's ever measured as slow.

> **Reminder** ([[feedback_normalizer_whitelist]]): `normalizeSalesInvoice` in `backend/lib/normalizers.js` whitelists fields. If `specs`/`images` ever need to flow through any normalizer (unlikely for products, but check `productService.saveProduct` validation path), they must be explicitly added or they'll be silently dropped.

---

## Backend changes

1. **`category_attribute_definitions`**: new repository + service + admin CRUD routes (`/categories/:id/attributes`), gated by existing `PERMISSIONS.MANAGE_CATEGORIES` (or a new one if that doesn't exist — verify in `backend/lib/permissions.js`).
2. **`productService.saveProduct`**: accept `specs` (object) and `images` (array of URLs), validate `specs` keys against the category's `category_attribute_definitions` (reject unknown keys or just pass through — recommend passing through permissively at this scale, validate only data types).
3. **New browse endpoint**: `GET /products/browse` — separate from the admin `/products` list. Paginated, filters: `categoryId`, `search` (uses the trigram index), and dynamic `specs.<key>=<value>` / `specs.<key>_min`/`_max` for numeric ranges. Returns `images[]`, `specs`, `description`, `brand`, `model`, `sellingPrice` — no cost/purchase price fields (customer-facing).
4. **New permission** `PERMISSIONS.VIEW_PRODUCT_BROWSER` + **new feature key** `product-browser` (must match the frontend route `id` per the convention in `backend/lib/features.js`). Keeping this separate from `VIEW_PRODUCTS` lets a tenant hand a kiosk-only role browse access without full admin product management.
5. Route gating pattern to follow (from `backend/routes/products.routes.js`):
   ```js
   router.use(requireFeature("product-browser"));
   router.get("/", requirePermission(PERMISSIONS.VIEW_PRODUCT_BROWSER), controller.browse);
   ```

---

## Frontend changes

1. **`ProductFormModal.jsx`**: after category is selected, fetch `category_attribute_definitions` for that category and render dynamic fields (text/number/boolean/select) below the existing fixed fields. Store values into `specs`.
2. **`CategoriesManagerModal.jsx`** (or a new small admin panel): let an admin define/edit attribute definitions per category (key, label, type, unit, options).
3. **New route group `kiosk`** in `frontend/src/app/routes.js`:
   ```js
   { id: 'product-browser', path: '/browse', labelKey: 'nav.productBrowser', icon: LayoutGrid,
     component: ProductBrowserPage, group: 'kiosk', permission: 'view_product_browser', feature: 'product-browser' }
   ```
4. **`ProductBrowserPage.jsx`** (new, under `frontend/src/features/product-browser/`): search bar (mirror the `/`-focus convention from `QuickSalePage.jsx`), category filter, dynamic spec filters (driven by the selected category's attribute definitions), grid/list toggle (reuse the `localStorage` pattern from `ProductsPage.jsx`).
5. **Product detail view**: image gallery (from `product_images`), full spec table, description.
6. **Comparison tray**: let the shopper select up to ~4 products (checkbox on each card) → side-by-side table using each category's `category_attribute_definitions` (union of specs across selected products, blank cells where not applicable).
7. **"Add to Current Sale"**: add `addProductDirectly(product)` to `useSalesInvoiceFormViewModel.js` that combines `addItem()` + `updateItem(rowId, 'productId', product.id)` in one call and returns the row id. From the Browser, stash the chosen product id in `sessionStorage` (tenant-scoped key) and navigate to `/retailer/quick-sale`; `QuickSalePage` reads it once on mount (after `vm` is ready), calls `addProductDirectly`, then clears the stashed value. This keeps the Browser fully decoupled from Quick Sale's internal state — it only ever writes to a pending-selection slot, never to inventory or invoice endpoints directly.

---

## Explicit non-goals (deferred until a real customer asks)

- Nested categories, product variants/families/templates, warehouses, multi-location inventory, multi-currency pricing, purchasing module overhaul, public/SEO catalog. None of these are required to satisfy "browse, compare, add to sale" or "sell any electronics category without a migration." Building them now would be scope creep against the PMF stage (2→10 customers).

---

## Rollout order (small, reviewable steps)

1. Migration: `specs` column, `category_attribute_definitions` table, `product_images` table + backfill, `pg_trgm` + trigram index.
2. Backend: attribute-definitions CRUD + `productService.saveProduct` accepting `specs`/`images`.
3. Frontend: dynamic spec fields in `ProductFormModal.jsx` + an admin UI to define per-category attributes.
4. Backend: `/products/browse` endpoint + new permission/feature.
5. Frontend: `ProductBrowserPage.jsx` (search/filter/detail) — no write actions yet, verify it's fully read-only first.
6. Frontend: comparison tray.
7. Frontend + backend: `addProductDirectly` + pending-selection handoff into `QuickSalePage.jsx`. Test that Quick Sale's existing manual add-product flow still works unchanged.
8. Backend tests (real dev DB, per project convention): browse endpoint filtering/pagination, attribute-definition CRUD, `saveProduct` with specs.
9. Manual walkthrough on a tablet-sized viewport: search → filter by spec → compare → add to sale → complete a real Quick Sale.
