export function mapAccount(row) {
  return {
    id: row.id,
    organizationId: row.tenant_id,
    type: row.type,
    name: row.name,
    balance: Number(row.balance || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTransaction(row) {
  return {
    id: row.id,
    organizationId: row.tenant_id,
    accountId: row.account_id,
    accountType: row.account_type || null,
    accountName: row.account_name || null,
    transactionDate: row.transaction_date,
    type: row.type,
    debit: Number(row.debit || 0),
    credit: Number(row.credit || 0),
    balanceAfter: Number(row.balance_after || 0),
    transferId: row.transfer_id,
    note: row.note,
    createdById: row.created_by,
    createdByName: row.created_by_name || null,
    createdAt: row.created_at,
  };
}

function buildFilterClause({ tenantId, accountType, dateFrom, dateTo }, params) {
  params.push(tenantId);
  const conditions = [
    "finance_account_transactions.tenant_id = $" + params.length,
    "finance_account_transactions.deleted_at IS NULL",
  ];

  if (accountType) {
    params.push(accountType);
    conditions.push(`finance_accounts.type = $${params.length}`);
  }

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`finance_account_transactions.transaction_date >= $${params.length}::date`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`finance_account_transactions.transaction_date <= $${params.length}::date`);
  }

  return `WHERE ${conditions.join(" AND ")}`;
}

function buildSelect() {
  return `SELECT
      finance_account_transactions.*,
      finance_accounts.type AS account_type,
      finance_accounts.name AS account_name,
      users.name AS created_by_name
    FROM finance_account_transactions
    JOIN finance_accounts
      ON finance_accounts.id = finance_account_transactions.account_id
    LEFT JOIN users
      ON users.id = finance_account_transactions.created_by`;
}

export async function listAccounts(client, tenantId) {
  const result = await client.query(
    `SELECT * FROM finance_accounts WHERE tenant_id = $1 ORDER BY type ASC`,
    [tenantId],
  );
  return result.rows.map(mapAccount);
}

export async function findAccountByType(client, tenantId, type) {
  const result = await client.query(
    `SELECT * FROM finance_accounts WHERE tenant_id = $1 AND type = $2 LIMIT 1`,
    [tenantId, type],
  );
  return result.rowCount > 0 ? mapAccount(result.rows[0]) : null;
}

export async function findAccountForUpdate(client, accountId, tenantId) {
  const result = await client.query(
    `SELECT * FROM finance_accounts WHERE id = $1 AND tenant_id = $2 FOR UPDATE LIMIT 1`,
    [accountId, tenantId],
  );
  return result.rowCount > 0 ? mapAccount(result.rows[0]) : null;
}

export async function insertAccount(client, account) {
  const result = await client.query(
    `INSERT INTO finance_accounts (id, tenant_id, type, name, balance)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tenant_id, type) DO NOTHING
     RETURNING *`,
    [account.id, account.tenantId, account.type, account.name, account.balance || 0],
  );
  return result.rowCount > 0 ? mapAccount(result.rows[0]) : null;
}

export async function updateAccountBalance(client, accountId, tenantId, newBalance) {
  const result = await client.query(
    `UPDATE finance_accounts
     SET balance = $3, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [accountId, tenantId, newBalance],
  );
  return result.rowCount > 0 ? mapAccount(result.rows[0]) : null;
}

export function insertTransaction(client, transaction) {
  return client.query(
    `INSERT INTO finance_account_transactions (
       id,
       tenant_id,
       account_id,
       transaction_date,
       type,
       debit,
       credit,
       balance_after,
       transfer_id,
       note,
       created_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      transaction.id,
      transaction.tenantId,
      transaction.accountId,
      transaction.transactionDate,
      transaction.type,
      transaction.debit,
      transaction.credit,
      transaction.balanceAfter,
      transaction.transferId || null,
      transaction.note || "",
      transaction.createdById,
    ],
  );
}

export async function findTransactionForUpdate(client, transactionId, tenantId) {
  const result = await client.query(
    `SELECT * FROM finance_account_transactions
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
     FOR UPDATE LIMIT 1`,
    [transactionId, tenantId],
  );
  return result.rowCount > 0 ? mapTransaction(result.rows[0]) : null;
}

export async function findTransactionByTransferId(client, transferId, excludeTransactionId, tenantId) {
  const result = await client.query(
    `SELECT * FROM finance_account_transactions
     WHERE transfer_id = $1 AND tenant_id = $2 AND id != $3 AND deleted_at IS NULL
     LIMIT 1`,
    [transferId, tenantId, excludeTransactionId],
  );
  return result.rowCount > 0 ? mapTransaction(result.rows[0]) : null;
}

export function softDeleteTransaction(client, transactionId, tenantId, { deletedById, deleteReason } = {}) {
  return client.query(
    `UPDATE finance_account_transactions
     SET deleted_at = NOW(), deleted_by_id = $3, delete_reason = $4
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [transactionId, tenantId, deletedById || null, deleteReason || ""],
  );
}

export async function getLatestTransaction(client, accountId, tenantId) {
  const result = await client.query(
    `SELECT * FROM finance_account_transactions
     WHERE account_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [accountId, tenantId],
  );
  return result.rowCount > 0 ? mapTransaction(result.rows[0]) : null;
}

export async function countTransactions(client, filters = {}) {
  const params = [];
  const where = buildFilterClause(filters, params);
  const result = await client.query(
    `SELECT COUNT(*)::INTEGER AS count
     FROM finance_account_transactions
     JOIN finance_accounts ON finance_accounts.id = finance_account_transactions.account_id
     ${where}`,
    params,
  );
  return result.rows[0].count;
}

export async function getMonthlyCashFlow(client, tenantId, dateFrom, dateTo) {
  const result = await client.query(
    `SELECT
       COALESCE(SUM(CASE WHEN type IN ('DEPOSIT', 'TRANSFER_IN') THEN debit ELSE 0 END), 0) AS inflow,
       COALESCE(SUM(CASE WHEN type IN ('WITHDRAWAL', 'TRANSFER_OUT') THEN credit ELSE 0 END), 0) AS outflow
     FROM finance_account_transactions
     WHERE tenant_id = $1
       AND deleted_at IS NULL
       AND transaction_date >= $2::date
       AND transaction_date < $3::date`,
    [tenantId, dateFrom, dateTo],
  );
  return {
    inflow: Number(result.rows[0].inflow || 0),
    outflow: Number(result.rows[0].outflow || 0),
  };
}

export async function listRecentTransactions(client, tenantId, limit) {
  const result = await client.query(
    `${buildSelect()}
     WHERE finance_account_transactions.tenant_id = $1
       AND finance_account_transactions.deleted_at IS NULL
     ORDER BY finance_account_transactions.transaction_date DESC,
              finance_account_transactions.created_at DESC,
              finance_account_transactions.id DESC
     LIMIT $2`,
    [tenantId, limit],
  );
  return result.rows.map(mapTransaction);
}

export async function listTransactionsPage(client, { tenantId, accountType, dateFrom, dateTo, limit, offset }) {
  const params = [];
  const where = buildFilterClause({ tenantId, accountType, dateFrom, dateTo }, params);
  params.push(limit, offset);
  const result = await client.query(
    `${buildSelect()}
     ${where}
     ORDER BY finance_account_transactions.transaction_date DESC, finance_account_transactions.created_at DESC, finance_account_transactions.id DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return result.rows.map(mapTransaction);
}
