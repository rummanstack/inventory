# StockLedger Lean PMF Roadmap Review

Date: 2026-07-05

Current reality:

- 1 full-time developer.
- 2 paying customers.
- Immediate goal: next 10 paying customers.
- Competitors: small local inventory software companies.
- Advantage must be ease of use, trust, onboarding, DSR management, inventory accuracy, and support.

Core verdict:

> The previous execution plan was directionally correct but still too ambitious. At 2 paying customers, StockLedger does not need a bigger roadmap. It needs a narrower promise, faster onboarding, stronger trust, and proof that distributors will pay because DSR settlement and due control are better than notebooks, Excel, or generic software.

Operating rule for the next 6 weeks:

> If it does not help close the next 10 customers or prevent current-customer churn, postpone it.

---

# Task 1: What To Remove, Delay, Or Challenge

## Over-Engineered Ideas

| Idea | Problem | Decision |
|---|---|---|
| Full setup wizard | Sounds right, but expensive. With 2 customers, founder-led onboarding is better because it teaches what the real setup problems are. | Delay until 25+ customers. Use a manual onboarding checklist now. |
| Full "Distributor Mode" architecture | Useful later, but full architecture work can become a rabbit hole. | Do only simple menu hiding or tenant feature defaults now. |
| Robust product/shop import with preview, validation, rollback, and UI | High value eventually, but building a full import product before seeing 10 real spreadsheets is premature. | Use templates and founder-assisted import now. Build automation after repeated patterns appear. |
| Opening stock/opening due import UI | Important, but same issue as import. Real data formats will vary. | Start with Excel templates and manual import service. Automate after 5 to 10 similar imports. |
| Role preset system | Useful, but not what closes early customers. Founder can configure permissions manually. | Delay until 10 to 25 customers. |
| Customer health admin dashboard | Founder can track 10 customers manually in a spreadsheet. | Delay until 50 customers. |
| Billing automation | Manual invoices and bKash/bank collection are enough for early customers. | Delay until 50 customers. |
| Partner/reseller portal | No point before founder-led sales works. | Delay until 100+ customers. |
| Multi-branch/multi-warehouse | Large-customer complexity before PMF. | Delay until 100+ customers and only if paid demand exists. |
| Offline-safe drafts | Potentially valuable, but expensive and risky. Must be validated by real evening-settlement failures. | Delay until it blocks sales or churns customers. |
| Mobile DSR portal/app | Assumes DSRs themselves will use the system. Many distributors may have office staff enter data. | Delay until observed. |
| WhatsApp/SMS automation | Sounds attractive, but manual WhatsApp summaries can validate value first. | Manual first. Automate after 25+ customers if valued. |
| Advanced dashboard redesign | Owners need a few trusted numbers, not a complex BI page. | Delay broad dashboard work. Build only the daily report needed to close customers. |
| CI/testing expansion | Technically valuable, but not the main closing lever for the next 10. | Do minimal smoke testing now; formal CI after early PMF unless current instability blocks sales. |

## Premature Optimizations

| Optimization | Why Premature | Decision |
|---|---|---|
| Frontend chunk splitting | Unless prospects complain that the app is slow, this does not close the next 10 customers. | Delay. |
| Landing image compression | Worth doing only if quick. Do not spend a week on it. | Small fix only. |
| Dashboard API optimization | Only needed if real users report dashboard slowness. | Delay. |
| Distributed rate limiting | Not relevant at 2 to 10 customers. | Delay. |
| Formal migration system | Important later, not a near-term sales lever unless deployments are breaking. | Delay. |
| Full backup/restore UI | Customers need trust, but not a complex UI. | Use a clear backup/export policy and manual restore test. |

## Features With Weak Customer Value Right Now

| Feature | Why Weak Now | Decision |
|---|---|---|
| HR/salary | Does not sell distributor software. | Ignore for now. |
| Warranty/repair/trade-ins | Electronics-specific. | Ignore for FMCG distributor PMF. |
| Pharmacy batches | Different market. | Ignore unless targeting pharmacy distributors later. |
| Promotions/loyalty | Retail POS feature, not DSR settlement pain. | Ignore for now. |
| Quotations | Useful but not daily distributor pain. | Delay. |
| Visitor chat/contact admin improvements | Does not close distributor customers. | Delay. |
| Advanced audit UI | Useful in disputes, but not a sales hook. | Delay. |
| Referral tracking system | Manual tracking is enough early. | Delay. |

## Should Be Postponed Until 50 Customers

- Billing automation.
- Customer health dashboard.
- Formal support ticket process.
- Role preset UI.
- Setup wizard v2.
- Automated referral tracking.
- Full CI/CD and automated release pipeline, unless instability becomes a real blocker.
- Formal backup dashboard.

## Should Be Postponed Until 100 Customers

- Offline-first drafts.
- Mobile DSR portal.
- Multi-branch support.
- Plan-based feature templates.
- Advanced route/territory management.
- Structured reseller program.
- Paid marketing experiments beyond simple content and direct outreach.

## Should Be Postponed Until 500 Customers

- Partner/reseller portal.
- Marketplace/integration ecosystem.
- Accounting/payment integrations unless a large paying deal requires them.
- Benchmark analytics.
- Industry expansion into pharmacy/electronics as separate go-to-market motions.
- Native mobile apps.

## Assumption-Based Ideas That Need Evidence

| Assumption | Risk | Validation Required |
|---|---|---|
| FMCG distributors are the best ICP | Likely true, but 2 customers are not enough evidence. | Interview 15 distributors and compare close rate with other segments. |
| Customers need automated import | They may accept paid founder-assisted import. | Collect 10 real spreadsheets before building robust import. |
| Owners want a daily owner report | They may only want settlement print and due list. | Ask owners what they check every night. |
| DSRs need mobile access | DSRs may not use software directly. | Observe who actually enters data. |
| Offline mode is critical | Internet pain may be less important than staff training. | Ask and observe evening settlement failures. |
| Role presets are urgent | Founder can manually configure roles for first 10. | Track permission setup support issues. |
| WhatsApp summaries will improve retention | Nice idea, not proven. | Send manual summaries to 5 customers first. |

---

# Task 2: True Version 1.0 In 6 Weeks

Version 1.0 should not be a broad product release.

Version 1.0 should be:

> A sellable, trustworthy, founder-onboarded DSR settlement and inventory control system that can convert the next 10 paying customers.

## Include Only These

### 1. Security And Trust Basics

- Rotate exposed database credentials.
- Remove secrets from deploy config.
- Confirm production environment variables.
- Restrict production CORS/domain settings where applicable.
- Create a simple backup/export promise.
- Implement safe password recovery, even if admin-assisted.

Why:

- Trust kills sales faster than missing features.

### 2. Founder-Led Onboarding Kit

- Distributor setup checklist.
- Product Excel template.
- Shop/customer Excel template.
- DSR setup template.
- Opening stock/due template.
- Manual import process.
- First-day training checklist.

Why:

- The next 10 customers need setup help more than they need a full self-service wizard.

### 3. Sales Demo System

- One clean FMCG distributor demo tenant.
- Demo script.
- Pricing sheet.
- One-page offer: "DSR settlement and due control for distributors."

Why:

- You cannot close 10 customers with a confusing demo.

### 4. Morning Issue Polish

- Faster product search/entry if current customers struggle.
- Available stock visibility.
- Clean issue print.
- Clear edit-before-settlement behavior.

Why:

- Morning issue is the start of the daily workflow.

### 5. Evening Settlement Polish

- Clear formula: issued - returned - damaged = sold.
- Clear cash received, due, return, damage, stock impact.
- Settlement print that matches local expectations.
- Fix any real calculation or UX issues from current customers.

Why:

- This is the product's main reason to exist.

### 6. One Daily Close Report

- Cash collected.
- Due added/collected.
- Stock issued/sold/returned/damaged.
- DSR-wise summary.
- Print/export if easy.

Why:

- Owners need one trusted answer at the end of the day.

## Exclude From Version 1.0

- Full setup wizard.
- Full import UI with preview and rollback.
- Billing automation.
- Customer health dashboard.
- Offline mode.
- Mobile DSR app.
- WhatsApp automation.
- Role preset UI.
- Multi-branch.
- Advanced route management.
- Accounting/payment integrations.
- HR, repair, warranty, pharmacy, promotions, loyalty improvements.
- Full dashboard redesign.

---

# Task 3: Strict Priority List

## Priority 1: Fix Current Customer Blockers

Why it matters:

- Current paying customers are the best PMF evidence.

Customer pain solved:

- Removes actual friction, not imagined friction.

Estimated development effort:

- Variable, 10 to 25 hours weekly.

Estimated business impact:

- Very high. Prevents churn and creates testimonials.

Decision:

- Must build now.

## Priority 2: Security And Credential Cleanup

Why it matters:

- A SaaS cannot grow with exposed credentials and weak production hygiene.

Customer pain solved:

- Trust and data safety.

Estimated development effort:

- 4 to 8 hours.

Estimated business impact:

- High. Prevents catastrophic risk.

Decision:

- Must build now.

## Priority 3: Founder-Led Onboarding Kit

Why it matters:

- Early customers do not want self-service. They want you to set them up correctly.

Customer pain solved:

- Product setup feels too difficult.

Estimated development effort:

- 8 to 16 hours, mostly templates/docs.

Estimated business impact:

- Very high.

Decision:

- Must build now.

## Priority 4: Demo Tenant And Sales Script

Why it matters:

- You need a repeatable demo to close customers.

Customer pain solved:

- Prospects cannot imagine how the system fits their business.

Estimated development effort:

- 6 to 12 hours.

Estimated business impact:

- High.

Decision:

- Must build now.

## Priority 5: Evening Settlement Clarity And Print

Why it matters:

- This is the core differentiator.

Customer pain solved:

- Settlement mistakes, cash mismatch, due confusion.

Estimated development effort:

- 20 to 40 hours.

Estimated business impact:

- Very high.

Decision:

- Must build now.

## Priority 6: Morning Issue Speed And Print

Why it matters:

- If staff find notebook faster, adoption fails.

Customer pain solved:

- Slow daily issue entry and unclear stock availability.

Estimated development effort:

- 15 to 30 hours.

Estimated business impact:

- High.

Decision:

- Must build now if current users struggle.

## Priority 7: Manual Product/Shop/DSR Import Service

Why it matters:

- Onboarding speed closes customers.

Customer pain solved:

- Manual data entry is painful.

Estimated development effort:

- 8 to 20 hours for templates/process, not full product automation.

Estimated business impact:

- Very high.

Decision:

- Must build now as a service/process. Build software later.

## Priority 8: One Daily Close Report

Why it matters:

- Owners need a daily business answer.

Customer pain solved:

- "What happened today?" is scattered across pages.

Estimated development effort:

- 15 to 30 hours if using existing data.

Estimated business impact:

- High.

Decision:

- Must build now only if current reports do not already satisfy this.

## Priority 9: Simple Backup And Data Export Promise

Why it matters:

- Trust wins against local competitors.

Customer pain solved:

- Fear of losing business data.

Estimated development effort:

- 4 to 10 hours.

Estimated business impact:

- Medium to high.

Decision:

- Must build now as a promise/process, not complex UI.

## Priority 10: Landing Page And Pricing Focused On Distributors

Why it matters:

- The current broad positioning weakens conversion.

Customer pain solved:

- Prospect does not know whether StockLedger is for them.

Estimated development effort:

- 8 to 16 hours.

Estimated business impact:

- High.

Decision:

- Must build now.

## Priority 11: Hide Irrelevant Modules For Distributor Demos

Why it matters:

- Too many modules make the product feel complex.

Customer pain solved:

- "This software is too complicated."

Estimated development effort:

- 8 to 20 hours depending on current feature flags.

Estimated business impact:

- High.

Decision:

- Must build now only to the simplest extent possible.

## Priority 12: Safe Password Recovery

Why it matters:

- Account lockout creates support panic.

Customer pain solved:

- User cannot log in.

Estimated development effort:

- 8 to 20 hours.

Estimated business impact:

- Medium.

Decision:

- Must build now if current process is manual and risky; otherwise build later.

## Priority 13: Role Defaults

Why it matters:

- Staff access must be safe.

Customer pain solved:

- Owner does not understand permissions.

Estimated development effort:

- 6 to 15 hours if manual templates; 25+ hours for UI.

Estimated business impact:

- Medium.

Decision:

- Build later. Use manual defaults now.

## Priority 14: Formal Import UI

Why it matters:

- Eventually reduces onboarding load.

Customer pain solved:

- Repeated manual imports.

Estimated development effort:

- 40 to 80 hours.

Estimated business impact:

- High after 10 to 25 customers.

Decision:

- Build later.

## Priority 15: Everything Else

Why it matters:

- Most other features are not needed to close the next 10 customers.

Customer pain solved:

- Unknown or unvalidated.

Estimated development effort:

- Too high.

Estimated business impact:

- Unclear.

Decision:

- Ignore or delay.

---

# Task 4: Challenge Every Major Assumption

## Assumption 1: FMCG Distributors Are The Best ICP

Do we have real customer evidence?

- Not enough. The codebase supports the hypothesis, but 2 paying customers are not enough to prove it.

Questions to ask:

- How many DSRs do you manage?
- How do you issue stock each morning?
- How do you settle each evening?
- How often does cash not match?
- How much shop due is outstanding?
- What software or notebook do you use now?
- What would make you pay monthly?
- Who enters data, owner, manager, accountant, or DSR?

Decision:

- Keep FMCG distributor as the focus, but validate with 15 interviews before assuming the whole company direction is proven.

## Assumption 2: Customers Need Product Import

Evidence:

- Likely, but unproven in format and urgency.

Questions:

- Do you already have product data in Excel?
- How many SKUs do you have?
- Do you track case/pcs conversion?
- Do you know purchase and selling price for every product?
- Would you pay setup fee if we import it for you?

Decision:

- Use manual import/templates now. Delay full import product.

## Assumption 3: Customers Need Shop Import And Opening Due Import

Evidence:

- Stronger than product import because due is core distributor pain, but still needs real samples.

Questions:

- Where is shop due recorded today?
- Can you give an Excel/notebook sample?
- Do you trust your current due balance?
- How often do shops dispute due?
- Do you need due by shop, by DSR, or by route?

Decision:

- Manual templates now. Build UI later.

## Assumption 4: Evening Settlement UX Is The Biggest Product Lever

Evidence:

- Strong. This matches the DSR wedge and daily pain.

Questions:

- Walk me through last night's settlement.
- Where do mistakes happen?
- What takes the most time?
- What must be printed?
- What number do you check before accepting settlement?

Decision:

- Build now, but only based on observed workflow and current customer issues.

## Assumption 5: Morning Issue Needs Improvement

Evidence:

- Likely, but depends on current UX speed.

Questions:

- How many products are issued per DSR each morning?
- How long does issue take today?
- Is product search slow?
- Do you need printed issue sheets?
- Who enters issue data?

Decision:

- Build if current customers confirm slowness or errors.

## Assumption 6: Owners Need A Daily Owner Report

Evidence:

- Reasonable, but specific contents are unproven.

Questions:

- At the end of each day, what 5 numbers do you want?
- Do you care more about cash, due, stock, or profit?
- Do you want this printed, on screen, or sent by WhatsApp?
- Who receives this report?

Decision:

- Prototype manually first. Build only the simplest report.

## Assumption 7: Offline Mode Is Required

Evidence:

- Unproven.

Questions:

- How often does internet fail during morning issue or evening settlement?
- What do you do when internet fails?
- Would offline mode make you choose one software over another?
- Is mobile data available as backup?

Decision:

- Delay until customers lose work or refuse purchase because of internet risk.

## Assumption 8: DSRs Need Mobile App Access

Evidence:

- Unproven.

Questions:

- Do DSRs currently use smartphones for work?
- Would they enter sales in the field?
- Do you trust DSRs to enter data?
- Is the office clerk responsible for entry?

Decision:

- Delay.

## Assumption 9: Role Presets Are Needed Now

Evidence:

- Weak for next 10 customers.

Questions:

- How many staff will log in?
- Who should create issue?
- Who should settle?
- Who should see profit?
- Who should manage stock?

Decision:

- Configure manually. Build UI after repeated pattern.

## Assumption 10: Billing Automation Is Needed

Evidence:

- Weak at 2 customers.

Questions:

- How do customers prefer to pay?
- Monthly, yearly, setup fee?
- bKash, bank, cash?

Decision:

- Manual billing until 50 customers.

---

# Task 5: Sprint Review And New Lean Sprint Plan

## Existing Sprints To Delete Or Delay

| Original Sprint/Task | Decision | Reason |
|---|---|---|
| Full setup wizard sprint | Delete from 6-week plan | Manual onboarding is better now. |
| Product import UI sprint | Replace with templates/manual import | Need real data first. |
| Shop import UI sprint | Replace with templates/manual import | Need real data first. |
| Role presets sprint | Delay | Manual setup is enough for next 10. |
| Customer health/admin tracking | Delay | Spreadsheet is enough. |
| Performance optimization tasks | Delay | Only fix if customers complain. |
| Billing/subscription work | Delay | Manual billing is enough. |
| Offline/mobile work | Delay | No evidence yet. |
| Referral system | Delay | Manual referral tracking is enough. |

## Existing Sprints To Merge

| Merge | New Meaning |
|---|---|
| Safety + Distributor visibility | One lean sprint: secure product and simplify demo experience. |
| Product/shop/DSR imports | One lean onboarding kit, not three software builds. |
| Morning issue + evening settlement | One core workflow polish block, driven by customer observation. |
| Today report + backup/support | One trust and daily-close sprint. |
| Pilot feedback + sales assets | One conversion sprint. |

## New 6-Week Sprint Plan

### Sprint 1: Trust, Safety, And Demo Readiness

Goal:

- Make StockLedger safe and easy to demo.

Tasks:

- Rotate/remove exposed credentials.
- Confirm deployment environment variables.
- Restrict production CORS/domain settings where applicable.
- Create one FMCG distributor demo tenant.
- Draft one demo script.
- Create one-page pricing/offer draft.

Estimated hours:

- 30 to 38.

Expected business impact:

- You can safely demo and sell without avoidable trust risk.

Deliverables:

- Clean deployment config.
- Demo tenant.
- Demo script.
- Pricing/offer draft.

Success criteria:

- You can demo StockLedger in 15 minutes without showing irrelevant complexity.

### Sprint 2: Founder-Led Onboarding Kit

Goal:

- Onboard customers manually but repeatably.

Tasks:

- Create product template.
- Create shop/opening due template.
- Create DSR template.
- Create opening stock checklist.
- Create first-day setup checklist.
- Create manual import/setup SOP.

Estimated hours:

- 25 to 35.

Expected business impact:

- Reduces setup friction for next 10 customers.

Deliverables:

- Onboarding kit.
- Templates.
- SOP.

Success criteria:

- A new distributor can understand exactly what data to provide.

### Sprint 3: Current Customer Blockers And Settlement Polish

Goal:

- Fix what paying customers actually struggle with.

Tasks:

- Interview/observe current 2 customers.
- List their top 10 issues.
- Fix only blockers tied to issue, settlement, stock, due, print, or login.
- Improve settlement formula clarity if needed.
- Improve settlement print if needed.

Estimated hours:

- 35 to 45.

Expected business impact:

- Prevents churn and creates proof.

Deliverables:

- Blocker fixes.
- Settlement improvements.

Success criteria:

- Current customers can complete settlement without calling you for basic confusion.

### Sprint 4: Morning Issue And Daily Close

Goal:

- Make the daily operating loop feel reliable.

Tasks:

- Observe morning issue if possible.
- Improve product search/available stock display only if needed.
- Improve issue print only if needed.
- Create a simple daily close report from existing data.
- Avoid building a full dashboard redesign.

Estimated hours:

- 30 to 40.

Expected business impact:

- Strengthens daily habit and owner confidence.

Deliverables:

- Issue workflow polish.
- Daily close report or manual daily close report template.

Success criteria:

- Owner can answer "what happened today?" from one place or one printout.

### Sprint 5: Sales Conversion Assets

Goal:

- Turn the product into something easier to buy.

Tasks:

- Update landing copy to focus on DSR settlement and due control.
- Add distributor-focused pricing.
- Add setup/import service offer.
- Create before/after notebook messaging.
- Capture testimonial or mini-case study from current customers if possible.

Estimated hours:

- 25 to 35.

Expected business impact:

- More demos convert to paid customers.

Deliverables:

- Distributor landing section/page.
- Pricing.
- Setup offer.
- Case study draft.

Success criteria:

- Prospect understands in 30 seconds why StockLedger exists.

### Sprint 6: Sell, Observe, Fix Only Deal Blockers

Goal:

- Convert prospects, not expand roadmap.

Tasks:

- Run 10 to 20 founder-led demos.
- Onboard 2 to 5 serious prospects/pilots.
- Record every objection.
- Fix only blockers that stop payment or daily use.
- Write down postponed feature requests.

Estimated hours:

- 20 to 30 development hours plus sales time.

Expected business impact:

- Direct path to 10 paying customers.

Deliverables:

- Objection log.
- Blocker fixes.
- Next-customer pipeline.

Success criteria:

- At least 3 new paid or committed customers by the end of the sprint cycle.

---

# Task 6: Why Would A Bangladeshi Distributor Switch?

## From Notebook

Reason to switch:

- Notebook cannot automatically calculate stock, cash, due, return, damage, and profit after settlement.
- Notebook records get lost, overwritten, or disputed.
- Owner cannot see reports remotely.

What must be obvious:

- StockLedger must make evening settlement faster and clearer than notebook.
- Printout must feel familiar.
- Setup must be done for them.

Missing if not obvious:

- A clear "we will set up your product/shop/DSR data" promise.
- A clear settlement demo.

## From Excel

Reason to switch:

- Excel breaks when multiple people edit.
- Excel does not enforce stock/due ledger consistency.
- Excel does not give clean role-based staff access.
- Excel is weak for daily issue/settlement printing.

What must be obvious:

- StockLedger gives structure, audit, and daily reports without formula errors.

Missing if not obvious:

- Easy Excel migration.
- Proof that StockLedger's numbers match the owner's current records.

## From Generic Inventory Software

Reason to switch:

- Generic inventory software tracks stock, but not DSR settlement, shop due, returns, damage, and salesman accountability in the local distributor workflow.

What must be obvious:

- StockLedger is not just inventory. It is distributor control.

Missing if not obvious:

- A focused DSR-focused demo and landing page.
- Side-by-side comparison: generic inventory vs StockLedger DSR settlement.

---

# Task 7: Sales Perspective Review

Question:

> Will this help close another customer?

| Feature/Work | Helps Close Next 10? | Decision |
|---|---|---|
| Fix current customer blockers | Yes | Do now. |
| Secure credentials/deployment trust | Yes, indirectly | Do now. |
| Distributor demo tenant | Yes | Do now. |
| Demo script | Yes | Do now. |
| Founder-led onboarding templates | Yes | Do now. |
| Settlement clarity/print | Yes | Do now. |
| Morning issue speed/print | Yes, if current UX weak | Do now if validated. |
| Daily close report | Yes, if simple | Do now if current reports are insufficient. |
| Landing/pricing focused on distributors | Yes | Do now. |
| Product import UI | Not immediately | Manual first. |
| Shop import UI | Not immediately | Manual first. |
| Full setup wizard | No | Delay. |
| Role presets UI | Not for next 10 | Delay. |
| Customer health dashboard | No | Delay. |
| Billing automation | No | Delay. |
| Offline drafts | Only if prospects demand it | Validate first. |
| Mobile DSR app | No evidence | Delay. |
| WhatsApp automation | Not yet | Manual first. |
| Multi-branch | No | Delay. |
| Accounting/payment integration | No | Delay. |
| HR/payroll | No | Ignore. |
| Warranty/repair/trade-in | No | Ignore for now. |
| Pharmacy batch | No for FMCG | Ignore for now. |
| Promotions/loyalty | No | Ignore. |

---

# Task 8: ROI Review

## High ROI, Do Now

| Feature | Dev Effort | Maintenance | Revenue Impact | Adoption Impact | Competitive Advantage | Decision |
|---|---|---|---|---|---|---|
| Settlement clarity/print | Medium | Low | High | High | High | Do now |
| Onboarding templates/manual import | Low | Low | High | High | Medium | Do now |
| Demo tenant/script | Low | Low | High | Medium | Medium | Do now |
| Security credential cleanup | Low | Low | High risk reduction | Medium | Medium | Do now |
| Distributor-focused landing/pricing | Low | Low | High | Medium | Medium | Do now |
| Current-customer blocker fixes | Medium | Low | High | High | High | Do now |

## Medium ROI, Build Only If Validated

| Feature | Dev Effort | Maintenance | Revenue Impact | Adoption Impact | Competitive Advantage | Decision |
|---|---|---|---|---|---|---|
| Morning issue speed improvements | Medium | Medium | Medium | High | Medium | Validate |
| Daily close report | Medium | Medium | Medium | High | Medium | Validate |
| DSR/shop due statement polish | Low/Medium | Low | Medium | Medium | Medium | Validate |
| Safe password recovery | Medium | Low | Medium | Medium | Low | Build if current process weak |
| Simple menu hiding | Low/Medium | Low | Medium | Medium | Medium | Build minimal |

## Low ROI For Current Stage

| Feature | Dev Effort | Maintenance | Revenue Impact | Adoption Impact | Competitive Advantage | Decision |
|---|---|---|---|---|---|---|
| Full setup wizard | High | Medium | Low now | Medium later | Low | Delay |
| Full import UI | High | Medium | Medium later | High later | Medium | Delay |
| Role presets UI | Medium | Low | Low now | Medium later | Low | Delay |
| Customer health dashboard | Medium | Medium | Low now | Low now | Low | Delay |
| Billing automation | High | Medium | Low now | Low | Low | Delay |
| Offline drafts | High | Medium | Unknown | Unknown | High if validated | Delay |
| Mobile DSR app | High | High | Unknown | Unknown | Medium | Delay |
| WhatsApp automation | High | Medium | Unknown | Medium | Medium | Manual first |
| Multi-branch | High | High | Low now | Low now | Medium | Delay |
| Integrations | High | High | Low now | Low now | Low | Delay |

---

# Task 9: New Roadmap Optimized For PMF

## Now To 6 Weeks: Get From 2 To 10 Customers

Objective:

- Close the next 10 paying customers with a focused, founder-led, DSR-first product.

Build:

- Security cleanup.
- Demo tenant.
- Onboarding templates.
- Settlement polish.
- Issue polish if validated.
- Daily close report if current reports are insufficient.
- Distributor landing/pricing.
- Manual setup/import service.

Sell:

- 10 to 20 distributor demos.
- Visit markets.
- Ask for current notebooks/Excel.
- Sell setup plus monthly subscription.

Measure:

- Demo-to-paid conversion.
- Setup time.
- First settlement completed.
- Weekly active usage.
- Support calls per customer.
- Settlement-related errors.

## 10 To 25 Customers

Objective:

- Make onboarding repeatable.

Build:

- Automate the import step only if manual import repeats.
- Add role defaults if permissions create support load.
- Improve due statements if customers request them.
- Create first case studies.
- Add basic customer tracking spreadsheet or admin note system.

Do not build:

- Billing automation.
- Mobile app.
- Offline mode unless it blocks sales.

## 25 To 50 Customers

Objective:

- Reduce founder support load.

Build:

- Lightweight setup wizard if onboarding pain is proven.
- Formal help/training pages.
- Better daily close/dashboard.
- CI/testing if release breakages are slowing you down.
- Backup/restore documentation.

Hire:

- Part-time onboarding/support.

## 50 To 100 Customers

Objective:

- Create a repeatable business engine.

Build:

- Billing/subscription workflow.
- Customer health tracking.
- Role presets.
- More structured support.
- Import automation if not already built.

Hire:

- Support/onboarding person.
- Sales assistant only if founder-led sales is repeatable.

## 100+ Customers

Objective:

- Defensibility and expansion.

Build only if validated:

- Offline drafts.
- Mobile DSR view.
- Multi-branch.
- WhatsApp/SMS reminders.
- Integrations.
- Partner/reseller workflow.

---

# Task 10: Brutally Honest Founder Report

## What You Should Stop Building

Stop building anything for:

- HR/payroll.
- Warranty.
- Repair.
- Trade-ins.
- Pharmacy batches.
- Promotions.
- Loyalty.
- Generic retail POS expansion.
- Advanced dashboards.
- Billing automation.
- Mobile apps.
- Integrations.
- Multi-branch.

These may matter later. They do not get you from 2 to 10 customers.

## What You Are Wasting Time On

You are most likely wasting time on:

- Making the software broad.
- Planning for 1,000 customers before proving the next 10.
- Building product infrastructure that founder-led service can handle manually.
- Treating every module as equally important.
- Thinking more features will make the product easier to sell.

More features will probably make it harder to sell.

## What You Are Underestimating

You are underestimating:

- Data migration pain.
- Staff training pain.
- Evening support expectations.
- Trust objections.
- The importance of print formats.
- The fear of wrong stock/due numbers.
- How quickly customers return to notebooks if the first week is confusing.
- How much founder-led onboarding matters in Bangladesh.

## What Customers Actually Care About

Bangladeshi distributors care about:

- Is my stock correct?
- Did my DSR return the right cash?
- Which shops owe me money?
- What did I sell today?
- What stock is left?
- Can my staff use it without calling me?
- Can I print the paper I need?
- Will you help me when settlement happens at night?
- Will my data be safe?

They do not care about your architecture, feature count, or SaaS roadmap.

## What Will Most Likely Make StockLedger Succeed

StockLedger succeeds if:

- It becomes the easiest way to complete DSR settlement.
- Onboarding is done for the customer.
- Print reports match local business habits.
- Owners trust stock and due numbers.
- Support is fast during the first 30 days.
- The product is clearly positioned for distributors.
- Current customers refer similar businesses.

## What Will Most Likely Make StockLedger Fail

StockLedger fails if:

- You keep adding modules instead of selling.
- You target too many industries.
- The first week of onboarding is painful.
- Settlement or stock numbers are wrong.
- Customers think the system is too complicated.
- You build self-service before you understand the manual onboarding process.
- You ignore sales and support because you prefer coding.

## Final Rewrite Of The Roadmap

Old roadmap:

> Build a broad SaaS platform with many modules and long-term scalability.

New roadmap:

> Close 10 paying distributors by manually onboarding them, fixing real blockers, and making DSR settlement, stock, due, and daily reports easier than notebooks.

Do not build the biggest product.

Build the product customers trust enough to use every evening.

