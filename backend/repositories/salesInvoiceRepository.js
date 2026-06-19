export function mapSalesInvoice(row) {
  return {
    id: row.id,
    organizationId: row.tenant_id,
    invoiceNumber: row.invoice_number,
    invoiceDate: row.invoice_date,
    customerId: row.customer_id,
    customerName: row.customer_name || null,
    customerType: row.customer_type,
    saleType: row.sale_type,
    subtotal: Number(row.subtotal || 0),
    discount: Number(row.discount || 0),
    taxRate: Number(row.tax_rate || 0),
    taxAmount: Number(row.tax_amount || 0),
    totalAmount: Number(row.total_amount || 0),
    paidAmount: Number(row.paid_amount || 0),
    dueAmount: Number(row.due_amount || 0),
    paymentMethod: row.payment_method,
    totalProfit: Number(row.total_profit || 0),
    note: row.note,
    items: Array.isArray(row.items) ? row.items : [],
    createdById: row.created_by,
    createdByName: row.created_by_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTrashedSalesInvoice(row) {
  return {
    ...mapSalesInvoice(row),
    deletedAt: row.deleted_at,
    deletedById: row.deleted_by_id,
    deletedByName: row.deleted_by_name || null,
    deleteReason: row.delete_reason || '',
  };
}

function itemsSubquery() {
  return `(
    SELECT COALESCE(json_agg(json_build_object(
      'id', sii.id,
      'productId', sii.product_id,
      'productName', sii.product_name,
      'quantityPieces', sii.quantity_pieces,
      'actualSalePrice', sii.actual_sale_price,
      'costPriceSnapshot', sii.cost_price_snapshot,
      'lineDiscount', sii.line_discount,
      'lineTotal', sii.line_total
    ) ORDER BY sii.id), '[]'::json)
    FROM sales_invoice_items sii
    WHERE sii.sales_invoice_id = si.id
  )`;
}

function buildFilters({ search, customerId, invoiceNumber, saleType, dateFrom, dateTo, paymentStatus, tenantId }) {
  const params = [tenantId];
  const conditions = ["si.tenant_id = $1", "si.deleted_at IS NULL"];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(si.invoice_number ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
  }

  if (customerId) {
    params.push(customerId);
    conditions.push(`si.customer_id = $${params.length}`);
  }

  if (invoiceNumber) {
    params.push(`%${invoiceNumber}%`);
    conditions.push(`si.invoice_number ILIKE $${params.length}`);
  }

  if (saleType) {
    params.push(saleType);
    conditions.push(`si.sale_type = $${params.length}`);
  }

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`si.invoice_date >= $${params.length}::date`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`si.invoice_date <= $${params.length}::date`);
  }

  if (paymentStatus === "PAID") {
    conditions.push(`si.due_amount <= 0`);
  } else if (paymentStatus === "DUE") {
    conditions.push(`si.due_amount > 0 AND si.paid_amount <= 0`);
  } else if (paymentStatus === "PARTIAL") {
    conditions.push(`si.due_amount > 0 AND si.paid_amount > 0`);
  }

  return { params, where: `WHERE ${conditions.join(" AND ")}` };
}

export async function countSalesInvoices(client, filters = {}) {
  const { params, where } = buildFilters(filters);
  const result = await client.query(
    `SELECT COUNT(*)::INTEGER AS count FROM sales_invoices si LEFT JOIN retail_customers c ON c.id = si.customer_id ${where}`,
    params,
  );
  return result.rows[0].count;
}

export async function listSalesInvoicesPage(client, { limit, offset, ...filters }) {
  const { params, where } = buildFilters(filters);
  params.push(limit, offset);
  const result = await client.query(
    `SELECT si.*, c.name AS customer_name, u.name AS created_by_name, ${itemsSubquery()} AS items
     FROM sales_invoices si
     LEFT JOIN retail_customers c ON c.id = si.customer_id
     LEFT JOIN users u ON u.id = si.created_by
     ${where}
     ORDER BY si.invoice_date DESC, si.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapSalesInvoice);
}

export function findSalesInvoiceById(client, invoiceId, tenantId) {
  return client.query(
    `SELECT si.*, c.name AS customer_name, u.name AS created_by_name, ${itemsSubquery()} AS items
     FROM sales_invoices si
     LEFT JOIN retail_customers c ON c.id = si.customer_id
     LEFT JOIN users u ON u.id = si.created_by
     WHERE si.id = $1 AND si.tenant_id = $2 AND si.deleted_at IS NULL
     LIMIT 1`,
    [invoiceId, tenantId],
  );
}

export function findSalesInvoiceForUpdate(client, invoiceId, tenantId) {
  return client.query(
    `SELECT * FROM sales_invoices WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL FOR UPDATE LIMIT 1`,
    [invoiceId, tenantId],
  );
}

export function getSalesInvoiceItems(client, invoiceId) {
  return client.query(`SELECT * FROM sales_invoice_items WHERE sales_invoice_id = $1 ORDER BY id`, [invoiceId]);
}

export function insertSalesInvoice(client, invoice) {
  return client.query(
    `INSERT INTO sales_invoices (
       id, tenant_id, invoice_number, invoice_date, customer_id, customer_type, sale_type,
       subtotal, discount, tax_rate, tax_amount, total_amount, paid_amount, due_amount, payment_method, total_profit, note, created_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
     RETURNING *`,
    [
      invoice.id,
      invoice.tenantId,
      invoice.invoiceNumber,
      invoice.invoiceDate,
      invoice.customerId,
      invoice.customerType,
      invoice.saleType,
      invoice.subtotal,
      invoice.discount,
      invoice.taxRate,
      invoice.taxAmount,
      invoice.totalAmount,
      invoice.paidAmount,
      invoice.dueAmount,
      invoice.paymentMethod,
      invoice.totalProfit,
      invoice.note,
      invoice.createdById,
    ],
  );
}

export function insertSalesInvoiceItem(client, item) {
  return client.query(
    `INSERT INTO sales_invoice_items (id, tenant_id, sales_invoice_id, product_id, product_name, quantity_pieces, actual_sale_price, cost_price_snapshot, line_discount, line_total)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      item.id,
      item.tenantId,
      item.salesInvoiceId,
      item.productId,
      item.productName,
      item.quantityPieces,
      item.actualSalePrice,
      item.costPriceSnapshot,
      item.lineDiscount,
      item.lineTotal,
    ],
  );
}

export function softDeleteSalesInvoice(client, invoiceId, tenantId, { deletedById, deleteReason } = {}) {
  return client.query(
    `UPDATE sales_invoices
     SET deleted_at = NOW(), deleted_by_id = $3, delete_reason = $4
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [invoiceId, tenantId, deletedById || null, deleteReason || ""],
  );
}

export function restoreSalesInvoice(client, invoiceId, tenantId) {
  return client.query(
    `UPDATE sales_invoices
     SET deleted_at = NULL, deleted_by_id = NULL, delete_reason = ''
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL
     RETURNING *`,
    [invoiceId, tenantId],
  );
}

export async function countTrashedSalesInvoices(client, tenantId) {
  const result = await client.query(
    "SELECT COUNT(*)::INTEGER AS count FROM sales_invoices WHERE tenant_id = $1 AND deleted_at IS NOT NULL",
    [tenantId],
  );
  return result.rows[0].count;
}

export async function listTrashedSalesInvoices(client, { tenantId, limit, offset }) {
  const result = await client.query(
    `SELECT si.*, c.name AS customer_name, u.name AS deleted_by_name, ${itemsSubquery()} AS items
     FROM sales_invoices si
     LEFT JOIN retail_customers c ON c.id = si.customer_id
     LEFT JOIN users u ON u.id = si.deleted_by_id
     WHERE si.tenant_id = $1 AND si.deleted_at IS NOT NULL
     ORDER BY si.deleted_at DESC
     LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );
  return result.rows.map(mapTrashedSalesInvoice);
}

export async function getDailySalesReport(client, { tenantId, dateFrom, dateTo, saleType }) {
  const params = [tenantId];
  const conditions = ["si.tenant_id = $1", "si.deleted_at IS NULL"];

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`si.invoice_date >= $${params.length}::date`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`si.invoice_date <= $${params.length}::date`);
  }

  if (saleType) {
    params.push(saleType);
    conditions.push(`si.sale_type = $${params.length}`);
  }

  const result = await client.query(
      `SELECT
         si.invoice_date AS date,
         COUNT(*)::INTEGER AS invoice_count,
         COALESCE(SUM(si.total_amount), 0) AS total_amount,
         COALESCE(SUM(si.paid_amount), 0) AS paid_amount,
         COALESCE(SUM(si.due_amount), 0) AS due_amount,
         COALESCE(SUM(si.tax_amount), 0) AS tax_amount,
         COALESCE(SUM(si.total_profit), 0) AS total_profit
       FROM sales_invoices si
     WHERE ${conditions.join(" AND ")}
     GROUP BY si.invoice_date
     ORDER BY si.invoice_date DESC`,
    params,
  );

  return result.rows.map((row) => ({
    date: row.date,
    invoiceCount: Number(row.invoice_count || 0),
    totalAmount: Number(row.total_amount || 0),
    paidAmount: Number(row.paid_amount || 0),
    dueAmount: Number(row.due_amount || 0),
    taxAmount: Number(row.tax_amount || 0),
    totalProfit: Number(row.total_profit || 0),
  }));
}

export async function sumSalesInvoicesInRange(client, tenantId, dateFrom, dateTo) {
  const result = await client.query(
      `SELECT
         COUNT(*)::INTEGER AS count,
         COALESCE(SUM(total_amount), 0) AS total_amount,
         COALESCE(SUM(paid_amount), 0) AS paid_amount,
         COALESCE(SUM(tax_amount), 0) AS tax_amount
       FROM sales_invoices
     WHERE tenant_id = $1
       AND invoice_date >= $2
       AND invoice_date < $3
       AND deleted_at IS NULL`,
    [tenantId, dateFrom, dateTo],
  );
  return {
    count: result.rows[0].count,
    totalAmount: Number(result.rows[0].total_amount || 0),
    paidAmount: Number(result.rows[0].paid_amount || 0),
    taxAmount: Number(result.rows[0].tax_amount || 0),
  };
}

export async function getProfitReport(client, { tenantId, dateFrom, dateTo, saleType }) {
  const params = [tenantId];
  const conditions = ["si.tenant_id = $1", "si.deleted_at IS NULL"];

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`si.invoice_date >= $${params.length}::date`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`si.invoice_date <= $${params.length}::date`);
  }

  if (saleType) {
    params.push(saleType);
    conditions.push(`si.sale_type = $${params.length}`);
  }

  const result = await client.query(
      `SELECT
         si.invoice_date AS date,
         COUNT(DISTINCT si.id)::INTEGER AS invoice_count,
         COALESCE(SUM(si.total_amount), 0) AS total_sales,
         COALESCE(SUM(si.tax_amount), 0) AS tax_amount,
         COALESCE(SUM(si.total_profit), 0) AS total_profit
       FROM sales_invoices si
     WHERE ${conditions.join(" AND ")}
     GROUP BY si.invoice_date
     ORDER BY si.invoice_date DESC`,
    params,
  );

  return result.rows.map((row) => ({
    date: row.date,
    invoiceCount: Number(row.invoice_count || 0),
    totalSales: Number(row.total_sales || 0),
    taxAmount: Number(row.tax_amount || 0),
    totalProfit: Number(row.total_profit || 0),
  }));
}
