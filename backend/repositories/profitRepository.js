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
