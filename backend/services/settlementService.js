import { assert } from "../lib/errors.js";
import { diffFields } from "../lib/auditDiff.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { STOCK_MOVEMENT_TYPES } from "../lib/stockMovements.js";
import { cleanInteger, cleanMoney, normalizeSettlementBase, finalizeSettlementAmounts } from "../lib/normalizers.js";
import { DSR_DUE_LEDGER_TYPES } from "../lib/dsrDueLedger.js";
import { SETTLEMENT_ACTIONS } from "../lib/auditActions.js";
import { getLatestDueLedgerEntry, getFirstDueLedgerEntryForReference } from "../repositories/dsrDueLedgerRepository.js";
import { findDsrForUpdate } from "../repositories/dsrRepository.js";
import { findIssueByDateAndDsr } from "../repositories/issueRepository.js";
import {
  countSettlements,
  findDuplicateSettlement,
  findLatestSettlementForDsr,
  findSettlementByDateAndDsr,
  findSettlementById,
  insertSettlement,
  listSettlementsPage,
  mapSettlement,
  updateSettlement,
} from "../repositories/settlementRepository.js";
import {
  logActivity,
  lockProducts,
  recordStockMovement,
  recordDueLedgerEntry,
  applyStockDelta,
  sumPiecesByProduct,
} from "./shared/inventoryHelpers.js";

async function applySettlementInventoryDelta(
  client,
  previousItems,
  nextItems,
  previousExtraReturns,
  nextExtraReturns,
  tenantId,
  movementContext = {},
) {
  const previousReturnedTotals = sumPiecesByProduct(previousItems, "returnedPieces");
  const nextReturnedTotals = sumPiecesByProduct(nextItems, "returnedPieces");
  const previousDamagedTotals = sumPiecesByProduct(previousItems, "damagedPieces");
  const nextDamagedTotals = sumPiecesByProduct(nextItems, "damagedPieces");
  const previousExtraReturnedTotals = sumPiecesByProduct(previousExtraReturns, "returnedPieces");
  const nextExtraReturnedTotals = sumPiecesByProduct(nextExtraReturns, "returnedPieces");
  const previousExtraDamagedTotals = sumPiecesByProduct(previousExtraReturns, "damagedPieces");
  const nextExtraDamagedTotals = sumPiecesByProduct(nextExtraReturns, "damagedPieces");
  const productIds = [
    ...new Set([
      ...previousReturnedTotals.keys(),
      ...nextReturnedTotals.keys(),
      ...previousDamagedTotals.keys(),
      ...nextDamagedTotals.keys(),
      ...previousExtraReturnedTotals.keys(),
      ...nextExtraReturnedTotals.keys(),
      ...previousExtraDamagedTotals.keys(),
      ...nextExtraDamagedTotals.keys(),
    ].filter(Boolean)),
  ];
  const productMap = await lockProducts(client, productIds, tenantId);

  for (const productId of productIds) {
    const previousReturned = previousReturnedTotals.get(productId) || 0;
    const nextReturned = nextReturnedTotals.get(productId) || 0;
    const previousDamaged = previousDamagedTotals.get(productId) || 0;
    const nextDamaged = nextDamagedTotals.get(productId) || 0;
    const previousExtraReturned = previousExtraReturnedTotals.get(productId) || 0;
    const nextExtraReturned = nextExtraReturnedTotals.get(productId) || 0;
    const previousExtraDamaged = previousExtraDamagedTotals.get(productId) || 0;
    const nextExtraDamaged = nextExtraDamagedTotals.get(productId) || 0;
    const settlementReturnDifference = nextReturned - previousReturned;
    const extraReturnDifference = nextExtraReturned - previousExtraReturned;
    const damagedDifference = nextDamaged + nextExtraDamaged - previousDamaged - previousExtraDamaged;
    const goodDifference = settlementReturnDifference + extraReturnDifference;

    if (goodDifference === 0 && damagedDifference === 0) {
      continue;
    }

    const product = productMap.get(productId);
    if (goodDifference < 0) {
      assert(
        Number(product.stock_pieces) >= Math.abs(goodDifference),
        `${product.name} does not have enough available stock for this settlement change.`,
      );
    }
    if (damagedDifference < 0) {
      assert(
        Number(product.damaged_pieces || 0) >= Math.abs(damagedDifference),
        `${product.name} does not have enough damaged stock for this settlement change.`,
      );
    }

    let currentBalance = Number(product.stock_pieces || 0);
    let currentDamaged = Number(product.damaged_pieces || 0);

    const returnMovements = [
      {
        type: STOCK_MOVEMENT_TYPES.SETTLEMENT_RETURN,
        difference: settlementReturnDifference,
        defaultNote: "Settlement return stock movement",
      },
      {
        type: STOCK_MOVEMENT_TYPES.EXTRA_RETURN,
        difference: extraReturnDifference,
        defaultNote: "Extra return stock movement",
      },
    ]
      .filter((entry) => entry.difference !== 0)
      .sort((left, right) => right.difference - left.difference);

    for (const movement of returnMovements) {
      if (movement.difference < 0) {
        assert(
          currentBalance >= Math.abs(movement.difference),
          `${product.name} does not have enough available stock for this settlement change.`,
        );
      }

      const nextBalance = await applyStockDelta(client, productId, tenantId, movement.difference, 0);
      currentBalance = nextBalance.stockPieces;
      await recordStockMovement(client, {
        tenantId,
        productId,
        type: movement.type,
        quantityIn: movement.difference > 0 ? movement.difference : 0,
        quantityOut: movement.difference < 0 ? Math.abs(movement.difference) : 0,
        balanceAfter: currentBalance,
        referenceType: "settlement",
        referenceId: movementContext.referenceId,
        note: movementContext.note || movement.defaultNote,
        createdById: movementContext.createdById,
        businessDate: movementContext.businessDate,
      });
    }

    if (damagedDifference !== 0) {
      const nextBalance = await applyStockDelta(client, productId, tenantId, 0, damagedDifference);
      currentBalance = nextBalance.stockPieces;
      currentDamaged = nextBalance.damagedPieces;
      await recordStockMovement(client, {
        tenantId,
        productId,
        type: STOCK_MOVEMENT_TYPES.DAMAGE,
        quantityIn: damagedDifference < 0 ? Math.abs(damagedDifference) : 0,
        quantityOut: damagedDifference > 0 ? damagedDifference : 0,
        balanceAfter: currentBalance,
        referenceType: "settlement",
        referenceId: movementContext.referenceId,
        note: movementContext.note || `Damaged stock movement. Damaged balance: ${currentDamaged} pcs`,
        createdById: movementContext.createdById,
        businessDate: movementContext.businessDate,
      });
    }
  }
}

function syncSettlementItemsWithIssue(issueItems, settlementItems) {
  const settlementMap = new Map(
    (Array.isArray(settlementItems) ? settlementItems : []).map((item) => [item.productId, item]),
  );

  return issueItems.map((issueItem) => {
    const previousSettlementItem = settlementMap.get(issueItem.productId);
    const returnedPieces = cleanInteger(previousSettlementItem?.returnedPieces);
    const damagedPieces = cleanInteger(previousSettlementItem?.damagedPieces);
    assert(
      returnedPieces + damagedPieces <= issueItem.issuedPieces,
      `${issueItem.productName} returned quantity cannot be greater than issued quantity after the issue update.`,
    );
    const soldPieces = Math.max(issueItem.issuedPieces - returnedPieces - damagedPieces, 0);
    const rate = Number(issueItem.rate || 0);

    return {
      productId: issueItem.productId,
      productName: issueItem.productName,
      piecesPerCase: issueItem.piecesPerCase,
      issuedPieces: issueItem.issuedPieces,
      returnedPieces,
      damagedPieces,
      soldPieces,
      rate,
      payable: soldPieces * rate,
    };
  });
}

async function buildTrustedExtraReturns(client, extraReturns, tenantId) {
  const productIds = [...new Set((Array.isArray(extraReturns) ? extraReturns : []).map((item) => item.productId).filter(Boolean))];
  if (!productIds.length) {
    return [];
  }

  const productMap = await lockProducts(client, productIds, tenantId);
  return extraReturns.map((item) => {
    const product = productMap.get(item.productId);
    const returnedPieces = cleanInteger(item.returnedPieces);
    const damagedPieces = cleanInteger(item.damagedPieces);
    const rate = Number(product.wholesale_price || 0);
    const returnValue = (returnedPieces + damagedPieces) * rate;

    return {
      ...item,
      productName: product.name,
      piecesPerCase: cleanInteger(product.pieces_per_case),
      returnedPieces,
      damagedPieces,
      rate,
      returnValue,
    };
  });
}

async function buildTrustedSettlementBase(client, base, issueItems, tenantId) {
  const items = syncSettlementItemsWithIssue(issueItems, base.items);
  const totalPayable = items.reduce((sum, item) => sum + Number(item.payable || 0), 0);
  const extraReturns = await buildTrustedExtraReturns(client, base.extraReturns || [], tenantId);
  const extraReturnValue = extraReturns.reduce((sum, item) => sum + Number(item.returnValue || 0), 0);

  return {
    ...base,
    items,
    extraReturns,
    totalPayable,
    extraReturnValue,
  };
}

function finalizeSettlementAmountsStrict(base, previousDue) {
  const normalizedPreviousDue = Math.max(0, cleanMoney(previousDue));
  const receivableBeforePayment = base.totalPayable + normalizedPreviousDue - base.discount - base.extraReturnValue;
  assert(receivableBeforePayment >= -0.004, "Discount and extra returns cannot be greater than the total receivable amount.");
  assert(
    Math.max(0, base.amountPaidInput) <= Math.max(0, receivableBeforePayment) + 0.004,
    "Cash received cannot be greater than the total receivable amount.",
  );
  return finalizeSettlementAmounts(base, normalizedPreviousDue);
}

function getDueLedgerChange(entry) {
  return Number(entry.debit || 0) - Number(entry.credit || 0);
}

async function getSettlementPreviousDueBaseline(client, previousSettlement, tenantId) {
  const firstEntry = await getFirstDueLedgerEntryForReference(client, {
    tenantId,
    dsrId: previousSettlement.dsr_id,
    referenceType: "settlement",
    referenceId: previousSettlement.id,
  });

  if (!firstEntry) {
    return Math.max(0, cleanMoney(previousSettlement.previous_due));
  }

  return Math.max(0, cleanMoney(firstEntry.balanceAfter) - getDueLedgerChange(firstEntry));
}

async function recordSettlementDueLedgerChanges(client, settlement, tenantId, actor, startingBalance, { saleDueAmount, collectionAmount, verb }) {
  let currentBalance = startingBalance;

  if (saleDueAmount !== 0) {
    currentBalance += saleDueAmount;
    await recordDueLedgerEntry(client, {
      tenantId,
      dsrId: settlement.dsrId,
      type: DSR_DUE_LEDGER_TYPES.SALE_DUE,
      debit: Math.max(0, saleDueAmount),
      credit: Math.max(0, -saleDueAmount),
      balanceAfter: currentBalance,
      referenceType: "settlement",
      referenceId: settlement.id,
      note: `Sale due ${verb} for ${settlement.dsrName} on ${settlement.date}`,
      createdById: actor.id,
      businessDate: settlement.date,
    });
  }

  if (collectionAmount !== 0) {
    currentBalance -= collectionAmount;
    await recordDueLedgerEntry(client, {
      tenantId,
      dsrId: settlement.dsrId,
      type: DSR_DUE_LEDGER_TYPES.COLLECTION,
      debit: Math.max(0, -collectionAmount),
      credit: Math.max(0, collectionAmount),
      balanceAfter: currentBalance,
      referenceType: "settlement",
      referenceId: settlement.id,
      note: `Collection ${verb} for ${settlement.dsrName} on ${settlement.date}`,
      createdById: actor.id,
      businessDate: settlement.date,
    });
  }

  return currentBalance;
}

export class SettlementService {
  constructor(databaseManager, { auditService, financeAccountService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
    this.financeAccountService = financeAccountService;
  }

  recordActivity(client, actor, payload) {
    return logActivity(this.auditService, client, actor, payload);
  }

  async listSettlements(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const filters = {
      tenantId: actor.tenantId,
      dsrId: String(query.dsrId || "").trim() || undefined,
      dateFrom: String(query.dateFrom || "").trim() || undefined,
      dateTo: String(query.dateTo || "").trim() || undefined,
      search: String(query.search || "").trim() || undefined,
    };

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listSettlementsPage(client, { ...filters, limit, offset }),
        countSettlements(client, filters),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async saveSettlement(input, actor) {
    const base = normalizeSettlementBase(input);
    base.tenantId = actor.tenantId;
    assert(base.date && base.dsrId, "Settlement date and DSR are required.");
    assert(base.items.length > 0, "No morning issue found for this DSR and date.");

    const tenantId = actor.tenantId;

    return this.databaseManager.withTransaction(async (client) => {
      if (input.id) {
        return this.updateSettlementRecord(client, base, input, actor, tenantId);
      }

      return this.createSettlementRecord(client, base, actor, tenantId);
    });
  }

  async createSettlementRecord(client, base, actor, tenantId) {
    const existingSettlement = await findSettlementByDateAndDsr(client, base.date, base.dsrId, tenantId);
    assert(existingSettlement.rowCount === 0, "Settlement is already completed for this DSR and date.");

    const issueResult = await findIssueByDateAndDsr(client, base.date, base.dsrId, tenantId);
    assert(issueResult.rowCount > 0, "No morning issue found for this DSR and date.");
    const trustedBase = await buildTrustedSettlementBase(
      client,
      base,
      Array.isArray(issueResult.rows[0].items) ? issueResult.rows[0].items : [],
      tenantId,
    );

    await applySettlementInventoryDelta(client, [], trustedBase.items, [], trustedBase.extraReturns || [], tenantId, {
      referenceId: trustedBase.id,
      createdById: actor.id,
      note: `Evening settlement created for ${trustedBase.dsrName} on ${trustedBase.date}`,
      businessDate: trustedBase.date,
    });

    const dsrLock = await findDsrForUpdate(client, trustedBase.dsrId, tenantId);
    assert(dsrLock.rowCount > 0, "Select a valid DSR.");

    const latestEntry = await getLatestDueLedgerEntry(client, trustedBase.dsrId, tenantId);
    let latestBalance;
    if (latestEntry) {
      latestBalance = latestEntry.balanceAfter;
    } else {
      const lastSettlementResult = await findLatestSettlementForDsr(client, trustedBase.dsrId, tenantId);
      if (lastSettlementResult.rowCount > 0) {
        latestBalance = Number(lastSettlementResult.rows[0].due_amount || 0);
      } else {
        latestBalance = Number(dsrLock.rows[0].opening_due || 0);
      }
    }

    const settlement = finalizeSettlementAmountsStrict(trustedBase, latestBalance);
    const insertResult = await insertSettlement(client, settlement);

    await recordSettlementDueLedgerChanges(client, settlement, tenantId, actor, latestBalance, {
      saleDueAmount: settlement.totalPayable - settlement.discount - settlement.extraReturnValue,
      collectionAmount: settlement.amountPaid,
      verb: "recorded",
    });

    if (this.financeAccountService && settlement.amountPaid > 0) {
      await this.financeAccountService.recordTransactionInClient(
        client,
        {
          accountType: "CASH",
          type: "DEPOSIT",
          amount: settlement.amountPaid,
          date: settlement.date,
          note: `Evening settlement received from ${settlement.dsrName}`,
        },
        actor,
      );
    }

    await this.recordActivity(client, actor, {
      actionType: SETTLEMENT_ACTIONS.CREATE,
      entityType: "settlement",
      entityId: settlement.id,
      description: `${actor.name} created evening settlement for ${settlement.dsrName}`,
      metadata: { date: settlement.date, dsrId: settlement.dsrId, totalPayable: settlement.totalPayable },
    });

    return mapSettlement(insertResult.rows[0]);
  }

  async updateSettlementRecord(client, base, input, actor, tenantId) {
    const existingSettlement = await findSettlementById(client, base.id, tenantId);
    assert(existingSettlement.rowCount > 0, "Settlement not found.", 404);

    const previousSettlement = existingSettlement.rows[0];
    const previousItems = Array.isArray(previousSettlement.items) ? previousSettlement.items : [];
    assert(
      String(previousSettlement.settlement_date) === base.date && String(previousSettlement.dsr_id) === base.dsrId,
      "Settlement date and DSR cannot be changed after settlement is completed.",
    );

    const duplicateSettlement = await findDuplicateSettlement(client, base.date, base.dsrId, base.id, tenantId);
    assert(duplicateSettlement.rowCount === 0, "Another settlement already exists for this DSR and date.");

    const issueResult = await findIssueByDateAndDsr(client, base.date, base.dsrId, tenantId);
    assert(issueResult.rowCount > 0, "No morning issue found for this DSR and date.");
    const trustedBase = await buildTrustedSettlementBase(
      client,
      base,
      Array.isArray(issueResult.rows[0].items) ? issueResult.rows[0].items : [],
      tenantId,
    );

    const previousExtraReturns = Array.isArray(previousSettlement.extra_returns)
      ? previousSettlement.extra_returns
      : Array.isArray(previousSettlement.extraReturns)
        ? previousSettlement.extraReturns
        : [];

    await applySettlementInventoryDelta(
      client,
      previousItems,
      trustedBase.items,
      previousExtraReturns,
      trustedBase.extraReturns || [],
      tenantId,
      {
        referenceId: trustedBase.id,
        createdById: actor.id,
        note: `Evening settlement updated for ${trustedBase.dsrName} on ${trustedBase.date}`,
        businessDate: trustedBase.date,
      },
    );

    const oldSaleDue =
      Number(previousSettlement.total_payable || 0) -
      Number(previousSettlement.discount || 0) -
      Number(previousSettlement.extra_return_value || 0);
    const oldCollection = Number(previousSettlement.amount_paid || 0);
    const oldNet = oldSaleDue - oldCollection;

    const dsrLock = await findDsrForUpdate(client, base.dsrId, tenantId);
    assert(dsrLock.rowCount > 0, "Select a valid DSR.");

    const previousDueForNew = await getSettlementPreviousDueBaseline(client, previousSettlement, tenantId);
    const latestEntry = await getLatestDueLedgerEntry(client, trustedBase.dsrId, tenantId);
    const latestBalance = latestEntry ? latestEntry.balanceAfter : previousDueForNew + oldNet;
    const settlement = finalizeSettlementAmountsStrict(trustedBase, previousDueForNew);

    const settlementResult = await updateSettlement(client, settlement);

    const newSaleDue = settlement.totalPayable - settlement.discount - settlement.extraReturnValue;
    const newCollection = settlement.amountPaid;

    await recordSettlementDueLedgerChanges(client, settlement, tenantId, actor, latestBalance, {
      saleDueAmount: newSaleDue - oldSaleDue,
      collectionAmount: newCollection - oldCollection,
      verb: "adjusted",
    });

    if (this.financeAccountService && newCollection !== oldCollection) {
      const diff = newCollection - oldCollection;
      await this.financeAccountService.recordTransactionInClient(
        client,
        {
          accountType: "CASH",
          type: diff > 0 ? "DEPOSIT" : "WITHDRAWAL",
          amount: Math.abs(diff),
          date: settlement.date,
          note: diff > 0
            ? `Settlement adjustment received from ${settlement.dsrName}`
            : `Settlement adjustment reversed for ${settlement.dsrName}`,
        },
        actor,
      );
    }

    const { before: settlementBefore, after: settlementAfter } = diffFields(
      {
        totalPayable: Number(previousSettlement.total_payable || 0),
        discount: Number(previousSettlement.discount || 0),
        extraReturnValue: Number(previousSettlement.extra_return_value || 0),
        amountPaid: Number(previousSettlement.amount_paid || 0),
        dueAmount: Number(previousSettlement.due_amount || 0),
      },
      {
        totalPayable: settlement.totalPayable,
        discount: settlement.discount,
        extraReturnValue: settlement.extraReturnValue,
        amountPaid: settlement.amountPaid,
        dueAmount: settlement.dueAmount,
      },
      ["totalPayable", "discount", "extraReturnValue", "amountPaid", "dueAmount"],
    );

    await this.recordActivity(client, actor, {
      actionType: SETTLEMENT_ACTIONS.UPDATE,
      entityType: "settlement",
      entityId: settlement.id,
      description: `${actor.name} updated evening settlement for ${settlement.dsrName}`,
      metadata: { date: settlement.date, dsrId: settlement.dsrId, totalPayable: settlement.totalPayable },
      before: settlementBefore,
      after: settlementAfter,
      reason: input.reason,
    });

    return mapSettlement(settlementResult.rows[0]);
  }

  async updateSettlement(settlementId, input, actor) {
    return this.saveSettlement({ ...input, id: settlementId }, actor);
  }
}
