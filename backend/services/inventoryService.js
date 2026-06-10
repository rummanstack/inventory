import { assert } from "../lib/errors.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import {
  cleanInteger,
  normalizeDsr,
  normalizeIssue,
  normalizeProduct,
  normalizeSettlement,
} from "../lib/normalizers.js";
import {
  syncDsrHistory,
  countDsrs,
  deleteDsr,
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
  deleteProduct,
  findProductForUpdate,
  insertProduct,
  listAllActiveProductsLite,
  listProductsPage,
  mapProduct,
  updateProduct,
} from "../repositories/productRepository.js";
import {
  countSettlements,
  findDuplicateSettlement,
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
  const uniqueIds = [...new Set(productIds.filter(Boolean))];
  const productMap = new Map();

  for (const productId of uniqueIds) {
    const result = await findProductForUpdate(client, productId, tenantId);
    assert(result.rowCount > 0, "Product not found.", 404);
    productMap.set(productId, result.rows[0]);
  }

  return productMap;
}

async function applyIssueInventoryDelta(client, previousItems, nextItems, tenantId) {
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

    await client.query("UPDATE products SET stock_pieces = stock_pieces - $3 WHERE id = $1 AND tenant_id = $2", [
      productId,
      tenantId,
      difference,
    ]);
  }
}

async function applySettlementInventoryDelta(client, previousItems, nextItems, tenantId) {
  const previousReturnedTotals = sumPiecesByProduct(previousItems, "returnedPieces");
  const nextReturnedTotals = sumPiecesByProduct(nextItems, "returnedPieces");
  const previousDamagedTotals = sumPiecesByProduct(previousItems, "damagedPieces");
  const nextDamagedTotals = sumPiecesByProduct(nextItems, "damagedPieces");
  const productIds = [...new Set([...previousReturnedTotals.keys(), ...nextReturnedTotals.keys()])];
  const productMap = await lockProducts(client, productIds, tenantId);

  for (const productId of productIds) {
    const previousReturned = previousReturnedTotals.get(productId) || 0;
    const nextReturned = nextReturnedTotals.get(productId) || 0;
    const previousDamaged = previousDamagedTotals.get(productId) || 0;
    const nextDamaged = nextDamagedTotals.get(productId) || 0;
    const goodDifference = (nextReturned - nextDamaged) - (previousReturned - previousDamaged);
    const damagedDifference = nextDamaged - previousDamaged;

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

    await client.query(
      "UPDATE products SET stock_pieces = stock_pieces + $3, damaged_pieces = damaged_pieces + $4 WHERE id = $1 AND tenant_id = $2",
      [productId, tenantId, goodDifference, damagedDifference],
    );
  }
}

function syncSettlementItemsWithIssue(issueItems, settlementItems) {
  const settlementMap = new Map(
    (Array.isArray(settlementItems) ? settlementItems : []).map((item) => [item.productId, item]),
  );

  return issueItems.map((issueItem) => {
    const previousSettlementItem = settlementMap.get(issueItem.productId);
    const returnedPieces = cleanInteger(previousSettlementItem?.returnedPieces);
    assert(
      returnedPieces <= issueItem.issuedPieces,
      `${issueItem.productName} returned quantity cannot be greater than issued quantity after the issue update.`,
    );
    const damagedPieces = Math.min(cleanInteger(previousSettlementItem?.damagedPieces), returnedPieces);
    const soldPieces = issueItem.issuedPieces - returnedPieces;
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

function getSettlementReturnItems(settlement) {
  return [
    ...(Array.isArray(settlement?.items) ? settlement.items : []),
    ...(Array.isArray(settlement?.extraReturns)
      ? settlement.extraReturns
      : Array.isArray(settlement?.extra_returns)
        ? settlement.extra_returns
        : []),
  ];
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

  async removeProduct(productId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await deleteProduct(client, productId, actor.tenantId);
      assert(result.rowCount > 0, "Product not found.", 404);
      await this.recordActivity(client, actor, {
        actionType: "product.delete",
        entityType: "product",
        entityId: productId,
        description: `${actor.name} deleted product ${productId}`,
      });
      return { ok: true };
    });
  }

  async addStock(productId, addPiecesInput, actor) {
    const addPieces = cleanInteger(addPiecesInput);
    assert(addPieces > 0, "Stock update must be greater than zero.");

    return this.databaseManager.withTransaction(async (client) => {
      const result = await addProductStock(client, productId, addPieces, actor.tenantId);
      assert(result.rowCount > 0, "Product not found.", 404);
      await this.recordActivity(client, actor, {
        actionType: "product.stock_add",
        entityType: "product",
        entityId: productId,
        description: `${actor.name} added stock to product ${productId}`,
        metadata: { addPieces },
      });
      return mapProduct(result.rows[0]);
    });
  }

  async saveDsr(input, actor) {
    const dsr = normalizeDsr(input);
    assert(dsr.name && dsr.phone && dsr.area, "Name, phone, and area are required.");

    return this.databaseManager.withTransaction(async (client) => {
      let result;

      if (input.id) {
        dsr.tenantId = actor.tenantId;
        result = await updateDsr(client, dsr);
        assert(result.rowCount > 0, "DSR not found.", 404);
        await syncDsrHistory(client, dsr);
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

  async removeDsr(dsrId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await deleteDsr(client, dsrId, actor.tenantId);
      assert(result.rowCount > 0, "DSR not found.", 404);
      await this.recordActivity(client, actor, {
        actionType: "dsr.delete",
        entityType: "dsr",
        entityId: dsrId,
        description: `${actor.name} deleted DSR ${dsrId}`,
      });
      return { ok: true };
    });
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

        if (settlementCheck.rowCount > 0) {
          assert(
            issue.date === previousIssue.issue_date && issue.dsrId === previousIssue.dsr_id,
            "When a settlement already exists, the morning issue date and DSR cannot be changed.",
          );
        }

        const targetSettlementCheck =
          issue.date === previousIssue.issue_date && issue.dsrId === previousIssue.dsr_id
            ? settlementCheck
            : await findSettlementByDateAndDsr(client, issue.date, issue.dsrId, tenantId);

        const duplicateIssue = await findDuplicateIssue(client, issue.date, issue.dsrId, issue.id, tenantId);
        assert(duplicateIssue.rowCount === 0, "Another morning issue already exists for this DSR and date.");

        const dsrResult = await findDsrById(client, issue.dsrId, tenantId);
        assert(dsrResult.rowCount > 0, "Select a valid DSR.");

        await applyIssueInventoryDelta(client, previousItems, issue.items, tenantId);
        const issueResult = await updateIssue(client, issue);

        let settlement = null;

        if (targetSettlementCheck.rowCount > 0) {
          const existingSettlement = targetSettlementCheck.rows[0];
          const nextSettlementItems = syncSettlementItemsWithIssue(issue.items, existingSettlement.items);
          const nextTotalPayable = nextSettlementItems.reduce((sum, item) => sum + Number(item.payable || 0), 0);
          const existingReturnItems = getSettlementReturnItems(existingSettlement);
          const nextExtraReturns = Array.isArray(existingSettlement.extra_returns)
            ? existingSettlement.extra_returns
            : Array.isArray(existingSettlement.extraReturns)
              ? existingSettlement.extraReturns
              : [];

          await applySettlementInventoryDelta(
            client,
            existingReturnItems,
            [...nextSettlementItems, ...nextExtraReturns],
            tenantId,
          );

          const settlementResult = await updateSettlement(client, {
            id: existingSettlement.id,
            tenantId,
            date: issue.date,
            dsrId: issue.dsrId,
            dsrName: issue.dsrName,
            area: issue.area,
            phone: issue.phone,
            issueIds: [issue.id],
            items: nextSettlementItems,
            extraReturns: nextExtraReturns,
            totalPayable: nextTotalPayable,
            previousDue: Number(existingSettlement.previous_due || 0),
            discount: Number(existingSettlement.discount || 0),
            extraReturnValue: Number(existingSettlement.extra_return_value || 0),
            amountPaid: Number(existingSettlement.amount_paid || 0),
            dueAmount: Number(existingSettlement.due_amount || 0),
            status: existingSettlement.status,
          });
          settlement = mapSettlement(settlementResult.rows[0]);
        }

        await this.recordActivity(client, actor, {
          actionType: "issue.update",
          entityType: "issue",
          entityId: issue.id,
          description: `${actor.name} updated morning issue for ${issue.dsrName}`,
          metadata: { date: issue.date, dsrId: issue.dsrId, items: issue.items.length },
        });

        return { issue: mapIssue(issueResult.rows[0]), settlement };
      }

      const settlementResult = await findSettlementByDateAndDsr(client, issue.date, issue.dsrId, tenantId);
      assert(settlementResult.rowCount === 0, "Settlement is already completed for this DSR and date.");

      const dsrResult = await findDsrById(client, issue.dsrId, tenantId);
      assert(dsrResult.rowCount > 0, "Select a valid DSR.");

      const existingIssue = await findIssueByDateAndDsr(client, issue.date, issue.dsrId, tenantId);
      assert(
        existingIssue.rowCount === 0,
        "Morning issue already exists for this DSR and date. Edit that issue instead.",
      );

      await applyIssueInventoryDelta(client, [], issue.items, tenantId);
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

      await applyIssueInventoryDelta(client, previousItems, issue.items, tenantId);
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
    const settlement = normalizeSettlement(input);
    settlement.tenantId = actor.tenantId;
    assert(settlement.date && settlement.dsrId, "Settlement date and DSR are required.");
    assert(settlement.items.length > 0, "No morning issue found for this DSR and date.");

    const tenantId = actor.tenantId;

    return this.databaseManager.withTransaction(async (client) => {
      if (input.id) {
        const existingSettlement = await findSettlementById(client, settlement.id, tenantId);
        assert(existingSettlement.rowCount > 0, "Settlement not found.", 404);

        const previousSettlement = existingSettlement.rows[0];
        const previousItems = Array.isArray(previousSettlement.items) ? previousSettlement.items : [];

        const duplicateSettlement = await findDuplicateSettlement(
          client,
          settlement.date,
          settlement.dsrId,
          settlement.id,
          tenantId,
        );
        assert(duplicateSettlement.rowCount === 0, "Another settlement already exists for this DSR and date.");

        const issueResult = await findIssueByDateAndDsr(client, settlement.date, settlement.dsrId, tenantId);
        assert(issueResult.rowCount > 0, "No morning issue found for this DSR and date.");

        for (const item of settlement.items) {
          assert(item.returnedPieces <= item.issuedPieces, "Returned quantity cannot be greater than issued quantity.");
        }

        const previousReturnItems = getSettlementReturnItems(previousSettlement);
        const nextReturnItems = getSettlementReturnItems(settlement);

        await applySettlementInventoryDelta(client, previousReturnItems, nextReturnItems, tenantId);
        const settlementResult = await updateSettlement(client, settlement);
        await this.recordActivity(client, actor, {
          actionType: "settlement.update",
          entityType: "settlement",
          entityId: settlement.id,
          description: `${actor.name} updated evening settlement for ${settlement.dsrName}`,
          metadata: { date: settlement.date, dsrId: settlement.dsrId, totalPayable: settlement.totalPayable },
        });

        return mapSettlement(settlementResult.rows[0]);
      }

      const existingSettlement = await findSettlementByDateAndDsr(client, settlement.date, settlement.dsrId, tenantId);
      assert(existingSettlement.rowCount === 0, "Settlement is already completed for this DSR and date.");

      const issueResult = await findIssueByDateAndDsr(client, settlement.date, settlement.dsrId, tenantId);
      assert(issueResult.rowCount > 0, "No morning issue found for this DSR and date.");

      for (const item of settlement.items) {
        assert(item.returnedPieces <= item.issuedPieces, "Returned quantity cannot be greater than issued quantity.");
      }

      await applySettlementInventoryDelta(client, [], getSettlementReturnItems(settlement), tenantId);
      const insertResult = await insertSettlement(client, settlement);
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
