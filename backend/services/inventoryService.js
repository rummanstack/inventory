import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { diffFields } from "../lib/auditDiff.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { STOCK_MOVEMENT_TYPES } from "../lib/stockMovements.js";
import {
  cleanInteger,
  cleanMoney,
  normalizeDsr,
  normalizeIssue,
  normalizeProduct,
  normalizeSettlementBase,
  finalizeSettlementAmounts,
} from "../lib/normalizers.js";
import { DSR_DUE_LEDGER_TYPES } from "../lib/dsrDueLedger.js";
import {
  insertDueLedgerEntry,
  getLatestDueLedgerEntry,
  getFirstDueLedgerEntryForReference,
} from "../repositories/dsrDueLedgerRepository.js";
import {
  syncDsrHistory,
  countDsrs,
  countTrashedDsrs,
  listTrashedDsrs,
  permanentlyDeleteDsr,
  restoreDsr,
  softDeleteDsr,
  findDsrById,
  insertDsr,
  listAllActiveDsrsLite,
  listDsrsPage,
  mapDsr,
  updateDsr,
} from "../repositories/dsrRepository.js";
import {
  countIssues,
  findDuplicateIssue,
  findIssueByDateAndDsr,
  findIssueById,
  insertIssue,
  listIssuesPage,
  mapIssue,
  updateIssue,
} from "../repositories/issueRepository.js";
import {
  addProductStock,
  countProducts,
  countTrashedProducts,
  listTrashedProducts,
  permanentlyDeleteProduct,
  restoreProduct,
  softDeleteProduct,
  findProductForUpdate,
  findProductsForUpdate,
  insertProduct,
  listAllActiveProductsLite,
  listProductsPage,
  mapProduct,
  updateProduct,
} from "../repositories/productRepository.js";
import { insertStockMovement } from "../repositories/stockMovementRepository.js";
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

function sumPiecesByProduct(items, field) {
  return items.reduce((map, item) => {
    const current = map.get(item.productId) || 0;
    map.set(item.productId, current + cleanInteger(item[field]));
    return map;
  }, new Map());
}

async function lockProducts(client, productIds, tenantId) {
  const uniqueIds = [...new Set(productIds.filter(Boolean))].sort();
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const result = await findProductsForUpdate(client, uniqueIds, tenantId);
  const productMap = new Map(result.rows.map((row) => [row.id, row]));

  for (const productId of uniqueIds) {
    assert(productMap.has(productId), "Product not found.", 404);
  }

  return productMap;
}

async function buildTrustedIssueItems(client, inputItems, previousItems, tenantId) {
  const totals = sumPiecesByProduct(inputItems, "issuedPieces");
  const productMap = await lockProducts(client, [...totals.keys()], tenantId);
  const previousRates = new Map(
    (Array.isArray(previousItems) ? previousItems : []).map((item) => [item.productId, Number(item.rate || 0)]),
  );

  return [...totals.entries()]
    .filter(([, issuedPieces]) => issuedPieces > 0)
    .map(([productId, issuedPieces]) => {
      const product = productMap.get(productId);
      const previousRate = previousRates.get(productId);
      return {
        productId,
        productName: product.name,
        piecesPerCase: cleanInteger(product.pieces_per_case),
        issuedPieces,
        rate: previousRate > 0 ? previousRate : Number(product.selling_price || 0),
      };
    });
}

async function recordStockMovement(client, movement) {
  const quantityIn = cleanInteger(movement.quantityIn);
  const quantityOut = cleanInteger(movement.quantityOut);

  if (quantityIn <= 0 && quantityOut <= 0) {
    return;
  }

  await insertStockMovement(client, {
    id: createId("stock-move"),
    organizationId: movement.tenantId,
    productId: movement.productId,
    type: movement.type,
    quantityIn,
    quantityOut,
    balanceAfter: cleanInteger(movement.balanceAfter),
    referenceType: movement.referenceType,
    referenceId: movement.referenceId,
    note: movement.note || "",
    createdById: movement.createdById,
  });
}

async function recordDueLedgerEntry(client, entry) {
  const debit = cleanMoney(entry.debit);
  const credit = cleanMoney(entry.credit);

  if (debit <= 0 && credit <= 0) {
    return;
  }

  await insertDueLedgerEntry(client, {
    id: createId("due-ledger"),
    organizationId: entry.tenantId,
    dsrId: entry.dsrId,
    type: entry.type,
    debit,
    credit,
    balanceAfter: entry.balanceAfter,
    referenceType: entry.referenceType,
    referenceId: entry.referenceId,
    note: entry.note || "",
    createdById: entry.createdById,
  });
}

async function applyIssueInventoryDelta(client, previousItems, nextItems, tenantId, movementContext = {}) {
  const previousTotals = sumPiecesByProduct(previousItems, "issuedPieces");
  const nextTotals = sumPiecesByProduct(nextItems, "issuedPieces");
  const productIds = [...new Set([...previousTotals.keys(), ...nextTotals.keys()])];
  const productMap = await lockProducts(client, productIds, tenantId);

  for (const productId of productIds) {
    const previousIssued = previousTotals.get(productId) || 0;
    const nextIssued = nextTotals.get(productId) || 0;
    const difference = nextIssued - previousIssued;

    if (difference === 0) {
      continue;
    }

    const product = productMap.get(productId);
    if (difference > 0) {
      assert(Number(product.stock_pieces) >= difference, `${product.name} does not have enough available stock.`);
    }

    const result = await client.query("UPDATE products SET stock_pieces = stock_pieces - $3 WHERE id = $1 AND tenant_id = $2 RETURNING stock_pieces", [
      productId,
      tenantId,
      difference,
    ]);
    const balanceAfter = Number(result.rows[0].stock_pieces || 0);
    await recordStockMovement(client, {
      tenantId,
      productId,
      type: STOCK_MOVEMENT_TYPES.MORNING_ISSUE,
      quantityIn: difference < 0 ? Math.abs(difference) : 0,
      quantityOut: difference > 0 ? difference : 0,
      balanceAfter,
      referenceType: "issue",
      referenceId: movementContext.referenceId,
      note: movementContext.note || "Morning issue stock movement",
      createdById: movementContext.createdById,
    });
  }
}

async function applyStockDelta(client, productId, tenantId, stockDifference, damagedDifference) {
  const result = await client.query(
    `UPDATE products
     SET stock_pieces = stock_pieces + $3,
         damaged_pieces = damaged_pieces + $4
     WHERE id = $1 AND tenant_id = $2
     RETURNING stock_pieces, damaged_pieces`,
    [productId, tenantId, stockDifference, damagedDifference],
  );
  assert(result.rowCount > 0, "Product not found.", 404);
  return {
    stockPieces: Number(result.rows[0].stock_pieces || 0),
    damagedPieces: Number(result.rows[0].damaged_pieces || 0),
  };
}

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
    const rate = Number(product.selling_price || 0);
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

export class InventoryService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async recordActivity(client, actor, payload) {
    if (!this.auditService || !actor) {
      return;
    }

    await this.auditService.record(client, {
      tenantId: actor.tenantId || null,
      userId: actor.id,
      actionType: payload.actionType,
      entityType: payload.entityType,
      entityId: payload.entityId,
      module: payload.module,
      before: payload.before,
      after: payload.after,
      reason: payload.reason,
      description: payload.description,
      metadata: {
        actorName: actor.name,
        actorRole: actor.role,
        ...payload.metadata,
      },
    });
  }

  async listProducts(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const search = String(query.search || "").trim();
    const tenantId = actor.tenantId;

    const client = await this.databaseManager.getPool().connect();
    try {
      const [items, total] = await Promise.all([
        listProductsPage(client, { search, tenantId, limit, offset }),
        countProducts(client, { search, tenantId }),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    } finally {
      client.release();
    }
  }

  async getProductsDirectory(actor) {
    const client = await this.databaseManager.getPool().connect();
    try {
      return { products: await listAllActiveProductsLite(client, actor.tenantId) };
    } finally {
      client.release();
    }
  }

  async listDsrs(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const search = String(query.search || "").trim();
    const tenantId = actor.tenantId;

    const client = await this.databaseManager.getPool().connect();
    try {
      const [items, total] = await Promise.all([
        listDsrsPage(client, { search, tenantId, limit, offset }),
        countDsrs(client, { search, tenantId }),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    } finally {
      client.release();
    }
  }

  async getDsrsDirectory(actor) {
    const client = await this.databaseManager.getPool().connect();
    try {
      return { dsrs: await listAllActiveDsrsLite(client, actor.tenantId) };
    } finally {
      client.release();
    }
  }

  async listIssues(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const filters = {
      tenantId: actor.tenantId,
      dsrId: String(query.dsrId || "").trim() || undefined,
      dateFrom: String(query.dateFrom || "").trim() || undefined,
      dateTo: String(query.dateTo || "").trim() || undefined,
      search: String(query.search || "").trim() || undefined,
    };

    const client = await this.databaseManager.getPool().connect();
    try {
      const [items, total] = await Promise.all([
        listIssuesPage(client, { ...filters, limit, offset }),
        countIssues(client, filters),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    } finally {
      client.release();
    }
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

    const client = await this.databaseManager.getPool().connect();
    try {
      const [items, total] = await Promise.all([
        listSettlementsPage(client, { ...filters, limit, offset }),
        countSettlements(client, filters),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    } finally {
      client.release();
    }
  }

  async saveProduct(input, actor) {
    const product = normalizeProduct(input);
    assert(product.name && product.category, "Product name and category are required.");
    assert(product.piecesPerCase > 0, "Pieces per case must be greater than zero.");
    assert(
      product.purchasePrice > 0 && product.sellingPrice > 0,
      "Purchase price and selling price must be greater than zero.",
    );

    return this.databaseManager.withTransaction(async (client) => {
      let result;

      if (input.id) {
        const existingResult = await findProductForUpdate(client, product.id, actor.tenantId);
        assert(existingResult.rowCount > 0, "Product not found.", 404);
        assert(
          !Object.prototype.hasOwnProperty.call(input, "stockPieces"),
          "Stock can only be changed through Add Stock.",
        );

        const existingProduct = existingResult.rows[0];
        const nextProduct = {
          ...product,
          tenantId: actor.tenantId,
          stockPieces: Number(existingProduct.stock_pieces),
        };

        result = await updateProduct(client, nextProduct);
        assert(result.rowCount > 0, "Product not found.", 404);
        await this.recordActivity(client, actor, {
          actionType: "product.update",
          entityType: "product",
          entityId: nextProduct.id,
          description: `${actor.name} updated product ${nextProduct.name}`,
          metadata: { name: nextProduct.name, category: nextProduct.category },
        });
      } else {
        assert(
          !Object.prototype.hasOwnProperty.call(input, "stockPieces"),
          "Stock can only be changed through Add Stock.",
        );
        product.stockPieces = 0;
        product.tenantId = actor.tenantId;
        result = await insertProduct(client, product);
        await this.recordActivity(client, actor, {
          actionType: "product.create",
          entityType: "product",
          entityId: product.id,
          description: `${actor.name} created product ${product.name}`,
          metadata: { name: product.name, category: product.category },
        });
      }

      return mapProduct(result.rows[0]);
    });
  }

  async removeProduct(productId, actor, reason) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await softDeleteProduct(client, productId, actor.tenantId, {
        deletedById: actor.id,
        deleteReason: reason,
      });
      assert(result.rowCount > 0, "Product not found.", 404);
      await this.recordActivity(client, actor, {
        actionType: "product.delete",
        entityType: "product",
        entityId: productId,
        description: `${actor.name} moved product ${productId} to trash${reason ? ` (${reason})` : ""}`,
      });
      return { ok: true };
    });
  }

  async restoreProduct(productId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await restoreProduct(client, productId, actor.tenantId);
      assert(result.rowCount > 0, "Product not found in trash.", 404);
      await this.recordActivity(client, actor, {
        actionType: "product.restore",
        entityType: "product",
        entityId: productId,
        description: `${actor.name} restored product ${result.rows[0].name} from trash`,
      });
      return { ok: true };
    });
  }

  async permanentlyDeleteProduct(productId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await permanentlyDeleteProduct(client, productId, actor.tenantId);
      assert(result.rowCount > 0, "Product not found in trash.", 404);
      await this.recordActivity(client, actor, {
        actionType: "product.permanent_delete",
        entityType: "product",
        entityId: productId,
        description: `${actor.name} permanently deleted product ${productId}`,
      });
      return { ok: true };
    });
  }

  async listTrashedProducts(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const tenantId = actor.tenantId;

    const client = await this.databaseManager.getPool().connect();
    try {
      const [items, total] = await Promise.all([
        listTrashedProducts(client, { tenantId, limit, offset }),
        countTrashedProducts(client, tenantId),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    } finally {
      client.release();
    }
  }

  async addStock(productId, addPiecesInput, actor, reason) {
    const addPieces = cleanInteger(addPiecesInput);
    assert(addPieces > 0, "Stock update must be greater than zero.");

    return this.databaseManager.withTransaction(async (client) => {
      const existingResult = await findProductForUpdate(client, productId, actor.tenantId);
      assert(existingResult.rowCount > 0, "Product not found.", 404);
      const previousStock = Number(existingResult.rows[0].stock_pieces || 0);

      const result = await addProductStock(client, productId, addPieces, actor.tenantId);
      assert(result.rowCount > 0, "Product not found.", 404);
      const product = result.rows[0];
      await recordStockMovement(client, {
        tenantId: actor.tenantId,
        productId,
        type: STOCK_MOVEMENT_TYPES.MANUAL_ADJUSTMENT,
        quantityIn: addPieces,
        quantityOut: 0,
        balanceAfter: Number(product.stock_pieces || 0),
        referenceType: "product_stock",
        referenceId: productId,
        note: `Manual stock added by ${actor.name}`,
        createdById: actor.id,
      });
      const { before, after } = diffFields(
        { stockPieces: previousStock },
        { stockPieces: Number(product.stock_pieces || 0) },
        ["stockPieces"],
      );
      await this.recordActivity(client, actor, {
        actionType: "product.stock_add",
        entityType: "product",
        entityId: productId,
        description: `${actor.name} added stock to product ${productId}`,
        metadata: { addPieces },
        before,
        after,
        reason,
      });
      return mapProduct(product);
    });
  }

  async clearDamagedStock(productId, quantityInput, actor, note) {
    const quantity = cleanInteger(quantityInput);
    assert(quantity > 0, "Quantity must be greater than zero.");

    return this.databaseManager.withTransaction(async (client) => {
      const existingResult = await findProductForUpdate(client, productId, actor.tenantId);
      assert(existingResult.rowCount > 0, "Product not found.", 404);
      const previousDamaged = Number(existingResult.rows[0].damaged_pieces || 0);
      assert(quantity <= previousDamaged, "Quantity exceeds damaged stock.");

      const result = await client.query(
        `UPDATE products
         SET damaged_pieces = damaged_pieces - $3
         WHERE id = $1 AND tenant_id = $2
         RETURNING *`,
        [productId, actor.tenantId, quantity],
      );
      const product = result.rows[0];
      await recordStockMovement(client, {
        tenantId: actor.tenantId,
        productId,
        type: STOCK_MOVEMENT_TYPES.DAMAGE_CLEAR,
        quantityIn: 0,
        quantityOut: quantity,
        balanceAfter: Number(product.damaged_pieces || 0),
        referenceType: "product_damage",
        referenceId: productId,
        note: note || `Damaged stock cleared by ${actor.name}`,
        createdById: actor.id,
      });
      const { before, after } = diffFields(
        { damagedPieces: previousDamaged },
        { damagedPieces: Number(product.damaged_pieces || 0) },
        ["damagedPieces"],
      );
      await this.recordActivity(client, actor, {
        actionType: "product.damage_clear",
        entityType: "product",
        entityId: productId,
        description: `${actor.name} cleared damaged stock for product ${productId}`,
        metadata: { quantity },
        before,
        after,
      });
      return mapProduct(product);
    });
  }

  async saveDsr(input, actor) {
    const dsr = normalizeDsr(input);
    assert(dsr.name && dsr.phone && dsr.area, "Name, phone, and area are required.");

    return this.databaseManager.withTransaction(async (client) => {
      let result;

      if (input.id) {
        const existingResult = await findDsrById(client, dsr.id, actor.tenantId);
        assert(existingResult.rowCount > 0, "DSR not found.", 404);
        const existingOpeningDue = Number(existingResult.rows[0].opening_due || 0);

        dsr.tenantId = actor.tenantId;
        result = await updateDsr(client, dsr);
        assert(result.rowCount > 0, "DSR not found.", 404);
        await syncDsrHistory(client, dsr);

        const openingDueDelta = dsr.openingDue - existingOpeningDue;
        if (openingDueDelta !== 0) {
          assert(String(input.reason || "").trim(), "Reason is required for due adjustments.");

          const latestEntry = await getLatestDueLedgerEntry(client, dsr.id, actor.tenantId);
          const latestBalance = latestEntry ? latestEntry.balanceAfter : existingOpeningDue;
          const balanceAfter = latestBalance + openingDueDelta;

          await recordDueLedgerEntry(client, {
            tenantId: actor.tenantId,
            dsrId: dsr.id,
            type: DSR_DUE_LEDGER_TYPES.MANUAL_ADJUSTMENT,
            debit: Math.max(0, openingDueDelta),
            credit: Math.max(0, -openingDueDelta),
            balanceAfter,
            referenceType: "dsr",
            referenceId: dsr.id,
            note: `Opening due adjusted for ${dsr.name}`,
            createdById: actor.id,
          });

          const { before, after } = diffFields(
            { openingDue: existingOpeningDue },
            { openingDue: dsr.openingDue },
            ["openingDue"],
          );
          await this.recordActivity(client, actor, {
            actionType: "dsr.due_adjustment",
            entityType: "dsr",
            entityId: dsr.id,
            module: "due-ledger",
            description: `${actor.name} adjusted opening due for DSR ${dsr.name}`,
            before,
            after,
            reason: input.reason,
          });
        }

        await this.recordActivity(client, actor, {
          actionType: "dsr.update",
          entityType: "dsr",
          entityId: dsr.id,
          description: `${actor.name} updated DSR ${dsr.name}`,
          metadata: { name: dsr.name, status: dsr.status, area: dsr.area },
        });
      } else {
        dsr.tenantId = actor.tenantId;
        result = await insertDsr(client, dsr);

        if (dsr.openingDue > 0) {
          await recordDueLedgerEntry(client, {
            tenantId: actor.tenantId,
            dsrId: dsr.id,
            type: DSR_DUE_LEDGER_TYPES.OPENING,
            debit: dsr.openingDue,
            credit: 0,
            balanceAfter: dsr.openingDue,
            referenceType: "dsr",
            referenceId: dsr.id,
            note: `Opening due for ${dsr.name}`,
            createdById: actor.id,
          });
        }

        await this.recordActivity(client, actor, {
          actionType: "dsr.create",
          entityType: "dsr",
          entityId: dsr.id,
          description: `${actor.name} created DSR ${dsr.name}`,
          metadata: { name: dsr.name, status: dsr.status, area: dsr.area },
        });
      }

      return mapDsr(result.rows[0]);
    });
  }

  async removeDsr(dsrId, actor, reason) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await softDeleteDsr(client, dsrId, actor.tenantId, {
        deletedById: actor.id,
        deleteReason: reason,
      });
      assert(result.rowCount > 0, "DSR not found.", 404);
      await this.recordActivity(client, actor, {
        actionType: "dsr.delete",
        entityType: "dsr",
        entityId: dsrId,
        description: `${actor.name} moved DSR ${dsrId} to trash${reason ? ` (${reason})` : ""}`,
      });
      return { ok: true };
    });
  }

  async restoreDsr(dsrId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await restoreDsr(client, dsrId, actor.tenantId);
      assert(result.rowCount > 0, "DSR not found in trash.", 404);
      await this.recordActivity(client, actor, {
        actionType: "dsr.restore",
        entityType: "dsr",
        entityId: dsrId,
        description: `${actor.name} restored DSR ${result.rows[0].name} from trash`,
      });
      return { ok: true };
    });
  }

  async permanentlyDeleteDsr(dsrId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await permanentlyDeleteDsr(client, dsrId, actor.tenantId);
      assert(result.rowCount > 0, "DSR not found in trash.", 404);
      await this.recordActivity(client, actor, {
        actionType: "dsr.permanent_delete",
        entityType: "dsr",
        entityId: dsrId,
        description: `${actor.name} permanently deleted DSR ${dsrId}`,
      });
      return { ok: true };
    });
  }

  async listTrashedDsrs(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const tenantId = actor.tenantId;

    const client = await this.databaseManager.getPool().connect();
    try {
      const [items, total] = await Promise.all([
        listTrashedDsrs(client, { tenantId, limit, offset }),
        countTrashedDsrs(client, tenantId),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    } finally {
      client.release();
    }
  }

  async saveIssue(input, actor) {
    const issue = normalizeIssue(input);
    issue.tenantId = actor.tenantId;
    assert(issue.date && issue.dsrId, "Issue date and DSR are required.");
    assert(issue.items.length > 0, "Enter issue quantity for at least one product.");

    const tenantId = actor.tenantId;

    return this.databaseManager.withTransaction(async (client) => {
      if (input.id) {
        const existingIssue = await findIssueById(client, issue.id, tenantId);
        assert(existingIssue.rowCount > 0, "Issue not found.", 404);

        const previousIssue = existingIssue.rows[0];
        const previousItems = Array.isArray(previousIssue.items) ? previousIssue.items : [];

        const settlementCheck = await findSettlementByDateAndDsr(
          client,
          previousIssue.issue_date,
          previousIssue.dsr_id,
          tenantId,
        );
        assert(settlementCheck.rowCount === 0, "This issue already has a completed settlement and cannot be edited.");

        const targetSettlementCheck = await findSettlementByDateAndDsr(client, issue.date, issue.dsrId, tenantId);
        assert(targetSettlementCheck.rowCount === 0, "Settlement is already completed for this DSR and date.");

        const duplicateIssue = await findDuplicateIssue(client, issue.date, issue.dsrId, issue.id, tenantId);
        assert(duplicateIssue.rowCount === 0, "Another morning issue already exists for this DSR and date.");

        const dsrResult = await findDsrById(client, issue.dsrId, tenantId);
        assert(dsrResult.rowCount > 0, "Select a valid DSR.");
        issue.dsrName = dsrResult.rows[0].name;
        issue.area = dsrResult.rows[0].area;
        issue.phone = dsrResult.rows[0].phone;
        issue.items = await buildTrustedIssueItems(client, issue.items, previousItems, tenantId);
        assert(issue.items.length > 0, "Enter issue quantity for at least one product.");

        await applyIssueInventoryDelta(client, previousItems, issue.items, tenantId, {
          referenceId: issue.id,
          createdById: actor.id,
          note: `Morning issue updated for ${issue.dsrName} on ${issue.date}`,
        });
        const issueResult = await updateIssue(client, issue);

        await this.recordActivity(client, actor, {
          actionType: "issue.update",
          entityType: "issue",
          entityId: issue.id,
          description: `${actor.name} updated morning issue for ${issue.dsrName}`,
          metadata: { date: issue.date, dsrId: issue.dsrId, items: issue.items.length },
        });

        return { issue: mapIssue(issueResult.rows[0]), settlement: null };
      }

      const settlementResult = await findSettlementByDateAndDsr(client, issue.date, issue.dsrId, tenantId);
      assert(settlementResult.rowCount === 0, "Settlement is already completed for this DSR and date.");

      const dsrResult = await findDsrById(client, issue.dsrId, tenantId);
      assert(dsrResult.rowCount > 0, "Select a valid DSR.");
      issue.dsrName = dsrResult.rows[0].name;
      issue.area = dsrResult.rows[0].area;
      issue.phone = dsrResult.rows[0].phone;
      issue.items = await buildTrustedIssueItems(client, issue.items, [], tenantId);
      assert(issue.items.length > 0, "Enter issue quantity for at least one product.");

      const existingIssue = await findIssueByDateAndDsr(client, issue.date, issue.dsrId, tenantId);
      assert(
        existingIssue.rowCount === 0,
        "Morning issue already exists for this DSR and date. Edit that issue instead.",
      );

      await applyIssueInventoryDelta(client, [], issue.items, tenantId, {
        referenceId: issue.id,
        createdById: actor.id,
        note: `Morning issue created for ${issue.dsrName} on ${issue.date}`,
      });
      const issueResult = await insertIssue(client, issue);
      await this.recordActivity(client, actor, {
        actionType: "issue.create",
        entityType: "issue",
        entityId: issue.id,
        description: `${actor.name} created morning issue for ${issue.dsrName}`,
        metadata: { date: issue.date, dsrId: issue.dsrId, items: issue.items.length },
      });

      return { issue: mapIssue(issueResult.rows[0]), settlement: null };
    });
  }

  async updateIssue(issueId, input, actor) {
    const issue = normalizeIssue({ ...input, id: issueId });
    issue.tenantId = actor.tenantId;
    assert(issue.date && issue.dsrId, "Issue date and DSR are required.");
    assert(issue.items.length > 0, "Enter issue quantity for at least one product.");

    const tenantId = actor.tenantId;

    return this.databaseManager.withTransaction(async (client) => {
      const existingIssue = await findIssueById(client, issue.id, tenantId);
      assert(existingIssue.rowCount > 0, "Issue not found.", 404);

      const previousIssue = existingIssue.rows[0];
      const previousItems = Array.isArray(previousIssue.items) ? previousIssue.items : [];

      const settlementCheck = await findSettlementByDateAndDsr(
        client,
        previousIssue.issue_date,
        previousIssue.dsr_id,
        tenantId,
      );
      assert(settlementCheck.rowCount === 0, "This issue already has a completed settlement and cannot be edited.");

      const targetSettlementCheck = await findSettlementByDateAndDsr(client, issue.date, issue.dsrId, tenantId);
      assert(targetSettlementCheck.rowCount === 0, "Settlement is already completed for this DSR and date.");

      const duplicateIssue = await findDuplicateIssue(client, issue.date, issue.dsrId, issue.id, tenantId);
      assert(duplicateIssue.rowCount === 0, "Another morning issue already exists for this DSR and date.");

      const dsrResult = await findDsrById(client, issue.dsrId, tenantId);
      assert(dsrResult.rowCount > 0, "Select a valid DSR.");
      issue.dsrName = dsrResult.rows[0].name;
      issue.area = dsrResult.rows[0].area;
      issue.phone = dsrResult.rows[0].phone;
      issue.items = await buildTrustedIssueItems(client, issue.items, previousItems, tenantId);
      assert(issue.items.length > 0, "Enter issue quantity for at least one product.");

      await applyIssueInventoryDelta(client, previousItems, issue.items, tenantId, {
        referenceId: issue.id,
        createdById: actor.id,
        note: `Morning issue updated for ${issue.dsrName} on ${issue.date}`,
      });
      const issueResult = await updateIssue(client, issue);
      await this.recordActivity(client, actor, {
        actionType: "issue.update",
        entityType: "issue",
        entityId: issue.id,
        description: `${actor.name} updated morning issue for ${issue.dsrName}`,
        metadata: { date: issue.date, dsrId: issue.dsrId, items: issue.items.length },
      });

      return mapIssue(issueResult.rows[0]);
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
        const existingSettlement = await findSettlementById(client, base.id, tenantId);
        assert(existingSettlement.rowCount > 0, "Settlement not found.", 404);

        const previousSettlement = existingSettlement.rows[0];
        const previousItems = Array.isArray(previousSettlement.items) ? previousSettlement.items : [];
        assert(
          String(previousSettlement.settlement_date) === base.date && String(previousSettlement.dsr_id) === base.dsrId,
          "Settlement date and DSR cannot be changed after settlement is completed.",
        );

        const duplicateSettlement = await findDuplicateSettlement(
          client,
          base.date,
          base.dsrId,
          base.id,
          tenantId,
        );
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
          },
        );

        const oldSaleDue =
          Number(previousSettlement.total_payable || 0) -
          Number(previousSettlement.discount || 0) -
          Number(previousSettlement.extra_return_value || 0);
        const oldCollection = Number(previousSettlement.amount_paid || 0);
        const oldNet = oldSaleDue - oldCollection;

        const previousDueForNew = await getSettlementPreviousDueBaseline(client, previousSettlement, tenantId);
        const latestEntry = await getLatestDueLedgerEntry(client, trustedBase.dsrId, tenantId);
        const latestBalance = latestEntry
          ? latestEntry.balanceAfter
          : previousDueForNew + oldNet;
        const settlement = finalizeSettlementAmountsStrict(trustedBase, previousDueForNew);

        const settlementResult = await updateSettlement(client, settlement);

        const newSaleDue = settlement.totalPayable - settlement.discount - settlement.extraReturnValue;
        const newCollection = settlement.amountPaid;
        const saleDueDelta = newSaleDue - oldSaleDue;
        const collectionDelta = newCollection - oldCollection;

        let currentBalance = latestBalance;

        if (saleDueDelta !== 0) {
          currentBalance += saleDueDelta;
          await recordDueLedgerEntry(client, {
            tenantId,
            dsrId: settlement.dsrId,
            type: DSR_DUE_LEDGER_TYPES.SALE_DUE,
            debit: Math.max(0, saleDueDelta),
            credit: Math.max(0, -saleDueDelta),
            balanceAfter: currentBalance,
            referenceType: "settlement",
            referenceId: settlement.id,
            note: `Sale due adjusted for ${settlement.dsrName} on ${settlement.date}`,
            createdById: actor.id,
          });
        }

        if (collectionDelta !== 0) {
          currentBalance -= collectionDelta;
          await recordDueLedgerEntry(client, {
            tenantId,
            dsrId: settlement.dsrId,
            type: DSR_DUE_LEDGER_TYPES.COLLECTION,
            debit: Math.max(0, -collectionDelta),
            credit: Math.max(0, collectionDelta),
            balanceAfter: currentBalance,
            referenceType: "settlement",
            referenceId: settlement.id,
            note: `Collection adjusted for ${settlement.dsrName} on ${settlement.date}`,
            createdById: actor.id,
          });
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
          actionType: "settlement.update",
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
      });

      const latestEntry = await getLatestDueLedgerEntry(client, trustedBase.dsrId, tenantId);
      let latestBalance;
      if (latestEntry) {
        latestBalance = latestEntry.balanceAfter;
      } else {
        const lastSettlementResult = await findLatestSettlementForDsr(client, trustedBase.dsrId, tenantId);
        if (lastSettlementResult.rowCount > 0) {
          latestBalance = Number(lastSettlementResult.rows[0].due_amount || 0);
        } else {
          const dsrResult = await findDsrById(client, trustedBase.dsrId, tenantId);
          assert(dsrResult.rowCount > 0, "Select a valid DSR.");
          latestBalance = Number(dsrResult.rows[0].opening_due || 0);
        }
      }

      const settlement = finalizeSettlementAmountsStrict(trustedBase, latestBalance);
      const insertResult = await insertSettlement(client, settlement);

      const newSaleDue = settlement.totalPayable - settlement.discount - settlement.extraReturnValue;
      const newCollection = settlement.amountPaid;

      let currentBalance = latestBalance;

      if (newSaleDue !== 0) {
        currentBalance += newSaleDue;
        await recordDueLedgerEntry(client, {
          tenantId,
          dsrId: settlement.dsrId,
          type: DSR_DUE_LEDGER_TYPES.SALE_DUE,
          debit: Math.max(0, newSaleDue),
          credit: Math.max(0, -newSaleDue),
          balanceAfter: currentBalance,
          referenceType: "settlement",
          referenceId: settlement.id,
          note: `Sale due recorded for ${settlement.dsrName} on ${settlement.date}`,
          createdById: actor.id,
        });
      }

      if (newCollection !== 0) {
        currentBalance -= newCollection;
        await recordDueLedgerEntry(client, {
          tenantId,
          dsrId: settlement.dsrId,
          type: DSR_DUE_LEDGER_TYPES.COLLECTION,
          debit: Math.max(0, -newCollection),
          credit: Math.max(0, newCollection),
          balanceAfter: currentBalance,
          referenceType: "settlement",
          referenceId: settlement.id,
          note: `Collection recorded for ${settlement.dsrName} on ${settlement.date}`,
          createdById: actor.id,
        });
      }

      await this.recordActivity(client, actor, {
        actionType: "settlement.create",
        entityType: "settlement",
        entityId: settlement.id,
        description: `${actor.name} created evening settlement for ${settlement.dsrName}`,
        metadata: { date: settlement.date, dsrId: settlement.dsrId, totalPayable: settlement.totalPayable },
      });

      return mapSettlement(insertResult.rows[0]);
    });
  }

  async updateSettlement(settlementId, input, actor) {
    return this.saveSettlement({ ...input, id: settlementId }, actor);
  }
}
