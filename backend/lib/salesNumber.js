async function nextSalesNumber(client, tenantId, year, counterType, prefix) {
  const lockResult = await client.query(
    `SELECT last_value FROM sales_number_counters WHERE tenant_id = $1 AND year = $2 AND counter_type = $3 FOR UPDATE`,
    [tenantId, year, counterType],
  );

  let nextValue;
  if (lockResult.rows.length) {
    nextValue = Number(lockResult.rows[0].last_value) + 1;
    await client.query(
      `UPDATE sales_number_counters SET last_value = $4 WHERE tenant_id = $1 AND year = $2 AND counter_type = $3`,
      [tenantId, year, counterType, nextValue],
    );
  } else {
    nextValue = 1;
    await client.query(
      `INSERT INTO sales_number_counters (tenant_id, year, counter_type, last_value) VALUES ($1, $2, $3, $4)`,
      [tenantId, year, counterType, nextValue],
    );
  }

  const sequence = String(nextValue).padStart(6, "0");
  return `${prefix}-${year}-${sequence}`;
}

export function nextInvoiceNumber(client, tenantId, year) {
  return nextSalesNumber(client, tenantId, year, "INVOICE", "INV");
}

export function nextReturnNumber(client, tenantId, year) {
  return nextSalesNumber(client, tenantId, year, "RETURN", "SRT");
}
