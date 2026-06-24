export function mapQuotation(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    quoteNumber: row.quote_number,
    customerId: row.customer_id || null,
    customerName: row.customer_name || '',
    customerPhone: row.customer_phone || '',
    customerEmail: row.customer_email || '',
    status: row.status,
    validityDays: Number(row.validity_days || 7),
    validUntil: row.valid_until || null,
    quoteDate: row.quote_date,
    taxRate: Number(row.tax_rate || 0),
    subtotal: Number(row.subtotal || 0),
    discountAmount: Number(row.discount_amount || 0),
    taxAmount: Number(row.tax_amount || 0),
    totalAmount: Number(row.total_amount || 0),
    notes: row.notes || '',
    convertedInvoiceId: row.converted_invoice_id || null,
    convertedInvoiceNumber: row.converted_invoice_number || null,
    createdById: row.created_by || null,
    createdByName: row.created_by_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: Array.isArray(row.items) ? row.items : [],
  };
}

function mapTrashedQuotation(row) {
  return {
    ...mapQuotation(row),
    deletedAt: row.deleted_at,
    deletedById: row.deleted_by_id,
    deletedByName: row.deleted_by_name || null,
    deleteReason: row.delete_reason || '',
  };
}

function itemsSubquery() {
  return `(
    SELECT COALESCE(json_agg(json_build_object(
      'id', qi.id,
      'productId', qi.product_id,
      'productName', qi.product_name,
      'quantity', qi.quantity,
      'unitPrice', qi.unit_price,
      'discountAmount', qi.discount_amount,
      'lineTotal', qi.line_total
    ) ORDER BY qi.id), '[]'::json)
    FROM quotation_items qi
    WHERE qi.quotation_id = q.id
  )`;
}

const BASE_JOINS = `
  LEFT JOIN retail_customers rc ON rc.id = q.customer_id
  LEFT JOIN sales_invoices si_conv ON si_conv.id = q.converted_invoice_id
  LEFT JOIN users creator ON creator.id = q.created_by
`;

const BASE_SELECT = `
  q.*,
  rc.name AS customer_name,
  si_conv.invoice_number AS converted_invoice_number,
  creator.name AS created_by_name,
  ${itemsSubquery()} AS items
`;

function buildFilters({ tenantId, status, search, dateFrom, dateTo, customerId }) {
  const params = [tenantId];
  const conditions = ['q.tenant_id = $1', 'q.deleted_at IS NULL'];

  if (status) {
    params.push(status);
    conditions.push(`q.status = $${params.length}`);
  }
  if (customerId) {
    params.push(customerId);
    conditions.push(`q.customer_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(q.quote_number ILIKE $${params.length} OR q.customer_name ILIKE $${params.length} OR rc.name ILIKE $${params.length} OR q.customer_phone ILIKE $${params.length})`);
  }
  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`q.quote_date >= $${params.length}::date`);
  }
  if (dateTo) {
    params.push(dateTo);
    conditions.push(`q.quote_date <= $${params.length}::date`);
  }

  return { params, where: `WHERE ${conditions.join(' AND ')}` };
}

export async function countQuotations(client, filters) {
  const { params, where } = buildFilters(filters);
  const result = await client.query(
    `SELECT COUNT(*)::INTEGER AS count FROM quotations q ${BASE_JOINS} ${where}`,
    params,
  );
  return result.rows[0].count;
}

export async function listQuotationsPage(client, { limit, offset, ...filters }) {
  const { params, where } = buildFilters(filters);
  params.push(limit, offset);
  const result = await client.query(
    `SELECT ${BASE_SELECT} FROM quotations q ${BASE_JOINS}
     ${where}
     ORDER BY q.quote_date DESC, q.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapQuotation);
}

export function findQuotationById(client, id, tenantId) {
  return client.query(
    `SELECT ${BASE_SELECT} FROM quotations q ${BASE_JOINS}
     WHERE q.id = $1 AND q.tenant_id = $2 AND q.deleted_at IS NULL`,
    [id, tenantId],
  );
}

export function findQuotationForUpdate(client, id, tenantId) {
  return client.query(
    'SELECT * FROM quotations WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL FOR UPDATE',
    [id, tenantId],
  );
}

export async function insertQuotation(client, q) {
  await client.query(
    `INSERT INTO quotations (
       id, tenant_id, quote_number, customer_id, customer_name, customer_phone, customer_email,
       status, validity_days, valid_until, quote_date, tax_rate, subtotal, discount_amount,
       tax_amount, total_amount, notes, created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
    [
      q.id, q.tenantId, q.quoteNumber, q.customerId, q.customerName, q.customerPhone,
      q.customerEmail, q.status, q.validityDays, q.validUntil, q.quoteDate,
      q.taxRate, q.subtotal, q.discountAmount, q.taxAmount, q.totalAmount, q.notes, q.createdById,
    ],
  );
}

export async function insertQuotationItem(client, item, quotationId, tenantId) {
  await client.query(
    `INSERT INTO quotation_items (id, quotation_id, tenant_id, product_id, product_name, quantity, unit_price, discount_amount, line_total)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [item.id, quotationId, tenantId, item.productId, item.productName, item.quantity, item.unitPrice, item.discountAmount, item.lineTotal],
  );
}

export async function deleteQuotationItems(client, quotationId) {
  return client.query('DELETE FROM quotation_items WHERE quotation_id = $1', [quotationId]);
}

export async function listQuotationItems(client, quotationId) {
  const result = await client.query(
    `SELECT qi.*, p.name AS product_db_name, p.retail_price, p.cost_price, p.stock_pieces
     FROM quotation_items qi
     LEFT JOIN products p ON p.id = qi.product_id
     WHERE qi.quotation_id = $1
     ORDER BY qi.id`,
    [quotationId],
  );
  return result.rows;
}

export async function updateQuotation(client, q) {
  return client.query(
    `UPDATE quotations
     SET status=$3, customer_id=$4, customer_name=$5, customer_phone=$6, customer_email=$7,
         validity_days=$8, valid_until=$9, quote_date=$10, tax_rate=$11, subtotal=$12,
         discount_amount=$13, tax_amount=$14, total_amount=$15, notes=$16, updated_at=NOW()
     WHERE id=$1 AND tenant_id=$2`,
    [
      q.id, q.tenantId, q.status, q.customerId, q.customerName, q.customerPhone,
      q.customerEmail, q.validityDays, q.validUntil, q.quoteDate,
      q.taxRate, q.subtotal, q.discountAmount, q.taxAmount, q.totalAmount, q.notes,
    ],
  );
}

export async function markQuotationConverted(client, id, tenantId, invoiceId) {
  return client.query(
    `UPDATE quotations SET status='CONVERTED', converted_invoice_id=$3, updated_at=NOW()
     WHERE id=$1 AND tenant_id=$2`,
    [id, tenantId, invoiceId],
  );
}

export function softDeleteQuotation(client, id, tenantId, { deletedById, deleteReason } = {}) {
  return client.query(
    `UPDATE quotations SET deleted_at=NOW(), deleted_by_id=$3, delete_reason=$4
     WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL`,
    [id, tenantId, deletedById || null, deleteReason || ''],
  );
}

export function restoreQuotation(client, id, tenantId) {
  return client.query(
    `UPDATE quotations SET deleted_at=NULL, deleted_by_id=NULL, delete_reason=''
     WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NOT NULL RETURNING *`,
    [id, tenantId],
  );
}

export function permanentlyDeleteQuotation(client, id, tenantId) {
  return client.query(
    'DELETE FROM quotations WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NOT NULL',
    [id, tenantId],
  );
}

export async function countTrashedQuotations(client, tenantId) {
  const result = await client.query(
    'SELECT COUNT(*)::INTEGER AS count FROM quotations WHERE tenant_id=$1 AND deleted_at IS NOT NULL',
    [tenantId],
  );
  return result.rows[0].count;
}

export async function listTrashedQuotations(client, { tenantId, limit, offset }) {
  const result = await client.query(
    `SELECT ${BASE_SELECT}, u.name AS deleted_by_name
     FROM quotations q ${BASE_JOINS}
     LEFT JOIN users u ON u.id = q.deleted_by_id
     WHERE q.tenant_id=$1 AND q.deleted_at IS NOT NULL
     ORDER BY q.deleted_at DESC
     LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );
  return result.rows.map(mapTrashedQuotation);
}
