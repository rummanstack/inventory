import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { cleanMoney, cleanInteger } from "../lib/normalizers.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import {
  TRADE_PROMOTION_EARNING_STATUSES,
  TRADE_PROMOTION_SETTLEMENT_METHODS,
} from "../lib/tradePromotions.js";
import { TRADE_PROMOTION_SETTLEMENT_ACTIONS } from "../lib/auditActions.js";
import { JOURNAL_SOURCE_TYPES } from "../lib/journalSourceTypes.js";
import { STOCK_MOVEMENT_TYPES } from "../lib/stockMovements.js";
import { SUPPLIER_DUE_LEDGER_TYPES } from "../lib/supplierDueLedger.js";
import { logActivity, lockProducts, applyStockDelta, recordStockMovement, recordSupplierDueLedgerEntry } from "./shared/inventoryHelpers.js";
import {
  findTradePromotionEarningForUpdate,
  updateTradePromotionEarningSettlementProgress,
} from "../repositories/tradePromotionEarningRepository.js";
import {
  countTradePromotionSettlements,
  findTradePromotionSettlementById,
  findTradePromotionSettlementForUpdate,
  insertTradePromotionSettlement,
  listTradePromotionSettlementsPage,
  mapTradePromotionSettlement,
  restoreTradePromotionSettlement,
  softDeleteTradePromotionSettlement,
} from "../repositories/tradePromotionSettlementRepository.js";
import { getLatestSupplierDueLedgerEntry } from "../repositories/supplierDueLedgerRepository.js";
import { updateSupplierCurrentDue } from "../repositories/supplierRepository.js";

const DATE_ERROR = "Settlement date must be in YYYY-MM-DD format.";

// Recomputes settled totals + status from a delta (positive when settling, negative
// when voiding a settlement), then persists in one write.
async function progressEarning(client, earning, { settledQuantityDelta = 0, settledAmountDelta = 0 }) {
  const newSettledQty = Number(earning.settled_quantity_pieces) + settledQuantityDelta;
  const newSettledAmt = Number(earning.settled_amount) + settledAmountDelta;
  const fullyQty = earning.reward_kind === "QUANTITY" && newSettledQty >= Number(earning.earned_quantity_pieces);
  const fullyAmt = earning.reward_kind === "AMOUNT" && newSettledAmt >= Number(earning.earned_amount);
  const anySettled = newSettledQty > 0 || newSettledAmt > 0;
  const status = (fullyQty || fullyAmt)
    ? TRADE_PROMOTION_EARNING_STATUSES.SETTLED
    : anySettled
      ? TRADE_PROMOTION_EARNING_STATUSES.PARTIALLY_SETTLED
      : TRADE_PROMOTION_EARNING_STATUSES.PENDING;

  await updateTradePromotionEarningSettlementProgress(client, {
    id: earning.id,
    tenantId: earning.tenant_id,
    settledQuantityDelta,
    settledAmountDelta,
    status,
  });
}

export class TradePromotionSettlementService {
  constructor(databaseManager, { auditService, journalService, financeAccountService } = {}) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
    this.journalService = journalService;
    this.financeAccountService = financeAccountService;
  }

  recordActivity(client, actor, payload) {
    return logActivity(this.auditService, client, actor, payload);
  }

  async listSettlements(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const dateFrom = String(query.dateFrom || "").trim() ? normalizeIsoDate(query.dateFrom, query.dateFrom, DATE_ERROR) : undefined;
    const dateTo = String(query.dateTo || "").trim() ? normalizeIsoDate(query.dateTo, query.dateTo, DATE_ERROR) : undefined;

    const filters = {
      tenantId: actor.tenantId,
      earningId: String(query.earningId || "").trim() || undefined,
      method: String(query.method || "").trim().toUpperCase() || undefined,
      dateFrom,
      dateTo,
    };

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listTradePromotionSettlementsPage(client, { ...filters, limit, offset }),
        countTradePromotionSettlements(client, filters),
      ]);
      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async getSettlement(id, actor) {
    return this.databaseManager.withClient(async (client) => {
      const result = await findTradePromotionSettlementById(client, id, actor.tenantId);
      assert(result.rowCount > 0, "Trade promotion settlement not found.", 404);
      return mapTradePromotionSettlement(result.rows[0]);
    });
  }

  // input: { earningId, method, settlementDate, quantityPieces, amount, financeAccountType, note }
  async createSettlement(input, actor) {
    const method = String(input.method || "").trim().toUpperCase();
    assert([
      TRADE_PROMOTION_SETTLEMENT_METHODS.CASH,
      TRADE_PROMOTION_SETTLEMENT_METHODS.STOCK,
      TRADE_PROMOTION_SETTLEMENT_METHODS.CREDIT_NOTE,
    ].includes(method), "Invalid settlement method.");
    assert(input.earningId, "Earning is required.");
    const settlementDate = normalizeIsoDate(input.settlementDate, input.settlementDate, DATE_ERROR);

    return this.databaseManager.withTransaction(async (client) => {
      const earningResult = await findTradePromotionEarningForUpdate(client, input.earningId, actor.tenantId);
      assert(earningResult.rowCount > 0, "Trade promotion earning not found.", 404);
      const earning = earningResult.rows[0];

      assert(earning.status !== TRADE_PROMOTION_EARNING_STATUSES.REVERSED, "This earning was reversed and cannot be settled.", 400);
      assert(
        earning.settlement_method === TRADE_PROMOTION_SETTLEMENT_METHODS.MULTIPLE || earning.settlement_method === method,
        `This earning can only be settled via ${earning.settlement_method}.`,
        400,
      );

      const id = createId("promo-settle");
      let quantityPieces = 0;
      let amount = 0;

      if (earning.reward_kind === "QUANTITY") {
        assert(method === TRADE_PROMOTION_SETTLEMENT_METHODS.STOCK, "This earning is a quantity reward and can only be settled as STOCK.", 400);
        const remaining = Number(earning.earned_quantity_pieces) - Number(earning.settled_quantity_pieces);
        quantityPieces = cleanInteger(input.quantityPieces);
        assert(quantityPieces > 0 && quantityPieces <= remaining, `Settlement quantity must be between 1 and ${remaining}.`, 400);
        await this.applyStockSettlement(client, { id, earning, quantityPieces, settlementDate, note: input.note }, actor);
      } else {
        assert(
          [TRADE_PROMOTION_SETTLEMENT_METHODS.CASH, TRADE_PROMOTION_SETTLEMENT_METHODS.CREDIT_NOTE].includes(method),
          "This earning is an amount reward and can only be settled via CASH or CREDIT_NOTE.",
          400,
        );
        const remaining = Number(earning.earned_amount) - Number(earning.settled_amount);
        amount = cleanMoney(input.amount);
        assert(amount > 0 && amount <= remaining, `Settlement amount must be between 0 and ${remaining}.`, 400);

        if (method === TRADE_PROMOTION_SETTLEMENT_METHODS.CASH) {
          await this.applyCashSettlement(client, { id, earning, amount, settlementDate, financeAccountType: input.financeAccountType, note: input.note }, actor);
        } else {
          await this.applyCreditNoteSettlement(client, { id, earning, amount, settlementDate, note: input.note }, actor);
        }
      }

      await progressEarning(client, earning, {
        settledQuantityDelta: quantityPieces,
        settledAmountDelta: amount,
      });

      const insertResult = await insertTradePromotionSettlement(client, {
        id,
        tenantId: actor.tenantId,
        earningId: earning.id,
        method,
        settlementDate,
        quantityPieces,
        amount,
        financeAccountType: method === TRADE_PROMOTION_SETTLEMENT_METHODS.CASH ? (input.financeAccountType || "CASH") : null,
        note: String(input.note || "").trim(),
        createdById: actor.id,
      });

      await this.recordActivity(client, actor, {
        actionType: TRADE_PROMOTION_SETTLEMENT_ACTIONS.CREATE,
        entityType: "trade_promotion_settlement",
        entityId: id,
        description: `${actor.name} settled a trade promotion earning via ${method}`,
        metadata: { earningId: earning.id, method, quantityPieces, amount },
      });

      return mapTradePromotionSettlement(insertResult.rows[0]);
    });
  }

  // CASH: Dr Cash/Bank, Cr Incentive Receivable. Money physically enters the tenant's
  // cash/bank account, mirroring how supplier payments post both a journal entry and
  // call financeAccountService.
  async applyCashSettlement(client, { id, earning, amount, settlementDate, financeAccountType, note }, actor) {
    if (this.financeAccountService) {
      await this.financeAccountService.recordTransactionInClient(client, {
        accountType: financeAccountType || "CASH",
        type: "DEPOSIT",
        amount,
        date: settlementDate,
        note: note || "Trade promotion settlement",
      }, actor);
    }
    if (this.journalService) {
      await this.journalService.postPromotionSettlementCash(client, actor, {
        settlementId: id,
        settlementDate,
        amount,
        financeAccountType: financeAccountType || "CASH",
      });
    }
  }

  // STOCK: increase inventory, record a PROMOTION_RECEIPT stock movement, Dr Inventory /
  // Cr Incentive Receivable. Valued at the product's CURRENT purchase price — a free-goods
  // receipt has no purchase price of its own, so this is an explicit, documented choice.
  async applyStockSettlement(client, { id, earning, quantityPieces, settlementDate, note }, actor) {
    assert(earning.product_id, "This earning has no single product to receive stock against — settle it another way, or adjust stock manually.", 400);
    const productMap = await lockProducts(client, [earning.product_id], actor.tenantId);
    const product = productMap.get(earning.product_id);
    const unitCost = Number(product?.purchase_price || 0);
    const valueAmount = unitCost * quantityPieces;

    const nextBalance = await applyStockDelta(client, earning.product_id, actor.tenantId, quantityPieces, 0);
    await recordStockMovement(client, {
      tenantId: actor.tenantId,
      productId: earning.product_id,
      type: STOCK_MOVEMENT_TYPES.PROMOTION_RECEIPT,
      quantityIn: quantityPieces,
      quantityOut: 0,
      balanceAfter: nextBalance.stockPieces,
      referenceType: "trade_promotion_settlement",
      referenceId: id,
      note: note || "Trade promotion stock settlement",
      createdById: actor.id,
      businessDate: settlementDate,
    });

    if (this.journalService && valueAmount > 0) {
      await this.journalService.postPromotionSettlementStock(client, actor, {
        settlementId: id,
        settlementDate,
        amount: valueAmount,
      });
    }
  }

  // CREDIT_NOTE: reduce what the tenant owes the supplier. Mirrors
  // supplierDiscountService.recordFromSettlement's exact ledger shape: fetch latest
  // balance, credit reduces it, sync suppliers.current_due, Dr Accounts Payable / Cr
  // Incentive Receivable (the same "debit Accounts Payable directly" pattern
  // journalService.postSettlement already uses for supplier-attached discounts).
  async applyCreditNoteSettlement(client, { id, earning, amount, settlementDate, note }, actor) {
    const latestEntry = await getLatestSupplierDueLedgerEntry(client, earning.supplier_id, actor.tenantId);
    const currentBalance = latestEntry ? latestEntry.balanceAfter : 0;
    const nextBalance = Math.max(0, currentBalance - amount);

    await recordSupplierDueLedgerEntry(client, {
      tenantId: actor.tenantId,
      supplierId: earning.supplier_id,
      type: SUPPLIER_DUE_LEDGER_TYPES.PROMOTION_CREDIT,
      debit: 0,
      credit: amount,
      balanceAfter: nextBalance,
      referenceType: "trade_promotion_settlement",
      referenceId: id,
      note: note || "Trade promotion credit note settlement",
      createdById: actor.id,
      businessDate: settlementDate,
    });
    await updateSupplierCurrentDue(client, earning.supplier_id, actor.tenantId, nextBalance);

    if (this.journalService) {
      await this.journalService.postPromotionSettlementCreditNote(client, actor, {
        settlementId: id,
        settlementDate,
        amount,
      });
    }
  }

  async removeSettlement(id, actor, reason) {
    assert(String(reason || "").trim(), "Void reason is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const settlementResult = await findTradePromotionSettlementForUpdate(client, id, actor.tenantId);
      assert(settlementResult.rowCount > 0, "Trade promotion settlement not found.", 404);
      const settlement = settlementResult.rows[0];

      const earningResult = await findTradePromotionEarningForUpdate(client, settlement.earning_id, actor.tenantId);
      assert(earningResult.rowCount > 0, "Trade promotion earning not found.", 404);
      const earning = earningResult.rows[0];

      // Undo the specific side effect for this settlement's method.
      if (settlement.method === TRADE_PROMOTION_SETTLEMENT_METHODS.CASH) {
        if (this.financeAccountService) {
          await this.financeAccountService.recordTransactionInClient(client, {
            accountType: settlement.finance_account_type || "CASH",
            type: "WITHDRAWAL",
            amount: Number(settlement.amount),
            date: settlement.settlement_date,
            note: `Trade promotion settlement voided (${reason})`,
          }, actor);
        }
      } else if (settlement.method === TRADE_PROMOTION_SETTLEMENT_METHODS.STOCK) {
        // No need to look up the product's cost here — journalService.reverse() below
        // mirrors whatever was posted at settlement time exactly, so the reversal
        // amount is correct without recomputing it.
        await lockProducts(client, [earning.product_id], actor.tenantId);
        const nextBalance = await applyStockDelta(client, earning.product_id, actor.tenantId, -Number(settlement.quantity_pieces), 0);
        await recordStockMovement(client, {
          tenantId: actor.tenantId,
          productId: earning.product_id,
          type: STOCK_MOVEMENT_TYPES.PROMOTION_RECEIPT,
          quantityIn: 0,
          quantityOut: Number(settlement.quantity_pieces),
          balanceAfter: nextBalance.stockPieces,
          referenceType: "trade_promotion_settlement",
          referenceId: settlement.id,
          note: `Voided (${reason})`,
          createdById: actor.id,
          businessDate: settlement.settlement_date,
        });
      } else if (settlement.method === TRADE_PROMOTION_SETTLEMENT_METHODS.CREDIT_NOTE) {
        const latestEntry = await getLatestSupplierDueLedgerEntry(client, earning.supplier_id, actor.tenantId);
        const currentBalance = latestEntry ? latestEntry.balanceAfter : 0;
        const nextBalance = currentBalance + Number(settlement.amount);
        await recordSupplierDueLedgerEntry(client, {
          tenantId: actor.tenantId,
          supplierId: earning.supplier_id,
          type: SUPPLIER_DUE_LEDGER_TYPES.PROMOTION_CREDIT,
          debit: Number(settlement.amount),
          credit: 0,
          balanceAfter: nextBalance,
          referenceType: "trade_promotion_settlement",
          referenceId: settlement.id,
          note: `Voided (${reason})`,
          createdById: actor.id,
          businessDate: settlement.settlement_date,
        });
        await updateSupplierCurrentDue(client, earning.supplier_id, actor.tenantId, nextBalance);
      }

      if (this.journalService) {
        await this.journalService.reverse(client, {
          tenantId: actor.tenantId,
          sourceType: JOURNAL_SOURCE_TYPES.PROMOTION_SETTLEMENT,
          sourceId: settlement.id,
          reason,
          createdById: actor.id,
        });
      }

      await progressEarning(client, earning, {
        settledQuantityDelta: -Number(settlement.quantity_pieces),
        settledAmountDelta: -Number(settlement.amount),
      });

      await softDeleteTradePromotionSettlement(client, id, actor.tenantId, {
        deletedById: actor.id,
        deleteReason: reason,
      });

      await this.recordActivity(client, actor, {
        actionType: TRADE_PROMOTION_SETTLEMENT_ACTIONS.DELETE,
        entityType: "trade_promotion_settlement",
        entityId: id,
        description: `${actor.name} voided a trade promotion settlement (${reason})`,
      });

      return { ok: true };
    });
  }

  async restoreSettlement(id, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await restoreTradePromotionSettlement(client, id, actor.tenantId);
      assert(result.rowCount > 0, "Trade promotion settlement not found in trash.", 404);
      const settlement = result.rows[0];

      const earningResult = await findTradePromotionEarningForUpdate(client, settlement.earning_id, actor.tenantId);
      assert(earningResult.rowCount > 0, "Trade promotion earning not found.", 404);
      const earning = earningResult.rows[0];

      if (settlement.method === TRADE_PROMOTION_SETTLEMENT_METHODS.CASH) {
        if (this.financeAccountService) {
          await this.financeAccountService.recordTransactionInClient(client, {
            accountType: settlement.finance_account_type || "CASH",
            type: "DEPOSIT",
            amount: Number(settlement.amount),
            date: settlement.settlement_date,
            note: "Trade promotion settlement restored",
          }, actor);
        }
      } else if (settlement.method === TRADE_PROMOTION_SETTLEMENT_METHODS.STOCK) {
        const nextBalance = await applyStockDelta(client, earning.product_id, actor.tenantId, Number(settlement.quantity_pieces), 0);
        await recordStockMovement(client, {
          tenantId: actor.tenantId,
          productId: earning.product_id,
          type: STOCK_MOVEMENT_TYPES.PROMOTION_RECEIPT,
          quantityIn: Number(settlement.quantity_pieces),
          quantityOut: 0,
          balanceAfter: nextBalance.stockPieces,
          referenceType: "trade_promotion_settlement",
          referenceId: settlement.id,
          note: "Restored",
          createdById: actor.id,
          businessDate: settlement.settlement_date,
        });
      } else if (settlement.method === TRADE_PROMOTION_SETTLEMENT_METHODS.CREDIT_NOTE) {
        const latestEntry = await getLatestSupplierDueLedgerEntry(client, earning.supplier_id, actor.tenantId);
        const currentBalance = latestEntry ? latestEntry.balanceAfter : 0;
        const nextBalance = Math.max(0, currentBalance - Number(settlement.amount));
        await recordSupplierDueLedgerEntry(client, {
          tenantId: actor.tenantId,
          supplierId: earning.supplier_id,
          type: SUPPLIER_DUE_LEDGER_TYPES.PROMOTION_CREDIT,
          debit: 0,
          credit: Number(settlement.amount),
          balanceAfter: nextBalance,
          referenceType: "trade_promotion_settlement",
          referenceId: settlement.id,
          note: "Restored",
          createdById: actor.id,
          businessDate: settlement.settlement_date,
        });
        await updateSupplierCurrentDue(client, earning.supplier_id, actor.tenantId, nextBalance);
      }

      if (this.journalService) {
        await this.journalService.unreverse(client, {
          tenantId: actor.tenantId,
          sourceType: JOURNAL_SOURCE_TYPES.PROMOTION_SETTLEMENT,
          sourceId: settlement.id,
        });
      }

      await progressEarning(client, earning, {
        settledQuantityDelta: Number(settlement.quantity_pieces),
        settledAmountDelta: Number(settlement.amount),
      });

      await this.recordActivity(client, actor, {
        actionType: TRADE_PROMOTION_SETTLEMENT_ACTIONS.RESTORE,
        entityType: "trade_promotion_settlement",
        entityId: id,
        description: `${actor.name} restored a voided trade promotion settlement`,
      });

      return mapTradePromotionSettlement(settlement);
    });
  }
}
