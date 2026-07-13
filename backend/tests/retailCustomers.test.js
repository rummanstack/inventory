import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createRetailCustomer, createProduct, addStock } from "./helpers/seeders.js";

let databaseManager;
let tenant;
let otherTenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Retail Customers Tenant" });
  otherTenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Retail Customers Other Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await cleanupTenant(databaseManager, otherTenant.tenantId);
  await closeTestApp();
});

test("creating a retail customer without a name is rejected", async () => {
  const response = await tenant.agent.post("/api/retail-customers").send({ phone: "0177000000" });
  assert.equal(response.status, 400);
});

test("a retail customer can be created, fetched, updated, and listed", async () => {
  const customer = await createRetailCustomer(tenant.agent, { name: `Retail Cust ${Date.now()}` });

  const getResponse = await tenant.agent.get(`/api/retail-customers/${customer.id}`);
  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.body.retailCustomer.name, customer.name);

  const updateResponse = await tenant.agent.put(`/api/retail-customers/${customer.id}`).send({
    name: customer.name,
    phone: "0166000000",
    status: "INACTIVE",
  });
  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.retailCustomer.phone, "0166000000");
  assert.equal(updateResponse.body.retailCustomer.status, "INACTIVE");

  const listResponse = await tenant.agent.get("/api/retail-customers").query({ search: customer.name });
  assert.ok(listResponse.body.items.some((item) => item.id === customer.id));
});

test("deleting a retail customer moves it to trash, hides it from the active list, and it can be restored", async () => {
  const customer = await createRetailCustomer(tenant.agent, { name: `Trash Cust ${Date.now()}` });

  const deleteResponse = await tenant.agent.delete(`/api/retail-customers/${customer.id}`).send({ reason: "duplicate" });
  assert.equal(deleteResponse.status, 200);

  const activeList = await tenant.agent.get("/api/retail-customers");
  assert.ok(!activeList.body.items.some((item) => item.id === customer.id));

  const trashList = await tenant.agent.get("/api/retail-customers/trash");
  assert.ok(trashList.body.items.some((item) => item.id === customer.id));

  const restoreResponse = await tenant.agent.post(`/api/retail-customers/${customer.id}/restore`);
  assert.equal(restoreResponse.status, 200);

  const activeAfterRestore = await tenant.agent.get("/api/retail-customers");
  assert.ok(activeAfterRestore.body.items.some((item) => item.id === customer.id));
});

test("permanently deleting a trashed retail customer removes it for good", async () => {
  const customer = await createRetailCustomer(tenant.agent, { name: `Permanent Delete Cust ${Date.now()}` });
  await tenant.agent.delete(`/api/retail-customers/${customer.id}`).send({ reason: "cleanup" });

  const permanentResponse = await tenant.agent.delete(`/api/retail-customers/${customer.id}/permanent`);
  assert.equal(permanentResponse.status, 200);

  const trashList = await tenant.agent.get("/api/retail-customers/trash");
  assert.ok(!trashList.body.items.some((item) => item.id === customer.id));
});

test("tenant isolation: another tenant cannot read, update, delete, or see a retail customer that isn't theirs", async () => {
  const customer = await createRetailCustomer(tenant.agent, { name: `Isolated Cust ${Date.now()}` });

  const getResponse = await otherTenant.agent.get(`/api/retail-customers/${customer.id}`);
  assert.equal(getResponse.status, 404);

  const updateResponse = await otherTenant.agent.put(`/api/retail-customers/${customer.id}`).send({ name: "Hijacked" });
  assert.equal(updateResponse.status, 404);

  const deleteResponse = await otherTenant.agent.delete(`/api/retail-customers/${customer.id}`);
  assert.equal(deleteResponse.status, 404);

  const listResponse = await otherTenant.agent.get("/api/retail-customers");
  assert.ok(!listResponse.body.items.some((item) => item.id === customer.id));
});

test("retention insights classify a customer with no purchase history as NEW and report zero repeat/inactive stats for it", async () => {
  const customer = await createRetailCustomer(tenant.agent, { name: `Retention Cust ${Date.now()}` });

  const response = await tenant.agent.get("/api/retail-customers/retention");
  assert.equal(response.status, 200);

  const found = response.body.customers.find((item) => item.id === customer.id);
  assert.ok(found, "newly created customer should appear in retention insights");
  assert.equal(found.customerTier, "NEW");
  assert.equal(found.hasPurchaseHistory, false);
  assert.equal(found.repeatPurchase, false);
  assert.ok(response.body.summary.totalCustomers >= 1);
});

async function sellToCustomer(customerId, productId, invoiceDate, price) {
  const response = await tenant.agent.post("/api/sales-invoices").send({
    customerId,
    customerType: "REGISTERED",
    saleType: "RETAIL",
    invoiceDate,
    items: [{ productId, quantityPieces: 1, actualSalePrice: price }],
    discount: 0,
    paidAmount: price,
    paymentMethod: "CASH",
  });
  if (response.status !== 201) {
    throw new Error(`sellToCustomer failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return response.body.invoice;
}

test("retention insights classify a customer with 2 purchases as REPEAT and report correct purchase summary", async () => {
  const product = await createProduct(tenant.agent, { name: `Repeat Widget ${Date.now()}`, retailPrice: 100 });
  await addStock(tenant.agent, product.id, 10);
  const customer = await createRetailCustomer(tenant.agent, { name: `Repeat Cust ${Date.now()}` });

  await sellToCustomer(customer.id, product.id, "2026-01-01", 100);
  await sellToCustomer(customer.id, product.id, "2026-01-15", 100);

  const response = await tenant.agent.get("/api/retail-customers/retention");
  assert.equal(response.status, 200);

  const found = response.body.customers.find((item) => item.id === customer.id);
  assert.ok(found, "customer with purchase history should appear in retention insights");
  assert.equal(found.customerTier, "REPEAT");
  assert.equal(found.hasPurchaseHistory, true);
  assert.equal(found.repeatPurchase, true);
  assert.equal(found.purchaseCount, 2);
  assert.equal(found.totalSpent, 200);
  assert.equal(found.firstPurchaseAt, "2026-01-01");
  assert.equal(found.lastPurchaseAt, "2026-01-15");

  assert.ok(response.body.repeatCustomers.some((item) => item.id === customer.id));
});

test("retention insights classify a customer by total spend into LOYAL and VIP tiers regardless of purchase count", async () => {
  const productLoyal = await createProduct(tenant.agent, { name: `Loyal Widget ${Date.now()}`, retailPrice: 30000 });
  await addStock(tenant.agent, productLoyal.id, 5);
  const loyalCustomer = await createRetailCustomer(tenant.agent, { name: `Loyal Cust ${Date.now()}` });
  await sellToCustomer(loyalCustomer.id, productLoyal.id, "2026-01-01", 30000);

  const productVip = await createProduct(tenant.agent, { name: `VIP Widget ${Date.now()}`, retailPrice: 150000 });
  await addStock(tenant.agent, productVip.id, 5);
  const vipCustomer = await createRetailCustomer(tenant.agent, { name: `VIP Cust ${Date.now()}` });
  await sellToCustomer(vipCustomer.id, productVip.id, "2026-01-01", 150000);

  const response = await tenant.agent.get("/api/retail-customers/retention");
  assert.equal(response.status, 200);

  const loyalFound = response.body.customers.find((item) => item.id === loyalCustomer.id);
  assert.ok(loyalFound);
  assert.equal(loyalFound.customerTier, "LOYAL", "a single purchase >= 25000 must qualify as LOYAL even with purchaseCount 1");

  const vipFound = response.body.customers.find((item) => item.id === vipCustomer.id);
  assert.ok(vipFound);
  assert.equal(vipFound.customerTier, "VIP", "a single purchase >= 100000 must qualify as VIP even with purchaseCount 1");
  assert.ok(response.body.summary.vipCustomers >= 1, "summary.vipCustomers count must include this customer");
});

test("retention insights flag a customer whose last purchase is outside the inactive window as inactive", async () => {
  const product = await createProduct(tenant.agent, { name: `Inactive Widget ${Date.now()}`, retailPrice: 50 });
  await addStock(tenant.agent, product.id, 10);
  const customer = await createRetailCustomer(tenant.agent, { name: `Inactive Cust ${Date.now()}` });

  const oldDate = new Date();
  oldDate.setUTCDate(oldDate.getUTCDate() - 45);
  await sellToCustomer(customer.id, product.id, oldDate.toISOString().slice(0, 10), 50);

  // Default inactive window is 30 days; a purchase 45 days ago must be flagged inactive.
  const response = await tenant.agent.get("/api/retail-customers/retention");
  assert.equal(response.status, 200);

  const found = response.body.customers.find((item) => item.id === customer.id);
  assert.ok(found);
  assert.ok(found.daysSinceLastPurchase >= 45);
  assert.ok(response.body.inactiveCustomers.some((item) => item.id === customer.id));

  // A tighter, explicit window of 60 days must exclude the same customer.
  const widerWindowResponse = await tenant.agent.get("/api/retail-customers/retention").query({ inactiveWindowDays: 60 });
  assert.equal(widerWindowResponse.status, 200);
  assert.equal(widerWindowResponse.body.inactiveCustomers.some((item) => item.id === customer.id), false);
});
