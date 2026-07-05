# StockLedger — Plan for July 2026

**Goal:** Grow from 2 → 10 paying customers by Monday, Aug 4.
**Markets:** 50% FMCG dealers/distributors · 50% electronics retailers.
**Rule of the month:** You are a salesperson who occasionally fixes bugs — not a developer who occasionally sells.

**The math:** 8 new closes ÷ ~30% close rate = **25–30 demos** = **5–7 demos per week**.

---

## Week 1 · Jul 6–10 — Set Up the Machine

Focus: pipeline, scripts, and the electronics anchor customer.

- [ ] **Sun:** Rotate the Supabase database password (dashboard → Settings → Database → Reset password; update Render/Vercel env vars). 5 minutes, closes the exposed-credential risk.
- [ ] **Sun:** Send the referral message to both paying dealers: *"Who are 3 dealers you know still doing evening settlement in a notebook? I'll give them free setup."*
- [ ] **Mon:** Write the **25-name pipeline list** — real dealers, one specific electronics market, and who introduces you to each. If you can't reach 25 names, solving that becomes priority #1 this week.
- [ ] **Tue:** Meet/call the electronics retailer prospect. Do not leave without an **agreed price and an onboarding date** within 7 days.
- [ ] **Wed:** Write both 15-minute demo scripts and rehearse each once, timed:
  - Dealer: morning issue → evening settlement → shop due
  - Electronics: purchase → sale → customer due → daily numbers
- [ ] **Thu:** Give your **first 2 demos** from the pipeline list, even if imperfect.
- [ ] Start the **interview log** (one spreadsheet): date · prospect · market · pain mentioned · feature asked · tag (`shared / dealer / electronics / nice / future / warranty / serial / trade-in / installment`).

**Exit test:** password rotated · electronics prospect committed with a date · 25 names on paper · 2 demos done.

---

## Week 2 · Jul 13–17 — Sell + Onboard the Electronics Anchor

Focus: demo volume and the market #2 validation test.

- [ ] **6–8 demos** (1–2 per day). Ask for the sale in every demo: *"Want me to set this up for your shop this week?"*
- [ ] **Onboard the electronics retailer in person.** Sit in their shop, enter products and opening dues together. **Log every friction point** — that log is the electronics roadmap.
- [ ] Visit one paying dealer for 30 minutes and **watch a real evening settlement** without touching anything. Note where they hesitate.
- [ ] Update the interview log after every demo.

**Target by Thursday:** 2 new closes → **4–5 paying total**.

---

## Week 3 · Jul 20–24 — Sell Harder, Fix Only What You Saw

Focus: referrals, the anchor's market, observed friction only.

- [ ] **6–8 demos.** Prioritize referrals — they close faster than cold walk-ins.
- [ ] Walk the electronics market where the anchor customer sits: *"I run [anchor]'s stock and due book — 10 minutes?"* Their shop is your live demo.
- [ ] **One dev half-day maximum:** fix only the top 2–3 friction points you personally observed in Week 2. Nothing speculative.
- [ ] Check-in call with every customer onboarded so far: *"Did you close your day in the app yesterday?"* A "no" is churn forming — visit them this week.

**Target by Thursday:** 2–3 new closes → **6–8 paying total**.

---

## Week 4 · Jul 27–31 — Close the Pipeline

Focus: convert stalled demos, referral loop, final closes.

- [ ] Revisit **every demo that didn't close**: *"What would need to be true for you to start?"* Fix the objection on the spot or log it.
- [ ] **5–6 demos** from remaining pipeline names + new referrals.
- [ ] Ask **every paying customer** for one referral. Every one, once.
- [ ] Keep daily check-ins with the newest customers.

**Target by Thursday:** 2–3 new closes → **8–10 paying total**.

---

## Aug 3–4 — Count and Decide

Sit down with three numbers:

1. **Demos given** (target ≥25)
2. **Close rate** (target ≥25–30%)
3. **Weekly-active usage** — did each paying customer do settlement/daily close ≥5 days last week?

Then decide:

- **Hit ~10** → next month is retention + raising demo volume.
- **Stuck at 5–6** → the interview log says whether the blocker was **pipeline** (not enough names), **pitch** (demos not converting), or **product** (friction losing closes). Fix only that one thing.

---

## Daily Routine (every working day)

| When | What | Time |
|---|---|---|
| Morning | WhatsApp check-in with newest customers — any confusion from yesterday? | 30 min |
| Midday | 1–2 demos or an onboarding | 2–4 h |
| Evening | Update interview log + pipeline list while fresh | 10 min |

---

## Weekly Scoreboard

| Metric | Wk 1 | Wk 2 | Wk 3 | Wk 4 |
|---|---|---|---|---|
| Demos given | | | | |
| New closes | | | | |
| Paying total | | | | |
| Referrals asked | | | | |
| Customers active ≥5 days | | | | |

---

## What You Will NOT Do This Month

- ❌ No new features. Warranty, IMEI/serials, trade-in, installments stay off unless **2+ paying customers** ask — the interview log counts, not memory.
- ❌ No landing page redesign, no self-service signup, no import automation, no billing automation.
- ❌ No code beyond the security scrub and the Week-3 half-day of observed-friction fixes.

> The most important deliverable of the month isn't the 10 customers — it's the **filled interview log**. Six customers with 25 logged conversations beats ten customers with no notes: it tells us exactly what to build in August.
