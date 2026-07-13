# StockLedger Final Feature Check

Date: 2026-07-13

Use one tenant and one test user with the intended production-like permissions. Keep a small set of named test records so every stock, due, and finance effect can be traced end to end.

## Automated Status

- Frontend production build: PASS (`npm --prefix frontend run build`)
- Backend tests: BLOCKED because `backend/.env` does not define `DATABASE_URL`

## 1. Inventory Core

- [ ] Products: create, edit, search, category/brand/manufacturer/generic medicine selectors, reorder level, serial/IMEI requirement, soft delete/restore if available.
- [ ] Products: verify stock cannot be manually changed from edit form; stock changes must come from opening stock, add stock, purchase, sale, issue, settlement, return, or damage flows.
- [ ] Stock Movement: after each stock-changing action, confirm product, type, quantity in/out, reference, note, user, and balance after are correct.
- [ ] Low Stock Alerts: set one product below reorder level and one above; confirm only the low product appears.
- [ ] Product Serials: create serial/IMEI for serial-required product, reject duplicate serial/IMEI, and confirm non-serial product cannot receive serial entries.
- [ ] Damaged Stock: record damaged quantity, confirm sellable stock impact, then clear damaged stock and confirm history is traceable.

## 2. DSR And Field Sales

- [ ] DSRs: create, edit, search, opening due, status changes, delete/restore.
- [ ] Morning Issue: issue stock to DSR; confirm product stock decreases and issue appears in stock movement.
- [ ] Settlements: settle issued items with sold, return, damaged, discount, collection, and due values; confirm returned stock and damaged stock update correctly.
- [ ] DSR Finance: settle DSR due where supported; confirm DSR due ledger balance and references.
- [ ] Customers/Shops: create, edit, assign DSR/SR where applicable, opening due, status, delete/restore.
- [ ] Shop Due Ledger: confirm opening due, sales/issue settlement effects, collections, and running balance.
- [ ] SRs: create, edit, search, opening due if supported, status, delete/restore.
- [ ] SR Due Ledger: confirm running balance, references, and tenant-scoped data visibility.

## 3. Purchases And Supplier Ledger

- [ ] Suppliers: create, edit, search, opening due/current due, status, delete/restore.
- [ ] Purchase Receive: receive items, verify stock increases, purchase cost/tax totals, supplier payable, invoice photo if used, and stock movement.
- [ ] Purchase Returns: return received items; confirm stock decreases and supplier payable/ledger reverses correctly.
- [ ] Supplier Payments: record cash/bank payment; confirm supplier due decreases and finance account balance changes.
- [ ] Supplier Discounts: record discount; confirm supplier due decreases without stock effect.
- [ ] Supplier Statement: compare statement opening, purchases, returns, payments, discounts, and closing balance against individual records.
- [ ] Trade Promotions: create rule, receive qualifying purchase, confirm earning, settle earning by supported methods, and verify ledger/account impact.

## 4. Finance

- [ ] Finance Dashboard: confirm cash/bank/due/profit cards match underlying records after the test transactions.
- [ ] Finance Accounts: create account, transfer between accounts, record cash/bank movements, and confirm balances.
- [ ] Expenses: create/edit/delete expense; confirm finance account and profit impact.
- [ ] Profit: confirm purchase cost, sales/settlement revenue, expenses, returns, discounts, and profit percentage are calculated as expected.

## Cross-Checks

- [ ] Permission and feature gate: each page in this checklist is visible for the target role and hidden/blocked when permission or feature is removed.
- [ ] Tenant isolation: log in to another tenant and confirm none of the first tenant's records appear.
- [ ] Print/export/report actions: check any print/export buttons on statement, profit, stock, and purchase/supplier pages.
- [ ] Mobile layout: quick scan each page on a narrow viewport for broken tables, hidden buttons, or overflowing modals.
- [ ] Audit/activity logs: create/update/delete actions should leave readable activity entries where the module supports audit.

## Recommended Order

1. Create master records: products, serial settings, DSR, SR, shop, supplier, finance accounts.
2. Run stock flows: opening stock, add stock, purchase receive, morning issue, settlement, damaged stock, purchase return.
3. Run money flows: supplier payment, supplier discount, DSR finance, expenses, finance transfer.
4. Reconcile reports: stock movement, shop due ledger, SR due ledger, supplier statement, finance dashboard, profit.
5. Check access: permission/feature visibility, tenant isolation, mobile layout.
