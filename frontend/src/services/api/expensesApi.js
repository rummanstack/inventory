import { apiRequest } from './client.js';

export const expensesApi = {
  getExpenseReport({ date, month } = {}) {
    const params = new URLSearchParams();
    if (date) {
      params.set("date", date);
    }
    if (month) {
      params.set("month", month);
    }
    const query = params.toString();
    return apiRequest(`/expenses${query ? `?${query}` : ""}`);
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
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiRequest(`/expenses/trash${query ? `?${query}` : ""}`);
  },

  restoreExpense(expenseId) {
    return apiRequest(`/expenses/${expenseId}/restore`, { method: "POST" });
  },

  permanentlyDeleteExpense(expenseId) {
    return apiRequest(`/expenses/${expenseId}/permanent`, { method: "DELETE" });
  },
};
