export function mapTradeIn(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    tradeInNumber: row.trade_in_number,
    tradeInDate: row.trade_in_date,
    customerName: row.customer_name || '',
    customerPhone: row.customer_phone || '',
    totalTradeInValue: Number(row.total_trade_in_value || 0),
    totalSaleAmount: Number(row.total_sale_amount || 0),
    paymentAmount: Number(row.payment_amount || 0),
    paymentMethod: row.payment_method || 'CASH',
    notes: row.notes || '',
    createdById: row.created_by || null,
    createdByName: row.created_by_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    receivedItems: Array.isArray(row.received_items) ? row.received_items : [],
    soldItems: Array.isArray(row.sold_items) ? row.sold_items : [],
  };
}

function receivedItemsSubquery() {
  return `(
    SELECT COALESCE(json_agg(json_build_object(
      'id', ri.id,
      'productId', ri.product_id,
      'productName', ri.product_name,
      'serialNumber', ri.serial_number,
      'condition', ri.condition,
      'quantity', ri.quantity,
      'tradeInValue', ri.trade_in_value
    ) ORDER BY ri.id), '[]'::json)
    FROM trade_in_received_items ri
    WHERE ri.trade_in_id = t.id
  )`;
}

function soldItemsSubquery() {
  return `(
    SELECT COALESCE(json_agg(json_build_object(
      'id', si.id,
      'productId', si.product_id,
      'productName', si.product_name,
      'quantity', si.quantity,
      'unitPrice', si.unit_price,
      'costPriceSnapshot', si.cost_price_snapshot,
      'lineTotal', si.line_total
    ) ORDER BY si.id), '[]'::json)
    FROM trade_in_sold_items si
    WHERE si.trade_in_id = t.id
  )`;
}

const BASE_JOINS = `LEFT JOIN users creator ON creator.id = t.created_by`;

const BASE_SELECT = `
  t.*,
  creator.name AS created_by_name,
  ${receivedItemsSubquery()} AS received_items,
  ${soldItemsSubquery()} AS sold_items
`;

function buildFilters({ tenantId, search, dateFrom, dateTo }) {
  const params = [tenantId];
  const conditions = ['t.tenant_id = $1', 't.deleted_at IS NULL'];

  if (search) {
    params.push(`%${search}%`);
    const n = params.length;
    conditions.push(`(t.trade_in_number ILIKE $${n} OR t.customer_name ILIKE $${n} OR t.customer_phone ILIKE $${n})`);
  }
  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`t.trade_in_date >= $${params.length}`);
  }
  if (dateTo) {
    params.push(dateTo);
    conditions.push(`t.trade_in_date <= $${params.length}`);
  }

  return { conditions, params };
}

export function countTradeIns(client, filters) {
  const { conditions, params } = buildFilters(filters);
  return client.query(
    `SELECT COUNT(*) FROM trade_ins t WHERE ${conditions.join(' AND ')}`,
    params,
  ).then((r) => Number(r.rows[0].count));
}

export function listTradeInsPage(client, { tenantId, search, dateFrom, dateTo, limit, offset }) {
  const { conditions, params } = buildFilters({ tenantId, search, dateFrom, dateTo });
  params.push(limit, offset);
  return client.query(
    `SELECT ${BASE_SELECT}
     FROM trade_ins t
     ${BASE_JOINS}
     WHERE ${conditions.join(' AND ')}
     ORDER BY t.trade_in_date DESC, t.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  ).then((r) => r.rows.map(mapTradeIn));
}

export function findTradeInById(client, id, tenantId) {
  return client.query(
    `SELECT ${BASE_SELECT}
     FROM trade_ins t
     ${BASE_JOINS}
     WHERE t.id = $1 AND t.tenant_id = $2 AND t.deleted_at IS NULL`,
    [id, tenantId],
  );
}

export function insertTradeIn(client, tradeIn) {
  return client.query(
    `INSERT INTO trade_ins
       (id, tenant_id, trade_in_number, trade_in_date, customer_name, customer_phone,
        total_trade_in_value, total_sale_amount, payment_amount, payment_method, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      tradeIn.id,
      tradeIn.tenantId,
      tradeIn.tradeInNumber,
      tradeIn.tradeInDate,
      tradeIn.customerName,
      tradeIn.customerPhone,
      tradeIn.totalTradeInValue,
      tradeIn.totalSaleAmount,
      tradeIn.paymentAmount,
      tradeIn.paymentMethod,
      tradeIn.notes,
      tradeIn.createdById,
    ],
  );
}

export function insertTradeInReceivedItem(client, item, tradeInId, tenantId) {
  return client.query(
    `INSERT INTO trade_in_received_items
       (id, trade_in_id, tenant_id, product_id, product_name, serial_number, condition, quantity, trade_in_value)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      item.id,
      tradeInId,
      tenantId,
      item.productId || null,
      item.productName,
      item.serialNumber || '',
      item.condition || 'GOOD',
      item.quantity,
      item.tradeInValue,
    ],
  );
}

export function insertTradeInSoldItem(client, item, tradeInId, tenantId) {
  return client.query(
    `INSERT INTO trade_in_sold_items
       (id, trade_in_id, tenant_id, product_id, product_name, quantity, unit_price, cost_price_snapshot, line_total)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      item.id,
      tradeInId,
      tenantId,
      item.productId || null,
      item.productName,
      item.quantity,
      item.unitPrice,
      item.costPriceSnapshot || 0,
      item.lineTotal,
    ],
  );
}

export function softDeleteTradeIn(client, id, tenantId, { deletedById, deleteReason }) {
  return client.query(
    `UPDATE trade_ins
     SET deleted_at = NOW(), deleted_by_id = $3, delete_reason = $4, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [id, tenantId, deletedById, deleteReason || ''],
  );
}

export function countTrashedTradeIns(client, tenantId) {
  return client.query(
    `SELECT COUNT(*) FROM trade_ins WHERE tenant_id = $1 AND deleted_at IS NOT NULL`,
    [tenantId],
  ).then((r) => Number(r.rows[0].count));
}

export function listTrashedTradeIns(client, { tenantId, limit, offset }) {
  return client.query(
    `SELECT ${BASE_SELECT}, t.deleted_at, t.deleted_by_id, t.delete_reason
     FROM trade_ins t
     ${BASE_JOINS}
     WHERE t.tenant_id = $1 AND t.deleted_at IS NOT NULL
     ORDER BY t.deleted_at DESC
     LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  ).then((r) => r.rows.map(mapTradeIn));
}
