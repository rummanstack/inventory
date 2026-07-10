export const TRADE_PROMOTION_TARGET_TYPES = { ALL: "ALL", PRODUCT: "PRODUCT", CATEGORY: "CATEGORY" };
export const TRADE_PROMOTION_TARGET_TYPE_VALUES = Object.values(TRADE_PROMOTION_TARGET_TYPES);

export const TRADE_PROMOTION_SUPPLIER_SCOPES = { ALL: "ALL", SPECIFIC: "SPECIFIC" };
export const TRADE_PROMOTION_SUPPLIER_SCOPE_VALUES = Object.values(TRADE_PROMOTION_SUPPLIER_SCOPES);

export const TRADE_PROMOTION_BUY_UNITS = { PIECE: "PIECE", CASE: "CASE" };
export const TRADE_PROMOTION_BUY_UNIT_VALUES = Object.values(TRADE_PROMOTION_BUY_UNITS);

export const TRADE_PROMOTION_REWARD_TYPES = { FREE_QUANTITY: "FREE_QUANTITY", FIXED_AMOUNT: "FIXED_AMOUNT", PERCENTAGE: "PERCENTAGE" };
export const TRADE_PROMOTION_REWARD_TYPE_VALUES = Object.values(TRADE_PROMOTION_REWARD_TYPES);

export const TRADE_PROMOTION_SETTLEMENT_METHODS = { CASH: "CASH", STOCK: "STOCK", CREDIT_NOTE: "CREDIT_NOTE", MULTIPLE: "MULTIPLE" };
export const TRADE_PROMOTION_SETTLEMENT_METHOD_VALUES = Object.values(TRADE_PROMOTION_SETTLEMENT_METHODS);

// Earning lifecycle. REVERSED (not a soft-delete) is used when the source purchase is
// deleted — the earning stays visible in the ledger with an explanatory status rather
// than vanishing, since "this promotion was earned and later reversed" is itself a fact
// worth keeping auditable.
export const TRADE_PROMOTION_EARNING_STATUSES = {
  PENDING: "PENDING",
  PARTIALLY_SETTLED: "PARTIALLY_SETTLED",
  SETTLED: "SETTLED",
  REVERSED: "REVERSED",
};
export const TRADE_PROMOTION_EARNING_STATUS_VALUES = Object.values(TRADE_PROMOTION_EARNING_STATUSES);

// CASE buy/reward units are only resolvable for a specific product (case size =
// products.pieces_per_case, a per-product attribute). ALL/CATEGORY-scoped rules have no
// single deterministic case size, so they're restricted to PIECE. Enforced at rule
// create/update time and re-checked defensively inside the pure engine.
export function requiresSpecificProductForCaseUnit(targetType, buyUnit, rewardUnit) {
  return targetType !== TRADE_PROMOTION_TARGET_TYPES.PRODUCT &&
    (buyUnit === TRADE_PROMOTION_BUY_UNITS.CASE || rewardUnit === TRADE_PROMOTION_BUY_UNITS.CASE);
}
