# StockLedger 30-Day Growth Execution Plan

Date: 2026-07-05  
Goal: grow from 2 paying customers to 10 paying customers in 30 days  
Markets: Bangladeshi Dealers/FMCG Distributors and Bangladeshi Electronics Retailers  
Founder constraint: solo founder handles product, sales, support, onboarding, and development

## Core Principle

StockLedger should not win by becoming a bigger ERP.

StockLedger should win by becoming the easiest and most trusted daily business management system for:

- Dealers and FMCG distributors
- Electronics retailers

The next 30 days are not about building more software. They are about selling, onboarding, learning, and fixing only the problems that block payment or daily usage.

## Strategic Rule

Sales effort can be split 50/50 between distributors and electronics retailers.

Product development should not be split 50/50.

Product development should prioritize shared workflows that benefit both markets:

- Purchase
- Inventory
- Sales or issue
- Customer/shop due
- Supplier due
- Cash collection
- Expenses
- Profit visibility
- Daily closing
- Reports
- Trust and data safety

Electronics-specific workflows should be validated before building:

- Warranty
- IMEI / serial-heavy workflows
- Trade-in
- Installments

---

# 1. Current Situation

## Business Reality

- StockLedger has 2 paying customers.
- One electronics retailer is expected to become a paying customer.
- The founder has limited time and budget.
- The next milestone is 10 paying customers within 30 days.
- The product already has many modules, but more modules will not automatically create PMF.
- The biggest constraint is not feature count. It is focused positioning, demo quality, onboarding speed, customer trust, and sales execution.

## Market Reality

Dealers/FMCG distributors are already validated by paying customers.

Electronics retailers are promising but not yet validated enough to justify niche-heavy development.

The right approach is:

- Sell both markets.
- Build shared features first.
- Validate electronics-specific requests with paying users before committing engineering time.

---

# 2. Biggest Risks

| Risk | Why It Matters | Action |
|---|---|---|
| Building too many features instead of selling | Every coding hour reduces sales and onboarding time | Limit development to blockers only |
| Chasing electronics-specific features too early | Warranty, IMEI, trade-in, installments can consume weeks | Validate before building |
| Product looks too broad | Prospects may see StockLedger as complicated ERP | Demo only relevant modules |
| Weak onboarding | Customers leave if setup feels hard | Founder-assisted setup and templates |
| Inventory or due numbers feel wrong | Trust collapses immediately | Prioritize accuracy, clear reports, backup |
| No clear daily closing workflow | Owners need end-of-day answers | Build or polish daily close only if needed |
| Weak sales pipeline | Product improvements do not matter without prospects | Daily outreach and demos |
| Founder support overload | Early customers need handholding | Use checklists, templates, repeated scripts |

---

# 3. Biggest Opportunities

| Opportunity | Why It Can Win | Action |
|---|---|---|
| Distributor DSR settlement | Local competitors often do generic inventory, not DSR accountability | Make Morning Issue and Evening Settlement the strongest story |
| Electronics retail basics | Many retailers need inventory, due, purchase, profit, expense, daily closing | Sell shared business control, not advanced repair/warranty |
| Founder-led onboarding | Bangladeshi SMEs value personal setup and support | Offer setup service as part of sales |
| Trust positioning | Businesses fear data loss and wrong balances | Backup promise, accurate ledgers, clear reports |
| Local workflow language | Local terms and print formats matter | Use simple Bangladeshi business language |
| Referral potential | Similar businesses know each other | Ask every happy customer for 2 introductions |

---

# 4. Shared Features That Benefit Both Markets

These get priority because one implementation can help both distributors and electronics retailers.

| Feature | Priority | Business Impact | Customer Value | Revenue Impact | Dev Effort | Maintenance Cost | Risks | Est. Hours | Expected ROI |
|---|---|---|---|---|---|---|---|---:|---|
| Inventory accuracy | ✅ Build Now | Core trust driver | Owner trusts stock | Very high | Medium | Medium | Wrong stock kills trust | 10-25 | Very high |
| Purchase receive | ✅ Build Now | Required for stock entry | Stock increases correctly | High | Low-medium if already built | Low | Form complexity | 4-12 polish only | High |
| Supplier due | ✅ Build Now | Common to both markets | Tracks payables | Medium-high | Low-medium | Low | Confusing if too detailed | 4-10 polish only | High |
| Customer/shop due | ✅ Build Now | Daily cash control | Tracks receivables | Very high | Medium | Medium | Duplicate customer concepts | 8-20 | Very high |
| Cash collection | ✅ Build Now | Converts sales into cash control | Shows who paid | High | Medium | Medium | Wrong due updates | 8-16 | High |
| Expenses | ✅ Build Now | Helps owner see real profit | Tracks daily costs | Medium | Low | Low | Can become accounting ERP | 2-6 polish only | Medium-high |
| Profit basics | ✅ Build Now | Strong sales hook | Owner sees margin | High | Medium | Medium | Profit must be trustworthy | 6-16 polish only | High |
| Daily closing report | ✅ Build Now | Strong demo and retention feature | One answer at day end | Very high | Medium | Low-medium | Overbuilding dashboard | 12-24 | Very high |
| Stock report | ✅ Build Now | Required by both markets | Owner sees stock position | High | Low-medium | Low | Too many report variants | 4-10 polish only | High |
| Backup/export promise | ✅ Build Now | Builds trust | Reduces fear of data loss | Medium-high | Low | Low | Restore process must be real | 3-8 | High |
| Founder-led onboarding templates | ✅ Build Now | Faster conversion | Customer knows what data to provide | Very high | Low | Low | Templates may be ignored without follow-up | 6-12 | Very high |
| Distributor/electronics demo tenants | ✅ Build Now | Improves demos | Prospect sees relevant workflow | Very high | Low | Low | Demo data must be realistic | 6-12 | Very high |
| Focused pricing sheet | ✅ Build Now | Reduces buying confusion | Clear monthly/setup cost | High | Low | Low | Wrong pricing can slow closing | 2-4 | Very high |
| Login/security trust cleanup | ✅ Build Now | Prevents trust damage | Safer access | Medium-high | Low-medium | Low | Deployment mistakes | 4-8 | High |

---

# 5. Dealer / Distributor Priorities

## Primary Workflow

Purchase -> Inventory -> Morning Issue -> DSR -> Shop Due -> Evening Settlement -> Returns/Damage -> Cash Collection -> Daily Closing

## Priority Table

| Feature | Priority | Business Impact | Customer Value | Revenue Impact | Dev Effort | Maintenance Cost | Risks | Est. Hours | Expected ROI |
|---|---|---|---|---|---|---|---|---:|---|
| Morning Issue clarity and speed | ✅ Build Now | Core distributor workflow | Faster daily operation | Very high | Medium | Medium | Staff may still prefer notebook if slow | 8-20 | Very high |
| Evening Settlement clarity | ✅ Build Now | Main differentiator | Less cash/due confusion | Very high | Medium-high | Medium | Calculation changes are risky | 12-30 | Very high |
| Settlement print format | ✅ Build Now | Builds trust and habit | Familiar paper trail | High | Low-medium | Low | Bad print layout reduces trust | 6-12 | High |
| Shop due ledger | ✅ Build Now | Strong owner pain | Shows who owes money | Very high | Medium | Medium | Must match real balances | 6-16 | Very high |
| DSR due ledger | ✅ Build Now | DSR accountability | Shows salesman responsibility | High | Medium | Medium | Terms must be clear | 6-16 | High |
| Damage tracking in settlement | ✅ Build Now | Common distributor issue | Separates returned/damaged stock | High | Medium | Medium | Inventory impact must be correct | 6-14 | High |
| Daily DSR summary | ✅ Build Now | Helps owner close day | DSR-wise sales/cash/due | Very high | Medium | Low-medium | Avoid overbuilt dashboard | 10-20 | Very high |
| DSR targets | Build After 10 Customers | Nice management feature | Motivation/performance | Medium | Medium | Medium | Not needed to close first 10 | 8-16 | Medium |
| Route planning | Build After 25 Customers | Operational improvement | Better DSR routing | Medium | High | High | Complex and unvalidated | 30-60 | Low now |
| Mobile DSR app | Validate First | Could help field sales | DSR direct entry | Unknown | High | High | DSRs may not enter data | 60+ | Unknown |

---

# 6. Electronics Retail Priorities

## Primary Workflow

Purchase -> Inventory -> Sales -> Customer Due -> Supplier Due -> Expenses -> Profit -> Daily Closing -> Stock Reports

## Priority Table

| Feature | Priority | Business Impact | Customer Value | Revenue Impact | Dev Effort | Maintenance Cost | Risks | Est. Hours | Expected ROI |
|---|---|---|---|---|---|---|---|---:|---|
| Product purchase | ✅ Build Now | Required workflow | Stock entry | High | Low-medium if already built | Low | None if current flow works | 4-12 polish only | High |
| Inventory/stock report | ✅ Build Now | Core retail need | Knows available stock | High | Low-medium | Low | Stock mistakes lose trust | 4-12 | High |
| Sales invoice / sales entry | ✅ Build Now | Core retail workflow | Records sale and due | High | Medium | Medium | Too complex checkout hurts adoption | 8-20 polish only | High |
| Customer due | ✅ Build Now | Common Bangladesh retail pain | Tracks receivables | Very high | Medium | Medium | Duplicate customer modules can confuse | 8-16 | Very high |
| Supplier due | ✅ Build Now | Common retail need | Tracks payable | Medium-high | Low-medium | Low | Must be easy | 4-10 | High |
| Expense tracking | ✅ Build Now | Helps profit accuracy | Tracks costs | Medium | Low | Low | Avoid accounting complexity | 2-6 | Medium |
| Profit tracking | ✅ Build Now | Strong owner hook | Margin visibility | High | Medium | Medium | Must be accurate | 6-16 | High |
| Daily closing | ✅ Build Now | Retention driver | End-of-day confidence | Very high | Medium | Low-medium | Do not overbuild | 12-24 | Very high |
| Warranty management | Validate First | May help electronics | Tracks warranty claims | Unknown until customer pays/uses | Medium-high | Medium | Niche complexity | 0 now, 20-40 later | Unknown |
| IMEI / serial-heavy workflows | Validate First | May be valuable for phones/electronics | Tracks item identity | Unknown | High | High | Can slow product/sales entry | 0 now, 30-80 later | Unknown |
| Trade-in | Validate First | Some electronics shops use it | Manages old-device exchange | Unknown | High | Medium-high | Very niche | 0 now, 30-60 later | Unknown |
| Installments | Validate First | Potentially strong in electronics | Tracks collection schedule | Potentially high | High | High | Disputes/defaults/reporting complexity | 0 now, 50-100 later | Unknown |
| Repair/service center | Build After 25 Customers | Different business workflow | Service tracking | Low now | High | High | Turns product into repair software | 0 now | Low now |

## Electronics Rule

For the first electronics retailer:

- Listen carefully.
- Record every request.
- Do not build electronics-specific features immediately.
- Only fix blockers that prevent payment, onboarding, or daily use.
- If they request warranty, IMEI, trade-in, or installments, ask whether they will pay without it for 30 days using the core system.

---

# 7. Weekly Execution Plan

## Week 1: Sales Assets, Trust, Demo Readiness

Goal:

- Become ready to demo and close both markets without confusion.

Product tasks:

- Prepare one distributor demo tenant.
- Prepare one electronics retail demo tenant.
- Hide irrelevant modules during demos.
- Create one pricing sheet.
- Create onboarding templates for product, customer/shop, supplier, opening stock, opening due.
- Complete production trust cleanup if not already done.

Sales tasks:

- List 50 distributor prospects.
- List 50 electronics retailer prospects.
- Contact at least 40 total prospects.
- Book at least 8 demos.

Customer interview tasks:

- Interview current 2 paying customers.
- Interview expected electronics retailer before building anything niche.

Success criteria:

- 2 demo environments ready.
- 8 demos booked.
- At least 2 strong prospects agree to trial/onboarding.

## Week 2: Founder-Led Demos And Onboarding

Goal:

- Convert demos into paid customers or committed trials.

Product tasks:

- Fix only demo blockers.
- Fix only onboarding blockers.
- Improve settlement or daily close explanation if prospects are confused.

Sales tasks:

- Run 8-12 demos.
- Follow up within 24 hours after every demo.
- Offer setup assistance as part of package.
- Ask for advance/payment to start onboarding.

Customer interview tasks:

- Ask every prospect to show current notebook, Excel, or software.
- Record objections word-for-word.

Success criteria:

- 2 new paid customers or committed onboarding customers.
- 10 real objections documented.
- At least 5 real data samples collected.

## Week 3: Close, Onboard, Fix Real Friction

Goal:

- Turn prospects into active users.

Product tasks:

- Fix current-customer blockers.
- Improve print/report format only if it helps adoption.
- Create daily closing report if customers cannot answer "what happened today?"

Sales tasks:

- Contact another 40 prospects.
- Ask current customers for referrals.
- Run 6-10 demos.
- Push undecided prospects with setup deadline.

Customer interview tasks:

- Observe at least one morning issue or sales entry.
- Observe at least one evening settlement or daily close.

Success criteria:

- 4-5 total paying customers.
- At least 3 customers complete one full daily workflow.
- At least 2 referrals received.

## Week 4: Conversion Push And Retention

Goal:

- Reach 10 paying customers or build a strong pipeline that can close immediately after 30 days.

Product tasks:

- Fix only payment blockers and churn risks.
- Do not start large features.
- Document the onboarding process based on actual customers.

Sales tasks:

- Run final push: 50 calls/messages/visits.
- Offer limited founder-assisted setup slots.
- Ask every warm lead for a clear yes/no decision.
- Ask every customer for 2 similar business introductions.

Customer interview tasks:

- Ask paying customers why they bought.
- Ask lost prospects why they did not buy.

Success criteria:

- 10 paying customers, or at minimum 6-8 paid plus clear pipeline.
- Repeatable demo script.
- Repeatable onboarding checklist.
- Clear next feature decision based on evidence.

---

# 8. Sales Plan

## Positioning

Use two simple messages.

For distributors:

> StockLedger helps distributors control DSR stock, cash, shop due, returns, damage, and daily settlement.

For electronics retailers:

> StockLedger helps electronics retailers manage purchase, stock, sales, customer due, supplier due, expenses, profit, and daily closing.

Do not lead with:

- ERP
- Advanced accounting
- Warranty
- Repair
- IMEI
- Trade-in
- Installments
- Automation

Lead with:

- Stock control
- Due control
- Cash control
- Daily closing
- Owner visibility
- Founder-assisted setup

## Prospecting Targets

Daily target:

- 10 new distributor contacts
- 10 new electronics retailer contacts
- 3 follow-ups
- 1 demo booked

30-day target:

- 300-400 total touches
- 25-35 demos
- 10-15 serious onboarding conversations
- 8 new paying customers

## Sales Offer

Simple offer:

- Monthly subscription
- One-time setup/import fee if needed
- Founder-assisted onboarding
- First week hands-on support
- Data backup/export promise

Avoid complicated plans until 10 customers.

## Demo Flow

Distributor demo:

1. Products and opening stock
2. DSR setup
3. Shop due
4. Morning issue
5. Evening settlement
6. Daily close
7. Stock report

Electronics demo:

1. Products and purchase
2. Stock report
3. Sales entry
4. Customer due
5. Supplier due
6. Expenses/profit
7. Daily close

---

# 9. Customer Interview Plan

## Interview Current Distributor Customers

Ask:

- What made you pay for StockLedger?
- What is still confusing?
- Which report do you check daily?
- What do staff struggle with?
- Where do you still use notebook or Excel?
- What would make you recommend this to another distributor?
- What would make you stop using it?

## Interview Distributor Prospects

Ask:

- How do you issue stock to DSRs today?
- How do you settle in the evening?
- Where do mistakes happen?
- How do you track shop due?
- How much time does daily closing take?
- What software have you tried?
- Why did you reject other software?
- What would make you pay this month?

## Interview Electronics Retailers

Ask:

- How do you record purchases?
- How do you track current stock?
- How do you record sales?
- Do customers buy on due?
- Do you track supplier due?
- How do you calculate profit?
- What do you check at closing time?
- Do you actually need warranty, serial/IMEI, trade-in, or installments now?
- Would you pay without those advanced features if purchase, stock, sales, due, and profit work well?

## Validation Rules For Electronics-Specific Features

Warranty:

- Build only if at least 3 paying electronics retailers say warranty tracking is required for daily operation or renewal.

IMEI / serial-heavy workflows:

- Build only if serial identity is required for actual stock/sales control and customers accept the added entry time.

Trade-in:

- Build only if multiple paying electronics retailers actively do trade-ins weekly and cannot manage without it.

Installments:

- Build only if installment sales are common, high-value, and customers will pay specifically for installment tracking.

---

# 10. Success Metrics

## Revenue Metrics

- Paying customers: target 10
- New paying customers: target 8
- Setup fees collected: track amount
- Monthly recurring revenue: track before/after
- Demo-to-paid conversion: target 25-35%

## Sales Metrics

- Prospects contacted: 300+
- Demos booked: 25+
- Demos completed: 20+
- Follow-ups completed within 24h: 90%+
- Referrals requested: every paying customer
- Referrals received: 5+

## Onboarding Metrics

- Time from payment to first use: under 3 days
- Time to product/shop/customer setup: under 1 day after data received
- First successful daily close: within 7 days
- Support calls in first week: track by issue

## Product Metrics

- Morning issue completed without founder help
- Evening settlement completed without founder help
- Sales/due entry completed without founder help
- Daily close viewed or printed
- Stock report checked

## Retention Metrics

- Weekly active customers
- Customers completing daily workflow at least 3 days/week
- Number of customers still using notebook/Excel in parallel
- Customer satisfaction after first week

---

# 11. Features To Delay

| Feature | Priority | Reason |
|---|---|---|
| Full setup wizard | Build After 10 Customers | Manual onboarding teaches real setup problems |
| Full import UI | Build After 10 Customers | Need repeated real spreadsheets first |
| Role preset UI | Build After 10 Customers | Founder can configure manually |
| Billing automation | Build After 25 Customers | Manual billing is enough now |
| Customer health dashboard | Build After 25 Customers | Track in spreadsheet now |
| Mobile DSR app | Validate First | Unknown if DSRs will enter data |
| Offline mode | Validate First | Expensive; only build if internet issues block sales |
| WhatsApp automation | Validate First | Send manual summaries first |
| Warranty management | Validate First | Electronics-specific; include in research, not build-now |
| IMEI / serial-heavy workflows | Validate First | Can slow usage and create complexity |
| Trade-in | Validate First | Niche electronics workflow |
| Installments | Validate First | Potentially valuable but high complexity |
| Repair management | Build After 25 Customers | Different workflow; avoid service-center product drift |
| HR/payroll | ⚫ Ignore | Not relevant to current two markets |
| Pharmacy | ⚫ Ignore | Not current target |
| Loyalty programs | ⚫ Ignore | Not needed for acquisition or retention now |
| Manufacturing | ⚫ Ignore | Outside market |
| Restaurant POS | ⚫ Ignore | Outside market |

---

# 12. Founder Checklist

## Daily Checklist

- Contact 20 prospects.
- Follow up with every warm lead.
- Book at least 1 demo.
- Ask 1 customer/prospect for workflow evidence.
- Fix only one high-impact blocker if needed.
- Record objections in a simple spreadsheet.
- Ask at least one happy customer for referrals.

## Weekly Checklist

- Count new paying customers.
- Count demos completed.
- Review lost deals and reasons.
- Review top 5 support issues.
- Review onboarding time.
- Decide one product fix for the week.
- Decide what not to build.

## Founder Time Allocation

For the next 30 days:

- 50% sales and demos
- 20% onboarding and support
- 15% customer interviews and observation
- 15% product fixes

If development exceeds 15-20% of your week, you are probably overbuilding.

---

# 13. Next Decisions

## Decision 1: Pricing

Decide:

- Monthly subscription amount
- Setup/import fee
- Whether first month includes onboarding support

Do not create complex pricing tiers now.

## Decision 2: Demo Packaging

Decide:

- Distributor demo flow
- Electronics retail demo flow
- Which modules must be hidden in each demo

## Decision 3: First Electronics Retailer Scope

Decide before onboarding:

- What must work on day one
- What they requested but can wait
- Whether warranty, IMEI, trade-in, or installments are required for payment or only future requests

## Decision 4: Daily Closing

Decide:

- Does the existing report/dashboard already answer daily closing?
- If not, what exact 5-7 numbers must be shown?

Recommended daily close numbers:

- Total sales or issue value
- Cash received
- New due
- Due collected
- Supplier payment
- Expenses
- Stock movement summary
- Profit estimate if reliable

## Decision 5: What To Stop Building

Stop building anything that does not help close, onboard, retain, or get referrals from the next 8 customers.

---

# Final Recommendation

The next 30 days should be run like a sales sprint, not a product sprint.

Build only:

- Shared daily workflow improvements
- Trust/security fixes
- Demo clarity
- Onboarding templates
- Report/print fixes that help customers operate daily

Validate first:

- Warranty
- IMEI / serial-heavy workflows
- Trade-in
- Installments
- Mobile/offline workflows

Ignore:

- HR
- Pharmacy
- Loyalty
- Generic ERP expansion
- Industry expansion beyond distributors and electronics retailers

The founder's main job now is not to build the perfect software.

The founder's main job is to sell, onboard, observe, and convert customer pain into the smallest possible product improvements that increase revenue.

