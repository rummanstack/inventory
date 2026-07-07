import { assert } from "../lib/errors.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { STOCK_MOVEMENT_TYPES } from "../lib/stockMovements.js";
import { cleanInteger, normalizeIssue } from "../lib/normalizers.js";
import { findDsrById } from "../repositories/dsrRepository.js";
import { pickFefoForSale, decrementDrugBatch, incrementDrugBatch } from "../repositories/drugBatchRepository.js";
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
import { findSettlementByDateAndDsr } from "../repositories/settlementRepository.js";
import { ISSUE_ACTIONS } from "../lib/auditActions.js";
import { logActivity, lockProducts, recordStockMovement, sumPiecesByProduct } from "./shared/inventoryHelpers.js";

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
        rate: previousRate > 0 ? previousRate : Number(product.wholesale_price || 0),
        costPrice: Number(product.purchase_price || 0),
      };
    });
}

// Assigns FEFO batch allocations to each issue item and returns enriched items.
// Items without drug_batches (pre-pharmacy stock) get batchAllocations: [].
async function enrichItemsWithBatches(client, items, tenantId) {
  const enriched = [];
  for (const item of items) {
    const assignments = await pickFefoForSale(client, {
      tenantId,
      productId: item.productId,
      quantityNeeded: item.issuedPieces,
    });
    for (const a of assignments) {
      await decrementDrugBatch(client, a.batchId, tenantId, a.qtyToTake);
    }
    enriched.push({
      ...item,
      batchAllocations: assignments.map((a) => ({
        batchId: a.batchId,
        batchNumber: a.batchNumber,
        lotNumber: a.lotNumber,
        expiryDate: a.expiryDate,
        qty: a.qtyToTake,
      })),
    });
  }
  return enriched;
}

// Restores drug_batch quantities that were previously decremented for an issue's JSONB items.
async function restoreIssueBatchAllocations(client, previousItems, tenantId) {
  for (const item of previousItems) {
    const allocations = Array.isArray(item.batchAllocations) ? item.batchAllocations : [];
    for (const a of allocations) {
      if (a.batchId && a.qty > 0) {
        await incrementDrugBatch(client, a.batchId, tenantId, a.qty);
      }
    }
  }
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
      businessDate: movementContext.businessDate,
    });
  }
}

export class IssueService {
  constructor(databaseManager, { auditService, journalService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
    this.journalService = journalService;
  }

  recordActivity(client, actor, payload) {
    return logActivity(this.auditService, client, actor, payload);
  }

  async postIssueJournal(client, actor, issue) {
    if (!this.journalService) return;
    const totalCost = issue.items.reduce((sum, item) => sum + Number(item.costPrice || 0) * item.issuedPieces, 0);
    await this.journalService.postMorningIssue(client, actor, {
      issueId: issue.id,
      issueDate: issue.date,
      dsrName: issue.dsrName,
      totalCost,
    });
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

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listIssuesPage(client, { ...filters, limit, offset }),
        countIssues(client, filters),
      ]);

      return buildPageResult({ items, total, page, pageSize });
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

        await restoreIssueBatchAllocations(client, previousItems, tenantId);
        issue.items = await enrichItemsWithBatches(client, issue.items, tenantId);

        await applyIssueInventoryDelta(client, previousItems, issue.items, tenantId, {
          referenceId: issue.id,
          createdById: actor.id,
          note: `Morning issue updated for ${issue.dsrName} on ${issue.date}`,
          businessDate: issue.date,
        });
        const issueResult = await updateIssue(client, issue);
        await this.postIssueJournal(client, actor, issue);

        await this.recordActivity(client, actor, {
          actionType: ISSUE_ACTIONS.UPDATE,
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

      issue.items = await enrichItemsWithBatches(client, issue.items, tenantId);

      await applyIssueInventoryDelta(client, [], issue.items, tenantId, {
        referenceId: issue.id,
        createdById: actor.id,
        note: `Morning issue created for ${issue.dsrName} on ${issue.date}`,
        businessDate: issue.date,
      });
      const issueResult = await insertIssue(client, issue);
      await this.postIssueJournal(client, actor, issue);
      await this.recordActivity(client, actor, {
        actionType: ISSUE_ACTIONS.CREATE,
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

      const today = new Date().toISOString().slice(0, 10);
      assert(String(previousIssue.issue_date) === today, "Only today's morning issue can be edited.", 400);
      assert(issue.date === today, "Morning issue date cannot be moved to another day.", 400);

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
        businessDate: issue.date,
      });
      const issueResult = await updateIssue(client, issue);
      await this.postIssueJournal(client, actor, issue);
      await this.recordActivity(client, actor, {
        actionType: ISSUE_ACTIONS.UPDATE,
        entityType: "issue",
        entityId: issue.id,
        description: `${actor.name} updated morning issue for ${issue.dsrName}`,
        metadata: { date: issue.date, dsrId: issue.dsrId, items: issue.items.length },
      });

      return mapIssue(issueResult.rows[0]);
    });
  }
}
