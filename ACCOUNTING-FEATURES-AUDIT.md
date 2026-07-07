# Accounting Features Audit — StockLedger

**Date:** 2026-07-06 (updated 2026-07-07)
**Scope:** Verification of a proposed accounting feature list against the actual codebase (`backend/` services, repositories, routes, and DB schema).

> **Progress since the audit (2026-07-07):**
> 1. **Transaction hashes** — every money-movement row (15 tables) now gets a SHA-256 content hash (`transaction_hash`) computed at creation from its immutable business fields (`backend/lib/transactionHash.js`). New rows only; old rows stay NULL.
> 2. **Purchase returns** — full module shipped: `purchase_returns` + items tables, `PURCHASE_RETURN` stock movement, `RETURN` supplier-ledger entry, reversal on delete, Purchase Return page under the Purchases menu (`purchase-returns` feature flag, `view/manage_purchase_returns` permissions).
> 3. **Supplier advances** — supplier ledger balances may now go negative: overpaying a supplier or returning more than the due creates an advance (shown as "Advance" on the supplier statement; `suppliers.current_due` stays clamped at 0, consistent with the invariant checker).

## Verdict at a Glance

StockLedger today is an **operational ledger system, not a double-entry accounting system**. Everything built around dues, payments, sales, purchases, and inventory exists and is solid. The formal accounting core — chart of accounts, journal entries, trial balance, balance sheet, year-end close — **does not exist at all**.

| Category | Status |
|---|---|
| Core Accounting | ❌ Mostly missing |
| Cash & Banking | ⚠️ Exists, but hardcoded to 1 cash + 1 bank account |
| Receivables & Payables | ✅ Fully exists (strongest area) |
| Sales & Purchases | ✅ Exists, except purchase returns |
| Expense Management | ✅ Fully exists |
| Inventory Integration | ✅ Exists (valuation is basic) |
| Financial Reports | ✅ Fully exists |
| Audit & Security | ⚠️ Exists, but backup is download-only (no restore) |
| Year-End & Opening | ❌ Mostly missing |

---

## 1. Core Accounting — ❌ Mostly Missing

| Feature | Status | Evidence |
|---|---|---|
| Chart of Accounts | ❌ Missing | No table, no service, zero references in the backend |
| Double-entry accounting | ❌ Missing | `finance_account_transactions` (`backend/db/schema.js`) has `debit`/`credit` columns, but it is a **running-balance cashbook** per account, not a double-entry journal. Transfers create two rows linked by `transfer_id`, but there is no accounting equation being maintained |
| Journal entries (automatic) | ❌ Missing | No journal table or posting engine |
| General Ledger | ❌ Missing | Only per-account transaction lists exist |
| Trial Balance | ❌ Missing | No implementation |
| Profit & Loss | ⚠️ Partial | Profit report (`backend/services/profitService.js`) and income-vs-expense range report (`backend/services/financeDashboardService.js`) exist, but there is no formal P&L statement with account groupings |
| Balance Sheet | ❌ Missing | Closest approximation: `netPosition = cash + DSR due + customer due − supplier due` on the finance dashboard |
| Cash Flow Statement | ⚠️ Partial | Monthly inflow/outflow totals on the dashboard (`getMonthlyCashFlow`), not a classified cash flow statement |

---

## 2. Cash & Banking — ⚠️ Exists, Hardcoded to Two Accounts

`backend/services/financeAccountService.js:22` defines `ACCOUNT_TYPES = ["CASH", "BANK"]`, and the schema enforces `UNIQUE (tenant_id, type)` on `finance_accounts` — **each tenant gets exactly one cash account and one bank account**, auto-created by `ensureDefaultAccounts`.

| Feature | Status | Evidence |
|---|---|---|
| Multiple cash accounts | ❌ Missing | Schema uniqueness constraint prevents it |
| Multiple bank accounts | ❌ Missing | Same constraint |
| Cash-to-bank transfers | ✅ Exists | `recordTransfer` in `financeAccountService.js` (paired rows via `transfer_id`) |
| Bank-to-bank transfers | ❌ Missing | Impossible — only one bank account exists |
| Cash/Bank ledger | ✅ Exists | `finance_account_transactions` with `balance_after` running balance, soft delete with reason, and reversal support |

---

## 3. Receivables & Payables — ✅ Fully Exists

The strongest part of the system. Five independent due ledgers, all with entry-level history and derived running balances:

| Feature | Status | Evidence |
|---|---|---|
| Customer ledger | ✅ Exists | `customerDueLedgerService.js` — opening balance, entries, closing balance |
| Supplier ledger | ✅ Exists | `supplierDueLedgerService.js` — same structure |
| Customer due tracking | ✅ Exists | `customer_due_ledger` table + `opening_due` on customers |
| Supplier due tracking | ✅ Exists | `supplier_due_ledger` table + `opening_due` on suppliers |
| Payment history | ✅ Exists | `customer_payments`, `supplier_payments` tables with dedicated services |

Also present beyond the proposed list: **DSR due ledger, SR due ledger, and shop due ledger** for the dealer-distribution flow.

---

## 4. Sales & Purchases — ✅ Exists, Except Purchase Returns

| Feature | Status | Evidence |
|---|---|---|
| Sales invoices | ✅ Exists | `salesInvoiceService.js`, numbered via `sales_number_counters` |
| Purchase invoices | ✅ Exists | Purchase receipts (`purchaseReceiveService.js`, `purchase_receipts` + items) |
| Sales returns | ✅ Exists | `salesReturnService.js`, `sales_returns` + `sales_return_items` |
| Purchase returns | ✅ **Shipped 2026-07-07** | `purchaseReturnService.js` — free-form return to supplier: stock out (`PURCHASE_RETURN` movement), supplier ledger credit (`RETURN` type), advance when the return exceeds the due |
| Discounts | ✅ Exists | Invoice-level discounts + a dedicated supplier-discounts module (`supplierDiscountService.js`) |
| VAT/Tax | ✅ Exists | Per-product `tax_rate` with tenant-level default; line-item tax computed in `applyLineItemTaxes` (`salesInvoiceService.js:174`) |

---

## 5. Expense Management — ✅ Fully Exists

| Feature | Status | Evidence |
|---|---|---|
| Expense categories | ✅ Exists | `expenses.category` column with index (`backend/db/schema.js:69`) |
| Expense recording | ✅ Exists | `expenseService.js` + expenses feature pages |
| Expense reports | ✅ Exists | Monthly totals and range reports in `financeDashboardService.js` |

---

## 6. Inventory Integration — ✅ Exists

| Feature | Status | Evidence |
|---|---|---|
| Inventory valuation | ⚠️ Basic | Stock value at cost appears in reports; **no valuation-method choice** (FIFO / weighted average) |
| Cost of Goods Sold (COGS) | ✅ Exists | `profitService.js` computes cost side, adjusted for returns ("Extra returns reduce revenue; returned goods also reduce COGS") |
| Stock adjustments | ✅ Exists | `MANUAL_ADJUSTMENT` and `DAMAGE` movement types (`backend/lib/stockMovements.js`) |
| Stock movement history | ✅ Exists | `stock_movements` table + `stockMovementService.js`; `products.stock_pieces` is always recomputed from movement rows |

---

## 7. Financial Reports — ✅ Fully Exists

| Feature | Status | Evidence |
|---|---|---|
| Account ledger | ✅ Exists | Finance account transaction listing (`listTransactions`) |
| Customer statement | ✅ Exists | Customer due ledger with opening/closing balance per range |
| Supplier statement | ✅ Exists | Dedicated `supplier-statement` frontend feature |
| Daily cash report | ✅ Exists | `DailyReportsPage.jsx` (`frontend/src/features/reports/pages/`) |
| Income vs Expense | ✅ Exists | Dashboard + `getRangeReport` in `financeDashboardService.js` |
| Profit analysis | ✅ Exists | `ProfitPage` + `profitService.js` (note: profit % is markup on cost, not margin on revenue) |

---

## 8. Audit & Security — ⚠️ One Gap

| Feature | Status | Evidence |
|---|---|---|
| Audit log | ✅ Exists | `auditService.js`, `activity_logs` table, `audit.routes.js` |
| Transaction history | ✅ Exists | Soft delete with `delete_reason`, `deleted_by_id`, and reversal transactions |
| User permissions | ✅ Exists | Three-layer access control (role, permission, feature flag) |
| Backup & restore | ⚠️ **Backup only** | Tenant export (`databaseBackup.routes.js` — GET download + history) and platform full export exist. **There is no restore/import endpoint anywhere** |

---

## 9. Year-End & Opening — ❌ Mostly Missing

The words "fiscal", "financial year", and "carry forward" appear nowhere in the backend.

| Feature | Status | Evidence |
|---|---|---|
| Opening balances | ⚠️ Partial | Customers/suppliers have `opening_due`; stock has an `OPENING` movement type. Finance accounts start at 0 with **no opening-balance mechanism** |
| Financial year support | ❌ Missing | No fiscal-year concept anywhere |
| Closing balances | ⚠️ Partial | Ledger statements compute a closing balance for any date range, but there is no period-close process |
| Carry-forward balances | ❌ Missing | No year-end close or carry-forward |

---

## Summary of Real Gaps

If the goal is to claim "full accounting," these are the missing pieces, roughly in order of build size:

1. **General-ledger layer** — chart of accounts, automatic journal postings from existing flows, trial balance, balance sheet, formal P&L and cash flow statements. This is the big one; nothing exists today.
2. **Multiple cash/bank accounts** — requires removing the `UNIQUE (tenant_id, type)` constraint and the hardcoded two-account model in `financeAccountService.js`.
3. **Purchase returns** — a new flow (service, routes, supplier-ledger entry type, stock movement) mirroring sales returns.
4. **Year-end close** — financial year definition, opening-balance entry for finance accounts, period close, carry-forward.
5. **Backup restore** — an import endpoint to complement the existing export.
6. *(Minor)* **Inventory valuation method** — currently implicit at cost; no FIFO/weighted-average option.

Everything else on the proposed list already exists and works.

---

## Recommendation — What to Build

Context: pre-PMF, two target segments (FMCG dealers + electronics retail), goal of 2 → 10 paying customers by ~Aug 2026. Users are dealers and shop owners, not accountants. **Build the operational gaps, skip the accounting orthodoxy.**

### Worth adding now

1. **Multiple cash/bank accounts** — *highest value.* In Bangladesh money moves through bKash, Nagad, Rocket, one or two bank accounts, plus the cash drawer. The hardcoded one-CASH-one-BANK model forces users to misrecord reality, which corrupts every downstream number (dashboard, net position, daily report). Medium effort: drop the `UNIQUE (tenant_id, type)` constraint, make accounts a named list per tenant, keep `recordTransfer` working between any two accounts. This is the gap a prospect hits in their first week.

2. **Purchase returns** — FMCG dealers return damaged/expired/unsold stock to the company weekly; it is routine, not an edge case. Without it, supplier dues drift wrong. Moderate effort, and the shape already exists — mirror `salesReturnService`: a return document, a supplier-ledger credit entry, and a stock movement out.

3. **Opening balance for finance accounts** — *trivial; ship with #1.* Every tenant onboarded between now and August joins mid-year with real cash and bank balances; today accounts start at 0 and the workaround is a fake "deposit". One opening-balance field (or a dedicated entry type) fixes onboarding for exactly the customers being signed.

4. **Formal monthly P&L page** — *cheap win.* Revenue, COGS-adjusted profit, and expenses by category are already computed; presenting them as a proper "Profit & Loss — <month>" statement is mostly frontend work. High perceived value — it's the report an owner shows a partner or a bank.

### Worth doing as an internal capability

5. **Backup restore** — not a customer-facing button (dangerous in multi-tenant), but a platform-admin restore path for the existing export format is cheap insurance for the first time a tenant deletes something important.

### Not worth adding at this stage

- **Chart of accounts, journal entries, general ledger, trial balance, balance sheet, year-end close, carry-forward** — the entire "Core Accounting" and "Year-End" sections. Target users don't produce trial balances (their accountant does, in Tally or on paper); it is by far the largest build on the list (a posting engine touching every existing flow plus historical-data migration); and it contradicts the current pre-PMF stage — the same discipline that deferred warranty/IMEI/repair applies here. The existing sub-ledger design (dues, payments, cash, stock) *is* the right product for this market. Revisit only if a validated customer segment demands real double-entry.
- **Inventory valuation methods (FIFO/weighted-average)** — nobody in the target market will notice; cost-based valuation as-is is fine.

**Bottom line:** items 1–4 close real gaps prospects will hit during the 2 → 10 push, at a fraction of the cost of the GL layer — which serves a customer that doesn't exist yet.
