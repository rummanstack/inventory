import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, addStock, createDsr, getCashAccount } from "./helpers/seeders.js";

let databaseManager;
let tenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "DSR Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await closeTestApp();
});

test("a morning issue decrements stock and records a MORNING_ISSUE movement", async () => {
  const product = await createProduct(tenant.agent, { name: "Issue Widget", wholesalePrice: 70 });
  await addStock(tenant.agent, product.id, 100);
  const dsr = await createDsr(tenant.agent, { name: "Issue DSR" });

  const response = await tenant.agent.post("/api/issues").send({
    date: "2026-03-01",
    dsrId: dsr.id,
    items: [{ productId: product.id, issuedPieces: 40 }],
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.issue.items[0].issuedPieces, 40);
  assert.equal(response.body.issue.items[0].rate, 70);

  const productResponse = await tenant.agent.get("/api/products").query({ search: "Issue Widget" });
  assert.equal(productResponse.body.items.find((item) => item.id === product.id).stockPieces, 60);

  const movements = await tenant.agent.get("/api/stock-movements").query({ productId: product.id });
  const movement = movements.body.items.find((item) => item.type === "MORNING_ISSUE");
  assert.ok(movement);
  assert.equal(movement.quantityOut, 40);
});

test("issuing more than available stock is rejected, and a duplicate issue for the same DSR/date is rejected", async () => {
  const product = await createProduct(tenant.agent, { name: "Overissue Widget", wholesalePrice: 70 });
  await addStock(tenant.agent, product.id, 10);
  const dsr = await createDsr(tenant.agent, { name: "Overissue DSR" });

  const tooMuch = await tenant.agent.post("/api/issues").send({
    date: "2026-03-02",
    dsrId: dsr.id,
    items: [{ productId: product.id, issuedPieces: 20 }],
  });
  assert.equal(tooMuch.status, 400);
  assert.match(tooMuch.body.message, /does not have enough available stock/);

  const ok = await tenant.agent.post("/api/issues").send({
    date: "2026-03-02",
    dsrId: dsr.id,
    items: [{ productId: product.id, issuedPieces: 5 }],
  });
  assert.equal(ok.status, 201);

  const duplicate = await tenant.agent.post("/api/issues").send({
    date: "2026-03-02",
    dsrId: dsr.id,
    items: [{ productId: product.id, issuedPieces: 1 }],
  });
  assert.equal(duplicate.status, 400);
  assert.match(duplicate.body.message, /already exists/);
});

test("an evening settlement enforces returned+damaged <= issued, applies stock, and deposits cash", async () => {
  const product = await createProduct(tenant.agent, { name: "Settle Widget", wholesalePrice: 50 });
  await addStock(tenant.agent, product.id, 100);
  const dsr = await createDsr(tenant.agent, { name: "Settle DSR" });

  const issue = await tenant.agent.post("/api/issues").send({
    date: "2026-03-03",
    dsrId: dsr.id,
    items: [{ productId: product.id, issuedPieces: 50 }],
  });
  assert.equal(issue.status, 201);

  const invalid = await tenant.agent.post("/api/settlements").send({
    date: "2026-03-03",
    dsrId: dsr.id,
    items: [{ productId: product.id, returnedPieces: 40, damagedPieces: 20 }],
    discount: 0,
    extraReturnValue: 0,
    amountPaid: 0,
  });
  assert.equal(invalid.status, 400);
  assert.match(invalid.body.message, /cannot be greater than issued quantity/);

  const cashBefore = await getCashAccount(tenant.agent);

  // Sold = 50 - 5 (returned) - 5 (damaged) = 40 pieces @ 50 = 2000 payable.
  const settlement = await tenant.agent.post("/api/settlements").send({
    date: "2026-03-03",
    dsrId: dsr.id,
    items: [{ productId: product.id, returnedPieces: 5, damagedPieces: 5 }],
    discount: 0,
    extraReturnValue: 0,
    amountPaid: 2000,
  });
  assert.equal(settlement.status, 201);
  assert.equal(settlement.body.settlement.totalPayable, 2000);
  assert.equal(settlement.body.settlement.amountPaid, 2000);
  assert.equal(settlement.body.settlement.dueAmount, 0);

  const productResponse = await tenant.agent.get("/api/products").query({ search: "Settle Widget" });
  const updatedProduct = productResponse.body.items.find((item) => item.id === product.id);
  // Started at 100, issued 50 (-> 50), 5 came back as good return (-> 55).
  assert.equal(updatedProduct.stockPieces, 55);
  assert.equal(updatedProduct.damagedPieces, 5);

  const movements = await tenant.agent.get("/api/stock-movements").query({ productId: product.id });
  assert.ok(movements.body.items.some((item) => item.type === "SETTLEMENT_RETURN"));
  assert.ok(movements.body.items.some((item) => item.type === "DAMAGE"));

  const cashAfter = await getCashAccount(tenant.agent);
  assert.equal(cashAfter.balance, cashBefore.balance + 2000);
});

test("an issue cannot be edited once it has a completed settlement", async () => {
  const product = await createProduct(tenant.agent, { name: "Locked Widget", wholesalePrice: 50 });
  await addStock(tenant.agent, product.id, 100);
  const dsr = await createDsr(tenant.agent, { name: "Locked DSR" });

  const issue = await tenant.agent.post("/api/issues").send({
    date: "2026-03-04",
    dsrId: dsr.id,
    items: [{ productId: product.id, issuedPieces: 20 }],
  });
  assert.equal(issue.status, 201);

  const settlement = await tenant.agent.post("/api/settlements").send({
    date: "2026-03-04",
    dsrId: dsr.id,
    items: [{ productId: product.id, returnedPieces: 0, damagedPieces: 0 }],
    discount: 0,
    extraReturnValue: 0,
    amountPaid: 0,
  });
  assert.equal(settlement.status, 201);

  const editAttempt = await tenant.agent.put(`/api/issues/${issue.body.issue.id}`).send({
    date: "2026-03-04",
    dsrId: dsr.id,
    items: [{ productId: product.id, issuedPieces: 25 }],
  });
  assert.equal(editAttempt.status, 400);
  assert.match(editAttempt.body.message, /already has a completed settlement/);
});
