export function mapPurchaseReceipt(row) {
  return {
    id: row.id,
    organizationId: row.tenant_id,
    purchaseNumber: row.purchase_number,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name || null,
    supplierInvoiceNo: row.supplier_invoice_no,
    purchaseDate: row.purchase_date,
    discount: Number(row.discount || 0),
    totalAmount: Number(row.total_amount || 0),
    paidAmount: Number(row.paid_amount || 0),
    dueAmount: Number(row.due_amount || 0),
    paymentMethod: row.payment_method,
    note: row.note,
    items: Array.isArray(row.items) ? row.items : [],
    createdById: row.created_by,
    createdByName: row.created_by_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTrashedPurchaseReceipt(row) {
  return {
    ...mapPurchaseReceipt(row),
    deletedAt: row.deleted_at,
    deletedById: row.deleted_by_id,
    deletedByName: row.deleted_by_name || null,
    deleteReason: row.delete_reason || '',
  };
}

function itemsSubquery() {
  return `(
    SELECT COALESCE(json_agg(json_build_object(
      'id', pri.id,
      'productId', pri.product_id,
      'productName', p.name,
      'piecesPerCase', p.pieces_per_case,
      'quantityPieces', pri.quantity_pieces,
      'purchasePrice', pri.purchase_price,
      'lineDiscount', pri.line_discount,
      'lineTotal', pri.line_total
    ) ORDER BY pri.id), '[]'::json)
    FROM purchase_receipt_items pri
    LEFT JOIN products p ON p.id = pri.product_id
    WHERE pri.purchase_receipt_id = pr.id
  )`;
}

function buildFilters({ search, supplierId, purchaseNumber, supplierInvoiceNo, dateFrom, dateTo, paymentStatus, tenantId }) {
  const params = [tenantId];
  const conditions = ["pr.tenant_id = $1", "pr.deleted_at IS NULL"];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(pr.purchase_number ILIKE $${params.length} OR pr.supplier_invoice_no ILIKE $${params.length} OR s.name ILIKE $${params.length})`);
  }

  if (supplierId) {
    params.push(supplierId);
    conditions.push(`pr.supplier_id = $${params.length}`);
  }

  if (purchaseNumber) {
    params.push(`%${purchaseNumber}%`);
    conditions.push(`pr.purchase_number ILIKE $${params.length}`);
  }

  if (supplierInvoiceNo) {
    params.push(`%${supplierInvoiceNo}%`);
    conditions.push(`pr.supplier_invoice_no ILIKE $${params.length}`);
  }

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`pr.purchase_date >= $${params.length}::date`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`pr.purchase_date <= $${params.length}::date`);
  }

  if (paymentStatus === "PAID") {
    conditions.push(`pr.due_amount <= 0`);
  } else if (paymentStatus === "DUE") {
    conditions.push(`pr.due_amount > 0 AND pr.paid_amount <= 0`);
  } else if (paymentStatus === "PARTIAL") {
    conditions.push(`pr.due_amount > 0 AND pr.paid_amount > 0`);
  }

  return { params, where: `WHERE ${conditions.join(" AND ")}` };
}

export async function countPurchaseReceipts(client, filters = {}) {
  const { params, where } = buildFilters(filters);
  const result = await client.query(
    `SELECT COUNT(*)::INTEGER AS count FROM purchase_receipts pr LEFT JOIN suppliers s ON s.id = pr.supplier_id ${where}`,
    params,
  );
  return result.rows[0].count;
}

export async function listPurchaseReceiptsPage(client, { limit, offset, ...filters }) {
  const { params, where } = buildFilters(filters);
  params.push(limit, offset);
  const result = await client.query(
    `SELECT pr.*, s.name AS supplier_name, u.name AS created_by_name, ${itemsSubquery()} AS items
     FROM purchase_receipts pr
     LEFT JOIN suppliers s ON s.id = pr.supplier_id
     LEFT JOIN users u ON u.id = pr.created_by
     ${where}
     ORDER BY pr.purchase_date DESC, pr.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapPurchaseReceipt);
}

export function findPurchaseReceiptById(client, purchaseId, tenantId) {
  return client.query(
    `SELECT pr.*, s.name AS supplier_name, u.name AS created_by_name, ${itemsSubquery()} AS items
     FROM purchase_receipts pr
     LEFT JOIN suppliers s ON s.id = pr.supplier_id
     LEFT JOIN users u ON u.id = pr.created_by
     WHERE pr.id = $1 AND pr.tenant_id = $2 AND pr.deleted_at IS NULL
     LIMIT 1`,
    [purchaseId, tenantId],
  );
}

export function findPurchaseReceiptForUpdate(client, purchaseId, tenantId) {
  return client.query(
    `SELECT * FROM purchase_receipts WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL FOR UPDATE LIMIT 1`,
    [purchaseId, tenantId],
  );
}

export function getPurchaseReceiptItems(client, purchaseId) {
  return client.query(
    `SELECT pri.*, p.name AS product_name, p.pieces_per_case
     FROM purchase_receipt_items pri
     LEFT JOIN products p ON p.id = pri.product_id
     WHERE pri.purchase_receipt_id = $1
     ORDER BY pri.id`,
    [purchaseId],
  );
}

export function insertPurchaseReceipt(client, purchase) {
  return client.query(
    `INSERT INTO purchase_receipts (
       id, tenant_id, purchase_number, supplier_id, supplier_invoice_no, purchase_date,
       discount, total_amount, paid_amount, due_amount, payment_method, note, created_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      purchase.id,
      purchase.tenantId,
      purchase.purchaseNumber,
      purchase.supplierId,
      purchase.supplierInvoiceNo,
      purchase.purchaseDate,
      purchase.discount,
      purchase.totalAmount,
      purchase.paidAmount,
      purchase.dueAmount,
      purchase.paymentMethod,
      purchase.note,
      purchase.createdById,
    ],
  );
}

export function updatePurchaseReceipt(client, purchase) {
  return client.query(
    `UPDATE purchase_receipts
     SET supplier_invoice_no = $3, purchase_date = $4, discount = $5, total_amount = $6,
         paid_amount = $7, due_amount = $8, payment_method = $9, note = $10, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [
      purchase.id,
      purchase.tenantId,
      purchase.supplierInvoiceNo,
      purchase.purchaseDate,
      purchase.discount,
      purchase.totalAmount,
      purchase.paidAmount,
      purchase.dueAmount,
      purchase.paymentMethod,
      purchase.note,
    ],
  );
}

export function insertPurchaseReceiptItem(client, item) {
  return client.query(
    `INSERT INTO purchase_receipt_items (id, tenant_id, purchase_receipt_id, product_id, quantity_pieces, purchase_price, line_discount, line_total)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [item.id, item.tenantId, item.purchaseReceiptId, item.productId, item.quantityPieces, item.purchasePrice, item.lineDiscount, item.lineTotal],
  );
}

export function deletePurchaseReceiptItems(client, purchaseId) {
  return client.query(`DELETE FROM purchase_receipt_items WHERE purchase_receipt_id = $1`, [purchaseId]);
}

export function softDeletePurchaseReceipt(client, purchaseId, tenantId, { deletedById, deleteReason } = {}) {
  return client.query(
    `UPDATE purchase_receipts
     SET deleted_at = NOW(), deleted_by_id = $3, delete_reason = $4
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [purchaseId, tenantId, deletedById || null, deleteReason || ""],
  );
}

export function restorePurchaseReceipt(client, purchaseId, tenantId) {
  return client.query(
    `UPDATE purchase_receipts
     SET deleted_at = NULL, deleted_by_id = NULL, delete_reason = ''
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL
     RETURNING *`,
    [purchaseId, tenantId],
  );
}

export async function countTrashedPurchaseReceipts(client, tenantId) {
  const result = await client.query(
    "SELECT COUNT(*)::INTEGER AS count FROM purchase_receipts WHERE tenant_id = $1 AND deleted_at IS NOT NULL",
    [tenantId],
  );
  return result.rows[0].count;
}

export async function listTrashedPurchaseReceipts(client, { tenantId, limit, offset }) {
  const result = await client.query(
    `SELECT pr.*, s.name AS supplier_name, u.name AS deleted_by_name, ${itemsSubquery()} AS items
     FROM purchase_receipts pr
     LEFT JOIN suppliers s ON s.id = pr.supplier_id
     LEFT JOIN users u ON u.id = pr.deleted_by_id
     WHERE pr.tenant_id = $1 AND pr.deleted_at IS NOT NULL
     ORDER BY pr.deleted_at DESC
     LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );
  return result.rows.map(mapTrashedPurchaseReceipt);
}
