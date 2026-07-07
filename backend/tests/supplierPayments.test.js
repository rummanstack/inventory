import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, createSupplier, depositCash, getCashAccount } from "./helpers/seeders.js";

let databaseManager;
let tenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Supplier Payments Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await closeTestApp();
});

async function createSupplierWithDue(totalAmount) {
  const product = await createProduct(tenant.agent, { name: `Due Widget ${Date.now()}-${Math.random()}` });
  const supplier = await createSupplier(tenant.agent, { name: `Due Supplier ${Date.now()}-${Math.random()}` });

  const response = await tenant.agent.post("/api/purchase-receive").send({
    supplierId: supplier.id,
    purchaseDate: "2026-02-05",
    items: [{ productId: product.id, quantityPieces: 10, purchasePrice: totalAmount / 10 }],
    discount: 0,
    paidAmount: 0,
    paymentMethod: "CASH",
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.purchaseReceipt.dueAmount, totalAmount);
  return supplier;
}

test("a payment within the due balance succeeds, reduces due, and withdraws cash", async () => {
  const supplier = await createSupplierWithDue(1000);
  await depositCash(tenant.agent, 2000);
  const cashBefore = await getCashAccount(tenant.agent);

  const response = await tenant.agent.post("/api/supplier-payments").send({
    supplierId: supplier.id,
    paymentDate: "2026-02-06",
    amount: 400,
    paymentMethod: "CASH",
  });

  assert.equal(response.status, 201);

  const supplierResponse = await tenant.agent.get(`/api/suppliers/${supplier.id}`);
  assert.equal(supplierResponse.body.supplier.currentDue, 600);

  const cashAfter = await getCashAccount(tenant.agent);
  assert.equal(cashAfter.balance, cashBefore.balance - 400);
});

test("a payment exceeding the due becomes a supplier advance (negative ledger balance)", async () => {
  const supplier = await createSupplierWithDue(1000);
  await depositCash(tenant.agent, 5000);
  const cashBefore = await getCashAccount(tenant.agent);

  const response = await tenant.agent.post("/api/supplier-payments").send({
    supplierId: supplier.id,
    paymentDate: "2026-02-06",
    amount: 1200,
    paymentMethod: "CASH",
  });

  assert.equal(response.status, 201);

  // current_due is clamped at 0; the extra 200 lives on the ledger as an advance
  const supplierResponse = await tenant.agent.get(`/api/suppliers/${supplier.id}`);
  assert.equal(supplierResponse.body.supplier.currentDue, 0, "current due clamps to zero on overpayment");

  const balanceResponse = await tenant.agent.get(`/api/supplier-due-ledger/balance?supplierId=${supplier.id}`);
  assert.equal(balanceResponse.status, 200);
  assert.equal(balanceResponse.body.balance, -200, "ledger balance must show the 200 advance as negative");

  const cashAfter = await getCashAccount(tenant.agent);
  assert.equal(cashAfter.balance, cashBefore.balance - 1200, "the full payment leaves the cash account");
});

test("a payment within the due balance is still rejected if the cash account itself cannot cover it", async () => {
  // Fresh supplier with a large due and zero cash funded for this test — the due-balance
  // check alone would pass, but the independent cash-balance guard must still block it.
  const supplier = await createSupplierWithDue(900000);
  const cashBefore = await getCashAccount(tenant.agent);
  assert.ok(cashBefore.balance < 900000, "test assumes the tenant cash balance is far below the supplier due");

  const response = await tenant.agent.post("/api/supplier-payments").send({
    supplierId: supplier.id,
    paymentDate: "2026-02-06",
    amount: cashBefore.balance + 1000,
    paymentMethod: "CASH",
  });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /Insufficient cash balance/);

  const supplierResponse = await tenant.agent.get(`/api/suppliers/${supplier.id}`);
  assert.equal(supplierResponse.body.supplier.currentDue, 900000, "due balance must be unchanged after the rejected payment");
});
