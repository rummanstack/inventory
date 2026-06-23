import { PRODUCT_SERIAL_STATUSES } from "../lib/productSerials.js";

export function mapProductSerial(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name || null,
    serialNumber: row.serial_number || '',
    imei1: row.imei1 || '',
    imei2: row.imei2 || '',
    status: row.status,
    purchaseReceiptId: row.purchase_receipt_id || null,
    purchaseReceiptItemId: row.purchase_receipt_item_id || null,
    salesInvoiceId: row.sales_invoice_id || null,
    invoiceNumber: row.invoice_number || null,
    salesInvoiceItemId: row.sales_invoice_item_id || null,
    warrantyStartDate: row.warranty_start_date || null,
    warrantyEndDate: row.warranty_end_date || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTrashedProductSerial(row) {
  return {
    ...mapProductSerial(row),
    deletedAt: row.deleted_at,
    deletedById: row.deleted_by_id,
    deletedByName: row.deleted_by_name || null,
    deleteReason: row.delete_reason || '',
  };
}

function buildFilters({ productId, status, search, tenantId }) {
  const params = [tenantId];
  const conditions = ["ps.tenant_id = $1", "ps.deleted_at IS NULL"];

  if (productId) {
    params.push(productId);
    conditions.push(`ps.product_id = $${params.length}`);
  }

  if (status) {
    params.push(status);
    conditions.push(`ps.status = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(ps.serial_number ILIKE $${params.length} OR ps.imei1 ILIKE $${params.length} OR ps.imei2 ILIKE $${params.length})`);
  }

  return { params, where: `WHERE ${conditions.join(" AND ")}` };
}

export async function countProductSerials(client, { productId, status, search, tenantId } = {}) {
  const { params, where } = buildFilters({ productId, status, search, tenantId });
  const result = await client.query(
    `SELECT COUNT(*)::INTEGER AS count FROM product_serials ps ${where}`,
    params,
  );
  return result.rows[0].count;
}

export async function listProductSerialsPage(client, { productId, status, search, tenantId, limit, offset }) {
  const { params, where } = buildFilters({ productId, status, search, tenantId });
  params.push(limit, offset);
  const result = await client.query(
    `SELECT ps.*, p.name AS product_name, si.invoice_number FROM product_serials ps
     LEFT JOIN products p ON p.id = ps.product_id
     LEFT JOIN sales_invoices si ON si.id = ps.sales_invoice_id
     ${where}
     ORDER BY ps.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapProductSerial);
}

export async function listAvailableProductSerials(client, { productId, tenantId }) {
  const result = await client.query(
    `SELECT ps.*, p.name AS product_name FROM product_serials ps
     LEFT JOIN products p ON p.id = ps.product_id
     WHERE ps.tenant_id = $1 AND ps.product_id = $2 AND ps.status = $3 AND ps.deleted_at IS NULL
     ORDER BY ps.created_at ASC`,
    [tenantId, productId, PRODUCT_SERIAL_STATUSES.IN_STOCK],
  );
  return result.rows.map(mapProductSerial);
}

export function findProductSerialById(client, id, tenantId) {
  return client.query(
    `SELECT ps.*, p.name AS product_name, si.invoice_number FROM product_serials ps
     LEFT JOIN products p ON p.id = ps.product_id
     LEFT JOIN sales_invoices si ON si.id = ps.sales_invoice_id
     WHERE ps.id = $1 AND ps.tenant_id = $2 AND ps.deleted_at IS NULL`,
    [id, tenantId],
  );
}

export function findProductSerialForUpdate(client, id, tenantId) {
  return client.query(
    "SELECT * FROM product_serials WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL FOR UPDATE",
    [id, tenantId],
  );
}

export function findProductSerialsForUpdate(client, ids, tenantId) {
  return client.query(
    "SELECT * FROM product_serials WHERE id = ANY($1) AND tenant_id = $2 AND deleted_at IS NULL FOR UPDATE",
    [ids, tenantId],
  );
}

// Looks for any other non-deleted serial in this tenant sharing a serial_number/imei1/imei2
// value with the candidate (ignoring blank values, and excluding the row being updated).
export async function findDuplicateProductSerial(client, { tenantId, serialNumber, imei1, imei2, excludeId }) {
  const params = [tenantId];
  const valueConditions = [];

  if (serialNumber) {
    params.push(serialNumber);
    valueConditions.push(`serial_number = $${params.length}`);
  }
  if (imei1) {
    params.push(imei1);
    valueConditions.push(`imei1 = $${params.length}`);
  }
  if (imei2) {
    params.push(imei2);
    valueConditions.push(`imei2 = $${params.length}`);
  }

  if (valueConditions.length === 0) {
    return null;
  }

  let excludeClause = "";
  if (excludeId) {
    params.push(excludeId);
    excludeClause = `AND id <> $${params.length}`;
  }

  const result = await client.query(
    `SELECT * FROM product_serials
     WHERE tenant_id = $1 AND deleted_at IS NULL ${excludeClause} AND (${valueConditions.join(" OR ")})
     LIMIT 1`,
    params,
  );
  return result.rows[0] || null;
}

export function insertProductSerial(client, serial) {
  return client.query(
    `WITH inserted AS (
      INSERT INTO product_serials (
        id, tenant_id, product_id, serial_number, imei1, imei2, status,
        purchase_receipt_id, purchase_receipt_item_id, sales_invoice_id, sales_invoice_item_id,
        warranty_start_date, warranty_end_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
     )
     SELECT inserted.*, p.name AS product_name FROM inserted LEFT JOIN products p ON p.id = inserted.product_id`,
    [
      serial.id,
      serial.tenantId,
      serial.productId,
      serial.serialNumber,
      serial.imei1,
      serial.imei2,
      serial.status,
      serial.purchaseReceiptId,
      serial.purchaseReceiptItemId,
      serial.salesInvoiceId,
      serial.salesInvoiceItemId,
      serial.warrantyStartDate,
      serial.warrantyEndDate,
    ],
  );
}

export function updateProductSerial(client, serial) {
  return client.query(
    `WITH updated AS (
       UPDATE product_serials
       SET serial_number = $3, imei1 = $4, imei2 = $5, status = $6,
           sales_invoice_id = $7, sales_invoice_item_id = $8,
           warranty_start_date = $9, warranty_end_date = $10, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *
     )
     SELECT updated.*, p.name AS product_name FROM updated LEFT JOIN products p ON p.id = updated.product_id`,
    [
      serial.id,
      serial.tenantId,
      serial.serialNumber,
      serial.imei1,
      serial.imei2,
      serial.status,
      serial.salesInvoiceId,
      serial.salesInvoiceItemId,
      serial.warrantyStartDate,
      serial.warrantyEndDate,
    ],
  );
}

export function softDeleteProductSerial(client, id, tenantId, { deletedById, deleteReason } = {}) {
  return client.query(
    `UPDATE product_serials
     SET deleted_at = NOW(), deleted_by_id = $3, delete_reason = $4
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [id, tenantId, deletedById || null, deleteReason || ""],
  );
}

// Hard delete, used only when a purchase edit corrects a serial that was never actually
// received (the row is being removed outright, not trashed) — callers must confirm the
// serial is still IN_STOCK first.
export function deleteProductSerialById(client, id, tenantId) {
  return client.query("DELETE FROM product_serials WHERE id = $1 AND tenant_id = $2", [id, tenantId]);
}

export function restoreProductSerial(client, id, tenantId) {
  return client.query(
    `UPDATE product_serials
     SET deleted_at = NULL, deleted_by_id = NULL, delete_reason = ''
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL
     RETURNING *`,
    [id, tenantId],
  );
}

// Used by purchase delete/restore to keep serial rows in sync with the stock reversal
// those actions already perform on the parent purchase receipt.
export function findProductSerialsByPurchaseReceiptId(client, purchaseReceiptId, tenantId, { includeDeleted = false } = {}) {
  const deletedClause = includeDeleted ? "ps.deleted_at IS NOT NULL" : "ps.deleted_at IS NULL";
  return client.query(
    `SELECT ps.* FROM product_serials ps
     WHERE ps.purchase_receipt_id = $1 AND ps.tenant_id = $2 AND ${deletedClause}
     FOR UPDATE`,
    [purchaseReceiptId, tenantId],
  );
}

export async function countTrashedProductSerials(client, tenantId) {
  const result = await client.query(
    "SELECT COUNT(*)::INTEGER AS count FROM product_serials WHERE tenant_id = $1 AND deleted_at IS NOT NULL",
    [tenantId],
  );
  return result.rows[0].count;
}

export async function listTrashedProductSerials(client, { tenantId, limit, offset }) {
  const result = await client.query(
    `SELECT ps.*, p.name AS product_name, u.name AS deleted_by_name
     FROM product_serials ps
     LEFT JOIN products p ON p.id = ps.product_id
     LEFT JOIN users u ON u.id = ps.deleted_by_id
     WHERE ps.tenant_id = $1 AND ps.deleted_at IS NOT NULL
     ORDER BY ps.deleted_at DESC
     LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );
  return result.rows.map(mapTrashedProductSerial);
}
