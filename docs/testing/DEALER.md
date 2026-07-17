# StockLedger Dealer Feature Test Cases

**Date:** 2026-07-13

## Automated Commands

```bash
npm run test:dealer-check
```

> **Coverage note (updated 2026-07-13):** `test:dealer-check` now runs 23 test files. All six gaps previously called out here are closed: `tenantIsolation.test.js`, `permissionFixes.test.js`, and `journal.test.js` are wired into the chain; `shopDueLedger.test.js` and `dsrTargets.test.js` are new; and `financeAccounts.test.js`, `supplierStatement.test.js`, and `profitReport.test.js` were extended to cover Transfers/Bank accounts, Return/Payment/Discount statement lines, and DSR-Settlement revenue + Expenses in the profit report, respectively. A follow-up pass added `TC-SR-003` (settlement SR handovers, previously untested end-to-end) and found + fixed a real bug: settlement-embedded `shopCollections` had no over-collection guard (see TC-SHOP-002's Automation note) — fixed in `backend/services/settlementService.js` and covered by new tests. See each TC's Automation note below for exactly which test(s) cover it, and one remaining known-behavior note on TC-SHOP-002 (opening due vs. statement opening balance) that documents a real product quirk rather than a bug.
>
> **Execution status:** all test files touched in this pass (`shopDueLedger.test.js`, `dsrTargets.test.js`, `srDueLedger.test.js`, `financeAccounts.test.js`, `supplierStatement.test.js`, `profitReport.test.js`, and the `settlementService.js` fix) are syntax-checked (`node --check`) and verified by tracing the actual service/repository/controller code, but have **not yet been executed against a real database** — see the Database Requirement note below. Run `npm run test:dealer-check` after fixing `DEV_DATABASE_URL` to get real pass/fail confirmation.

## Frontend Build

```bash
npm --prefix frontend run build
```

## Database Requirement

> Use a disposable local or dedicated PostgreSQL test database in the repository-root `.env` as `DEV_DATABASE_URL`.
>
> **Do not run dealer automation against a production/shared Supabase pooler database.**
>
> **Known issue as of 2026-07-13:** the root `.env`'s `DEV_DATABASE_URL` was found identical to `DATABASE_URL` (both pointing at the same Supabase pooler) — meaning `npm test` / `test:dealer-check` would run against production until this is fixed. Confirm `DEV_DATABASE_URL` points at a genuinely separate, disposable database before running anything in this document.

---

# 1. Inventory Core

## TC-INV-001 — Products: Create Product

### Steps

1. Create a product with:
   - Category
   - Pieces per Case
   - Purchase Price
   - Wholesale Price
   - Retail Price
   - Reorder Level
2. Fetch the product list.

### Expected Result

- Product is created successfully.
- Product appears in the list.
- All calculated/display fields are correct.

---

## TC-INV-002 — Products: Edit Product Without Direct Stock Mutation

### Steps

1. Create a product.
2. Update normal product fields.
3. Attempt to send `stockPieces` in the update payload.

### Expected Result

- Normal fields update successfully.
- Direct mutation of `stockPieces` is rejected.

---

## TC-INV-003 — Stock Movement: Add Stock

### Steps

1. Create a product.
2. Add stock with a reason.
3. Open Stock Movement for the product.

### Expected Result

- Product stock increases.
- Stock movement contains:
  - `MANUAL_ADJUSTMENT`
  - Quantity In
  - Reference/Note
  - Correct Balance After

---

## TC-INV-004 — Low Stock Alerts

### Steps

1. Create one product below its reorder level.
2. Create another product above its reorder level.
3. Open Low Stock Alerts.

### Expected Result

- Only the below-threshold product appears.

---

## TC-INV-005 — Product Serials

### Steps

1. Create a serial-required product.
2. Add a Serial/IMEI.
3. Attempt to create a duplicate Serial/IMEI.
4. Attempt to add a Serial/IMEI to a non-serial product.

### Expected Result

- Valid Serial/IMEI is accepted.
- Duplicate Serial/IMEI is rejected.
- Non-serial product cannot receive serial entries.

---

## TC-INV-006 — Damaged Stock

### Steps

1. Create a product with stock.
2. Record damaged quantity through Settlement or Damaged Stock.
3. Clear part or all damaged stock.

### Expected Result

- Sellable stock is correct.
- Damaged stock is correct.
- Stock movement/history remains traceable.

---

# 2. DSR and Dealer Field Sales

## TC-DSR-001 — DSR CRUD

### Steps

1. Create a DSR with:
   - Name
   - Phone
   - Area
   - Opening Due
2. Edit the DSR.
3. Search/List DSRs.

### Expected Result

- DSR is created.
- DSR is updated.
- DSR is searchable.
- Opening Due creates a ledger entry.

---

## TC-DSR-002 — DSR Opening Due Change Requires Reason

### Steps

1. Create a DSR with Opening Due.
2. Change Opening Due without a reason.
3. Change Opening Due with a reason.

### Expected Result

- Change without reason is rejected.
- Change with reason updates the Due Ledger correctly.

---

## TC-DSR-003 — Morning Issue

### Steps

1. Create a product with stock.
2. Create a DSR.
3. Create a Morning Issue.

### Expected Result

- Product stock decreases.
- `MORNING_ISSUE` stock movement is created.
- Over-issue is rejected.

---

## TC-DSR-004 — Settlement

### Steps

1. Create a Morning Issue.
2. Settle with:
   - Sold Quantity
   - Returned Quantity
   - Damaged Quantity
   - Cash Collection
   - Discount
   - Due

### Expected Result

- Returned stock returns to inventory.
- Damaged stock updates correctly.
- Finance/Cash balance updates.
- DSR Due Ledger is correct.

---

## TC-DSR-005 — DSR Targets and Monthly Achievement

### Steps

1. Set a monthly target amount for a DSR (`YYYY-MM`).
2. Update the same DSR/month target (upsert).
3. Post one or more Settlements for that DSR within the target month.
4. Open the Monthly Summary for that month.

### Expected Result

- Target is created/updated per DSR per month (`dsr_targets`, unique on tenant+DSR+month).
- Setting targets requires `manage_dsrs`; viewing targets/summary requires `view_state`.
- Monthly Summary shows `actual_amount` as the sum of each settlement's `total_payable - previous_due` for that month, excluding cancelled settlements.
- A DSR with a settlement but no set target still appears (target defaults to 0), and vice versa.

### Automation

- Covered by `backend/tests/dsrTargets.test.js` (validation, upsert-not-duplicate, monthly summary with/without a target or settlement, tenant isolation), now included in `npm run test:dealer-check`.

---

## TC-DSR-006 — DSR Issue/Settlement Journal Entries

### Steps

1. Create a Morning Issue for a DSR.
2. Open the accounting journal and confirm the issue's entry.
3. Settle with a mix of sold/returned/damaged and partial cash collection.
4. Confirm the settlement's journal entry.
5. Edit the settlement and confirm the journal entry is replaced, not duplicated.
6. Record an SR handover for the DSR's due and confirm the receivable moves from DSR to SR.

### Expected Result

- Morning Issue debits "Goods with DSR" (1130) and credits Inventory for the issued cost.
- Settlement recognizes revenue and COGS for sold quantity, clears "Goods with DSR" for sold+returned+damaged cost, and adjusts "DSR Receivable" (1110) for the uncollected payable.
- A settlement discount attributed to a supplier debits Accounts Payable instead of Discounts Given.
- Editing a settlement replaces its journal entry (no stacked/duplicate entries).
- SR handover zeroes out the DSR's receivable and creates the corresponding SR receivable.

### Automation

- Covered by `backend/tests/journal.test.js`, now included in `npm run test:dealer-check`.

---

# 3. Shops, Customers, and SRs

## TC-SHOP-001 — Customer/Shop CRUD

### Steps

1. Create a Shop/Customer with:
   - Owner
   - Phone
   - Area/Market
   - Opening Due
   - Assigned DSR
2. Edit the Shop.
3. Search/List.

### Expected Result

- Shop is created.
- Shop is updated.
- Shop is searchable.
- DSR assignment is correct.

---

## TC-SHOP-002 — Shop Due Ledger

### Steps

1. Create a Shop with Opening Due.
2. Apply supported Sale/Settlement/Collection transactions.
3. Open Shop Due Ledger.

### Expected Result

- Opening Balance is correct.
- Debit/Credit entries are correct.
- References are correct.
- Running Balance is correct.

### Automation

- Covered by `backend/tests/shopDueLedger.test.js` (opening-due fallback on `/balance`, manual record-due/collect, over-collection rejection, a DSR settlement's `shopCollections` posting a referenced COLLECTION entry, the statement's opening/closing balance and totals over a date range, tenant isolation), now included in `npm run test:dealer-check`.
- **Bug found and fixed (2026-07-13):** `applyShopDueCollections`/`applyShopDueCollectionDeltas` in `backend/services/settlementService.js` had **no validation** that a settlement's `shopCollections[].amount` (or an edit's delta) didn't exceed the shop's current due — unlike the manual `POST /shop-due-ledger/collect` endpoint, which does enforce this. A settlement could silently drive a shop's balance negative. Fixed by adding the same `amount <= currentBalance` guard used by the manual endpoint, at both create-time and edit-time (delta). Covered by two new tests in `shopDueLedger.test.js`: over-collection at settlement creation, and an over-collecting edit delta (plus a valid edit delta, to confirm the fix doesn't block legitimate partial increases).
- **Known behavior worth flagging (separate from the bug above):** unlike suppliers/DSRs/SRs, a shop's Opening Due never gets an `OPENING` row inserted into `shop_due_ledger` at creation — it lives only on `customers.opening_due`. `GET /balance` falls back to that column when the ledger is empty, but `GET /statement`'s opening balance (`getShopBalanceBefore`) only ever looks at prior ledger rows and does **not** fall back — so a shop with an opening due but no ledger activity before the requested range reports an opening balance of **0**, not its actual due. This is captured as a passing test (documenting current behavior) rather than something the test asserts should change — flag to the team if this divergence from `/balance` is unintended.

---

## TC-SR-001 — SR CRUD

### Steps

1. Create an SR.
2. Edit the SR.
3. Search/List SRs.

### Expected Result

- SR is created.
- SR is updated.
- SR is searchable.

---

## TC-SR-002 — SR Due Ledger Collection

### Steps

1. Create an SR with Due Balance.
2. Collect an amount within the balance.
3. Attempt to collect more than the balance.

### Expected Result

- Valid collection reduces Due.
- Cash is deposited.
- Over-collection is rejected.

---

## TC-SR-003 — DSR Settlement SR Handover

### Steps

1. Create a Morning Issue and Settlement for a DSR, including an `srHandovers` entry for an SR.
2. Attempt a settlement whose total handover amount exceeds the settlement's total receivable.
3. Edit the settlement to change the handover amount.

### Expected Result

- A valid handover debits the SR's due ledger (referencing the settlement) and reduces the DSR's own due by the same amount.
- A handover total that exceeds the settlement's receivable (`totalPayable + previousDue - discount - extraReturnValue`) is rejected and touches nothing.
- Editing the handover amount adjusts the SR's due by the delta (not by re-applying the full new amount on top of the old one).

### Automation

- Covered by `backend/tests/srDueLedger.test.js` (handover creation, over-handover rejection — exercising the pre-existing guard in `finalizeSettlementAmountsStrict` that had no test anywhere, and edit-time delta adjustment via `applySrHandoverDeltas`). Already part of `npm run test:dealer-check` (`srDueLedger.test.js` was already in the chain).

---

# 4. Suppliers and Purchases

## TC-SUP-001 — Supplier CRUD

### Steps

1. Create a Supplier with:
   - Name
   - Phone
   - Address
   - Opening Due
2. Edit the Supplier.
3. Search/List.

### Expected Result

- Supplier is created.
- Supplier is updated.
- Supplier is searchable.
- Opening Due becomes Current Due.

---

## TC-PUR-001 — Purchase Receive (Fully Paid)

### Steps

1. Fund Cash Account.
2. Create Product and Supplier.
3. Receive Purchase as Fully Paid.

### Expected Result

- Stock increases.
- `PURCHASE_RECEIVE` movement is created.
- Supplier Due is cleared.
- Cash decreases.

---

## TC-PUR-002 — Purchase Receive (Partial Payment)

### Steps

1. Create Purchase with Partial Payment.
2. Open Supplier Due Ledger.

### Expected Result

- Remaining payable appears as Supplier Due.

---

## TC-PUR-003 — Purchase Return

### Steps

1. Receive Purchase.
2. Return part of the Purchase.
3. Open Stock Movement and Supplier Ledger.

### Expected Result

- Stock decreases.
- `PURCHASE_RETURN` movement is created.
- Supplier Due/Advance adjusts correctly.

---

## TC-SUPPAY-001 — Supplier Payment

### Steps

1. Create Supplier Due.
2. Fund Cash Account.
3. Record Supplier Payment.

### Expected Result

- Cash decreases.
- Supplier Due decreases.
- Overpayment becomes Supplier Advance (if supported).

---

## TC-SUPDISC-001 — Supplier Discount

### Steps

1. Create Supplier Due.
2. Record Supplier Discount.

### Expected Result

- Supplier Due decreases.
- No stock movement occurs.

---

## TC-SUPSTAT-001 — Supplier Statement

### Steps

1. Create:
   - Purchase
   - Return
   - Payment
   - Discount
2. Open Supplier Statement.

### Expected Result

- Opening Balance is correct.
- All movements are correct.
- Totals are correct.
- Closing Balance matches source records.

### Automation

- Covered by `backend/tests/supplierStatement.test.js`, extended with a scenario that posts a Purchase, a Return, a Payment, and a supplier-attributed Discount (via a DSR settlement's `discountSupplierId` — supplier discounts have no direct create endpoint) all in one day, then asserts the statement's opening/closing balance, `totalDebit`/`totalCredit`, and that all four entry types (`PURCHASE_DUE`, `RETURN`, `PAYMENT`, `DISCOUNT`) appear. Now included in `npm run test:dealer-check`.

---

# 5. Trade Promotions

## TC-TP-001 — Trade Promotion Rule CRUD

### Steps

1. Create a Trade Promotion Rule.
2. Edit the Rule.
3. Delete/Restore if supported.

### Expected Result

- Rule lifecycle works correctly.
- Invalid reward fields are rejected.

---

## TC-TP-002 — Trade Promotion Earning

### Steps

1. Create a qualifying rule.
2. Receive a qualifying purchase.
3. Open Earnings Report.

### Expected Result

- Correct earning is created based on:
  - Unit
  - Threshold
  - Reward

---

## TC-TP-003 — Trade Promotion Settlement

### Steps

1. Create an earning.
2. Settle via:
   - Cash
   - Stock
   - Credit Note
3. Void settlement if supported.

### Expected Result

- Remaining earning balance is correct.
- Stock/Cash/Supplier Due is updated.
- Journal/Ledger entries are correct.

---

# 6. Finance

## TC-FIN-001 — Finance Accounts

### Steps

1. Create/Fund Cash or Bank Account.
2. Deposit.
3. Withdraw.
4. Transfer between accounts.

### Expected Result

- Balances update correctly.
- Insufficient withdrawal is rejected.

### Automation

- Covered by `backend/tests/financeAccounts.test.js`, extended with a Bank-account deposit (isolated from Cash), a Cash→Bank transfer (asserting both legs' balances and both `TRANSFER_OUT`/`TRANSFER_IN` ledger rows), an over-balance transfer rejection, and a same-account-type transfer rejection.

---

## TC-EXP-001 — Expenses

### Steps

1. Fund Cash Account.
2. Create Expense.
3. Edit Expense with a reason.
4. Delete/Restore Expense.

### Expected Result

- Expense withdraws cash.
- Edit adjusts cash by delta.
- Delete/Restore reverses and reapplies account impact.

---

## TC-PROFIT-001 — Profit Report

### Steps

1. Create Purchase Cost.
2. Create Sales/Settlement Revenue.
3. Create Expenses.
4. Open Profit Report.

### Expected Result

- Profit is correct.
- Cost is correct.
- Revenue is correct.
- Expenses are correct.
- Profit Percentage is correct.

### Automation

- Covered by `backend/tests/profitReport.test.js`, extended with: (1) a DSR Settlement + Expense feeding `/api/profit-report`, asserting `revenue`/`cost`/`grossProfit`/`expenses`/`profit` on both the daily row and totals; (2) `/api/profit-report/by-dsr` attributing settlement revenue/cost to the correct DSR; (3) `/api/profit-report/by-product` picking up a settlement-sold product, not just invoice items. The underlying product code (`backend/services/profitService.js`) already fully supported DSR settlements and expenses — this was purely a missing-test gap, not a missing-feature gap.

---

# 7. Cross-Checks

## TC-CROSS-001 — Tenant Isolation

### Steps

1. Create records in Tenant A.
2. Log in as Tenant B.
3. Open the same modules.

### Expected Result

- Tenant B cannot view Tenant A data.
- Tenant B cannot modify Tenant A data.

### Automation

- Covered by `backend/tests/tenantIsolation.test.js` (includes product, supplier, retail customer, and DSR isolation), now included in `npm run test:dealer-check`.

---

## TC-CROSS-002 — Permission and Feature Gates

### Steps

1. Remove a permission or feature flag.
2. Attempt to access the page.
3. Attempt to call the API.

### Expected Result

- Page access is blocked.
- API access is blocked.

### Automation

- Covered by `backend/tests/permissionFixes.test.js` (includes `view_dsrs` scoping/fallback checks), now included in `npm run test:dealer-check`.

---

## TC-CROSS-003 — Frontend Build

### Steps

1. Run:

```bash
npm --prefix frontend run build
```

### Expected Result

- Build completes successfully.
- Dealer page bundles/chunks compile successfully.
