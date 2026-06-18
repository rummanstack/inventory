import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, addStock, createRetailCustomer, getCustomerDueBalance, getCashAccount } from "./helpers/seeders.js";

let databaseManager;
let tenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Customer Payments Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await closeTestApp();
});

async function createCustomerWithDue(amount) {
  const product = await createProduct(tenant.agent, { name: `Due Widget ${Date.now()}-${Math.random()}`, retailPrice: 90 });
  await addStock(tenant.agent, product.id, 50);
  const customer = await createRetailCustomer(tenant.agent, { name: `Due Customer ${Date.now()}-${Math.random()}` });

  const response = await tenant.agent.post("/api/sales-invoices").send({
    customerId: customer.id,
    customerType: "REGISTERED",
    saleType: "RETAIL",
    invoiceDate: "2026-02-01",
    items: [{ productId: product.id, quantityPieces: 10, actualSalePrice: 90 }],
    discount: 0,
    paidAmount: 900 - amount,
    paymentMethod: "CASH",
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.invoice.dueAmount, amount);
  return customer;
}

test("a payment within the due balance succeeds, reduces due, and deposits cash", async () => {
  const customer = await createCustomerWithDue(500);
  const cashBefore = await getCashAccount(tenant.agent);

  const response = await tenant.agent.post("/api/customer-payments").send({
    customerId: customer.id,
    paymentDate: "2026-02-02",
    amount: 300,
    paymentMethod: "CASH",
  });

  assert.equal(response.status, 201);

  const balance = await getCustomerDueBalance(tenant.agent, customer.id);
  assert.equal(balance, 200);

  const cashAfter = await getCashAccount(tenant.agent);
  assert.equal(cashAfter.balance, cashBefore.balance + 300);
});

test("a payment that exceeds the current due balance is rejected and leaves no partial writes", async () => {
  const customer = await createCustomerWithDue(500);
  const cashBefore = await getCashAccount(tenant.agent);

  const response = await tenant.agent.post("/api/customer-payments").send({
    customerId: customer.id,
    paymentDate: "2026-02-02",
    amount: 600,
    paymentMethod: "CASH",
  });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /exceeds current due balance/);

  const balance = await getCustomerDueBalance(tenant.agent, customer.id);
  assert.equal(balance, 500, "due balance must be unchanged after the rejected payment");

  const cashAfter = await getCashAccount(tenant.agent);
  assert.equal(cashAfter.balance, cashBefore.balance, "cash balance must be unchanged after the rejected payment");
});

test("a payment for exactly the due balance is accepted (boundary case)", async () => {
  const customer = await createCustomerWithDue(250);

  const response = await tenant.agent.post("/api/customer-payments").send({
    customerId: customer.id,
    paymentDate: "2026-02-02",
    amount: 250,
    paymentMethod: "CASH",
  });

  assert.equal(response.status, 201);
  const balance = await getCustomerDueBalance(tenant.agent, customer.id);
  assert.equal(balance, 0);
});
