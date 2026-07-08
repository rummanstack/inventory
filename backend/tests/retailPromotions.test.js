import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct } from "./helpers/seeders.js";

let databaseManager;
let tenant;
let otherTenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Retail Promotions Tenant" });
  otherTenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Retail Promotions Other Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await cleanupTenant(databaseManager, otherTenant.tenantId);
  await closeTestApp();
});

test("creating a promotion without a name or with a zero discount is rejected", async () => {
  const noName = await tenant.agent.post("/api/retail-promotions").send({ discountType: "PERCENT", discountValue: 10 });
  assert.equal(noName.status, 400);

  const zeroDiscount = await tenant.agent.post("/api/retail-promotions").send({ name: "Zero Off", discountType: "PERCENT", discountValue: 0 });
  assert.equal(zeroDiscount.status, 400);
});

test("a promotion can be created targeting a specific product, then updated and listed", async () => {
  const product = await createProduct(tenant.agent, { name: `Promo Widget ${Date.now()}` });

  const createResponse = await tenant.agent.post("/api/retail-promotions").send({
    name: `10% Off ${Date.now()}`,
    targetType: "PRODUCT",
    targetId: product.id,
    saleType: "RETAIL",
    discountType: "PERCENT",
    discountValue: 10,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
  });
  assert.equal(createResponse.status, 201);
  const promotion = createResponse.body.promotion;
  assert.equal(promotion.targetId, product.id);
  assert.equal(promotion.active, true);

  const updateResponse = await tenant.agent.patch(`/api/retail-promotions/${promotion.id}`).send({
    name: promotion.name,
    targetType: "PRODUCT",
    targetId: product.id,
    discountType: "PERCENT",
    discountValue: 15,
    active: false,
  });
  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.promotion.discountValue, 15);
  assert.equal(updateResponse.body.promotion.active, false);

  const listResponse = await tenant.agent.get("/api/retail-promotions");
  assert.equal(listResponse.status, 200);
  assert.ok(listResponse.body.promotions.some((item) => item.id === promotion.id));
});

test("an ALL-target promotion defaults discountType to PERCENT and level to LINE when not given valid values", async () => {
  const createResponse = await tenant.agent.post("/api/retail-promotions").send({
    name: `Storewide ${Date.now()}`,
    targetType: "NOT_A_REAL_TARGET",
    discountType: "NOT_A_REAL_TYPE",
    discountValue: 5,
  });
  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.promotion.targetType, "PRODUCT");
  assert.equal(createResponse.body.promotion.discountType, "PERCENT");
  assert.equal(createResponse.body.promotion.level, "LINE");
});

test("deleting a promotion removes it from the list", async () => {
  const createResponse = await tenant.agent.post("/api/retail-promotions").send({
    name: `Delete Me ${Date.now()}`,
    discountType: "FIXED",
    discountValue: 20,
  });
  const promotionId = createResponse.body.promotion.id;

  const deleteResponse = await tenant.agent.delete(`/api/retail-promotions/${promotionId}`);
  assert.equal(deleteResponse.status, 200);

  const listResponse = await tenant.agent.get("/api/retail-promotions");
  assert.ok(!listResponse.body.promotions.some((item) => item.id === promotionId));
});

test("tenant isolation: another tenant cannot see, update, or delete a promotion that isn't theirs", async () => {
  const createResponse = await tenant.agent.post("/api/retail-promotions").send({
    name: `Isolated Promo ${Date.now()}`,
    discountType: "PERCENT",
    discountValue: 10,
  });
  const promotionId = createResponse.body.promotion.id;

  const otherList = await otherTenant.agent.get("/api/retail-promotions");
  assert.ok(!otherList.body.promotions.some((item) => item.id === promotionId));

  const updateResponse = await otherTenant.agent.patch(`/api/retail-promotions/${promotionId}`).send({
    name: "Hijacked",
    discountType: "PERCENT",
    discountValue: 50,
  });
  assert.equal(updateResponse.status, 404);

  const deleteResponse = await otherTenant.agent.delete(`/api/retail-promotions/${promotionId}`);
  assert.equal(deleteResponse.status, 404);
});
