import { assert } from "../../lib/errors.js";
import { createId } from "../../lib/ids.js";
import { cleanInteger, cleanMoney } from "../../lib/normalizers.js";
import { insertDueLedgerEntry } from "../../repositories/dsrDueLedgerRepository.js";
import { findProductsForUpdate } from "../../repositories/productRepository.js";
import { insertStockMovement } from "../../repositories/stockMovementRepository.js";

export function sumPiecesByProduct(items, field) {
  return items.reduce((map, item) => {
    const current = map.get(item.productId) || 0;
    map.set(item.productId, current + cleanInteger(item[field]));
    return map;
  }, new Map());
}

export async function lockProducts(client, productIds, tenantId) {
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

export async function recordStockMovement(client, movement) {
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

export async function recordDueLedgerEntry(client, entry) {
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

export async function applyStockDelta(client, productId, tenantId, stockDifference, damagedDifference) {
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

export async function logActivity(auditService, client, actor, payload) {
  if (!auditService || !actor) {
    return;
  }

  await auditService.record(client, {
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
