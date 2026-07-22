import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, addStock, createSupplier, createRetailCustomer, createDsr, createSr, depositCash } from "./helpers/seeders.js";

let databaseManager;
let tenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Journal Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await closeTestApp();
});

async function trialBalanceMap() {
  const response = await tenant.agent.get("/api/journal/trial-balance");
  assert.equal(response.status, 200);
  const byCode = new Map(response.body.rows.map((row) => [row.code, row]));
  return { ...response.body, byCode };
}

function closingBalanceOf(map, code) {
  return map.byCode.get(code)?.closingBalance || 0;
}

// Runs `action`, returns the closing-balance delta for each requested account
// code plus whether the tenant-wide ledger is still balanced afterward.
async function deltasAfter(codes, action) {
  const before = await trialBalanceMap();
  await action();
  const afterMap = await trialBalanceMap();
  const deltas = {};
  for (const code of codes) {
    deltas[code] = closingBalanceOf(afterMap, code) - closingBalanceOf(before, code);
  }
  return { deltas, balanced: afterMap.balanced };
}

test("chart of accounts exposes the fixed starter set", async () => {
  const response = await tenant.agent.get("/api/journal/accounts");
  assert.equal(response.status, 200);
  const codes = response.body.accounts.map((account) => account.code);
  for (const expected of ["1000", "1010", "1100", "1200", "2000", "3000", "4000", "5000", "6000"]) {
    assert.ok(codes.includes(expected), `chart of accounts must include ${expected}`);
  }
});

test("trial balance's dateTo actually excludes activity dated after the cutoff", async () => {
  const product = await createProduct(tenant.agent, { name: "Trial Balance Cutoff Widget", purchasePrice: 40, retailPrice: 100 });
  await addStock(tenant.agent, product.id, 20);

  const response = await tenant.agent.post("/api/sales-invoices").send({
    customerType: "WALK_IN",
    saleType: "RETAIL",
    invoiceDate: "2021-08-15",
    items: [{ productId: product.id, quantityPieces: 2, actualSalePrice: 100 }],
    discount: 0,
    paidAmount: 200,
    paymentMethod: "CASH",
  });
  assert.equal(response.status, 201);

  const before = await tenant.agent.get("/api/journal/trial-balance").query({ dateTo: "2021-08-01" });
  assert.equal(before.status, 200);
  const revenueRowBefore = before.body.rows.find((row) => row.code === "4000");
  assert.equal(revenueRowBefore.totalCredit, 0, "a cutoff before the sale must not include it");

  const after = await tenant.agent.get("/api/journal/trial-balance").query({ dateTo: "2021-08-31" });
  assert.equal(after.status, 200);
  const revenueRowAfter = after.body.rows.find((row) => row.code === "4000");
  assert.equal(revenueRowAfter.totalCredit, 200, "a cutoff after the sale must include it");
});

test("a fully-paid walk-in sale posts a balanced entry across cash, revenue, COGS and inventory", async () => {
  const product = await createProduct(tenant.agent, { name: "Journal Widget", purchasePrice: 50, retailPrice: 90 });
  await addStock(tenant.agent, product.id, 20);

  const { deltas, balanced } = await deltasAfter(["1000", "1200", "4000", "5000"], async () => {
    const response = await tenant.agent.post("/api/sales-invoices").send({
      customerType: "WALK_IN",
      saleType: "RETAIL",
      invoiceDate: "2026-01-15",
      items: [{ productId: product.id, quantityPieces: 5, actualSalePrice: 90 }],
      discount: 0,
      paidAmount: 450,
      paymentMethod: "CASH",
    });
    assert.equal(response.status, 201);
  });

  assert.equal(deltas["1000"], 450, "cash goes up by the full paid amount");
  assert.equal(deltas["4000"], 450, "sales revenue goes up by the sale value (no tax configured)");
  assert.equal(deltas["5000"], 250, "COGS books 5 pieces at the 50 purchase price");
  assert.equal(deltas["1200"], -250, "inventory books down by the same cost");
  assert.ok(balanced, "ledger stays balanced");
});

test("deleting that sale reverses every leg of the entry back to zero", async () => {
  const product = await createProduct(tenant.agent, { name: "Journal Widget 2", purchasePrice: 50, retailPrice: 90 });
  await addStock(tenant.agent, product.id, 20);

  const createResponse = await tenant.agent.post("/api/sales-invoices").send({
    customerType: "WALK_IN",
    saleType: "RETAIL",
    invoiceDate: "2026-01-15",
    items: [{ productId: product.id, quantityPieces: 4, actualSalePrice: 90 }],
    discount: 0,
    paidAmount: 360,
    paymentMethod: "CASH",
  });
  assert.equal(createResponse.status, 201);
  const invoiceId = createResponse.body.invoice.id;

  const { deltas, balanced } = await deltasAfter(["1000", "1200", "4000", "5000"], async () => {
    const deleteResponse = await tenant.agent.delete(`/api/sales-invoices/${invoiceId}`).send({ reason: "test reversal" });
    assert.equal(deleteResponse.status, 200);
  });

  assert.equal(deltas["1000"], -360);
  assert.equal(deltas["4000"], -360);
  assert.equal(deltas["5000"], -200);
  assert.equal(deltas["1200"], 200);
  assert.ok(balanced);
});

test("a registered sale with a due balance debits accounts receivable instead of cash for the unpaid portion", async () => {
  const product = await createProduct(tenant.agent, { name: "Journal Widget 3", purchasePrice: 50, retailPrice: 90 });
  await addStock(tenant.agent, product.id, 20);
  const customer = await createRetailCustomer(tenant.agent, { name: "Journal Customer" });

  const { deltas } = await deltasAfter(["1000", "1100", "4000"], async () => {
    const response = await tenant.agent.post("/api/sales-invoices").send({
      customerId: customer.id,
      customerType: "REGISTERED",
      saleType: "RETAIL",
      invoiceDate: "2026-01-15",
      items: [{ productId: product.id, quantityPieces: 10, actualSalePrice: 90 }],
      discount: 0,
      paidAmount: 500,
      paymentMethod: "CASH",
    });
    assert.equal(response.status, 201);
  });

  assert.equal(deltas["1000"], 500, "cash gets the paid portion");
  assert.equal(deltas["1100"], 400, "accounts receivable gets the due portion");
  assert.equal(deltas["4000"], 900, "revenue books the full sale value");
});

test("a purchase receipt posts inventory against payable and cash", async () => {
  const supplier = await createSupplier(tenant.agent, { name: "Journal Supplier" });
  const product = await createProduct(tenant.agent, { name: "Journal Purchase Widget", purchasePrice: 100 });

  const { deltas, balanced } = await deltasAfter(["1200", "2000", "1000"], async () => {
    const response = await tenant.agent.post("/api/purchase-receive").send({
      supplierId: supplier.id,
      purchaseDate: "2026-01-10",
      items: [{ productId: product.id, quantityPieces: 10, purchasePrice: 100 }],
      discount: 0,
      paidAmount: 600,
      paymentMethod: "CASH",
    });
    assert.equal(response.status, 201);
  });

  assert.equal(deltas["1200"], 1000, "inventory goes up by the full receipt value");
  assert.equal(deltas["2000"], 400, "payable carries the unpaid portion");
  assert.equal(deltas["1000"], -600, "cash goes down by the paid portion");
  assert.ok(balanced);
});

test("editing a purchase receipt's total posts a balanced adjustment, and deleting it reverses the original and the adjustment together", async () => {
  await depositCash(tenant.agent, 2000, { note: "Fund for purchase receipt update test" });
  const supplier = await createSupplier(tenant.agent, { name: "Journal Supplier 2" });
  const product = await createProduct(tenant.agent, { name: "Journal Purchase Widget 2", purchasePrice: 100 });

  const createResponse = await tenant.agent.post("/api/purchase-receive").send({
    supplierId: supplier.id,
    purchaseDate: "2026-01-10",
    items: [{ productId: product.id, quantityPieces: 10, purchasePrice: 100 }],
    discount: 0,
    paidAmount: 1000,
    paymentMethod: "CASH",
  });
  assert.equal(createResponse.status, 201);
  const receipt = createResponse.body.purchaseReceipt;

  const { deltas: updateDeltas } = await deltasAfter(["1200", "2000", "1000"], async () => {
    const updateResponse = await tenant.agent.put(`/api/purchase-receive/${receipt.id}`).send({
      supplierId: supplier.id,
      purchaseDate: "2026-01-10",
      supplierInvoiceNo: receipt.supplierInvoiceNo || "",
      items: [{ productId: product.id, quantityPieces: 15, purchasePrice: 100 }],
      discount: 0,
      paidAmount: 1000,
      paymentMethod: "CASH",
      reason: "Journal test adjustment",
    });
    assert.equal(updateResponse.status, 200);
  });

  assert.equal(updateDeltas["1200"], 500, "inventory grows by the extra 5 pieces at cost");
  assert.equal(updateDeltas["2000"], 500, "the extra value is unpaid, so payable grows");
  assert.equal(updateDeltas["1000"], 0, "cash is untouched — paidAmount didn't change");

  const { deltas: deleteDeltas, balanced } = await deltasAfter(["1200", "2000", "1000"], async () => {
    const deleteResponse = await tenant.agent.delete(`/api/purchase-receive/${receipt.id}`).send({ reason: "test reversal" });
    assert.equal(deleteResponse.status, 200);
  });

  assert.equal(deleteDeltas["1200"], -1500, "delete undoes the original 1000 plus the 500 adjustment");
  assert.equal(deleteDeltas["2000"], -500, "delete undoes the adjustment's payable increase");
  assert.equal(deleteDeltas["1000"], 1000, "delete gives the original cash payment back");
  assert.ok(balanced);
});

test("a customer payment posts cash against accounts receivable, and deleting it reverses", async () => {
  const product = await createProduct(tenant.agent, { name: "Journal Widget 4", purchasePrice: 50, retailPrice: 90 });
  await addStock(tenant.agent, product.id, 20);
  const customer = await createRetailCustomer(tenant.agent, { name: "Journal Customer 2" });
  const saleResponse = await tenant.agent.post("/api/sales-invoices").send({
    customerId: customer.id,
    customerType: "REGISTERED",
    saleType: "RETAIL",
    invoiceDate: "2026-01-15",
    items: [{ productId: product.id, quantityPieces: 10, actualSalePrice: 90 }],
    discount: 0,
    paidAmount: 0,
    paymentMethod: "CASH",
  });
  assert.equal(saleResponse.status, 201);

  let paymentId;
  const { deltas } = await deltasAfter(["1000", "1100"], async () => {
    const paymentResponse = await tenant.agent.post("/api/customer-payments").send({
      customerId: customer.id,
      paymentDate: "2026-01-16",
      amount: 300,
      paymentMethod: "CASH",
    });
    assert.equal(paymentResponse.status, 201);
    paymentId = paymentResponse.body.payment.id;
  });

  assert.equal(deltas["1000"], 300);
  assert.equal(deltas["1100"], -300);

  const { deltas: deleteDeltas, balanced } = await deltasAfter(["1000", "1100"], async () => {
    const deleteResponse = await tenant.agent.delete(`/api/customer-payments/${paymentId}`).send({ reason: "test reversal" });
    assert.equal(deleteResponse.status, 200);
  });

  assert.equal(deleteDeltas["1000"], -300);
  assert.equal(deleteDeltas["1100"], 300);
  assert.ok(balanced);
});

test("a supplier payment posts accounts payable against cash", async () => {
  await depositCash(tenant.agent, 1000, { note: "Fund for supplier payment test" });
  const supplier = await createSupplier(tenant.agent, { name: "Journal Supplier 3" });
  const product = await createProduct(tenant.agent, { name: "Journal Purchase Widget 3", purchasePrice: 100 });
  const receiptResponse = await tenant.agent.post("/api/purchase-receive").send({
    supplierId: supplier.id,
    purchaseDate: "2026-01-10",
    items: [{ productId: product.id, quantityPieces: 10, purchasePrice: 100 }],
    discount: 0,
    paidAmount: 0,
    paymentMethod: "CASH",
  });
  assert.equal(receiptResponse.status, 201);

  const { deltas, balanced } = await deltasAfter(["2000", "1000"], async () => {
    const paymentResponse = await tenant.agent.post("/api/supplier-payments").send({
      supplierId: supplier.id,
      paymentDate: "2026-01-16",
      amount: 400,
      paymentMethod: "CASH",
    });
    assert.equal(paymentResponse.status, 201);
  });

  assert.equal(deltas["2000"], -400);
  assert.equal(deltas["1000"], -400);
  assert.ok(balanced);
});

test("an expense posts operating expenses against cash, and deleting it reverses", async () => {
  let expenseId;
  const { deltas } = await deltasAfter(["6000", "1000"], async () => {
    const response = await tenant.agent.post("/api/expenses").send({
      date: "2026-01-20",
      category: "Office",
      amount: 150,
      note: "Journal test expense",
    });
    assert.equal(response.status, 201);
    expenseId = response.body.expense.id;
  });

  assert.equal(deltas["6000"], 150);
  assert.equal(deltas["1000"], -150);

  const { deltas: deleteDeltas, balanced } = await deltasAfter(["6000", "1000"], async () => {
    const deleteResponse = await tenant.agent.delete(`/api/expenses/${expenseId}`).send({ reason: "test reversal" });
    assert.equal(deleteResponse.status, 200);
  });

  assert.equal(deleteDeltas["6000"], -150);
  assert.equal(deleteDeltas["1000"], 150);
  assert.ok(balanced);
});

test("a manual cash deposit posts against owner's equity", async () => {
  const { deltas, balanced } = await deltasAfter(["1000", "3000"], async () => {
    await depositCash(tenant.agent, 1000, { note: "Owner capital injection" });
  });

  assert.equal(deltas["1000"], 1000);
  assert.equal(deltas["3000"], 1000);
  assert.ok(balanced);
});

test("a cash-to-bank transfer posts once across both accounts, and deleting it reverses once", async () => {
  await depositCash(tenant.agent, 500, { note: "Fund for transfer test" });

  const { deltas } = await deltasAfter(["1000", "1010"], async () => {
    const response = await tenant.agent.post("/api/finance-accounts/transfers").send({
      fromAccountType: "CASH",
      toAccountType: "BANK",
      amount: 500,
      date: "2026-01-20",
      note: "Journal transfer test",
    });
    assert.equal(response.status, 201);
  });

  assert.equal(deltas["1000"], -500);
  assert.equal(deltas["1010"], 500);

  const txnResponse = await tenant.agent.get("/api/finance-accounts/transactions").query({ accountType: "BANK" });
  const transferTxn = txnResponse.body.items.find((item) => item.type === "TRANSFER_IN" && item.debit === 500);
  assert.ok(transferTxn, "the transfer-in leg must be visible");

  const { deltas: deleteDeltas, balanced } = await deltasAfter(["1000", "1010"], async () => {
    const deleteResponse = await tenant.agent
      .delete(`/api/finance-accounts/transactions/${transferTxn.id}`)
      .send({ reason: "test reversal" });
    assert.equal(deleteResponse.status, 200);
  });

  assert.equal(deleteDeltas["1000"], 500, "reversing once must restore cash fully, not double-reverse");
  assert.equal(deleteDeltas["1010"], -500);
  assert.ok(balanced);
});

test("profit and loss computes net profit from a sale and an expense within the requested period", async () => {
  const product = await createProduct(tenant.agent, { name: "PnL Widget", purchasePrice: 40, retailPrice: 100 });
  await addStock(tenant.agent, product.id, 20);

  const saleResponse = await tenant.agent.post("/api/sales-invoices").send({
    customerType: "WALK_IN",
    saleType: "RETAIL",
    invoiceDate: "2019-06-15",
    items: [{ productId: product.id, quantityPieces: 5, actualSalePrice: 100 }],
    discount: 0,
    paidAmount: 500,
    paymentMethod: "CASH",
  });
  assert.equal(saleResponse.status, 201);

  const expenseResponse = await tenant.agent.post("/api/expenses").send({
    date: "2019-06-20",
    category: "Office",
    amount: 50,
    note: "PnL test expense",
  });
  assert.equal(expenseResponse.status, 201);

  const inRange = await tenant.agent.get("/api/journal/profit-and-loss").query({ dateFrom: "2019-06-01", dateTo: "2019-06-30" });
  assert.equal(inRange.status, 200);
  assert.equal(inRange.body.revenue.salesRevenue, 500);
  assert.equal(inRange.body.revenue.netRevenue, 500);
  assert.equal(inRange.body.costOfGoodsSold.netCostOfGoodsSold, 200);
  assert.equal(inRange.body.grossProfit, 300);
  assert.equal(inRange.body.expenses.totalOperatingExpenses, 50);
  assert.equal(inRange.body.netProfit, 250);

  // The whole point of a period-bound P&L: activity outside the window must not appear,
  // even though the journal itself keeps it forever for the General Ledger / Trial Balance.
  const beforeRange = await tenant.agent.get("/api/journal/profit-and-loss").query({ dateFrom: "2019-07-01", dateTo: "2019-07-31" });
  assert.equal(beforeRange.status, 200);
  assert.equal(beforeRange.body.revenue.salesRevenue, 0, "a later period must not see June's sale");
  assert.equal(beforeRange.body.netProfit, 0);
});

test("the balance sheet satisfies Assets = Liabilities + Equity after a mix of prior activity", async () => {
  const response = await tenant.agent.get("/api/journal/balance-sheet");
  assert.equal(response.status, 200);
  assert.ok(response.body.balanced, "assets must equal liabilities + equity once retained earnings is included");
  assert.ok(
    Math.abs(response.body.totalAssets - (response.body.totalLiabilities + response.body.totalEquity)) < 0.01,
  );
});

test("a due-adjustment sales return debits sales returns and accounts receivable, and restores cost to inventory", async () => {
  const product = await createProduct(tenant.agent, { name: "SR Journal Widget A", purchasePrice: 50, retailPrice: 90 });
  await addStock(tenant.agent, product.id, 20);
  const customer = await createRetailCustomer(tenant.agent, { name: "SR Journal Customer A" });

  const saleResponse = await tenant.agent.post("/api/sales-invoices").send({
    customerId: customer.id,
    customerType: "REGISTERED",
    saleType: "RETAIL",
    invoiceDate: "2026-02-01",
    items: [{ productId: product.id, quantityPieces: 10, actualSalePrice: 90 }],
    discount: 0,
    paidAmount: 0,
    paymentMethod: "CASH",
  });
  assert.equal(saleResponse.status, 201);
  const invoice = saleResponse.body.invoice;

  const { deltas, balanced } = await deltasAfter(["4010", "1100", "1200", "5000", "1000"], async () => {
    const returnResponse = await tenant.agent.post("/api/sales-returns").send({
      salesInvoiceId: invoice.id,
      returnDate: "2026-02-02",
      refundMethod: "DUE_ADJUSTMENT",
      items: [{ salesInvoiceItemId: invoice.items[0].id, productId: product.id, quantityPieces: 5 }],
    });
    assert.equal(returnResponse.status, 201);
  });

  assert.equal(deltas["4010"], 450, "sales returns (contra-revenue) books the full return value");
  assert.equal(deltas["1100"], -450, "accounts receivable drops by the same amount — no cash involved");
  assert.equal(deltas["1200"], 250, "inventory gets the 5 pieces back at the 50 cost");
  assert.equal(deltas["5000"], -250, "COGS is reversed by the same cost");
  assert.equal(deltas["1000"], 0, "no cash moves for a pure due-adjustment refund");
  assert.ok(balanced);
});

test("a cash-refund sales return on a fully-paid sale credits cash instead of accounts receivable", async () => {
  const product = await createProduct(tenant.agent, { name: "SR Journal Widget B", purchasePrice: 50, retailPrice: 90 });
  await addStock(tenant.agent, product.id, 20);
  const customer = await createRetailCustomer(tenant.agent, { name: "SR Journal Customer B" });

  const saleResponse = await tenant.agent.post("/api/sales-invoices").send({
    customerId: customer.id,
    customerType: "REGISTERED",
    saleType: "RETAIL",
    invoiceDate: "2026-02-01",
    items: [{ productId: product.id, quantityPieces: 10, actualSalePrice: 90 }],
    discount: 0,
    paidAmount: 900,
    paymentMethod: "CASH",
  });
  assert.equal(saleResponse.status, 201);
  const invoice = saleResponse.body.invoice;

  const { deltas, balanced } = await deltasAfter(["4010", "1100", "1000", "1200", "5000"], async () => {
    const returnResponse = await tenant.agent.post("/api/sales-returns").send({
      salesInvoiceId: invoice.id,
      returnDate: "2026-02-02",
      refundMethod: "CASH",
      items: [{ salesInvoiceItemId: invoice.items[0].id, productId: product.id, quantityPieces: 3 }],
    });
    assert.equal(returnResponse.status, 201);
  });

  assert.equal(deltas["4010"], 270, "sales returns books the return value");
  assert.equal(deltas["1000"], -270, "cash is refunded out");
  assert.equal(deltas["1100"], 0, "receivable is untouched for a cash refund");
  assert.equal(deltas["1200"], 150, "inventory restored at cost");
  assert.equal(deltas["5000"], -150, "COGS reversed");
  assert.ok(balanced);
});

test("a purchase return debits payable and credits inventory, and deleting it reverses both", async () => {
  const supplier = await createSupplier(tenant.agent, { name: "PR Journal Supplier" });
  const product = await createProduct(tenant.agent, { name: "PR Journal Widget", purchasePrice: 100 });

  const receiveResponse = await tenant.agent.post("/api/purchase-receive").send({
    supplierId: supplier.id,
    purchaseDate: "2026-02-05",
    items: [{ productId: product.id, quantityPieces: 10, purchasePrice: 100 }],
    discount: 0,
    paidAmount: 0,
    paymentMethod: "CASH",
  });
  assert.equal(receiveResponse.status, 201);

  let returnId;
  const { deltas, balanced } = await deltasAfter(["2000", "1200"], async () => {
    const returnResponse = await tenant.agent.post("/api/purchase-returns").send({
      supplierId: supplier.id,
      returnDate: "2026-02-06",
      items: [{ productId: product.id, quantityPieces: 4, unitPrice: 100 }],
    });
    assert.equal(returnResponse.status, 201);
    returnId = returnResponse.body.purchaseReturn.id;
  });

  assert.equal(deltas["2000"], -400, "accounts payable drops by the returned value");
  assert.equal(deltas["1200"], -400, "inventory drops by the same value");
  assert.ok(balanced);

  const { deltas: deleteDeltas, balanced: deleteBalanced } = await deltasAfter(["2000", "1200"], async () => {
    const deleteResponse = await tenant.agent.delete(`/api/purchase-returns/${returnId}`).send({ reason: "test reversal" });
    assert.equal(deleteResponse.status, 200);
  });

  assert.equal(deleteDeltas["2000"], 400, "deleting the return restores the payable");
  assert.equal(deleteDeltas["1200"], 400, "deleting the return restores inventory");
  assert.ok(deleteBalanced);
});

test("a morning issue transfers cost from inventory to goods-with-dsr, and settlement recognizes revenue and COGS for what sold", async () => {
  const product = await createProduct(tenant.agent, { name: "DSR Journal Widget", purchasePrice: 50, wholesalePrice: 70 });
  await addStock(tenant.agent, product.id, 100);
  const dsr = await createDsr(tenant.agent, { name: "Journal DSR" });

  const { deltas: issueDeltas, balanced: issueBalanced } = await deltasAfter(["1130", "1200"], async () => {
    const issueResponse = await tenant.agent.post("/api/issues").send({
      date: "2026-02-10",
      dsrId: dsr.id,
      items: [{ productId: product.id, issuedPieces: 50 }],
    });
    assert.equal(issueResponse.status, 201);
  });

  assert.equal(issueDeltas["1130"], 2500, "goods-with-dsr picks up 50 pieces at the 50 cost");
  assert.equal(issueDeltas["1200"], -2500, "inventory gives up the same cost");
  assert.ok(issueBalanced);

  // Sold = 50 - 5 (returned) - 5 (damaged) = 40 pieces @ 70 wholesale = 2800 payable.
  const { deltas: settleDeltas, balanced: settleBalanced } = await deltasAfter(
    ["4000", "5000", "1200", "1130", "1000", "1110"],
    async () => {
      const settleResponse = await tenant.agent.post("/api/settlements").send({
        date: "2026-02-10",
        dsrId: dsr.id,
        items: [{ productId: product.id, returnedPieces: 5, damagedPieces: 5 }],
        discount: 0,
        extraReturnValue: 0,
        amountPaid: 2800,
      });
      assert.equal(settleResponse.status, 201);
    },
  );

  assert.equal(settleDeltas["4000"], 2800, "sales revenue books the full payable");
  assert.equal(settleDeltas["5000"], 2000, "COGS books 40 sold pieces at the 50 cost");
  assert.equal(settleDeltas["1200"], 500, "inventory gets the 10 returned+damaged pieces back at cost");
  assert.equal(settleDeltas["1130"], -2500, "goods-with-dsr is fully cleared out (sold + returned + damaged cost)");
  assert.equal(settleDeltas["1000"], 2800, "cash collected in full");
  assert.equal(settleDeltas["1110"], 0, "DSR receivable nets to zero — fully paid same day");
  assert.ok(settleBalanced);
});

test("an extra return (goods from outside today's issue) reduces the DSR receivable at the wholesale rate he was charged, reverses COGS/inventory at real cost, and books the markup difference through SALES_RETURNS", async () => {
  const product = await createProduct(tenant.agent, { name: "Extra Return Issued Widget", purchasePrice: 50, wholesalePrice: 70 });
  await addStock(tenant.agent, product.id, 100);
  const extraProduct = await createProduct(tenant.agent, { name: "Extra Return Prior-Day Widget", purchasePrice: 30, wholesalePrice: 45 });
  const dsr = await createDsr(tenant.agent, { name: "Extra Return DSR" });

  const issueResponse = await tenant.agent.post("/api/issues").send({
    date: "2026-02-12",
    dsrId: dsr.id,
    items: [{ productId: product.id, issuedPieces: 50 }],
  });
  assert.equal(issueResponse.status, 201);

  // All 50 issued pieces sold today (payable = 50 * 70 = 3500). The extra return is
  // 6 pieces (4 good + 2 damaged) of a product that was never part of today's issue —
  // a correction for a prior day's presumed-sold assumption, where that day's
  // settlement already booked revenue/COGS for it at the 45 wholesale rate. The DSR
  // is credited back at that same 45 rate (270 total) — the rate he was actually
  // charged — while inventory can only be restocked at its real 30 cost (180 total);
  // the 90 markup difference is reversed through SALES_RETURNS/COGS, same as a normal
  // sales return. Goods-with-DSR is untouched — those goods left that account on the
  // earlier day, not today.
  const { deltas, balanced } = await deltasAfter(
    ["4000", "4010", "5000", "1200", "1130", "1110", "1000"],
    async () => {
      const settleResponse = await tenant.agent.post("/api/settlements").send({
        date: "2026-02-12",
        dsrId: dsr.id,
        items: [{ productId: product.id, returnedPieces: 0, damagedPieces: 0 }],
        extraReturns: [{ productId: extraProduct.id, returnedPieces: 4, damagedPieces: 2 }],
        discount: 0,
        amountPaid: 0,
      });
      assert.equal(settleResponse.status, 201);
    },
  );

  assert.equal(deltas["4000"], 3500, "sales revenue still books the full payable for today's issued goods");
  assert.equal(deltas["4010"], 270, "SALES_RETURNS books the extra return at its wholesale value (6 pcs * 45)");
  assert.equal(deltas["5000"], 2320, "COGS = 50 sold pieces at 50 cost, minus the extra return's 180 cost reversed back out");
  assert.equal(deltas["1200"], 180, "inventory is restocked at the extra return's real cost (6 pcs * 30), never at wholesale");
  assert.equal(deltas["1130"], -2500, "goods-with-dsr clears only the issued+sold cost — the extra return was never in this account");
  assert.equal(deltas["1110"], 3230, "DSR receivable = payable(3500) - extraReturnValue(270), the rate he was actually charged");
  assert.equal(deltas["1000"], 0, "no cash collected");
  assert.ok(balanced, "the journal entry still balances with the wholesale-basis receivable and cost-basis inventory/COGS reversal");
});

test("a settlement discount attributed to a supplier debits accounts payable instead of discounts given", async () => {
  const product = await createProduct(tenant.agent, { name: "DSR Discount Widget", purchasePrice: 50, wholesalePrice: 70 });
  await addStock(tenant.agent, product.id, 100);
  const dsr = await createDsr(tenant.agent, { name: "Discount DSR" });
  const supplier = await createSupplier(tenant.agent, { name: "Discount Journal Supplier" });

  const issueResponse = await tenant.agent.post("/api/issues").send({
    date: "2026-02-11",
    dsrId: dsr.id,
    items: [{ productId: product.id, issuedPieces: 20 }],
  });
  assert.equal(issueResponse.status, 201);

  // Sold = 20 pieces @ 70 = 1400 payable, minus a 100 discount funded by the supplier.
  const { deltas, balanced } = await deltasAfter(["2000", "4020", "1110", "4000"], async () => {
    const settleResponse = await tenant.agent.post("/api/settlements").send({
      date: "2026-02-11",
      dsrId: dsr.id,
      items: [{ productId: product.id, returnedPieces: 0, damagedPieces: 0 }],
      discount: 100,
      discountSupplierId: supplier.id,
      extraReturnValue: 0,
      amountPaid: 0,
    });
    assert.equal(settleResponse.status, 201);
  });

  assert.equal(deltas["4000"], 1400, "gross revenue still books the full payable");
  assert.equal(deltas["2000"], -100, "the supplier's payable absorbs the discount");
  assert.equal(deltas["4020"], 0, "discounts given is untouched — the supplier funded it, not the tenant");
  assert.equal(deltas["1110"], 1300, "DSR receivable only grows by payable minus the discount");
  assert.ok(balanced);
});

test("editing a settlement replaces its journal entry instead of stacking a second one", async () => {
  const product = await createProduct(tenant.agent, { name: "DSR Replace Widget", purchasePrice: 50, wholesalePrice: 70 });
  await addStock(tenant.agent, product.id, 100);
  const dsr = await createDsr(tenant.agent, { name: "Replace DSR" });

  const issueResponse = await tenant.agent.post("/api/issues").send({
    date: new Date().toISOString().slice(0, 10),
    dsrId: dsr.id,
    items: [{ productId: product.id, issuedPieces: 30 }],
  });
  assert.equal(issueResponse.status, 201);

  let settlementId;
  // First cut: sold 30 @ 70 = 2100 revenue, nothing collected, all of it sits as DSR receivable.
  const { deltas: createDeltas } = await deltasAfter(["4000", "1110", "1000"], async () => {
    const createResponse = await tenant.agent.post("/api/settlements").send({
      date: issueResponse.body.issue.date,
      dsrId: dsr.id,
      items: [{ productId: product.id, returnedPieces: 0, damagedPieces: 0 }],
      discount: 0,
      extraReturnValue: 0,
      amountPaid: 0,
    });
    assert.equal(createResponse.status, 201);
    settlementId = createResponse.body.settlement.id;
  });
  assert.equal(createDeltas["4000"], 2100);
  assert.equal(createDeltas["1110"], 2100);
  assert.equal(createDeltas["1000"], 0);

  // Edit to record the full collection — the journal must land on the *new* totals
  // (revenue unchanged, receivable fully cleared, cash now collected), not stack a
  // second entry on top of the first.
  const { deltas: updateDeltas, balanced } = await deltasAfter(["4000", "1110", "1000"], async () => {
    const updateResponse = await tenant.agent.put(`/api/settlements/${settlementId}`).send({
      date: issueResponse.body.issue.date,
      dsrId: dsr.id,
      items: [{ productId: product.id, returnedPieces: 0, damagedPieces: 0 }],
      discount: 0,
      extraReturnValue: 0,
      amountPaid: 2100,
    });
    assert.equal(updateResponse.status, 200);
  });

  assert.equal(updateDeltas["4000"], 0, "revenue must not double up after the edit — same 30 pieces, same payable");
  assert.equal(updateDeltas["1110"], -2100, "DSR receivable drops back to zero once the edit records full payment");
  assert.equal(updateDeltas["1000"], 2100, "cash now reflects the newly-recorded collection");
  assert.ok(balanced);
});

test("an SR handover moves the receivable from the DSR to the SR", async () => {
  const product = await createProduct(tenant.agent, { name: "SR Handover Widget", purchasePrice: 50, wholesalePrice: 70 });
  await addStock(tenant.agent, product.id, 100);
  const dsr = await createDsr(tenant.agent, { name: "Handover DSR" });
  const sr = await createSr(tenant.agent, { name: "Handover SR" });

  const issueResponse = await tenant.agent.post("/api/issues").send({
    date: "2026-02-15",
    dsrId: dsr.id,
    items: [{ productId: product.id, issuedPieces: 10 }],
  });
  assert.equal(issueResponse.status, 201);

  // Sold 10 @ 70 = 700 payable; 300 handed over to the SR instead of collected in cash.
  const { deltas, balanced } = await deltasAfter(["1110", "1120", "1000"], async () => {
    const settleResponse = await tenant.agent.post("/api/settlements").send({
      date: "2026-02-15",
      dsrId: dsr.id,
      items: [{ productId: product.id, returnedPieces: 0, damagedPieces: 0 }],
      discount: 0,
      extraReturnValue: 0,
      amountPaid: 0,
      srHandovers: [{ srId: sr.id, amount: 300 }],
    });
    assert.equal(settleResponse.status, 201);
  });

  assert.equal(deltas["1110"], 400, "DSR receivable only grows by payable minus what was handed to the SR");
  assert.equal(deltas["1120"], 300, "SR receivable picks up the handed-over amount");
  assert.equal(deltas["1000"], 0, "no cash changed hands");
  assert.ok(balanced);
});
