import { createId } from "../lib/ids.js";
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

// Looks for any other live identifier value in this tenant — serial_number, imei1, or imei2,
// on any serial row — matching one of the candidate's values (ignoring blank values, and
// excluding the row being updated). Checked against product_serial_identifiers rather than
// product_serials directly so a value can't be reused across *different* identifier columns
// either (see the unique index on that table for the DB-level half of this guarantee).
export async function findDuplicateProductSerial(client, { tenantId, serialNumber, imei1, imei2, excludeId }) {
  const values = [serialNumber, imei1, imei2].filter(Boolean);
  if (!values.length) {
    return null;
  }

  const params = [tenantId, values];
  let excludeClause = "";
  if (excludeId) {
    params.push(excludeId);
    excludeClause = `AND psi.product_serial_id <> $${params.length}`;
  }

  const result = await client.query(
    `SELECT ps.* FROM product_serial_identifiers psi
     JOIN product_serials ps ON ps.id = psi.product_serial_id
     WHERE psi.tenant_id = $1 AND psi.identifier_value = ANY($2) AND psi.deleted_at IS NULL ${excludeClause}
     LIMIT 1`,
    params,
  );
  return result.rows[0] || null;
}

// Replaces this serial's identifier rows to match its current serial_number/imei1/imei2 —
// called after every insert/update so product_serial_identifiers never drifts from the
// columns it mirrors.
async function syncProductSerialIdentifiers(client, serial) {
  await client.query("DELETE FROM product_serial_identifiers WHERE product_serial_id = $1", [serial.id]);

  const identifiers = [
    ["SERIAL_NUMBER", serial.serialNumber],
    ["IMEI1", serial.imei1],
    ["IMEI2", serial.imei2],
  ].filter(([, value]) => value);

  for (const [identifierType, identifierValue] of identifiers) {
    await client.query(
      `INSERT INTO product_serial_identifiers (id, tenant_id, product_serial_id, identifier_type, identifier_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [createId("serial-identifier"), serial.tenantId, serial.id, identifierType, identifierValue],
    );
  }
}

export async function insertProductSerial(client, serial) {
  const result = await client.query(
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

  await syncProductSerialIdentifiers(client, serial);
  return result;
}

export async function updateProductSerial(client, serial) {
  const result = await client.query(
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

  await syncProductSerialIdentifiers(client, serial);
  return result;
}

export async function softDeleteProductSerial(client, id, tenantId, { deletedById, deleteReason } = {}) {
  const result = await client.query(
    `UPDATE product_serials
     SET deleted_at = NOW(), deleted_by_id = $3, delete_reason = $4
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [id, tenantId, deletedById || null, deleteReason || ""],
  );
  await client.query("UPDATE product_serial_identifiers SET deleted_at = NOW() WHERE product_serial_id = $1", [id]);
  return result;
}

// Hard delete, used only when a purchase edit corrects a serial that was never actually
// received (the row is being removed outright, not trashed) — callers must confirm the
// serial is still IN_STOCK first. Its identifier rows cascade-delete with it.
export function deleteProductSerialById(client, id, tenantId) {
  return client.query("DELETE FROM product_serials WHERE id = $1 AND tenant_id = $2", [id, tenantId]);
}

export async function restoreProductSerial(client, id, tenantId) {
  const result = await client.query(
    `UPDATE product_serials
     SET deleted_at = NULL, deleted_by_id = NULL, delete_reason = ''
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL
     RETURNING *`,
    [id, tenantId],
  );
  await client.query("UPDATE product_serial_identifiers SET deleted_at = NULL WHERE product_serial_id = $1", [id]);
  return result;
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
