import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, createSupplier, createRetailCustomer, depositCash } from "./helpers/seeders.js";

let databaseManager;
let tenant;
let customer;
let supplier;
let product;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Financial Reporting Tenant" });

  supplier = await createSupplier(tenant.agent, { name: "Reporting Supplier" });
  customer = await createRetailCustomer(tenant.agent, { name: "Reporting Customer" });
  product = await createProduct(tenant.agent, {
    name: "Reporting Widget",
    purchasePrice: 50,
    wholesalePrice: 80,
    retailPrice: 100,
  });

  await depositCash(tenant.agent, 1000, {
    date: "2026-03-01",
    note: "Opening owner funding",
  });

  const purchaseResponse = await tenant.agent.post("/api/purchase-receive").send({
    supplierId: supplier.id,
    purchaseDate: "2026-03-02",
    items: [{ productId: product.id, quantityPieces: 10, purchasePrice: 50 }],
    discount: 0,
    paidAmount: 300,
    paymentMethod: "CASH",
  });
  assert.equal(purchaseResponse.status, 201);

  const saleResponse = await tenant.agent.post("/api/sales-invoices").send({
    customerId: customer.id,
    customerType: "REGISTERED",
    saleType: "RETAIL",
    invoiceDate: "2026-03-03",
    items: [{ productId: product.id, quantityPieces: 4, actualSalePrice: 100 }],
    discount: 0,
    paidAmount: 100,
    paymentMethod: "CASH",
  });
  assert.equal(saleResponse.status, 201);

  const customerPaymentResponse = await tenant.agent.post("/api/customer-payments").send({
    customerId: customer.id,
    paymentDate: "2026-03-04",
    amount: 150,
    paymentMethod: "CASH",
    note: "Partial collection",
  });
  assert.equal(customerPaymentResponse.status, 201);

  const supplierPaymentResponse = await tenant.agent.post("/api/supplier-payments").send({
    supplierId: supplier.id,
    paymentDate: "2026-03-06",
    amount: 80,
    paymentMethod: "CASH",
    note: "Partial supplier settlement",
  });
  assert.equal(supplierPaymentResponse.status, 201);

  const transferResponse = await tenant.agent.post("/api/finance-accounts/transfers").send({
    fromAccountType: "CASH",
    toAccountType: "BANK",
    amount: 200,
    date: "2026-03-07",
    note: "Move cash to bank",
  });
  assert.equal(transferResponse.status, 201);
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await closeTestApp();
});

function byCode(rows) {
  return new Map(rows.map((row) => [row.code, row]));
}

test("trial balance reflects the seeded scenario and stays balanced", async () => {
  const response = await tenant.agent.get("/api/financial-reports/trial-balance").query({
    dateTo: "2026-03-07",
  });
  assert.equal(response.status, 200);

  const map = byCode(response.body.rows);
  assert.equal(response.body.balanced, true);
  assert.equal(map.get("1000")?.closingDebit, 670);
  assert.equal(map.get("1010")?.closingDebit, 200);
  assert.equal(map.get("1100")?.closingDebit, 150);
  assert.equal(map.get("1200")?.closingDebit, 300);
  assert.equal(map.get("2000")?.closingCredit, 120);
  assert.equal(map.get("3000")?.closingCredit, 1000);
  assert.equal(map.get("4000")?.closingCredit, 400);
  assert.equal(map.get("5000")?.closingDebit, 200);
  assert.equal(response.body.closingDebit, 1520);
  assert.equal(response.body.closingCredit, 1520);
});

test("general ledger and account ledger return running balances from journal data", async () => {
  const generalResponse = await tenant.agent.get("/api/financial-reports/general-ledger").query({
    accountCode: "1000",
    dateFrom: "2026-03-01",
    dateTo: "2026-03-07",
  });
  assert.equal(generalResponse.status, 200);
  assert.equal(generalResponse.body.openingBalance, 0);
  assert.equal(generalResponse.body.closingBalance, 670);
  assert.equal(generalResponse.body.lines.length, 6);
  assert.equal(generalResponse.body.lines.at(-1).runningBalance, 670);

  const accountResponse = await tenant.agent.get("/api/financial-reports/account-ledger").query({
    accountCode: "1100",
    dateFrom: "2026-03-01",
    dateTo: "2026-03-07",
  });
  assert.equal(accountResponse.status, 200);
  assert.equal(accountResponse.body.openingBalance, 0);
  assert.equal(accountResponse.body.closingBalance, 150);
  assert.equal(accountResponse.body.lines.length, 2);
  assert.equal(accountResponse.body.lines[0].runningBalance, 300);
  assert.equal(accountResponse.body.lines[1].runningBalance, 150);
});

test("customer and supplier ledgers track outstanding balances correctly", async () => {
  const customerResponse = await tenant.agent.get("/api/financial-reports/customer-ledger").query({
    customerId: customer.id,
    dateFrom: "2026-03-01",
    dateTo: "2026-03-07",
  });
  assert.equal(customerResponse.status, 200);
  assert.equal(customerResponse.body.openingBalance, 0);
  assert.equal(customerResponse.body.outstanding, 150);
  assert.equal(customerResponse.body.lines.length, 2);
  assert.equal(customerResponse.body.lines[0].debit, 300);
  assert.equal(customerResponse.body.lines[1].credit, 150);

  const supplierResponse = await tenant.agent.get("/api/financial-reports/supplier-ledger").query({
    supplierId: supplier.id,
    dateFrom: "2026-03-01",
    dateTo: "2026-03-07",
  });
  assert.equal(supplierResponse.status, 200);
  assert.equal(supplierResponse.body.openingBalance, 0);
  assert.equal(supplierResponse.body.outstanding, 120);
  assert.equal(supplierResponse.body.lines.length, 2);
  assert.equal(supplierResponse.body.lines[0].credit, 200);
  assert.equal(supplierResponse.body.lines[1].debit, 80);
});

test("cash book and bank book isolate their account classes with correct running balances", async () => {
  const cashResponse = await tenant.agent.get("/api/financial-reports/cash-book").query({
    dateFrom: "2026-03-01",
    dateTo: "2026-03-07",
  });
  assert.equal(cashResponse.status, 200);
  assert.equal(cashResponse.body.openingBalance, 0);
  assert.equal(cashResponse.body.closingBalance, 670);
  assert.equal(cashResponse.body.lines.length, 6);
  assert.equal(cashResponse.body.lines.at(-1).runningBalance, 670);

  const bankResponse = await tenant.agent.get("/api/financial-reports/bank-book").query({
    dateFrom: "2026-03-01",
    dateTo: "2026-03-07",
  });
  assert.equal(bankResponse.status, 200);
  assert.equal(bankResponse.body.openingBalance, 0);
  assert.equal(bankResponse.body.closingBalance, 200);
  assert.equal(bankResponse.body.lines.length, 1);
  assert.equal(bankResponse.body.lines[0].debit, 200);
  assert.equal(bankResponse.body.lines[0].runningBalance, 200);
});

test("profit and loss, balance sheet, and cash flow reconcile on the same dataset", async () => {
  const pnlResponse = await tenant.agent.get("/api/financial-reports/profit-and-loss").query({
    dateFrom: "2026-03-01",
    dateTo: "2026-03-07",
  });
  assert.equal(pnlResponse.status, 200);
  assert.equal(pnlResponse.body.current.revenue.total, 400);
  assert.equal(pnlResponse.body.current.costOfGoodsSold.total, 200);
  assert.equal(pnlResponse.body.current.netProfit, 200);

  const balanceSheetResponse = await tenant.agent.get("/api/financial-reports/balance-sheet").query({
    asOfDate: "2026-03-07",
  });
  assert.equal(balanceSheetResponse.status, 200);
  assert.equal(balanceSheetResponse.body.totalAssets, 1320);
  assert.equal(balanceSheetResponse.body.totalLiabilities, 120);
  assert.equal(balanceSheetResponse.body.totalEquity, 1200);
  assert.equal(balanceSheetResponse.body.balanced, true);

  const cashFlowResponse = await tenant.agent.get("/api/financial-reports/cash-flow").query({
    dateFrom: "2026-03-01",
    dateTo: "2026-03-07",
  });
  assert.equal(cashFlowResponse.status, 200);
  assert.equal(cashFlowResponse.body.openingCash, 0);
  assert.equal(cashFlowResponse.body.closingCash, 870);
  assert.equal(cashFlowResponse.body.netCashMovement, 870);
  assert.equal(cashFlowResponse.body.operatingTotal, -130);
  assert.equal(cashFlowResponse.body.financingTotal, 1000);
  assert.equal(cashFlowResponse.body.investingTotal, 0);
  assert.equal(cashFlowResponse.body.balanced, true);
});

