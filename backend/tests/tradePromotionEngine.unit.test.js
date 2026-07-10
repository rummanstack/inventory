import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateRule, evaluateAllRules } from "../lib/tradePromotionEngine.js";

function baseRule(overrides = {}) {
  return {
    id: "rule-1",
    name: "Test Rule",
    supplierScope: "SPECIFIC",
    supplierId: "supplier-1",
    targetType: "PRODUCT",
    targetId: "product-1",
    buyUnit: "PIECE",
    buyQuantity: 12,
    rewardType: "FREE_QUANTITY",
    rewardUnit: "PIECE",
    rewardQuantity: 1,
    rewardAmount: 0,
    rewardPercentage: 0,
    settlementMethod: "MULTIPLE",
    effectiveFrom: null,
    effectiveTo: null,
    ...overrides,
  };
}

function product(overrides = {}) {
  return { id: "product-1", category_id: "cat-1", pieces_per_case: 12, purchase_price: 10, ...overrides };
}

test("worked example 1: Every 12 Pieces -> 1 Piece, purchase 120 pieces -> earn 10 pieces", () => {
  const rule = baseRule();
  const items = [{ id: "item-1", productId: "product-1", quantityPieces: 120, lineTotal: 1200 }];
  const productMap = new Map([["product-1", product()]]);
  const result = evaluateRule(rule, items, productMap);
  assert.equal(result.kind, "QUANTITY");
  assert.equal(result.quantity, 10);
  assert.equal(result.amount, 0);
  assert.equal(result.multiples, 10);
});

test("worked example 2: Every 1 Case -> 1 Piece, purchase 9 cases -> earn 9 pieces", () => {
  const rule = baseRule({ buyUnit: "CASE", buyQuantity: 1, rewardUnit: "PIECE", rewardQuantity: 1 });
  const prod = product({ pieces_per_case: 1 }); // 1 case = 1 piece for this product, per spec's example
  const items = [{ id: "item-1", productId: "product-1", quantityPieces: 9, lineTotal: 900 }];
  const productMap = new Map([["product-1", prod]]);
  const result = evaluateRule(rule, items, productMap);
  assert.equal(result.kind, "QUANTITY");
  assert.equal(result.quantity, 9);
});

test("worked example 3: Every 100 Cases -> ৳500, purchase 250 cases -> earn ৳1000", () => {
  const prod = product({ pieces_per_case: 1 }); // treat "case" as the purchase unit directly
  const rule = baseRule({ buyUnit: "CASE", buyQuantity: 100, rewardType: "FIXED_AMOUNT", rewardAmount: 500, rewardUnit: null, rewardQuantity: 0 });
  const items = [{ id: "item-1", productId: "product-1", quantityPieces: 250, lineTotal: 25000 }];
  const productMap = new Map([["product-1", prod]]);
  const result = evaluateRule(rule, items, productMap);
  assert.equal(result.kind, "AMOUNT");
  assert.equal(result.amount, 1000);
  assert.equal(result.multiples, 2);
});

test("PERCENTAGE: Buy 50 Cases -> 2%, purchase 120 cases-worth -> earn 2% of the fulfilled-block value only", () => {
  const prod = product({ pieces_per_case: 1 });
  const rule = baseRule({ buyUnit: "CASE", buyQuantity: 50, rewardType: "PERCENTAGE", rewardPercentage: 2 });
  // 120 pieces (cases) at avg unit value 10 => lineTotal 1200
  const items = [{ id: "item-1", productId: "product-1", quantityPieces: 120, lineTotal: 1200 }];
  const productMap = new Map([["product-1", prod]]);
  const result = evaluateRule(rule, items, productMap);
  // multiples = floor(120/50) = 2; qualifyingPieces = 100; unitValue = 1200/120 = 10;
  // qualifyingValue = 10 * 100 = 1000; earned = 2% of 1000 = 20
  assert.equal(result.multiples, 2);
  assert.equal(result.amount, 20);
});

test("below threshold: purchase less than buyQuantity earns nothing", () => {
  const rule = baseRule({ buyQuantity: 12 });
  const items = [{ id: "item-1", productId: "product-1", quantityPieces: 5, lineTotal: 50 }];
  const productMap = new Map([["product-1", product()]]);
  assert.equal(evaluateRule(rule, items, productMap), null);
});

test("rule stacking: two independently-qualifying rules both earn on one purchase", () => {
  const ruleA = baseRule({ id: "rule-a", buyQuantity: 12, rewardQuantity: 1 });
  const ruleB = baseRule({ id: "rule-b", supplierScope: "ALL", rewardType: "FIXED_AMOUNT", rewardAmount: 50, buyQuantity: 10, rewardUnit: null, rewardQuantity: 0 });
  const items = [{ id: "item-1", productId: "product-1", quantityPieces: 120, lineTotal: 1200 }];
  const productMap = new Map([["product-1", product()]]);
  const results = evaluateAllRules([ruleA, ruleB], items, productMap, { supplierId: "supplier-1", purchaseDate: "2026-01-01" });
  assert.equal(results.length, 2);
});

test("category-scoped rule matches any product in that category", () => {
  const rule = baseRule({ targetType: "CATEGORY", targetId: "cat-1", buyQuantity: 10 });
  const items = [{ id: "item-1", productId: "product-2", quantityPieces: 20, lineTotal: 200 }];
  const productMap = new Map([["product-2", product({ id: "product-2", category_id: "cat-1" })]]);
  const result = evaluateRule(rule, items, productMap);
  assert.ok(result);
  assert.equal(result.productId, null); // no single product for a CATEGORY-scoped rule
});

test("ALL-scoped rule matches any supplier", () => {
  const rule = baseRule({ supplierScope: "ALL", targetType: "ALL", targetId: null, buyQuantity: 10 });
  const items = [{ id: "item-1", productId: "product-9", quantityPieces: 20, lineTotal: 200 }];
  const productMap = new Map([["product-9", product({ id: "product-9" })]]);
  const results = evaluateAllRules([rule], items, productMap, { supplierId: "any-supplier", purchaseDate: "2026-01-01" });
  assert.equal(results.length, 1);
});

test("rule outside its effective date window does not earn", () => {
  const rule = baseRule({ effectiveFrom: "2026-01-01", effectiveTo: "2026-01-31" });
  const items = [{ id: "item-1", productId: "product-1", quantityPieces: 120, lineTotal: 1200 }];
  const productMap = new Map([["product-1", product()]]);
  const results = evaluateAllRules([rule], items, productMap, { supplierId: "supplier-1", purchaseDate: "2026-02-01" });
  assert.equal(results.length, 0);
});
