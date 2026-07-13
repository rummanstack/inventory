# StockLedger Retailer Feature Test Cases

**Date:** 2026-07-13

## Automated Commands

```bash
npm run test:retailer-check
```

> **Coverage note (updated 2026-07-13):** `test:retailer-check` now runs 22 test files (the `--check-files` flag was previously dead code — it parsed the argument but never acted on it, silently running the full suite instead; this is now fixed and safe to use for a dry-run file-existence check). `tenantIsolation.test.js`, `permissionFixes.test.js`, `journal.test.js`, and `financialReporting.test.js` are now wired into the chain (see TC-RTL-CROSS-001/002/003). Two new files close previous gaps: `customerDueLedger.test.js` (TC-RTL-DUE-001 statement coverage) and `dailySalesReport.test.js` (TC-RTL-REPORT-001). `retailCustomers.test.js` was extended with REPEAT/LOYAL/VIP tier and inactive-window tests (TC-RTL-CUST-002) — reward-ready segmentation is still not covered, since loyalty must be enabled at tenant creation and isn't reachable through any endpoint the test fixtures use. `financeAccounts.test.js` and `profitReport.test.js` were extended while auditing the dealer test suite (both files are shared between `test:dealer-check` and `test:retailer-check`) to cover Transfers/Bank accounts and Expenses-in-profit respectively; `profitReport.test.js` now also has a dedicated retail-sale + expense scenario matching TC-RTL-PROFIT-001's literal steps. `accountingFoundation.test.js` is the one remaining test file not wired into either check script.

## Frontend Build

```bash
npm --prefix frontend run build
```

## Database Requirement

> Use a disposable local or dedicated PostgreSQL test database in `backend/.env` as `DEV_DATABASE_URL`.
>
> **Do not run retailer automation against a production/shared Supabase pooler database.**

---

# 1. Inventory Core

## TC-RTL-INV-001 - Products: Create and Edit Product

### Steps

1. Create a product with category, pieces per case, purchase price, wholesale price, retail price, and reorder level.
2. Edit normal product fields.
3. Attempt to update `stockPieces` directly.

### Expected Result

- Product is created and listed.
- Normal fields update correctly.
- Direct stock mutation is rejected.

### Automation

- Covered by `backend/tests/products.test.js`.

---

## TC-RTL-INV-002 - Stock Movement and Add Stock

### Steps

1. Create a product.
2. Add stock with a note/reason.
3. Open stock movements for the product.

### Expected Result

- Product stock increases.
- A `MANUAL_ADJUSTMENT` stock movement is recorded.
- Balance after movement is correct.

### Automation

- Covered by `backend/tests/products.test.js`.

---

## TC-RTL-INV-003 - Low Stock Alerts

### Steps

1. Create one product below reorder level.
2. Create one product above reorder level.
3. Open Low Stock Alerts.

### Expected Result

- Only below-threshold products appear.
- Reorder-level fallback logic works when no explicit reorder level is set.

### Automation

- Covered by `backend/tests/products.test.js`.

---

## TC-RTL-INV-004 - Product Serials / IMEI

### Steps

1. Create a serial-required product.
2. Add a serial/IMEI.
3. Attempt duplicate serial/IMEI values.
4. Attempt to add a serial to a non-serial product.

### Expected Result

- Valid serial/IMEI is accepted.
- Duplicate serial/IMEI is rejected.
- Non-serial products cannot receive serial records.

### Automation

- Covered by `backend/tests/productSerials.test.js`.

---

# 2. Retail Customers

## TC-RTL-CUST-001 - Retail Customer CRUD

### Steps

1. Create a retail customer with name, phone, and address/profile fields.
2. Fetch and list customers.
3. Edit the customer.
4. Delete, restore, and permanently delete from trash.

### Expected Result

- Customer lifecycle works correctly.
- Deleted customers move to trash and are hidden from active list.
- Restored customers return to active list.
- Permanent delete removes the trashed customer.

### Automation

- Covered by `backend/tests/retailCustomers.test.js`.

---

## TC-RTL-CUST-002 - Retail Customer Retention

### Steps

1. Create a customer with no purchase history.
2. Open retention insights.
3. Create repeat purchase history and re-check retention groups.

### Expected Result

- New customers are classified correctly.
- Repeat, inactive, reward-ready, and purchase summary values are correct.

### Automation

- **Mostly covered now.** `backend/tests/retailCustomers.test.js` verifies a new customer with no purchase history, plus (as of 2026-07-13): REPEAT tier from 2 purchases with correct `purchaseCount`/`totalSpent`/`firstPurchaseAt`/`lastPurchaseAt`; LOYAL and VIP tiers from total spend thresholds (`>= 25000` / `>= 100000`) even at `purchaseCount` 1; and the inactive-window flag (default 30 days, with an explicit wider window excluding the same customer). **Reward-ready segmentation is still not covered** — `pointsToNextReward` only moves off its default of 100 when `loyalty_points_balance` is nonzero, which requires the tenant's `loyaltyEnabled` flag to be true. That flag is only settable via `TenantService.createTenant`/`updateTenant` fields, not through any endpoint reachable from the standard `createTenantAndAdmin` test fixture — testing it would require either extending the fixture or writing to the tenant row directly.

---

# 3. Retail Sales

## TC-RTL-SALE-001 - Quick Sale / POS Walk-In Sale

### Steps

1. Create product with stock.
2. Submit a walk-in quick sale.
3. Attempt a quick sale with due amount.

### Expected Result

- Quick sale completes successfully when fully paid.
- Stock decreases.
- Sale movement is recorded.
- Walk-in quick sale with due amount is rejected.

### Automation

- Covered by `backend/tests/quickSale.test.js`.

---

## TC-RTL-SALE-002 - Registered Sales Invoice with Due

### Steps

1. Create retail customer.
2. Create product with stock.
3. Create a registered sales invoice with partial payment / due.
4. Open customer due ledger.

### Expected Result

- Stock decreases.
- `SALE` stock movement is recorded.
- Customer due ledger receives the unpaid amount.
- Invoice status and totals are correct.

### Automation

- Covered by `backend/tests/salesInvoices.test.js`.

---

## TC-RTL-SALE-003 - Retail Promotion Applied to Sale

### Steps

1. Create active retail promotion.
2. Create sale inside active date range.
3. Create another sale outside the active date range.

### Expected Result

- Active promotion reduces sale price correctly.
- Inactive/out-of-range promotion is ignored.

### Automation

- Covered by `backend/tests/salesInvoices.test.js` and `backend/tests/retailPromotions.test.js`.

---

## TC-RTL-SALE-004 - Serial Product Sale

### Steps

1. Create serial-required product and serial/IMEI stock.
2. Sell the serial product.
3. Delete/trash and restore the invoice.

### Expected Result

- Sold serial changes to `SOLD`.
- Trashing invoice restores serial to `IN_STOCK`.
- Restoring invoice marks serial as `SOLD` again.

### Automation

- Covered by `backend/tests/salesInvoices.test.js`.

---

## TC-RTL-SALE-005 - Insufficient Stock Rejection

### Steps

1. Create product with limited stock.
2. Attempt to sell more than available stock.

### Expected Result

- Sale is rejected.
- Stock, customer due, finance account, and serial state remain unchanged.

### Automation

- Covered by `backend/tests/salesInvoices.test.js` and `backend/tests/tradeIns.test.js` for related stock rejection paths.

---

# 4. Sales Returns

## TC-RTL-RET-001 - Return Against Original Invoice

### Steps

1. Create sales invoice.
2. Return an item from that invoice.
3. Attempt to return an item not present on the invoice.

### Expected Result

- Valid return is accepted.
- Stock is restored.
- Customer due/refund impact is correct.
- Returning an unrelated item is rejected.

### Automation

- Covered by `backend/tests/salesReturns.test.js`.

---

## TC-RTL-RET-002 - Refund and Cumulative Return Limits

### Steps

1. Create a fully paid invoice.
2. Return part of it with cash refund.
3. Attempt cumulative return beyond sold quantity.
4. Attempt exact remaining quantity.

### Expected Result

- Cash refund withdraws from cash account.
- Return quantity cannot exceed originally sold quantity.
- Exact remaining quantity succeeds.

### Automation

- Covered by `backend/tests/salesReturns.test.js`.

---

# 5. Customer Due and Collection

## TC-RTL-DUE-001 - Customer Due Ledger

### Steps

1. Create registered customer sale with due.
2. Open customer due statement / ledger.
3. Verify opening, debit, credit, and running balance.

### Expected Result

- Sale due appears as customer receivable.
- Running balance matches invoice unpaid amount.

### Automation

- Covered by the new `backend/tests/customerDueLedger.test.js` (2026-07-13): a credit sale followed by a partial payment produces a statement with matching opening balance, closing balance, `totalDebit`/`totalCredit`, and entry count; a date range excluding all activity shows just the carried-forward opening balance; tenant isolation on both `/balance` and `/statement`. Note: unlike shops/suppliers, retail customers have no `openingDue` field at all (`normalizeRetailCustomer` doesn't accept one) — due only ever originates from a sales invoice, so the opening-balance-vs-ledger quirk documented on TC-SHOP-002 in `DEALER.md` doesn't apply here.

---

## TC-RTL-DUE-002 - Customer Due Collection

### Steps

1. Create customer with due balance.
2. Record payment within due balance.
3. Attempt overpayment.
4. Record exact due amount.

### Expected Result

- Valid payment deposits cash and reduces due.
- Overpayment is rejected.
- Exact-balance payment is accepted.

### Automation

- Covered by `backend/tests/customerPayments.test.js`.

---

# 6. Retail Promotions

## TC-RTL-PROMO-001 - Retail Promotion CRUD

### Steps

1. Create promotion with target product/category/all.
2. Edit promotion.
3. List active promotions.
4. Delete promotion.

### Expected Result

- Promotion lifecycle works.
- Invalid name/discount is rejected.
- Tenant cannot access another tenant's promotion.

### Automation

- Covered by `backend/tests/retailPromotions.test.js`.

---

# 7. Cash Sessions and Daily Sales

## TC-RTL-CASH-001 - Cash Session Start/Stop

### Steps

1. Start cash session.
2. Attempt to start a second active session.
3. Create cash sale inside session window.
4. Stop session with counted cash.

### Expected Result

- Only one active session is allowed.
- Expected cash includes cash sales during the session window.
- Variance is counted minus expected cash.
- Stopped session cannot be stopped again.

### Automation

- Covered by `backend/tests/cashSessions.test.js`.

---

## TC-RTL-REPORT-001 - Daily Sales Report

### Steps

1. Create sales invoices across dates and sale types.
2. Open Daily Sales Report.
3. Filter by date range and sale type.
4. Export/print if required.

### Expected Result

- Invoice count, total amount, paid amount, due amount, tax, and profit are correct per date.
- Sale type filter works.
- Export/print does not crash.

### Automation

- Covered by the new `backend/tests/dailySalesReport.test.js` (2026-07-13), testing `/api/sales-invoices/reports/daily`: per-date aggregation of invoice count/total/paid/due/profit across multiple same-day invoices, the `saleType` filter (QUICK_SALE vs. WHOLESALE), a date range excluding a sale date, and tenant isolation. Export/print (frontend-only behavior) is still not covered by a backend test — that remains a manual/frontend check.

---

# 8. Quotations

## TC-RTL-QUOTE-001 - Quotation Lifecycle

### Steps

1. Create quotation as draft.
2. Update quotation.
3. Reject quotation.
4. Attempt to edit rejected quotation.
5. Delete quotation to trash.

### Expected Result

- Draft quotation can be created and edited.
- Rejected quotation is closed and cannot be edited.
- Deleted quotation appears in trash.

### Automation

- Covered by `backend/tests/quotations.test.js`.

---

## TC-RTL-QUOTE-002 - Convert Quotation to Invoice

### Steps

1. Create quotation with available stock.
2. Convert quotation to invoice.
3. Attempt conversion when stock is no longer enough.

### Expected Result

- Successful conversion deducts stock and marks quotation as `CONVERTED`.
- Insufficient stock blocks conversion.

### Automation

- Covered by `backend/tests/quotations.test.js`.

---

# 9. Warranty and Repair

## TC-RTL-WAR-001 - Warranty Claim

### Steps

1. Sell a serial-required product with warranty period.
2. Create warranty claim for the sold serial.
3. Attempt claim for unsold serial.
4. Attempt claim after warranty expiry.

### Expected Result

- Valid sold serial within warranty period can create a claim.
- Unsold serial is rejected.
- Expired warranty is rejected.
- Serial-required claim requires serial/IMEI selection.

### Automation

- Covered by `backend/tests/warrantyClaims.test.js`.

---

## TC-RTL-REPAIR-001 - Repair Job Lifecycle

### Steps

1. Create repair job with customer, problem, and received date.
2. Move job through repair stages.
3. Deliver or cancel job.
4. Attempt edit after closed status.
5. Search/list by status and move to trash.

### Expected Result

- Repair job lifecycle works.
- Delivered/cancelled jobs cannot be edited further.
- Search/status filters work.
- Tenant isolation is enforced.

### Automation

- Covered by `backend/tests/repairJobs.test.js`.

---

# 10. Trade-Ins

## TC-RTL-TRADEIN-001 - Trade-In Sale

### Steps

1. Create product being sold with stock.
2. Create received trade-in item.
3. Submit trade-in where customer pays the difference.
4. Submit trade-in where refund is owed.
5. Attempt trade-in when sold item has insufficient stock.

### Expected Result

- Sold stock decreases.
- Received trade-in stock/value is recorded.
- Customer payment deposits cash when sale exceeds trade-in value.
- Refund withdraws cash when trade-in value exceeds sale amount.
- Insufficient stock rejects the whole trade-in without partial writes.

### Automation

- Covered by `backend/tests/tradeIns.test.js`.

---

# 11. Finance and Profit

## TC-RTL-FIN-001 - Finance Accounts

### Steps

1. Deposit cash.
2. Withdraw cash.
3. Attempt over-withdrawal.
4. Transfer between cash and bank.

### Expected Result

- Balances update correctly.
- Over-withdrawal is rejected.
- Transfer moves money between accounts without changing total cash position.

### Automation

- Covered by `backend/tests/financeAccounts.test.js` (deposits, withdrawals, insufficient balance, exact-balance withdrawal for CASH — plus, as of 2026-07-13, a Bank-account deposit isolated from Cash, a Cash→Bank transfer asserting both legs' balances and both `TRANSFER_OUT`/`TRANSFER_IN` ledger rows, an over-balance transfer rejection, and a same-account-type transfer rejection). This file is part of `test:retailer-check`, so Bank/Transfer coverage now applies here too — this note was stale until this update (the Bank/Transfer tests were added while auditing the dealer test suite, since `financeAccounts.test.js` is shared between both).

---

## TC-RTL-EXP-001 - Expenses

### Steps

1. Fund cash account.
2. Create expense.
3. Edit expense with reason.
4. Delete and restore expense.
5. Permanently delete trashed expense.

### Expected Result

- Expense withdraws cash.
- Edit adjusts cash by delta.
- Delete deposits cash back.
- Restore withdraws cash again.
- Permanent delete removes trashed record.

### Automation

- Covered by `backend/tests/expenses.test.js`.

---

## TC-RTL-PROFIT-001 - Profit Report

### Steps

1. Create product with purchase cost.
2. Create retail sale.
3. Create expense in same period.
4. Open profit report by customer/product/category and overall report.

### Expected Result

- Gross profit matches sale price minus cost.
- Customer/product breakdowns match source invoices.
- Expenses are deducted in overall profit view.
- Tenant isolation is enforced.

### Automation

- **Improved, but still not the exact retail scenario.** `backend/tests/profitReport.test.js` covers by-customer and by-product retail invoice profit plus tenant isolation, as before. As of 2026-07-13 it also asserts the overall `/api/profit-report` folds **Expenses** into net profit (`revenue`/`cost`/`grossProfit`/`expenses`/`profit` on both the daily row and totals) — but that new test uses a **DSR Settlement** as the revenue source (added while auditing the dealer suite), not a retail sales invoice. Since `profitService.js`'s expense-subtraction logic is identical regardless of revenue source (settlements and retailer sales both feed the same `dailyMap`), this does prove the expense-deduction mechanism works — but there's still no test combining a **retail sale** + expense specifically, so the literal TC-RTL-PROFIT-001 steps aren't exercised end-to-end. `backend/tests/journal.test.js` has profit-and-loss accounting coverage but is not included in `test:retailer-check`.

---

# 12. Cross-Checks

## TC-RTL-CROSS-001 - Tenant Isolation

### Steps

1. Create retailer records in Tenant A.
2. Log in as Tenant B.
3. Attempt to view or modify Tenant A records.

### Expected Result

- Tenant B cannot view Tenant A data.
- Tenant B cannot modify Tenant A data.

### Automation

- Partially covered inside several retailer test files, plus dedicated broad coverage in `backend/tests/tenantIsolation.test.js`, now included in `npm run test:retailer-check`.

---

## TC-RTL-CROSS-002 - Permission and Feature Gates

### Steps

1. Remove retailer permission or feature access.
2. Attempt to access page/API.
3. Restore permission and retry.

### Expected Result

- Unauthorized page/API access is blocked.
- Authorized access works.

### Automation

- Covered by `backend/tests/permissionFixes.test.js`, now included in `npm run test:retailer-check`.

---

## TC-RTL-CROSS-003 - Accounting Journal / Financial Reports

### Steps

1. Create sale, return, expense, payment, and finance transfer.
2. Open General Ledger, Trial Balance, Profit and Loss, Balance Sheet, and Cash Flow.

### Expected Result

- Journal entries are balanced.
- Reports reconcile with source transactions.
- Reversals are correct for deleted/restored records.

### Automation

- Covered by `backend/tests/journal.test.js` and `backend/tests/financialReporting.test.js`, now both included in `npm run test:retailer-check`. `backend/tests/accountingFoundation.test.js` is a related suite still not wired into either check script.

---

## TC-RTL-CROSS-004 - Frontend Build

### Steps

1. Run:

```bash
npm --prefix frontend run build
```

### Expected Result

- Build completes successfully.
- Retailer page bundles/chunks compile successfully.