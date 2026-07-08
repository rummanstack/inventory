import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createDsr } from "./helpers/seeders.js";

let databaseManager;
let tenant;
let otherTenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Shops Tenant" });
  otherTenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Shops Other Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await cleanupTenant(databaseManager, otherTenant.tenantId);
  await closeTestApp();
});

async function createShop(agent, overrides = {}) {
  const response = await agent.post("/api/customers").send({
    shopName: `Test Shop ${Date.now()}-${Math.random()}`,
    ownerName: "Shop Owner",
    phone: "0155000000",
    address: "Shop address",
    ...overrides,
  });
  if (response.status !== 201) {
    throw new Error(`createShop failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return response.body.customer;
}

test("creating a shop without a shop name is rejected", async () => {
  const response = await tenant.agent.post("/api/customers").send({ ownerName: "No Shop Name" });
  assert.equal(response.status, 400);
});

test("a shop can be created, fetched, updated, listed, and assigned to a DSR", async () => {
  const dsr = await createDsr(tenant.agent, { name: `Shop DSR ${Date.now()}` });
  const shop = await createShop(tenant.agent, { assignedDsrId: dsr.id });

  const getResponse = await tenant.agent.get(`/api/customers/${shop.id}`);
  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.body.customer.assignedDsrId, dsr.id);

  // PUT replaces the whole record — assignedDsrId must be resent or the update wipes it to null.
  const updateResponse = await tenant.agent.put(`/api/customers/${shop.id}`).send({
    shopName: shop.shopName,
    assignedDsrId: dsr.id,
    market: "New Market",
    status: "INACTIVE",
  });
  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.customer.market, "New Market");
  assert.equal(updateResponse.body.customer.status, "INACTIVE");
  assert.equal(updateResponse.body.customer.assignedDsrId, dsr.id);

  const listResponse = await tenant.agent.get("/api/customers").query({ assignedDsrId: dsr.id });
  assert.ok(listResponse.body.items.some((item) => item.id === shop.id));
});

test("updating a shop without resending assignedDsrId clears the DSR assignment (PUT is a full replace, not a patch)", async () => {
  const dsr = await createDsr(tenant.agent, { name: `Wipe DSR ${Date.now()}` });
  const shop = await createShop(tenant.agent, { assignedDsrId: dsr.id });

  const updateResponse = await tenant.agent.put(`/api/customers/${shop.id}`).send({ shopName: shop.shopName });
  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.customer.assignedDsrId, null);
});

test("an opening due becomes the shop's current due by default", async () => {
  const shop = await createShop(tenant.agent, { openingDue: 250 });
  assert.equal(shop.openingDue, 250);
  assert.equal(shop.currentDue, 250);
});

test("deleting a shop moves it to trash, hides it from the active list, and it can be restored", async () => {
  const shop = await createShop(tenant.agent);

  const deleteResponse = await tenant.agent.delete(`/api/customers/${shop.id}`).send({ reason: "closed down" });
  assert.equal(deleteResponse.status, 200);

  const activeList = await tenant.agent.get("/api/customers");
  assert.ok(!activeList.body.items.some((item) => item.id === shop.id));

  const trashList = await tenant.agent.get("/api/customers/trash");
  assert.ok(trashList.body.items.some((item) => item.id === shop.id));

  const restoreResponse = await tenant.agent.post(`/api/customers/${shop.id}/restore`);
  assert.equal(restoreResponse.status, 200);

  const activeAfterRestore = await tenant.agent.get("/api/customers");
  assert.ok(activeAfterRestore.body.items.some((item) => item.id === shop.id));
});

test("permanently deleting a trashed shop removes it for good", async () => {
  const shop = await createShop(tenant.agent);
  await tenant.agent.delete(`/api/customers/${shop.id}`).send({ reason: "cleanup" });

  const permanentResponse = await tenant.agent.delete(`/api/customers/${shop.id}/permanent`);
  assert.equal(permanentResponse.status, 200);

  const trashList = await tenant.agent.get("/api/customers/trash");
  assert.ok(!trashList.body.items.some((item) => item.id === shop.id));
});

test("tenant isolation: another tenant cannot read, update, delete, or see a shop that isn't theirs", async () => {
  const shop = await createShop(tenant.agent);

  const getResponse = await otherTenant.agent.get(`/api/customers/${shop.id}`);
  assert.equal(getResponse.status, 404);

  const updateResponse = await otherTenant.agent.put(`/api/customers/${shop.id}`).send({ shopName: "Hijacked" });
  assert.equal(updateResponse.status, 404);

  const deleteResponse = await otherTenant.agent.delete(`/api/customers/${shop.id}`);
  assert.equal(deleteResponse.status, 404);

  const listResponse = await otherTenant.agent.get("/api/customers");
  assert.ok(!listResponse.body.items.some((item) => item.id === shop.id));
});
