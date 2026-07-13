import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, addStock, createRetailCustomer, getCustomerDueBalance } from "./helpers/seeders.js";

let databaseManager;
let tenant;
let otherTenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Installment Plans Tenant" });
  otherTenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Installment Plans Other Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await cleanupTenant(databaseManager, otherTenant.tenantId);
  await closeTestApp();
});

async function basePlanPayload(overrides = {}) {
  const product = await createProduct(tenant.agent, { name: `Installment Widget ${Date.now()}-${Math.random()}`, retailPrice: 5000 });
  await addStock(tenant.agent, product.id, 20);
  const customer = await createRetailCustomer(tenant.agent, { name: `Installment Customer ${Date.now()}-${Math.random()}` });

  return {
    product,
    customer,
    payload: {
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
    },
  };
}

test("creating an installment plan requires a walk-in-free registered customer, at least one item, months > 0, non-negative markup, and a first payment date", async () => {
  const { payload } = await basePlanPayload();

  const noCustomer = await tenant.agent.post("/api/installments").send({ ...payload, customerId: "" });
  assert.equal(noCustomer.status, 400);

  const noItems = await tenant.agent.post("/api/installments").send({ ...payload, items: [] });
  assert.equal(noItems.status, 400);

  const zeroMonths = await tenant.agent.post("/api/installments").send({ ...payload, numberOfMonths: 0 });
  assert.equal(zeroMonths.status, 400);

  const negativeMarkup = await tenant.agent.post("/api/installments").send({ ...payload, markupValue: -1 });
  assert.equal(negativeMarkup.status, 400);

  const noFirstPaymentDate = await tenant.agent.post("/api/installments").send({ ...payload, firstPaymentDate: "" });
  assert.equal(noFirstPaymentDate.status, 400);
});

test("a down payment exceeding the sale total is rejected as a hard error, not silently clamped", async () => {
  const { payload } = await basePlanPayload({ downPayment: 999999 });

  const response = await tenant.agent.post("/api/installments").send(payload);
  assert.equal(response.status, 400);
  assert.match(response.body.message, /Down payment cannot exceed/);
});

test("an installment sale decrements stock, computes markup/final payable, and generates a schedule that sums to the final payable amount", async () => {
  const { payload, product, customer } = await basePlanPayload();

  const response = await tenant.agent.post("/api/installments").send(payload);
  assert.equal(response.status, 201);

  const { plan, schedule, invoice } = response.body;
  assert.ok(plan.planNumber.startsWith("INST-"));
  assert.equal(plan.customerId, customer.id);
  assert.equal(plan.productTotal, 50000);
  assert.equal(plan.netSaleAmount, 50000);
  assert.equal(plan.downPayment, 10000);
  assert.equal(plan.financeAmount, 40000);
  assert.equal(plan.markupAmount, 4000, "10% markup on the 40000 financed amount");
  assert.equal(plan.finalPayableAmount, 44000);
  assert.equal(plan.monthlyInstallmentAmount, 5500);
  assert.equal(plan.outstandingAmount, 44000);
  assert.equal(plan.totalPaid, 0);
  assert.equal(plan.status, "ACTIVE");
  assert.ok(invoice.id);

  assert.equal(schedule.length, 8);
  const totalScheduled = schedule.reduce((sum, row) => sum + row.dueAmount, 0);
  assert.equal(Math.round(totalScheduled * 100) / 100, 44000);
  assert.equal(schedule[0].dueDate, "2026-08-10");
  assert.equal(schedule[1].dueDate, "2026-09-10");
  assert.equal(schedule[7].dueDate, "2027-03-10");
  assert.ok(schedule.every((row) => row.status === "PENDING"));

  const productResponse = await tenant.agent.get("/api/products").query({ search: product.name });
  const updatedProduct = productResponse.body.items.find((item) => item.id === product.id);
  assert.equal(updatedProduct.stockPieces, 10, "20 in stock minus 10 sold");
});

test("the financed amount is tracked on the installment schedule only, not double-counted on the customer's normal due ledger", async () => {
  const { payload, customer } = await basePlanPayload();

  const response = await tenant.agent.post("/api/installments").send(payload);
  assert.equal(response.status, 201);

  const normalDueBalance = await getCustomerDueBalance(tenant.agent, customer.id);
  assert.equal(normalDueBalance, 0, "the financed amount must not also sit on the general customer due ledger");

  const planBalance = response.body.plan.outstandingAmount;
  assert.equal(planBalance, 44000, "the installment schedule is the sole source of truth for this receivable");
});

async function ledgerLinesFor(accountCode, sourceId) {
  const response = await tenant.agent.get("/api/journal/general-ledger").query({ accountCode });
  assert.equal(response.status, 200);
  return response.body.lines.filter((line) => line.sourceId === sourceId);
}

test("plan creation (GRADUAL, the default) reclassifies the financed amount onto Installment Receivable and defers the markup as unearned income", async () => {
  const { payload } = await basePlanPayload();

  const response = await tenant.agent.post("/api/installments").send(payload);
  assert.equal(response.status, 201);
  const planId = response.body.plan.id;

  const receivableLines = await ledgerLinesFor("1150", planId);
  assert.equal(receivableLines.length, 1);
  assert.equal(receivableLines[0].debit, 44000, "Installment Receivable picks up finance + markup (40000 + 4000)");

  const reclassLines = await ledgerLinesFor("1100", planId);
  assert.equal(reclassLines.length, 1);
  assert.equal(reclassLines[0].credit, 40000, "the financed amount is credited back out of generic Accounts Receivable");

  const unearnedLines = await ledgerLinesFor("2150", planId);
  assert.equal(unearnedLines.length, 1);
  assert.equal(unearnedLines[0].credit, 4000, "markup sits as unearned income until collected, under GRADUAL recognition");

  const markupIncomeLines = await ledgerLinesFor("4040", planId);
  assert.equal(markupIncomeLines.length, 0, "no markup income is recognized yet under GRADUAL recognition");
});

test("plan creation with IMMEDIATE markup recognition books the markup straight to income instead of unearned income", async () => {
  const { payload } = await basePlanPayload({ markupRecognitionMode: "IMMEDIATE" });

  const response = await tenant.agent.post("/api/installments").send(payload);
  assert.equal(response.status, 201);
  const planId = response.body.plan.id;

  const markupIncomeLines = await ledgerLinesFor("4040", planId);
  assert.equal(markupIncomeLines.length, 1);
  assert.equal(markupIncomeLines[0].credit, 4000);

  const unearnedLines = await ledgerLinesFor("2150", planId);
  assert.equal(unearnedLines.length, 0, "IMMEDIATE recognition never touches the unearned income account");
});

test("a plan can be fetched by id with its schedule, and listed", async () => {
  const { payload } = await basePlanPayload();
  const createResponse = await tenant.agent.post("/api/installments").send(payload);
  const planId = createResponse.body.plan.id;

  const getResponse = await tenant.agent.get(`/api/installments/${planId}`);
  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.body.plan.id, planId);
  assert.equal(getResponse.body.schedule.length, 8);

  const listResponse = await tenant.agent.get("/api/installments");
  assert.equal(listResponse.status, 200);
  assert.ok(listResponse.body.items.some((item) => item.id === planId));
});

test("tenant isolation: another tenant cannot view or list a plan that isn't theirs", async () => {
  const { payload } = await basePlanPayload();
  const createResponse = await tenant.agent.post("/api/installments").send(payload);
  const planId = createResponse.body.plan.id;

  const getResponse = await otherTenant.agent.get(`/api/installments/${planId}`);
  assert.equal(getResponse.status, 404);

  const listResponse = await otherTenant.agent.get("/api/installments");
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.items.some((item) => item.id === planId), false);
});
