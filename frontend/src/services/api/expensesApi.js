import { apiRequest, buildQueryString } from './client.js';

export const expensesApi = {
  getExpenseReport({ date, month } = {}) {
    return apiRequest(`/expenses${buildQueryString({ date, month })}`);
  },

  getExpenseRangeReport({ dateFrom, dateTo } = {}) {
    return apiRequest(`/expenses/range${buildQueryString({ dateFrom, dateTo })}`);
  },

  createExpense(expense) {
    return apiRequest("/expenses", { method: "POST", body: JSON.stringify(expense) });
  },

  updateExpense(expense) {
    return apiRequest(`/expenses/${expense.id}`, { method: "PATCH", body: JSON.stringify(expense) });
  },

  deleteExpense(expenseId, reason) {
    return apiRequest(`/expenses/${expenseId}`, { method: "DELETE", body: JSON.stringify({ reason }) });
  },

  listExpensesTrash({ page, pageSize } = {}) {
    return apiRequest(`/expenses/trash${buildQueryString({ page, pageSize })}`);
  },

  restoreExpense(expenseId) {
    return apiRequest(`/expenses/${expenseId}/restore`, { method: "POST" });
  },

  permanentlyDeleteExpense(expenseId) {
    return apiRequest(`/expenses/${expenseId}/permanent`, { method: "DELETE" });
  },
};
