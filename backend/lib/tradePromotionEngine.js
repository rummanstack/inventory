import { assert } from "./errors.js";
import {
  TRADE_PROMOTION_TARGET_TYPES,
  TRADE_PROMOTION_SUPPLIER_SCOPES,
  TRADE_PROMOTION_BUY_UNITS,
} from "./tradePromotions.js";

// ── Scope / activity matching (mirrors retailPromotionRepository's target matching) ──

export function isSupplierMatch(rule, supplierId) {
  if (rule.supplierScope === TRADE_PROMOTION_SUPPLIER_SCOPES.ALL) return true;
  return rule.supplierId === supplierId;
}

// `product` is the raw DB row (snake_case) from purchaseReceiveService's productMap
// (built via lockProducts -> findProductsForUpdate -> `SELECT * FROM products`), not a
// camelCase-mapped object — deliberately, to avoid an extra mapping layer just for this.
export function matchesPromotionTarget(rule, product) {
  if (!product) return false;
  if (rule.targetType === TRADE_PROMOTION_TARGET_TYPES.ALL) return true;
  if (rule.targetType === TRADE_PROMOTION_TARGET_TYPES.PRODUCT) return rule.targetId === product.id;
  if (rule.targetType === TRADE_PROMOTION_TARGET_TYPES.CATEGORY) {
    return Boolean(rule.targetId) && rule.targetId === product.category_id;
  }
  return false;
}

export function isRuleActiveForDate(rule, purchaseDate) {
  const date = String(purchaseDate || "").slice(0, 10);
  const from = rule.effectiveFrom ? String(rule.effectiveFrom).slice(0, 10) : null;
  const to = rule.effectiveTo ? String(rule.effectiveTo).slice(0, 10) : null;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

// ── Unit conversion — CASE only resolvable when a concrete product is known ──

export function buyQuantityInPieces(rule, product) {
  if (rule.buyUnit === TRADE_PROMOTION_BUY_UNITS.CASE) {
    assert(product?.pieces_per_case, `Rule "${rule.name}" uses CASE buy unit but has no resolvable product case size.`);
    return Number(rule.buyQuantity) * Number(product.pieces_per_case);
  }
  return Number(rule.buyQuantity);
}

export function rewardQuantityInPieces(rule, product) {
  if (rule.rewardUnit === TRADE_PROMOTION_BUY_UNITS.CASE) {
    assert(product?.pieces_per_case, `Rule "${rule.name}" uses CASE reward unit but has no resolvable product case size.`);
    return Number(rule.rewardQuantity) * Number(product.pieces_per_case);
  }
  return Number(rule.rewardQuantity);
}

// ── Reward calculators — keyed by reward type. Each is pure:
// (rule, matchedQuantityPieces, qualifyingLineValue, product) => { kind, quantity, amount, multiples } | null
// `product` is only used (and only needed) when buyUnit/rewardUnit is CASE — always
// null-safe for ALL/CATEGORY-scoped rules, which are restricted to PIECE units at
// rule-creation time (see requiresSpecificProductForCaseUnit in tradePromotions.js).
//
// A new reward type is added by adding one entry here (plus a new value in
// TRADE_PROMOTION_REWARD_TYPES, and new rule fields if needed) — nothing else in the
// engine or its callers ever needs to change.
export const REWARD_CALCULATORS = {
  // Buy 12 Pieces -> 1 Piece: floor(120/12)=10 pieces. Buy 1 Case -> 1 Piece: floor(9
  // cases-in-pieces / 1 case-in-pieces) pieces earned.
  FREE_QUANTITY(rule, matchedQuantityPieces, qualifyingLineValue, product) {
    const buyPieces = buyQuantityInPieces(rule, product);
    if (buyPieces <= 0) return null;
    const multiples = Math.floor(matchedQuantityPieces / buyPieces);
    if (multiples <= 0) return null;
    const rewardPieces = rewardQuantityInPieces(rule, product);
    return { kind: "QUANTITY", quantity: multiples * rewardPieces, amount: 0, multiples };
  },

  // Buy 100 Cases -> ৳500: floor(250/100)=2 -> ৳1000.
  FIXED_AMOUNT(rule, matchedQuantityPieces, qualifyingLineValue, product) {
    const buyPieces = buyQuantityInPieces(rule, product);
    if (buyPieces <= 0) return null;
    const multiples = Math.floor(matchedQuantityPieces / buyPieces);
    if (multiples <= 0) return null;
    return { kind: "AMOUNT", quantity: 0, amount: multiples * Number(rule.rewardAmount), multiples };
  },

  // Documented assumption: PERCENTAGE follows the exact same floor-division "qualifying
  // block" mechanic as the other two reward types, for architectural consistency (a
  // generic engine shouldn't give one reward type a different qualification model than
  // the others). The percentage is applied only to the value of the FULFILLED blocks
  // (multiples * buyQuantity), not the full purchased value — any remainder past the
  // last full block earns nothing, exactly like FREE_QUANTITY/FIXED_AMOUNT give no
  // partial credit for a partial block. Example: "Buy 50 Cases -> 2%", purchased 120
  // cases-worth of pieces at value V: multiples=floor(120/50)=2, qualifying pieces=100
  // cases worth, qualifyingValue = V * (100/120), earned = 2% of that. The value base is
  // the matching line items' pre-tax net line total (purchase_receipt_items.line_total),
  // keeping the incentive tied to actual goods cost, not government tax.
  PERCENTAGE(rule, matchedQuantityPieces, qualifyingLineValue, product) {
    const buyPieces = buyQuantityInPieces(rule, product);
    if (buyPieces <= 0 || matchedQuantityPieces <= 0) return null;
    const multiples = Math.floor(matchedQuantityPieces / buyPieces);
    if (multiples <= 0) return null;
    const qualifyingPieces = multiples * buyPieces;
    const unitValue = qualifyingLineValue / matchedQuantityPieces;
    const qualifyingValue = unitValue * qualifyingPieces;
    const percentage = Math.min(100, Math.max(0, Number(rule.rewardPercentage)));
    return { kind: "AMOUNT", quantity: 0, amount: qualifyingValue * percentage / 100, multiples };
  },
};

// ── Top-level matching + evaluation, called once per purchase receipt ──

// Returns the subset of `items` (shape: {id, productId, quantityPieces, lineTotal}) that
// this rule's scope covers.
export function findMatchingItemsForRule(rule, items, productMap) {
  return items.filter((item) => matchesPromotionTarget(rule, productMap.get(item.productId)));
}

// Evaluates ONE rule against the full set of purchase line items. Returns null if the
// rule doesn't qualify (no matching items, or matched quantity below the buy threshold).
export function evaluateRule(rule, items, productMap) {
  const matchingItems = findMatchingItemsForRule(rule, items, productMap);
  if (!matchingItems.length) return null;

  const matchedQuantityPieces = matchingItems.reduce((sum, item) => sum + Number(item.quantityPieces || 0), 0);
  const qualifyingLineValue = matchingItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
  const product = rule.targetType === TRADE_PROMOTION_TARGET_TYPES.PRODUCT ? productMap.get(rule.targetId) : null;

  const calculator = REWARD_CALCULATORS[rule.rewardType];
  if (!calculator) return null;

  const result = calculator(rule, matchedQuantityPieces, qualifyingLineValue, product);
  if (!result) return null;

  const productId = rule.targetType === TRADE_PROMOTION_TARGET_TYPES.PRODUCT ? rule.targetId : null;

  return {
    rule,
    matchedItemIds: matchingItems.map((item) => item.id),
    matchedQuantityPieces,
    qualifyingLineValue,
    productId,
    ...result,
  };
}

// Called once per purchase receipt with ALL active, date-in-range, supplier-matching
// candidate rules (pre-filtered by SQL). Returns one evaluation result per qualifying
// rule — deliberately NOT best-match-only: every matching rule stacks and earns its own
// record.
export function evaluateAllRules(rules, items, productMap, { supplierId, purchaseDate } = {}) {
  return rules
    .filter((rule) => isSupplierMatch(rule, supplierId) && isRuleActiveForDate(rule, purchaseDate))
    .map((rule) => evaluateRule(rule, items, productMap))
    .filter(Boolean);
}
