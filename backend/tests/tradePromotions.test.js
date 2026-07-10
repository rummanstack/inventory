import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, createSupplier } from "./helpers/seeders.js";
import { findTradePromotionEarningsByPurchase } from "../repositories/tradePromotionEarningRepository.js";

async function createRule(agent, overrides = {}) {
  const response = await agent.post("/api/trade-promotion-rules").send({
    name: "Test Rule",
    supplierScope: "SPECIFIC",
    targetType: "PRODUCT",
    buyUnit: "PIECE",
    buyQuantity: 12,
    rewardType: "FREE_QUANTITY",
    rewardUnit: "PIECE",
    rewardQuantity: 1,
    settlementMethod: "MULTIPLE",
    ...overrides,
  });
  if (response.status !== 201) {
    throw new Error(`createRule failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return response.body;
}

async function createPurchase(agent, overrides = {}) {
  const response = await agent.post("/api/purchase-receive").send({
    purchaseDate: "2026-01-10",
    discount: 0,
    paidAmount: 0,
    paymentMethod: "CASH",
    ...overrides,
  });
  if (response.status !== 201) {
    throw new Error(`createPurchase failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return response.body.purchaseReceipt;
}

async function earningsForPurchase(databaseManager, purchaseReceiptId, tenantId) {
  return databaseManager.withClient((client) => findTradePromotionEarningsByPurchase(client, purchaseReceiptId, tenantId));
}

let databaseManager;
let tenant;
let supplier;
let product;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Trade Promotions Tenant" });
  supplier = await createSupplier(tenant.agent);
  product = await createProduct(tenant.agent, { piecesPerCase: 12, purchasePrice: 10 });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await closeTestApp();
});

test("rule CRUD: create, update, soft-delete, restore round-trip", async () => {
  const createResponse = await tenant.agent.post("/api/trade-promotion-rules").send({
    name: "Every 12 Pieces -> 1 Piece",
    supplierScope: "SPECIFIC",
    supplierId: supplier.id,
    targetType: "PRODUCT",
    targetId: product.id,
    buyUnit: "PIECE",
    buyQuantity: 12,
    rewardType: "FREE_QUANTITY",
    rewardUnit: "PIECE",
    rewardQuantity: 1,
    settlementMethod: "MULTIPLE",
  });
  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.name, "Every 12 Pieces -> 1 Piece");
  assert.equal(createResponse.body.buyQuantity, 12);
  assert.equal(createResponse.body.active, true);
  const ruleId = createResponse.body.id;

  const updateResponse = await tenant.agent.patch(`/api/trade-promotion-rules/${ruleId}`).send({
    name: "Every 12 Pieces -> 1 Piece (updated)",
    supplierScope: "SPECIFIC",
    supplierId: supplier.id,
    targetType: "PRODUCT",
    targetId: product.id,
    buyUnit: "PIECE",
    buyQuantity: 12,
    rewardType: "FREE_QUANTITY",
    rewardUnit: "PIECE",
    rewardQuantity: 2,
    settlementMethod: "MULTIPLE",
  });
  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.rewardQuantity, 2);

  const listResponse = await tenant.agent.get("/api/trade-promotion-rules");
  assert.equal(listResponse.status, 200);
  assert.ok(listResponse.body.items.some((r) => r.id === ruleId));

  const deleteResponse = await tenant.agent.delete(`/api/trade-promotion-rules/${ruleId}`).send({ reason: "test cleanup" });
  assert.equal(deleteResponse.status, 200);

  const listAfterDelete = await tenant.agent.get("/api/trade-promotion-rules");
  assert.ok(!listAfterDelete.body.items.some((r) => r.id === ruleId));

  const trashResponse = await tenant.agent.get("/api/trade-promotion-rules/trash");
  assert.ok(trashResponse.body.items.some((r) => r.id === ruleId));

  const restoreResponse = await tenant.agent.post(`/api/trade-promotion-rules/${ruleId}/restore`);
  assert.equal(restoreResponse.status, 200);

  const listAfterRestore = await tenant.agent.get("/api/trade-promotion-rules");
  assert.ok(listAfterRestore.body.items.some((r) => r.id === ruleId));
});

test("rule validation: CASE unit requires a specific-product target", async () => {
  const response = await tenant.agent.post("/api/trade-promotion-rules").send({
    name: "Bad rule",
    supplierScope: "ALL",
    targetType: "ALL",
    buyUnit: "CASE",
    buyQuantity: 1,
    rewardType: "FREE_QUANTITY",
    rewardUnit: "PIECE",
    rewardQuantity: 1,
    settlementMethod: "MULTIPLE",
  });
  assert.equal(response.status, 400);
});

test("rule validation: reward fields required per reward type", async () => {
  const response = await tenant.agent.post("/api/trade-promotion-rules").send({
    name: "Missing amount",
    supplierScope: "ALL",
    targetType: "PRODUCT",
    targetId: product.id,
    buyUnit: "PIECE",
    buyQuantity: 10,
    rewardType: "FIXED_AMOUNT",
    rewardAmount: 0,
    settlementMethod: "MULTIPLE",
  });
  assert.equal(response.status, 400);
});

test("worked example 1: Every 12 Pieces -> 1 Piece, purchase 120 pieces earns 10 pieces", async () => {
  const p = await createProduct(tenant.agent, { piecesPerCase: 12, purchasePrice: 10 });
  await createRule(tenant.agent, {
    name: "Every 12 Pieces -> 1 Piece",
    supplierId: supplier.id,
    targetId: p.id,
    buyUnit: "PIECE",
    buyQuantity: 12,
    rewardType: "FREE_QUANTITY",
    rewardUnit: "PIECE",
    rewardQuantity: 1,
  });

  const purchase = await createPurchase(tenant.agent, {
    supplierId: supplier.id,
    items: [{ productId: p.id, quantityPieces: 120, purchasePrice: 10 }],
  });

  const earnings = await earningsForPurchase(databaseManager, purchase.id, tenant.tenantId);
  assert.equal(earnings.length, 1);
  assert.equal(earnings[0].rewardKind, "QUANTITY");
  assert.equal(earnings[0].earnedQuantityPieces, 10);
  assert.equal(earnings[0].status, "PENDING");
});

test("worked example 2: Every 1 Case -> 1 Piece, purchase 9 cases (as pieces) earns 9 pieces", async () => {
  const p = await createProduct(tenant.agent, { piecesPerCase: 1, purchasePrice: 10 });
  await createRule(tenant.agent, {
    name: "Every 1 Case -> 1 Piece",
    supplierId: supplier.id,
    targetId: p.id,
    buyUnit: "CASE",
    buyQuantity: 1,
    rewardType: "FREE_QUANTITY",
    rewardUnit: "PIECE",
    rewardQuantity: 1,
  });

  const purchase = await createPurchase(tenant.agent, {
    supplierId: supplier.id,
    items: [{ productId: p.id, quantityPieces: 9, purchasePrice: 10 }],
  });

  const earnings = await earningsForPurchase(databaseManager, purchase.id, tenant.tenantId);
  assert.equal(earnings.length, 1);
  assert.equal(earnings[0].earnedQuantityPieces, 9);
});

test("worked example 3: Every 100 Cases -> ৳500, purchase 250 (case-equivalent) earns ৳1000 and posts an earn-time journal entry", async () => {
  const p = await createProduct(tenant.agent, { piecesPerCase: 1, purchasePrice: 10 });
  await createRule(tenant.agent, {
    name: "Every 100 Cases -> 500",
    supplierId: supplier.id,
    targetId: p.id,
    buyUnit: "CASE",
    buyQuantity: 100,
    rewardType: "FIXED_AMOUNT",
    rewardUnit: null,
    rewardQuantity: 0,
    rewardAmount: 500,
  });

  const purchase = await createPurchase(tenant.agent, {
    supplierId: supplier.id,
    items: [{ productId: p.id, quantityPieces: 250, purchasePrice: 10 }],
  });

  const earnings = await earningsForPurchase(databaseManager, purchase.id, tenant.tenantId);
  assert.equal(earnings.length, 1);
  assert.equal(earnings[0].rewardKind, "AMOUNT");
  assert.equal(earnings[0].earnedAmount, 1000);

  const ledgerResponse = await tenant.agent.get("/api/journal/general-ledger").query({ accountCode: "1140" });
  assert.equal(ledgerResponse.status, 200);
  assert.ok(ledgerResponse.body.lines.some((line) => Number(line.debit) === 1000), "expected a 1000 debit line on the Promotion Receivable account");
});

test("rule stacking: two independently-qualifying rules both earn on one purchase", async () => {
  const p = await createProduct(tenant.agent, { piecesPerCase: 1, purchasePrice: 10 });
  await createRule(tenant.agent, {
    name: "Stacking rule A",
    supplierId: supplier.id,
    targetId: p.id,
    buyUnit: "PIECE",
    buyQuantity: 12,
    rewardType: "FREE_QUANTITY",
    rewardUnit: "PIECE",
    rewardQuantity: 1,
  });
  await createRule(tenant.agent, {
    name: "Stacking rule B",
    supplierScope: "ALL",
    supplierId: undefined,
    targetId: p.id,
    buyUnit: "PIECE",
    buyQuantity: 10,
    rewardType: "FIXED_AMOUNT",
    rewardUnit: null,
    rewardQuantity: 0,
    rewardAmount: 50,
  });

  const purchase = await createPurchase(tenant.agent, {
    supplierId: supplier.id,
    items: [{ productId: p.id, quantityPieces: 120, purchasePrice: 10 }],
  });

  const earnings = await earningsForPurchase(databaseManager, purchase.id, tenant.tenantId);
  assert.equal(earnings.length, 2);
});

test("rule outside its effective date window does not earn", async () => {
  const p = await createProduct(tenant.agent, { piecesPerCase: 1, purchasePrice: 10 });
  await createRule(tenant.agent, {
    name: "Expired rule",
    supplierId: supplier.id,
    targetId: p.id,
    buyUnit: "PIECE",
    buyQuantity: 5,
    effectiveFrom: "2020-01-01",
    effectiveTo: "2020-01-31",
  });

  const purchase = await createPurchase(tenant.agent, {
    supplierId: supplier.id,
    items: [{ productId: p.id, quantityPieces: 50, purchasePrice: 10 }],
  });

  const earnings = await earningsForPurchase(databaseManager, purchase.id, tenant.tenantId);
  assert.equal(earnings.length, 0);
});

test("purchase delete reverses the earning; delete is blocked once settled", async () => {
  const p = await createProduct(tenant.agent, { piecesPerCase: 1, purchasePrice: 10 });
  await createRule(tenant.agent, {
    name: "Delete-reversal rule",
    supplierId: supplier.id,
    targetId: p.id,
    buyUnit: "PIECE",
    buyQuantity: 12,
    rewardUnit: "PIECE",
    rewardQuantity: 1,
  });

  const purchase = await createPurchase(tenant.agent, {
    supplierId: supplier.id,
    items: [{ productId: p.id, quantityPieces: 120, purchasePrice: 10 }],
  });

  let earnings = await earningsForPurchase(databaseManager, purchase.id, tenant.tenantId);
  assert.equal(earnings.length, 1);
  assert.equal(earnings[0].status, "PENDING");

  const deleteResponse = await tenant.agent.delete(`/api/purchase-receive/${purchase.id}`).send({ reason: "test delete" });
  assert.equal(deleteResponse.status, 200);

  earnings = await earningsForPurchase(databaseManager, purchase.id, tenant.tenantId);
  assert.equal(earnings[0].status, "REVERSED");
});

test("purchase restore un-reverses the earning", async () => {
  const p = await createProduct(tenant.agent, { piecesPerCase: 1, purchasePrice: 10 });
  await createRule(tenant.agent, {
    name: "Restore rule",
    supplierId: supplier.id,
    targetId: p.id,
    buyUnit: "PIECE",
    buyQuantity: 12,
    rewardUnit: "PIECE",
    rewardQuantity: 1,
  });

  const purchase = await createPurchase(tenant.agent, {
    supplierId: supplier.id,
    items: [{ productId: p.id, quantityPieces: 120, purchasePrice: 10 }],
  });

  await tenant.agent.delete(`/api/purchase-receive/${purchase.id}`).send({ reason: "test delete" });
  const restoreResponse = await tenant.agent.post(`/api/purchase-receive/${purchase.id}/restore`);
  assert.equal(restoreResponse.status, 200);

  const earnings = await earningsForPurchase(databaseManager, purchase.id, tenant.tenantId);
  assert.equal(earnings[0].status, "PENDING");
});

test("purchase edit recomputes earnings from scratch when quantities change", async () => {
  const p = await createProduct(tenant.agent, { piecesPerCase: 1, purchasePrice: 10 });
  await createRule(tenant.agent, {
    name: "Recompute rule",
    supplierId: supplier.id,
    targetId: p.id,
    buyUnit: "PIECE",
    buyQuantity: 12,
    rewardUnit: "PIECE",
    rewardQuantity: 1,
  });

  const purchase = await createPurchase(tenant.agent, {
    supplierId: supplier.id,
    items: [{ productId: p.id, quantityPieces: 120, purchasePrice: 10 }],
  });

  let earnings = await earningsForPurchase(databaseManager, purchase.id, tenant.tenantId);
  assert.equal(earnings.length, 1);
  assert.equal(earnings[0].earnedQuantityPieces, 10);

  const editResponse = await tenant.agent.put(`/api/purchase-receive/${purchase.id}`).send({
    supplierId: supplier.id,
    purchaseDate: "2026-01-10",
    items: [{ productId: p.id, quantityPieces: 5, purchasePrice: 10 }],
    discount: 0,
    paymentMethod: "CASH",
    reason: "reduce quantity below threshold",
  });
  assert.equal(editResponse.status, 200);

  earnings = await earningsForPurchase(databaseManager, purchase.id, tenant.tenantId);
  assert.equal(earnings.length, 0, "quantity dropped below the buy threshold, so the earning should be gone");
});

test("CASH settlement: partial then full, cash balance increases, journal correct at each step", async () => {
  const p = await createProduct(tenant.agent, { piecesPerCase: 1, purchasePrice: 10 });
  await createRule(tenant.agent, {
    name: "Cash settlement rule",
    supplierId: supplier.id,
    targetId: p.id,
    buyUnit: "CASE",
    buyQuantity: 100,
    rewardType: "FIXED_AMOUNT",
    rewardUnit: null,
    rewardQuantity: 0,
    rewardAmount: 1000,
    settlementMethod: "CASH",
  });

  const purchase = await createPurchase(tenant.agent, {
    supplierId: supplier.id,
    items: [{ productId: p.id, quantityPieces: 100, purchasePrice: 10 }],
  });

  const earnings = await earningsForPurchase(databaseManager, purchase.id, tenant.tenantId);
  assert.equal(earnings.length, 1);
  const earning = earnings[0];
  assert.equal(earning.earnedAmount, 1000);

  const partial = await tenant.agent.post("/api/trade-promotion-settlements").send({
    earningId: earning.id,
    method: "CASH",
    settlementDate: "2026-01-15",
    amount: 400,
  });
  assert.equal(partial.status, 201);

  let refetched = await earningsForPurchase(databaseManager, purchase.id, tenant.tenantId);
  assert.equal(refetched[0].status, "PARTIALLY_SETTLED");
  assert.equal(refetched[0].settledAmount, 400);
  assert.equal(refetched[0].remainingAmount, 600);

  const full = await tenant.agent.post("/api/trade-promotion-settlements").send({
    earningId: earning.id,
    method: "CASH",
    settlementDate: "2026-01-16",
    amount: 600,
  });
  assert.equal(full.status, 201);

  refetched = await earningsForPurchase(databaseManager, purchase.id, tenant.tenantId);
  assert.equal(refetched[0].status, "SETTLED");
  assert.equal(refetched[0].settledAmount, 1000);

  const cashLedger = await tenant.agent.get("/api/journal/general-ledger").query({ accountCode: "1000" });
  const depositLines = cashLedger.body.lines.filter((line) => Number(line.debit) === 400 || Number(line.debit) === 600);
  assert.equal(depositLines.length, 2, "expected both the 400 and 600 cash deposit lines");
});

test("STOCK settlement: earn 100 pieces, settle 40, remaining 60, stock and movement correct", async () => {
  const p = await createProduct(tenant.agent, { piecesPerCase: 1, purchasePrice: 10 });
  await createRule(tenant.agent, {
    name: "Stock settlement rule",
    supplierId: supplier.id,
    targetId: p.id,
    buyUnit: "PIECE",
    buyQuantity: 1,
    rewardType: "FREE_QUANTITY",
    rewardUnit: "PIECE",
    rewardQuantity: 1,
    settlementMethod: "STOCK",
  });

  const purchase = await createPurchase(tenant.agent, {
    supplierId: supplier.id,
    items: [{ productId: p.id, quantityPieces: 100, purchasePrice: 10 }],
  });

  const earnings = await earningsForPurchase(databaseManager, purchase.id, tenant.tenantId);
  assert.equal(earnings.length, 1);
  const earning = earnings[0];
  assert.equal(earning.earnedQuantityPieces, 100);

  const productBefore = await tenant.agent.get("/api/products").query({ search: p.name });
  const stockBefore = productBefore.body.items.find((item) => item.id === p.id).stockPieces;

  const settleResponse = await tenant.agent.post("/api/trade-promotion-settlements").send({
    earningId: earning.id,
    method: "STOCK",
    settlementDate: "2026-01-15",
    quantityPieces: 40,
  });
  assert.equal(settleResponse.status, 201);

  const refetched = await earningsForPurchase(databaseManager, purchase.id, tenant.tenantId);
  assert.equal(refetched[0].status, "PARTIALLY_SETTLED");
  assert.equal(refetched[0].settledQuantityPieces, 40);
  assert.equal(refetched[0].remainingQuantityPieces, 60);

  const productAfter = await tenant.agent.get("/api/products").query({ search: p.name });
  const stockAfter = productAfter.body.items.find((item) => item.id === p.id).stockPieces;
  assert.equal(stockAfter, stockBefore + 40);

  const movementsResponse = await tenant.agent.get("/api/stock-movements/reports").query({ productId: p.id, dateFrom: "2026-01-01", dateTo: "2026-12-31" });
  assert.equal(movementsResponse.status, 200);
});

test("CREDIT_NOTE settlement: reduces supplier's current due and posts the ledger entry", async () => {
  const p = await createProduct(tenant.agent, { piecesPerCase: 1, purchasePrice: 10 });
  const creditSupplier = await createSupplier(tenant.agent);
  await createRule(tenant.agent, {
    name: "Credit note rule",
    supplierId: creditSupplier.id,
    targetId: p.id,
    buyUnit: "PIECE",
    buyQuantity: 100,
    rewardType: "FIXED_AMOUNT",
    rewardUnit: null,
    rewardQuantity: 0,
    rewardAmount: 300,
    settlementMethod: "CREDIT_NOTE",
  });

  const purchase = await createPurchase(tenant.agent, {
    supplierId: creditSupplier.id,
    items: [{ productId: p.id, quantityPieces: 100, purchasePrice: 10 }],
  });

  const earnings = await earningsForPurchase(databaseManager, purchase.id, tenant.tenantId);
  assert.equal(earnings.length, 1);
  const earning = earnings[0];
  assert.equal(earning.earnedAmount, 300);

  const supplierBefore = await tenant.agent.get(`/api/suppliers/${creditSupplier.id}`);
  const dueBefore = Number(supplierBefore.body.supplier.currentDue || 0);

  const settleResponse = await tenant.agent.post("/api/trade-promotion-settlements").send({
    earningId: earning.id,
    method: "CREDIT_NOTE",
    settlementDate: "2026-01-15",
    amount: 300,
  });
  assert.equal(settleResponse.status, 201);

  const refetched = await earningsForPurchase(databaseManager, purchase.id, tenant.tenantId);
  assert.equal(refetched[0].status, "SETTLED");

  const supplierAfter = await tenant.agent.get(`/api/suppliers/${creditSupplier.id}`);
  const dueAfter = Number(supplierAfter.body.supplier.currentDue || 0);
  assert.equal(dueAfter, Math.max(0, dueBefore - 300));

  const ledgerResponse = await tenant.agent.get("/api/supplier-due-ledger").query({ supplierId: creditSupplier.id });
  assert.equal(ledgerResponse.status, 200);
  assert.ok(ledgerResponse.body.items.some((entry) => entry.type === "PROMOTION_CREDIT" && Number(entry.credit) === 300));
});

test("settlement void restores the earning's remaining balance and reverses its effect", async () => {
  const p = await createProduct(tenant.agent, { piecesPerCase: 1, purchasePrice: 10 });
  await createRule(tenant.agent, {
    name: "Void rule",
    supplierId: supplier.id,
    targetId: p.id,
    buyUnit: "CASE",
    buyQuantity: 100,
    rewardType: "FIXED_AMOUNT",
    rewardUnit: null,
    rewardQuantity: 0,
    rewardAmount: 1000,
    settlementMethod: "CASH",
  });

  const purchase = await createPurchase(tenant.agent, {
    supplierId: supplier.id,
    items: [{ productId: p.id, quantityPieces: 100, purchasePrice: 10 }],
  });

  const earnings = await earningsForPurchase(databaseManager, purchase.id, tenant.tenantId);
  const earning = earnings[0];

  const settleResponse = await tenant.agent.post("/api/trade-promotion-settlements").send({
    earningId: earning.id,
    method: "CASH",
    settlementDate: "2026-01-15",
    amount: 1000,
  });
  assert.equal(settleResponse.status, 201);
  const settlementId = settleResponse.body.id;

  let refetched = await earningsForPurchase(databaseManager, purchase.id, tenant.tenantId);
  assert.equal(refetched[0].status, "SETTLED");

  const voidResponse = await tenant.agent.delete(`/api/trade-promotion-settlements/${settlementId}`).send({ reason: "test void" });
  assert.equal(voidResponse.status, 200);

  refetched = await earningsForPurchase(databaseManager, purchase.id, tenant.tenantId);
  assert.equal(refetched[0].status, "PENDING");
  assert.equal(refetched[0].settledAmount, 0);
});

test("reports: pending/settled/supplier-summary/product-summary/date-wise aggregate correctly", async () => {
  const p = await createProduct(tenant.agent, { piecesPerCase: 1, purchasePrice: 10 });
  const reportSupplier = await createSupplier(tenant.agent);
  await createRule(tenant.agent, {
    name: "Report rule",
    supplierId: reportSupplier.id,
    targetId: p.id,
    buyUnit: "PIECE",
    buyQuantity: 10,
    rewardType: "FIXED_AMOUNT",
    rewardUnit: null,
    rewardQuantity: 0,
    rewardAmount: 100,
    settlementMethod: "CASH",
  });

  const purchase = await createPurchase(tenant.agent, {
    supplierId: reportSupplier.id,
    purchaseDate: "2026-02-01",
    items: [{ productId: p.id, quantityPieces: 10, purchasePrice: 10 }],
  });

  const earnings = await earningsForPurchase(databaseManager, purchase.id, tenant.tenantId);
  const earning = earnings[0];
  assert.equal(earning.earnedAmount, 100);

  const pendingReport = await tenant.agent.get("/api/trade-promotion-earnings/reports/pending");
  assert.equal(pendingReport.status, 200);
  assert.ok(pendingReport.body.items.some((e) => e.id === earning.id));

  const settledReportBefore = await tenant.agent.get("/api/trade-promotion-earnings/reports/settled");
  assert.ok(!settledReportBefore.body.items.some((e) => e.id === earning.id));

  await tenant.agent.post("/api/trade-promotion-settlements").send({
    earningId: earning.id,
    method: "CASH",
    settlementDate: "2026-02-02",
    amount: 100,
  });

  const settledReportAfter = await tenant.agent.get("/api/trade-promotion-earnings/reports/settled");
  assert.ok(settledReportAfter.body.items.some((e) => e.id === earning.id));

  const supplierSummary = await tenant.agent.get("/api/trade-promotion-earnings/reports/supplier-summary");
  assert.equal(supplierSummary.status, 200);
  const supplierRow = supplierSummary.body.find((row) => row.supplierId === reportSupplier.id);
  assert.ok(supplierRow);
  assert.equal(supplierRow.totalEarnedAmount, 100);
  assert.equal(supplierRow.totalSettledAmount, 100);

  const productSummary = await tenant.agent.get("/api/trade-promotion-earnings/reports/product-summary");
  assert.equal(productSummary.status, 200);
  const productRow = productSummary.body.find((row) => row.productId === p.id);
  assert.ok(productRow);
  assert.equal(productRow.totalEarnedAmount, 100);

  const dateWise = await tenant.agent.get("/api/trade-promotion-earnings/reports/date-wise").query({ dateFrom: "2026-02-01", dateTo: "2026-02-01" });
  assert.equal(dateWise.status, 200);
  const dayRow = dateWise.body.find((row) => String(row.date).slice(0, 10) === "2026-02-01");
  assert.ok(dayRow);
  assert.equal(dayRow.totalEarnedAmount, 100);
});
