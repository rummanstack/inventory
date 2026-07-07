import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, addStock, createSupplier, createRetailCustomer, depositCash } from "./helpers/seeders.js";

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
