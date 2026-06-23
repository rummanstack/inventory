# Electronics Shop Readiness Review

## Summary

The electronics-specific features are mostly implemented, but I would not present the project as fully safe for an electronics shop without a few fixes. The biggest risks are serial lifecycle handling, warranty validation, and some print/date consistency issues.

## Must Fix Before Selling

1. Sale trash/restore does not restore serial state.
   - Sale creation marks serials as `SOLD`.
   - Deleting or restoring the invoice reverses stock and money, but does not move serials back to `IN_STOCK`.
   - Result: a trashed/restored sale can leave serials stuck as sold.
   - References:
     - `backend/services/salesInvoiceService.js:229`
     - `backend/services/salesInvoiceService.js:581`
     - `backend/services/salesInvoiceService.js:691`

2. Purchase edit/delete/restore does not reconcile serial inventory.
   - Purchase creation inserts serial rows for serial-required products.
   - Updating, deleting, or restoring a purchase changes stock and ledger values, but does not rebuild or reverse serial rows.
   - Result: phantom or stale serial records can remain after purchase edits.
   - References:
     - `backend/services/purchaseReceiveService.js:158`
     - `backend/services/purchaseReceiveService.js:416`
     - `backend/services/purchaseReceiveService.js:591`
     - `backend/services/purchaseReceiveService.js:691`

3. Warranty claims can be created too loosely.
   - The claim flow checks that the serial exists and matches the product.
   - It does not clearly verify that the item was actually sold, or that the warranty is still valid.
   - Result: claims can be opened for records that should not qualify.
   - References:
     - `backend/services/warrantyClaimService.js:76`
     - `backend/services/warrantyClaimService.js:99`
     - `backend/services/warrantyClaimService.js:111`

4. Warranty date printing has a timezone risk.
   - The frontend computes dates using local midnight and then calls `toISOString()`.
   - In time zones like Asia/Dhaka, this can shift the displayed date by one day.
   - Result: printed warranty end dates may be misleading.
   - References:
     - `frontend/src/services/receiptService.js:4`
     - `frontend/src/features/retailer/sales-invoices/components/SalesInvoiceViewModal.jsx:22`
     - `frontend/src/features/retailer/sales-invoices/components/SalesInvoicePrintSheet.jsx:5`

5. Customer snapshot fields are not fully aligned with the sale form.
   - The backend stores `customerNameSnapshot` and `customerPhoneSnapshot`.
   - The sales form payload does not send these values explicitly.
   - The UI shows live customer name, while print can fall back to snapshot values.
   - Result: reprints and screen display can disagree after customer edits.
   - References:
     - `frontend/src/features/retailer/sales-invoices/viewmodels/useSalesInvoiceFormViewModel.js:408`
     - `backend/lib/normalizers.js:377`
     - `frontend/src/features/retailer/sales-invoices/components/SalesInvoiceViewModal.jsx:66`
     - `frontend/src/features/retailer/sales-invoices/components/SalesInvoicePrintSheet.jsx:19`

6. Duplicate protection is application-level only.
   - SKU, barcode, and serial fields are indexed, but not protected by unique constraints.
   - Concurrent requests can still create duplicates.
   - References:
     - `backend/db/schema.js:1058`
     - `backend/db/schema.js:1068`
     - `backend/db/schema.js:1104`
     - `backend/services/productSerialService.js:67`

7. Serial creation is not restricted to serial-required products.
   - The API checks that the product exists, but not that `serialRequired` is true.
   - Result: backend callers can bypass the UI restriction.
   - Reference:
     - `backend/services/productSerialService.js:72`

## What Looks Good

1. Product records support the electronics fields:
   - SKU
   - barcode
   - brand
   - model
   - warranty months
   - serial-required flag

2. Sale entry enforces serial selection for serial-required products.

3. Walk-in due is blocked.

4. Purchase receive captures serials on initial stock-in.

5. Serial and warranty management pages exist.

6. Invoice printing already shows:
   - brand/model
   - serials
   - warranty text

7. Sales returns already handle serial-linked returns.

## Verification Gap

I could not run the test suite or frontend build in this environment because the sandbox blocked spawned processes with `EPERM`. This review is based on code inspection only.

## Recommended Seller Positioning

- Safe to demo: yes
- Safe to sell as a full electronics-shop solution today: not yet
- Safe if you disclose current limits: yes, if you are transparent about the items above

## Useful Command

To read this file in PowerShell:

```powershell
Get-Content .\electronics-shop-review.md
```
