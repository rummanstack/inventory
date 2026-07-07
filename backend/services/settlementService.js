import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { diffFields } from "../lib/auditDiff.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { STOCK_MOVEMENT_TYPES } from "../lib/stockMovements.js";
import { cleanInteger, cleanMoney, normalizeSettlementBase, finalizeSettlementAmounts } from "../lib/normalizers.js";
import { DSR_DUE_LEDGER_TYPES } from "../lib/dsrDueLedger.js";
import { SR_DUE_LEDGER_TYPES } from "../lib/srDueLedger.js";
import { SETTLEMENT_ACTIONS } from "../lib/auditActions.js";
import { getLatestDueLedgerEntry, getFirstDueLedgerEntryForReference, hasManualSettlementSince } from "../repositories/dsrDueLedgerRepository.js";
import { findDsrForUpdate } from "../repositories/dsrRepository.js";
import { insertShopDueLedgerEntry, getLatestShopDueLedgerEntry } from "../repositories/shopDueLedgerRepository.js";
import { updateCustomerCurrentDue } from "../repositories/customerRepository.js";
import { findIssueByDateAndDsr } from "../repositories/issueRepository.js";
import { getLatestSrDueLedgerEntry } from "../repositories/srDueLedgerRepository.js";
import {
  countSettlements,
  findDuplicateSettlement,
  findLatestSettlementForDsr,
  findSettlementByDateAndDsr,
  findSettlementById,
  getSettlementReport,
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
  recordSrDueLedgerEntry,
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
  const totalSrHandovers = (base.srHandovers || []).reduce((sum, h) => sum + Number(h.amount || 0), 0);
  assert(base.discount <= base.totalPayable + 0.004, "Discount cannot exceed today's total payable amount.");
  const receivableBeforePayment = base.totalPayable + normalizedPreviousDue - base.discount - base.extraReturnValue - totalSrHandovers;
  assert(receivableBeforePayment >= -0.004, "SR handovers, discount and extra returns cannot be greater than the total receivable amount.");
  assert(
    Math.max(0, base.amountPaidInput) <= Math.max(0, receivableBeforePayment) + 0.004,
    "Cash received cannot be greater than the total receivable amount.",
  );
  return finalizeSettlementAmounts(base, normalizedPreviousDue);
}

async function applySrHandovers(client, srHandovers, settlementId, settlementDate, tenantId, actor) {
  for (const handover of srHandovers) {
    const srResult = await client.query(
      "SELECT * FROM srs WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL LIMIT 1",
      [handover.srId, tenantId],
    );
    if (!srResult.rowCount) continue;
    const sr = srResult.rows[0];
    const latestEntry = await getLatestSrDueLedgerEntry(client, handover.srId, tenantId);
    const currentBalance = latestEntry ? latestEntry.balanceAfter : Number(sr.opening_due || 0);
    const balanceAfter = currentBalance + handover.amount;
    await recordSrDueLedgerEntry(client, {
      tenantId,
      srId: handover.srId,
      type: SR_DUE_LEDGER_TYPES.HANDOVER,
      debit: handover.amount,
      credit: 0,
      balanceAfter,
      referenceType: "settlement",
      referenceId: settlementId,
      note: handover.note || `SR handover from DSR settlement`,
      createdById: actor.id,
      businessDate: settlementDate,
    });
  }
}

async function applySrHandoverDeltas(client, oldHandovers, newHandovers, settlementId, settlementDate, tenantId, actor) {
  const oldBySr = new Map((oldHandovers || []).map((h) => [h.srId, Number(h.amount || 0)]));
  const newBySr = new Map((newHandovers || []).map((h) => [h.srId, h]));
  const allSrIds = new Set([...oldBySr.keys(), ...newBySr.keys()]);

  for (const srId of allSrIds) {
    const oldAmount = oldBySr.get(srId) || 0;
    const newH = newBySr.get(srId);
    const newAmount = newH ? Number(newH.amount || 0) : 0;
    const delta = newAmount - oldAmount;
    if (delta === 0) continue;

    const srResult = await client.query(
      "SELECT * FROM srs WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL LIMIT 1",
      [srId, tenantId],
    );
    if (!srResult.rowCount) continue;
    const latestEntry = await getLatestSrDueLedgerEntry(client, srId, tenantId);
    const sr = srResult.rows[0];
    const currentBalance = latestEntry ? latestEntry.balanceAfter : Number(sr.opening_due || 0);
    const balanceAfter = currentBalance + delta;
    await recordSrDueLedgerEntry(client, {
      tenantId,
      srId,
      type: SR_DUE_LEDGER_TYPES.HANDOVER,
      debit: Math.max(0, delta),
      credit: Math.max(0, -delta),
      balanceAfter,
      referenceType: "settlement",
      referenceId: settlementId,
      note: newH?.note || `SR handover adjusted via settlement`,
      createdById: actor.id,
      businessDate: settlementDate,
    });
  }
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

async function applyShopDueCollections(client, shopCollections, settlementId, settlementDate, tenantId, actor) {
  for (const sc of shopCollections) {
    const shopResult = await client.query(
      `SELECT * FROM customers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL LIMIT 1`,
      [sc.shopId, tenantId],
    );
    if (!shopResult.rowCount) continue;
    const shop = shopResult.rows[0];
    const latestEntry = await getLatestShopDueLedgerEntry(client, sc.shopId, tenantId);
    const currentBalance = latestEntry ? latestEntry.balanceAfter : Number(shop.opening_due || 0);
    const balanceAfter = currentBalance - sc.amount;
    await insertShopDueLedgerEntry(client, {
      id: createId("sdl"),
      organizationId: tenantId,
      shopId: sc.shopId,
      type: "COLLECTION",
      debit: 0,
      credit: sc.amount,
      balanceAfter,
      referenceType: "settlement",
      referenceId: settlementId,
      note: sc.note || `Due collected via settlement`,
      createdById: actor.id,
      businessDate: settlementDate,
    });
    await updateCustomerCurrentDue(client, sc.shopId, tenantId, balanceAfter);
  }
}

async function applyShopDueCollectionDeltas(client, oldCollections, newCollections, settlementId, settlementDate, tenantId, actor) {
  const oldByShop = new Map((oldCollections || []).map((sc) => [sc.shopId, Number(sc.amount || 0)]));
  const newByShop = new Map((newCollections || []).map((sc) => [sc.shopId, sc]));
  const allShopIds = new Set([...oldByShop.keys(), ...newByShop.keys()]);

  for (const shopId of allShopIds) {
    const oldAmount = oldByShop.get(shopId) || 0;
    const newSc = newByShop.get(shopId);
    const newAmount = newSc ? Number(newSc.amount || 0) : 0;
    const delta = newAmount - oldAmount;
    if (delta === 0) continue;

    const shopResult = await client.query(
      `SELECT * FROM customers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL LIMIT 1`,
      [shopId, tenantId],
    );
    if (!shopResult.rowCount) continue;
    const shop = shopResult.rows[0];
    const latestEntry = await getLatestShopDueLedgerEntry(client, shopId, tenantId);
    const currentBalance = latestEntry ? latestEntry.balanceAfter : Number(shop.opening_due || 0);
    const balanceAfter = currentBalance - delta;
    await insertShopDueLedgerEntry(client, {
      id: createId("sdl"),
      organizationId: tenantId,
      shopId,
      type: "MANUAL_ADJUSTMENT",
      debit: Math.max(0, -delta),
      credit: Math.max(0, delta),
      balanceAfter,
      referenceType: "settlement",
      referenceId: settlementId,
      note: newSc?.note || `Settlement shop due adjusted`,
      createdById: actor.id,
      businessDate: settlementDate,
    });
    await updateCustomerCurrentDue(client, shopId, tenantId, balanceAfter);
  }
}

async function recordSettlementDueLedgerChanges(client, settlement, tenantId, actor, startingBalance, { saleDueAmount, collectionAmount, srHandoverAmount, verb }) {
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

  if (srHandoverAmount !== 0) {
    currentBalance -= srHandoverAmount;
    await recordDueLedgerEntry(client, {
      tenantId,
      dsrId: settlement.dsrId,
      type: DSR_DUE_LEDGER_TYPES.COLLECTION,
      debit: Math.max(0, -srHandoverAmount),
      credit: Math.max(0, srHandoverAmount),
      balanceAfter: currentBalance,
      referenceType: "settlement",
      referenceId: settlement.id,
      note: `SR handover ${verb} for ${settlement.dsrName} on ${settlement.date}`,
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
  constructor(databaseManager, { auditService, financeAccountService, supplierDiscountService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
    this.financeAccountService = financeAccountService;
    this.supplierDiscountService = supplierDiscountService;
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

    const totalSrHandovers = (settlement.srHandovers || []).reduce((sum, h) => sum + Number(h.amount || 0), 0);

    await recordSettlementDueLedgerChanges(client, settlement, tenantId, actor, latestBalance, {
      saleDueAmount: settlement.totalPayable - settlement.discount - settlement.extraReturnValue,
      collectionAmount: settlement.amountPaid,
      srHandoverAmount: totalSrHandovers,
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

    if (this.supplierDiscountService && settlement.discount > 0) {
      await this.supplierDiscountService.recordFromSettlement(client, {
        tenantId,
        settlementId: settlement.id,
        dsrName: settlement.dsrName,
        discountDate: settlement.date,
        amount: settlement.discount,
        supplierId: settlement.discountSupplierId || null,
      }, actor);
    }

    if (settlement.srHandovers && settlement.srHandovers.length > 0) {
      await applySrHandovers(client, settlement.srHandovers, settlement.id, settlement.date, tenantId, actor);
    }

    if (settlement.shopCollections && settlement.shopCollections.length > 0) {
      await applyShopDueCollections(client, settlement.shopCollections, settlement.id, settlement.date, tenantId, actor);
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

    const today = new Date().toISOString().slice(0, 10);
    assert(
      String(previousSettlement.settlement_date) === today,
      "Only today's settlement can be edited. Apply a manual due adjustment in the DSR Due Ledger for older dates.",
      400,
    );

    const manualSettlementRecorded = await hasManualSettlementSince(client, {
      tenantId,
      dsrId: previousSettlement.dsr_id,
      since: previousSettlement.created_at,
    });
    assert(
      !manualSettlementRecorded,
      "Cannot edit this settlement — a manual due settlement was recorded for this DSR after it. Apply a manual due adjustment in the DSR Due Ledger instead.",
      400,
    );

    const latestSettlement = await findLatestSettlementForDsr(client, previousSettlement.dsr_id, tenantId);
    assert(
      latestSettlement.rowCount === 0 || latestSettlement.rows[0].id === base.id,
      "Cannot edit this settlement — later settlements exist for this DSR. Apply a manual due adjustment in the DSR Due Ledger instead.",
      400,
    );

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

    const oldSrHandovers = Array.isArray(previousSettlement.sr_handovers) ? previousSettlement.sr_handovers : [];
    const oldTotalSrHandovers = oldSrHandovers.reduce((sum, h) => sum + Number(h.amount || 0), 0);
    const oldSaleDue =
      Number(previousSettlement.total_payable || 0) -
      Number(previousSettlement.discount || 0) -
      Number(previousSettlement.extra_return_value || 0);
    const oldCollection = Number(previousSettlement.amount_paid || 0);
    const oldNet = oldSaleDue - oldCollection - oldTotalSrHandovers;

    const dsrLock = await findDsrForUpdate(client, base.dsrId, tenantId);
    assert(dsrLock.rowCount > 0, "Select a valid DSR.");

    const previousDueForNew = await getSettlementPreviousDueBaseline(client, previousSettlement, tenantId);
    const latestEntry = await getLatestDueLedgerEntry(client, trustedBase.dsrId, tenantId);
    const latestBalance = latestEntry ? latestEntry.balanceAfter : previousDueForNew + oldNet;
    const settlement = finalizeSettlementAmountsStrict(trustedBase, previousDueForNew);

    const settlementResult = await updateSettlement(client, settlement);

    const newSaleDue = settlement.totalPayable - settlement.discount - settlement.extraReturnValue;
    const newCollection = settlement.amountPaid;
    const newTotalSrHandovers = (settlement.srHandovers || []).reduce((sum, h) => sum + Number(h.amount || 0), 0);

    await recordSettlementDueLedgerChanges(client, settlement, tenantId, actor, latestBalance, {
      saleDueAmount: newSaleDue - oldSaleDue,
      collectionAmount: newCollection - oldCollection,
      srHandoverAmount: newTotalSrHandovers - oldTotalSrHandovers,
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

    if (this.supplierDiscountService) {
      await this.supplierDiscountService.recordFromSettlement(client, {
        tenantId,
        settlementId: settlement.id,
        dsrName: settlement.dsrName,
        discountDate: settlement.date,
        amount: settlement.discount,
        previousAmount: Number(previousSettlement.discount || 0),
        supplierId: settlement.discountSupplierId || null,
        previousSupplierId: previousSettlement.discount_supplier_id || null,
      }, actor);
    }

    const newSrHandovers = settlement.srHandovers || [];
    if (oldSrHandovers.length > 0 || newSrHandovers.length > 0) {
      await applySrHandoverDeltas(client, oldSrHandovers, newSrHandovers, settlement.id, settlement.date, tenantId, actor);
    }

    const oldShopCollections = Array.isArray(previousSettlement.shop_collections) ? previousSettlement.shop_collections : [];
    const newShopCollections = settlement.shopCollections || [];
    if (oldShopCollections.length > 0 || newShopCollections.length > 0) {
      await applyShopDueCollectionDeltas(client, oldShopCollections, newShopCollections, settlement.id, settlement.date, tenantId, actor);
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

  async getSettlementReport(query = {}, actor) {
    const dateFrom = String(query.dateFrom || "").trim() || undefined;
    const dateTo = String(query.dateTo || "").trim() || undefined;
    const dsrId = String(query.dsrId || "").trim() || undefined;
    return this.databaseManager.withClient(async (client) => {
      const rows = await getSettlementReport(client, { tenantId: actor.tenantId, dateFrom, dateTo, dsrId });
      return { rows, dateFrom: dateFrom || null, dateTo: dateTo || null };
    });
  }
}
