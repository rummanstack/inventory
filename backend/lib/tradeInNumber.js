export async function nextTradeInNumber(client, tenantId, year) {
  const lockResult = await client.query(
    `SELECT last_value FROM trade_in_counters WHERE tenant_id = $1 AND year = $2 FOR UPDATE`,
    [tenantId, year],
  );

  let nextValue;
  if (lockResult.rows.length) {
    nextValue = Number(lockResult.rows[0].last_value) + 1;
    await client.query(
      `UPDATE trade_in_counters SET last_value = $3 WHERE tenant_id = $1 AND year = $2`,
      [tenantId, year, nextValue],
    );
  } else {
    nextValue = 1;
    await client.query(
      `INSERT INTO trade_in_counters (tenant_id, year, last_value) VALUES ($1, $2, $3)`,
      [tenantId, year, nextValue],
    );
  }

  return `TRD-${year}-${String(nextValue).padStart(4, "0")}`;
}
