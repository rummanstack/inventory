# Retailer Gap Audit

This codebase already covers the core retailer flow:

- Quick sale and manual sales invoices
- Customer due tracking and due collection
- Sales returns with refund/due-adjustment handling
- Retail cash sessions with opening cash, expected cash, counted cash, and variance
- Receipt printing
- Tax support at tenant and product level
- Product refundable flag
- Basic retail promotions with item/category targeting

That is enough for a small shop or a simple counter-based retail workflow.

## Must Have Before Calling It Real-World Retail Ready

### 1. Barcode-first item entry
I did not find barcode or PLU support in the product model or POS UI.

- `backend/db/schema.js:81-90` has no barcode field on `products`
- `backend/repositories/productRepository.js:92-140` does not store or search by barcode
- `frontend/src/features/retailer/sales-invoices/components/SalesInvoiceFormFields.jsx:52-96` only allows manual product selection

Why it matters:

- Real retail counters usually scan products instead of searching dropdowns
- This is a major speed gap for busy checkout lanes

### 2. Split payment / multi-tender checkout
I only found a single `paymentMethod` and a single `paidAmount` per invoice.

- `frontend/src/features/retailer/sales-invoices/components/SalesInvoiceFormFields.jsx:141-169`
- `frontend/src/features/retailer/sales-invoices/viewmodels/useSalesInvoiceFormViewModel.js:104-106, 234-236, 335-358`
- `backend/services/salesInvoiceService.js:283-325`

What is missing:

- Cash + card on the same sale
- Cash + mobile banking on the same sale
- Partial tender allocation and settlement breakdown

### 3. Exchange workflow
Sales returns exist, but the flow is return/refund only.

- `backend/services/salesReturnService.js:30-232`

What is missing:

- Exchange one item for another in the same transaction
- Price-difference handling for exchange
- Return-to-stock + replacement sale as one workflow

### 4. Manager approval / override controls
The current UI lets the cashier edit sale price, line discount, invoice discount, and return/refund choices directly.

- `frontend/src/features/retailer/sales-invoices/components/SalesInvoiceFormFields.jsx:79-153`
- `frontend/src/features/retailer/sales-invoices/viewmodels/useSalesInvoiceFormViewModel.js:181-197, 238-333`
- `backend/services/salesInvoiceService.js:221-285`

What is missing:

- Approval required when discount exceeds threshold
- Approval required when price goes below cost or below floor price
- Manager PIN / supervisor override

### 5. Cashier shift discipline
Cash sessions exist, but they are still a light session tracker, not a full cashier shift system.

- `backend/services/retailCashSessionService.js:40-145`
- `frontend/src/features/retailer/quick-sale/pages/QuickSalePage.jsx:211-487`

What is missing:

- Explicit cashier assignment per session
- Session handover between employees
- Till close checklist
- Cash-add / cash-remove entries inside a session
- Shift-level audit summary by cashier

### 6. Receipt hardware workflow
Receipt printing exists, but it is browser-print based.

- `frontend/src/services/receiptService.js:76-336`
- `frontend/src/features/retailer/quick-sale/pages/QuickSalePage.jsx:156-185`

What is missing:

- Thermal printer profile selection
- Direct printer device integration
- Cash drawer pulse support
- Reprint from invoice list with printer choice

### 7. Promotion depth
Promotion support exists, but only for line-level discounting.

- `frontend/src/features/retailer/promotions/pages/RetailPromotionsPage.jsx:8-24, 26-213`
- `backend/repositories/retailPromotionRepository.js:1-117`
- `backend/services/salesInvoiceService.js:91-115, 245-271`

What is missing:

- Coupon codes
- Buy X get Y
- Bundle pricing
- Invoice-level promotions
- Customer-specific promotions
- Loyalty price rules

### 8. Loyalty / member sales
I did not find any loyalty or points ledger for retail customers.

What is missing:

- Points accrual and redemption
- Member tiers
- Customer-specific pricing history
- Birthday / anniversary offers

### 9. Retail product lookup speed features
The current flow is correct, but not optimized for high-volume checkout.

- `frontend/src/features/retailer/sales-invoices/components/SalesInvoiceFormFields.jsx:52-96`
- `frontend/src/features/retailer/sales-invoices/viewmodels/useSalesInvoiceFormViewModel.js:138-210`

What is missing:

- Search-as-you-type product picker
- Recent items / favorites
- Keyboard shortcut driven checkout
- Default quantity hotkeys

## Should Have Soon

### Tax and VAT UX
Tax support exists, but I did not find a full retail tax workflow that covers:

- Tax-inclusive vs tax-exclusive display
- Tax breakdown visibility rules per role
- Tax reporting screens focused on retail compliance

Relevant code:

- `backend/services/salesInvoiceService.js:118-142`
- `frontend/src/features/retailer/sales-invoices/components/SalesInvoiceFormFields.jsx:125-136`
- `frontend/src/features/products/components/ProductFormModal.jsx:123-127`

### Inventory reservation / hold sale
I did not find a suspend-and-resume sale flow.

What is missing:

- Hold a cart for later completion
- Resume suspended sale on the same terminal or another terminal

### Offline tolerance
Nothing in the retailer flow indicates offline-first checkout or sync recovery.

What is missing:

- Local queue for failed checkout submissions
- Retry / reconciliation after network loss

### Multi-branch retail controls
The system is tenant-based, but I did not find branch/outlet-aware retailer controls in the POS flow.

What is missing:

- Outlet-scoped inventory and sales
- Branch-level cashier/session reporting
- Transfer workflow between outlets

## Assessment

If your goal is a small retailer or a single-store pilot, the current code is already usable.

If your goal is a competitive real-world POS for retail counters, the main gaps are:

1. Barcode scanning
2. Split payment
3. Manager override
4. Better receipt/printer hardware support
5. Deeper promotion rules
6. Loyalty/membership
7. Full cashier shift management
8. Exchange workflow

Those are the highest-value additions before saying the retailer module is production-complete.
