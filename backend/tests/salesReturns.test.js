import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, addStock, createRetailCustomer, getCustomerDueBalance } from "./helpers/seeders.js";

let databaseManager;
let tenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Sales Return Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await closeTestApp();
});

async function createInvoiceWithDue(productId, customerId, quantityPieces, price, paidAmount) {
  const response = await tenant.agent.post("/api/sales-invoices").send({
    customerId,
    customerType: "REGISTERED",
    saleType: "RETAIL",
    invoiceDate: "2026-01-20",
    items: [{ productId, quantityPieces, actualSalePrice: price }],
    discount: 0,
    paidAmount,
    paymentMethod: "CASH",
  });
  assert.equal(response.status, 201);
  return response.body.invoice;
}

async function getCashBalance() {
  const response = await tenant.agent.get("/api/finance/accounts");
  assert.equal(response.status, 200);
  const cash = (response.body.accounts || []).find((account) => account.type === "CASH");
  assert.ok(cash, "Cash account should exist");
  return cash.balance;
}

test("a return requires the original invoice and rejects an item not on that invoice", async () => {
  const product = await createProduct(tenant.agent, { name: "Return Widget A", retailPrice: 90 });
  await addStock(tenant.agent, product.id, 50);
  const customer = await createRetailCustomer(tenant.agent, { name: "Return Customer A" });
  const invoice = await createInvoiceWithDue(product.id, customer.id, 20, 90, 900);

  const noInvoiceResponse = await tenant.agent.post("/api/sales-returns").send({
    returnDate: "2026-01-21",
    items: [{ salesInvoiceItemId: invoice.items[0].id, productId: product.id, quantityPieces: 1 }],
  });
  assert.equal(noInvoiceResponse.status, 400);
  assert.match(noInvoiceResponse.body.message, /original invoice is required/);

  const wrongItemResponse = await tenant.agent.post("/api/sales-returns").send({
    salesInvoiceId: invoice.id,
    returnDate: "2026-01-21",
    items: [{ salesInvoiceItemId: "sales-item-does-not-exist", productId: product.id, quantityPieces: 1 }],
  });
  assert.equal(wrongItemResponse.status, 400);
  assert.match(wrongItemResponse.body.message, /does not match the original invoice/);
});

test("returning within the remaining quantity restores stock and credits the customer due ledger", async () => {
  const product = await createProduct(tenant.agent, { name: "Return Widget B", retailPrice: 90 });
  await addStock(tenant.agent, product.id, 50);
  const customer = await createRetailCustomer(tenant.agent, { name: "Return Customer B" });
  const invoice = await createInvoiceWithDue(product.id, customer.id, 20, 90, 900);

  const dueBefore = await getCustomerDueBalance(tenant.agent, customer.id);
  assert.equal(dueBefore, 900);

  const response = await tenant.agent.post("/api/sales-returns").send({
    salesInvoiceId: invoice.id,
    returnDate: "2026-01-21",
    refundMethod: "DUE_ADJUSTMENT",
    items: [{ salesInvoiceItemId: invoice.items[0].id, productId: product.id, quantityPieces: 5 }],
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.salesReturn.totalAmount, 450);

  const productResponse = await tenant.agent.get("/api/products").query({ search: "Return Widget B" });
  const updatedProduct = productResponse.body.items.find((item) => item.id === product.id);
  assert.equal(updatedProduct.stockPieces, 50 - 20 + 5, "5 pieces came back into stock");

  const movements = await tenant.agent.get("/api/stock-movements").query({ productId: product.id });
  const movement = movements.body.items.find((item) => item.type === "SALES_RETURN");
  assert.ok(movement);
  assert.equal(movement.quantityIn, 5);

  const dueAfter = await getCustomerDueBalance(tenant.agent, customer.id);
  assert.equal(dueAfter, 450, "due reduced by the returned line total");
});

test("cash refunds withdraw money from cash in hand for fully paid invoices", async () => {
  const product = await createProduct(tenant.agent, { name: "Return Widget D", retailPrice: 90 });
  await addStock(tenant.agent, product.id, 50);
  const invoice = await createInvoiceWithDue(product.id, null, 10, 90, 900);

  const cashBefore = await getCashBalance();
  assert.equal(cashBefore, 900);

  const response = await tenant.agent.post("/api/sales-returns").send({
    salesInvoiceId: invoice.id,
    returnDate: "2026-01-23",
    refundMethod: "CASH",
    items: [{ salesInvoiceItemId: invoice.items[0].id, productId: product.id, quantityPieces: 5 }],
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.salesReturn.refundMethod, "CASH");
  assert.equal(response.body.salesReturn.totalAmount, 450);

  const cashAfter = await getCashBalance();
  assert.equal(cashAfter, 450, "cash balance should reduce by the refunded amount");
});

test("non-refundable products cannot be returned", async () => {
  const product = await createProduct(tenant.agent, { name: "Final Sale Widget", retailPrice: 90, refundable: false });
  await addStock(tenant.agent, product.id, 50);
  const invoice = await createInvoiceWithDue(product.id, null, 10, 90, 900);

  const response = await tenant.agent.post("/api/sales-returns").send({
    salesInvoiceId: invoice.id,
    returnDate: "2026-01-24",
    refundMethod: "CASH",
    items: [{ salesInvoiceItemId: invoice.items[0].id, productId: product.id, quantityPieces: 1 }],
  });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /non-refundable/i);
});

test("cumulative returns cannot exceed the originally sold quantity, but the exact remaining amount succeeds", async () => {
  const product = await createProduct(tenant.agent, { name: "Return Widget C", retailPrice: 90 });
  await addStock(tenant.agent, product.id, 50);
  const customer = await createRetailCustomer(tenant.agent, { name: "Return Customer C" });
  const invoice = await createInvoiceWithDue(product.id, customer.id, 20, 90, 900);

  const firstReturn = await tenant.agent.post("/api/sales-returns").send({
    salesInvoiceId: invoice.id,
    returnDate: "2026-01-22",
    items: [{ salesInvoiceItemId: invoice.items[0].id, productId: product.id, quantityPieces: 5 }],
  });
  assert.equal(firstReturn.status, 201);

  const overReturn = await tenant.agent.post("/api/sales-returns").send({
    salesInvoiceId: invoice.id,
    returnDate: "2026-01-22",
    items: [{ salesInvoiceItemId: invoice.items[0].id, productId: product.id, quantityPieces: 16 }],
  });
  assert.equal(overReturn.status, 400);
  assert.match(overReturn.body.message, /only 15 remaining/);

  const exactRemainder = await tenant.agent.post("/api/sales-returns").send({
    salesInvoiceId: invoice.id,
    returnDate: "2026-01-22",
    items: [{ salesInvoiceItemId: invoice.items[0].id, productId: product.id, quantityPieces: 15 }],
  });
  assert.equal(exactRemainder.status, 201, "returning exactly the remaining quantity must succeed");

  const nothingLeft = await tenant.agent.post("/api/sales-returns").send({
    salesInvoiceId: invoice.id,
    returnDate: "2026-01-22",
    items: [{ salesInvoiceItemId: invoice.items[0].id, productId: product.id, quantityPieces: 1 }],
  });
  assert.equal(nothingLeft.status, 400, "nothing is left to return once the full sold quantity is returned");
});
