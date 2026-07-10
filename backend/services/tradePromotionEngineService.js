import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { evaluateAllRules } from "../lib/tradePromotionEngine.js";
import { TRADE_PROMOTION_EARNING_STATUSES } from "../lib/tradePromotions.js";
import { TRADE_PROMOTION_EARNING_ACTIONS } from "../lib/auditActions.js";
import { JOURNAL_SOURCE_TYPES } from "../lib/journalSourceTypes.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { logActivity } from "./shared/inventoryHelpers.js";
import { listActiveTradePromotionRulesForDate } from "../repositories/tradePromotionRuleRepository.js";
import {
  insertTradePromotionEarning,
  findTradePromotionEarningsByPurchase,
  findTradePromotionEarningById,
  updateTradePromotionEarningStatus,
  deleteTradePromotionEarning,
  mapTradePromotionEarning,
  listTradePromotionEarningsPage,
  countTradePromotionEarnings,
  getSupplierPromotionSummary,
  getProductPromotionSummary,
  getDateWisePromotionReport,
} from "../repositories/tradePromotionEarningRepository.js";

const DATE_ERROR = "Date must be in YYYY-MM-DD format.";

export class TradePromotionEngineService {
  constructor(databaseManager, { auditService, journalService } = {}) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
    this.journalService = journalService;
  }

  recordActivity(client, actor, payload) {
    return logActivity(this.auditService, client, actor, payload);
  }

  // Called from PurchaseReceiveService.createPurchaseReceiptRecord, INSIDE the same
  // transaction, right after the purchase's line items are inserted. `items` is
  // base.items (each: {id, productId, quantityPieces, lineTotal}); `productMap` is the
  // Map<productId, rawDbRow> already built by the caller via lockProducts (raw
  // snake_case rows — see lib/tradePromotionEngine.js's note on this).
  async evaluatePurchaseReceipt(client, { purchaseReceiptId, supplierId, purchaseDate, items, productMap }, actor) {
    const rules = await listActiveTradePromotionRulesForDate(client, actor.tenantId, purchaseDate);
    if (!rules.length) return [];

    const results = evaluateAllRules(rules, items, productMap, { supplierId, purchaseDate });
    const earnings = [];
    for (const result of results) {
      const earning = await this.createEarningRecord(client, { purchaseReceiptId, supplierId, purchaseDate, result }, actor);
      earnings.push(earning);
    }
    return earnings;
  }

  async createEarningRecord(client, { purchaseReceiptId, supplierId, purchaseDate, result }, actor) {
    const id = createId("promo-earn");
    const insertResult = await insertTradePromotionEarning(client, {
      id,
      tenantId: actor.tenantId,
      ruleId: result.rule.id,
      purchaseReceiptId,
      supplierId,
      productId: result.productId,
      matchedItemIds: result.matchedItemIds,
      purchasedQuantityPieces: result.matchedQuantityPieces,
      qualifyingValue: result.qualifyingLineValue,
      rewardKind: result.kind,
      earnedQuantityPieces: result.quantity,
      earnedAmount: result.amount,
      settlementMethod: result.rule.settlementMethod,
      status: TRADE_PROMOTION_EARNING_STATUSES.PENDING,
      earnedDate: purchaseDate,
      createdById: actor.id,
    });

    // Earn-time accrual only applies to AMOUNT-kind rewards — a FREE_QUANTITY earning
    // has no reliable per-unit dollar value to book without inventing one; its only
    // financial effect happens later, at STOCK settlement (valued then at the
    // product's current purchase price).
    if (this.journalService && result.kind === "AMOUNT" && result.amount > 0) {
      await this.journalService.postPromotionEarning(client, actor, {
        earningId: id,
        earnedDate: purchaseDate,
        ruleName: result.rule.name,
        amount: result.amount,
      });
    }

    await this.recordActivity(client, actor, {
      actionType: TRADE_PROMOTION_EARNING_ACTIONS.EARN,
      entityType: "trade_promotion_earning",
      entityId: id,
      description: `${actor.name} earned trade promotion "${result.rule.name}" on a purchase`,
      metadata: { ruleId: result.rule.id, purchaseReceiptId, kind: result.kind, quantity: result.quantity, amount: result.amount },
    });

    return mapTradePromotionEarning(insertResult.rows[0]);
  }

  // Called from PurchaseReceiveService.removePurchaseReceipt, before the stock/serial
  // reversal. Blocks the delete if any earning tied to this purchase has already been
  // (even partially) settled — settling money/stock/credit against a purchase that's
  // about to vanish would leave the settlement orphaned with nothing to reverse against.
  async reverseEarningsForPurchase(client, purchaseReceiptId, actor, reason) {
    const earnings = await findTradePromotionEarningsByPurchase(client, purchaseReceiptId, actor.tenantId);
    for (const earning of earnings) {
      if (earning.status === TRADE_PROMOTION_EARNING_STATUSES.REVERSED) continue;
      assert(
        earning.settledQuantityPieces === 0 && earning.settledAmount === 0,
        `Cannot delete this purchase — its trade promotion earning ("${earning.ruleName || earning.ruleId}") has already been settled. Reverse the settlement first.`,
      );

      await updateTradePromotionEarningStatus(client, earning.id, actor.tenantId, TRADE_PROMOTION_EARNING_STATUSES.REVERSED);
      if (this.journalService) {
        await this.journalService.reverse(client, {
          tenantId: actor.tenantId,
          sourceType: JOURNAL_SOURCE_TYPES.PROMOTION_EARNING,
          sourceId: earning.id,
          reason,
          createdById: actor.id,
        });
      }

      await this.recordActivity(client, actor, {
        actionType: TRADE_PROMOTION_EARNING_ACTIONS.REVERSE,
        entityType: "trade_promotion_earning",
        entityId: earning.id,
        description: `${actor.name} reversed trade promotion earning "${earning.ruleName || earning.ruleId}" (purchase deleted)`,
      });
    }
  }

  // Called from PurchaseReceiveService.restorePurchaseReceipt — undoes reverseEarningsForPurchase.
  async restoreEarningsForPurchase(client, purchaseReceiptId, actor) {
    const earnings = await findTradePromotionEarningsByPurchase(client, purchaseReceiptId, actor.tenantId);
    for (const earning of earnings) {
      if (earning.status !== TRADE_PROMOTION_EARNING_STATUSES.REVERSED) continue;

      await updateTradePromotionEarningStatus(client, earning.id, actor.tenantId, TRADE_PROMOTION_EARNING_STATUSES.PENDING);
      if (this.journalService) {
        await this.journalService.unreverse(client, {
          tenantId: actor.tenantId,
          sourceType: JOURNAL_SOURCE_TYPES.PROMOTION_EARNING,
          sourceId: earning.id,
        });
      }

      await this.recordActivity(client, actor, {
        actionType: TRADE_PROMOTION_EARNING_ACTIONS.RESTORE,
        entityType: "trade_promotion_earning",
        entityId: earning.id,
        description: `${actor.name} restored trade promotion earning "${earning.ruleName || earning.ruleId}" (purchase restored)`,
      });
    }
  }

  // Called from PurchaseReceiveService.updatePurchaseReceiptRecord (edit case).
  // Matched rules/quantities can change entirely when items are added/removed/resized,
  // so this isn't a delta adjustment — it's a "replace": every still-unsettled earning
  // tied to this purchase is reversed and hard-deleted, then evaluatePurchaseReceipt
  // re-runs from scratch against the edited items. Blocked entirely if any earning on
  // this purchase was already settled (its math must stay frozen; reverse the
  // settlement first if the underlying purchase really needs to change).
  async recomputeEarningsForPurchase(client, { purchaseReceiptId, supplierId, purchaseDate, items, productMap }, actor) {
    const existing = await findTradePromotionEarningsByPurchase(client, purchaseReceiptId, actor.tenantId);
    const settled = existing.filter((e) => e.settledQuantityPieces > 0 || e.settledAmount > 0);
    assert(
      settled.length === 0,
      "Cannot edit this purchase — one or more trade promotion earnings on it have already been settled. Reverse the settlement(s) first.",
    );

    for (const earning of existing) {
      if (this.journalService) {
        await this.journalService.reverse(client, {
          tenantId: actor.tenantId,
          sourceType: JOURNAL_SOURCE_TYPES.PROMOTION_EARNING,
          sourceId: earning.id,
          reason: "Purchase edited",
          createdById: actor.id,
        });
      }
      await deleteTradePromotionEarning(client, earning.id, actor.tenantId);
    }

    const recomputed = await this.evaluatePurchaseReceipt(client, { purchaseReceiptId, supplierId, purchaseDate, items, productMap }, actor);

    if (existing.length || recomputed.length) {
      await this.recordActivity(client, actor, {
        actionType: TRADE_PROMOTION_EARNING_ACTIONS.RECOMPUTE,
        entityType: "trade_promotion_earning",
        entityId: purchaseReceiptId,
        description: `${actor.name} recomputed trade promotion earnings for an edited purchase`,
        metadata: { previousCount: existing.length, newCount: recomputed.length },
      });
    }

    return recomputed;
  }

  async listEarnings(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const dateFrom = String(query.dateFrom || "").trim() ? normalizeIsoDate(query.dateFrom, query.dateFrom, DATE_ERROR) : undefined;
    const dateTo = String(query.dateTo || "").trim() ? normalizeIsoDate(query.dateTo, query.dateTo, DATE_ERROR) : undefined;

    const filters = {
      tenantId: actor.tenantId,
      status: String(query.status || "").trim().toUpperCase() || undefined,
      statuses: Array.isArray(query.statuses) && query.statuses.length ? query.statuses : undefined,
      supplierId: String(query.supplierId || "").trim() || undefined,
      productId: String(query.productId || "").trim() || undefined,
      ruleId: String(query.ruleId || "").trim() || undefined,
      search: String(query.search || "").trim() || undefined,
      dateFrom,
      dateTo,
    };

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listTradePromotionEarningsPage(client, { ...filters, limit, offset }),
        countTradePromotionEarnings(client, filters),
      ]);
      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async getEarning(earningId, actor) {
    return this.databaseManager.withClient(async (client) => {
      const result = await findTradePromotionEarningById(client, earningId, actor.tenantId);
      assert(result.rowCount > 0, "Trade promotion earning not found.", 404);
      return mapTradePromotionEarning(result.rows[0]);
    });
  }

  // ── Reports ──────────────────────────────────────────────────────────

  async getPendingPromotionsReport(query = {}, actor) {
    return this.listEarnings({ ...query, statuses: [TRADE_PROMOTION_EARNING_STATUSES.PENDING, TRADE_PROMOTION_EARNING_STATUSES.PARTIALLY_SETTLED] }, actor);
  }

  async getSettledPromotionsReport(query = {}, actor) {
    return this.listEarnings({ ...query, status: TRADE_PROMOTION_EARNING_STATUSES.SETTLED }, actor);
  }

  async getSupplierPromotionSummaryReport(query = {}, actor) {
    const dateFrom = String(query.dateFrom || "").trim() ? normalizeIsoDate(query.dateFrom, query.dateFrom, DATE_ERROR) : undefined;
    const dateTo = String(query.dateTo || "").trim() ? normalizeIsoDate(query.dateTo, query.dateTo, DATE_ERROR) : undefined;
    return this.databaseManager.withClient((client) =>
      getSupplierPromotionSummary(client, { tenantId: actor.tenantId, dateFrom, dateTo }),
    );
  }

  async getProductPromotionSummaryReport(query = {}, actor) {
    const dateFrom = String(query.dateFrom || "").trim() ? normalizeIsoDate(query.dateFrom, query.dateFrom, DATE_ERROR) : undefined;
    const dateTo = String(query.dateTo || "").trim() ? normalizeIsoDate(query.dateTo, query.dateTo, DATE_ERROR) : undefined;
    return this.databaseManager.withClient((client) =>
      getProductPromotionSummary(client, { tenantId: actor.tenantId, dateFrom, dateTo }),
    );
  }

  async getDateWisePromotionReportSummary(query = {}, actor) {
    const dateFrom = String(query.dateFrom || "").trim() ? normalizeIsoDate(query.dateFrom, query.dateFrom, DATE_ERROR) : undefined;
    const dateTo = String(query.dateTo || "").trim() ? normalizeIsoDate(query.dateTo, query.dateTo, DATE_ERROR) : undefined;
    return this.databaseManager.withClient((client) =>
      getDateWisePromotionReport(client, { tenantId: actor.tenantId, dateFrom, dateTo }),
    );
  }
}
