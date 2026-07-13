import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, addStock, createRetailCustomer, getCashAccount } from "./helpers/seeders.js";

let databaseManager;
let tenant;
let otherTenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Installment Payments Tenant" });
  otherTenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Installment Payments Other Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await cleanupTenant(databaseManager, otherTenant.tenantId);
  await closeTestApp();
});

// 50000 sale, 10000 down -> 40000 financed, 10% markup -> 44000 payable over 8
// months = 5500/month, on the agent passed in (defaults to the shared tenant).
async function createPlan(agent, overrides = {}) {
  const product = await createProduct(agent, { name: `Payment Widget ${Date.now()}-${Math.random()}`, retailPrice: 5000 });
  await addStock(agent, product.id, 20);
  const customer = await createRetailCustomer(agent, { name: `Payment Customer ${Date.now()}-${Math.random()}` });

  const response = await agent.post("/api/installments").send({
    customerId: customer.id,
    saleDate: "2026-08-01",
    items: [{ productId: product.id, quantityPieces: 10, actualSalePrice: 5000 }],
    discount: 0,
    downPayment: 10000,
    markupType: "PERCENT",
    markupValue: 10,
    numberOfMonths: 8,
    firstPaymentDate: "2026-08-10",
    ...overrides,
  });
  if (response.status !== 201) {
    throw new Error(`createPlan failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return response.body.plan;
}

test("a partial payment marks the first installment PARTIAL and reduces plan outstanding by exactly the amount paid", async () => {
  const plan = await createPlan(tenant.agent);

  const response = await tenant.agent.post("/api/installments/payments").send({
    planId: plan.id,
    amount: 2000,
    paymentDate: "2026-08-10",
    paymentMethod: "CASH",
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.plan.totalPaid, 2000);
  assert.equal(response.body.plan.outstandingAmount, 42000);
  assert.equal(response.body.plan.status, "ACTIVE");

  const firstRow = response.body.schedule.find((row) => row.installmentNo === 1);
  assert.equal(firstRow.status, "PARTIAL");
  assert.equal(firstRow.paidAmount, 2000);
  assert.equal(firstRow.remainingAmount, 3500);
});

test("an overpayment spanning multiple installments allocates oldest-due-first and rolls the remainder forward", async () => {
  const plan = await createPlan(tenant.agent);

  // 12000 covers installment 1 (5500) and 2 (5500) in full, leaving 1000 applied
  // to installment 3 (which is due 5500, so it goes PARTIAL with 4500 remaining).
  const response = await tenant.agent.post("/api/installments/payments").send({
    planId: plan.id,
    amount: 12000,
    paymentDate: "2026-08-10",
    paymentMethod: "CASH",
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.plan.totalPaid, 12000);
  assert.equal(response.body.plan.outstandingAmount, 32000);

  const [row1, row2, row3, row4] = response.body.schedule;
  assert.equal(row1.status, "PAID");
  assert.equal(row1.paidAmount, 5500);
  assert.equal(row2.status, "PAID");
  assert.equal(row2.paidAmount, 5500);
  assert.equal(row3.status, "PARTIAL");
  assert.equal(row3.paidAmount, 1000);
  assert.equal(row3.remainingAmount, 4500);
  assert.equal(row4.status, "PENDING");
  assert.equal(row4.paidAmount, 0);
});

test("a payment exceeding the plan's outstanding balance is rejected and changes nothing", async () => {
  const plan = await createPlan(tenant.agent);
  const cashBefore = await getCashAccount(tenant.agent);

  const response = await tenant.agent.post("/api/installments/payments").send({
    planId: plan.id,
    amount: 50000,
    paymentDate: "2026-08-10",
    paymentMethod: "CASH",
  });
  assert.equal(response.status, 400);
  assert.match(response.body.message, /exceeds the plan's outstanding balance/);

  const planResponse = await tenant.agent.get(`/api/installments/${plan.id}`);
  assert.equal(planResponse.body.plan.outstandingAmount, 44000, "outstanding balance must be unchanged after the rejected payment");

  const cashAfter = await getCashAccount(tenant.agent);
  assert.equal(Number(cashAfter.balance), Number(cashBefore.balance), "cash must be unchanged after the rejected payment");
});

async function ledgerLinesFor(agent, accountCode, sourceId) {
  const response = await agent.get("/api/journal/general-ledger").query({ accountCode });
  assert.equal(response.status, 200);
  return response.body.lines.filter((line) => line.sourceId === sourceId);
}

test("a GRADUAL-recognition payment credits Cash, debits Installment Receivable, and recognizes its proportional slice of markup income", async () => {
  const plan = await createPlan(tenant.agent);

  // 4000 markup / 44000 final payable = 1/11 of every taka collected is markup;
  // paying exactly one installment (5500) recognizes 500 of it as earned.
  const response = await tenant.agent.post("/api/installments/payments").send({
    planId: plan.id,
    amount: 5500,
    paymentDate: "2026-08-10",
    paymentMethod: "CASH",
  });
  assert.equal(response.status, 201);
  const paymentId = response.body.payment.id;

  const cashLines = await ledgerLinesFor(tenant.agent, "1000", paymentId);
  assert.equal(cashLines.length, 1);
  assert.equal(cashLines[0].debit, 5500);

  const receivableLines = await ledgerLinesFor(tenant.agent, "1150", paymentId);
  assert.equal(receivableLines.length, 1);
  assert.equal(receivableLines[0].credit, 5500);

  const unearnedLines = await ledgerLinesFor(tenant.agent, "2150", paymentId);
  assert.equal(unearnedLines.length, 1);
  assert.equal(unearnedLines[0].debit, 500, "500 of unearned markup income is released");

  const markupIncomeLines = await ledgerLinesFor(tenant.agent, "4040", paymentId);
  assert.equal(markupIncomeLines.length, 1);
  assert.equal(markupIncomeLines[0].credit, 500, "and recognized as earned markup income");
});

test("an IMMEDIATE-recognition plan's payment moves cash and the receivable only — markup was already recognized at sale time", async () => {
  const plan = await createPlan(tenant.agent, { markupRecognitionMode: "IMMEDIATE" });

  const response = await tenant.agent.post("/api/installments/payments").send({
    planId: plan.id,
    amount: 5500,
    paymentDate: "2026-08-10",
    paymentMethod: "CASH",
  });
  assert.equal(response.status, 201);
  const paymentId = response.body.payment.id;

  const receivableLines = await ledgerLinesFor(tenant.agent, "1150", paymentId);
  assert.equal(receivableLines.length, 1);
  assert.equal(receivableLines[0].credit, 5500);

  const unearnedLines = await ledgerLinesFor(tenant.agent, "2150", paymentId);
  assert.equal(unearnedLines.length, 0, "nothing was ever deferred, so nothing is released here");

  const markupIncomeLines = await ledgerLinesFor(tenant.agent, "4040", paymentId);
  assert.equal(markupIncomeLines.length, 0, "the markup income line was already posted at plan creation, not here");
});

test("a CASH payment deposits the exact amount into the cash account", async () => {
  const plan = await createPlan(tenant.agent);
  const cashBefore = await getCashAccount(tenant.agent);

  const response = await tenant.agent.post("/api/installments/payments").send({
    planId: plan.id,
    amount: 5500,
    paymentDate: "2026-08-10",
    paymentMethod: "CASH",
  });
  assert.equal(response.status, 201);

  const cashAfter = await getCashAccount(tenant.agent);
  assert.equal(Number(cashAfter.balance), Number(cashBefore.balance) + 5500);
});

test("paying off every installment completes the plan, and further collection is rejected", async () => {
  const plan = await createPlan(tenant.agent);

  const fullPayment = await tenant.agent.post("/api/installments/payments").send({
    planId: plan.id,
    amount: 44000,
    paymentDate: "2026-08-10",
    paymentMethod: "CASH",
  });
  assert.equal(fullPayment.status, 201);
  assert.equal(fullPayment.body.plan.outstandingAmount, 0);
  assert.equal(fullPayment.body.plan.status, "COMPLETED");
  assert.ok(fullPayment.body.schedule.every((row) => row.status === "PAID"));

  const extraPayment = await tenant.agent.post("/api/installments/payments").send({
    planId: plan.id,
    amount: 100,
    paymentDate: "2026-08-11",
    paymentMethod: "CASH",
  });
  assert.equal(extraPayment.status, 400);
  assert.match(extraPayment.body.message, /Cannot collect a payment against a completed plan/);
});

test("collecting a non-positive amount is rejected", async () => {
  const plan = await createPlan(tenant.agent);

  const response = await tenant.agent.post("/api/installments/payments").send({
    planId: plan.id,
    amount: 0,
    paymentDate: "2026-08-10",
    paymentMethod: "CASH",
  });
  assert.equal(response.status, 400);
});

test("tenant isolation: another tenant cannot collect a payment against a plan that isn't theirs", async () => {
  const plan = await createPlan(tenant.agent);

  const response = await otherTenant.agent.post("/api/installments/payments").send({
    planId: plan.id,
    amount: 1000,
    paymentDate: "2026-08-10",
    paymentMethod: "CASH",
  });
  assert.equal(response.status, 404);
});
