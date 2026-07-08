import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createRetailCustomer } from "./helpers/seeders.js";

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
