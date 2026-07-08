import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, createSupplier, createDsr, addStock, getCashAccount } from "./helpers/seeders.js";

let databaseManager;
let tenant;
let otherTenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Supplier Discounts Tenant" });
  otherTenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Supplier Discounts Other Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await cleanupTenant(databaseManager, otherTenant.tenantId);
  await closeTestApp();
});

// Issues 20 pieces to a DSR, then settles with none returned and a supplier-funded discount.
async function seedSettlementWithSupplierDiscount(discount = 100) {
  const product = await createProduct(tenant.agent, {
    name: `Discount Widget ${Date.now()}-${Math.random()}`,
    purchasePrice: 50,
    wholesalePrice: 70,
  });
  await addStock(tenant.agent, product.id, 100);
  const dsr = await createDsr(tenant.agent, { name: `Discount DSR ${Date.now()}-${Math.random()}` });
  const supplier = await createSupplier(tenant.agent, { name: `Discount Supplier ${Date.now()}-${Math.random()}` });

  const issueResponse = await tenant.agent.post("/api/issues").send({
    date: "2026-03-01",
    dsrId: dsr.id,
    items: [{ productId: product.id, issuedPieces: 20 }],
  });
  assert.equal(issueResponse.status, 201);

  const settleResponse = await tenant.agent.post("/api/settlements").send({
    date: "2026-03-01",
    dsrId: dsr.id,
    dsrName: dsr.name,
    items: [{ productId: product.id, returnedPieces: 0, damagedPieces: 0 }],
    discount,
    discountSupplierId: supplier.id,
    extraReturnValue: 0,
    amountPaid: 0,
  });
  assert.equal(settleResponse.status, 201);

  return { product, dsr, supplier };
}

test("a settlement discount attributed to a supplier creates a listable supplier discount record", async () => {
  const { supplier, dsr } = await seedSettlementWithSupplierDiscount(150);

  const listResponse = await tenant.agent.get("/api/supplier-discounts").query({ supplierId: supplier.id });
  assert.equal(listResponse.status, 200);
  const discount = listResponse.body.items.find((item) => item.supplierId === supplier.id);
  assert.ok(discount, "the discount should be listed for its supplier");
  assert.equal(Number(discount.amount), 150);
  assert.equal(discount.dsrName, dsr.name);
});

test("clearing (deleting) a supplier discount deposits its amount back into cash", async () => {
  const { supplier } = await seedSettlementWithSupplierDiscount(200);

  const cashBefore = await getCashAccount(tenant.agent);

  const listResponse = await tenant.agent.get("/api/supplier-discounts").query({ supplierId: supplier.id });
  const discount = listResponse.body.items.find((item) => item.supplierId === supplier.id);
  assert.ok(discount);

  const removeResponse = await tenant.agent.delete(`/api/supplier-discounts/${discount.id}`);
  assert.equal(removeResponse.status, 200);

  const cashAfter = await getCashAccount(tenant.agent);
  assert.equal(Number(cashAfter.balance), Number(cashBefore.balance) + 200);

  const listAfter = await tenant.agent.get("/api/supplier-discounts").query({ supplierId: supplier.id });
  assert.ok(!listAfter.body.items.some((item) => item.id === discount.id));
});

test("tenant isolation: another tenant cannot see or clear a supplier discount that isn't theirs", async () => {
  const { supplier } = await seedSettlementWithSupplierDiscount(75);

  const listResponse = await tenant.agent.get("/api/supplier-discounts").query({ supplierId: supplier.id });
  const discount = listResponse.body.items.find((item) => item.supplierId === supplier.id);
  assert.ok(discount);

  const otherList = await otherTenant.agent.get("/api/supplier-discounts");
  assert.ok(!otherList.body.items.some((item) => item.id === discount.id));

  const removeResponse = await otherTenant.agent.delete(`/api/supplier-discounts/${discount.id}`);
  assert.equal(removeResponse.status, 404);
});
