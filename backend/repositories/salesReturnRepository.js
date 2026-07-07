import { computeTransactionHash } from "../lib/transactionHash.js";

export function mapSalesReturn(row) {
  return {
    id: row.id,
    organizationId: row.tenant_id,
    returnNumber: row.return_number,
    returnDate: row.return_date,
    salesInvoiceId: row.sales_invoice_id,
    invoiceNumber: row.invoice_number || null,
    customerId: row.customer_id,
    customerName: row.customer_name || null,
    refundMethod: row.refund_method || "DUE_ADJUSTMENT",
    totalAmount: Number(row.total_amount || 0),
    totalProfitAdjustment: Number(row.total_profit_adjustment || 0),
    loyaltyPointsAdjustment: Number(row.loyalty_points_adjustment || 0),
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
      'id', sri.id,
      'salesInvoiceItemId', sri.sales_invoice_item_id,
      'productId', sri.product_id,
      'productName', sri.product_name,
      'quantityPieces', sri.quantity_pieces,
      'actualSalePrice', sri.actual_sale_price,
      'costPriceSnapshot', sri.cost_price_snapshot,
      'lineTotal', sri.line_total,
      'condition', sri.condition
    ) ORDER BY sri.id), '[]'::json)
    FROM sales_return_items sri
    WHERE sri.sales_return_id = sr.id
  )`;
}

function buildFilters({ customerId, salesInvoiceId, dateFrom, dateTo, tenantId }) {
  const params = [tenantId];
  const conditions = ["sr.tenant_id = $1", "sr.deleted_at IS NULL"];

  if (customerId) {
    params.push(customerId);
    conditions.push(`sr.customer_id = $${params.length}`);
  }

  if (salesInvoiceId) {
    params.push(salesInvoiceId);
    conditions.push(`sr.sales_invoice_id = $${params.length}`);
  }

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`sr.return_date >= $${params.length}::date`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`sr.return_date <= $${params.length}::date`);
  }

  return { params, where: `WHERE ${conditions.join(" AND ")}` };
}

export async function countSalesReturns(client, filters = {}) {
  const { params, where } = buildFilters(filters);
  const result = await client.query(`SELECT COUNT(*)::INTEGER AS count FROM sales_returns sr ${where}`, params);
  return result.rows[0].count;
}

export async function listSalesReturnsPage(client, { limit, offset, ...filters }) {
  const { params, where } = buildFilters(filters);
  params.push(limit, offset);
  const result = await client.query(
    `SELECT sr.*, c.name AS customer_name, si.invoice_number, u.name AS created_by_name, ${itemsSubquery()} AS items
     FROM sales_returns sr
     LEFT JOIN retail_customers c ON c.id = sr.customer_id
     LEFT JOIN sales_invoices si ON si.id = sr.sales_invoice_id
     LEFT JOIN users u ON u.id = sr.created_by
     ${where}
     ORDER BY sr.return_date DESC, sr.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapSalesReturn);
}

export function findSalesReturnById(client, returnId, tenantId) {
  return client.query(
    `SELECT sr.*, c.name AS customer_name, si.invoice_number, u.name AS created_by_name, ${itemsSubquery()} AS items
     FROM sales_returns sr
     LEFT JOIN retail_customers c ON c.id = sr.customer_id
     LEFT JOIN sales_invoices si ON si.id = sr.sales_invoice_id
     LEFT JOIN users u ON u.id = sr.created_by
     WHERE sr.id = $1 AND sr.tenant_id = $2 AND sr.deleted_at IS NULL
     LIMIT 1`,
    [returnId, tenantId],
  );
}

export function insertSalesReturn(client, salesReturn) {
  const transactionHash = computeTransactionHash("sales_returns", {
    id: salesReturn.id,
    tenantId: salesReturn.tenantId,
    returnNumber: salesReturn.returnNumber,
    returnDate: salesReturn.returnDate,
    salesInvoiceId: salesReturn.salesInvoiceId,
    customerId: salesReturn.customerId,
    refundMethod: salesReturn.refundMethod || "DUE_ADJUSTMENT",
    totalAmount: salesReturn.totalAmount,
    totalProfitAdjustment: salesReturn.totalProfitAdjustment,
    loyaltyPointsAdjustment: salesReturn.loyaltyPointsAdjustment ?? 0,
    note: salesReturn.note,
    createdById: salesReturn.createdById,
  });
  return client.query(
    `INSERT INTO sales_returns (
       id, tenant_id, return_number, return_date, sales_invoice_id, customer_id,
       refund_method, total_amount, total_profit_adjustment, loyalty_points_adjustment, note, created_by, transaction_hash
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      salesReturn.id,
      salesReturn.tenantId,
      salesReturn.returnNumber,
      salesReturn.returnDate,
      salesReturn.salesInvoiceId,
      salesReturn.customerId,
      salesReturn.refundMethod || "DUE_ADJUSTMENT",
      salesReturn.totalAmount,
      salesReturn.totalProfitAdjustment,
      salesReturn.loyaltyPointsAdjustment ?? 0,
      salesReturn.note,
      salesReturn.createdById,
      transactionHash,
    ],
  );
}

export function insertSalesReturnItem(client, item) {
  return client.query(
    `INSERT INTO sales_return_items (id, tenant_id, sales_return_id, sales_invoice_item_id, product_id, product_name, quantity_pieces, actual_sale_price, cost_price_snapshot, line_total, condition)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      item.id,
      item.tenantId,
      item.salesReturnId,
      item.salesInvoiceItemId,
      item.productId,
      item.productName,
      item.quantityPieces,
      item.actualSalePrice,
      item.costPriceSnapshot,
      item.lineTotal,
      item.condition || "GOOD",
    ],
  );
}

export async function sumReturnedQuantitiesByInvoiceItem(client, salesInvoiceItemIds, tenantId) {
  if (!salesInvoiceItemIds.length) {
    return new Map();
  }

  const result = await client.query(
    `SELECT sri.sales_invoice_item_id, COALESCE(SUM(sri.quantity_pieces), 0)::INTEGER AS returned_quantity
     FROM sales_return_items sri
     INNER JOIN sales_returns sr ON sr.id = sri.sales_return_id
     WHERE sri.sales_invoice_item_id = ANY($1::text[]) AND sr.tenant_id = $2 AND sr.deleted_at IS NULL
     GROUP BY sri.sales_invoice_item_id`,
    [salesInvoiceItemIds, tenantId],
  );

  return new Map(result.rows.map((row) => [row.sales_invoice_item_id, Number(row.returned_quantity || 0)]));
}

export async function getSalesReturnReport(client, { tenantId, dateFrom, dateTo }) {
  const params = [tenantId];
  const conditions = ["sr.tenant_id = $1", "sr.deleted_at IS NULL"];
  if (dateFrom) { params.push(dateFrom); conditions.push(`sr.return_date >= $${params.length}::date`); }
  if (dateTo) { params.push(dateTo); conditions.push(`sr.return_date <= $${params.length}::date`); }
  const result = await client.query(
    `SELECT sr.return_date AS date,
            COUNT(*)::INTEGER AS return_count,
            COALESCE(SUM(sr.total_amount), 0)::NUMERIC AS total_amount,
            COALESCE(SUM(sr.total_profit_adjustment), 0)::NUMERIC AS profit_adjustment
     FROM sales_returns sr
     WHERE ${conditions.join(" AND ")}
     GROUP BY sr.return_date
     ORDER BY sr.return_date DESC`,
    params,
  );
  return result.rows.map((r) => ({
    date: r.date,
    returnCount: Number(r.return_count),
    totalAmount: Number(r.total_amount),
    profitAdjustment: Number(r.profit_adjustment),
  }));
}

export async function getProfitAdjustmentsByDate(client, { tenantId, dateFrom, dateTo }) {
  const params = [tenantId];
  const conditions = ["sr.tenant_id = $1", "sr.deleted_at IS NULL"];

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`sr.return_date >= $${params.length}::date`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`sr.return_date <= $${params.length}::date`);
  }

  const result = await client.query(
    `SELECT sr.return_date AS date, COALESCE(SUM(sr.total_profit_adjustment), 0) AS adjustment
     FROM sales_returns sr
     WHERE ${conditions.join(" AND ")}
     GROUP BY sr.return_date`,
    params,
  );

  return result.rows.map((row) => ({ date: row.date, adjustment: Number(row.adjustment || 0) }));
}
