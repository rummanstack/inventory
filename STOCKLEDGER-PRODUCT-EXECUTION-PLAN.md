# StockLedger Product Execution Plan

Date: 2026-07-05

Role assumed: Chief Product Officer and execution partner.

Objective:

> Transform StockLedger into the preferred SaaS for Bangladeshi dealers, distributors, wholesalers, and inventory-based businesses by focusing on customer trust, daily usage, DSR settlement, due control, stock accuracy, and repeatable onboarding.

This plan intentionally does not optimize for the biggest feature set. It optimizes for adoption, retention, referrals, and revenue.

---

# Phase 1 - Product Audit

## Product Principle

StockLedger should lead with one clear product promise:

> Settle every DSR quickly, control shop dues, and know stock, cash, return, damage, and profit every day.

Every module should be judged against that promise.

## Module Classification

| Module | Classification | Why | Execution Decision |
|---|---|---|---|
| Dashboard | Improve | Owner dashboard is critical, but it must focus on distributor KPIs first. | Create a distributor-first dashboard: today's issue, settlement, cash collected, due added, returns, damage, stock value, top DSRs. |
| Products | Improve | Core foundation for stock, sales, purchase, and settlement. | Make product setup/import faster; simplify fields by business type. |
| Categories | Simplify | Useful, but not a core selling point. | Keep lightweight and optional. |
| Brands | Hide from most users | Useful for electronics/retail, less critical for FMCG distributors. | Hide unless tenant business type needs it. |
| Manufacturers | Hide from most users | Pharmacy/electronics-specific value. | Hide for FMCG distributor mode. |
| Generic Medicines | Hide from most users | Pharmacy-specific. | Keep only for pharmacy mode. |
| Drug Batches | Hide from most users | Important for pharmacy/expiry-heavy businesses, not first-market wedge. | Keep out of FMCG default navigation. |
| Stock Movement | Keep as-is, then improve | Strong trust feature for disputes. | Keep; improve filters and printable stock ledger later. |
| Low Stock Alerts | Improve | Useful for distributor reorder decisions. | Add reorder-focused simple view and export. |
| Damaged Stock | Improve | Directly relevant to settlement and stock loss. | Connect more clearly with evening settlement. |
| Product Serials / IMEI | Hide from most users | Electronics-specific. | Hide from FMCG tenants. |
| Warranty Claims | Remove from roadmap for now | Electronics-specific and not part of distributor wedge. | Do not invest until electronics segment is intentionally targeted. |
| Repair Jobs | Remove from roadmap for now | Service workflow, not distributor-first. | Do not improve now. |
| DSRs | Improve | Core buyer pain. | Make DSR setup, route/area, opening due, and status easier. |
| DSR Targets | Nice to have | Useful after adoption, not required for first value. | Delay until customers ask for performance targets. |
| Morning Issue | Improve | Core daily workflow. | Make it faster, printable, and mobile-friendly. |
| Evening Settlement | Improve aggressively | Flagship feature. | This should be the best workflow in the product. |
| DSR Due Ledger | Improve | Direct money-control value. | Make balances trustworthy and easy to print/share. |
| Shops / Customers | Improve | Distributors sell to shops; shop ledger is core. | Rename clearly as "Shops" in distributor mode. |
| Shop Due Ledger | Improve | Very high customer value. | Make due collection and settlement linkage obvious. |
| SRs | Merge or hide | May confuse customers if DSR/SR distinction is unclear. | Merge conceptually into staff/sales roles or hide unless needed. |
| SR Due Ledger | Hide from most users | Useful only if customer explicitly operates SR-level due. | Hide by default. |
| Suppliers | Improve | Purchase and payable control are core. | Keep simple and connected to purchase receive. |
| Purchase Receive | Improve | Core stock/cost input. | Add import/template support and faster receipt entry. |
| Supplier Due Ledger | Keep as-is, then improve | Strong trust/accountability module. | Improve statement print/export. |
| Supplier Payments | Improve | Essential for owner cash control. | Keep; simplify payment methods and account selection. |
| Supplier Discounts | Simplify | Useful but can confuse early customers. | Merge into supplier payment/purchase adjustment UX. |
| Supplier Statement | Improve | High trust and dispute-resolution value. | Make printable and easy to send. |
| Retail Quick Sale | Hide from most distributor users | Useful for counter sales, not primary FMCG distributor workflow. | Keep off by default in distributor mode. |
| Retail Cash Sessions | Hide from most distributor users | Retail counter-specific. | Hide unless POS is enabled. |
| Sales Invoices | Nice to have | Useful for wholesalers, but secondary to DSR issue/settlement. | Keep, but do not lead sales pitch with it. |
| Sales Returns | Nice to have | Important in retail/wholesale, but settlement returns are more important for wedge. | Keep simple. |
| Retail Customers | Hide from distributor mode | Duplicates/confuses "shops/customers." | Use "Shops" as primary customer concept for distributors. |
| Customer Due Ledger | Merge | Distributor users think in shop due, not retail customer due. | Merge messaging with shop due where possible. |
| Customer Payments | Merge | Due collection should feel like shop due collection. | Surface under shop/customer ledger. |
| Retail Promotions | Remove from roadmap for now | Not relevant to distributor wedge. | Do not improve until retail POS becomes a deliberate segment. |
| Loyalty | Remove from roadmap for now | Retail-specific and can distract. | Hide for distributor tenants. |
| Quotations | Can wait | Useful for B2B quotes, not daily distributor pain. | Hide unless wholesaler segment asks. |
| Trade-ins | Remove from roadmap for now | Electronics/mobile shop-specific. | Do not invest. |
| Finance Accounts | Improve | Strong owner value if accurate. | Keep; simplify account setup and explain cash/bank meaning. |
| Finance Dashboard | Improve | Valuable for owners, but must be simple. | Connect to daily settlement, supplier payment, expenses. |
| Expenses | Simplify | Useful for profit, but can be overdone. | Keep basic categories and daily expense entry. |
| Profit / Loss | Improve | High business value. | Make profit explainable and trustworthy. |
| Daily Reports | Improve | Important after daily workflow. | Focus reports around distributor daily close. |
| Report Exports | Keep as-is, then improve | Bangladesh customers need print/PDF/Excel. | Standardize branded print layouts. |
| Activity Logs | Hide from most users | Useful for admins and disputes, not daily operator UX. | Keep in admin/security area. |
| Audit History | Keep as-is | Important trust feature. | Keep mostly internal/admin. |
| Trash / Soft Delete | Keep as-is | Protects from accidental deletion. | Keep; hide complexity from operators. |
| Users | Improve | Required for staff access. | Provide role presets for owner, manager, operator, DSR clerk. |
| Permissions | Simplify | Powerful but complex. | Replace raw permissions with templates for most customers. |
| Organization Settings | Improve | Needed for logo, address, tax, business type. | Make setup wizard handle this. |
| Security Page | Improve | Trust feature. | Keep session/login history, make it owner-readable. |
| Profile | Keep as-is | Standard account feature. | No major investment. |
| Help Desk | Improve later | Can support customer success. | Keep simple support ticket/contact flow. |
| Visitor Chat | Hide from product users | Marketing/support feature, not customer workflow. | Keep for website/admin only. |
| Contact Messages | Hide | Platform admin only. | No near-term investment. |
| Platform Tenants | Hide from customers | Internal SaaS admin. | Keep for founder/platform admin. |
| Tenant Feature Management | Improve internally | Needed to package plans. | Keep; simplify plan templates. |
| System Health | Hide | Internal ops. | Keep for platform admin. |
| Error Logs | Hide | Internal ops. | Keep for debugging. |
| Database Backup | Improve | Trust-critical. | Make backup policy visible and safe. |
| HR Employees | Hide from most users | Useful later, not core buying reason. | Hide unless customer requests staff records. |
| Salary Payments | Remove from roadmap for now | Not part of distributor wedge. | Do not invest until PMF is stronger. |
| Landing Page | Improve | Current message is too broad. | Create FMCG distributor-focused landing path. |
| Pricing Page | Improve | Pricing must reflect distributor value and setup effort. | Add distributor packages and setup fee. |
| Bangla/English i18n | Keep as-is, then improve | Strong localization advantage. | Continue, especially for operator workflows. |

---

# Phase 2 - FMCG Distributor Customer Journey

## Journey Summary

The first customer journey must produce value within 1 to 3 days:

> Owner signs up -> setup business -> import products/shops/DSRs -> enter opening stock/due -> run first issue -> run first settlement -> print first report -> trust the system.

## Step-by-Step Journey

### 1. Registration

Current likely reality:

- Registration appears platform-admin-led rather than self-service.
- A distributor may need the founder/admin to create the tenant.

Confusion/abandonment risks:

- Customer does not know how to start.
- Organization code concept may confuse non-technical users.
- No clear trial/demo path.

Improvements:

- Add "Book demo" and "Start distributor setup" flow.
- Create assisted onboarding, not fully self-service yet.
- Use a simple organization code such as business name abbreviation.
- Send login details and first-day checklist by WhatsApp.

### 2. Organization Setup

Required setup:

- Business name.
- Address.
- Phone.
- Logo.
- Business type: FMCG Distributor.
- Seller type: Dealer/Distributor.
- Tax settings if needed.
- Currency/display defaults.

Confusion/abandonment risks:

- Too many settings.
- Retail/pharmacy/electronics fields appear for distributor.
- Owner does not know what feature flags mean.

Improvements:

- Add a distributor setup wizard.
- Hide feature flags from customer.
- Use "Distributor Mode" with preselected modules.
- Provide progress checklist: Business -> Products -> Shops -> DSRs -> Opening Stock -> First Issue.

### 3. Product Import

Required setup:

- Product name.
- Unit/case/pcs conversion.
- Purchase price.
- Selling/wholesale price.
- Opening stock.
- Reorder level optional.

Confusion/abandonment risks:

- Manual entry is too slow.
- Product fields feel too complex.
- Case/pcs conversion mistakes create stock mismatch.
- Customer already has Excel but cannot import quickly.

Improvements:

- Build Excel import template.
- Provide "FMCG simple product template."
- Validate duplicate names and missing prices.
- Allow import preview before save.
- Provide sample filled template.

### 4. Customer/Shop Import

Required setup:

- Shop name.
- Owner/contact number.
- Area/route.
- Opening due.
- Assigned DSR optional.

Confusion/abandonment risks:

- "Customer" vs "Shop" naming confusion.
- Opening due entry is sensitive.
- Area/route may not be standardized.

Improvements:

- In distributor mode, call them "Shops."
- Add shop import template.
- Add route/area column.
- Allow opening due import.
- Show total opening due summary for owner confirmation.

### 5. DSR Creation

Required setup:

- DSR name.
- Phone.
- Area/route.
- Opening due/advance if any.
- Active status.

Confusion/abandonment risks:

- DSR vs SR terminology confusion.
- Owner may want routes instead of just names.
- Opening due may already exist from notebook.

Improvements:

- Use one term consistently: DSR or Salesman.
- Add route assignment.
- Allow opening balance entry.
- Add "DSR setup complete" checklist.

### 6. Opening Stock

Required setup:

- Starting stock by product.
- Damaged stock if any.
- Optional purchase cost.

Confusion/abandonment risks:

- Opening stock is tedious.
- Mistakes destroy trust from day one.
- Customer may not know current exact stock.

Improvements:

- Support opening stock import.
- Allow "estimated opening stock" flag.
- Show stock value after import.
- Add owner sign-off before starting live operations.

### 7. First Purchase

Required workflow:

- Select supplier.
- Add products and quantities.
- Enter purchase price.
- Enter paid/due amount.
- Update stock and supplier due.

Confusion/abandonment risks:

- Supplier payment/cash account concepts may confuse.
- Product cost changes may be unclear.
- Partial payment must be obvious.

Improvements:

- Add guided first purchase mode.
- Explain "Paid now" and "Supplier due."
- Default payment account to Cash.
- Show before/after supplier due.
- Print purchase receipt.

### 8. First Morning Issue

Required workflow:

- Select DSR.
- Select date.
- Add products/quantities issued.
- Print issue sheet.
- Stock decreases.

Confusion/abandonment risks:

- Staff may be slower than notebook initially.
- Product search must be fast.
- Mistakes in issue quantities create settlement problems.

Improvements:

- Make product entry keyboard-friendly.
- Add recent/frequent products.
- Show available stock inline.
- Print DSR issue sheet.
- Allow safe edit before settlement.

### 9. First Evening Settlement

Required workflow:

- Select DSR/date issue.
- Enter returned, damaged, sold, cash collected, shop collections/due.
- Calculate payable, due, stock return, damage.
- Update stock, due ledger, cash/finance.
- Print settlement.

Confusion/abandonment risks:

- This is the highest-risk workflow.
- If calculation is hard to understand, customer will not trust it.
- If settlement takes longer than notebook, adoption fails.
- If internet fails at evening time, customer panics.

Improvements:

- Make settlement the flagship UX.
- Show a simple formula: Issued - Returned - Damaged = Sold.
- Highlight cash expected vs cash received.
- Show new DSR due and shop due before saving.
- Add settlement preview before final submit.
- Add print format matching local business habits.
- Add draft autosave/offline-safe draft later.

### 10. First Report

Required report:

- Daily DSR summary.
- Stock remaining.
- Cash collected.
- Due added/collected.
- Product sales.
- Profit estimate.

Confusion/abandonment risks:

- Too many reports.
- Owner does not know which report matters.
- Numbers differ from notebook because setup data was wrong.

Improvements:

- Add "Today Owner Report."
- Show one daily close page.
- Include print/PDF/WhatsApp share.
- Provide explanation for each number.
- Add "data quality warning" if opening stock/due incomplete.

---

# Phase 3 - MVP To Market Leader

## Version 1.0 - Distributor Control MVP

Goal:

> A distributor can onboard, issue stock, settle DSRs, track shop due, and print daily reports reliably.

Features:

- Distributor Mode navigation.
- Setup wizard.
- Product import.
- Shop import.
- DSR import/simple creation.
- Opening stock import.
- Opening due import.
- Improved morning issue.
- Improved evening settlement.
- Today Owner Report.
- Secure password reset/admin reset.
- Secrets cleanup and deployment hardening.

UX improvements:

- Hide irrelevant modules.
- Guided setup checklist.
- Simple labels: Products, Shops, DSRs, Issue, Settlement, Due, Reports.
- Settlement preview before save.

Performance work:

- Optimize product/shop directory loading for setup and issue.
- Reduce large landing images.

Security work:

- Rotate exposed credentials.
- Remove secrets from config.
- Restrict production CORS.
- Confirm backups.

Business impact:

- Enables first 5 to 25 paying distributors.
- Creates first clear niche positioning.

Estimated development effort:

- 4 to 8 weeks for one developer, depending on import complexity.

## Version 1.1 - Repeatable Onboarding And Trust

Goal:

> Customers can be onboarded in a repeatable process with less founder handholding.

Features:

- Import preview and validation.
- Better print templates.
- Backup policy page.
- Role presets.
- Simple permission templates.
- Daily close report.
- Basic customer health tracking internally.

UX improvements:

- Setup progress meter.
- Error messages written for non-technical users.
- Simpler finance account setup.

Performance work:

- Faster report loading.
- Pagination/default filters for heavy pages.

Security work:

- Session/security page polish.
- Owner-visible login history.
- CI test/build pipeline.

Business impact:

- Supports 25 to 50 customers.
- Reduces onboarding time and support pressure.

Estimated development effort:

- 4 to 6 weeks.

## Version 1.2 - Daily Habit And Referrals

Goal:

> StockLedger becomes a daily habit and generates referrals.

Features:

- Daily WhatsApp-style owner summary.
- DSR performance summary.
- Shop due aging.
- Referral tracking manually or semi-automated.
- Customer testimonial/case study capture.
- Support/help flow improvement.

UX improvements:

- Dashboard focused on daily decisions.
- Better due collection screens.
- Mobile-friendly settlement review.

Performance work:

- Optimize dashboard API calls and frontend bundle.

Security work:

- Audit admin actions more visibly.
- Backup export access confirmation.

Business impact:

- Supports 50 to 100 customers.
- Improves retention and word-of-mouth.

Estimated development effort:

- 4 to 8 weeks.

## Version 2.0 - Scalable Distributor SaaS

Goal:

> StockLedger can scale beyond founder-led implementation.

Features:

- Subscription plans and billing workflow.
- Plan-based feature templates.
- Customer success admin dashboard.
- Offline-safe drafts for issue/settlement.
- Mobile-first DSR/settlement views.
- Multi-branch support only if customer demand validates it.
- Automated backup schedule/status.

UX improvements:

- Faster mobile workflows.
- Better empty states and guided corrections.
- Clear "close day" workflow.

Performance work:

- API query optimization.
- Better caching for directories.
- Frontend code splitting and asset compression.

Security work:

- Tenant isolation automated tests.
- Stronger backup/restore process.
- Distributed rate limiting if traffic requires.

Business impact:

- Supports 100 to 250 customers.
- Enables team-based sales/support.

Estimated development effort:

- 3 to 6 months.

## Version 3.0 - Market Leader Platform

Goal:

> StockLedger becomes the category leader for dealer/distributor operations in Bangladesh.

Features:

- Advanced route/territory management.
- Multi-branch/multi-warehouse if validated.
- DSR mobile app or PWA if validated.
- WhatsApp/SMS due reminders if validated.
- Accounting/payment integrations if they close deals.
- Partner/reseller dashboard.
- Benchmark analytics for owners.

UX improvements:

- Industry-specific modes: FMCG distributor, wholesale, pharmacy distributor, electronics dealer.
- More self-service onboarding.

Performance work:

- Scale database and API operations.
- Dedicated reporting layer if needed.

Security work:

- Stronger tenant isolation architecture.
- Formal compliance/security documentation.
- Admin audit and data export controls.

Business impact:

- Supports 500 to 1,000+ customers.
- Creates defensible market position.

Estimated development effort:

- 6 to 12 months after Version 2.0.

---

# Phase 4 - Feature Backlog

Scoring guide:

- Customer Value: High, Medium, Low.
- Revenue Impact: High, Medium, Low.
- Competitive Advantage: High, Medium, Low.
- Development Cost: Low, Medium, High.
- Maintenance Cost: Low, Medium, High.

## Must Build

| Rank | Feature | Customer Value | Revenue Impact | Competitive Advantage | Dev Cost | Maint. Cost |
|---:|---|---|---|---|---|---|
| 1 | Distributor Mode navigation | High | High | High | Medium | Low |
| 2 | Setup wizard | High | High | Medium | Medium | Medium |
| 3 | Product Excel import | High | High | Medium | Medium | Medium |
| 4 | Shop/customer Excel import | High | High | High | Medium | Medium |
| 5 | Opening stock import | High | High | Medium | Medium | Medium |
| 6 | Opening due import | High | High | High | Medium | Medium |
| 7 | DSR setup/import | High | High | High | Low | Low |
| 8 | Evening settlement UX upgrade | High | High | High | High | Medium |
| 9 | Morning issue UX upgrade | High | High | High | Medium | Medium |
| 10 | Today Owner Report | High | High | High | Medium | Medium |
| 11 | Settlement print format | High | High | High | Medium | Low |
| 12 | DSR due statement | High | High | High | Medium | Low |
| 13 | Shop due aging | High | High | High | Medium | Medium |
| 14 | Secure password reset/email or safe admin recovery | High | Medium | Medium | Medium | Low |
| 15 | Secrets cleanup and credential rotation | High | High | Medium | Low | Low |
| 16 | Production CORS/cookie hardening | High | Medium | Medium | Low | Low |
| 17 | Backup policy and safe export | High | High | Medium | Medium | Low |
| 18 | CI build/test pipeline | Medium | High | Medium | Medium | Medium |
| 19 | Role presets | High | Medium | Medium | Medium | Low |
| 20 | Data import validation preview | High | High | Medium | Medium | Medium |

## Should Build

| Rank | Feature | Customer Value | Revenue Impact | Competitive Advantage | Dev Cost | Maint. Cost |
|---:|---|---|---|---|---|---|
| 21 | Daily close workflow | High | High | High | Medium | Medium |
| 22 | Owner WhatsApp-style summary | High | High | High | Medium | Medium |
| 23 | DSR performance leaderboard | Medium | Medium | Medium | Medium | Low |
| 24 | Supplier statement polish | Medium | Medium | Medium | Low | Low |
| 25 | Purchase receive simplification | High | Medium | Medium | Medium | Medium |
| 26 | Finance account setup simplification | High | Medium | Medium | Medium | Low |
| 27 | Dashboard API optimization | Medium | Medium | Low | Medium | Low |
| 28 | Large image optimization | Medium | Medium | Low | Low | Low |
| 29 | Help/onboarding checklist | High | High | Medium | Low | Low |
| 30 | Customer health admin view | Medium | High | Medium | Medium | Medium |
| 31 | Audit explanations for owner | Medium | Medium | Low | Low | Low |
| 32 | Due collection workflow polish | High | High | High | Medium | Medium |
| 33 | Stock ledger print/export | Medium | Medium | Medium | Low | Low |
| 34 | Support ticket simplification | Medium | Medium | Low | Low | Low |
| 35 | Referral tracking | Medium | High | Medium | Medium | Low |
| 36 | Plan templates | Medium | High | Medium | Medium | Low |
| 37 | Subscription status workflow | Medium | High | Medium | Medium | Medium |
| 38 | Mobile settlement review | High | High | High | Medium | Medium |
| 39 | Offline-safe drafts for settlement | High | High | High | High | Medium |
| 40 | Tenant isolation automated tests | Medium | High | Medium | Medium | Medium |

## Nice To Have

| Rank | Feature | Customer Value | Revenue Impact | Competitive Advantage | Dev Cost | Maint. Cost |
|---:|---|---|---|---|---|---|
| 41 | Barcode-friendly product entry | Medium | Medium | Medium | Medium | Medium |
| 42 | Route/area management | Medium | Medium | High | Medium | Medium |
| 43 | DSR target tracking | Medium | Medium | Medium | Medium | Low |
| 44 | Customer visit tracking | Medium | Medium | Medium | High | Medium |
| 45 | Basic SMS/WhatsApp reminders | Medium | Medium | High | High | Medium |
| 46 | Multi-branch support | Medium | High | High | High | High |
| 47 | Mobile DSR portal | Medium | High | High | High | High |
| 48 | Accounting integration | Medium | Medium | Medium | High | High |
| 49 | Payment gateway integration | Medium | Medium | Medium | High | High |
| 50 | Advanced product analytics | Medium | Medium | Medium | Medium | Medium |
| 51 | Inventory reorder suggestions | Medium | Medium | Medium | Medium | Medium |
| 52 | Partner/reseller portal | Low | Medium | Medium | Medium | Medium |
| 53 | Self-service signup | Medium | Medium | Low | Medium | Medium |
| 54 | Demo tenant generator | Medium | Medium | Low | Medium | Low |
| 55 | Video training center | Medium | Medium | Low | Low | Medium |

## Never Build Unless Customers Demand It

| Rank | Feature | Customer Value | Revenue Impact | Competitive Advantage | Dev Cost | Maint. Cost |
|---:|---|---|---|---|---|---|
| 56 | Restaurant POS/KOT | Low | Low | Low | High | High |
| 57 | Full manufacturing/BOM | Low | Low | Low | High | High |
| 58 | Fashion size/color matrix | Low | Low | Low | High | High |
| 59 | Full e-commerce marketplace sync | Low | Medium | Low | High | High |
| 60 | Advanced HR/payroll suite | Low | Low | Low | High | High |
| 61 | Repair service management expansion | Low | Low | Low | Medium | Medium |
| 62 | Trade-in marketplace workflow | Low | Low | Low | Medium | Medium |
| 63 | Complex loyalty engine | Low | Low | Low | Medium | Medium |
| 64 | Coupon/promotion engine expansion | Low | Low | Low | Medium | Medium |
| 65 | CRM campaign automation | Low | Low | Low | High | High |

---

# Phase 5 - 12 Weekly Development Sprints

Assumption:

- One full-time developer.
- 30 to 40 focused development hours per week.
- Customer calls, support, and sales must still happen, so sprint scope is intentionally constrained.

## Sprint 1 - Product Focus And Safety

Goal:

- Make the product safe to demo and sell.

Tasks:

- Rotate/remove exposed database credentials.
- Confirm production environment variable strategy.
- Restrict production CORS/domain config.
- Define Distributor Mode route list.
- Draft setup checklist for FMCG distributor onboarding.

Estimated hours:

- 28 to 35.

Expected business impact:

- Reduces trust/security risk before onboarding customers.

Deliverables:

- Secrets cleaned.
- Distributor Mode spec.
- Onboarding checklist v1.

Success criteria:

- No secrets in deployment config.
- Clear list of modules shown to distributor users.

## Sprint 2 - Distributor Mode Navigation

Goal:

- Remove product confusion for FMCG distributors.

Tasks:

- Add tenant/business-type based menu simplification.
- Hide retail/electronics/pharmacy/HR modules by default for distributor mode.
- Rename customer-facing labels where needed: Customers -> Shops.
- Add default landing route for distributor users.

Estimated hours:

- 30 to 38.

Expected business impact:

- Product feels built for distributors, not everyone.

Deliverables:

- Distributor Mode navigation.
- Cleaner sidebar.

Success criteria:

- New distributor user sees only relevant modules.

## Sprint 3 - Setup Wizard Foundation

Goal:

- Guide customers from empty tenant to usable tenant.

Tasks:

- Build setup wizard shell.
- Add progress checklist.
- Add organization setup step.
- Add DSR setup step placeholder.
- Add product/shop import placeholders.

Estimated hours:

- 32 to 40.

Expected business impact:

- Reduces onboarding abandonment.

Deliverables:

- Setup wizard v1.

Success criteria:

- Customer knows what to do next after first login.

## Sprint 4 - Product Import

Goal:

- Make product onboarding fast.

Tasks:

- Create product import template.
- Add upload/import endpoint or frontend parser.
- Add validation preview.
- Support product name, unit/case, purchase price, selling price, opening stock.
- Add error report for invalid rows.

Estimated hours:

- 35 to 45.

Expected business impact:

- Reduces onboarding time from days to hours.

Deliverables:

- Product import workflow.
- Sample template.

Success criteria:

- 100 products can be imported without manual entry.

## Sprint 5 - Shop And Opening Due Import

Goal:

- Make shop/customer setup fast and trusted.

Tasks:

- Create shop import template.
- Support shop name, owner/contact, area/route, opening due.
- Add import preview with total opening due.
- Add duplicate detection.

Estimated hours:

- 32 to 42.

Expected business impact:

- Solves one of the hardest onboarding problems.

Deliverables:

- Shop import.
- Opening due import.

Success criteria:

- Customer can import shops and verify total due before going live.

## Sprint 6 - DSR Setup And Opening Balance

Goal:

- Make DSR setup simple.

Tasks:

- Add DSR quick-create/import.
- Add route/area field emphasis.
- Add opening due/advance support if not already smooth.
- Add DSR setup completion status.

Estimated hours:

- 25 to 35.

Expected business impact:

- Enables first real distributor workflow.

Deliverables:

- DSR setup/import.

Success criteria:

- Distributor can set up all DSRs in under 30 minutes.

## Sprint 7 - Morning Issue UX Upgrade

Goal:

- Make morning issue faster than notebook.

Tasks:

- Improve product search/entry speed.
- Show available stock inline.
- Add frequent/recent products if feasible.
- Improve issue print format.
- Add clearer edit rules before settlement.

Estimated hours:

- 35 to 45.

Expected business impact:

- Drives daily usage.

Deliverables:

- Improved morning issue page.
- Printable issue sheet.

Success criteria:

- A DSR issue can be created and printed in under 3 minutes for common orders.

## Sprint 8 - Evening Settlement UX Upgrade

Goal:

- Make settlement the flagship experience.

Tasks:

- Add settlement preview.
- Show formula: issued - returned - damaged = sold.
- Show expected cash, received cash, due.
- Show stock impact and due impact before save.
- Improve validation messages.
- Improve settlement print.

Estimated hours:

- 40 to 50.

Expected business impact:

- Highest retention and referral impact.

Deliverables:

- Settlement v2.

Success criteria:

- Customer understands settlement numbers before saving.

## Sprint 9 - Today Owner Report

Goal:

- Give owner a simple daily answer.

Tasks:

- Build Today Owner Report.
- Include cash collected, due added, due collected, sales, returns, damage, stock value, top DSRs.
- Add print/export.
- Add explanation labels.

Estimated hours:

- 32 to 42.

Expected business impact:

- Creates owner habit and perceived value.

Deliverables:

- Daily owner report.

Success criteria:

- Owner can understand today's business in under 2 minutes.

## Sprint 10 - Trust Layer

Goal:

- Make customers feel safe using StockLedger.

Tasks:

- Implement password reset email or safe admin reset process.
- Improve backup/export messaging.
- Add visible data export promise.
- Add login/session history polish.
- Add support contact inside app.

Estimated hours:

- 30 to 40.

Expected business impact:

- Reduces purchase objections and churn fear.

Deliverables:

- Account recovery.
- Trust/support page.

Success criteria:

- Customer can recover access and understand backup/export policy.

## Sprint 11 - Role Presets And Permissions Simplification

Goal:

- Prevent permission setup complexity.

Tasks:

- Create role presets: Owner, Manager, Operator, Accounts, DSR Clerk.
- Hide raw permission complexity from normal setup.
- Allow advanced permissions only for power users.
- Add default permissions by distributor mode.

Estimated hours:

- 30 to 40.

Expected business impact:

- Faster onboarding and fewer support issues.

Deliverables:

- Role preset workflow.

Success criteria:

- New staff user can be created with correct access in under 1 minute.

## Sprint 12 - Pilot Feedback And Polish

Goal:

- Convert pilot usage into paid retention.

Tasks:

- Fix top 10 customer-reported issues.
- Improve empty states and help text.
- Optimize dashboard/report loading pain points.
- Add first testimonial capture flow manually.
- Prepare sales demo script and demo tenant.

Estimated hours:

- 30 to 40.

Expected business impact:

- Improves conversion from trial/pilot to paid.

Deliverables:

- Pilot-ready release.
- Demo script.
- Customer testimonial checklist.

Success criteria:

- 5 to 10 pilot customers can be onboarded with repeatable process.

---

# Phase 6 - Customer Validation Plan

## Validation Method Rules

Use this decision framework:

- If the feature changes daily workflow, observe customers using the current workflow.
- If the feature affects trust or payment, interview owners directly.
- If the feature is complex, prototype before full build.
- If the feature is not tied to distributor PMF, delay it.
- If fewer than 5 serious customers ask for it, do not build unless it is security-critical.

## Roadmap Feature Validation

| Feature | Validation Method | Decision Bias |
|---|---|---|
| Distributor Mode | Observe customer confusion during demo. | Build immediately. |
| Setup Wizard | Observe first-time onboarding. | Build immediately. |
| Product Import | Ask for existing Excel sheets from 5 customers. | Build immediately. |
| Shop Import | Ask for customer/shop ledgers from 5 customers. | Build immediately. |
| Opening Stock Import | Observe setup pain. | Build immediately. |
| Opening Due Import | Interview owners and compare notebook totals. | Build immediately. |
| DSR Setup | Observe distributor team setup. | Build immediately. |
| Morning Issue UX | Observe morning operation live. | Build and iterate. |
| Evening Settlement UX | Observe evening settlement live. | Build and iterate aggressively. |
| Settlement Print | Ask for current notebook/print format. | Build using customer examples. |
| Today Owner Report | Interview owners on daily questions. | Prototype first, then build. |
| Password Reset | Security/ops requirement. | Build or implement safe admin flow. |
| Backup Policy | Trust requirement. | Build messaging and process. |
| Role Presets | Observe permission setup confusion. | Build after onboarding starts. |
| Daily Close | Observe end-of-day owner routine. | Prototype first. |
| Owner WhatsApp Summary | Manually send summaries to 5 customers first. | Build only if they value it. |
| DSR Performance | Interview owners after 2 weeks usage. | Delay until active usage. |
| Shop Due Aging | Ask owners how they prioritize collections. | Build if due is a top pain. |
| Referral Tracking | Manual tracking first. | Build later. |
| Subscription Billing | Manual invoices first. | Build after 50+ customers. |
| Offline Drafts | Observe internet failure frequency. | Build if it blocks daily use. |
| Mobile DSR View | Observe whether DSRs use phones or office staff enters data. | Delay until evidence. |
| Multi-branch | Ask only paying customers. | Delay until 20+ customers need it. |
| WhatsApp/SMS Reminders | Manually test message scripts. | Build only if collections improve. |
| Accounting Integration | Ask what accounting software customers actually use. | Delay. |
| Payment Gateway | Validate payment behavior in Bangladesh SMB context. | Delay. |
| HR/Salary | Ask if it affects buying decision. | Ignore for now. |
| Warranty/Repair | Only validate in electronics segment later. | Ignore for FMCG. |
| Pharmacy Batch | Only validate with pharmacy distributors later. | Ignore for FMCG. |
| Promotions/Loyalty | Validate only with retail POS customers. | Ignore for distributor wedge. |

---

# Phase 7 - Top 100 Improvements

Scoring:

- Business Value: High, Medium, Low.
- Customer Value: High, Medium, Low.
- Estimated Time: XS, S, M, L, XL.
- Risk: Low, Medium, High.
- Expected ROI: Very High, High, Medium, Low.

| Priority | Title | Reason | Business Value | Customer Value | Estimated Time | Risk | Dependencies | Expected ROI |
|---:|---|---|---|---|---|---|---|---|
| 1 | Rotate and remove exposed database credentials | Trust and security cannot be compromised. | High | High | XS | High | Deployment env setup | Very High |
| 2 | Restrict production CORS and cookie settings | Required before serious public use. | High | Medium | XS | Medium | Production domain | High |
| 3 | Define Distributor Mode module list | Removes confusion and sharpens positioning. | High | High | S | Low | Business type/feature flags | Very High |
| 4 | Hide irrelevant modules for FMCG distributor tenants | Makes product feel focused. | High | High | M | Medium | Distributor Mode | Very High |
| 5 | Create setup wizard | Prevents abandonment after first login. | High | High | M | Medium | Distributor Mode | Very High |
| 6 | Create product import template | Fast onboarding. | High | High | M | Medium | Product schema | Very High |
| 7 | Build product import preview | Prevents bad data and trust loss. | High | High | M | Medium | Product import | Very High |
| 8 | Create shop import template | Shops are core distributor data. | High | High | M | Medium | Shop fields | Very High |
| 9 | Build shop import preview with opening due totals | Due accuracy builds trust. | High | High | M | Medium | Shop import | Very High |
| 10 | Add opening stock import | Manual stock entry is too slow. | High | High | M | Medium | Product import | Very High |
| 11 | Add DSR quick import | Speeds distributor onboarding. | High | High | S | Low | DSR fields | High |
| 12 | Rename customer concepts to Shops in distributor mode | Matches customer language. | High | High | S | Low | Distributor Mode | High |
| 13 | Improve morning issue product search | Daily workflow must be fast. | High | High | M | Medium | Product directory | Very High |
| 14 | Show available stock in morning issue | Prevents issue mistakes. | High | High | S | Low | Product directory | High |
| 15 | Improve morning issue print sheet | Field teams need paper records. | High | High | M | Low | Existing print | High |
| 16 | Add settlement preview | Settlement must be trusted before save. | High | High | L | Medium | Settlement service/page | Very High |
| 17 | Show settlement formula clearly | Reduces confusion. | High | High | M | Low | Settlement UI | Very High |
| 18 | Show stock, cash, due impact before settlement save | Builds owner trust. | High | High | L | Medium | Settlement calculations | Very High |
| 19 | Improve settlement validation messages | Prevents support issues. | Medium | High | S | Low | Existing validations | High |
| 20 | Improve settlement print format | High daily business use. | High | High | M | Low | Settlement preview | Very High |
| 21 | Build Today Owner Report | Gives owner daily value. | High | High | M | Medium | Reports/data | Very High |
| 22 | Add daily close workflow | Creates daily habit. | High | High | L | Medium | Today Owner Report | Very High |
| 23 | Add DSR due statement print/export | Solves money disputes. | High | High | M | Low | DSR ledger | High |
| 24 | Add shop due aging report | Helps collection prioritization. | High | High | M | Medium | Shop ledger | High |
| 25 | Simplify finance account setup | Prevents cash/bank confusion. | High | Medium | M | Medium | Finance accounts | High |
| 26 | Improve purchase receive first-use flow | Purchases drive stock accuracy. | High | High | M | Medium | Products/suppliers | High |
| 27 | Improve supplier payment UX | Cash control must be simple. | Medium | High | M | Medium | Finance accounts | High |
| 28 | Improve supplier statement print/export | Supplier disputes are common. | Medium | High | S | Low | Supplier ledger | High |
| 29 | Add safe password reset email/admin recovery | Account recovery must work. | High | High | M | Medium | Email/env | High |
| 30 | Create backup policy page | Customers need trust. | High | Medium | S | Low | Backup service | High |
| 31 | Verify backup restore process | Backup without restore is incomplete. | High | High | M | Medium | Backup export | High |
| 32 | Add CI for frontend build | Prevents release breakage. | Medium | Medium | S | Low | Git hosting | High |
| 33 | Add CI for backend tests | Protects financial flows. | High | Medium | M | Medium | Test DB | High |
| 34 | Investigate backend test timeout | Tests must be reliable. | High | Medium | M | Medium | Test env | High |
| 35 | Add tenant isolation regression tests for core modules | Prevents cross-tenant leakage. | High | High | M | Medium | Test DB | Very High |
| 36 | Add role presets | Reduces permission complexity. | High | High | M | Medium | Permissions | High |
| 37 | Hide raw permissions behind advanced mode | Prevents owner confusion. | Medium | High | M | Low | Role presets | High |
| 38 | Add distributor onboarding checklist in app | Makes setup repeatable. | High | High | S | Low | Setup wizard | High |
| 39 | Create demo tenant for FMCG distributor | Improves sales demos. | High | Medium | S | Low | Seed data | High |
| 40 | Create demo script | Improves founder-led sales. | High | Medium | XS | Low | Demo tenant | High |
| 41 | Optimize landing page for FMCG distributors | Improves conversion. | High | Medium | M | Low | Positioning | High |
| 42 | Add distributor-specific pricing page | Supports paid conversion. | High | Medium | S | Low | Pricing decision | High |
| 43 | Add setup fee packaging | Protects founder time. | High | Medium | XS | Low | Pricing page | High |
| 44 | Add customer data import service offer | Turns onboarding into paid value. | High | High | XS | Low | Import workflows | High |
| 45 | Improve empty states for first-time users | Reduces confusion. | Medium | High | M | Low | UX copy | High |
| 46 | Add contextual help to issue/settlement | Reduces support. | Medium | High | M | Low | Workflow copy | High |
| 47 | Add Bangla operator-friendly labels | Improves frontline adoption. | Medium | High | M | Low | i18n | High |
| 48 | Compress large landing images | Improves load speed. | Medium | Medium | S | Low | Asset pipeline | Medium |
| 49 | Split large frontend chunks if easy | Improves performance. | Medium | Medium | M | Medium | Build config | Medium |
| 50 | Reduce dashboard initial API burden | Improves perceived speed. | Medium | Medium | M | Medium | Dashboard viewmodel | Medium |
| 51 | Add default report filters | Prevents slow/empty reports. | Medium | Medium | S | Low | Report pages | Medium |
| 52 | Improve low-stock report for distributors | Helps reorder decisions. | Medium | High | S | Low | Products | High |
| 53 | Add damaged stock report linkage to settlement | Makes damage visible. | Medium | High | M | Medium | Settlement/damaged stock | High |
| 54 | Add DSR route/area summary | Owners think by area. | Medium | High | M | Medium | DSR/shop area | High |
| 55 | Add top shops by due | Helps collection focus. | Medium | High | S | Low | Shop due | High |
| 56 | Add top products sold in settlement | Helps owner decisions. | Medium | Medium | S | Low | Settlement report | Medium |
| 57 | Add daily cash reconciliation summary | Prevents cash mismatch. | High | High | M | Medium | Finance/settlement | Very High |
| 58 | Add manual owner WhatsApp summary process | Validates before automation. | Medium | High | XS | Low | Today report | High |
| 59 | Automate owner WhatsApp-style summary if validated | Strong retention loop. | High | High | L | Medium | Validation | High |
| 60 | Add support contact button inside app | Improves trust. | Medium | Medium | XS | Low | Support channel | Medium |
| 61 | Add help desk simplification | Reduces support chaos. | Medium | Medium | S | Low | Existing help desk | Medium |
| 62 | Add customer health admin dashboard | Helps retention management. | High | Low | M | Medium | Activity data | High |
| 63 | Track last settlement per tenant | Identifies churn risk. | High | Low | M | Medium | Activity data | High |
| 64 | Track onboarding completion | Improves customer success. | High | Medium | M | Medium | Setup wizard | High |
| 65 | Add referral tracking manually in admin | Growth lever. | Medium | Low | S | Low | Tenant admin | Medium |
| 66 | Add customer testimonial capture checklist | Improves sales proof. | Medium | Low | XS | Low | Customer success | Medium |
| 67 | Create printable onboarding handout | Helps training. | Medium | Medium | XS | Low | Onboarding checklist | Medium |
| 68 | Add first-purchase guided mode | Reduces setup confusion. | Medium | High | M | Medium | Purchase receive | High |
| 69 | Add first-morning-issue guided mode | Reduces first-use anxiety. | Medium | High | M | Medium | Morning issue | High |
| 70 | Add first-settlement guided mode | Critical for activation. | High | High | L | Medium | Settlement preview | Very High |
| 71 | Add undo/restore explanation for critical deletes | Builds trust. | Medium | Medium | S | Low | Trash/audit | Medium |
| 72 | Make audit history easier to read | Helps dispute resolution. | Medium | Medium | M | Low | Audit data | Medium |
| 73 | Simplify supplier discounts by merging UI | Reduces module clutter. | Medium | Medium | M | Medium | Supplier payments | Medium |
| 74 | Hide retail promotions for distributor tenants | Reduces distraction. | Medium | Medium | S | Low | Distributor Mode | High |
| 75 | Hide loyalty for distributor tenants | Reduces distraction. | Medium | Medium | S | Low | Distributor Mode | High |
| 76 | Hide warranty/repair/trade-in for distributor tenants | Reduces distraction. | Medium | Medium | S | Low | Distributor Mode | High |
| 77 | Hide HR/payroll for distributor tenants | Reduces distraction. | Medium | Medium | S | Low | Distributor Mode | High |
| 78 | Hide pharmacy batch modules for FMCG tenants | Reduces distraction. | Medium | Medium | S | Low | Distributor Mode | High |
| 79 | Add feature plan templates | Enables packaging. | High | Low | M | Medium | Tenant features | High |
| 80 | Add plan labels in platform admin | Helps sales/admin. | Medium | Low | S | Low | Plan templates | Medium |
| 81 | Add subscription renewal reminders manually | Protects revenue. | Medium | Medium | S | Low | Tenant plan | Medium |
| 82 | Build billing automation after 50 customers | Scales revenue collection. | High | Medium | L | Medium | Customer count | High |
| 83 | Add offline-safe settlement draft prototype | Reduces evening risk. | High | High | L | High | Validation | High |
| 84 | Add mobile-friendly issue screen | Helps field/warehouse use. | Medium | High | M | Medium | Morning issue UX | High |
| 85 | Add mobile-friendly settlement screen | Helps evening workflow. | High | High | L | Medium | Settlement UX | High |
| 86 | Add barcode-friendly product lookup | Speeds product entry. | Medium | Medium | M | Medium | Product search | Medium |
| 87 | Add route/area filtering in reports | Distributor-specific value. | Medium | High | M | Medium | DSR/shop area | High |
| 88 | Add due collection priority list | Helps owner collect money. | High | High | M | Medium | Shop due aging | High |
| 89 | Add DSR performance report after adoption | Helps manage salesmen. | Medium | High | M | Medium | Settlement history | High |
| 90 | Add product profitability report simplification | Helps owner decisions. | Medium | Medium | M | Medium | Profit data | Medium |
| 91 | Add onboarding data quality warnings | Prevents wrong reports. | High | High | M | Medium | Imports/setup | High |
| 92 | Add stock mismatch invariant check UI for admin | Protects trust. | High | Medium | M | Medium | Invariant service | High |
| 93 | Add finance reference fields if needed | Improves reconciliation. | Medium | Medium | L | Medium | Finance schema | Medium |
| 94 | Add restore drill documentation | Proves backup trust. | Medium | Medium | S | Low | Backup process | Medium |
| 95 | Add customer export guarantee page | Reduces lock-in fear. | Medium | Medium | XS | Low | Backup/export | Medium |
| 96 | Add local market case study page | Increases conversion. | High | Low | S | Low | First customers | High |
| 97 | Add Bangla video tutorials | Reduces support and improves adoption. | Medium | High | M | Low | Stable workflows | High |
| 98 | Add reseller onboarding material | Enables later channel growth. | Medium | Low | M | Medium | Sales playbook | Medium |
| 99 | Add multi-branch discovery prototype only after demand | Avoids premature complexity. | Medium | Medium | L | High | Paying demand | Medium |
| 100 | Add pharmacy/electronics segment roadmap only after distributor PMF | Prevents focus dilution. | High | Low | XS | Low | PMF evidence | High |

---

# Final Execution Rule

For the next 12 months, every product decision should pass this test:

> Does this help a Bangladeshi distributor control DSR settlement, stock, due, cash, and profit better than notebooks, Excel, or generic POS?

If the answer is no, delay it.

If the answer is yes, make it simple, reliable, printable, and easy to onboard.

