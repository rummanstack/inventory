import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, addStock, createRetailCustomer } from "./helpers/seeders.js";

let databaseManager;
let tenant;
let otherTenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Installment Late Fee Tenant" });
  otherTenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Installment Late Fee Other Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await cleanupTenant(databaseManager, otherTenant.tenantId);
  await closeTestApp();
});

function daysFromToday(offset) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

// 20000 sale, no down payment -> 20000 financed, 10% markup -> 22000 payable.
async function createPlan(agent, overrides = {}) {
  const product = await createProduct(agent, { name: `Late Fee Widget ${Date.now()}-${Math.random()}`, retailPrice: 2000 });
  await addStock(agent, product.id, 20);
  const customer = await createRetailCustomer(agent, { name: `Late Fee Customer ${Date.now()}-${Math.random()}` });

  const response = await agent.post("/api/installments").send({
    customerId: customer.id,
    saleDate: daysFromToday(0),
    items: [{ productId: product.id, quantityPieces: 10, actualSalePrice: 2000 }],
    discount: 0,
    downPayment: 0,
    markupType: "PERCENT",
    markupValue: 10,
    numberOfMonths: 1,
    firstPaymentDate: daysFromToday(0),
    ...overrides,
  });
  if (response.status !== 201) {
    throw new Error(`createPlan failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return response.body.plan;
}

// ── Late fee rules ───────────────────────────────────────────────────────────

test("a late fee rule can be created, listed, and updated", async () => {
  const createResponse = await tenant.agent.post("/api/installments/late-fee-rules").send({
    feeType: "FIXED",
    feeValue: 100,
    gracePeriodDays: 0,
    maxPenaltyAmount: 0,
    active: true,
  });
  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.feeType, "FIXED");
  assert.equal(createResponse.body.feeValue, 100);
  const ruleId = createResponse.body.id;

  const listResponse = await tenant.agent.get("/api/installments/late-fee-rules");
  assert.equal(listResponse.status, 200);
  assert.ok(listResponse.body.some((rule) => rule.id === ruleId));

  const updateResponse = await tenant.agent.post("/api/installments/late-fee-rules").send({
    id: ruleId,
    feeType: "FIXED",
    feeValue: 150,
    gracePeriodDays: 3,
    maxPenaltyAmount: 0,
    active: true,
  });
  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.id, ruleId);
  assert.equal(updateResponse.body.feeValue, 150);
  assert.equal(updateResponse.body.gracePeriodDays, 3);
});

test("a late fee rule requires a valid fee type and a non-negative fee value", async () => {
  const badType = await tenant.agent.post("/api/installments/late-fee-rules").send({ feeType: "BOGUS", feeValue: 10 });
  assert.equal(badType.status, 400);

  const negativeValue = await tenant.agent.post("/api/installments/late-fee-rules").send({ feeType: "FIXED", feeValue: -5 });
  assert.equal(negativeValue.status, 400);
});

// ── Overdue report preview + apply late fee ─────────────────────────────────

test("the overdue report previews a late fee, and applying it widens the schedule row and plan totals", async () => {
  const ruleResponse = await tenant.agent.post("/api/installments/late-fee-rules").send({
    feeType: "FIXED",
    feeValue: 100,
    gracePeriodDays: 0,
    maxPenaltyAmount: 0,
    active: true,
  });
  assert.equal(ruleResponse.status, 201);

  const plan = await createPlan(tenant.agent, { firstPaymentDate: daysFromToday(-10) });

  const overdueResponse = await tenant.agent.get("/api/installments/reports/overdue");
  assert.equal(overdueResponse.status, 200);
  assert.equal(overdueResponse.body.lateFeeRuleActive, true);
  const overdueRow = overdueResponse.body.rows.find((row) => row.planId === plan.id);
  assert.ok(overdueRow, "expected the newly created plan's installment to appear in the overdue report");
  assert.equal(overdueRow.previewLateFee, 100);

  const beforeDueAmount = overdueRow.dueAmount;
  const beforeRemainingAmount = overdueRow.remainingAmount;
  const beforePlanPayable = plan.finalPayableAmount;
  const beforePlanOutstanding = plan.outstandingAmount;

  const applyResponse = await tenant.agent.post(`/api/installments/schedule/${overdueRow.id}/apply-late-fee`);
  assert.equal(applyResponse.status, 200);
  assert.equal(applyResponse.body.schedule.lateFeeApplied, 100);
  assert.equal(applyResponse.body.schedule.dueAmount, beforeDueAmount + 100);
  assert.equal(applyResponse.body.schedule.remainingAmount, beforeRemainingAmount + 100);
  assert.equal(applyResponse.body.plan.finalPayableAmount, beforePlanPayable + 100);
  assert.equal(applyResponse.body.plan.outstandingAmount, beforePlanOutstanding + 100);
});

test("applying a late fee to an installment that isn't actually overdue is rejected", async () => {
  await tenant.agent.post("/api/installments/late-fee-rules").send({
    feeType: "FIXED",
    feeValue: 100,
    gracePeriodDays: 0,
    maxPenaltyAmount: 0,
    active: true,
  });

  const plan = await createPlan(tenant.agent, { firstPaymentDate: daysFromToday(30) });
  const planDetail = await tenant.agent.get(`/api/installments/${plan.id}`);
  const scheduleRow = planDetail.body.schedule[0];

  const applyResponse = await tenant.agent.post(`/api/installments/schedule/${scheduleRow.id}/apply-late-fee`);
  assert.equal(applyResponse.status, 400);
  assert.match(applyResponse.body.message, /not yet eligible/);
});

test("applying a late fee with no active rule configured is rejected", async () => {
  const noRuleTenant = await createTenantAndAdmin(databaseManager, (await getTestApp()).app, { name: "No Late Fee Rule Tenant" });
  const plan = await createPlan(noRuleTenant.agent, { firstPaymentDate: daysFromToday(-5) });
  const planDetail = await noRuleTenant.agent.get(`/api/installments/${plan.id}`);
  const scheduleRow = planDetail.body.schedule[0];

  const applyResponse = await noRuleTenant.agent.post(`/api/installments/schedule/${scheduleRow.id}/apply-late-fee`);
  assert.equal(applyResponse.status, 400);
  assert.match(applyResponse.body.message, /No active late fee rule/);

  await cleanupTenant(databaseManager, noRuleTenant.tenantId);
});

// ── Dashboard ────────────────────────────────────────────────────────────────

test("the dashboard reports sane aggregate figures including a newly overdue plan", async () => {
  const dashTenant = await createTenantAndAdmin(databaseManager, (await getTestApp()).app, { name: "Installment Dashboard Tenant" });
  const plan = await createPlan(dashTenant.agent, { firstPaymentDate: daysFromToday(-5) });

  const dashboardResponse = await dashTenant.agent.get("/api/installments/dashboard");
  assert.equal(dashboardResponse.status, 200);
  assert.equal(typeof dashboardResponse.body.asOfDate, "string");
  assert.equal(dashboardResponse.body.activePlans, 1);
  assert.ok(dashboardResponse.body.overdueAmount > 0);
  assert.equal(dashboardResponse.body.outstandingReceivable, plan.outstandingAmount);
  assert.equal(dashboardResponse.body.writtenOffPlans, 0);
  assert.equal(dashboardResponse.body.cancelledPlans, 0);

  await cleanupTenant(databaseManager, dashTenant.tenantId);
});

// ── Agreement PDF ────────────────────────────────────────────────────────────

test("the agreement PDF endpoint returns a non-empty PDF for the plan", { timeout: 30000 }, async () => {
  const plan = await createPlan(tenant.agent);

  const response = await tenant.agent.get(`/api/installments/${plan.id}/agreement-pdf`).buffer(true).parse((res, callback) => {
    const chunks = [];
    res.on("data", (chunk) => chunks.push(chunk));
    res.on("end", () => callback(null, Buffer.concat(chunks)));
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers["content-type"], "application/pdf");
  assert.ok(response.body.length > 100);
  assert.equal(response.body.slice(0, 5).toString("latin1"), "%PDF-");
});

// ── Tenant isolation ─────────────────────────────────────────────────────────

test("tenant isolation: another tenant cannot see late fee rules, apply fees, or generate the agreement PDF for a plan that isn't theirs", async () => {
  const ruleResponse = await tenant.agent.post("/api/installments/late-fee-rules").send({
    feeType: "FIXED",
    feeValue: 100,
    gracePeriodDays: 0,
    maxPenaltyAmount: 0,
    active: true,
  });
  const ruleId = ruleResponse.body.id;

  const listResponse = await otherTenant.agent.get("/api/installments/late-fee-rules");
  assert.equal(listResponse.status, 200);
  assert.ok(!listResponse.body.some((rule) => rule.id === ruleId));

  const plan = await createPlan(tenant.agent, { firstPaymentDate: daysFromToday(-10) });
  const planDetail = await tenant.agent.get(`/api/installments/${plan.id}`);
  const scheduleRow = planDetail.body.schedule[0];

  const applyResponse = await otherTenant.agent.post(`/api/installments/schedule/${scheduleRow.id}/apply-late-fee`);
  assert.equal(applyResponse.status, 404);

  const pdfResponse = await otherTenant.agent.get(`/api/installments/${plan.id}/agreement-pdf`);
  assert.equal(pdfResponse.status, 404);
});
