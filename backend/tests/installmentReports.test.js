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
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Installment Reports Tenant" });
  otherTenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Installment Reports Other Tenant" });
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
  const product = await createProduct(agent, { name: `Report Widget ${Date.now()}-${Math.random()}`, retailPrice: 2000 });
  await addStock(agent, product.id, 20);
  const customer = await createRetailCustomer(agent, { name: `Report Customer ${Date.now()}-${Math.random()}` });

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
  return { plan: response.body.plan, customer };
}

test("the due-schedule report defaults to today, and excludes an installment due next month", async () => {
  const { plan } = await createPlan(tenant.agent, { numberOfMonths: 2, firstPaymentDate: daysFromToday(0) });

  const response = await tenant.agent.get("/api/installments/reports/due-schedule");
  assert.equal(response.status, 200);

  const row = response.body.rows.find((item) => item.planId === plan.id);
  assert.ok(row, "the installment due today must appear");
  assert.equal(row.installmentNo, 1);
  assert.equal(row.remainingAmount, 11000, "22000 payable over 2 months = 11000/installment");
  assert.equal(response.body.rows.filter((item) => item.planId === plan.id).length, 1, "the installment due next month must not appear in today's report");
});

test("the due-schedule report widened to 40 days includes an installment due next month (Upcoming Due)", async () => {
  const { plan } = await createPlan(tenant.agent, { numberOfMonths: 2, firstPaymentDate: daysFromToday(0) });

  const response = await tenant.agent.get("/api/installments/reports/due-schedule").query({
    dateFrom: daysFromToday(0),
    dateTo: daysFromToday(40),
  });
  assert.equal(response.status, 200);

  const rows = response.body.rows.filter((item) => item.planId === plan.id);
  assert.equal(rows.length, 2, "both installments fall within a 40-day window");
});

test("the overdue report flags a past-due installment with correct days-overdue, and it clears once paid", async () => {
  const { plan } = await createPlan(tenant.agent, { firstPaymentDate: daysFromToday(-3), numberOfMonths: 1 });

  const response = await tenant.agent.get("/api/installments/reports/overdue");
  assert.equal(response.status, 200);

  const row = response.body.rows.find((item) => item.planId === plan.id);
  assert.ok(row, "an installment 3 days past due must appear in the overdue report");
  assert.equal(row.daysOverdue, 3);
  assert.equal(row.remainingAmount, 22000);
  assert.ok(response.body.totalOverdue >= 22000);

  const payResponse = await tenant.agent.post("/api/installments/payments").send({
    planId: plan.id,
    amount: 22000,
    paymentDate: daysFromToday(0),
    paymentMethod: "CASH",
  });
  assert.equal(payResponse.status, 201);

  const afterPay = await tenant.agent.get("/api/installments/reports/overdue");
  assert.equal(afterPay.body.rows.some((item) => item.planId === plan.id), false, "a fully paid installment must drop off the overdue report");
});

test("the collection report aggregates payments within a date range with customer, plan, and collector detail", async () => {
  const { plan, customer } = await createPlan(tenant.agent);

  const payResponse = await tenant.agent.post("/api/installments/payments").send({
    planId: plan.id,
    amount: 5000,
    paymentDate: daysFromToday(0),
    paymentMethod: "CASH",
  });
  assert.equal(payResponse.status, 201);
  const paymentId = payResponse.body.payment.id;

  const response = await tenant.agent.get("/api/installments/reports/collections").query({
    dateFrom: daysFromToday(0),
    dateTo: daysFromToday(0),
  });
  assert.equal(response.status, 200);

  const row = response.body.rows.find((item) => item.id === paymentId);
  assert.ok(row, "the payment must appear in the collection report");
  assert.equal(row.amount, 5000);
  assert.equal(row.planNumber, plan.planNumber);
  assert.equal(row.customerName, customer.name);
  assert.ok(row.collectedByName, "the collecting user's name must be attached");
});

test("the customer statement lists every plan for a customer with correct aggregate totals", async () => {
  const product = await createProduct(tenant.agent, { name: `Statement Widget ${Date.now()}`, retailPrice: 2000 });
  await addStock(tenant.agent, product.id, 20);
  const customer = await createRetailCustomer(tenant.agent, { name: `Statement Customer ${Date.now()}` });

  const plan1Response = await tenant.agent.post("/api/installments").send({
    customerId: customer.id,
    saleDate: daysFromToday(0),
    items: [{ productId: product.id, quantityPieces: 5, actualSalePrice: 2000 }],
    discount: 0,
    downPayment: 0,
    markupType: "PERCENT",
    markupValue: 10,
    numberOfMonths: 1,
    firstPaymentDate: daysFromToday(0),
  });
  assert.equal(plan1Response.status, 201);

  const plan2Response = await tenant.agent.post("/api/installments").send({
    customerId: customer.id,
    saleDate: daysFromToday(0),
    items: [{ productId: product.id, quantityPieces: 5, actualSalePrice: 2000 }],
    discount: 0,
    downPayment: 0,
    markupType: "PERCENT",
    markupValue: 10,
    numberOfMonths: 1,
    firstPaymentDate: daysFromToday(0),
  });
  assert.equal(plan2Response.status, 201);

  const payResponse = await tenant.agent.post("/api/installments/payments").send({
    planId: plan1Response.body.plan.id,
    amount: 4000,
    paymentDate: daysFromToday(0),
    paymentMethod: "CASH",
  });
  assert.equal(payResponse.status, 201);

  const response = await tenant.agent.get("/api/installments/customer-statement").query({ customerId: customer.id });
  assert.equal(response.status, 200);
  assert.equal(response.body.customer.id, customer.id);
  assert.equal(response.body.plans.length, 2);

  assert.equal(response.body.totals.finalPayableAmount, 22000, "two 11000-payable plans");
  assert.equal(response.body.totals.totalPaid, 4000);
  assert.equal(response.body.totals.outstandingAmount, 18000);
});

test("the customer statement 404s for an unknown customer", async () => {
  const response = await tenant.agent.get("/api/installments/customer-statement").query({ customerId: "customer-does-not-exist" });
  assert.equal(response.status, 404);
});

test("tenant isolation: another tenant's reports never include this tenant's plans, payments, or customers", async () => {
  const { plan, customer } = await createPlan(tenant.agent, { firstPaymentDate: daysFromToday(0) });
  await tenant.agent.post("/api/installments/payments").send({
    planId: plan.id,
    amount: 1000,
    paymentDate: daysFromToday(0),
    paymentMethod: "CASH",
  });

  const dueResponse = await otherTenant.agent.get("/api/installments/reports/due-schedule");
  assert.equal(dueResponse.body.rows.some((item) => item.planId === plan.id), false);

  const overdueResponse = await otherTenant.agent.get("/api/installments/reports/overdue");
  assert.equal(overdueResponse.body.rows.some((item) => item.planId === plan.id), false);

  const collectionsResponse = await otherTenant.agent.get("/api/installments/reports/collections").query({
    dateFrom: daysFromToday(0),
    dateTo: daysFromToday(0),
  });
  assert.equal(collectionsResponse.body.rows.some((item) => item.planId === plan.id), false);

  const statementResponse = await otherTenant.agent.get("/api/installments/customer-statement").query({ customerId: customer.id });
  assert.equal(statementResponse.status, 404);
});
