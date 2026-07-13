# StockLedger Dealer Feature Test Cases

**Date:** 2026-07-13

## Automated Commands

```bash
npm run test:dealer-check
```

## Frontend Build

```bash
npm --prefix frontend run build
```

## Database Requirement

> Use a disposable local or dedicated PostgreSQL test database in `backend/.env` as `DEV_DATABASE_URL`.
>
> **Do not run dealer automation against a production/shared Supabase pooler database.**

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

---

## TC-CROSS-002 — Permission and Feature Gates

### Steps

1. Remove a permission or feature flag.
2. Attempt to access the page.
3. Attempt to call the API.

### Expected Result

- Page access is blocked.
- API access is blocked.

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