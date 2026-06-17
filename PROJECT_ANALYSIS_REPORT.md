# Inventory SaaS Project Analysis Report

Date: 2026-06-17

Scope: full project review of backend, database schema, business logic, API flow, frontend UI flows, reporting, calculations, multi-tenant behavior, and technical structure.

No application code was changed during this analysis.

## Executive Summary

The project already has a useful foundation for an inventory and business management SaaS. It includes products, DSR issue and settlement flows, purchases, suppliers, retailer sales invoices, sales returns, customer dues, supplier dues, expenses, finance dashboard, tenant authentication, role permissions, and audit logging.

However, the system is not ready to sell to real businesses yet. The biggest risk is not missing screens; it is accounting and inventory integrity. Several flows can make stock, cash, customer due, supplier due, DSR balance, and profit reports inconsistent.

The most urgent problems are:

- Sales invoice delete and restore do not reverse stock, cash, or customer due.
- Serverless runtime wiring disables finance postings and misses retail customer service.
- Backup export can expose all tenants and sensitive authentication data.
- Purchase receipt update has a runtime bug.
- Customer and supplier payment edit logic records ledger signs incorrectly.
- Sales returns trust client data and can allow duplicate returns.
- Due and stock ledgers use entry timestamp instead of business transaction date.
- Tenant isolation is mostly enforced in service code, while database constraints are weak.

The system should not be offered to paying customers until the P0 roadmap items are fixed.

## Critical Issues

### 1. Sales invoice delete and restore corrupt balances

File:

- `backend/services/salesInvoiceService.js`

Problem:

- `removeSalesInvoice` soft-deletes the invoice but does not reverse product stock, customer due ledger, customer current due, or finance cash posting.
- `restoreSalesInvoice` restores the row but also does not safely re-apply accounting effects.

Business impact:

- Reports exclude the deleted sale.
- Stock remains reduced.
- Customer due may remain increased.
- Cash may remain increased.
- Profit and revenue reports no longer match inventory and ledger balances.

Recommended fix:

- Replace transactional delete with a formal void/reversal flow.
- A void must create reversing stock movements, reversing customer due ledger entries, and reversing finance transactions.
- Restore should either be blocked or implemented as a full re-posting operation.

### 2. Runtime wiring is incomplete

Files:

- `backend/runtime.js`
- `api/index.js`
- `api/[...path].js`

Problem:

- `runtime.js` constructs multiple services without `financeAccountService`.
- This means sales, purchases, expenses, settlements, DSR finance, and payments can skip automatic finance transactions in serverless/API runtime.
- `RetailCustomerService` is not wired into runtime, so retail customer routes can fail depending on deployment path.

Business impact:

- Local server and deployed/serverless behavior may differ.
- Cashbook can be missing transactions in production.
- Retail customer APIs may be unavailable.

Recommended fix:

- Keep service construction in one shared composition root.
- Ensure `server.js` and `runtime.js` use the same dependency graph.
- Add a startup smoke test that verifies every route dependency exists.

### 3. Backup exports all tenant data

File:

- `backend/services/backupService.js`

Problem:

- Backup export reads all public tables.
- It includes all tenants, users, password hashes, sessions, reset tokens, and business data.
- If a tenant-level user receives backup permission, they may export data from every organization.

Business impact:

- Critical multi-tenant data exposure.
- Sensitive auth data exposure.
- High legal and customer trust risk.

Recommended fix:

- Restrict full database backup to platform-only roles.
- Add tenant-scoped backup for tenant users.
- Exclude password hashes, sessions, and reset tokens from user-facing exports.
- Audit backup downloads with tenant, actor, IP, and scope.

### 4. Purchase receipt update has undefined variables

File:

- `backend/services/purchaseReceiveService.js`

Problem:

- `updatePurchaseReceiptRecord` references `oldDue` and `newDue`, but they are not defined.

Business impact:

- Updating a purchase receipt can fail at runtime.
- Purchase correction flow is unreliable.

Recommended fix:

- Compute old and new supplier due amounts explicitly.
- Add tests for purchase create, update increase, update decrease, paid change, and delete/void behavior.

### 5. Customer payment update records wrong ledger side

File:

- `backend/services/customerPaymentService.js`

Problem:

- Increasing a customer payment reduces customer due, but update logic records the positive delta as debit instead of credit.
- Customer overcollection is not blocked on create.

Business impact:

- Customer ledger statements become mathematically wrong.
- Customer current due can be clamped while ledger balance goes negative.
- Business owners cannot trust due collection reports.

Recommended fix:

- For customer payments, payment increase should be a credit.
- Payment decrease should be a debit.
- Block overcollection unless a deliberate advance/credit-balance feature exists.

### 6. Supplier payment update records wrong ledger side

File:

- `backend/services/supplierPaymentService.js`

Problem:

- Increasing supplier payment reduces supplier payable, but update logic records the positive delta as debit instead of credit.
- Update path does not enforce the same overpayment guard as create path.

Business impact:

- Supplier statements can become incorrect.
- Supplier payable can go negative after edit.

Recommended fix:

- For supplier payments, payment increase should be a credit against payable.
- Payment decrease should be a debit.
- Enforce overpayment guard on update.

### 7. Sales return logic is not safe enough

Files:

- `backend/services/salesReturnService.js`
- `frontend/src/features/retailer/sales-return/viewmodels/useSalesReturnFormViewModel.js`

Problem:

- Backend trusts client-provided invoice item ID, sale price, cost snapshot, and product data.
- It does not verify cumulative returned quantity across previous returns.
- Frontend clamps return quantity per form, but repeated returns can still exceed original sold quantity.
- Return flow reduces customer due but does not clearly support refund, credit note, exchange, or paid invoice handling.

Business impact:

- Same sold quantity can be returned multiple times.
- Stock can be inflated.
- Customer due can become negative.
- Cash refunds are not represented correctly.

Recommended fix:

- Backend must load original invoice and invoice items from database.
- Validate invoice ownership, tenant, customer, product, and cumulative returned quantity.
- Add explicit return settlement modes: due adjustment, refund cash/bank/mobile, credit note, exchange.

### 8. Ledgers use entry date instead of business date

Files:

- `backend/repositories/customerDueLedgerRepository.js`
- `backend/repositories/supplierDueLedgerRepository.js`
- `backend/repositories/dsrDueLedgerRepository.js`
- `backend/repositories/stockMovementRepository.js`

Problem:

- Customer, supplier, DSR, and stock ledger reports filter by `created_at`.
- Ledger rows are inserted with current timestamp.
- Backdated sales, purchases, payments, returns, settlements, and stock activity appear on the entry date, not the actual business date.

Business impact:

- Daily reports are wrong for backdated entries.
- Month-end reports are wrong.
- Opening and closing balances by date are unreliable.

Recommended fix:

- Add `transaction_date` or `business_date` to all ledger and stock movement records.
- Use business date for reports.
- Keep `created_at` only as audit/entry timestamp.

### 9. Tenant isolation is too dependent on service code

Files:

- `backend/middleware/requireActiveTenant.js`
- `backend/middleware/requireAuth.js`
- `backend/db/schema.js`
- `backend/lib/permissions.js`

Problem:

- Platform users can continue without active tenant in some business routes.
- Many business tables allow nullable `tenant_id`.
- Some foreign keys are missing or not tenant-scoped.
- Platform roles have broad permissions.

Business impact:

- Null-tenant business rows can be created.
- A service bug can expose or mix tenant data.
- Platform support behavior may be too powerful without enough audit and restrictions.

Recommended fix:

- Require active tenant for all tenant business routes.
- Make business `tenant_id` columns `NOT NULL`.
- Add tenant-scoped database constraints where possible.
- Restrict platform cross-tenant actions and audit every tenant switch/access.

## Missing Features

### Inventory and Stock

Important missing features:

- SKU and barcode support.
- Product brand, model, category hierarchy, and supplier mapping.
- Unit of measure and pack-size conversion.
- Opening stock import.
- Minimum stock, reorder level, and low-stock alerts.
- Stock adjustment with reason and approval.
- Physical stock count and variance report.
- Warehouse, branch, location, and bin support.
- Stock transfer between warehouses or shops.
- Damaged stock write-off with value impact.
- Batch, expiry, serial, or IMEI tracking where needed.
- Inventory valuation using FIFO, weighted average, or another defined method.
- Inventory aging report.

### Sales and Retail

Important missing features:

- POS or quick sale flow with barcode scanning.
- Invoice edit, cancel, void, and reversal workflow.
- Refund and credit-note handling.
- Exchange flow.
- Split payments across cash, bank, mobile banking, cheque, and due.
- Tax/VAT, service charge, delivery charge, and shipping charge.
- Per-item discount and order-level discount.
- Receipt numbering and print-friendly invoice layout.
- Cash drawer or shift close for retail shop use.
- Customer credit limit and payment terms.
- Quotation, sales order, delivery challan, and invoice conversion.

### Dealer, Distributor, and DSR

Important missing features:

- Route plan and market assignment.
- Shop-wise DSR sales and collections.
- DSR van/load stock reconciliation.
- DSR expense and commission.
- DSR advance settlement against sales/collections.
- DSR cash handover and cash short/excess tracking.
- Previous due collection by shop.
- DSR performance by product, route, market, and customer.
- Settlement approval and period lock.

### Purchase and Supplier

Important missing features:

- Purchase order.
- Goods receive note separated from supplier invoice.
- Partial receive and backorder.
- Supplier return.
- Landed cost, freight, transport, and unloading cost allocation.
- Supplier credit note.
- Supplier payment terms.
- Supplier statement and payable aging.

### Accounting and Finance

Important missing features:

- Real chart of accounts.
- Bank and mobile banking accounts.
- Opening cash, bank, customer, and supplier balances.
- Journal entries.
- Cashbook, bankbook, and mobile wallet book.
- Bank reconciliation.
- Accounts receivable aging.
- Accounts payable aging.
- Trial balance, profit and loss, and balance sheet.
- Tax/VAT reports.
- Period closing and lock.

### Customer and Supplier Records

Important missing features:

- Duplicate detection by phone, email, and business name.
- Credit limit.
- Payment terms.
- Multiple contacts and addresses.
- Route, market, territory, and sales rep assignment.
- Customer/shop statement by business date.
- Supplier statement by business date.

## Features That Are Unnecessary Or Overcomplicated Right Now

- DSR cash receipt structures exist but are not fully mounted or supported.
- Finance transfer functionality exists in service/viewmodel shape, but only `CASH` account type is supported.
- Separate `customers` and `retail_customers` models create confusion unless their business meaning is clearly separated.
- Permanent delete for transactional records is risky before reversal and audit flows are complete.
- The single large schema initializer is becoming difficult to maintain compared with versioned migrations.

## Calculation Risks

### Stock Quantity

Risks:

- Sales invoice delete does not restore stock.
- Sales return can add stock multiple times for the same original sale quantity.
- Stock movements use entry timestamp instead of transaction date.
- Damaged stock ledger balance may not represent actual available stock.
- No database constraints prevent negative or invalid quantities in all places.

Recommended fix:

- Use stock movements as the source of truth or enforce a strict reconciliation between product quantity and movement history.
- Add transaction date to movements.
- Add validation and database checks.
- Add a stock reconciliation report.

### Sales Amount and Due

Risks:

- Sales invoice delete removes the invoice from reports but does not reverse customer due or cash.
- Customer payment can overcollect.
- Customer payment update uses wrong debit/credit direction.
- Sales returns can reduce due below zero.
- Paid invoice return does not create a cash refund or credit note.

Recommended fix:

- Define formal AR accounting rules.
- Add customer credit balance support only if intentionally designed.
- Add void/reversal entries instead of silent edits/deletes.

### Purchase Amount and Supplier Due

Risks:

- Purchase update has a runtime bug.
- Supplier payment update uses wrong debit/credit direction.
- Supplier payment update can overpay.
- Purchase delete/restore behavior should be checked for complete reversal symmetry.

Recommended fix:

- Add AP ledger invariants.
- Test purchase create/update/void/payment flows end to end.

### Expense and Finance

Risks:

- All payment methods collapse into cash.
- Bank, mobile banking, and cheque payments do not affect separate balances.
- Generated finance transactions have weak linkage to source documents.
- Users may delete finance transactions independently from source documents.

Recommended fix:

- Add real account types and source references.
- Prevent deleting generated finance entries directly.
- Reverse through source document voids.

### Profit and Loss

Risks:

- DSR/distributor profit uses current purchase price instead of historical cost snapshot.
- Product cost changes can rewrite historical profit.
- Purchase discounts, landed costs, damaged stock, taxes, and returns are not fully reflected.
- Month-end summary is not a true closed-period P&L.

Recommended fix:

- Snapshot cost at every stock-out event.
- Define valuation method.
- Add period closing.

### Date and Timezone

Risks:

- Backend uses UTC ISO date defaults in places.
- Frontend uses local browser date.
- User timezone is Asia/Dhaka, so UTC date can shift near local midnight.
- Reports mix business dates and created timestamps.

Recommended fix:

- Store business date explicitly.
- Store timestamps in UTC.
- Render dates in tenant timezone.
- Use tenant timezone for default business date.

## Business Flow Gaps

### Dealer Business

Current support:

- Product issue and settlement flows exist.
- DSR/customer concepts exist.

Gaps:

- No route plan.
- No shop-wise DSR collection flow.
- No DSR stock reconciliation by product and route.
- No approval flow for settlement.
- No previous due collection workflow by shop.
- DSR advances are not cleanly represented in DSR due statements.

### Wholesale Business

Current support:

- Sales, purchases, suppliers, products, dues, and expenses exist.

Gaps:

- No wholesale order, challan, delivery, invoice lifecycle.
- No customer credit limit.
- No bulk price tiers.
- No supplier return.
- No aging reports.
- No warehouse transfer or stock reservation.

### Retail Shop Business

Current support:

- Retail customer invoices and sales returns exist.

Gaps:

- No fast POS workflow.
- No barcode scanning.
- No cash drawer or shift close.
- No refund/exchange clarity.
- No split payment.
- No receipt print flow designed for counter sales.

### Distributor Business

Current support:

- DSR and customer/shop model partially support field sales.

Gaps:

- No territory, route, or market hierarchy.
- No van stock/load tracking.
- No distributor to retailer price list.
- No commission/incentive.
- No daily DSR cash handover workflow.

### General Inventory Business

Current support:

- Basic product quantity, purchase receive, sale, return, expense, and report modules exist.

Gaps:

- No physical stock count.
- No stock adjustment approval.
- No stock valuation.
- No month-end close.
- No business-date-based ledgers.
- No complete accounting integration.

## UI/UX Issues

Files and modules:

- `frontend/src/app/TopHeader.jsx`
- `frontend/src/utils/calculations.js`
- `frontend/src/features/finance-dashboard/pages/FinanceDashboardPage.jsx`
- `frontend/src/features/finance-accounts/pages/FinanceAccountsPage.jsx`
- `frontend/src/features/retailer/sales-return/viewmodels/useSalesReturnFormViewModel.js`

Problems:

- Tenant switching is hidden on mobile because the tenant selector is inside a `hidden sm:flex` block.
- Currency formatting contains mojibake instead of clean BDT/Taka formatting.
- Finance dashboard has hardcoded English and corrupted characters instead of consistent i18n.
- Finance transfer modal and viewmodel exist but the main finance account page does not expose transfer functionality.
- Sales return frontend clamps quantity per form, but backend does not enforce cumulative return limits.
- Several flows rely on generic request errors instead of business-friendly field messages.
- Business owners may not understand whether a return means refund, due adjustment, credit note, or exchange.

Recommended fix:

- Make tenant switching available on mobile.
- Fix encoding and standardize currency formatting.
- Move dashboard text into i18n.
- Add clear statuses and action names: Draft, Post, Void, Refund, Credit Note, Settle, Close Period.
- Add field-level validation messages.

## Database and API Issues

Primary file:

- `backend/db/schema.js`

Problems:

- Schema is managed as a large initializer with many `CREATE` and `ALTER` statements instead of versioned migrations.
- Many business `tenant_id` columns are nullable.
- Several important IDs are plain text without strong foreign keys.
- Some foreign keys are dropped during migration but not replaced with equivalent constraints.
- `issues` and `settlements` store items as JSONB, which is flexible but weak for validation, indexing, and reporting.
- `users.email` is globally unique even though service logic suggests tenant-scoped user lookup.
- Missing check constraints for nonnegative amount, quantity, price, paid amount, and due amount.
- Missing status/type constraints for payment method, account type, document status, and transaction kind.
- Missing unique constraints for product SKU/barcode, customer phone, supplier phone, and route/shop identity.
- Report queries may become slow as data grows because several common tenant/date/product indexes are missing.

Recommended fix:

- Introduce versioned migrations.
- Add `NOT NULL` tenant constraints for business tables.
- Add database-level checks for critical numeric fields.
- Add proper foreign keys or tenant-scoped integrity checks.
- Normalize high-value reporting data currently stored only inside JSONB.
- Add indexes for tenant/date/product/customer/supplier/report queries.

## Security and Multi-Tenant Issues

Files and modules:

- `backend/middleware/requireAuth.js`
- `backend/middleware/requireActiveTenant.js`
- `backend/lib/permissions.js`
- `backend/services/backupService.js`
- `frontend/src/services/api/client.js`
- `backend/config/env.js`

Problems:

- Frontend sends active tenant ID from local storage. This is acceptable only if backend strictly validates that the actor can access that tenant.
- Platform users can select active tenant through header. This needs strict role restriction and audit.
- Platform users without active tenant can reach some business route paths.
- Platform roles have broad permissions.
- Backup can expose all tenants.
- Default admin/developer credentials are dangerous if environment variables are not configured in production.

Recommended fix:

- Enforce active tenant on all tenant business APIs.
- Enforce tenant access server-side for every request.
- Restrict cross-tenant access to explicit support/admin actions.
- Audit tenant switching and cross-tenant reads.
- Remove or fail-fast on default credentials in production.
- Scope backups by role and tenant.

## Reporting Gaps

Current reports are useful as early dashboards, but not yet reliable enough for month-end or owner-level decisions.

Required reports:

- Daily sales report.
- Sales by product, category, customer, DSR, and channel.
- Purchase report by supplier and product.
- Stock movement report by business date.
- Opening stock and closing stock report.
- Low-stock report.
- Damaged stock report.
- Stock valuation report.
- Customer due report.
- Customer aging report.
- Customer/shop statement.
- Supplier payable report.
- Supplier aging report.
- Supplier statement.
- Expense report by category and payment account.
- Cashbook, bankbook, and mobile wallet book.
- DSR issue, return, collection, due, advance, and settlement report.
- Profit and loss by period.
- Month-end closing summary with opening balance, movement, and closing balance.
- Audit, deleted, voided, and adjusted transaction report.

Reporting corrections needed:

- Use business date, not entry date.
- Support as-of balances.
- Include opening balance in period reports.
- Reconcile source documents with ledger entries.
- Separate cash, bank, mobile banking, cheque, and due.

## Exact Files and Modules Where Problems Were Found

Backend services:

- `backend/services/salesInvoiceService.js`
- `backend/services/purchaseReceiveService.js`
- `backend/services/customerPaymentService.js`
- `backend/services/supplierPaymentService.js`
- `backend/services/salesReturnService.js`
- `backend/services/dsrDueLedgerService.js`
- `backend/services/dsrFinanceService.js`
- `backend/services/financeAccountService.js`
- `backend/services/productService.js`
- `backend/services/profitService.js`
- `backend/services/financeDashboardService.js`
- `backend/services/monthEndSummaryService.js`
- `backend/services/backupService.js`

Backend repositories:

- `backend/repositories/customerDueLedgerRepository.js`
- `backend/repositories/supplierDueLedgerRepository.js`
- `backend/repositories/dsrDueLedgerRepository.js`
- `backend/repositories/stockMovementRepository.js`
- `backend/repositories/expenseRepository.js`

Backend routing/runtime/auth:

- `backend/runtime.js`
- `backend/server.js`
- `backend/routes/api.js`
- `backend/routes/salesInvoices.routes.js`
- `backend/routes/dsrCashReceipts.routes.js`
- `backend/middleware/requireAuth.js`
- `backend/middleware/requireActiveTenant.js`
- `backend/lib/permissions.js`
- `api/index.js`
- `api/[...path].js`

Database:

- `backend/db/schema.js`

Frontend:

- `frontend/src/app/TopHeader.jsx`
- `frontend/src/services/api/client.js`
- `frontend/src/utils/calculations.js`
- `frontend/src/features/finance-dashboard/pages/FinanceDashboardPage.jsx`
- `frontend/src/features/finance-accounts/pages/FinanceAccountsPage.jsx`
- `frontend/src/features/retailer/sales-return/viewmodels/useSalesReturnFormViewModel.js`
- `frontend/src/features/products/components/StockLedgerPanel.jsx`

## Suggested Roadmap

### P0: Must Fix Before Selling

1. Fix multi-tenant security.
   - Block tenant business routes without active tenant.
   - Make backup platform-only or tenant-scoped.
   - Prevent null-tenant business rows.

2. Fix runtime dependency wiring.
   - Ensure local server and serverless runtime construct the same services.
   - Wire `financeAccountService` and `retailCustomerService` correctly.

3. Replace transactional delete with void/reversal.
   - Sales invoice.
   - Purchase receipt.
   - Sales return.
   - Payment.
   - Expense.
   - DSR settlement.

4. Fix ledger math.
   - Customer payment update signs.
   - Supplier payment update signs.
   - Overcollection and overpayment guards.
   - DSR due settlement overcollection guard.

5. Fix sales return integrity.
   - Backend must validate original invoice item.
   - Enforce cumulative return quantity.
   - Add refund/credit-note/due-adjustment modes.

6. Fix purchase update bug.
   - Define old and new due values.
   - Add regression tests.

7. Add business dates to stock and due ledgers.
   - Use business date for reports.
   - Keep created timestamp for audit only.

8. Add invariant tests.
   - Stock cannot silently diverge.
   - Customer ledger balance equals customer current due.
   - Supplier ledger balance equals supplier current balance.
   - Finance postings match source documents.

### P1: Important Improvements

1. Add versioned database migrations.
2. Add database constraints and indexes.
3. Add real cash, bank, and mobile banking accounts.
4. Add opening balances for stock, customer due, supplier payable, cash, and bank.
5. Add product cost snapshots for DSR and all stock-out flows.
6. Fix UI encoding, i18n, and mobile tenant switching.
7. Clarify or unify `customers` and `retail_customers`.
8. Improve field-level validation and user-friendly errors.
9. Add reliable daily sales, due, expense, stock movement, and cashbook reports.
10. Add period report logic with opening, movement, and closing balances.

### P2: Nice-To-Have Features

1. Barcode and SKU workflow.
2. POS counter sales.
3. Product import/export.
4. Purchase orders and partial receiving.
5. Supplier returns.
6. Customer and supplier statements.
7. AR/AP aging reports.
8. Stock count and stock adjustment approval.
9. Low-stock alerts.
10. Dashboard widgets for owner-level KPIs.

### Later: Advanced Features

1. Multi-warehouse and branch inventory.
2. FIFO or weighted-average inventory valuation.
3. Batch, expiry, serial, or IMEI tracking.
4. Full chart of accounts.
5. Trial balance, balance sheet, and formal P&L.
6. VAT/tax engine.
7. Route planning and DSR mobile workflow.
8. Commission and incentive management.
9. Workflow approvals.
10. Period close and accounting lock.

## Recommended Fix Sequence

Recommended order:

1. Security and tenant isolation.
2. Runtime wiring.
3. Transaction reversal/void architecture.
4. Ledger sign and overpayment fixes.
5. Sales return integrity.
6. Business-date ledger model.
7. Database constraints and migrations.
8. Core report corrections.
9. UI/i18n/mobile cleanup.
10. Feature expansion.

This order protects existing business data first, then improves reporting trust, then expands features.

