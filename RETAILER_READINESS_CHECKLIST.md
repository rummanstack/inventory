# Retailer Readiness Checklist

This project is usable for a small retailer or retailer-distributor workflow, but it is not a complete POS-first retail platform yet.

## What Is Already Covered

### Core Sales Flow

- Quick sale
- Retail sale
- Wholesale sale
- Due sale for registered customers
- Sales invoice numbering
- Sales invoice list, view, trash, restore

### Customer And Collection Flow

- Retail customer records
- Customer due tracking
- Due collection
- Edit, delete, restore customer payment records
- Customer statement and due reports

### Returns

- Sales returns linked to original invoice items
- Return quantity validation against sold quantity
- Stock reversal on return
- Customer due adjustment on return

### Reporting

- Daily sales reports
- Profit reports
- Retailer profit reports
- Due collection reports

### Inventory Support

- Product directory
- Stock balance tracking
- Stock movements
- Opening stock
- Damaged stock handling

### Basic Controls

- Permissions
- Tenant features
- Audit logs
- Trash / soft delete
- Session-based authentication

## Good Enough For A Small Retailer

This is a good fit if the business:

- sells from one main counter or a small number of counters
- tracks stock centrally, not by warehouse/bin
- accepts basic cash and due payments
- issues invoices manually through the app
- does not need barcode POS hardware integration
- does not need tax automation
- does not need advanced loyalty or promo rules

## Gaps Before Real Retail Go-Live

These are the features you should add before calling it production-ready for a busy retailer.

### Must-Have

- Receipt printing optimized for retail counters
- Tax / VAT / GST support
- Shift open and shift close
- Cash drawer reconciliation
- Refund / exchange workflow
- Promotion and discount rules
- Multi-branch stock separation
- Better stock reservation during sales

### Why These Are Must-Have

- Receipt printing optimized for retail counters:
  - Retail stores usually need a clean customer receipt immediately after payment.
  - The print layout should be short, readable, and ready for thermal printers.
  - Without this, staff end up using screenshots or long generic reports, which is not practical.

- Tax / VAT / GST support:
  - Retail businesses usually need taxes shown clearly on invoices and summaries.
  - Tax reporting becomes a legal and accounting requirement in many cases.
  - If this is missing, the sales workflow may still work, but the business reporting will be incomplete.

- Shift open and shift close:
  - Counter staff need a daily opening and closing process.
  - This helps track who handled sales during a given time window.
  - It also supports reconciliation of cash at the end of the shift.

- Cash drawer reconciliation:
  - Retailers need to compare expected cash with actual cash.
  - This catches short/over cash situations quickly.
  - It is one of the most important controls in a physical retail counter.

- Refund / exchange workflow:
  - Retail customers often return or exchange items, not just create formal sales returns.
  - The workflow should handle price differences, stock reversals, and customer adjustments cleanly.
  - If this is missing, staff will work around the system manually.

- Promotion and discount rules:
  - Retail businesses often use discounts, bundle deals, and seasonal offers.
  - A hardcoded discount field is not enough once the store starts running campaigns.
  - Rules should be configurable so staff do not manually compute every offer.

- Multi-branch stock separation:
  - If a retailer has more than one shop or counter, stock cannot be treated as one shared pool.
  - Each branch needs its own available quantity, transfers, and local reporting.
  - Without this, stock accuracy breaks down very quickly.

- Better stock reservation during sales:
  - When a sale is being prepared, the system should reserve the stock before final commit.
  - This avoids two users selling the same last item at the same time.
  - It matters more as concurrent usage increases.

### Barcode Scanning

- Not required for your immediate setup if you do not have barcode hardware.
- You can run the retailer flow with search-based product selection for now.
- Add barcode scanning later when the store has the scanner, label printer, and a high enough counter volume to justify it.

### Strongly Recommended

- Sales hold / suspended cart flow
- Customer loyalty points or basic loyalty tiers
- Product variants such as size, color, or pack type
- Batch / serial / expiry tracking for applicable products
- Stock count and stock reconciliation screens
- Better audit trail for price overrides and manual discounts
- Role-based approval for sensitive actions

### Nice To Have Later

- Purchase order workflow
- Supplier quotation comparison
- Reorder automation
- SMS or WhatsApp invoice sharing
- Integrated analytics dashboard for store managers
- Customer segmentation
- Gift cards or store credit

## Verdict

For a small retailer:

- Yes, this can be used today.
- It is practical for a simple retail operation with due collection and basic inventory.

For a larger retail business:

- Not yet.
- The missing POS, tax, shift, and warehouse controls become important quickly.

## Suggested Next Priorities

1. Add barcode and faster POS entry
2. Add shift close and cash reconciliation
3. Add tax/VAT support
4. Add refund/exchange flow
5. Add multi-branch inventory support

If those five are in place, the system becomes much closer to a real retail-ready platform.

## What You Need Now vs Later

### Needed Now

- Receipt printing optimized for retail counters
- Shift open and shift close
- Cash drawer reconciliation
- Refund / exchange workflow
- Tax / VAT / GST support if your business is required to show tax on bills
- Better stock reservation during sales

### Can Wait For Now

- Barcode scanning support
- Multi-branch stock separation
- Promotion and discount rules engine
- Sales hold / suspended cart flow
- Loyalty points or customer tiers
- Batch / serial / expiry tracking unless your products need it
- Purchase order workflow
- Supplier quotation comparison
- Reorder automation
- SMS or WhatsApp invoice sharing
- Advanced store analytics

### Depends On Your Business

- Tax / VAT / GST support
  - Needed if your billing and reporting rules require it.
  - Can wait only if your current legal and accounting setup does not require tax breakdowns yet.

- Refund / exchange workflow
  - Needed if customers frequently exchange products instead of doing formal returns.
  - Can wait if your retailer model rarely handles exchanges.

- Multi-branch stock separation
  - Needed only if you have more than one outlet, counter, or store location.
  - Not necessary for a single-shop setup.

- Better stock reservation during sales
  - Important if multiple staff members sell from the same inventory at the same time.
  - Less urgent if only one person handles sales at a time.
