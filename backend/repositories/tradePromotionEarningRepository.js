export function mapTradePromotionEarning(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    ruleId: row.rule_id,
    ruleName: row.rule_name || null,
    purchaseReceiptId: row.purchase_receipt_id,
    purchaseNumber: row.purchase_number || null,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name || null,
    productId: row.product_id || null,
    productName: row.product_name || null,

    matchedItemIds: Array.isArray(row.matched_item_ids) ? row.matched_item_ids : [],
    purchasedQuantityPieces: Number(row.purchased_quantity_pieces || 0),
    qualifyingValue: Number(row.qualifying_value || 0),

    rewardKind: row.reward_kind,
    earnedQuantityPieces: Number(row.earned_quantity_pieces || 0),
    earnedAmount: Number(row.earned_amount || 0),
    settlementMethod: row.settlement_method,

    status: row.status,
    settledQuantityPieces: Number(row.settled_quantity_pieces || 0),
    settledAmount: Number(row.settled_amount || 0),
    remainingQuantityPieces: Math.max(0, Number(row.earned_quantity_pieces || 0) - Number(row.settled_quantity_pieces || 0)),
    remainingAmount: Math.max(0, Number(row.earned_amount || 0) - Number(row.settled_amount || 0)),

    earnedDate: row.earned_date,
    createdById: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const BASE_JOINS = `
  LEFT JOIN trade_promotion_rules r ON r.id = e.rule_id
  LEFT JOIN purchase_receipts pr ON pr.id = e.purchase_receipt_id
  LEFT JOIN suppliers s ON s.id = e.supplier_id
  LEFT JOIN products p ON p.id = e.product_id
`;

const BASE_SELECT = `
  e.*,
  r.name AS rule_name,
  pr.purchase_number,
  s.name AS supplier_name,
  p.name AS product_name
`;

function buildFilters({ status, statuses, supplierId, productId, ruleId, dateFrom, dateTo, search, tenantId }) {
  const params = [tenantId];
  const conditions = ["e.tenant_id = $1"];

  if (statuses && statuses.length) {
    params.push(statuses);
    conditions.push(`e.status = ANY($${params.length})`);
  } else if (status) {
    params.push(status);
    conditions.push(`e.status = $${params.length}`);
  }

  if (supplierId) {
    params.push(supplierId);
    conditions.push(`e.supplier_id = $${params.length}`);
  }

  if (productId) {
    params.push(productId);
    conditions.push(`e.product_id = $${params.length}`);
  }

  if (ruleId) {
    params.push(ruleId);
    conditions.push(`e.rule_id = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(r.name ILIKE $${params.length} OR s.name ILIKE $${params.length} OR p.name ILIKE $${params.length} OR pr.purchase_number ILIKE $${params.length})`);
  }

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`e.earned_date >= $${params.length}::date`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`e.earned_date <= $${params.length}::date`);
  }

  return { params, where: `WHERE ${conditions.join(" AND ")}` };
}

export async function countTradePromotionEarnings(client, filters = {}) {
  const { params, where } = buildFilters(filters);
  const result = await client.query(
    `SELECT COUNT(*)::INTEGER AS count FROM trade_promotion_earnings e ${BASE_JOINS} ${where}`,
    params,
  );
  return result.rows[0].count;
}

export async function listTradePromotionEarningsPage(client, { limit, offset, ...filters }) {
  const { params, where } = buildFilters(filters);
  params.push(limit, offset);
  const result = await client.query(
    `SELECT ${BASE_SELECT} FROM trade_promotion_earnings e ${BASE_JOINS}
     ${where}
     ORDER BY e.earned_date DESC, e.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapTradePromotionEarning);
}

export function findTradePromotionEarningById(client, id, tenantId) {
  return client.query(
    `SELECT ${BASE_SELECT} FROM trade_promotion_earnings e ${BASE_JOINS}
     WHERE e.id = $1 AND e.tenant_id = $2`,
    [id, tenantId],
  );
}

export function findTradePromotionEarningForUpdate(client, id, tenantId) {
  return client.query(
    "SELECT * FROM trade_promotion_earnings WHERE id = $1 AND tenant_id = $2 FOR UPDATE",
    [id, tenantId],
  );
}

export async function findTradePromotionEarningsByPurchase(client, purchaseReceiptId, tenantId) {
  const result = await client.query(
    `SELECT ${BASE_SELECT} FROM trade_promotion_earnings e ${BASE_JOINS}
     WHERE e.purchase_receipt_id = $1 AND e.tenant_id = $2`,
    [purchaseReceiptId, tenantId],
  );
  return result.rows.map(mapTradePromotionEarning);
}

export function insertTradePromotionEarning(client, earning) {
  return client.query(
    `WITH inserted AS (
      INSERT INTO trade_promotion_earnings (
        id, tenant_id, rule_id, purchase_receipt_id, supplier_id, product_id,
        matched_item_ids, purchased_quantity_pieces, qualifying_value, reward_kind,
        earned_quantity_pieces, earned_amount, settlement_method, status, earned_date,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    )
    SELECT ${BASE_SELECT} FROM inserted e ${BASE_JOINS}`,
    [
      earning.id,
      earning.tenantId,
      earning.ruleId,
      earning.purchaseReceiptId,
      earning.supplierId,
      earning.productId,
      JSON.stringify(earning.matchedItemIds || []),
      earning.purchasedQuantityPieces,
      earning.qualifyingValue,
      earning.rewardKind,
      earning.earnedQuantityPieces,
      earning.earnedAmount,
      earning.settlementMethod,
      earning.status,
      earning.earnedDate,
      earning.createdById,
    ],
  );
}

// Applies a settled-quantity/amount delta (positive when settling, negative
// when voiding a settlement) and sets the resulting status in one write.
export function updateTradePromotionEarningSettlementProgress(client, { id, tenantId, settledQuantityDelta = 0, settledAmountDelta = 0, status }) {
  return client.query(
    `UPDATE trade_promotion_earnings
     SET settled_quantity_pieces = settled_quantity_pieces + $3,
         settled_amount = settled_amount + $4,
         status = $5,
         updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [id, tenantId, settledQuantityDelta, settledAmountDelta, status],
  );
}

export function updateTradePromotionEarningStatus(client, id, tenantId, status) {
  return client.query(
    `UPDATE trade_promotion_earnings SET status = $3, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *`,
    [id, tenantId, status],
  );
}

// Hard delete — only used by TradePromotionEngineService.recomputeEarningsForPurchase's
// "replace" strategy, and only ever on rows that are still fully unsettled (asserted by
// the caller before this is reached).
export function deleteTradePromotionEarning(client, id, tenantId) {
  return client.query(
    "DELETE FROM trade_promotion_earnings WHERE id = $1 AND tenant_id = $2",
    [id, tenantId],
  );
}

// ── Reports ──────────────────────────────────────────────────────────────
// Pending/Settled Promotions reuse listTradePromotionEarningsPage with a status
// filter — no dedicated query needed. The three below are aggregate summaries.

function buildReportDateFilter({ tenantId, dateFrom, dateTo }) {
  const params = [tenantId];
  const conditions = ["e.tenant_id = $1", "e.status != 'REVERSED'"];
  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`e.earned_date >= $${params.length}::date`);
  }
  if (dateTo) {
    params.push(dateTo);
    conditions.push(`e.earned_date <= $${params.length}::date`);
  }
  return { params, where: `WHERE ${conditions.join(" AND ")}` };
}

export async function getSupplierPromotionSummary(client, filters) {
  const { params, where } = buildReportDateFilter(filters);
  const result = await client.query(
    `SELECT e.supplier_id, s.name AS supplier_name,
            COUNT(*)::INTEGER AS earning_count,
            COALESCE(SUM(e.earned_amount), 0) AS total_earned_amount,
            COALESCE(SUM(e.earned_quantity_pieces), 0) AS total_earned_quantity,
            COALESCE(SUM(e.settled_amount), 0) AS total_settled_amount,
            COALESCE(SUM(e.settled_quantity_pieces), 0) AS total_settled_quantity
     FROM trade_promotion_earnings e
     LEFT JOIN suppliers s ON s.id = e.supplier_id
     ${where}
     GROUP BY e.supplier_id, s.name
     ORDER BY total_earned_amount DESC, total_earned_quantity DESC`,
    params,
  );
  return result.rows.map(mapPromotionSummaryRow("supplierId", "supplier_id", "supplierName", "supplier_name"));
}

export async function getProductPromotionSummary(client, filters) {
  const { params, where } = buildReportDateFilter(filters);
  const result = await client.query(
    `SELECT e.product_id, p.name AS product_name,
            COUNT(*)::INTEGER AS earning_count,
            COALESCE(SUM(e.earned_amount), 0) AS total_earned_amount,
            COALESCE(SUM(e.earned_quantity_pieces), 0) AS total_earned_quantity,
            COALESCE(SUM(e.settled_amount), 0) AS total_settled_amount,
            COALESCE(SUM(e.settled_quantity_pieces), 0) AS total_settled_quantity
     FROM trade_promotion_earnings e
     LEFT JOIN products p ON p.id = e.product_id
     ${where}
     GROUP BY e.product_id, p.name
     ORDER BY total_earned_amount DESC, total_earned_quantity DESC`,
    params,
  );
  // e.product_id is NULL for ALL/CATEGORY-scoped rules (they don't earn against one
  // single product) — label that bucket instead of leaving it blank.
  return result.rows.map(mapPromotionSummaryRow("productId", "product_id", "productName", "product_name")).map((row) => ({
    ...row,
    productName: row.productId ? row.productName : "Multiple Products",
  }));
}

export async function getDateWisePromotionReport(client, filters) {
  const { params, where } = buildReportDateFilter(filters);
  const result = await client.query(
    `SELECT e.earned_date AS date,
            COUNT(*)::INTEGER AS earning_count,
            COALESCE(SUM(e.earned_amount), 0) AS total_earned_amount,
            COALESCE(SUM(e.earned_quantity_pieces), 0) AS total_earned_quantity,
            COALESCE(SUM(e.settled_amount), 0) AS total_settled_amount,
            COALESCE(SUM(e.settled_quantity_pieces), 0) AS total_settled_quantity
     FROM trade_promotion_earnings e
     ${where}
     GROUP BY e.earned_date
     ORDER BY e.earned_date DESC`,
    params,
  );
  return result.rows.map((row) => ({
    date: row.date,
    earningCount: Number(row.earning_count || 0),
    totalEarnedAmount: Number(row.total_earned_amount || 0),
    totalEarnedQuantity: Number(row.total_earned_quantity || 0),
    totalSettledAmount: Number(row.total_settled_amount || 0),
    totalSettledQuantity: Number(row.total_settled_quantity || 0),
  }));
}

function mapPromotionSummaryRow(idKey, idCol, nameKey, nameCol) {
  return (row) => ({
    [idKey]: row[idCol] || null,
    [nameKey]: row[nameCol] || null,
    earningCount: Number(row.earning_count || 0),
    totalEarnedAmount: Number(row.total_earned_amount || 0),
    totalEarnedQuantity: Number(row.total_earned_quantity || 0),
    totalSettledAmount: Number(row.total_settled_amount || 0),
    totalSettledQuantity: Number(row.total_settled_quantity || 0),
  });
}
