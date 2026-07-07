import { computeTransactionHash } from "../lib/transactionHash.js";

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
    taxRate: Number(row.tax_rate || 0),
    taxAmount: Number(row.tax_amount || 0),
    totalAmount: Number(row.total_amount || 0),
    paidAmount: Number(row.paid_amount || 0),
    dueAmount: Number(row.due_amount || 0),
    paymentMethod: row.payment_method,
    note: row.note,
    transactionHash: row.transaction_hash || null,
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
      'lineTotal', pri.line_total,
      'taxRate', pri.tax_rate,
      'taxAmount', pri.tax_amount,
      'batchNumber', pri.batch_number,
      'lotNumber', pri.lot_number,
      'expiryDate', pri.expiry_date,
      'manufactureDate', pri.manufacture_date
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
  const transactionHash = computeTransactionHash("purchase_receipts", {
    id: purchase.id,
    tenantId: purchase.tenantId,
    purchaseNumber: purchase.purchaseNumber,
    supplierId: purchase.supplierId,
    supplierInvoiceNo: purchase.supplierInvoiceNo,
    purchaseDate: purchase.purchaseDate,
    discount: purchase.discount,
    taxRate: purchase.taxRate,
    taxAmount: purchase.taxAmount,
    totalAmount: purchase.totalAmount,
    paidAmount: purchase.paidAmount,
    dueAmount: purchase.dueAmount,
    paymentMethod: purchase.paymentMethod,
    note: purchase.note,
    createdById: purchase.createdById,
  });
  return client.query(
    `INSERT INTO purchase_receipts (
       id, tenant_id, purchase_number, supplier_id, supplier_invoice_no, purchase_date,
       discount, tax_rate, tax_amount, total_amount, paid_amount, due_amount, payment_method, note, created_by, transaction_hash
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING *`,
    [
      purchase.id,
      purchase.tenantId,
      purchase.purchaseNumber,
      purchase.supplierId,
      purchase.supplierInvoiceNo,
      purchase.purchaseDate,
      purchase.discount,
      purchase.taxRate,
      purchase.taxAmount,
      purchase.totalAmount,
      purchase.paidAmount,
      purchase.dueAmount,
      purchase.paymentMethod,
      purchase.note,
      purchase.createdById,
      transactionHash,
    ],
  );
}

export function updatePurchaseReceipt(client, purchase) {
  return client.query(
    `UPDATE purchase_receipts
     SET supplier_invoice_no = $3, purchase_date = $4, discount = $5, tax_rate = $6, tax_amount = $7,
         total_amount = $8, paid_amount = $9, due_amount = $10, payment_method = $11, note = $12, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [
      purchase.id,
      purchase.tenantId,
      purchase.supplierInvoiceNo,
      purchase.purchaseDate,
      purchase.discount,
      purchase.taxRate,
      purchase.taxAmount,
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
    `INSERT INTO purchase_receipt_items (id, tenant_id, purchase_receipt_id, product_id, quantity_pieces, purchase_price, line_discount, line_total, tax_rate, tax_amount, batch_number, lot_number, expiry_date, manufacture_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`,
    [item.id, item.tenantId, item.purchaseReceiptId, item.productId, item.quantityPieces, item.purchasePrice, item.lineDiscount, item.lineTotal, item.taxRate, item.taxAmount, item.batchNumber || '', item.lotNumber || '', item.expiryDate || null, item.manufactureDate || null],
  );
}

export function deletePurchaseReceiptItems(client, purchaseId) {
  return client.query(`DELETE FROM purchase_receipt_items WHERE purchase_receipt_id = $1`, [purchaseId]);
}

export function deletePurchaseReceiptItemsByIds(client, ids) {
  if (!ids.length) {
    return Promise.resolve({ rowCount: 0 });
  }
  return client.query(`DELETE FROM purchase_receipt_items WHERE id = ANY($1)`, [ids]);
}

export function updatePurchaseReceiptItem(client, item) {
  return client.query(
    `UPDATE purchase_receipt_items
     SET product_id = $3, quantity_pieces = $4, purchase_price = $5, line_discount = $6, line_total = $7, tax_rate = $8, tax_amount = $9,
         batch_number = $10, lot_number = $11, expiry_date = $12, manufacture_date = $13
     WHERE id = $1 AND tenant_id = $2`,
    [item.id, item.tenantId, item.productId, item.quantityPieces, item.purchasePrice, item.lineDiscount, item.lineTotal, item.taxRate, item.taxAmount, item.batchNumber || '', item.lotNumber || '', item.expiryDate || null, item.manufactureDate || null],
  );
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

export async function getPurchaseReport(client, { tenantId, dateFrom, dateTo, supplierId }) {
  const params = [tenantId];
  const conditions = ["pr.tenant_id = $1", "pr.deleted_at IS NULL"];
  if (supplierId) { params.push(supplierId); conditions.push(`pr.supplier_id = $${params.length}`); }
  if (dateFrom) { params.push(dateFrom); conditions.push(`pr.purchase_date >= $${params.length}::date`); }
  if (dateTo) { params.push(dateTo); conditions.push(`pr.purchase_date <= $${params.length}::date`); }
  const result = await client.query(
    `SELECT pr.purchase_date AS date,
            COUNT(*)::INTEGER AS purchase_count,
            COALESCE(SUM(pr.total_amount), 0)::NUMERIC AS total_amount,
            COALESCE(SUM(pr.paid_amount), 0)::NUMERIC AS paid_amount,
            COALESCE(SUM(pr.due_amount), 0)::NUMERIC AS due_amount,
            COALESCE(SUM(pr.tax_amount), 0)::NUMERIC AS tax_amount
     FROM purchase_receipts pr
     WHERE ${conditions.join(" AND ")}
     GROUP BY pr.purchase_date
     ORDER BY pr.purchase_date DESC`,
    params,
  );
  return result.rows.map((r) => ({
    date: r.date,
    purchaseCount: Number(r.purchase_count),
    totalAmount: Number(r.total_amount),
    paidAmount: Number(r.paid_amount),
    dueAmount: Number(r.due_amount),
    taxAmount: Number(r.tax_amount),
  }));
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
