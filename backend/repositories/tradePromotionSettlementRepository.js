export function mapTradePromotionSettlement(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    earningId: row.earning_id,
    ruleName: row.rule_name || null,
    supplierId: row.supplier_id || null,
    supplierName: row.supplier_name || null,
    productId: row.product_id || null,
    productName: row.product_name || null,

    method: row.method,
    settlementDate: row.settlement_date,
    quantityPieces: Number(row.quantity_pieces || 0),
    amount: Number(row.amount || 0),
    financeAccountType: row.finance_account_type || null,
    note: row.note || '',

    createdById: row.created_by,
    createdByName: row.created_by_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTrashedTradePromotionSettlement(row) {
  return {
    ...mapTradePromotionSettlement(row),
    deletedAt: row.deleted_at,
    deletedById: row.deleted_by_id,
    deletedByName: row.deleted_by_name || null,
    deleteReason: row.delete_reason || '',
  };
}

const BASE_JOINS = `
  LEFT JOIN trade_promotion_earnings e ON e.id = ts.earning_id
  LEFT JOIN trade_promotion_rules r ON r.id = e.rule_id
  LEFT JOIN suppliers s ON s.id = e.supplier_id
  LEFT JOIN products p ON p.id = e.product_id
  LEFT JOIN users creator ON creator.id = ts.created_by
`;

const BASE_SELECT = `
  ts.*,
  r.name AS rule_name,
  e.supplier_id,
  s.name AS supplier_name,
  e.product_id,
  p.name AS product_name,
  creator.name AS created_by_name
`;

function buildFilters({ earningId, method, dateFrom, dateTo, tenantId }) {
  const params = [tenantId];
  const conditions = ["ts.tenant_id = $1", "ts.deleted_at IS NULL"];

  if (earningId) {
    params.push(earningId);
    conditions.push(`ts.earning_id = $${params.length}`);
  }

  if (method) {
    params.push(method);
    conditions.push(`ts.method = $${params.length}`);
  }

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`ts.settlement_date >= $${params.length}::date`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`ts.settlement_date <= $${params.length}::date`);
  }

  return { params, where: `WHERE ${conditions.join(" AND ")}` };
}

export async function countTradePromotionSettlements(client, filters = {}) {
  const { params, where } = buildFilters(filters);
  const result = await client.query(
    `SELECT COUNT(*)::INTEGER AS count FROM trade_promotion_settlements ts ${BASE_JOINS} ${where}`,
    params,
  );
  return result.rows[0].count;
}

export async function listTradePromotionSettlementsPage(client, { limit, offset, ...filters }) {
  const { params, where } = buildFilters(filters);
  params.push(limit, offset);
  const result = await client.query(
    `SELECT ${BASE_SELECT} FROM trade_promotion_settlements ts ${BASE_JOINS}
     ${where}
     ORDER BY ts.settlement_date DESC, ts.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapTradePromotionSettlement);
}

export function findTradePromotionSettlementById(client, id, tenantId) {
  return client.query(
    `SELECT ${BASE_SELECT} FROM trade_promotion_settlements ts ${BASE_JOINS}
     WHERE ts.id = $1 AND ts.tenant_id = $2 AND ts.deleted_at IS NULL`,
    [id, tenantId],
  );
}

export function findTradePromotionSettlementForUpdate(client, id, tenantId) {
  return client.query(
    "SELECT * FROM trade_promotion_settlements WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL FOR UPDATE",
    [id, tenantId],
  );
}

export function insertTradePromotionSettlement(client, settlement) {
  return client.query(
    `WITH inserted AS (
      INSERT INTO trade_promotion_settlements (
        id, tenant_id, earning_id, method, settlement_date, quantity_pieces, amount,
        finance_account_type, note, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    )
    SELECT ${BASE_SELECT} FROM inserted ts ${BASE_JOINS}`,
    [
      settlement.id,
      settlement.tenantId,
      settlement.earningId,
      settlement.method,
      settlement.settlementDate,
      settlement.quantityPieces,
      settlement.amount,
      settlement.financeAccountType,
      settlement.note,
      settlement.createdById,
    ],
  );
}

export function softDeleteTradePromotionSettlement(client, id, tenantId, { deletedById, deleteReason } = {}) {
  return client.query(
    `UPDATE trade_promotion_settlements
     SET deleted_at = NOW(), deleted_by_id = $3, delete_reason = $4
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [id, tenantId, deletedById || null, deleteReason || ""],
  );
}

export function restoreTradePromotionSettlement(client, id, tenantId) {
  return client.query(
    `UPDATE trade_promotion_settlements
     SET deleted_at = NULL, deleted_by_id = NULL, delete_reason = ''
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL
     RETURNING *`,
    [id, tenantId],
  );
}

export async function countTrashedTradePromotionSettlements(client, tenantId) {
  const result = await client.query(
    "SELECT COUNT(*)::INTEGER AS count FROM trade_promotion_settlements WHERE tenant_id = $1 AND deleted_at IS NOT NULL",
    [tenantId],
  );
  return result.rows[0].count;
}

export async function listTrashedTradePromotionSettlements(client, { tenantId, limit, offset }) {
  const result = await client.query(
    `SELECT ${BASE_SELECT}, u.name AS deleted_by_name
     FROM trade_promotion_settlements ts ${BASE_JOINS}
     LEFT JOIN users u ON u.id = ts.deleted_by_id
     WHERE ts.tenant_id = $1 AND ts.deleted_at IS NOT NULL
     ORDER BY ts.deleted_at DESC
     LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );
  return result.rows.map(mapTrashedTradePromotionSettlement);
}
