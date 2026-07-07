import { computeTransactionHash } from "../lib/transactionHash.js";

export function mapPurchaseReturn(row) {
  return {
    id: row.id,
    organizationId: row.tenant_id,
    returnNumber: row.return_number,
    returnDate: row.return_date,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name || null,
    totalAmount: Number(row.total_amount || 0),
    note: row.note,
    transactionHash: row.transaction_hash || null,
    items: Array.isArray(row.items) ? row.items : [],
    createdById: row.created_by,
    createdByName: row.created_by_name || null,
    createdAt: row.created_at,
  };
}

function itemsSubquery() {
  return `(
    SELECT COALESCE(json_agg(json_build_object(
      'id', pri.id,
      'productId', pri.product_id,
      'productName', pri.product_name,
      'quantityPieces', pri.quantity_pieces,
      'unitPrice', pri.unit_price,
      'lineTotal', pri.line_total
    ) ORDER BY pri.id), '[]'::json)
    FROM purchase_return_items pri
    WHERE pri.purchase_return_id = pr.id
  )`;
}

function buildFilters({ tenantId, supplierId, dateFrom, dateTo }) {
  const params = [tenantId];
  const conditions = ["pr.tenant_id = $1", "pr.deleted_at IS NULL"];

  if (supplierId) {
    params.push(supplierId);
    conditions.push(`pr.supplier_id = $${params.length}`);
  }

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`pr.return_date >= $${params.length}::date`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`pr.return_date <= $${params.length}::date`);
  }

  return { params, where: `WHERE ${conditions.join(" AND ")}` };
}

export async function countPurchaseReturns(client, filters = {}) {
  const { params, where } = buildFilters(filters);
  const result = await client.query(`SELECT COUNT(*)::INTEGER AS count FROM purchase_returns pr ${where}`, params);
  return result.rows[0].count;
}

export async function listPurchaseReturnsPage(client, { limit, offset, ...filters }) {
  const { params, where } = buildFilters(filters);
  params.push(limit, offset);
  const result = await client.query(
    `SELECT pr.*, s.name AS supplier_name, u.name AS created_by_name, ${itemsSubquery()} AS items
     FROM purchase_returns pr
     LEFT JOIN suppliers s ON s.id = pr.supplier_id
     LEFT JOIN users u ON u.id = pr.created_by
     ${where}
     ORDER BY pr.return_date DESC, pr.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapPurchaseReturn);
}

export function findPurchaseReturnById(client, returnId, tenantId) {
  return client.query(
    `SELECT pr.*, s.name AS supplier_name, u.name AS created_by_name, ${itemsSubquery()} AS items
     FROM purchase_returns pr
     LEFT JOIN suppliers s ON s.id = pr.supplier_id
     LEFT JOIN users u ON u.id = pr.created_by
     WHERE pr.id = $1 AND pr.tenant_id = $2 AND pr.deleted_at IS NULL
     LIMIT 1`,
    [returnId, tenantId],
  );
}

export function findPurchaseReturnForUpdate(client, returnId, tenantId) {
  return client.query(
    `SELECT * FROM purchase_returns WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL FOR UPDATE LIMIT 1`,
    [returnId, tenantId],
  );
}

export function getPurchaseReturnItems(client, returnId, tenantId) {
  return client.query(
    `SELECT * FROM purchase_return_items WHERE purchase_return_id = $1 AND tenant_id = $2 ORDER BY id`,
    [returnId, tenantId],
  );
}

export function insertPurchaseReturn(client, purchaseReturn) {
  const transactionHash = computeTransactionHash("purchase_returns", {
    id: purchaseReturn.id,
    tenantId: purchaseReturn.tenantId,
    returnNumber: purchaseReturn.returnNumber,
    returnDate: purchaseReturn.returnDate,
    supplierId: purchaseReturn.supplierId,
    totalAmount: purchaseReturn.totalAmount,
    note: purchaseReturn.note,
    createdById: purchaseReturn.createdById,
  });
  return client.query(
    `INSERT INTO purchase_returns (
       id, tenant_id, return_number, return_date, supplier_id, total_amount, note, created_by, transaction_hash
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      purchaseReturn.id,
      purchaseReturn.tenantId,
      purchaseReturn.returnNumber,
      purchaseReturn.returnDate,
      purchaseReturn.supplierId,
      purchaseReturn.totalAmount,
      purchaseReturn.note || "",
      purchaseReturn.createdById,
      transactionHash,
    ],
  );
}

export function insertPurchaseReturnItem(client, item) {
  return client.query(
    `INSERT INTO purchase_return_items (id, tenant_id, purchase_return_id, product_id, product_name, quantity_pieces, unit_price, line_total)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      item.id,
      item.tenantId,
      item.purchaseReturnId,
      item.productId,
      item.productName,
      item.quantityPieces,
      item.unitPrice,
      item.lineTotal,
    ],
  );
}

export function softDeletePurchaseReturn(client, returnId, tenantId, { deletedById, deleteReason } = {}) {
  return client.query(
    `UPDATE purchase_returns
     SET deleted_at = NOW(), deleted_by_id = $3, delete_reason = $4
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [returnId, tenantId, deletedById || null, deleteReason || ""],
  );
}
