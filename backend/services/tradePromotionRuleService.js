import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { cleanMoney } from "../lib/normalizers.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import {
  TRADE_PROMOTION_SUPPLIER_SCOPE_VALUES,
  TRADE_PROMOTION_TARGET_TYPE_VALUES,
  TRADE_PROMOTION_BUY_UNIT_VALUES,
  TRADE_PROMOTION_REWARD_TYPE_VALUES,
  TRADE_PROMOTION_REWARD_TYPES,
  TRADE_PROMOTION_SETTLEMENT_METHOD_VALUES,
  TRADE_PROMOTION_TARGET_TYPES,
  TRADE_PROMOTION_SUPPLIER_SCOPES,
  requiresSpecificProductForCaseUnit,
} from "../lib/tradePromotions.js";
import { TRADE_PROMOTION_RULE_ACTIONS } from "../lib/auditActions.js";
import { logActivity } from "./shared/inventoryHelpers.js";
import {
  countTradePromotionRules,
  countTrashedTradePromotionRules,
  countEarningsReferencingRule,
  findTradePromotionRuleById,
  findTradePromotionRuleForUpdate,
  insertTradePromotionRule,
  listTradePromotionRulesPage,
  listTrashedTradePromotionRules,
  mapTradePromotionRule,
  permanentlyDeleteTradePromotionRule,
  restoreTradePromotionRule,
  softDeleteTradePromotionRule,
  updateTradePromotionRule,
} from "../repositories/tradePromotionRuleRepository.js";
import { findSupplierById } from "../repositories/supplierRepository.js";
import { findProductForUpdate } from "../repositories/productRepository.js";
import { findCategoryById } from "../repositories/categoryRepository.js";

const DATE_ERROR = "Date must be in YYYY-MM-DD format.";

function normalizeRuleInput(input) {
  return {
    id: input.id || createId("promo-rule"),
    name: String(input.name || "").trim(),
    remarks: String(input.remarks || "").trim(),
    supplierScope: String(input.supplierScope || "SPECIFIC").trim().toUpperCase(),
    supplierId: String(input.supplierId || "").trim() || null,
    targetType: String(input.targetType || "PRODUCT").trim().toUpperCase(),
    targetId: String(input.targetId || "").trim() || null,
    buyUnit: String(input.buyUnit || "PIECE").trim().toUpperCase(),
    buyQuantity: cleanMoney(input.buyQuantity),
    rewardType: String(input.rewardType || "FREE_QUANTITY").trim().toUpperCase(),
    rewardUnit: String(input.rewardUnit || "").trim().toUpperCase() || null,
    rewardQuantity: cleanMoney(input.rewardQuantity),
    rewardAmount: cleanMoney(input.rewardAmount),
    rewardPercentage: cleanMoney(input.rewardPercentage),
    settlementMethod: String(input.settlementMethod || "MULTIPLE").trim().toUpperCase(),
    effectiveFrom: String(input.effectiveFrom || "").trim() || null,
    effectiveTo: String(input.effectiveTo || "").trim() || null,
    active: input.active !== false,
    priority: Number.isFinite(Number(input.priority)) ? Math.trunc(Number(input.priority)) : 100,
  };
}

export class TradePromotionRuleService {
  constructor(databaseManager, { auditService } = {}) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  recordActivity(client, actor, payload) {
    return logActivity(this.auditService, client, actor, payload);
  }

  async listRules(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const filters = {
      tenantId: actor.tenantId,
      search: String(query.search || "").trim() || undefined,
      supplierId: String(query.supplierId || "").trim() || undefined,
      targetType: String(query.targetType || "").trim().toUpperCase() || undefined,
      active: query.active !== undefined ? query.active : undefined,
    };

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listTradePromotionRulesPage(client, { ...filters, limit, offset }),
        countTradePromotionRules(client, filters),
      ]);
      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async getRule(ruleId, actor) {
    return this.databaseManager.withClient(async (client) => {
      const result = await findTradePromotionRuleById(client, ruleId, actor.tenantId);
      assert(result.rowCount > 0, "Trade promotion rule not found.", 404);
      return mapTradePromotionRule(result.rows[0]);
    });
  }

  async validateRule(client, rule, actor) {
    assert(rule.name, "Name is required.");
    assert(TRADE_PROMOTION_SUPPLIER_SCOPE_VALUES.includes(rule.supplierScope), "Invalid supplier scope.");
    assert(TRADE_PROMOTION_TARGET_TYPE_VALUES.includes(rule.targetType), "Invalid target type.");
    assert(TRADE_PROMOTION_BUY_UNIT_VALUES.includes(rule.buyUnit), "Invalid buy unit.");
    assert(TRADE_PROMOTION_REWARD_TYPE_VALUES.includes(rule.rewardType), "Invalid reward type.");
    assert(TRADE_PROMOTION_SETTLEMENT_METHOD_VALUES.includes(rule.settlementMethod), "Invalid settlement method.");

    if (rule.supplierScope === TRADE_PROMOTION_SUPPLIER_SCOPES.SPECIFIC) {
      assert(rule.supplierId, "Select a supplier, or choose \"Any supplier\".");
      const supplierResult = await findSupplierById(client, rule.supplierId, actor.tenantId);
      assert(supplierResult.rowCount > 0, "Supplier not found.", 404);
    } else {
      rule.supplierId = null;
    }

    if (rule.targetType === TRADE_PROMOTION_TARGET_TYPES.PRODUCT) {
      assert(rule.targetId, "Select a product.");
      const productResult = await findProductForUpdate(client, rule.targetId, actor.tenantId);
      assert(productResult.rowCount > 0, "Product not found.", 404);
    } else if (rule.targetType === TRADE_PROMOTION_TARGET_TYPES.CATEGORY) {
      assert(rule.targetId, "Select a category.");
      const category = await findCategoryById(client, rule.targetId, actor.tenantId);
      assert(category, "Category not found.", 404);
    } else {
      rule.targetId = null;
    }

    assert(
      !requiresSpecificProductForCaseUnit(rule.targetType, rule.buyUnit, rule.rewardUnit),
      "CASE buy/reward units require the rule to target one specific product (case size is a per-product attribute).",
    );

    assert(rule.buyQuantity > 0, "Buy quantity must be greater than 0.");

    if (rule.rewardType === TRADE_PROMOTION_REWARD_TYPES.FREE_QUANTITY) {
      assert(rule.rewardUnit, "Reward unit is required for a free-quantity reward.");
      assert(TRADE_PROMOTION_BUY_UNIT_VALUES.includes(rule.rewardUnit), "Invalid reward unit.");
      assert(rule.rewardQuantity > 0, "Reward quantity must be greater than 0.");
    } else if (rule.rewardType === TRADE_PROMOTION_REWARD_TYPES.FIXED_AMOUNT) {
      assert(rule.rewardAmount > 0, "Reward amount must be greater than 0.");
    } else if (rule.rewardType === TRADE_PROMOTION_REWARD_TYPES.PERCENTAGE) {
      assert(rule.rewardPercentage > 0 && rule.rewardPercentage <= 100, "Reward percentage must be between 0 and 100.");
    }

    if (rule.effectiveFrom) rule.effectiveFrom = normalizeIsoDate(rule.effectiveFrom, rule.effectiveFrom, DATE_ERROR);
    if (rule.effectiveTo) rule.effectiveTo = normalizeIsoDate(rule.effectiveTo, rule.effectiveTo, DATE_ERROR);
    if (rule.effectiveFrom && rule.effectiveTo) {
      assert(rule.effectiveTo >= rule.effectiveFrom, "Effective To must be on or after Effective From.");
    }
  }

  async createRule(input, actor) {
    const rule = normalizeRuleInput(input);
    rule.tenantId = actor.tenantId;
    rule.createdById = actor.id;

    return this.databaseManager.withTransaction(async (client) => {
      await this.validateRule(client, rule, actor);
      const result = await insertTradePromotionRule(client, rule);

      await this.recordActivity(client, actor, {
        actionType: TRADE_PROMOTION_RULE_ACTIONS.CREATE,
        entityType: "trade_promotion_rule",
        entityId: rule.id,
        description: `${actor.name} created trade promotion rule "${rule.name}"`,
        metadata: { name: rule.name, rewardType: rule.rewardType },
      });

      return mapTradePromotionRule(result.rows[0]);
    });
  }

  async updateRule(ruleId, input, actor) {
    const rule = normalizeRuleInput({ ...input, id: ruleId });
    rule.tenantId = actor.tenantId;

    return this.databaseManager.withTransaction(async (client) => {
      const existingResult = await findTradePromotionRuleForUpdate(client, ruleId, actor.tenantId);
      assert(existingResult.rowCount > 0, "Trade promotion rule not found.", 404);

      await this.validateRule(client, rule, actor);
      const result = await updateTradePromotionRule(client, rule);
      assert(result.rowCount > 0, "Trade promotion rule not found.", 404);

      await this.recordActivity(client, actor, {
        actionType: TRADE_PROMOTION_RULE_ACTIONS.UPDATE,
        entityType: "trade_promotion_rule",
        entityId: ruleId,
        description: `${actor.name} updated trade promotion rule "${rule.name}"`,
        metadata: { name: rule.name },
      });

      return mapTradePromotionRule(result.rows[0]);
    });
  }

  async removeRule(ruleId, actor, reason) {
    return this.databaseManager.withTransaction(async (client) => {
      const existingResult = await findTradePromotionRuleForUpdate(client, ruleId, actor.tenantId);
      assert(existingResult.rowCount > 0, "Trade promotion rule not found.", 404);
      const existing = existingResult.rows[0];

      const result = await softDeleteTradePromotionRule(client, ruleId, actor.tenantId, {
        deletedById: actor.id,
        deleteReason: reason,
      });
      assert(result.rowCount > 0, "Trade promotion rule not found.", 404);

      await this.recordActivity(client, actor, {
        actionType: TRADE_PROMOTION_RULE_ACTIONS.DELETE,
        entityType: "trade_promotion_rule",
        entityId: ruleId,
        description: `${actor.name} deleted trade promotion rule "${existing.name}"${reason ? ` (${reason})` : ""}`,
      });

      return { ok: true };
    });
  }

  async restoreRule(ruleId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await restoreTradePromotionRule(client, ruleId, actor.tenantId);
      assert(result.rowCount > 0, "Trade promotion rule not found in trash.", 404);

      await this.recordActivity(client, actor, {
        actionType: TRADE_PROMOTION_RULE_ACTIONS.RESTORE,
        entityType: "trade_promotion_rule",
        entityId: ruleId,
        description: `${actor.name} restored trade promotion rule "${result.rows[0].name}"`,
      });

      return mapTradePromotionRule(result.rows[0]);
    });
  }

  async permanentlyDeleteRule(ruleId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const referencingCount = await countEarningsReferencingRule(client, ruleId, actor.tenantId);
      assert(referencingCount === 0, "This rule has earning history and cannot be permanently deleted.", 400);

      const result = await permanentlyDeleteTradePromotionRule(client, ruleId, actor.tenantId);
      assert(result.rowCount > 0, "Trade promotion rule not found in trash.", 404);

      return { ok: true };
    });
  }

  async listTrashed(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const tenantId = actor.tenantId;

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listTrashedTradePromotionRules(client, { tenantId, limit, offset }),
        countTrashedTradePromotionRules(client, tenantId),
      ]);
      return buildPageResult({ items, total, page, pageSize });
    });
  }
}
