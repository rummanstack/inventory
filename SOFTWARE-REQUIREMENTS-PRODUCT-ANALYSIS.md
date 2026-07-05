# StockLedger Software Requirements & Product Analysis

Date: 2026-07-05

## Analysis Scope

This report is based on repository inspection only. No application code was modified.

Evidence reviewed includes:

- Root documentation: `CLAUDE.md`, `TENANT-FEATURE-PERMISSION-MAP.md`, deployment guides.
- Backend architecture: `backend/composition.js`, `backend/app.js`, `backend/routes/api.js`, controllers, services, repositories, middleware, tests, and database schema.
- Frontend architecture: `frontend/src/app/routes.js`, `frontend/src/app/App.jsx`, `frontend/src/app/useInventoryApp.jsx`, feature modules, API clients, UI components, and landing pages.
- Deployment configuration: `template.yaml`, `samconfig.toml`, `vercel.json`, `frontend/render.yaml`.
- Verification attempted: frontend production build succeeded; backend tests timed out after 120 seconds, so backend test execution status is inconclusive.

## Executive Summary

StockLedger is a multi-tenant SaaS platform for inventory, retail POS, dealer/distribution operations, due tracking, supplier purchasing, finance, reporting, warranty/repair, HR, and tenant administration.

The project is significantly beyond a prototype. It has a large implemented feature surface, a layered backend, a React SPA frontend, tenant feature flags, role-based permissions, ledger-style business logic, report export capabilities, and multiple deployment targets.

The product is strongest for Bangladeshi SMBs that sell physical products and need a practical operating system for stock, sales, dues, cash, supplier payments, and DSR settlement workflows.

The main risks are operational and commercial readiness rather than basic feature availability. Critical issues include committed database credentials in deployment config, application-level tenant isolation without database RLS, password reset email not yet implemented, wildcard AWS CORS defaults, backend test run timeout, and missing SaaS billing/onboarding automation.

## Product Vision

StockLedger aims to replace notebooks, spreadsheets, and disconnected shop records with a single cloud-based system for managing inventory, POS sales, DSR operations, due collection, purchases, cash/bank accounts, and profit reporting.

The intended product position is:

> A localized inventory, POS, due collection, and DSR settlement SaaS for Bangladeshi retailers, wholesalers, dealers, distributors, and pharmacies.

## Business Goals

- Help product-based SMBs maintain accurate stock and sales records.
- Reduce leakage from unpaid customer/shop dues and undocumented supplier payments.
- Speed up daily counter sales, invoice generation, and DSR settlement.
- Give owners real-time visibility into cash, dues, stock value, damaged stock, and profit.
- Support multiple business types through tenant features and business-type defaults.
- Enable SaaS monetization using feature plans, role permissions, and platform tenant administration.

## Target Audience

Evidence from the landing page and i18n copy identifies the target audience as:

- Grocery and general stores.
- Pharmacies and medical shops.
- Electronics retailers.
- Clothing and fashion shops.
- Hardware and tools shops.
- FMCG distributors.
- Wholesale traders.
- Multi-branch businesses.
- Dealer/distribution businesses with DSR workflows.

## Problem This Software Solves

The code and landing copy indicate these customer problems:

- Stock numbers do not match after sales and purchases.
- Customer and shop dues are difficult to track and collect.
- DSR morning issue and evening settlement are slow and error-prone.
- Business owners cannot see daily profit clearly.
- Cash at the end of the day does not match sales records.
- Supplier payments are recorded manually and easily forgotten.
- Owners cannot check the business remotely.
- Serial/IMEI and warranty records are difficult to track for electronics businesses.
- Pharmacy/grocery-style batch and expiry tracking requires specialized handling.

## SaaS Type

StockLedger is a vertical SMB SaaS product with characteristics of:

- Inventory management.
- Retail POS.
- Light ERP.
- Dealer/distribution management.
- Finance and due ledger management.
- Reporting and owner dashboard.
- Multi-tenant business administration.

## Core Business Workflows

### Retail POS Workflow

1. Configure products, categories, brands, and prices.
2. Open or use a retail cash session.
3. Create quick sale or sales invoice.
4. Apply tax, promotions, loyalty, serial/IMEI, or batch logic where applicable.
5. Update stock automatically.
6. Record customer due or payment.
7. Print receipt or invoice.
8. Report sales, returns, cash session, and profit.

### Purchase Workflow

1. Create supplier.
2. Record purchase receipt.
3. Receive product quantities into stock.
4. Record supplier payment or supplier due.
5. Update supplier ledger and finance account.
6. View supplier statement and purchase reports.

### DSR Distribution Workflow

1. Create DSRs and shops.
2. Issue stock in the morning.
3. DSR sells in the field.
4. Evening settlement records sold, returned, damaged, paid, and due amounts.
5. DSR/shop due ledgers update.
6. Reports and dashboard reflect field activity.

### Finance Workflow

1. Manage cash and bank accounts.
2. Record deposits, withdrawals, and transfers.
3. Post payments from purchases, customer collections, expenses, and settlements.
4. Review finance dashboard, net position, cash in hand, bank balance, dues, and profit.

### Platform SaaS Workflow

1. System developer creates tenant organization.
2. Tenant receives default features based on business type.
3. Platform admin configures feature flags.
4. Tenant roles receive permissions.
5. Users operate only inside authorized tenant and feature scope.

## User Roles

The code defines these roles:

| Role | Purpose |
|---|---|
| `system_developer` | Platform-level root user with unconditional access. |
| `super_admin` | Tenant owner/admin; can manage sub-role permissions within configured ceiling. |
| `admin` | Tenant administrative user, permissions configurable. |
| `manager` | Operational management user, permissions configurable. |
| `operator` | Frontline operational user, permissions configurable. |

## User Journey

### Business Owner

1. Receives organization code and login.
2. Logs in and lands on dashboard.
3. Adds products, suppliers, customers, staff, and opening stock.
4. Uses daily POS, purchase, settlement, and due collection workflows.
5. Reviews dashboard, reports, stock alerts, dues, and profit.
6. Exports reports or backups when needed.

### Cashier or Operator

1. Logs in with limited permissions.
2. Uses quick sale, invoices, customer due, or assigned operational pages.
3. Prints receipts.
4. Cannot access settings or restricted modules unless granted.

### Platform Admin

1. Logs in as `system_developer`.
2. Creates and manages tenant organizations.
3. Enables/disables tenant features.
4. Switches active organization.
5. Reviews system health, error logs, backup, contact messages, and visitor chats.

## Product Strengths

- Broad feature coverage across POS, inventory, DSR, finance, supplier, customer, warranty, repair, and HR.
- Strong localization for Bangladesh, including Bangla UI support and BDT pricing copy.
- Tenant feature flags allow SaaS plan packaging.
- Permission model supports configurable tenant roles.
- Ledger-style business logic improves auditability for stock, dues, and finance.
- Backend tests exist for many critical business flows.
- Frontend uses lazy-loaded routes and a consistent feature module structure.
- Report export, print, PDF, Excel, and backup capabilities exist.
- Landing page and product positioning are already present.

## Product Weaknesses

- Tenant isolation is application-enforced, not database-enforced with RLS.
- A database connection string is present in `samconfig.toml`; credentials must be rotated and removed from source control.
- Password reset token flow exists, but email delivery is not implemented.
- AWS CORS configuration currently allows wildcard origins.
- Backend tests did not complete within the 120-second run.
- Rate limiting is in-memory and not distributed.
- Frontend build shows large image assets and a large main chunk warning.
- No subscription billing or self-service plan upgrade flow found.
- No true offline-first POS mode found.
- No payment gateway, accounting, e-commerce, SMS, or WhatsApp integration found.

## Core Modules

| Module | Evidence |
|---|---|
| Dashboard | `frontend/src/features/dashboard`, `/dashboard` route |
| Products and inventory | `products`, `stock_movements`, product services/routes/pages |
| POS and retail sales | Quick sale, sales invoices, sales returns, cash sessions |
| Customer due | Retail customers, customer due ledger, customer payments |
| DSR distribution | DSRs, morning issue, evening settlement, DSR due ledger |
| Shops and SRs | Customers/shops, shop due ledger, SRs, SR due ledger |
| Suppliers and purchases | Suppliers, purchase receive, supplier payments, supplier discounts, supplier statement |
| Finance | Finance accounts, finance dashboard, expenses, profit |
| Warranty and repair | Product serials, warranty claims, repair jobs |
| Pharmacy/batch | Generic medicines, manufacturers, drug batches, batch sales report |
| HR/payroll | Employees, salary payments |
| Settings | Users, permissions, organization settings, security |
| Platform | Tenants, tenant features, backup, visitor chats, contact messages, system health, error logs |
| Reports | Daily reports, sales, purchase, stock movement, settlement, supplier payment, customer due, cash session, damaged stock, batch sales |

## Existing Features

- Multi-tenant organizations.
- Tenant status and subscription active checks.
- Tenant feature flags.
- Role-based permissions.
- Session-based authentication using httpOnly cookie.
- Bearer token support.
- Login history and lockout.
- Password reset token creation and reset endpoint.
- Product catalog.
- Categories, brands, manufacturers, generic medicines.
- Stock movement ledger.
- Manual stock updates and opening stock.
- Low stock alerts.
- Damaged stock.
- Serial/IMEI tracking.
- Warranty claims.
- Repair jobs.
- Quotations and trade-ins.
- Retail quick sale.
- Retail sales invoices.
- Sales returns.
- Retail promotions.
- Customer loyalty.
- Retail cash sessions.
- Retail customers.
- Customer due ledger and payment collection.
- DSRs, SRs, shops.
- Morning issue and evening settlement.
- DSR, SR, and shop due ledgers.
- DSR targets.
- Suppliers.
- Purchase receive.
- Supplier due ledger.
- Supplier payments and discounts.
- Finance accounts and transactions.
- Expenses.
- Profit reports.
- Finance dashboard.
- HR employees.
- Salary payments.
- Audit logs and activity logs.
- Help desk.
- Contact form and visitor chat.
- Platform tenant management.
- Database backup/export.
- System health and error logs.
- Print, PDF, and XLSX report export.
- Landing, pricing, terms, privacy, and founder pages.

## Missing or Incomplete Features

- Automated password reset email delivery.
- Production-grade secret management.
- Subscription billing and plan enforcement tied to payments.
- Self-service signup and tenant onboarding.
- Payment gateway integration.
- Accounting integration.
- E-commerce integration.
- SMS/WhatsApp notifications.
- Native mobile app.
- Offline-first POS.
- Multi-branch or multi-warehouse model.
- DB-level row-level security.
- Distributed rate limiting.
- CI/CD pipeline evidence.
- Complete observability with metrics, traces, and alerting.
- Formal migration system beyond schema bootstrap.
- Public API or webhooks.
- Automated backups outside manual export flow.

## Functional Requirements

### Tenant and Platform

- System developer can create, update, activate, and deactivate tenant organizations.
- System developer can configure tenant feature flags.
- Platform users can switch active organization.
- Business routes require an active tenant.
- Tenant users cannot access platform-only routes.

### Authentication

- Users can log in with email/password and optional organization slug.
- Sessions are stored server-side using token hashes.
- Session cookie is httpOnly and secure in production.
- Failed login attempts can lock an account.
- Users can log out and revoke sessions.
- Password reset tokens can be created and consumed.

### Authorization

- System developer has unconditional access.
- Tenant roles receive permissions from `role_permissions`.
- Route access requires matching permission, role, or feature.
- Tenant feature flags gate modules.
- Super admin can delegate permissions only within permitted scope.

### Inventory

- Users can manage products, categories, brands, manufacturers, generic medicines.
- Stock changes are recorded through stock movements.
- Stock cannot be directly overwritten by clients.
- Low stock and damaged stock are tracked.
- Serial/IMEI tracking is supported for serial-required products.
- Pharmacy/grocery batch tracking is supported through drug batches.

### Sales and POS

- Users can create quick sales and sales invoices.
- System supports retail, wholesale, due, tax, discount, promotion, loyalty, and serial/batch assignment logic.
- Sales update stock and relevant ledgers.
- Sales returns restore stock and adjust dues/payments according to business rules.
- Cash sessions support POS cash reconciliation.

### DSR and Distribution

- Users can manage DSRs, SRs, and shops.
- Morning issue decreases inventory.
- Evening settlement records sold, returned, damaged, paid, and due amounts.
- DSR, shop, and SR due ledgers track balances.

### Purchasing and Suppliers

- Users can manage suppliers.
- Purchase receive increases stock.
- Supplier dues and payments update supplier ledgers.
- Supplier discounts are tracked.
- Supplier statements can be generated.

### Finance

- Users can manage cash and bank accounts.
- System records finance transactions from sales, purchases, expenses, payments, and transfers.
- Finance dashboard summarizes cash, bank, profit, dues, payables, and net position.

### Reporting

- Users can view dashboards and operational reports.
- Reports can be exported to PDF or Excel.
- Users can print invoices, receipts, purchase receipts, quotations, and statements.

## Non-functional Requirements

- Tenant data must remain isolated.
- Financial and stock ledgers must remain internally consistent.
- POS pages must load quickly and support common counter workflows.
- Application should work on desktop and mobile browsers.
- Reports must be printable and exportable.
- Production system must protect secrets and user data.
- System must support backups and restore planning.
- Deployment must support stable production hosting.
- Critical business flows must have automated tests.

## Security Features

Implemented or partially implemented:

- Password hashing with Node crypto `scrypt`.
- httpOnly session cookie.
- Secure cookie flag in production.
- Server-side session table.
- Session revocation.
- Login history.
- Failed login lockout.
- Password reset token table.
- Basic security headers: `Referrer-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, HSTS in production.
- Role permissions.
- Tenant feature checks.
- Platform-only middleware.
- Active tenant middleware.
- Audit logs.
- Error logs.
- Sensitive tables/columns excluded from backup export.

Security gaps:

- Database credentials are present in `samconfig.toml`.
- No DB-level RLS found.
- AWS template uses wildcard CORS by default.
- Rate limiter is process-local.
- Password reset email is not automated.
- No MFA found.
- No formal security scanning or dependency audit evidence found.

## Technical Stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js ESM |
| Backend framework | Express 5 |
| Database | PostgreSQL |
| Database client | `pg` |
| Frontend | React 18 |
| Build tool | Vite |
| Styling | Tailwind CSS and custom CSS variables |
| Charts | Chart.js, react-chartjs-2 |
| PDF/export | Playwright, jsPDF, html2canvas, XLSX |
| Serverless | `@vendia/serverless-express` |
| Testing | Node test runner, Supertest |
| Deployment | Render, Vercel, AWS SAM Lambda/API Gateway, S3/CloudFront docs |

## System Architecture

The backend uses a layered architecture:

1. `composition.js` creates the database manager.
2. `bootstrapService.js` initializes schema and caches.
3. `createServiceRegistry.js` wires services.
4. `createControllerRegistry.js` wires controllers.
5. `app.js` creates the Express app.
6. `routes/api.js` mounts public, authenticated, platform, system, and tenant business routes.

The frontend uses:

1. React SPA.
2. `APP_ROUTES` for lazy-loaded route definitions.
3. `InventoryAppProvider` for auth state, tenant state, permissions, feature checks, directories, toasts, confirmations, and shared domain actions.
4. Feature-based page/viewmodel/component folders.
5. API clients grouped by domain under `frontend/src/services/api`.

## Database Overview

The database is PostgreSQL and is initialized from `backend/db/schema.js`.

Major table groups include:

- Tenancy: `tenants`, `tenant_features`.
- Users/auth: `users`, `user_sessions`, `login_history`, `password_reset_tokens`.
- Authorization: `role_permissions`.
- Audit/ops: `activity_logs`, `error_logs`.
- Inventory: `products`, `stock_movements`, `categories`, `brands`, `manufacturers`, `generic_medicines`, `drug_batches`.
- Serial/warranty: `product_serials`, `product_serial_identifiers`, `sales_item_serials`, `warranty_claims`, `repair_jobs`.
- Retail sales: `sales_invoices`, `sales_invoice_items`, `sales_returns`, `sales_return_items`, `retail_cash_sessions`, `retail_promotions`.
- Customers: `retail_customers`, `customer_due_ledger`, `customer_payments`, `retail_loyalty_ledger`.
- Distribution: `dsrs`, `issues`, `settlements`, `dsr_due_ledger`, `dsr_advances`, `dsr_targets`.
- Shops/SRs: `customers`, `shop_due_ledger`, `srs`, `sr_due_ledger`.
- Suppliers: `suppliers`, `purchase_receipts`, `purchase_receipt_items`, `supplier_due_ledger`, `supplier_payments`, `supplier_discounts`.
- Finance: `finance_accounts`, `finance_account_transactions`.
- HR: `employees`, `salary_payments`, `salary_active_days`.
- Public/support: `contact_messages`, `visitor_chats`, `visitor_chat_messages`, help desk tables.

Important observation:

- Tenant isolation is documented as query-enforced using `tenant_id`; no database row-level security was found.

## API Overview

API routes are mounted under `/api`.

Public routes:

- `/api/auth/login`
- `/api/auth/forgot-password`
- `/api/auth/reset-password`
- `/api/auth/logout`
- `/api/contact`
- `/api/visitor-chat`

Authenticated non-tenant routes:

- `/api/auth/me`
- `/api/auth/sessions`
- `/api/profile`
- `/api/uploads`

Platform/system routes:

- `/api/platform/tenants`
- `/api/platform/backup`
- `/api/platform/visitor-chats`
- `/api/platform/contact-messages`
- `/api/system`

Tenant business routes:

- `/api/org`
- `/api/permissions`
- `/api/users`
- `/api/activity-logs`
- `/api/audit`
- `/api/report-exports`
- `/api/products`
- `/api/stock-movements`
- `/api/product-serials`
- `/api/warranty-claims`
- `/api/repair-jobs`
- `/api/quotations`
- `/api/trade-ins`
- `/api/issues`
- `/api/settlements`
- `/api/sales-invoices`
- `/api/sales-returns`
- `/api/purchase-receive`
- `/api/supplier-payments`
- `/api/finance-accounts`
- `/api/finance-dashboard`
- `/api/employees`
- `/api/salary-payments`
- Other domain routes listed in `backend/routes/api.js`.

## Integrations

Current integrations found:

- PostgreSQL database.
- Report generation with Playwright/PDF and XLSX.
- Static/frontend deployment targets.
- AWS Lambda/API Gateway deployment template.
- Vercel serverless API wrapper.
- Render web service configuration.

Missing integrations:

- Payment gateway.
- Accounting software.
- E-commerce platforms.
- SMS/WhatsApp messaging.
- Email delivery implementation.
- Barcode hardware configuration beyond browser-compatible input assumptions.
- External analytics/monitoring.

## Reporting Features

Implemented reporting areas include:

- Dashboard metrics.
- Daily reports.
- Purchase reports.
- Stock movement reports.
- Settlement reports.
- Supplier payment reports.
- Sales return reports.
- Customer due reports.
- Cash session reports.
- Damaged stock reports.
- Batch sales reports.
- Supplier statements.
- Customer due statements.
- Profit reports.
- Activity logs.
- Audit history.

Report export capabilities:

- PDF export.
- Excel export.
- Print-friendly sheets.
- Database backup export as SQL or JSON.

## Dashboard Features

The dashboard viewmodel loads and calculates:

- Today issues and settlements.
- Trend issues and settlements.
- Heatmap activity.
- Today and trend retail invoices.
- Finance dashboard.
- Retail cash session.
- Expense report.
- DSR target summary.
- Monthly trend.
- Today due ledger.
- Daily sales calendar report.
- Stock units, stock value, selling value, expected stock profit.
- Low stock and out-of-stock products.
- Retail POS revenue, average basket, due, and profit.
- Cash in hand and cash in bank.
- Total due, supplier payable, and net position.

## Notifications

Implemented:

- In-app toast notifications.
- UI alerts.
- Low-stock and expiry-style reporting screens.
- Help desk and visitor chat records.

Not found:

- Email notification delivery.
- SMS notifications.
- WhatsApp API integration.
- Push notifications.
- Scheduled alerts.

## Settings

Implemented settings areas:

- Organization settings.
- User management.
- Permission management.
- Security/profile pages.
- Tenant feature configuration by platform admin.
- Database backup.

## Future Scalability

Strengths:

- Modular backend services and repositories.
- PostgreSQL supports transactional consistency.
- Serverless and long-running deployment options exist.
- Feature flags allow plan-based module rollout.
- Route lazy-loading helps frontend scale.

Constraints:

- App-enforced tenant isolation is risky at scale.
- Schema bootstrap file is not a formal migration system.
- In-memory rate limiter does not scale across instances.
- Large frontend assets can slow low-bandwidth users.
- No evidence of queue/background job architecture.
- No subscription billing or tenant usage metering found.

## Known Technical Debt

- `samconfig.toml` contains a database connection string and must be cleaned from source control.
- Backend test command timed out during this analysis.
- Central `InventoryAppProvider` is very large and mixes auth, directory caches, many domain actions, confirmations, and UI feedback.
- AWS CORS config allows `*` origin.
- No database RLS.
- Password reset email not implemented.
- Report/export dependencies increase backend weight.
- Large frontend image assets and chunk warning.
- Invariant service notes finance transactions lack `reference_type` and `reference_id`, limiting per-document reconciliation.

## Risks

| Risk | Severity | Reason |
|---|---:|---|
| Exposed DB credential in config | Critical | Secrets in source control can lead to database compromise. |
| App-only tenant isolation | High | A missed `tenant_id` filter can leak customer data. |
| Backend tests inconclusive | High | Financial and stock flows need reliable regression safety. |
| Password reset email gap | High | Account recovery is incomplete for commercial SaaS. |
| Wildcard CORS in AWS template | Medium-High | Must be restricted before production domain launch. |
| In-memory rate limiting | Medium | Not reliable across serverless/multi-instance deployments. |
| Large frontend assets | Medium | Can hurt UX in low-bandwidth retail environments. |
| No billing automation | Medium | Limits SaaS monetization and plan enforcement. |
| No offline mode | Medium | Retail POS can be disrupted by internet instability. |

## Improvement Opportunities

- Rotate database credentials and remove secrets from repository history.
- Add environment/secret manager process for all deployment targets.
- Implement password reset email delivery.
- Restrict production CORS and cookie domain policy.
- Add CI for backend tests, frontend build, linting, and invariant checks.
- Add DB-level tenant protection or automated query isolation tests.
- Introduce formal migrations.
- Split the large frontend app provider into smaller domain providers/hooks.
- Optimize landing and app image assets.
- Add subscription billing, invoices, plan enforcement, and tenant lifecycle automation.
- Add offline-first POS/PWA support.
- Add SMS/WhatsApp due reminders.
- Add payment/accounting/e-commerce integrations.

## Feature Matrix

| Feature | Current Status | Completion % | Priority | Complexity | Business Value |
|---|---|---:|---|---|---|
| Multi-tenant SaaS core | Implemented | 80 | P0 | High | High |
| Auth/session/security | Implemented with email gap | 75 | P0 | Medium | High |
| Role permissions | Implemented | 85 | P0 | High | High |
| Tenant feature flags | Implemented | 85 | P0 | Medium | High |
| Inventory/products/stock ledger | Implemented | 85 | P0 | High | High |
| Retail POS/quick sale | Implemented | 80 | P0 | High | High |
| Sales invoices/returns | Implemented | 85 | P0 | High | High |
| Supplier purchase/payments | Implemented | 85 | P0 | High | High |
| Customer/shop/DSR due ledgers | Implemented | 80 | P0 | High | High |
| Finance accounts/profit | Implemented | 75 | P0 | High | High |
| Dashboard/reports/export | Implemented | 80 | P1 | Medium | High |
| Warranty/repair/serials | Implemented | 75 | P1 | High | Medium-High |
| Pharmacy batches | Partially implemented | 65 | P1 | High | Medium |
| HR/salary | Implemented, secondary | 70 | P2 | Medium | Medium |
| Platform admin | Implemented | 75 | P0 | Medium | High |
| Backup/export | Implemented with security concerns | 70 | P0 | Medium | High |
| Landing/pricing/contact | Implemented | 70 | P1 | Low | Medium |
| Email/SMS notifications | Mostly missing | 15 | P0 | Medium | High |
| Subscription billing | Missing | 0 | P1 | High | High |
| Offline/mobile-first POS | Missing | 10 | P1 | High | High |
| Payment/accounting/e-commerce integrations | Missing | 0 | P2 | High | Medium-High |

## Roadmap

### P0 Critical

| Initiative | Customer/Business Value |
|---|---|
| Remove committed DB secret, rotate credentials, and move secrets to environment/secret manager | Prevents catastrophic data exposure. |
| Implement password reset email delivery or secure admin-mediated recovery | Makes account recovery commercially usable. |
| Add CI for backend tests, frontend build, and invariant checks | Protects critical stock and finance workflows. |
| Harden CORS, cookies, and production domain settings | Required for safe public launch. |
| Add tenant-isolation safeguards | Reduces risk of cross-tenant data leakage. |
| Verify backup/restore process end-to-end | Protects customer data and supports trust claims. |

### P1 Important

| Initiative | Customer/Business Value |
|---|---|
| Subscription billing and tenant plan enforcement | Enables scalable SaaS monetization. |
| Offline-tolerant POS/PWA workflow | Improves counter reliability in real retail conditions. |
| Barcode scanner and receipt hardware presets | Improves daily cashier speed. |
| Frontend performance optimization | Improves usability on lower bandwidth devices. |
| Production observability and alerting | Reduces support burden and improves uptime. |
| Self-service onboarding/demo tenant provisioning | Improves sales conversion. |

### P2 Future

| Initiative | Customer/Business Value |
|---|---|
| Payment gateway integration | Supports modern checkout and reconciliation. |
| Accounting integration | Helps larger businesses and accountants. |
| E-commerce sync | Expands retail channel coverage. |
| SMS/WhatsApp due reminders | Improves collections. |
| Native mobile apps | Improves field/DSR usage. |
| Multi-branch/multi-warehouse | Supports larger customers. |
| Advanced forecasting/reorder automation | Upsell opportunity. |

## Competitive Positioning

### Direct Competitors

- Local Bangladeshi POS and inventory software providers.
- Retail POS systems for small shops.
- Pharmacy POS/inventory tools.
- Wholesale/distribution management systems.
- Dealer management software.

### Indirect Competitors

- Excel and Google Sheets.
- Paper notebooks.
- Generic accounting software.
- Generic ERP systems.
- Global POS products.

### Global Comparables

- Shopify POS.
- Lightspeed.
- Square POS.
- Odoo.
- ERPNext.
- ECOUNT ERP.
- Epos Now.
- Imonggo.

### Competitive Advantages

- Strong Bangladesh localization.
- Bangla language support.
- BDT pricing and local positioning.
- DSR morning issue/evening settlement workflow.
- Shop, SR, and DSR due ledgers.
- Retail and dealer/distribution workflows in one system.
- Serial/IMEI, warranty, repair, and pharmacy batch features.
- Tenant feature flags support flexible plans.

### Missing Competitive Features

- Integrated payments.
- Offline POS.
- Hardware ecosystem.
- E-commerce sync.
- Accounting sync.
- Mobile apps.
- Marketplace/app integrations.
- Subscription billing.
- Automated onboarding.

### Possible Market Positioning

StockLedger can be positioned as:

> The practical all-in-one business management SaaS for Bangladeshi retailers, wholesalers, dealers, and distributors who need inventory, POS, due collection, DSR settlement, and profit visibility without enterprise ERP complexity.

## Product Maturity Evaluation

| Area | Score | Explanation |
|---|---:|---|
| Architecture | 8/10 | Clear monorepo, layered backend, single composition root, modular frontend routes. |
| Code Quality | 7/10 | Consistent patterns and tests exist; some files are large and complex. |
| Maintainability | 7/10 | Good separation of services/controllers/repositories; schema bootstrap and large app provider add maintenance cost. |
| Scalability | 6/10 | PostgreSQL and modular services help; app-only tenant isolation, in-memory rate limits, and no formal migrations constrain scale. |
| Performance | 6/10 | Lazy routes help; frontend build warns about large chunks and very large images. |
| Security | 5/10 | Good auth basics; committed DB secret, wildcard CORS, no RLS, and reset-email gap are serious. |
| UX | 8/10 | Broad UI coverage, dashboards, print/export, bilingual support, and responsive SPA patterns. |
| Business Readiness | 7/10 | Strong core workflows for target customers are implemented. |
| Commercial Readiness | 5/10 | Pricing/landing exists, but billing, onboarding, email, and production ops are incomplete. |
| Deployment Readiness | 6/10 | Multiple deployment configs exist; production hardening is required. |
| Documentation | 7/10 | Useful docs and permission map exist; investor/client documentation was missing before this report. |
| Testing | 6/10 | Many backend tests exist for critical flows, but test execution timed out in this analysis. |

## Verification Notes

- `npm --prefix frontend run build` completed successfully.
- The frontend build produced chunk-size warnings and many large image assets.
- `npm --prefix backend test` timed out after 120 seconds during this analysis.
- No code changes were made before this document was created.

## Final Assessment

StockLedger is a broad and credible vertical SaaS product with substantial implementation already completed. It is strongest as a localized operating platform for Bangladeshi physical-goods businesses that need POS, inventory, dues, finance, and distribution workflows in one system.

The next stage should focus less on adding new modules and more on production hardening, commercial SaaS readiness, tenant security, CI/testing reliability, secret management, and account recovery automation.

