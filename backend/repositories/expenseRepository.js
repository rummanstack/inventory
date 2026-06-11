function mapExpense(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    date: row.expense_date,
    category: row.category,
    amount: Number(row.amount),
    note: row.note,
    createdById: row.created_by,
    createdByName: row.created_by_name,
    createdByEmail: row.created_by_email,
    createdByRole: row.created_by_role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTrashedExpense(row) {
  return {
    ...mapExpense(row),
    deletedAt: row.deleted_at,
    deletedById: row.deleted_by_id,
    deletedByName: row.deleted_by_name || null,
    deleteReason: row.delete_reason || '',
  };
}

export function insertExpense(client, expense) {
  return client.query(
    `INSERT INTO expenses (id, tenant_id, expense_date, category, amount, note, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [expense.id, expense.tenantId, expense.date, expense.category, expense.amount, expense.note, expense.createdBy],
  );
}

export function updateExpense(client, expense, tenantId) {
  return client.query(
    `UPDATE expenses
     SET expense_date = $3,
         category = $4,
         amount = $5,
         note = $6,
         updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2`,
    [expense.id, tenantId, expense.date, expense.category, expense.amount, expense.note],
  );
}

export function softDeleteExpense(client, expenseId, tenantId, { deletedById, deleteReason } = {}) {
  return client.query(
    `UPDATE expenses
     SET deleted_at = NOW(), deleted_by_id = $3, delete_reason = $4
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [expenseId, tenantId, deletedById || null, deleteReason || ""],
  );
}

export function restoreExpense(client, expenseId, tenantId) {
  return client.query(
    `UPDATE expenses
     SET deleted_at = NULL, deleted_by_id = NULL, delete_reason = ''
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL
     RETURNING *`,
    [expenseId, tenantId],
  );
}

export function permanentlyDeleteExpense(client, expenseId, tenantId) {
  return client.query(
    "DELETE FROM expenses WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL",
    [expenseId, tenantId],
  );
}

export async function countTrashedExpenses(client, tenantId) {
  const result = await client.query(
    "SELECT COUNT(*)::INTEGER AS count FROM expenses WHERE tenant_id = $1 AND deleted_at IS NOT NULL",
    [tenantId],
  );
  return result.rows[0].count;
}

export async function listTrashedExpenses(client, { tenantId, limit, offset }) {
  const result = await client.query(
    `SELECT
      expenses.*,
      u.name AS deleted_by_name,
      creator.name AS created_by_name,
      creator.email AS created_by_email,
      creator.role AS created_by_role
    FROM expenses
    LEFT JOIN users u ON u.id = expenses.deleted_by_id
    LEFT JOIN users creator ON creator.id = expenses.created_by
    WHERE expenses.tenant_id = $1 AND expenses.deleted_at IS NOT NULL
    ORDER BY expenses.deleted_at DESC
    LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );

  return result.rows.map(mapTrashedExpense);
}

export async function findExpenseById(client, expenseId, tenantId) {
  const result = await client.query(
    `SELECT
      expenses.*,
      users.name AS created_by_name,
      users.email AS created_by_email,
      users.role AS created_by_role
    FROM expenses
    LEFT JOIN users ON users.id = expenses.created_by
    WHERE expenses.id = $1 AND expenses.tenant_id = $2 AND expenses.deleted_at IS NULL`,
    [expenseId, tenantId],
  );

  return mapExpense(result.rows[0]);
}

export async function listExpensesInRange(client, startDate, endDate, tenantId) {
  const result = await client.query(
    `SELECT
      expenses.*,
      users.name AS created_by_name,
      users.email AS created_by_email,
      users.role AS created_by_role
    FROM expenses
    LEFT JOIN users ON users.id = expenses.created_by
    WHERE expenses.tenant_id = $1
      AND expenses.expense_date >= $2
      AND expenses.expense_date < $3
      AND expenses.deleted_at IS NULL
    ORDER BY expenses.expense_date DESC, expenses.created_at DESC`,
    [tenantId, startDate, endDate],
  );

  return result.rows.map(mapExpense);
}
