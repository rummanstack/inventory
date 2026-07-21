import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createSupplier } from "./helpers/seeders.js";

let databaseManager;
let tenant;
let otherTenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Suppliers Tenant" });
  otherTenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Suppliers Other Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await cleanupTenant(databaseManager, otherTenant.tenantId);
  await closeTestApp();
});

test("creating a supplier without a name is rejected", async () => {
  const response = await tenant.agent.post("/api/suppliers").send({ phone: "0100000000" });
  assert.equal(response.status, 400);
});

test("a supplier can be created, fetched, updated, and listed", async () => {
  const supplier = await createSupplier(tenant.agent, { name: `Acme Supplier ${Date.now()}` });

  const getResponse = await tenant.agent.get(`/api/suppliers/${supplier.id}`);
  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.body.supplier.name, supplier.name);
  assert.equal(getResponse.body.supplier.status, "ACTIVE");

  const updateResponse = await tenant.agent.put(`/api/suppliers/${supplier.id}`).send({
    name: supplier.name,
    phone: "0199999999",
    status: "INACTIVE",
  });
  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.supplier.phone, "0199999999");
  assert.equal(updateResponse.body.supplier.status, "INACTIVE");

  const listResponse = await tenant.agent.get("/api/suppliers").query({ search: supplier.name });
  assert.equal(listResponse.status, 200);
  assert.ok(listResponse.body.items.some((item) => item.id === supplier.id));
});

test("an opening due becomes the supplier's current due by default", async () => {
  const supplier = await createSupplier(tenant.agent, { name: `Due Supplier ${Date.now()}`, openingDue: 500 });
  assert.equal(supplier.openingDue, 500);
  assert.equal(supplier.currentDue, 500);
});

test("a supplier with a non-zero balance cannot be deleted", async () => {
  const supplier = await createSupplier(tenant.agent, { name: "Unsettled Supplier " + Date.now(), openingDue: 500 });
  const response = await tenant.agent.delete("/api/suppliers/" + supplier.id).send({ reason: "cleanup" });
  assert.equal(response.status, 409);
  assert.match(response.body.message, /balance.*0.00/i);
});

test("deleting a supplier moves it to trash, removes it from the active list, and it can be restored", async () => {
  const supplier = await createSupplier(tenant.agent, { name: `Trash Supplier ${Date.now()}` });

  const deleteResponse = await tenant.agent.delete(`/api/suppliers/${supplier.id}`).send({ reason: "duplicate entry" });
  assert.equal(deleteResponse.status, 200);

  const activeList = await tenant.agent.get("/api/suppliers");
  assert.ok(!activeList.body.items.some((item) => item.id === supplier.id));

  const trashList = await tenant.agent.get("/api/suppliers/trash");
  assert.ok(trashList.body.items.some((item) => item.id === supplier.id));

  const restoreResponse = await tenant.agent.post(`/api/suppliers/${supplier.id}/restore`);
  assert.equal(restoreResponse.status, 200);

  const activeAfterRestore = await tenant.agent.get("/api/suppliers");
  assert.ok(activeAfterRestore.body.items.some((item) => item.id === supplier.id));
});

test("permanently deleting a trashed supplier removes it for good", async () => {
  const supplier = await createSupplier(tenant.agent, { name: `Permanent Delete Supplier ${Date.now()}` });
  await tenant.agent.delete(`/api/suppliers/${supplier.id}`).send({ reason: "cleanup" });

  const permanentResponse = await tenant.agent.delete(`/api/suppliers/${supplier.id}/permanent`);
  assert.equal(permanentResponse.status, 200);

  const trashList = await tenant.agent.get("/api/suppliers/trash");
  assert.ok(!trashList.body.items.some((item) => item.id === supplier.id));

  const getResponse = await tenant.agent.get(`/api/suppliers/${supplier.id}`);
  assert.equal(getResponse.status, 404);
});

test("tenant isolation: another tenant cannot read, update, delete, or restore a supplier that isn't theirs", async () => {
  const supplier = await createSupplier(tenant.agent, { name: `Isolated Supplier ${Date.now()}` });

  const getResponse = await otherTenant.agent.get(`/api/suppliers/${supplier.id}`);
  assert.equal(getResponse.status, 404);

  const updateResponse = await otherTenant.agent.put(`/api/suppliers/${supplier.id}`).send({ name: "Hijacked" });
  assert.equal(updateResponse.status, 404);

  const deleteResponse = await otherTenant.agent.delete(`/api/suppliers/${supplier.id}`);
  assert.equal(deleteResponse.status, 404);

  const listResponse = await otherTenant.agent.get("/api/suppliers");
  assert.ok(!listResponse.body.items.some((item) => item.id === supplier.id));
});
