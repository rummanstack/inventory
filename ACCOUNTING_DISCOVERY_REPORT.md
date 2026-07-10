# ACCOUNTING DISCOVERY REPORT

## Scope

This report describes only what exists in the current codebase. It is based on the live backend schema, routes, services, repositories, and frontend pages under `backend/` and `frontend/`.

## 1. Current Accounting Architecture

### High-level shape

The project currently has two accounting-related layers:

1. `Operational source tables and ledgers`
   - Sales, purchases, returns, payments, expenses, payroll, settlements, finance accounts.
   - Multiple due-ledger tables: customer, supplier, DSR, SR, and shop.
   - Finance account balances are maintained in `finance_accounts` and `finance_account_transactions`.

2. `A newer additive double-entry journal layer`
   - `chart_of_accounts`
   - `journal_entries`
   - `journal_lines`
   - `backend/services/journalService.js`
   - Reporting pages: General Ledger, Trial Balance, Balance Sheet, Profit & Loss.

### Central observation

Accounting is **not fully centralized**.

- The journal layer exists and is real.
- The journal is **not the source of truth** for most modules.
- Business modules still keep and read their own ledgers/tables directly.
- The schema comment explicitly states the journal is an **additive layer** for reporting and that existing modules keep their own tables as source of truth.

### Journal design

- Fixed global chart of accounts, no per-tenant customization.
- Tenant-scoped journal entries and journal lines.
- One live non-reversal entry per `(tenant_id, source_type, source_id)` enforced by a unique filtered index.
- Reversal and unreverse support exists.
- Adjustment postings exist for edited transactions.

### Current journal-covered flows

`JournalService` currently posts entries for:

- Sales invoice
- Purchase receipt
- Purchase receipt adjustment
- Customer payment
- Customer payment adjustment
- Supplier payment
- Supplier payment adjustment
- Expense
- Expense adjustment
- Finance manual transaction
- Finance transfer
- Sales return
- Purchase return
- Morning issue
- Settlement
- Payroll run approval
- Payroll payment

### Modules that still bypass journal

These flows update money or balances but do not post to the journal:

- `salaryPaymentService` (`salary_payments`)
- Manual shop due record/collect
- Manual SR due collect
- Manual DSR due settle
- DSR advances
- Retail cash session open/close
- Finance dashboard calculations (reads operational tables, not journal)
- Profit report module (computes from sales/settlements/expenses tables, not journal)

## 2. Existing Database Tables

Only accounting-related tables are listed here.

### Core journal tables

| Table | Purpose | PK | FKs | Important columns | Relationships | Active use | Incomplete / extension evidence |
|---|---|---|---|---|---|---|---|
| `chart_of_accounts` | Fixed account master for journal/reporting | `code` | none | `name`, `type`, `normal_balance`, `is_active` | referenced by `journal_lines.account_code` | Yes; read by journal reports | Schema comment says fixed/global and no per-tenant customization yet |
| `journal_entries` | Journal header rows per business event | `id` | `tenant_id -> tenants`, `created_by -> users`, `reversal_of_entry_id -> journal_entries` | `entry_date`, `source_type`, `source_id`, `memo`, `reversed_at` | one-to-many to `journal_lines`; linked from `payroll_runs` | Yes | No posting UI/API; internal service only |
| `journal_lines` | Debit/credit lines for each journal entry | `id` | `tenant_id -> tenants`, `journal_entry_id -> journal_entries`, `account_code -> chart_of_accounts` | `debit`, `credit` | many-to-one to `journal_entries` | Yes | No evidence of line-level metadata beyond source on header |

### Operational finance tables

| Table | Purpose | PK | FKs | Important columns | Relationships | Active use | Incomplete / extension evidence |
|---|---|---|---|---|---|---|---|
| `finance_accounts` | Cash/bank balances by tenant | `id` | `tenant_id -> tenants` | `type`, `name`, `balance` | referenced by `finance_account_transactions.account_id` | Yes | Only `CASH` and `BANK` types are supported in code |
| `finance_account_transactions` | Cash/bank movement log | `id` | `tenant_id -> tenants`, `account_id -> finance_accounts`, `created_by -> users`, `deleted_by_id -> users` | `transaction_date`, `type`, `debit`, `credit`, `balance_after`, `transfer_id`, `note`, `deleted_at`, `transaction_hash` | written by finance accounts, sales, purchases, payments, expenses, payroll salary payments, due collections | Yes | Acts as operational cash log, not full ledger |
| `expenses` | Expense records | `id` | `created_by -> users`, later `tenant_id -> tenants`, `deleted_by_id -> users` | `expense_date`, `category`, `amount`, `note`, `transaction_hash`, `deleted_at` | read by finance dashboard and profit report; posted to finance and journal | Yes | Expense categories are fixed in service code |
| `retail_cash_sessions` | POS cash drawer/session tracking | `id` | `tenant_id -> tenants`, `opened_by -> users`, `closed_by -> users` | `started_at`, `closed_at`, `opening_cash`, `counted_cash`, `cash_sales_amount`, `expected_cash`, `variance` | POS cash session reporting | Yes | No journal integration found |

### Sales and receivable tables

| Table | Purpose | PK | FKs | Important columns | Relationships | Active use | Incomplete / extension evidence |
|---|---|---|---|---|---|---|---|
| `sales_invoices` | Sales invoice header | `id` | `tenant_id -> tenants`, `customer_id -> customers`, `created_by -> users`, `deleted_by_id -> users` | `invoice_number`, `invoice_date`, `sale_type`, `subtotal`, `discount`, `tax_rate`, `tax_amount`, `total_amount`, `paid_amount`, `due_amount`, `payment_method`, `total_profit`, loyalty fields, `transaction_hash` | one-to-many to `sales_invoice_items`; source for customer due, cash, stock, journal | Yes | Used as source, not derived from journal |
| `sales_invoice_items` | Sales invoice lines | `id` | `tenant_id -> tenants`, `sales_invoice_id -> sales_invoices` | `product_id`, `product_name`, `quantity_pieces`, `actual_sale_price`, `cost_price_snapshot`, `line_total`, `tax_rate`, `tax_amount`, batch snapshot fields | child of `sales_invoices` | Yes | No direct account linkage |
| `customer_due_ledger` | Retail customer receivable ledger | `id` | `tenant_id -> tenants`, `created_by -> users` | `customer_id`, `type`, `debit`, `credit`, `balance_after`, `reference_type`, `reference_id`, `transaction_hash` | driven by sales invoices, returns, and customer payments | Yes | Operational subledger, not journal-backed |
| `customer_payments` | Customer due collection records | `id` | `tenant_id -> tenants`, `created_by -> users`, `deleted_by_id -> users` | `customer_id`, `payment_date`, `amount`, `payment_method`, `note`, `deleted_at`, `transaction_hash` | writes `customer_due_ledger`, `finance_account_transactions`, and journal | Yes | Service hardcodes finance/journal cash handling regardless of stored `payment_method` |
| `sales_returns` | Sales return header | `id` | `tenant_id -> tenants`, `sales_invoice_id -> sales_invoices`, `customer_id -> customers`, `created_by -> users`, `deleted_by_id -> users` | `return_number`, `return_date`, `refund_method`, `total_amount`, `total_profit_adjustment`, `loyalty_points_adjustment`, `transaction_hash` | writes stock, customer due, finance accounts, journal | Yes | No delete/restore route found; create/report only |

### Purchase and payable tables

| Table | Purpose | PK | FKs | Important columns | Relationships | Active use | Incomplete / extension evidence |
|---|---|---|---|---|---|---|---|
| `purchase_receipts` | Purchase header | `id` | `tenant_id -> tenants`, `created_by -> users`, `deleted_by_id -> users` | `purchase_number`, `supplier_id`, `supplier_invoice_no`, `purchase_date`, `discount`, `tax_rate`, `tax_amount`, `total_amount`, `paid_amount`, `due_amount`, `payment_method`, `transaction_hash`, `deleted_at` | one-to-many to `purchase_receipt_items`; source for stock, supplier due, cash, journal | Yes | Source of truth remains operational table |
| `purchase_receipt_items` | Purchase lines | `id` | `tenant_id -> tenants`, `purchase_receipt_id -> purchase_receipts` | `product_id`, `quantity_pieces`, `purchase_price`, `line_total`, `tax_rate`, `tax_amount`, later batch fields | child of `purchase_receipts` | Yes | No account linkage |
| `supplier_due_ledger` | Supplier payable ledger | `id` | `tenant_id -> tenants`, `created_by -> users` | `supplier_id`, `type`, `debit`, `credit`, `balance_after`, `reference_type`, `reference_id`, `transaction_hash` | driven by purchases, payments, returns, discounts | Yes | Operational subledger, separate from journal |
| `supplier_payments` | Supplier payment records | `id` | `tenant_id -> tenants`, `created_by -> users`, `deleted_by_id -> users` | `supplier_id`, `payment_date`, `amount`, `payment_method`, `note`, `deleted_at`, `transaction_hash` | writes supplier due, finance accounts, journal | Yes | None beyond parallel ledger design |
| `purchase_returns` | Purchase return header | `id` | `tenant_id -> tenants`, `supplier_id -> suppliers`, `created_by -> users`, `deleted_by_id -> users` | `return_number`, `return_date`, `total_amount`, `note`, `transaction_hash`, `deleted_at` | one-to-many to `purchase_return_items`; writes stock, supplier due, journal | Yes | Create/delete only; no update/restore route |
| `purchase_return_items` | Purchase return lines | `id` | `tenant_id -> tenants`, `purchase_return_id -> purchase_returns`, `product_id -> products` | `product_name`, `quantity_pieces`, `unit_price`, `line_total` | child of `purchase_returns` | Yes | Minimal line model |

### Field collection / distribution ledgers

| Table | Purpose | PK | FKs | Important columns | Relationships | Active use | Incomplete / extension evidence |
|---|---|---|---|---|---|---|---|
| `dsr_due_ledger` | DSR receivable ledger | `id` | `tenant_id -> tenants`, `created_by -> users` | `dsr_id`, `type`, `debit`, `credit`, `balance_after`, `reference_type`, `reference_id`, `transaction_hash` | written by settlements and manual settle flow | Yes | Manual settle posts cash but not journal |
| `shop_due_ledger` | Shop/customer due ledger for field sales channel | `id` | `tenant_id -> tenants`, `shop_id -> customers`, `created_by -> users` | `type`, `debit`, `credit`, `balance_after`, `business_date`, `reference_type`, `reference_id`, `transaction_hash` | written by settlement shop collections and manual due/collect | Yes | No journal integration found |
| `sr_due_ledger` | Sales rep due/handover ledger | `id` | `tenant_id -> tenants`, `created_by -> users` | `sr_id`, `type`, `debit`, `credit`, `balance_after`, `business_date`, `reference_type`, `reference_id`, `transaction_hash` | written by settlement SR handovers and manual collect | Yes | No journal integration found |
| `issues` | Morning issue header with JSON items | `id` | later `tenant_id -> tenants` | `issue_date`, `dsr_id`, `dsr_name`, `items` | source for stock movements and morning issue journal | Yes | Not normalized into line table |
| `settlements` | Evening settlement header with JSON items and returns | `id` | later `tenant_id -> tenants` | `settlement_date`, `dsr_id`, `issue_ids`, `items`, `extra_returns`, `total_payable`, `discount`, `amount_paid`, `due_amount`, `shop_collections`, `transaction_hash` | source for stock, due ledgers, finance accounts, supplier discounts, journal | Yes | Not normalized into line tables; complex workflow lives in service code |

### Payroll / salary tables

| Table | Purpose | PK | FKs | Important columns | Relationships | Active use | Incomplete / extension evidence |
|---|---|---|---|---|---|---|---|
| `payroll_runs` | Monthly payroll header | `id` | `tenant_id -> tenants`, `journal_entry_id -> journal_entries`, `payment_journal_entry_id -> journal_entries`, `paid_by -> users`, `generated_by -> users`, `approved_by -> users` | `payroll_month`, `status`, totals, `payment_status`, `payment_method`, `paid_at` | parent of payroll run items (via repository, not listed here because table block not captured in this pass) | Yes | Journal-backed only at approve/pay stage |
| `salary_payments` | Direct salary payment log by employee/month | `id` | `tenant_id -> tenants`, `employee_id -> employees`, `created_by -> users` | `payment_date`, `payment_month`, `amount`, `payment_method`, `note`, `transaction_hash` | writes finance accounts only | Yes | No journal integration found |

### Supporting inventory-accounting tables

| Table | Purpose | PK | FKs | Important columns | Relationships | Active use | Incomplete / extension evidence |
|---|---|---|---|---|---|---|---|
| `stock_movements` | Inventory movement log | `id` | `tenant_id -> tenants`, `created_by -> users` | `product_id`, `type`, `quantity_in`, `quantity_out`, `balance_after`, `reference_type`, `reference_id`, `note` | used by sales, purchases, returns, issues, settlements | Yes | Operational inventory log, not accounting ledger |

## 3. Existing Services / Entities

### Core accounting services

| Service / entity | Responsibility |
|---|---|
| `JournalService` | Double-entry posting engine plus report generation for chart of accounts, general ledger, trial balance, balance sheet, and profit & loss |
| `journalRepository` mapped entities | `Account`, `JournalEntry`, `JournalLine` record mapping and reporting queries |
| `FinanceAccountService` | Maintains cash/bank balances and transaction log; also posts journal entries for manual finance transactions and transfers |
| `FinanceDashboardService` | Aggregates finance dashboard metrics from finance accounts, due ledgers, expenses, sales, settlements, and profit report |
| `ProfitService` | Builds operational profit reports from settlements, sales, returns, and expenses; separate from journal P&L |

### Receivable / payable ledgers

| Service / entity | Responsibility |
|---|---|
| `CustomerDueLedgerService` | Retail customer statement, balance, ledger listing, due report |
| `SupplierDueLedgerService` | Supplier statement, balance, ledger listing |
| `DsrDueLedgerService` | DSR statement, balance, balances summary, manual settle |
| `ShopDueLedgerService` | Shop ledger statement plus manual due/collection |
| `SrDueLedgerService` | SR ledger statement plus manual collection |

### Transaction-producing business services

| Service | Responsibility |
|---|---|
| `SalesInvoiceService` | Sales invoice creation, deletion, restore; stock, customer due, finance account, and journal posting |
| `SalesReturnService` | Sales return creation; stock reversal, loyalty adjustment, due/cash refund, journal posting |
| `PurchaseReceiveService` | Purchase create/update/delete/restore; stock, supplier due, finance account, journal posting |
| `PurchaseReturnService` | Purchase return create/delete; stock out, supplier due credit, journal posting |
| `CustomerPaymentService` | Customer due collection create/update/delete/restore; due ledger, finance account, journal posting |
| `SupplierPaymentService` | Supplier payment create/update/delete/restore; due ledger, finance account, journal posting |
| `ExpenseService` | Expense create/update/delete/restore; finance account and journal posting |
| `IssueService` | Morning issue stock movement and journal transfer from inventory to goods-with-DSR |
| `SettlementService` | Evening settlement stock, due-ledgers, cash collection, supplier discount, SR/shop adjustments, journal posting |
| `PayrollService` | Salary structures, payroll runs, approval, payment; posts journal on approve/pay |
| `SalaryPaymentService` | Direct employee salary payments and active-day tracking; finance account posting only |

## 4. Existing APIs

All backend routes are mounted under `/api`.

### Journal and report APIs

| Endpoint | Method | Purpose | Permission | Status |
|---|---|---|---|---|
| `/api/journal/accounts` | GET | List active chart of accounts | any of `view_general_ledger`, `view_trial_balance`, `view_balance_sheet`, `view_profit_and_loss` | Complete |
| `/api/journal/general-ledger` | GET | General ledger lines by account/date range | `view_general_ledger` | Complete |
| `/api/journal/trial-balance` | GET | Trial balance as of date | `view_trial_balance` | Complete |
| `/api/journal/balance-sheet` | GET | Balance sheet as of date | `view_balance_sheet` | Complete |
| `/api/journal/profit-and-loss` | GET | Journal-based P&L by period | `view_profit_and_loss` | Complete |

### Operational profit / finance report APIs

| Endpoint | Method | Purpose | Permission | Status |
|---|---|---|---|---|
| `/api/profit-report` | GET | Operational profit overview | `manage_profit_report` | Complete |
| `/api/profit-report/by-dsr` | GET | Profit by DSR | `manage_profit_report` | Complete |
| `/api/profit-report/by-product` | GET | Profit by product | `manage_profit_report` | Complete |
| `/api/profit-report/by-category` | GET | Profit by category | `manage_profit_report` | Complete |
| `/api/profit-report/by-customer` | GET | Profit by customer | `manage_profit_report` | Complete |
| `/api/finance-dashboard` | GET | Finance summary dashboard | `view_finance_dashboard` or `view_state` | Complete |
| `/api/finance-dashboard/range-report` | GET | Date-range finance report | `view_finance_dashboard` | Complete |
| `/api/finance-dashboard/monthly-trend` | GET | 12-month trend series | `view_state` | Complete |

### Finance account APIs

| Endpoint | Method | Purpose | Permission | Status |
|---|---|---|---|---|
| `/api/finance-accounts` | GET | List cash/bank accounts | `manage_finance_accounts` | Complete |
| `/api/finance-accounts/transactions` | GET | Paginated finance transactions | `manage_finance_accounts` | Complete |
| `/api/finance-accounts/transactions` | POST | Manual deposit/withdrawal | `manage_finance_accounts` | Complete |
| `/api/finance-accounts/transfers` | POST | Transfer between cash and bank | `manage_finance_accounts` | Complete |
| `/api/finance-accounts/transactions/:id` | DELETE | Reverse/delete finance transaction | `manage_finance_accounts` | Complete |

### Expense APIs

| Endpoint | Method | Purpose | Permission | Status |
|---|---|---|---|---|
| `/api/expenses` | GET | Expense report | `manage_expenses` or `view_state` | Complete |
| `/api/expenses/range` | GET | Expense range report | `manage_expenses` | Complete |
| `/api/expenses/trash` | GET | Trashed expenses | `manage_expenses` | Complete |
| `/api/expenses` | POST | Create expense | `manage_expenses` | Complete |
| `/api/expenses/:id` | PATCH | Update expense | `manage_expenses` | Complete |
| `/api/expenses/:id` | DELETE | Soft-delete expense | `manage_expenses` | Complete |
| `/api/expenses/:id/restore` | POST | Restore expense | `manage_expenses` | Complete |
| `/api/expenses/:id/permanent` | DELETE | Permanent delete | `permanent_delete` | Complete |

### Customer receivable APIs

| Endpoint | Method | Purpose | Permission | Status |
|---|---|---|---|---|
| `/api/customer-due-ledger/due-report` | GET | Aggregated customer due report | `manage_retail_customer_due` | Complete |
| `/api/customer-due-ledger` | GET | Customer due ledger list | `view_retail_customer_due` | Complete |
| `/api/customer-due-ledger/statement` | GET | Customer due statement | `view_retail_customer_due` | Complete |
| `/api/customer-due-ledger/balance` | GET | Current customer due balance | `view_retail_customer_due` | Complete |
| `/api/customer-payments/trash` | GET | Trashed due collections | `manage_retail_due_collection` | Complete |
| `/api/customer-payments` | GET | Customer payment list | `view_retail_due_collection` | Complete |
| `/api/customer-payments/:id` | GET | Customer payment detail | `view_retail_due_collection` | Complete |
| `/api/customer-payments` | POST | Create due collection | `manage_retail_due_collection` | Complete |
| `/api/customer-payments/:id` | PUT | Update due collection | `manage_retail_due_collection` | Complete |
| `/api/customer-payments/:id` | DELETE | Delete due collection | `manage_retail_due_collection` | Complete |
| `/api/customer-payments/:id/restore` | POST | Restore due collection | `manage_retail_due_collection` | Complete |

### Supplier payable APIs

| Endpoint | Method | Purpose | Permission | Status |
|---|---|---|---|---|
| `/api/supplier-due-ledger` | GET | Supplier due ledger list | `view_supplier_statement` | Complete |
| `/api/supplier-due-ledger/statement` | GET | Supplier statement | `view_supplier_statement` | Complete |
| `/api/supplier-due-ledger/balance` | GET | Supplier balance | `view_supplier_statement` | Complete |
| `/api/supplier-payments/trash` | GET | Trashed supplier payments | `manage_supplier_payments` | Complete |
| `/api/supplier-payments/reports` | GET | Supplier payment report | `manage_supplier_payments` | Complete |
| `/api/supplier-payments` | GET | Supplier payment list | `view_supplier_payments` | Complete |
| `/api/supplier-payments/:id` | GET | Supplier payment detail | `view_supplier_payments` | Complete |
| `/api/supplier-payments` | POST | Create supplier payment | `manage_supplier_payments` | Complete |
| `/api/supplier-payments/:id` | PUT | Update supplier payment | `manage_supplier_payments` | Complete |
| `/api/supplier-payments/:id` | DELETE | Delete supplier payment | `manage_supplier_payments` | Complete |
| `/api/supplier-payments/:id/restore` | POST | Restore supplier payment | `manage_supplier_payments` | Complete |

### Purchase APIs

| Endpoint | Method | Purpose | Permission | Status |
|---|---|---|---|---|
| `/api/purchase-receive/reports` | GET | Purchase report | `manage_purchases` | Complete |
| `/api/purchase-receive/trash` | GET | Trashed purchase receipts | `manage_purchases` | Complete |
| `/api/purchase-receive` | GET | Purchase receipt list | `view_purchases` | Complete |
| `/api/purchase-receive/:id` | GET | Purchase receipt detail | `view_purchases` | Complete |
| `/api/purchase-receive` | POST | Create purchase receipt | `manage_purchases` | Complete |
| `/api/purchase-receive/:id` | PUT | Update purchase receipt | `manage_purchases` | Complete |
| `/api/purchase-receive/:id` | DELETE | Delete purchase receipt | `manage_purchases` | Complete |
| `/api/purchase-receive/:id/restore` | POST | Restore purchase receipt | `manage_purchases` | Complete |
| `/api/purchase-returns` | GET | Purchase return list | `view_purchase_returns` | Complete |
| `/api/purchase-returns/:id` | GET | Purchase return detail | `view_purchase_returns` | Complete |
| `/api/purchase-returns` | POST | Create purchase return | `manage_purchase_returns` | Complete |
| `/api/purchase-returns/:id` | DELETE | Delete purchase return | `manage_purchase_returns` | Partial |

### Sales APIs

| Endpoint | Method | Purpose | Permission | Status |
|---|---|---|---|---|
| `/api/sales-invoices/trash` | GET | Trashed sales invoices | `manage_retail_sales_invoices` | Complete |
| `/api/sales-invoices/reports/daily` | GET | Daily sales report | `manage_retail_daily_sales_report` or `view_state` | Complete |
| `/api/sales-invoices` | GET | Sales invoice list | `view_retail_sales_invoices` or `view_state` | Complete |
| `/api/sales-invoices/:id` | GET | Sales invoice detail | `view_retail_sales_invoices` | Complete |
| `/api/sales-invoices` | POST | Create sales invoice | `manage_retail_sales_invoices` | Complete |
| `/api/sales-invoices/:id` | DELETE | Delete sales invoice | `manage_retail_sales_invoices` | Complete |
| `/api/sales-invoices/:id/restore` | POST | Restore sales invoice | `manage_retail_sales_invoices` | Complete |
| `/api/sales-returns/reports` | GET | Sales return report | `manage_retail_sales_returns` | Complete |
| `/api/sales-returns` | GET | Sales return list | `view_retail_sales_returns` | Complete |
| `/api/sales-returns/:id` | GET | Sales return detail | `view_retail_sales_returns` | Complete |
| `/api/sales-returns` | POST | Create sales return | `manage_retail_sales_returns` | Partial |

### DSR / field finance APIs

| Endpoint | Method | Purpose | Permission | Status |
|---|---|---|---|---|
| `/api/dsr-advances` | GET | DSR advance report | `manage_dsr_finance` | Complete |
| `/api/dsr-advances` | POST | Create DSR advance | `manage_dsr_finance` | Complete |
| `/api/dsr-advances/:id` | PATCH | Update DSR advance | `manage_dsr_finance` | Complete |
| `/api/dsr-advances/:id` | DELETE | Delete DSR advance | `manage_dsr_finance` | Complete |
| `/api/dsr-due-ledger/balances` | GET | Summary of DSR balances | `view_state` | Complete |
| `/api/dsr-due-ledger` | GET | DSR due ledger list | `view_state` | Complete |
| `/api/dsr-due-ledger/statement` | GET | DSR due statement | `view_state` | Complete |
| `/api/dsr-due-ledger/balance` | GET | DSR due balance | `view_state` | Complete |
| `/api/dsr-due-ledger/settle` | POST | Manual DSR due settlement | `manage_dsr_finance` | Complete |
| `/api/issues` | GET | Morning issue list | `view_state` | Complete |
| `/api/issues` | POST | Create morning issue | `create_issues` | Complete |
| `/api/issues/:id` | PUT | Update morning issue | `update_issues` | Complete |
| `/api/settlements/reports` | GET | Settlement report | `create_settlements` | Complete |
| `/api/settlements` | GET | Settlement list | `view_state` | Complete |
| `/api/settlements` | POST | Create settlement | `create_settlements` | Complete |
| `/api/settlements/:id` | PUT | Update settlement | `update_settlements` | Complete |

### Shop / SR due APIs

| Endpoint | Method | Purpose | Permission | Status |
|---|---|---|---|---|
| `/api/shop-due-ledger` | GET | Shop due ledger list | `view_customers` | Complete |
| `/api/shop-due-ledger/statement` | GET | Shop due statement | `view_customers` | Complete |
| `/api/shop-due-ledger/balance` | GET | Shop due balance | `view_customers` | Complete |
| `/api/shop-due-ledger/record-due` | POST | Manual shop due record | `manage_customers` | Complete |
| `/api/shop-due-ledger/collect` | POST | Manual shop due collect | `manage_customers` | Complete |
| `/api/sr-due-ledger` | GET | SR due ledger list | `view_srs` | Complete |
| `/api/sr-due-ledger/statement` | GET | SR due statement | `view_srs` | Complete |
| `/api/sr-due-ledger/balance` | GET | SR due balance | `view_srs` | Complete |
| `/api/sr-due-ledger/collect` | POST | Manual SR due collect | `manage_srs` | Complete |

### Payroll / salary APIs

| Endpoint | Method | Purpose | Permission | Status |
|---|---|---|---|---|
| `/api/payroll/salary-structures` | GET | List salary structures | `view_payroll` | Complete |
| `/api/payroll/salary-structures` | POST | Save salary structure | `generate_payroll` | Complete |
| `/api/payroll/runs` | GET | List payroll runs | `view_payroll` | Complete |
| `/api/payroll/runs/:id` | GET | Get payroll run detail | `view_payroll` | Complete |
| `/api/payroll/runs/generate` | POST | Generate payroll run | `generate_payroll` | Complete |
| `/api/payroll/runs/:id/approve` | POST | Approve payroll and post journal accrual | `approve_payroll` | Complete |
| `/api/payroll/runs/:id/pay` | POST | Pay payroll and post journal payment | `approve_payroll` | Complete |
| `/api/payroll/runs/:id/payslips/:employeeId` | GET | Payslip data | `view_payroll` | Complete |
| `/api/payroll/register` | GET | Payroll register | `view_payroll` | Complete |
| `/api/salary-payments/overview` | GET | Direct salary payment overview | `manage_payroll` | Complete |
| `/api/salary-payments/range` | GET | Salary payment range report | `manage_payroll` | Complete |
| `/api/salary-payments` | POST | Record direct salary payment | `manage_payroll` | Complete |
| `/api/salary-payments/active-days` | POST | Set employee active days for month | `manage_payroll` | Complete |
| `/api/salary-payments/:id` | DELETE | Delete direct salary payment | `manage_payroll` | Complete |

## 5. Existing Frontend Pages

| Route | Purpose | Current functionality | Missing / limited behavior visible in current code |
|---|---|---|---|
| `/general-ledger` | Journal line report | Account filter, date range, running balance when a single account is selected | No drill-through from source rows; report-only |
| `/trial-balance` | Trial balance | As-of date, per-account debit/credit/balance, balanced flag | No export/print logic in page itself |
| `/balance-sheet` | Balance sheet | Assets, liabilities, equity, retained earnings, balance identity check | No period comparison; no cash flow linkage |
| `/profit-and-loss` | Journal-based P&L | Date range, revenue/COGS/expense/net profit layout | No drill-through to source transactions |
| `/profit` | Operational profit reporting | Overview, day/week/month views, breakdowns by DSR/product/customer/category, export/print | Separate logic from journal P&L |
| `/finance-dashboard` | Operational finance dashboard | Cash, due totals, expenses, profit, inflow/outflow, recent transactions, range reports | Not a formal accounting statement set |
| `/finance-accounts` | Cash/bank management | Manual deposit/withdrawal/transfer, transaction list, delete, export/print | Only cash/bank accounts; no reconciliations |
| `/expenses` | Expense management/reporting | Create/update/delete/restore, reports | Cash-only accounting treatment in service |
| `/retailer/customer-due` | Customer statement | Statement, balances, loyalty points, export/print, copy reference | Statement only; no direct collect action here |
| `/retailer/due-collection` | Customer payment management | Create/update/delete/restore customer collections | Separate from statement page |
| `/supplier-statement` | Supplier payable statement | Statement, balances, export/print, copy reference | Statement only; payment actions are separate |
| `/supplier-payments` | Supplier payment management | Create/update/delete/restore and report APIs | Separate from supplier statement |
| `/purchase-receive` | Purchases | Create/update/delete/restore purchases and purchase reports | Operational source page, not journal-focused |
| `/purchase-returns` | Purchase returns | List/create/delete purchase returns | No update/restore workflow |
| `/retailer/sales-invoices` | Sales invoices | Create/delete/restore, daily report | No edit route; journal handled internally |
| `/retailer/sales-return` | Sales returns | List/create, report | No delete/restore/edit workflow in route layer |
| `/dsr-finance` | DSR due ledger and manual settlement | Statement, balances, manual settle, export/print, copy reference | Manual settle hits cash but no journal |
| `/shop-due-ledger` | Shop due statement and manual due/collect | Statement, record due, collect due, export/print | No journal integration |
| `/sr-due-ledger` | SR due statement and collection | Statement, collect due, export/print | No journal integration |
| `/hr/payroll` | Payroll run management | Salary structures, run generation, approval, payment | No dedicated journal review UI |
| `/hr/salary` | Direct employee salary payments | Overview, active days, payment history, direct salary payment, delete | Uses finance accounts only, not journal |
| `/retailer/cash-sessions` | POS cash session history | Session summaries and reports | No journal integration found |

## 6. Existing Reports

| Report | Status | Evidence |
|---|---|---|
| Trial Balance | Exists | `/api/journal/trial-balance`, `/trial-balance` |
| Balance Sheet | Exists | `/api/journal/balance-sheet`, `/balance-sheet` |
| Profit & Loss | Exists | Journal-based `/api/journal/profit-and-loss` and separate operational `/api/profit-report` |
| Cash Flow | Partially exists | Finance dashboard exposes inflow/outflow and range cash flow, but no dedicated cash-flow statement page/API in accounting module |
| General Ledger | Exists | `/api/journal/general-ledger`, `/general-ledger` |
| Customer Ledger | Exists | `customer_due_ledger` APIs and `/retailer/customer-due` |
| Supplier Ledger | Exists | `supplier_due_ledger` APIs and `/supplier-statement` |
| Cash Book | Missing | No dedicated cash book route/page/report found |
| Bank Book | Missing | No dedicated bank book route/page/report found |

## 7. Current Business Flows

### Sales

1. `SalesInvoiceService.createSalesInvoiceRecord`
2. Writes:
   - `sales_invoices`
   - `sales_invoice_items`
   - `stock_movements`
   - `customer_due_ledger` if due exists
   - `finance_account_transactions` if paid amount > 0
   - journal via `JournalService.postSalesInvoice`
3. Journal effect:
   - Dr Cash
   - Dr Accounts Receivable
   - Cr Sales Revenue
   - Cr Tax Payable
   - Dr COGS
   - Cr Inventory

### Purchase

1. `PurchaseReceiveService.createPurchaseReceiptRecord`
2. Writes:
   - `purchase_receipts`
   - `purchase_receipt_items`
   - `stock_movements`
   - `supplier_due_ledger`
   - `finance_account_transactions` if paid amount > 0
   - journal via `JournalService.postPurchaseReceipt`
3. Journal effect:
   - Dr Inventory
   - Cr Accounts Payable
   - Cr Cash or Bank

### Sales Return

1. `SalesReturnService.saveSalesReturn`
2. Writes:
   - `sales_returns`
   - sales return item rows via repository
   - `stock_movements`
   - `customer_due_ledger` if due adjustment used
   - `finance_account_transactions` for cash refund/overflow refund
   - journal via `JournalService.postSalesReturn`
3. Journal effect:
   - Dr Sales Returns
   - Cr Accounts Receivable and/or Cash
   - Dr Inventory
   - Cr COGS

### Purchase Return

1. `PurchaseReturnService.savePurchaseReturn`
2. Writes:
   - `purchase_returns`
   - `purchase_return_items`
   - `stock_movements`
   - `supplier_due_ledger`
   - journal via `JournalService.postPurchaseReturn`
3. Journal effect:
   - Dr Accounts Payable
   - Cr Inventory

### Expenses

1. `ExpenseService.saveExpense`
2. Writes:
   - `expenses`
   - `finance_account_transactions`
   - journal via `JournalService.postExpense`
3. Journal effect:
   - Dr Operating Expenses
   - Cr Cash

### Payroll

1. `PayrollService.generatePayroll`
   - writes payroll run and items
   - no journal yet
2. `PayrollService.approvePayroll`
   - posts journal accrual via `postPayrollRun`
   - updates `payroll_runs.journal_entry_id`
3. `PayrollService.payPayroll`
   - writes finance account withdrawal
   - posts journal payment via `postPayrollPayment`
   - updates `payroll_runs.payment_journal_entry_id`

### Direct salary payment

1. `SalaryPaymentService.recordPayment`
2. Writes:
   - `salary_payments`
   - `finance_account_transactions`
3. No journal posting found

### Customer Payment

1. `CustomerPaymentService.createCustomerPaymentRecord`
2. Writes:
   - `customer_payments`
   - `customer_due_ledger`
   - `finance_account_transactions`
   - journal via `postCustomerPayment`

### Supplier Payment

1. `SupplierPaymentService.createSupplierPaymentRecord`
2. Writes:
   - `supplier_payments`
   - `supplier_due_ledger`
   - `finance_account_transactions`
   - journal via `postSupplierPayment`

### Inventory Adjustment

No standalone journalized inventory-adjustment business service was identified.

- Stock moves happen through sales, purchases, returns, issues, settlements, damaged stock handling, and product stock operations.
- `Stock Adjustment` account exists in the chart of accounts and P&L breakdown, but no posting method using it was found in `JournalService`.

### Loan / Advance

- Employee advances and loans exist in HR finance workflows, but no journal posting was identified in the accounting layer.
- DSR advances exist through `dsr-advances`; no journal posting found.

### DSR Settlement

1. `SettlementService.createSettlementRecord` / update
2. Writes:
   - `settlements`
   - `stock_movements`
   - `dsr_due_ledger`
   - optional `finance_account_transactions` for cash received
   - optional supplier discount records
   - optional `sr_due_ledger`
   - optional `shop_due_ledger`
   - journal via `postSettlement`

### Cash receipt / bank payment

- Cash receipt behavior exists through customer payments, DSR settle, shop collect, SR collect, settlement cash receipt, and finance manual deposit.
- Bank payment behavior exists through supplier payments, payroll pay with bank, finance transfers, and manual bank withdrawal/deposit.
- Only some of these go through the journal.

## 8. Journal Engine Analysis

### Exists

Yes. The project has a real journal engine in `backend/services/journalService.js`.

### How it works

- Validates non-empty lines.
- Validates debits equal credits within a tolerance.
- Inserts one `journal_entries` row and multiple `journal_lines`.
- Supports:
  - `post`
  - `reverse`
  - `unreverse`
  - `reverseAllForSource`
  - `unreverseAllForSource`
  - `replace`

### Which services use it

- `SalesInvoiceService`
- `PurchaseReceiveService`
- `CustomerPaymentService`
- `SupplierPaymentService`
- `ExpenseService`
- `FinanceAccountService`
- `SalesReturnService`
- `PurchaseReturnService`
- `IssueService`
- `SettlementService`
- `PayrollService`

### Which modules bypass it

- `SalaryPaymentService`
- `DsrDueLedgerService` manual settle
- `ShopDueLedgerService`
- `SrDueLedgerService`
- `Dsr advances`
- `Retail cash sessions`
- `ProfitService`
- `FinanceDashboardService`

### Whether it follows double-entry correctly

Based on the service code, yes for the flows it covers:

- It enforces balanced entries before insert.
- Reversals mirror original posted lines.
- Update adjustments post deltas.
- Balance Sheet retained earnings logic is explicit.

### Important limitations

- The journal is report-oriented, not authoritative.
- There is no public journal-entry creation API.
- Some money-moving modules do not use the journal at all.
- `customer_payments.payment_method` is stored, but journal posting always treats customer payment as cash because the service hardcodes finance account type `CASH`.

## 9. Strengths

- A real double-entry journal exists.
- Trial Balance, Balance Sheet, General Ledger, and P&L are implemented.
- Journal posting is transactional inside major business flows.
- Reversal and restore handling is better than a simple append-only design.
- Sales and purchase flows include both inventory and financial journal effects.
- Payroll accrual and payroll payment are journalized.

## 10. Weaknesses

- Accounting is split across many operational ledgers and one additive journal.
- Journal is not the primary source of truth.
- Multiple receivable/payable ledgers exist outside the journal.
- Direct salary payments bypass journal.
- Manual shop/SR/DSR due collection flows bypass journal.
- Profit reporting is separate from journal P&L and uses different source logic.
- Cash flow is dashboard-oriented rather than a formal accounting statement.

## 11. Missing Features

No code evidence was found for:

- Fiscal year master
- Accounting period master
- Opening balances for GL accounts
- Closing entries
- Voucher system (`payment voucher`, `receipt voucher`, `contra voucher`, `journal voucher`)
- Cash book
- Bank book
- Dedicated cash flow statement in accounting module
- Customer/supplier subledger linkage back into GL accounts as first-class posted entities
- Per-tenant chart of accounts customization
- Journal posting for direct salary payments
- Journal posting for manual shop/SR/DSR due collection/settlement

## 12. Architectural Concerns

### Not centralized

The current design is hybrid:

- business modules write their own ledgers and balances
- the journal is added afterward for reporting

This means there is **no single accounting source of truth**.

### Duplicate accounting logic

Equivalent economic events are represented in multiple places:

- sales: invoice table + stock movements + customer due ledger + finance transactions + journal
- purchases: receipt table + stock movements + supplier due ledger + finance transactions + journal
- settlements: settlement table + stock movements + DSR due ledger + finance transactions + SR/shop ledgers + journal

### Parallel reporting systems

- Journal P&L uses `journal_entries` / `journal_lines`
- Profit module uses settlements, sales, returns, and expenses directly

These are separate reporting engines.

### Partial journal adoption

The journal covers many core ERP flows, but not all cash/balance movements.

### Operational balance mutation remains direct

Modules still directly update:

- `current_due`
- `finance_accounts.balance`
- ledger running balances

That confirms the app is **not event-driven around a central accounting engine**.

## Gap Analysis

### Existing features

- Fixed chart of accounts
- Double-entry journal
- General Ledger
- Trial Balance
- Balance Sheet
- Journal-based Profit & Loss
- Operational profit report
- Finance accounts (cash/bank)
- Expense accounting
- Customer due ledger
- Supplier due ledger
- DSR due ledger
- SR due ledger
- Shop due ledger
- Sales, purchase, return, payment posting
- Payroll accrual and payroll payment journalization

### Partially implemented features

- Cash flow: dashboard metrics exist, formal accounting statement does not
- Payroll accounting: payroll run/pay is journalized, direct salary payment is not
- Inventory accounting: major flows post inventory and COGS, but no standalone stock-adjustment journal flow was found
- Purchase returns and sales returns: present, but route surfaces are narrower than other modules

### Missing features

- Fiscal year / accounting period
- Closing process
- GL opening balances
- Voucher subsystem
- Cash book / bank book
- Dedicated cash flow statement
- Per-tenant COA customization

### Architectural problems

- Journal is additive, not authoritative
- Multiple operational ledgers duplicate accounting state
- Some cash movements bypass journal
- Two different profit-reporting models coexist

### Technical debt

- JSON-heavy `issues` and `settlements` structures push accounting logic into service code
- Running balances are stored in many subledgers separately
- Direct balance updates on finance accounts and due ledgers increase reconciliation risk
- Accounting behavior is spread across many services instead of one fully authoritative posting boundary

