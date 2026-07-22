import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, addStock, createRetailCustomer, createDsr } from "./helpers/seeders.js";

let databaseManager;
let tenantA;
let tenantB;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenantA = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Profit Report Tenant A" });
  tenantB = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Profit Report Tenant B" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenantA.tenantId);
  await cleanupTenant(databaseManager, tenantB.tenantId);
  await closeTestApp();
});

test("by-customer breakdown attributes gross profit to the registered customer and matches the invoice's total_profit", async () => {
  const today = new Date().toISOString().slice(0, 10);
  const product = await createProduct(tenantA.agent, { name: "Profit Widget", purchasePrice: 50, retailPrice: 90 });
  await addStock(tenantA.agent, product.id, 20);
  const customer = await createRetailCustomer(tenantA.agent, { name: "Profit Customer" });

  const invoiceResponse = await tenantA.agent.post("/api/sales-invoices").send({
    customerType: "REGISTERED",
    customerId: customer.id,
    saleType: "RETAIL",
    invoiceDate: today,
    items: [{ productId: product.id, quantityPieces: 4, actualSalePrice: 90 }],
    discount: 0,
    paidAmount: 360,
    paymentMethod: "CASH",
  });
  assert.equal(invoiceResponse.status, 201);
  const invoice = invoiceResponse.body.invoice;
  assert.equal(invoice.totalProfit, (90 - 50) * 4);

  const breakdown = await tenantA.agent.get("/api/profit-report/by-customer").query({ dateFrom: today, dateTo: today });
  assert.equal(breakdown.status, 200);
  const row = breakdown.body.rows.find((entry) => entry.customerId === customer.id);
  assert.ok(row, "expected a breakdown row for the registered customer");
  assert.equal(row.grossProfit, invoice.totalProfit);
  assert.equal(row.revenue, invoice.totalAmount);
});

test("by-product breakdown matches gross profit derived from cost_price_snapshot", async () => {
  const today = new Date().toISOString().slice(0, 10);
  const product = await createProduct(tenantA.agent, { name: "Breakdown Widget", purchasePrice: 30, retailPrice: 60 });
  await addStock(tenantA.agent, product.id, 10);

  const invoiceResponse = await tenantA.agent.post("/api/sales-invoices").send({
    customerType: "WALK_IN",
    saleType: "RETAIL",
    invoiceDate: today,
    items: [{ productId: product.id, quantityPieces: 2, actualSalePrice: 60 }],
    discount: 0,
    paidAmount: 120,
    paymentMethod: "CASH",
  });
  assert.equal(invoiceResponse.status, 201);

  const breakdown = await tenantA.agent.get("/api/profit-report/by-product").query({ dateFrom: today, dateTo: today });
  assert.equal(breakdown.status, 200);
  const row = breakdown.body.rows.find((entry) => entry.productId === product.id);
  assert.ok(row, "expected a breakdown row for the product");
  assert.equal(row.revenue, 120);
  assert.equal(row.cost, 60);
  assert.equal(row.grossProfit, 60);
});

test("the overall profit report folds DSR settlement revenue/cost and expenses into net profit — the real revenue path for a dealer-only tenant", async () => {
  const day = "2026-05-10";
  const product = await createProduct(tenantA.agent, { name: `Dealer Profit Widget ${Date.now()}`, purchasePrice: 50, wholesalePrice: 70 });
  await addStock(tenantA.agent, product.id, 100);
  const dsr = await createDsr(tenantA.agent, { name: `Dealer Profit DSR ${Date.now()}` });

  const issueResponse = await tenantA.agent.post("/api/issues").send({
    date: day,
    dsrId: dsr.id,
    items: [{ productId: product.id, issuedPieces: 40 }],
  });
  assert.equal(issueResponse.status, 201);

  // Sold = 40 - 5 returned - 5 damaged = 30 @ 70 = 2100 revenue; cost = 30 @ 50 = 1500.
  const settleResponse = await tenantA.agent.post("/api/settlements").send({
    date: day,
    dsrId: dsr.id,
    items: [{ productId: product.id, returnedPieces: 5, damagedPieces: 5 }],
    discount: 0,
    extraReturnValue: 0,
    amountPaid: 2100,
  });
  assert.equal(settleResponse.status, 201);

  const expenseResponse = await tenantA.agent.post("/api/expenses").send({
    date: day,
    category: "Vehicle",
    amount: 200,
    note: "Delivery fuel",
  });
  assert.equal(expenseResponse.status, 201);

  const reportResponse = await tenantA.agent.get("/api/profit-report").query({ dateFrom: day, dateTo: day });
  assert.equal(reportResponse.status, 200);
  const dayRow = reportResponse.body.daily.find((row) => row.date === day);
  assert.ok(dayRow, "expected a daily row for the settlement date");
  assert.equal(dayRow.revenue, 2100);
  assert.equal(dayRow.cost, 1500);
  assert.equal(dayRow.grossProfit, 600);
  assert.equal(dayRow.expenses, 200);
  assert.equal(dayRow.profit, 400, "net profit must be gross profit minus expenses");

  assert.equal(reportResponse.body.totals.revenue, 2100);
  assert.equal(reportResponse.body.totals.cost, 1500);
  assert.equal(reportResponse.body.totals.expenses, 200);
  assert.equal(reportResponse.body.totals.profit, 400);
});

test("the by-dsr breakdown attributes settlement revenue and cost to the correct DSR", async () => {
  const day = "2026-05-11";
  const productA = await createProduct(tenantA.agent, { name: `By-DSR Widget A ${Date.now()}`, purchasePrice: 40, wholesalePrice: 60 });
  const productB = await createProduct(tenantA.agent, { name: `By-DSR Widget B ${Date.now()}`, purchasePrice: 20, wholesalePrice: 35 });
  await addStock(tenantA.agent, productA.id, 50);
  await addStock(tenantA.agent, productB.id, 50);
  const dsrA = await createDsr(tenantA.agent, { name: `By-DSR A ${Date.now()}` });
  const dsrB = await createDsr(tenantA.agent, { name: `By-DSR B ${Date.now()}` });

  await tenantA.agent.post("/api/issues").send({ date: day, dsrId: dsrA.id, items: [{ productId: productA.id, issuedPieces: 20 }] });
  await tenantA.agent.post("/api/settlements").send({
    date: day,
    dsrId: dsrA.id,
    items: [{ productId: productA.id, returnedPieces: 0, damagedPieces: 0 }],
    discount: 0,
    extraReturnValue: 0,
    amountPaid: 0,
  });

  await tenantA.agent.post("/api/issues").send({ date: day, dsrId: dsrB.id, items: [{ productId: productB.id, issuedPieces: 10 }] });
  await tenantA.agent.post("/api/settlements").send({
    date: day,
    dsrId: dsrB.id,
    items: [{ productId: productB.id, returnedPieces: 0, damagedPieces: 0 }],
    discount: 0,
    extraReturnValue: 0,
    amountPaid: 0,
  });

  const breakdown = await tenantA.agent.get("/api/profit-report/by-dsr").query({ dateFrom: day, dateTo: day });
  assert.equal(breakdown.status, 200);

  const rowA = breakdown.body.rows.find((row) => row.dsrId === dsrA.id);
  assert.ok(rowA);
  assert.equal(rowA.revenue, 20 * 60);
  assert.equal(rowA.cost, 20 * 40);
  assert.equal(rowA.grossProfit, 20 * 60 - 20 * 40);

  const rowB = breakdown.body.rows.find((row) => row.dsrId === dsrB.id);
  assert.ok(rowB);
  assert.equal(rowB.revenue, 10 * 35);
  assert.equal(rowB.cost, 10 * 20);
});

test("the by-product breakdown includes DSR settlement sales, not just retail invoices", async () => {
  const day = "2026-05-12";
  const product = await createProduct(tenantA.agent, { name: `By-Product Settlement Widget ${Date.now()}`, purchasePrice: 15, wholesalePrice: 25 });
  await addStock(tenantA.agent, product.id, 30);
  const dsr = await createDsr(tenantA.agent, { name: `By-Product DSR ${Date.now()}` });

  await tenantA.agent.post("/api/issues").send({ date: day, dsrId: dsr.id, items: [{ productId: product.id, issuedPieces: 10 }] });
  await tenantA.agent.post("/api/settlements").send({
    date: day,
    dsrId: dsr.id,
    items: [{ productId: product.id, returnedPieces: 0, damagedPieces: 0 }],
    discount: 0,
    extraReturnValue: 0,
    amountPaid: 0,
  });

  const breakdown = await tenantA.agent.get("/api/profit-report/by-product").query({ dateFrom: day, dateTo: day });
  assert.equal(breakdown.status, 200);
  const row = breakdown.body.rows.find((entry) => entry.productId === product.id);
  assert.ok(row, "expected a by-product row sourced from the DSR settlement, not a sales invoice");
  assert.equal(row.quantity, 10);
  assert.equal(row.revenue, 10 * 25);
  assert.equal(row.cost, 10 * 15);
  assert.equal(row.grossProfit, 10 * (25 - 15));
});

test("the overall profit report folds a retail sale and an expense into net profit — the literal TC-RTL-PROFIT-001 scenario", async () => {
  const day = "2026-05-20";
  const product = await createProduct(tenantA.agent, { name: `Retail Profit Widget ${Date.now()}`, purchasePrice: 40, retailPrice: 70 });
  await addStock(tenantA.agent, product.id, 30);
  const customer = await createRetailCustomer(tenantA.agent, { name: `Retail Profit Customer ${Date.now()}` });

  const invoiceResponse = await tenantA.agent.post("/api/sales-invoices").send({
    customerId: customer.id,
    customerType: "REGISTERED",
    saleType: "RETAIL",
    invoiceDate: day,
    items: [{ productId: product.id, quantityPieces: 10, actualSalePrice: 70 }],
    discount: 0,
    paidAmount: 700,
    paymentMethod: "CASH",
  });
  assert.equal(invoiceResponse.status, 201);
  // Revenue 700, cost 10*40=400, gross profit 300.

  const expenseResponse = await tenantA.agent.post("/api/expenses").send({
    date: day,
    category: "Rent",
    amount: 120,
    note: "Shop rent",
  });
  assert.equal(expenseResponse.status, 201);

  const reportResponse = await tenantA.agent.get("/api/profit-report").query({ dateFrom: day, dateTo: day });
  assert.equal(reportResponse.status, 200);
  const dayRow = reportResponse.body.daily.find((row) => row.date === day);
  assert.ok(dayRow, "expected a daily row for the sale date");
  assert.equal(dayRow.revenue, 700);
  assert.equal(dayRow.cost, 400);
  assert.equal(dayRow.grossProfit, 300);
  assert.equal(dayRow.expenses, 120);
  assert.equal(dayRow.profit, 180, "net profit must be gross profit minus the expense");

  assert.equal(reportResponse.body.totals.revenue, 700);
  assert.equal(reportResponse.body.totals.cost, 400);
  assert.equal(reportResponse.body.totals.expenses, 120);
  assert.equal(reportResponse.body.totals.profit, 180);
});

test("extra returns (good or damaged stock for a product outside today's issue) have zero revenue/cost impact on the profit report", async () => {
  const day1 = "2026-05-15";
  const day2 = "2026-05-16";
  const product = await createProduct(tenantA.agent, {
    name: `Extra Return Widget ${Date.now()}`,
    purchasePrice: 50,
    wholesalePrice: 70,
  });
  const filler = await createProduct(tenantA.agent, {
    name: `Extra Return Filler ${Date.now()}`,
    purchasePrice: 10,
    wholesalePrice: 15,
  });
  await addStock(tenantA.agent, product.id, 100);
  await addStock(tenantA.agent, filler.id, 100);
  const dsr = await createDsr(tenantA.agent, { name: `Extra Return DSR ${Date.now()}` });

  // Day 1: all 40 issued pieces settle as sold (no returns declared that day),
  // so revenue/cost are recognized in full: 40 * 70 = 2800 revenue, 40 * 50 = 2000 cost.
  // Left partially unpaid on purpose, so day 2 has enough accumulated due to
  // absorb tomorrow's extra return credit.
  await tenantA.agent.post("/api/issues").send({
    date: day1,
    dsrId: dsr.id,
    items: [{ productId: product.id, issuedPieces: 40 }],
  });
  const settle1 = await tenantA.agent.post("/api/settlements").send({
    date: day1,
    dsrId: dsr.id,
    items: [{ productId: product.id, returnedPieces: 0, damagedPieces: 0 }],
    discount: 0,
    extraReturnValue: 0,
    amountPaid: 2000,
  });
  assert.equal(settle1.status, 201);

  // Day 2: 3 of yesterday's pieces come back good, 2 are found damaged. These
  // aren't part of today's issue, so they go through extraReturns instead of
  // items. Good stock is just restocked and damaged stock written off
  // elsewhere — neither should touch the profit report's revenue or cost.
  await tenantA.agent.post("/api/issues").send({
    date: day2,
    dsrId: dsr.id,
    items: [{ productId: filler.id, issuedPieces: 5 }],
  });
  const settle2 = await tenantA.agent.post("/api/settlements").send({
    date: day2,
    dsrId: dsr.id,
    items: [{ productId: filler.id, returnedPieces: 0, damagedPieces: 0 }],
    extraReturns: [{ productId: product.id, returnedPieces: 3, damagedPieces: 2 }],
    discount: 0,
    extraReturnValue: 5 * 70,
    amountPaid: 0,
  });
  assert.equal(settle2.status, 201);

  const fillerRevenue = 5 * 15;
  const fillerCost = 5 * 10;

  const reportResponse = await tenantA.agent.get("/api/profit-report").query({ dateFrom: day2, dateTo: day2 });
  assert.equal(reportResponse.status, 200);
  const dayRow = reportResponse.body.daily.find((row) => row.date === day2);
  assert.ok(dayRow);
  assert.equal(dayRow.revenue, fillerRevenue, "extra return must not reduce today's revenue");
  assert.equal(dayRow.cost, fillerCost, "extra return must not reduce today's cost");

  const dsrBreakdown = await tenantA.agent.get("/api/profit-report/by-dsr").query({ dateFrom: day2, dateTo: day2 });
  assert.equal(dsrBreakdown.status, 200);
  const dsrRow = dsrBreakdown.body.rows.find((row) => row.dsrId === dsr.id);
  assert.ok(dsrRow);
  assert.equal(dsrRow.revenue, fillerRevenue);
  assert.equal(dsrRow.cost, fillerCost);

  const productBreakdown = await tenantA.agent.get("/api/profit-report/by-product").query({ dateFrom: day2, dateTo: day2 });
  assert.equal(productBreakdown.status, 200);
  const productRow = productBreakdown.body.rows.find((row) => row.productId === product.id);
  assert.equal(productRow, undefined, "the extra-returned product must not appear in today's by-product breakdown at all");
});

test("tenant B cannot see tenant A's profit breakdown rows", async () => {
  const today = new Date().toISOString().slice(0, 10);
  const product = await createProduct(tenantA.agent, { name: "Isolated Widget", purchasePrice: 20, retailPrice: 40 });
  await addStock(tenantA.agent, product.id, 5);

  const invoiceResponse = await tenantA.agent.post("/api/sales-invoices").send({
    customerType: "WALK_IN",
    saleType: "RETAIL",
    invoiceDate: today,
    items: [{ productId: product.id, quantityPieces: 1, actualSalePrice: 40 }],
    discount: 0,
    paidAmount: 40,
    paymentMethod: "CASH",
  });
  assert.equal(invoiceResponse.status, 201);

  const productBreakdown = await tenantB.agent.get("/api/profit-report/by-product").query({ dateFrom: today, dateTo: today });
  assert.equal(productBreakdown.status, 200);
  assert.equal(productBreakdown.body.rows.some((row) => row.productId === product.id), false);
});
