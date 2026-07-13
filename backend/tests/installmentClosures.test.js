import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, addStock, createRetailCustomer, getCashAccount, getCustomerDueBalance } from "./helpers/seeders.js";

let databaseManager;
let tenant;
let otherTenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Installment Closures Tenant" });
  otherTenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Installment Closures Other Tenant" });
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

// planId is reused as sourceId across the plan's creation entry and any later
// closure entry (settlement/write-off) on different sourceTypes — filter by
// both so a query for one entry doesn't also pick up the other.
async function ledgerLinesFor(agent, accountCode, sourceId, sourceType) {
  const response = await agent.get("/api/journal/general-ledger").query({ accountCode });
  assert.equal(response.status, 200);
  return response.body.lines.filter((line) => line.sourceId === sourceId && (!sourceType || line.sourceType === sourceType));
}

async function ledgerLinesContaining(agent, accountCode, needle) {
  const response = await agent.get("/api/journal/general-ledger").query({ accountCode });
  assert.equal(response.status, 200);
  return response.body.lines.filter((line) => line.sourceId.includes(needle));
}

// 50000 sale, 10000 down -> 40000 financed, 10% markup -> 44000 payable over 8
// months = 5500/month.
async function createPlan(agent, overrides = {}) {
  const product = await createProduct(agent, { name: `Closure Widget ${Date.now()}-${Math.random()}`, retailPrice: 5000 });
  await addStock(agent, product.id, 20);
  const customer = await createRetailCustomer(agent, { name: `Closure Customer ${Date.now()}-${Math.random()}` });

  const response = await agent.post("/api/installments").send({
    customerId: customer.id,
    saleDate: daysFromToday(0),
    items: [{ productId: product.id, quantityPieces: 10, actualSalePrice: 5000 }],
    discount: 0,
    downPayment: 10000,
    markupType: "PERCENT",
    markupValue: 10,
    numberOfMonths: 8,
    firstPaymentDate: daysFromToday(0),
    ...overrides,
  });
  if (response.status !== 201) {
    throw new Error(`createPlan failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return { plan: response.body.plan, customer };
}

// ── Reschedule ──────────────────────────────────────────────────────────────

test("rescheduling requires a reason", async () => {
  const { plan } = await createPlan(tenant.agent);
  const response = await tenant.agent.post(`/api/installments/${plan.id}/reschedule`).send({
    numberOfMonths: 5,
    firstPaymentDate: daysFromToday(30),
  });
  assert.equal(response.status, 400);
});

test("reschedule restructures remaining installments into a new schedule, preserving already-paid history", async () => {
  const { plan } = await createPlan(tenant.agent);

  const payResponse = await tenant.agent.post("/api/installments/payments").send({
    planId: plan.id,
    amount: 5500,
    paymentDate: daysFromToday(0),
    paymentMethod: "CASH",
  });
  assert.equal(payResponse.status, 201);

  const response = await tenant.agent.post(`/api/installments/${plan.id}/reschedule`).send({
    reason: "Customer requested a longer term",
    numberOfMonths: 5,
    firstPaymentDate: daysFromToday(60),
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.plan.numberOfMonths, 5);
  assert.equal(response.body.plan.monthlyInstallmentAmount, 7700, "38500 remaining / 5 months");
  assert.equal(response.body.plan.outstandingAmount, 38500, "rescheduling must not change the amount owed");

  const paidRow = response.body.schedule.find((row) => row.installmentNo === 1);
  assert.equal(paidRow.status, "PAID", "already-paid history must be untouched");
  assert.equal(paidRow.paidAmount, 5500);

  const restructured = response.body.schedule.filter((row) => row.status === "RESTRUCTURED");
  assert.equal(restructured.length, 7, "installments 2-8 are superseded, not deleted");
  assert.ok(restructured.every((row) => row.remainingAmount === 0));

  const newRows = response.body.schedule.filter((row) => row.installmentNo > 8);
  assert.equal(newRows.length, 5);
  const newTotal = newRows.reduce((sum, row) => sum + row.dueAmount, 0);
  assert.equal(Math.round(newTotal * 100) / 100, 38500);

  const detailResponse = await tenant.agent.get(`/api/installments/${plan.id}`);
  assert.equal(detailResponse.body.rescheduleLog.length, 1);
  assert.equal(detailResponse.body.rescheduleLog[0].reason, "Customer requested a longer term");
  assert.equal(detailResponse.body.rescheduleLog[0].oldSchedule.length, 7);
  assert.equal(detailResponse.body.rescheduleLog[0].newSchedule.length, 5);
});

test("cannot reschedule a plan that isn't ACTIVE", async () => {
  const { plan } = await createPlan(tenant.agent);
  const settleResponse = await tenant.agent.post(`/api/installments/${plan.id}/settle`).send({});
  assert.equal(settleResponse.status, 200);

  const response = await tenant.agent.post(`/api/installments/${plan.id}/reschedule`).send({
    reason: "test",
    numberOfMonths: 3,
    firstPaymentDate: daysFromToday(30),
  });
  assert.equal(response.status, 400);
  assert.match(response.body.message, /Cannot reschedule a completed plan/);
});

// ── Early Settlement ────────────────────────────────────────────────────────

test("settling without a waiver collects the full outstanding balance and recognizes the remaining markup as earned income", async () => {
  const { plan } = await createPlan(tenant.agent);
  const cashBefore = await getCashAccount(tenant.agent);

  const response = await tenant.agent.post(`/api/installments/${plan.id}/settle`).send({ paymentMethod: "CASH" });
  assert.equal(response.status, 200);
  assert.equal(response.body.plan.outstandingAmount, 0);
  assert.equal(response.body.plan.status, "COMPLETED");
  assert.equal(response.body.plan.totalPaid, 44000);
  assert.ok(response.body.schedule.every((row) => row.status === "PAID"));

  const cashAfter = await getCashAccount(tenant.agent);
  assert.equal(Number(cashAfter.balance), Number(cashBefore.balance) + 44000);

  const receivableLines = await ledgerLinesFor(tenant.agent, "1150", plan.id, "installment_settlement");
  assert.equal(receivableLines.length, 1);
  assert.equal(receivableLines[0].credit, 44000);

  const unearnedLines = await ledgerLinesFor(tenant.agent, "2150", plan.id, "installment_settlement");
  assert.equal(unearnedLines.length, 1);
  assert.equal(unearnedLines[0].debit, 4000, "the remaining markup moves out of unearned income");

  const markupIncomeLines = await ledgerLinesFor(tenant.agent, "4040", plan.id);
  assert.equal(markupIncomeLines.length, 1);
  assert.equal(markupIncomeLines[0].credit, 4000, "and is recognized as earned, since it was actually collected");
});

test("settling with waiveMarkup collects only the principal and never recognizes the waived markup as income", async () => {
  const { plan } = await createPlan(tenant.agent);
  const cashBefore = await getCashAccount(tenant.agent);

  const response = await tenant.agent.post(`/api/installments/${plan.id}/settle`).send({ waiveMarkup: true });
  assert.equal(response.status, 200);
  assert.equal(response.body.plan.totalPaid, 40000, "only the 40000 principal is actually collected");

  const cashAfter = await getCashAccount(tenant.agent);
  assert.equal(Number(cashAfter.balance), Number(cashBefore.balance) + 40000);

  const markupIncomeLines = await ledgerLinesFor(tenant.agent, "4040", plan.id);
  assert.equal(markupIncomeLines.length, 0, "waived markup must never be recognized as earned income");
});

test("settling with a discount reduces the cash collected on top of any markup handling", async () => {
  const { plan } = await createPlan(tenant.agent);
  const cashBefore = await getCashAccount(tenant.agent);

  const response = await tenant.agent.post(`/api/installments/${plan.id}/settle`).send({ discount: 1000 });
  assert.equal(response.status, 200);
  assert.equal(response.body.plan.totalPaid, 43000, "44000 outstanding - 1000 discount");

  const cashAfter = await getCashAccount(tenant.agent);
  assert.equal(Number(cashAfter.balance), Number(cashBefore.balance) + 43000);

  const discountLines = await ledgerLinesFor(tenant.agent, "4020", plan.id);
  assert.equal(discountLines.length, 1);
  assert.equal(discountLines[0].debit, 1000);
});

test("cannot settle a plan that isn't ACTIVE", async () => {
  const { plan } = await createPlan(tenant.agent);
  await tenant.agent.post(`/api/installments/${plan.id}/settle`).send({});

  const response = await tenant.agent.post(`/api/installments/${plan.id}/settle`).send({});
  assert.equal(response.status, 400);
});

// ── Write-Off ───────────────────────────────────────────────────────────────

test("write-off requires a reason", async () => {
  const { plan } = await createPlan(tenant.agent);
  const response = await tenant.agent.post(`/api/installments/${plan.id}/write-off`).send({});
  assert.equal(response.status, 400);
});

test("write-off waives the remaining markup, books the remaining principal as bad debt, and marks unpaid rows WAIVED", async () => {
  const { plan } = await createPlan(tenant.agent);
  const cashBefore = await getCashAccount(tenant.agent);

  const response = await tenant.agent.post(`/api/installments/${plan.id}/write-off`).send({ reason: "Customer unreachable, unlikely to collect" });
  assert.equal(response.status, 200);
  assert.equal(response.body.plan.status, "WRITTEN_OFF");
  assert.equal(response.body.plan.outstandingAmount, 0);
  assert.equal(response.body.plan.writeOffReason, "Customer unreachable, unlikely to collect");
  assert.ok(response.body.plan.writtenOffAt);
  assert.ok(response.body.schedule.every((row) => row.status === "WAIVED"));

  const cashAfter = await getCashAccount(tenant.agent);
  assert.equal(Number(cashAfter.balance), Number(cashBefore.balance), "a write-off collects no cash");

  const receivableLines = await ledgerLinesFor(tenant.agent, "1150", plan.id, "installment_write_off");
  assert.equal(receivableLines.length, 1);
  assert.equal(receivableLines[0].credit, 44000);

  const unearnedLines = await ledgerLinesFor(tenant.agent, "2150", plan.id, "installment_write_off");
  assert.equal(unearnedLines.length, 1);
  assert.equal(unearnedLines[0].debit, 4000, "unrecognized markup is reversed, not collected");

  const badDebtLines = await ledgerLinesFor(tenant.agent, "6020", plan.id);
  assert.equal(badDebtLines.length, 1);
  assert.equal(badDebtLines[0].debit, 40000, "the remaining principal becomes a bad-debt expense");
});

test("cannot write off a plan that isn't ACTIVE", async () => {
  const { plan } = await createPlan(tenant.agent);
  await tenant.agent.post(`/api/installments/${plan.id}/settle`).send({});

  const response = await tenant.agent.post(`/api/installments/${plan.id}/write-off`).send({ reason: "test" });
  assert.equal(response.status, 400);
});

// ── Cancel ──────────────────────────────────────────────────────────────────

test("cancel requires a reason", async () => {
  const { plan } = await createPlan(tenant.agent);
  const response = await tenant.agent.post(`/api/installments/${plan.id}/cancel`).send({});
  assert.equal(response.status, 400);
});

test("cancel is rejected once any installment payment has been collected", async () => {
  const { plan } = await createPlan(tenant.agent);
  await tenant.agent.post("/api/installments/payments").send({
    planId: plan.id,
    amount: 1000,
    paymentDate: daysFromToday(0),
    paymentMethod: "CASH",
  });

  const response = await tenant.agent.post(`/api/installments/${plan.id}/cancel`).send({ reason: "test" });
  assert.equal(response.status, 400);
  assert.match(response.body.message, /cancel is only for plans with no installment payments/);
});

test("cancel (before any payment) restores the financed amount to the customer's normal due ledger and reverses the plan's journal entry", async () => {
  const { plan, customer } = await createPlan(tenant.agent);

  const dueBefore = await getCustomerDueBalance(tenant.agent, customer.id);
  assert.equal(dueBefore, 0, "the financed amount is not on the normal due ledger while the plan is active");

  const response = await tenant.agent.post(`/api/installments/${plan.id}/cancel`).send({ reason: "Customer changed their mind before any collection" });
  assert.equal(response.status, 200);
  assert.equal(response.body.plan.status, "CANCELLED");
  assert.equal(response.body.plan.outstandingAmount, 0);
  assert.ok(response.body.schedule.every((row) => row.status === "WAIVED"));

  const dueAfter = await getCustomerDueBalance(tenant.agent, customer.id);
  assert.equal(dueAfter, 40000, "the financed amount reverts to an ordinary due-ledger receivable");

  const receivableLines = await ledgerLinesContaining(tenant.agent, "1150", plan.id);
  assert.equal(receivableLines.length, 2, "the original booking and its reversal");
  const netReceivable = receivableLines.reduce((sum, line) => sum + line.debit - line.credit, 0);
  assert.equal(netReceivable, 0, "the reversal must fully cancel the original Installment Receivable entry");
});

test("tenant isolation: another tenant cannot reschedule, settle, write off, or cancel a plan that isn't theirs", async () => {
  const { plan } = await createPlan(tenant.agent);

  const rescheduleResponse = await otherTenant.agent.post(`/api/installments/${plan.id}/reschedule`).send({
    reason: "test",
    numberOfMonths: 3,
    firstPaymentDate: daysFromToday(30),
  });
  assert.equal(rescheduleResponse.status, 404);

  const settleResponse = await otherTenant.agent.post(`/api/installments/${plan.id}/settle`).send({});
  assert.equal(settleResponse.status, 404);

  const writeOffResponse = await otherTenant.agent.post(`/api/installments/${plan.id}/write-off`).send({ reason: "test" });
  assert.equal(writeOffResponse.status, 404);

  const cancelResponse = await otherTenant.agent.post(`/api/installments/${plan.id}/cancel`).send({ reason: "test" });
  assert.equal(cancelResponse.status, 404);
});
