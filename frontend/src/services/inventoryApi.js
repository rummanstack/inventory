async function apiRequest(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || "Request failed.");
    error.status = response.status;
    throw error;
  }
  return data;
}

async function downloadRequest(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    ...options,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const error = new Error(data?.message || "Request failed.");
    error.status = response.status;
    throw error;
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="?([^";]+)"?/i);

  return {
    blob,
    filename: match?.[1] || "arinda-database-backup.sql",
  };
}

export const inventoryApi = {
  getCurrentUser() {
    return apiRequest("/auth/me");
  },

  login({ email, password, orgSlug }) {
    return apiRequest("/auth/login", { method: "POST", body: JSON.stringify({ email, password, orgSlug }) });
  },

  logout() {
    return apiRequest("/auth/logout", { method: "POST" });
  },

  listUsers() {
    return apiRequest("/users");
  },

  createUser(user) {
    return apiRequest("/users", { method: "POST", body: JSON.stringify(user) });
  },

  updateUser(userId, user) {
    return apiRequest(`/users/${userId}`, { method: "PATCH", body: JSON.stringify(user) });
  },

  deleteUser(userId) {
    return apiRequest(`/users/${userId}`, { method: "DELETE" });
  },

  updateProfile(fields) {
    return apiRequest("/profile", { method: "PATCH", body: JSON.stringify(fields) });
  },

  listActivityLogs({ page, pageSize, search } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    if (search) params.set("search", search);
    const query = params.toString();
    return apiRequest(`/activity-logs${query ? `?${query}` : ""}`);
  },

  getSystemHealth() {
    return apiRequest("/system/health");
  },

  listErrorLogs({ page, pageSize } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiRequest(`/system/error-logs${query ? `?${query}` : ""}`);
  },

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

  getProfitReport({ dateFrom, dateTo } = {}) {
    const params = new URLSearchParams();
    if (dateFrom) {
      params.set("dateFrom", dateFrom);
    }
    if (dateTo) {
      params.set("dateTo", dateTo);
    }
    const query = params.toString();
    return apiRequest(`/profit-report${query ? `?${query}` : ""}`);
  },

  createExpense(expense) {
    return apiRequest("/expenses", { method: "POST", body: JSON.stringify(expense) });
  },

  updateExpense(expense) {
    return apiRequest(`/expenses/${expense.id}`, { method: "PATCH", body: JSON.stringify(expense) });
  },

  deleteExpense(expenseId) {
    return apiRequest(`/expenses/${expenseId}`, { method: "DELETE" });
  },

  getCashReceiptReport({ date, month, dsrId } = {}) {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (month) params.set("month", month);
    if (dsrId) params.set("dsrId", dsrId);
    const query = params.toString();
    return apiRequest(`/dsr-cash-receipts${query ? `?${query}` : ""}`);
  },

  createCashReceipt(record) {
    return apiRequest("/dsr-cash-receipts", { method: "POST", body: JSON.stringify(record) });
  },
  updateCashReceipt(record) {
    return apiRequest(`/dsr-cash-receipts/${record.id}`, { method: "PATCH", body: JSON.stringify(record) });
  },

  deleteCashReceipt(recordId) {
    return apiRequest(`/dsr-cash-receipts/${recordId}`, { method: "DELETE" });
  },

  getAdvanceReport({ date, month, dsrId } = {}) {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (month) params.set("month", month);
    if (dsrId) params.set("dsrId", dsrId);
    const query = params.toString();
    return apiRequest(`/dsr-advances${query ? `?${query}` : ""}`);
  },

  createAdvance(record) {
    return apiRequest("/dsr-advances", { method: "POST", body: JSON.stringify(record) });
  },

  updateAdvance(record) {
    return apiRequest(`/dsr-advances/${record.id}`, { method: "PATCH", body: JSON.stringify(record) });
  },
  deleteAdvance(recordId) {
    return apiRequest(`/dsr-advances/${recordId}`, { method: "DELETE" });
  },

  getMonthEndSummary({ month } = {}) {
    const params = new URLSearchParams();
    if (month) params.set("month", month);
    const query = params.toString();
    return apiRequest(`/month-end-summary${query ? `?${query}` : ""}`);
  },

  downloadDatabaseBackup(format = "sql") {
    return downloadRequest(`/database-backup?format=${format}`);
  },

  listBackupHistory({ page, pageSize, search } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    if (search) params.set("search", search);
    const query = params.toString();
    return apiRequest(`/database-backup/history${query ? `?${query}` : ""}`);
  },

  listProducts({ page, pageSize, search } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    if (search) params.set("search", search);
    const query = params.toString();
    return apiRequest(`/products${query ? `?${query}` : ""}`);
  },

  getProductsDirectory() {
    return apiRequest("/products/directory");
  },

  listDsrs({ page, pageSize, search } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    if (search) params.set("search", search);
    const query = params.toString();
    return apiRequest(`/dsrs${query ? `?${query}` : ""}`);
  },

  getDsrsDirectory() {
    return apiRequest("/dsrs/directory");
  },

  listIssues({ page, pageSize, search, dsrId, dateFrom, dateTo } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    if (search) params.set("search", search);
    if (dsrId) params.set("dsrId", dsrId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const query = params.toString();
    return apiRequest(`/issues${query ? `?${query}` : ""}`);
  },

  listSettlements({ page, pageSize, search, dsrId, dateFrom, dateTo } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    if (search) params.set("search", search);
    if (dsrId) params.set("dsrId", dsrId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const query = params.toString();
    return apiRequest(`/settlements${query ? `?${query}` : ""}`);
  },

  createProduct(product) {
    return apiRequest("/products", { method: "POST", body: JSON.stringify(product) });
  },

  updateProduct(product) {
    return apiRequest(`/products/${product.id}`, { method: "PUT", body: JSON.stringify(product) });
  },

  deleteProduct(productId) {
    return apiRequest(`/products/${productId}`, { method: "DELETE" });
  },

  addProductStock(productId, addPieces) {
    return apiRequest(`/products/${productId}/stock`, { method: "POST", body: JSON.stringify({ addPieces }) });
  },

  // Platform admin endpoints
  listTenants() {
    return apiRequest("/platform/tenants");
  },

  createTenant(tenant) {
    return apiRequest("/platform/tenants", { method: "POST", body: JSON.stringify(tenant) });
  },

  updateTenant(tenantId, fields) {
    return apiRequest(`/platform/tenants/${tenantId}`, { method: "PATCH", body: JSON.stringify(fields) });
  },

  setTenantStatus(tenantId, status) {
    return apiRequest(`/platform/tenants/${tenantId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
  },

  getTenantFeatures(tenantId) {
    return apiRequest(`/platform/tenants/${tenantId}/features`);
  },

  updateTenantFeatures(tenantId, features) {
    return apiRequest(`/platform/tenants/${tenantId}/features`, { method: "PATCH", body: JSON.stringify({ features }) });
  },

  updateOrgSettings(fields) {
    return apiRequest("/org", { method: "PATCH", body: JSON.stringify(fields) });
  },

  getRolePermissions() {
    return apiRequest("/permissions");
  },

  updateRolePermissions(role, permissions) {
    return apiRequest(`/permissions/${role}`, { method: "PUT", body: JSON.stringify({ permissions }) });
  },

  createDsr(dsr) {
    return apiRequest("/dsrs", { method: "POST", body: JSON.stringify(dsr) });
  },

  updateDsr(dsr) {
    return apiRequest(`/dsrs/${dsr.id}`, { method: "PUT", body: JSON.stringify(dsr) });
  },

  deleteDsr(dsrId) {
    return apiRequest(`/dsrs/${dsrId}`, { method: "DELETE" });
  },

  saveIssue(issue) {
    return apiRequest("/issues", { method: "POST", body: JSON.stringify(issue) });
  },

  saveSettlement(settlement) {
    return apiRequest("/settlements", { method: "POST", body: JSON.stringify(settlement) });
  },
};
