export async function listSettlementsInRange(client, dateFrom, dateTo, tenantId) {
  const result = await client.query(
    `SELECT settlement_date, items, discount, extra_return_value
     FROM settlements
     WHERE tenant_id = $1 AND settlement_date >= $2 AND settlement_date <= $3`,
    [tenantId, dateFrom, dateTo],
  );

  return result.rows.map((row) => ({
    date: row.settlement_date,
    items: row.items || [],
    discount: Number(row.discount || 0),
    extraReturnValue: Number(row.extra_return_value || 0),
  }));
}

export async function listProductCostMap(client, tenantId) {
  const result = await client.query("SELECT id, purchase_price FROM products WHERE tenant_id = $1", [tenantId]);
  const map = new Map();
  for (const row of result.rows) {
    map.set(row.id, Number(row.purchase_price || 0));
  }
  return map;
}

// Same rows as listSettlementsInRange plus dsr_id/dsr_name, used by the DSR-wise and
// product-wise (DSR channel) profit breakdowns.
export async function listSettlementsWithDsrInRange(client, dateFrom, dateTo, tenantId) {
  const result = await client.query(
    `SELECT dsr_id, dsr_name, settlement_date, items, discount, extra_return_value
     FROM settlements
     WHERE tenant_id = $1 AND settlement_date >= $2 AND settlement_date <= $3`,
    [tenantId, dateFrom, dateTo],
  );

  return result.rows.map((row) => ({
    dsrId: row.dsr_id,
    dsrName: row.dsr_name,
    date: row.settlement_date,
    items: row.items || [],
    discount: Number(row.discount || 0),
    extraReturnValue: Number(row.extra_return_value || 0),
  }));
}

export async function listProductDirectoryForProfit(client, tenantId) {
  const result = await client.query(
    `SELECT p.id, p.name, p.category_id, c.name AS category_name
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.tenant_id = $1`,
    [tenantId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    categoryId: row.category_id || null,
    categoryName: row.category_name || null,
  }));
}

export async function listInvoiceItemProfitByProduct(client, { tenantId, dateFrom, dateTo }) {
  const result = await client.query(
    `SELECT sii.product_id,
            COALESCE(SUM(sii.line_total), 0) AS revenue,
            COALESCE(SUM(sii.cost_price_snapshot * sii.quantity_pieces), 0) AS cost,
            COALESCE(SUM(sii.quantity_pieces), 0) AS quantity
     FROM sales_invoice_items sii
     JOIN sales_invoices si ON si.id = sii.sales_invoice_id
     WHERE sii.tenant_id = $1 AND si.deleted_at IS NULL
       AND si.invoice_date >= $2 AND si.invoice_date <= $3
     GROUP BY sii.product_id`,
    [tenantId, dateFrom, dateTo],
  );

  return result.rows.map((row) => ({
    productId: row.product_id,
    revenue: Number(row.revenue || 0),
    cost: Number(row.cost || 0),
    quantity: Number(row.quantity || 0),
  }));
}

export async function listReturnItemProfitByProduct(client, { tenantId, dateFrom, dateTo }) {
  const result = await client.query(
    `SELECT sri.product_id,
            COALESCE(SUM(sri.line_total), 0) AS revenue,
            COALESCE(SUM(sri.cost_price_snapshot * sri.quantity_pieces), 0) AS cost,
            COALESCE(SUM(sri.quantity_pieces), 0) AS quantity
     FROM sales_return_items sri
     JOIN sales_returns sr ON sr.id = sri.sales_return_id
     WHERE sri.tenant_id = $1 AND sr.deleted_at IS NULL
       AND sr.return_date >= $2 AND sr.return_date <= $3
     GROUP BY sri.product_id`,
    [tenantId, dateFrom, dateTo],
  );

  return result.rows.map((row) => ({
    productId: row.product_id,
    revenue: Number(row.revenue || 0),
    cost: Number(row.cost || 0),
    quantity: Number(row.quantity || 0),
  }));
}

// sales_invoices.customer_id points at retail_customers (the original FK to the dealer
// "customers" table was dropped — see schema.js), and the invoice already snapshots the
// customer's name, so no join is needed to label each row.
export async function listInvoiceProfitByCustomer(client, { tenantId, dateFrom, dateTo }) {
  const result = await client.query(
    `SELECT COALESCE(si.customer_id, '') AS customer_id,
            MAX(NULLIF(si.customer_name_snapshot, '')) AS customer_name,
            COUNT(DISTINCT si.id)::INTEGER AS invoice_count,
            COALESCE(SUM(si.total_amount), 0) AS revenue,
            COALESCE(SUM(si.total_profit), 0) AS gross_profit
     FROM sales_invoices si
     WHERE si.tenant_id = $1 AND si.deleted_at IS NULL
       AND si.invoice_date >= $2 AND si.invoice_date <= $3
     GROUP BY COALESCE(si.customer_id, '')`,
    [tenantId, dateFrom, dateTo],
  );

  return result.rows.map((row) => ({
    customerId: row.customer_id || null,
    customerName: row.customer_name || null,
    invoiceCount: Number(row.invoice_count || 0),
    revenue: Number(row.revenue || 0),
    grossProfit: Number(row.gross_profit || 0),
  }));
}

export async function listReturnProfitAdjustmentByCustomer(client, { tenantId, dateFrom, dateTo }) {
  const result = await client.query(
    `SELECT COALESCE(sr.customer_id, '') AS customer_id,
            COALESCE(SUM(sr.total_profit_adjustment), 0) AS adjustment
     FROM sales_returns sr
     WHERE sr.tenant_id = $1 AND sr.deleted_at IS NULL
       AND sr.return_date >= $2 AND sr.return_date <= $3
     GROUP BY COALESCE(sr.customer_id, '')`,
    [tenantId, dateFrom, dateTo],
  );

  return result.rows.map((row) => ({
    customerId: row.customer_id || null,
    adjustment: Number(row.adjustment || 0),
  }));
}
