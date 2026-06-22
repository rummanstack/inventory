export function mapWarrantyClaim(row) {
  return {
    id: row.id,
    claimNumber: row.claim_number,
    customerId: row.customer_id || null,
    customerName: row.customer_name || null,
    salesInvoiceId: row.sales_invoice_id || null,
    invoiceNumber: row.invoice_number || null,
    salesInvoiceItemId: row.sales_invoice_item_id || null,
    productId: row.product_id,
    productName: row.product_name || null,
    productSerialId: row.product_serial_id || null,
    serialNumber: row.serial_number || null,
    imei1: row.imei1 || null,
    imei2: row.imei2 || null,
    problemNote: row.problem_note || '',
    receivedDate: row.received_date,
    status: row.status,
    supplierId: row.supplier_id || null,
    supplierName: row.supplier_name || null,
    resolutionNote: row.resolution_note || '',
    createdById: row.created_by,
    createdByName: row.created_by_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTrashedWarrantyClaim(row) {
  return {
    ...mapWarrantyClaim(row),
    deletedAt: row.deleted_at,
    deletedById: row.deleted_by_id,
    deletedByName: row.deleted_by_name || null,
    deleteReason: row.delete_reason || '',
  };
}

const BASE_JOINS = `
  LEFT JOIN retail_customers rc ON rc.id = wc.customer_id
  LEFT JOIN sales_invoices si ON si.id = wc.sales_invoice_id
  LEFT JOIN products p ON p.id = wc.product_id
  LEFT JOIN product_serials ps ON ps.id = wc.product_serial_id
  LEFT JOIN suppliers s ON s.id = wc.supplier_id
`;

const BASE_SELECT = `
  wc.*,
  rc.name AS customer_name,
  si.invoice_number,
  p.name AS product_name,
  ps.serial_number,
  ps.imei1,
  ps.imei2,
  s.name AS supplier_name
`;

function buildFilters({ status, supplierId, productId, search, dateFrom, dateTo, tenantId }) {
  const params = [tenantId];
  const conditions = ["wc.tenant_id = $1", "wc.deleted_at IS NULL"];

  if (status) {
    params.push(status);
    conditions.push(`wc.status = $${params.length}`);
  }

  if (supplierId) {
    params.push(supplierId);
    conditions.push(`wc.supplier_id = $${params.length}`);
  }

  if (productId) {
    params.push(productId);
    conditions.push(`wc.product_id = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(wc.claim_number ILIKE $${params.length} OR ps.serial_number ILIKE $${params.length} OR ps.imei1 ILIKE $${params.length} OR ps.imei2 ILIKE $${params.length} OR rc.name ILIKE $${params.length})`);
  }

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`wc.received_date >= $${params.length}::date`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`wc.received_date <= $${params.length}::date`);
  }

  return { params, where: `WHERE ${conditions.join(" AND ")}` };
}

export async function countWarrantyClaims(client, filters = {}) {
  const { params, where } = buildFilters(filters);
  const result = await client.query(
    `SELECT COUNT(*)::INTEGER AS count FROM warranty_claims wc ${BASE_JOINS} ${where}`,
    params,
  );
  return result.rows[0].count;
}

export async function listWarrantyClaimsPage(client, { limit, offset, ...filters }) {
  const { params, where } = buildFilters(filters);
  params.push(limit, offset);
  const result = await client.query(
    `SELECT ${BASE_SELECT} FROM warranty_claims wc ${BASE_JOINS}
     ${where}
     ORDER BY wc.received_date DESC, wc.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapWarrantyClaim);
}

export function findWarrantyClaimById(client, id, tenantId) {
  return client.query(
    `SELECT ${BASE_SELECT} FROM warranty_claims wc ${BASE_JOINS}
     WHERE wc.id = $1 AND wc.tenant_id = $2 AND wc.deleted_at IS NULL`,
    [id, tenantId],
  );
}

export function findWarrantyClaimForUpdate(client, id, tenantId) {
  return client.query(
    "SELECT * FROM warranty_claims WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL FOR UPDATE",
    [id, tenantId],
  );
}

export function insertWarrantyClaim(client, claim) {
  return client.query(
    `WITH inserted AS (
      INSERT INTO warranty_claims (
        id, tenant_id, claim_number, customer_id, sales_invoice_id, sales_invoice_item_id,
        product_id, product_serial_id, problem_note, received_date, status, supplier_id,
        resolution_note, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    )
    SELECT ${BASE_SELECT} FROM inserted wc ${BASE_JOINS}`,
    [
      claim.id,
      claim.tenantId,
      claim.claimNumber,
      claim.customerId,
      claim.salesInvoiceId,
      claim.salesInvoiceItemId,
      claim.productId,
      claim.productSerialId,
      claim.problemNote,
      claim.receivedDate,
      claim.status,
      claim.supplierId,
      claim.resolutionNote,
      claim.createdById,
    ],
  );
}

export function updateWarrantyClaim(client, claim) {
  return client.query(
    `WITH updated AS (
       UPDATE warranty_claims
       SET status = $3, supplier_id = $4, resolution_note = $5, problem_note = $6, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *
     )
     SELECT ${BASE_SELECT} FROM updated wc ${BASE_JOINS}`,
    [claim.id, claim.tenantId, claim.status, claim.supplierId, claim.resolutionNote, claim.problemNote],
  );
}

export function softDeleteWarrantyClaim(client, id, tenantId, { deletedById, deleteReason } = {}) {
  return client.query(
    `UPDATE warranty_claims
     SET deleted_at = NOW(), deleted_by_id = $3, delete_reason = $4
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [id, tenantId, deletedById || null, deleteReason || ""],
  );
}

export function restoreWarrantyClaim(client, id, tenantId) {
  return client.query(
    `UPDATE warranty_claims
     SET deleted_at = NULL, deleted_by_id = NULL, delete_reason = ''
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL
     RETURNING *`,
    [id, tenantId],
  );
}

export function permanentlyDeleteWarrantyClaim(client, id, tenantId) {
  return client.query(
    "DELETE FROM warranty_claims WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL",
    [id, tenantId],
  );
}

export async function countTrashedWarrantyClaims(client, tenantId) {
  const result = await client.query(
    "SELECT COUNT(*)::INTEGER AS count FROM warranty_claims WHERE tenant_id = $1 AND deleted_at IS NOT NULL",
    [tenantId],
  );
  return result.rows[0].count;
}

export async function listTrashedWarrantyClaims(client, { tenantId, limit, offset }) {
  const result = await client.query(
    `SELECT ${BASE_SELECT}, u.name AS deleted_by_name
     FROM warranty_claims wc ${BASE_JOINS}
     LEFT JOIN users u ON u.id = wc.deleted_by_id
     WHERE wc.tenant_id = $1 AND wc.deleted_at IS NOT NULL
     ORDER BY wc.deleted_at DESC
     LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );
  return result.rows.map(mapTrashedWarrantyClaim);
}

// Warranty flow step 1-3: search by serial/IMEI, surface the sale that sold it and its
// warranty end date, so a new claim can be pre-filled without a separate lookup round-trip.
export async function findSoldSerialForClaim(client, { tenantId, search }) {
  const result = await client.query(
    `SELECT ps.*, p.name AS product_name, si.id AS sales_invoice_id, si.invoice_number,
            si.customer_id, rc.name AS customer_name
     FROM product_serials ps
     LEFT JOIN products p ON p.id = ps.product_id
     LEFT JOIN sales_invoices si ON si.id = ps.sales_invoice_id
     LEFT JOIN retail_customers rc ON rc.id = si.customer_id
     WHERE ps.tenant_id = $1 AND ps.deleted_at IS NULL
       AND (ps.serial_number = $2 OR ps.imei1 = $2 OR ps.imei2 = $2)
     LIMIT 1`,
    [tenantId, search],
  );
  return result.rows[0] || null;
}
