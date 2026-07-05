# StockLedger PMF Project Audit

Date: 2026-07-05  
Stage: 2 paying customers, 1 full-time developer  
Goal: reach 10 paying Bangladeshi FMCG distributor customers  
Strategy source: `STOCKLEDGER-LEAN-PMF-ROADMAP-REVIEW.md`

## Executive Verdict

StockLedger is not a small inventory app anymore. The codebase has grown into a broad multi-tenant business platform covering distributor DSR operations, inventory, purchasing, retail POS, finance, warranty/repair, pharmacy batch tracking, HR/payroll, support, platform administration, audit logs, exports, and backups.

That breadth is now the main PMF risk.

The product has a strong core wedge for Bangladeshi FMCG distributors:

- Morning Issue
- Evening Settlement
- Shop Due
- DSR Due
- Inventory Accuracy
- Supplier Purchase/Payment
- Simple owner reporting

The rest should be hidden, delayed, or ignored unless a paying distributor explicitly needs it. Do not delete working modules now. Use the existing feature flags and permissions to keep the customer-facing product narrow.

The highest-priority implementation work is not a rewrite. It is operational cleanup, focused onboarding, demo simplification, and small fixes around the daily DSR workflow.

---

## Phase 1

## Complete Project Audit

### Architecture Overview

Evidence:

- `CLAUDE.md` describes the system as a multi-tenant inventory, retail POS, dealer-distribution, and finance SaaS.
- `backend/composition.js` is the single composition root and wires database, services, controllers, and Express.
- `backend/routes/api.js` exposes public, platform, system, and tenant business routes.
- `frontend/src/app/routes.js` defines the full frontend module surface.
- `frontend/src/app/AppSidebar.jsx` filters routes through role, permission, and `hasFeature(route.feature)`.
- `backend/lib/features.js` defines tenant feature keys.
- `backend/services/permissionService.js` maps permissions to required tenant features.

Current architecture:

- Backend uses Node.js, Express 5, PostgreSQL, service/repository/controller layering, and a single DI-style registry.
- Frontend uses React 18, Vite, Tailwind, lazy-loaded route pages, viewmodels, API service modules, shared UI components, and i18n.
- Multi-tenancy is enforced in application queries with `tenant_id`, not by PostgreSQL row-level security.
- Feature access is controlled by tenant features, permissions, roles, and backend route middleware.
- Deployment supports Render/Vercel/serverless/SAM-style paths, which increases operational complexity.

CTO verdict:

- The architecture is serviceable and should be preserved.
- The system is modular enough to keep moving.
- The biggest problem is product breadth, not technical foundation.
- Do not rewrite. Use feature flags, copy changes, workflow polish, and small hardening tasks.

### Module Audit

Scoring:

- ★★★★★ Essential
- ★★★★ Important
- ★★★ Useful later
- ★★ Delay
- ★ Remove / Ignore

| Module | Purpose | Current Implementation | Business Value For Next 10 | Technical Quality | UX Quality | Complexity | PMF Score |
|---|---|---|---|---|---|---|---|
| Authentication | Login, sessions, password reset token flow, active tenant session | `authService`, `authController`, session cookies, login history, lockout, password reset token creation | High. Customers must trust access and recover accounts | Good base; password hashing, lockout, sessions exist | Adequate; reset email is not complete | Medium | ★★★★★ Essential |
| Tenant / Organization | Multi-tenant SaaS organization setup and active tenant enforcement | `tenants`, `tenant_features`, org settings, `requireActiveTenant` | High for SaaS operation | Good separation; app-level tenancy only | Useful but can confuse early users if exposed too much | Medium | ★★★★★ Essential |
| Users / Permissions | Staff access control | Role permissions, permission cache, feature-gated permission assignment | High, but founder can configure manually for first 10 | Strong enough; system developer ceiling exists | Permissions UI likely complex for distributor owners | Medium-high | ★★★★ Important |
| Dashboard | Business summary | Dashboard route and viewmodel | Medium-high if focused on owner daily answers | Unknown without deeper live data review | Risk of being too broad | Medium | ★★★★ Important |
| Products | SKU/catalog, prices, case/pcs, stock fields, pharmacy/electronics fields | Product service/repository/page, categories/brands/manufacturer/generic medicine support | High. Required before issue, settlement, purchase | Strong but overloaded by many vertical fields | Good table/form foundation, but likely too much for FMCG | High | ★★★★★ Essential |
| Categories / Brands | Product organization | Backend routes/services, frontend managers | Medium. Helpful for FMCG lists | Good | Acceptable | Low | ★★★★ Important |
| Manufacturers / Generic Medicines | Pharmacy-oriented catalog metadata | Backend and manager modals, feature-gated by batch tracking | Low for FMCG distributor PMF | Technically present | Distracting if visible | Medium | ★ Remove / Ignore |
| Stock Movement | Inventory ledger and reports | `stock_movements`, service/repository, reports, invariant check | Very high. Inventory accuracy is core promise | Strong concept; ledger-based | Useful but may be too technical for users | Medium | ★★★★★ Essential |
| Low Stock Alerts | Warn about reorder stock | Route and product low-stock endpoint | Medium. Useful after data trust exists | Simple | Good later | Low | ★★★ Useful Later |
| Damaged Stock | Track damaged/clear damage | Product damage fields and pages | Medium-high for DSR returns/damage | Useful integration with settlement damage | Good if tied to settlement | Medium | ★★★★ Important |
| Product Serials | Serial tracking for electronics | Product serial services/pages/tests | Low for FMCG | Good but vertical-specific | Distracting for distributors | High | ★★ Delay |
| DSR Management | Manage delivery sales reps | `dsrs`, due fields, target modal, activity | Very high. Core ICP workflow | Strong and tenant-scoped | Good | Medium | ★★★★★ Essential |
| DSR Targets | Monthly sales targets | DSR target service/modal | Low-medium for first 10 | Present | Nice but not core settlement | Medium | ★★ Delay |
| Morning Issue | Issue stock to DSRs | Issue service, frontend page with available stock, case/pcs, save/print | Very high. Daily start workflow | Strong core module | Good, but must be validated for speed under real SKU counts | Medium-high | ★★★★★ Essential |
| Evening Settlement | DSR return/cash/due settlement | Settlement service/repository/page, print/PDF, due/returns/damage/discount/SR handover | Highest. Main differentiator | Strong but business rules are complex | High value, but calculation clarity must be obvious | High | ★★★★★ Essential |
| DSR Finance / DSR Due Ledger | Advances, collections, DSR outstanding | DSR due ledger and finance services/pages | High if distributors track salesman due | Good ledger model | Useful, may need simpler wording | Medium | ★★★★ Important |
| Shops / Customers | Distributor shop/customer master | `customers` table/page with assigned DSR, market, opening/current due | Very high. Core distributor data | Good | Good; import/setup support missing | Medium | ★★★★★ Essential |
| Shop Due Ledger | Shop-wise due record | `shop_due_ledger`, statement page, collect/due modals | Very high. Core owner trust feature | Strong ledger concept | Good but must match local due statement expectations | Medium | ★★★★★ Essential |
| SR / SR Due Ledger | Sales representative or sub-rep due workflow | SR services/pages/ledger, settlement handovers | Unclear for primary FMCG ICP; may matter for some distributors | Technically present | Potential terminology confusion with DSR | Medium | ★★ Delay |
| Suppliers | Supplier master | Supplier service/page | High. Needed for purchases and stock entry | Good | Good | Low-medium | ★★★★ Important |
| Purchase Receive | Stock purchase entry | Purchase receipt service/page/items, supplier due integration | High. Needed for inventory accuracy | Good and tested | Form complexity likely acceptable | Medium-high | ★★★★★ Essential |
| Supplier Payments | Pay supplier due | Service/page/ledger integration | Medium-high. Required for complete distributor books | Good | Good | Medium | ★★★★ Important |
| Supplier Discounts | Supplier discount linked to settlements/purchases | Service/page and settlement discount supplier support | Medium. Useful for FMCG schemes, but not first-week core | Good but can confuse | Needs validation | Medium | ★★★ Useful Later |
| Supplier Statement / Due Ledger | Supplier payable reporting | Supplier due ledger and statement page | Medium-high for trust | Good | Useful | Medium | ★★★★ Important |
| Retail Quick Sale | POS checkout | Retail POS page/service/cash sessions | Low for FMCG distributor wedge | Built out | Distracts demos | High | ★★ Delay |
| Retail Sales Invoices | Retail invoice flow | Sales invoice services/tests/pages/serials/returns | Low-medium unless distributor also does counter sales | Strong but not ICP-first | Too broad for distributor demo | High | ★★ Delay |
| Retail Sales Returns | Retail return workflow | Sales return services/tests/pages | Low for next 10 | Good | Not DSR-specific | High | ★★ Delay |
| Retail Customers | Retail customer CRM | Retail customers, retention, due | Low for distributor shops because separate `customers` module exists | Good | Confusing duplicate customer concept | Medium | ★★ Delay |
| Retail Due Collection | Retail customer payment | Customer due/payment pages | Low for distributor PMF | Good | Duplicates shop due mental model | Medium | ★★ Delay |
| Retail Cash Sessions | POS cashier session | Cash session services/pages | Low for distributors | Good | Irrelevant if no POS | Medium | ★ Remove / Ignore |
| Promotions / Loyalty | Retail promotional pricing/loyalty | Promotions table/routes/page, tenant loyalty fields | Low | Technically present | Irrelevant to DSR settlement | Medium | ★ Remove / Ignore |
| Quotations | Sales quotation workflow | Quotation services/pages/print | Low for next 10 distributors | Good | Useful later for dealers, not FMCG wedge | Medium | ★★ Delay |
| Trade-ins | Electronics trade-in workflow | Trade-in services/pages | None for FMCG | Good but vertical-specific | Distracting | High | ★ Remove / Ignore |
| Warranty Claims | Electronics after-sales workflow | Warranty claim services/pages/tests | None for FMCG | Good but vertical-specific | Distracting | High | ★ Remove / Ignore |
| Repair Jobs | Service/repair workflow | Repair job services/pages | None for FMCG | Good but vertical-specific | Distracting | High | ★ Remove / Ignore |
| Finance Accounts | Cash/bank/mobile balances and transactions | Finance accounts service/page; used by payments and ledgers | Medium-high if it supports settlement cash trust | Good, but invariant service notes finance transactions lack source references | Could be useful but must stay simple | High | ★★★★ Important |
| Finance Dashboard | Finance overview | Finance dashboard service/page | Medium later | Good | Risk of broad BI | Medium | ★★★ Useful Later |
| Expenses | Expense tracking | Expense service/page | Medium. Some owners expect daily expense tracking | Good | Simple enough | Low-medium | ★★★ Useful Later |
| Profit Report | Profit reporting | Profit service/page/tests | Medium. Owners ask profit, but only after stock/due trust | Good | Useful later, avoid overpromising | Medium | ★★★ Useful Later |
| Reports / Daily Reports | Daily operational summaries | Reports page plus individual report endpoints | High if simplified into one daily close report | Mixed because reports are spread across modules | Needs consolidation for owner answer | Medium | ★★★★ Important |
| Report Exports | PDF/Excel exports | Playwright and XLSX report export service | Medium-high for trust/printing | Useful but operationally heavier | Good if reliable | Medium | ★★★★ Important |
| Activity Logs / Audit | Change history and traceability | Activity/audit services/pages | Medium-high for trust and disputes | Strong foundation | Usually hidden from normal staff | Medium | ★★★★ Important |
| Trash / Restore | Recover soft-deleted records | Multiple modules support deleted_at and trash route | Medium. Helps support and reduces fear | Good | Admin-only value | Medium | ★★★ Useful Later |
| Help Desk / Issue Center | Support tickets and issue visibility | Help desk services/pages, issue center route | Low for 2 to 10 customers if founder uses WhatsApp/phone | Technically useful | Adds UI complexity if exposed | Medium | ★★ Delay |
| Visitor Chat / Contact Messages | Landing page lead/support chat | Public visitor chat/contact and platform admin pages | Low-medium. Lead capture can help, but not core product | Functional | Could distract from direct sales | Medium | ★★ Delay |
| Security Page | Session/security visibility | Security route/page | Medium for trust | Auth base exists | Good for admin, not sales demo | Low-medium | ★★★ Useful Later |
| Database Backup | Tenant/platform backup/export | Backup service excludes session tokens and password hashes | High as trust promise, not necessarily as user-facing UI | Good foundation | Keep admin/operator-facing | Medium | ★★★★ Important |
| Platform Admin | Create/manage tenants/features | Platform tenant admin/pages | High for founder operations | Good | Founder-only | Medium | ★★★★ Important |
| System Health / Error Logs | Developer diagnostics | System routes/pages | Founder/developer value | Good | Hide from tenants | Medium | ★★★ Useful Later |
| HR Employees / Salary Payments | Employee/payroll records | Employees and salary payment services/pages remain live | Low for distributor PMF | Technically present | Distracting | Medium | ★ Remove / Ignore |
| Pharmacy / Drug Batches | Batch/expiry/prescription tracking | Drug batch services/pages/schema, generic medicines/manufacturers | Low for FMCG distributor wedge | Good but vertical-specific | Distracting | High | ★ Remove / Ignore |
| Landing / Marketing Site | Public acquisition and conversion | Landing page with broad segments, images, contact, chat | High, but current positioning is too broad | Good visual structure | Needs distributor-first copy | Medium | ★★★★ Important |
| i18n / Bengali Support | English/Bangla labels | `i18n` locales and translation files | High for Bangladesh usability | Good | Strong differentiator if labels are locally clear | Medium | ★★★★ Important |
| Shared UI / Components | Reusable UI primitives, modals, printing, table actions | Shared components and utilities | High for maintainability | Good | Consistent surface | Medium | ★★★★ Important |
| `useInventoryApp` App State | Frontend app orchestration and many domain actions | Large central hook, 1321 lines | Supports current app but is a coupling risk | Works, but too large | Invisible to user | High | ★★★ Useful Later |
| Deployment Config | Render/Vercel/SAM deployment | `template.yaml`, `vercel.json`, scripts, SAM config | High because trust and uptime matter | Mixed; exposed secret and wildcard CORS need attention | Invisible | Medium | ★★★★★ Essential |

### What Supports The Next 10 Customers

Strong support:

- DSRs
- Shops/customers
- Products
- Stock movement
- Morning issue
- Evening settlement
- Shop due ledger
- DSR due ledger
- Purchase receive
- Supplier ledger/payments
- Simple reports
- Backup/export
- Users/permissions
- Bengali/local terminology if polished

Weak or distracting support:

- Retail POS expansion
- Retail CRM/due modules
- Warranty/repair/trade-ins
- Pharmacy batch tracking
- HR/payroll
- Promotions/loyalty
- Visitor chat/admin improvements
- Advanced dashboards before daily close trust

---

## Phase 2

## Gap Analysis

PMF questions:

- Does it help close the next customer?
- Does it improve onboarding?
- Does it improve trust?
- Does it improve DSR workflow?
- Does it improve settlement?
- Does it improve inventory accuracy?
- Does it reduce support?

| Area | Close Customer | Onboarding | Trust | DSR Workflow | Settlement | Inventory Accuracy | Reduce Support | Decision |
|---|---|---|---|---|---|---|---|---|
| Login/auth | Yes | Yes | Yes | Indirect | Indirect | Indirect | Yes | Keep and harden |
| Password reset | Yes if reliable | Yes | Yes | Indirect | Indirect | No | Yes | Improve email/admin reset |
| Tenant setup | Yes | Yes | Yes | Indirect | Indirect | Indirect | Yes | Keep founder-managed |
| Feature flags | Yes if used to simplify | Yes | Yes | Indirect | Indirect | Indirect | Yes | Use aggressively |
| Products | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Keep, simplify forms where needed |
| Product imports | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Manual templates now; automate later |
| Shops/customers | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Keep |
| Shop opening due | Yes | Yes | Yes | Yes | Yes | No | Yes | Must support in onboarding |
| DSRs | Yes | Yes | Yes | Yes | Yes | No | Yes | Keep |
| Morning issue | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Polish based on observation |
| Evening settlement | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Highest priority |
| Shop due ledger | Yes | Yes | Yes | Yes | Yes | No | Yes | Keep and validate print/statement |
| DSR due ledger | Yes | Yes | Yes | Yes | Yes | No | Yes | Keep, simplify language |
| Purchase receive | Yes | Yes | Yes | Indirect | Indirect | Yes | Yes | Keep |
| Supplier payment/statement | Medium | Medium | Yes | No | Indirect | Indirect | Medium | Keep, not main demo |
| Daily close report | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Build only simplest version if missing |
| Dashboard | Maybe | No | Maybe | Indirect | Indirect | Indirect | Maybe | Focus on daily owner numbers |
| Finance accounts | Maybe | Setup complexity risk | Yes | Indirect | Yes if cash linked | Indirect | Maybe | Keep simple/admin-level |
| Expenses/profit | Maybe | No | Maybe | No | No | No | No | Delay unless customer asks |
| Retail POS | No for FMCG wedge | No | No | No | No | Maybe | No | Hide from distributor tenants |
| Retail customer due | No | Confuses shops | No | No | No | No | No | Hide |
| Retail promotions/loyalty | No | No | No | No | No | No | No | Ignore |
| Warranty/repair/trade-ins | No | No | No | No | No | No | No | Ignore for FMCG |
| Pharmacy batches | No for FMCG | No | No | No | No | No | No | Ignore |
| HR/payroll | No | No | No | No | No | No | No | Ignore |
| Help desk | Not now | No | Maybe | No | No | No | Maybe | Founder WhatsApp support now |
| Activity logs/audit | Indirect | No | Yes | Indirect | Indirect | Indirect | Yes | Keep hidden/admin |
| Backup/export | Yes | No | Yes | No | No | Yes | Yes | Keep as trust promise |
| Landing page | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Refocus copy to distributors |

### Customer Journey Gap: FMCG Distributor Signup

1. Registration

- Current state: Authentication and tenant setup exist, but SaaS self-service onboarding is not the priority.
- Abandonment risk: Prospect may see too many modules and not understand the distributor promise.
- Recommendation: Founder-led signup. Do not build a full wizard now.

2. Organization Setup

- Current state: Org settings and platform tenant management exist.
- Abandonment risk: Owner does not know which features/permissions to configure.
- Recommendation: Use founder-controlled distributor feature defaults. Hide irrelevant modules.

3. Product Import

- Current state: Product module exists; no full robust import product is evident.
- Abandonment risk: Manual SKU entry is too slow.
- Recommendation: Excel template and paid/free setup service now. Build import automation only after collecting repeated real spreadsheets.

4. Customer/Shop Import

- Current state: Shops/customers exist with assigned DSR and opening/current due.
- Abandonment risk: Shop due migration is where trust breaks.
- Recommendation: Shop/opening due template plus founder verification call.

5. DSR Creation

- Current state: DSR module exists with due/target support.
- Abandonment risk: DSR vs SR terminology confusion.
- Recommendation: For FMCG tenants, use one term consistently: DSR. Hide SR unless customer uses that structure.

6. Opening Stock

- Current state: Product stock and stock movements exist.
- Abandonment risk: Opening stock must match notebook/Excel or customer will distrust system from day one.
- Recommendation: Treat opening stock as an onboarding ceremony with signed/confirmed starting numbers.

7. First Purchase

- Current state: Purchase receive and supplier due exist.
- Abandonment risk: If supplier due and inventory update are unclear, staff will bypass purchases.
- Recommendation: Keep purchase receive in core training but not as first demo focus.

8. First Morning Issue

- Current state: Morning issue page supports DSR, date, product quantity, available stock, case/piece, print/save.
- Abandonment risk: If slower than notebook or product selection is awkward, staff will reject it.
- Recommendation: Observe real staff using it for 30 minutes before changing. Improve only speed, stock visibility, print clarity.

9. First Evening Settlement

- Current state: Settlement supports issued product returns, damage, cash received, due, previous due, shop collections, SR handovers, discount, print/PDF.
- Abandonment risk: Formula complexity can scare users. If one number looks wrong, trust collapses.
- Recommendation: Make settlement math visually explicit: issued value - returns/damage - discount - cash = new due, plus previous due where relevant.

10. First Report

- Current state: Many reports exist across modules.
- Abandonment risk: Owner asks "what happened today?" and has to visit multiple pages.
- Recommendation: Provide one daily close report or one printed settlement pack, not a report library.

---

## Phase 3

## Technical Debt Report

### Highest-Risk Debt

| Debt | Evidence | Why It Matters | PMF Priority |
|---|---|---|---|
| Exposed production-looking database credential in deployment config | `samconfig.toml` contains a full PostgreSQL connection string | Catastrophic trust/security risk; must rotate, not just remove from repo | P0 |
| Wildcard CORS in SAM template | `template.yaml` uses `AllowOrigins: '*'` and comments say restrict before go-live | Reduces production security posture | P0/P1 |
| Feature middleware fails open when cache is null | `requireFeature` allows access if cached features are `null` | Safer for bootstrap, risky if cache/load fails in production | P1 |
| No DB-level RLS | `CLAUDE.md` states tenant isolation is query-enforced only | A missed `tenant_id` condition can leak data | P1 later, not immediate rewrite |
| Large frontend application hook | `frontend/src/app/useInventoryApp.jsx` is 1321 lines | Coupled state/actions increase regression risk | P2; do not refactor now |
| Massive bootstrap schema instead of formal migrations | `backend/db/schema.js` contains many `CREATE TABLE` and `ALTER TABLE` statements | Hard to reason about production evolution and rollback | P2 until deployments hurt |
| Broad route/module surface | `frontend/src/app/routes.js` and `backend/routes/api.js` expose many domains | Makes product feel like generic ERP, not DSR software | P0 via feature defaults/hiding |
| Incomplete password reset delivery | `aws-ses-email-guide.txt` says token is created but not emailed | Creates support friction and trust issue | P1 |
| In-memory rate limiter | `backend/middleware/rateLimiter.js` uses process memory | Fine for early stage, weak across instances/serverless | P2 |
| Finance transaction source references missing | `invariantService.js` notes no `reference_type/reference_id` on `finance_account_transactions` | Limits reconciliation from business document to cash/bank posting | P2 |

### Dead / Low-ROI Code

`DEAD-CODE-AUDIT.md` says a previous cleanup removed unreachable payroll and stale helper code. Live-but-low-PMF modules remain:

- Employees and salary payments
- Product serials
- Warranty claims
- Repair jobs
- Trade-ins
- Retail promotions and loyalty
- Pharmacy batch/generic medicine/manufacturer features
- Retail POS modules
- Visitor chat admin

These are not necessarily technically dead. They are PMF-dead for the next 10 FMCG distributor customers.

Recommendation:

- Do not delete now.
- Hide by default for distributor tenants.
- Stop improving them until at least 50+ customers or explicit paid demand.

### Duplicate / Confusing Domain Concepts

| Concept | Duplication | Risk | Recommendation |
|---|---|---|---|
| Customers vs Retail Customers | Distributor shops use `customers`; POS uses `retail_customers` | New users may not know where shops belong | Hide retail customers for distributor tenants |
| DSR vs SR | Both DSR and SR due ledgers exist | Local businesses may use one term, not both | Default to DSR only |
| Sales invoices vs DSR settlements | Retail invoice workflow and DSR settlement both represent selling | Prospect may think they must use both | Demo settlement workflow only |
| Customer due vs shop due vs DSR due | Multiple due ledgers | Due concepts can become hard to explain | Use local labels and role-specific navigation |

### Performance Observations

- Frontend routes are lazy-loaded, which is good.
- Prior frontend build succeeded but produced large asset/chunk warnings, mainly landing images and main bundle size.
- This is not the first PMF bottleneck unless prospects complain about slow loading.
- Landing image compression is a quick win if done in less than a few hours.

### Code Quality Observations

Strengths:

- Clear backend layering.
- Tenant scoping is widely used in repositories.
- Tests exist for core financial/inventory flows.
- Invariant checks exist for stock and ledgers.
- Shared frontend components and viewmodels reduce some duplication.

Weaknesses:

- Product scope is too wide for the current stage.
- Frontend app orchestration is centralized and large.
- Schema history is embedded in one bootstrap file.
- Permission/feature/menu coordination requires discipline across several files.
- Some deployment docs/config contain encoding artifacts and stale comments.

---

## Phase 4

## Security Review

### Security Strengths

- Session cookies are `httpOnly`, `sameSite: lax`, and `secure` in production.
- `x-powered-by` is disabled.
- Security headers are set: referrer policy, content type options, frame options, permissions policy, COOP, and production HSTS.
- Password strength validation and scrypt-style password hashing are used.
- Login lockout and login history exist.
- Public login/contact/chat endpoints have rate limits.
- Tenant routes require authenticated user and active tenant.
- Most backend business routes use `requireFeature`.
- Permissions are feature-aware for tenant sub-role assignment.
- Backup export excludes sessions, password reset tokens, and password hashes.

### Security Gaps

| Gap | Severity | Evidence | Action |
|---|---|---|---|
| Exposed database credential | Critical | `samconfig.toml` contains a full DB URL | Rotate DB password, remove secret, use env/secret manager |
| Wildcard API CORS | High | `template.yaml` uses `AllowOrigins: '*'` | Restrict to production domain before go-live |
| Default system developer credentials | High if not overridden | `backend/config/env.js` defaults to `developer@arinda.local` / default password | Ensure production env overrides; consider production fail-fast |
| Password reset email missing | Medium-high | `forgotPassword` creates token; guide says email not implemented | Implement email delivery or admin-assisted secure reset |
| Feature gate fail-open | Medium | `cached === null || ...` in `requireFeature` | Change to safer behavior after bootstrap rules are clear |
| App-level tenant isolation only | Medium | `CLAUDE.md` says no RLS | Keep tests; later add RLS or query guard tooling |
| In-memory rate limits | Low-medium | Map-based limiter | Accept now; replace when scale/abuse increases |

### Security Recommendation

Before sales scale, complete a one-day production trust cleanup:

1. Rotate the exposed database credential.
2. Remove secret from `samconfig.toml`.
3. Verify production env variables are set outside source control.
4. Restrict CORS to actual domain.
5. Confirm default system developer credentials are not valid in production.
6. Document backup and restore process.

This is not optional. A SaaS selling inventory and dues cannot carry obvious credential risk.

---

## Phase 5

## UX Review

### UX Strengths

- Sidebar supports grouped navigation and feature/permission filtering.
- Core DSR pages already use tables, summaries, print actions, and business totals.
- Morning issue shows available stock and case/piece quantities.
- Evening settlement has print/PDF support and explicit totals.
- Shop due ledger has statements, collection, due entry, and print/export.
- Bengali translation support exists.
- Shared components create consistent styling.

### UX Weaknesses

| Weakness | Why It Hurts PMF | Recommendation |
|---|---|---|
| Too many modules in default product surface | Prospects think StockLedger is complicated ERP | Hide non-distributor modules by default |
| Distributor workflow is not the only visible story | Landing/routes include retail/electronics/pharmacy/HR paths | Focus demo/landing on DSR settlement |
| DSR/SR/customer terminology can confuse | Similar due ledgers and person types exist | Standardize customer-facing labels for FMCG tenants |
| First onboarding path is not obvious | Product/shop/opening stock/opening due setup is not a guided service | Create manual onboarding kit before software wizard |
| Owner daily answer is scattered | Many reports exist, but one daily close view is the sales hook | Build/assemble one daily close report only if existing reports do not satisfy |
| Permissions are powerful but hard for owners | Non-technical owners do not want to configure access models | Founder-managed defaults now |
| Reset/login support is not fully self-service | Account recovery creates trust/support risk | Complete password reset or create secure admin reset SOP |

### UX Recommendation

The UX goal for the next 10 customers:

> A distributor owner should understand in 15 minutes how morning issue, evening settlement, shop due, and stock balance work together.

Everything else should be hidden during demo and initial use.

---

## Phase 6

## Database Review

### Database Strengths

- PostgreSQL is appropriate.
- Core tables include tenant scoping.
- Ledger models exist for stock, shop due, DSR due, supplier due, customer due, and finance transactions.
- Invariant checks exist for stock balances, shop due, DSR ledger chains, supplier/customer ledgers, and finance account balances.
- Soft-delete patterns exist across many modules.
- Feature flags and role permissions are tenant-scoped.

### Database Risks

| Risk | Evidence | Impact | Recommendation |
|---|---|---|---|
| Single bootstrap schema file | `backend/db/schema.js` contains large create/alter history | Hard to manage production migrations | Do not rewrite now; later introduce migration discipline |
| Many vertical-specific fields on products | Pharmacy, warranty, serial, retail fields coexist | Product form/data model can overwhelm FMCG users | Hide vertical-specific fields in UI for distributor tenants |
| App-only tenant isolation | Query `tenant_id` discipline required | One missed filter can leak data | Keep tests; later add RLS or automated query review |
| Finance transactions lack document references | `invariantService` limitation | Harder audit from settlement/purchase/payment to finance | Add references later when finance audit becomes customer-visible |
| Multiple due ledgers | Shop, DSR, SR, retail customer, supplier | Business confusion and reconciliation complexity | Use only shop/DSR/supplier in distributor mode |

### Database Impact Of Near-Term Plan

Recommended near-term work should avoid schema changes where possible.

Likely no database changes:

- Feature default/hide irrelevant modules
- Landing copy changes
- Onboarding templates/docs
- Demo script
- CORS/config cleanup

Possible small database changes later:

- Finance account transaction `reference_type/reference_id`
- Saved daily close report snapshots, only if real customer need exists
- Import staging tables, only after repeated import patterns are validated

---

## Phase 7

## Architecture Review

### What To Preserve

- Backend controller/service/repository layering.
- Single composition root.
- Tenant feature flags.
- Role and permission enforcement.
- Existing route and page structure.
- Existing UI component system.
- Existing DSR, settlement, shop due, and stock ledger logic.

### What Not To Do

- Do not rewrite the app.
- Do not create a new architecture for "distributor mode".
- Do not split the product into separate apps.
- Do not refactor `useInventoryApp` just because it is large.
- Do not build a full onboarding/import platform before real onboarding evidence.

### Architecture Recommendations

| Recommendation | Reason | Timing |
|---|---|---|
| Use existing feature flags to create distributor defaults | Lowest-risk simplification | Now |
| Keep non-PMF modules in code but hidden | Avoid deletion regressions | Now |
| Add production config safety checks | Prevent trust failures | Now |
| Add small tests only around touched settlement/issue behavior | Protect core logic | As changes happen |
| Introduce formal migrations later | Important, but not a sales blocker today | 25-50 customers |
| Split large frontend app hook later by workflow | Maintainability, not PMF now | 50+ customers or when editing becomes risky |

---

## Phase 8

## Prioritized Roadmap

This roadmap is optimized for:

- Getting the next 10 paying customers
- Making onboarding effortless
- Becoming the easiest distributor DSR settlement system in Bangladesh
- Building trust and referrals

### P0: Must Do Now

| Priority | Task | Business Reason | Customer Value | Effort | Risk | Expected Impact |
|---|---|---|---|---|---|---|
| 1 | Rotate exposed DB credential and remove source-controlled secret | Avoid catastrophic trust failure | Data safety | 2-6h plus provider action | High if not done | Very high |
| 2 | Distributor feature default / hide irrelevant modules | Product feels simpler in demos | Less confusion | 4-10h if config-only | Low | Very high |
| 3 | Founder-led onboarding kit | Converts prospects faster | Clear setup path | 8-16h | Low | Very high |
| 4 | FMCG demo tenant and demo script | Repeatable sales motion | Prospect understands workflow | 6-12h | Low | High |
| 5 | Settlement clarity/print audit | Core differentiator | Trust in daily settlement | 12-30h depending findings | Medium | Very high |
| 6 | Morning issue speed/print audit | Staff adoption | Faster daily issue | 8-20h if issues found | Medium | High |
| 7 | Landing/pricing copy narrowed to distributors | Better lead conversion | Clear promise | 6-12h | Low | High |
| 8 | Backup/restore trust SOP | Reduces fear of data loss | Trust | 3-8h | Low | Medium-high |

### P1: Important After First Sales Push

| Priority | Task | Business Reason | Customer Value | Effort | Risk | Expected Impact |
|---|---|---|---|---|---|---|
| 9 | Simple daily close report if missing | Owner gets one answer | Daily confidence | 12-30h | Medium | High |
| 10 | Password reset email/admin reset hardening | Reduces support panic | Account recovery | 8-20h | Medium | Medium-high |
| 11 | Product/shop/opening due manual import helpers | Faster onboarding | Less manual typing | 8-20h | Medium | High |
| 12 | Core workflow smoke tests for touched code | Prevents regressions | Stable use | 6-16h | Low | Medium |
| 13 | Settlement terminology simplification | Reduces support | Clear math | 4-12h | Low | High |
| 14 | Shop due statement polish | Improves trust and disputes | Better due clarity | 6-16h | Low | Medium-high |

### P2: Delay Until Evidence Or Scale

| Task | Delay Until | Reason |
|---|---|---|
| Full setup wizard | 25+ customers | Founder-led onboarding is better now |
| Full import UI with preview/rollback | 10-25 real spreadsheets | Need actual data patterns |
| Billing automation | 50 customers | Manual billing is fine |
| Customer health dashboard | 50 customers | Spreadsheet is fine |
| Role preset UI | 10-25 customers | Founder can configure manually |
| Offline drafts | Paid demand / churn risk | Expensive and unproven |
| Mobile DSR app | Observed DSR usage | Assumption not proven |
| WhatsApp automation | Manual summaries validated | Automation before proof is waste |
| Multi-branch | 100+ customers or paid enterprise demand | Complexity too early |
| HR/payroll expansion | Never for current ICP | Not distributor DSR wedge |
| Warranty/repair/trade-in expansion | Never for current ICP | Electronics market, not FMCG |
| Pharmacy batch expansion | Separate vertical later | Different ICP |
| Promotions/loyalty | Never for current distributor wedge | Retail POS feature |

---

## Phase 9

## Implementation Plan

Implementation rule:

Only start one task at a time. After each completed task, summarize changes, PMF impact, database impact, API impact, migration requirements, and wait for approval.

### Task 1: Production Trust Cleanup

Business reason:

- Customers are trusting StockLedger with inventory, cash, and due records. Exposed credentials and permissive production config undermine the business.

Customer value:

- Safer data and stronger trust promise.

Affected files:

- `samconfig.toml`
- `template.yaml`
- Possibly deployment docs such as `AWS-DEPLOY-CHECKLIST.txt`
- Possibly `backend/config/env.js` if adding production fail-fast checks

Database impact:

- No schema changes.
- Requires external credential rotation in the database provider.

API impact:

- No API contract changes.
- CORS origin restrictions may affect frontend/API calls if domains are not configured correctly.

Migration requirements:

- Rotate DB password/connection string outside code.
- Update deployment environment/secret store.
- Deploy config change.

Estimated hours:

- 2-6 hours depending provider access.

Risk:

- Medium if deployment env is misconfigured.

Priority:

- P0.

Expected impact:

- Removes catastrophic trust risk.

### Task 2: Distributor Feature Default / Menu Simplification

Business reason:

- A prospect should not see modules for warranty, pharmacy, HR, repair, trade-in, or retail loyalty during a distributor demo.

Customer value:

- Product feels easier and purpose-built.

Affected files:

- Likely platform tenant feature defaults or seed/demo data.
- Existing feature flag files may be used without architectural changes.

Database impact:

- Existing `tenant_features` rows may need to be configured for current/demo tenants.
- No schema change expected.

API impact:

- No endpoint contract changes.

Migration requirements:

- Possibly update existing tenant feature rows manually or through existing platform UI.

Estimated hours:

- 4-10 hours.

Risk:

- Low if using existing feature flags.

Priority:

- P0.

Expected impact:

- Cleaner demos and lower onboarding confusion.

### Task 3: Founder-Led Onboarding Kit

Business reason:

- The next 10 customers need setup help more than a self-service wizard.

Customer value:

- Clear data handoff for products, shops, DSRs, opening stock, and opening due.

Affected files:

- New docs/templates only, unless a lightweight download link is later added.

Database impact:

- None initially.

API impact:

- None.

Migration requirements:

- None.

Estimated hours:

- 8-16 hours.

Risk:

- Low.

Priority:

- P0.

Expected impact:

- Faster onboarding and higher close rate.

### Task 4: Demo Tenant And Sales Script

Business reason:

- Founder-led sales needs repeatable proof.

Customer value:

- Prospect sees their own daily workflow.

Affected files:

- `backend/scripts/seedDemo.js` if updating demo data.
- Sales/demo docs.

Database impact:

- Demo tenant data only.

API impact:

- None.

Migration requirements:

- None.

Estimated hours:

- 6-12 hours.

Risk:

- Low.

Priority:

- P0.

Expected impact:

- Better demo-to-paid conversion.

### Task 5: Settlement Clarity Audit And Polish

Business reason:

- Evening settlement is StockLedger's most defensible wedge.

Customer value:

- Less cash/due confusion, more trust.

Affected files:

- `frontend/src/features/settlements/pages/EveningSettlementPage.jsx`
- `frontend/src/features/settlements/viewmodels/useSettlementViewModel.js`
- Settlement print components/services if needed
- `backend/services/settlementService.js` only if a verified calculation bug exists

Database impact:

- Avoid schema changes unless a real settlement data gap is proven.

API impact:

- Avoid API changes unless calculation/response shape is insufficient.

Migration requirements:

- None expected.

Estimated hours:

- 12-30 hours.

Risk:

- Medium because settlement logic touches inventory/due/money.

Priority:

- P0.

Expected impact:

- Directly improves the core reason customers pay.

### Task 6: Morning Issue Speed And Print Audit

Business reason:

- If notebook is faster than StockLedger in the morning, adoption fails.

Customer value:

- Faster DSR issue and fewer stock mistakes.

Affected files:

- `frontend/src/features/morning-issue/pages/MorningIssuePage.jsx`
- `frontend/src/features/morning-issue/viewmodels/useMorningIssueViewModel.js`
- `backend/services/issueService.js` only if a verified workflow bug exists

Database impact:

- None expected.

API impact:

- None expected.

Migration requirements:

- None.

Estimated hours:

- 8-20 hours after observation.

Risk:

- Medium if issue stock logic changes.

Priority:

- P0/P1 depending customer evidence.

Expected impact:

- Improves daily adoption.

### Task 7: Distributor Landing And Pricing Focus

Business reason:

- Broad positioning lowers conversion.

Customer value:

- Prospect immediately understands StockLedger is for distributor DSR settlement and due control.

Affected files:

- `frontend/src/features/landing/*`
- `frontend/src/features/landing/constants.js`

Database impact:

- None.

API impact:

- None.

Migration requirements:

- None.

Estimated hours:

- 6-12 hours.

Risk:

- Low.

Priority:

- P0.

Expected impact:

- Better lead quality and sales clarity.

---

## Phase 10

## Begin Implementing One Task At A Time

No implementation has been started in this audit.

Recommended first task:

> Production Trust Cleanup: rotate the exposed database credential, remove the source-controlled secret from `samconfig.toml`, restrict production CORS once the production frontend/API domains are confirmed, and document the deployment secret process.

Why this first:

- It is a P0 trust issue.
- It does not redesign the product.
- It has no database schema impact.
- It protects the company before more sales demos and onboarding.

Approval required before implementation:

- Confirm that I should start Task 1.
- Confirm the intended production frontend domain and API domain for CORS.
- Confirm whether the exposed database password has already been rotated. If not, rotate it in the database provider before or immediately after removing it from the repo.

