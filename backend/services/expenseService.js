import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { summarizeByAmount } from "../lib/aggregation.js";
import { normalizeIsoDate, normalizeIsoMonth, startOfMonth, startOfNextMonth } from "../lib/dateRanges.js";
import { buildPageResult, parsePagination } from "../lib/pagination.js";
import {
  countTrashedExpenses,
  listTrashedExpenses,
  permanentlyDeleteExpense,
  restoreExpense,
  softDeleteExpense,
  findExpenseById,
  insertExpense,
  listExpensesInRange,
  updateExpense,
} from "../repositories/expenseRepository.js";

const EXPENSE_CATEGORIES = ["Bank", "Salary", "Office", "Rent", "Vehicle", "Other"];
const EXPENSE_DATE_ERROR = "Expense date must be in YYYY-MM-DD format.";

function normalizeCategory(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  const found = EXPENSE_CATEGORIES.find((category) => category.toLowerCase() === raw);
  assert(found, "Invalid expense category.");
  return found;
}

function normalizeExpense(input, fallbackDate) {
  const amount = Number(input.amount);
  const note = String(input.note || "").trim();
  const date = normalizeIsoDate(input.date, fallbackDate, EXPENSE_DATE_ERROR);
  const category = normalizeCategory(input.category);

  assert(amount > 0, "Expense amount must be greater than zero.");
  assert(note, "Expense note is required.");

  return {
    id: input.id || createId("expense"),
    date,
    category,
    amount,
    note,
  };
}

function aggregateExpenses(expenses) {
  const { count, totalAmount, groups } = summarizeByAmount(
    expenses,
    (expense) => expense.category,
    (expense) => ({ category: expense.category }),
  );

  return { count, totalAmount, byCategory: groups };
}

export class ExpenseService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async getExpenseReport({ date, month }, actor) {
    const selectedDate = normalizeIsoDate(date, new Date().toISOString().slice(0, 10), EXPENSE_DATE_ERROR);
    const selectedMonth = normalizeIsoMonth(month, selectedDate.slice(0, 7));
    const monthStart = startOfMonth(selectedMonth);
    const nextMonthStart = startOfNextMonth(selectedMonth);

    const client = await this.databaseManager.getPool().connect();
    try {
      const monthlyExpenses = await listExpensesInRange(client, monthStart, nextMonthStart, actor.tenantId);
      const dailyExpenses = monthlyExpenses.filter((expense) => expense.date === selectedDate);

      return {
        date: selectedDate,
        month: selectedMonth,
        dailyExpenses,
        monthlyExpenses,
        dailySummary: aggregateExpenses(dailyExpenses),
        monthlySummary: aggregateExpenses(monthlyExpenses),
        categories: EXPENSE_CATEGORIES,
      };
    } finally {
      client.release();
    }
  }

  async saveExpense(input, actor) {
    const fallbackDate = new Date().toISOString().slice(0, 10);
    const expense = normalizeExpense(input, fallbackDate);

    return this.databaseManager.withTransaction(async (client) => {
      if (input.id) {
        const existingExpense = await findExpenseById(client, expense.id, actor.tenantId);
        assert(existingExpense, "Expense not found.", 404);

        await updateExpense(client, expense, actor.tenantId);
        await this.auditService.record(client, {
          tenantId: actor.tenantId,
          userId: actor.id,
          actionType: "expense.update",
          entityType: "expense",
          entityId: expense.id,
          description: `${actor.name} updated expense ${expense.category}`,
          metadata: { date: expense.date, category: expense.category, amount: expense.amount },
        });
      } else {
        expense.createdBy = actor.id;
        expense.tenantId = actor.tenantId;
        await insertExpense(client, expense);
        await this.auditService.record(client, {
          tenantId: actor.tenantId,
          userId: actor.id,
          actionType: "expense.create",
          entityType: "expense",
          entityId: expense.id,
          description: `${actor.name} created expense ${expense.category}`,
          metadata: { date: expense.date, category: expense.category, amount: expense.amount },
        });
      }

      return expense;
    });
  }

  async removeExpense(expenseId, actor, reason) {
    return this.databaseManager.withTransaction(async (client) => {
      const existingExpense = await findExpenseById(client, expenseId, actor.tenantId);
      assert(existingExpense, "Expense not found.", 404);
      const result = await softDeleteExpense(client, expenseId, actor.tenantId, {
        deletedById: actor.id,
        deleteReason: reason,
      });
      assert(result.rowCount > 0, "Expense not found.", 404);

      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: "expense.delete",
        entityType: "expense",
        entityId: expenseId,
        description: `${actor.name} moved expense ${existingExpense.category} to trash${reason ? ` (${reason})` : ""}`,
        metadata: { date: existingExpense.date, category: existingExpense.category, amount: existingExpense.amount },
      });

      return { ok: true };
    });
  }

  async restoreExpense(expenseId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await restoreExpense(client, expenseId, actor.tenantId);
      assert(result.rowCount > 0, "Expense not found in trash.", 404);

      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: "expense.restore",
        entityType: "expense",
        entityId: expenseId,
        description: `${actor.name} restored expense ${result.rows[0].category} from trash`,
        metadata: { date: result.rows[0].expense_date, category: result.rows[0].category, amount: result.rows[0].amount },
      });

      return { ok: true };
    });
  }

  async permanentlyDeleteExpense(expenseId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await permanentlyDeleteExpense(client, expenseId, actor.tenantId);
      assert(result.rowCount > 0, "Expense not found in trash.", 404);

      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: "expense.permanent_delete",
        entityType: "expense",
        entityId: expenseId,
        description: `${actor.name} permanently deleted expense ${expenseId}`,
      });

      return { ok: true };
    });
  }

  async listTrashedExpenses(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const tenantId = actor.tenantId;

    const client = await this.databaseManager.getPool().connect();
    try {
      const [items, total] = await Promise.all([
        listTrashedExpenses(client, { tenantId, limit, offset }),
        countTrashedExpenses(client, tenantId),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    } finally {
      client.release();
    }
  }
}
