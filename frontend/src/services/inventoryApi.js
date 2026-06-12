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

  forgotPassword({ email, orgSlug }) {
    return apiRequest("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email, orgSlug }) });
  },

  resetPassword({ token, password }) {
    return apiRequest("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
  },

  listSessions() {
    return apiRequest("/auth/sessions");
  },

  revokeSession(sessionId) {
    return apiRequest(`/auth/sessions/${sessionId}`, { method: "DELETE" });
  },

  revokeOtherSessions() {
    return apiRequest("/auth/sessions/revoke-others", { method: "POST" });
  },

  getLoginHistory() {
    return apiRequest("/auth/login-history");
  },

  adminResetUserPassword(userId) {
    return apiRequest(`/users/${userId}/reset-password`, { method: "POST" });
  },

  unlockUser(userId) {
    return apiRequest(`/users/${userId}/unlock`, { method: "POST" });
  },

  listPasswordResetRequests() {
    return apiRequest("/users/password-reset-requests");
  },

  listActivityLogs({ page, pageSize, search, module, actionType, userId, dateFrom, dateTo, tenantId } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    if (search) params.set("search", search);
    if (module) params.set("module", module);
    if (actionType) params.set("actionType", actionType);
    if (userId) params.set("userId", userId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (tenantId) params.set("tenantId", tenantId);
    const query = params.toString();
    return apiRequest(`/activity-logs${query ? `?${query}` : ""}`);
  },

  getEntityAuditHistory(entityType, entityId) {
    return apiRequest(`/audit/entity/${entityType}/${entityId}`);
  },

  recordPrint({ entityType, entityId, label } = {}) {
    return apiRequest("/audit/print", { method: "POST", body: JSON.stringify({ entityType, entityId, label }) });
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

  listCustomers({ page, pageSize, search, status, assignedDsrId } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (assignedDsrId) params.set("assignedDsrId", assignedDsrId);
    const query = params.toString();
    return apiRequest(`/customers${query ? `?${query}` : ""}`);
  },

  getCustomer(customerId) {
    return apiRequest(`/customers/${customerId}`);
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

  deleteProduct(productId, reason) {
    return apiRequest(`/products/${productId}`, { method: "DELETE", body: JSON.stringify({ reason }) });
  },

  listProductsTrash({ page, pageSize } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiRequest(`/products/trash${query ? `?${query}` : ""}`);
  },

  restoreProduct(productId) {
    return apiRequest(`/products/${productId}/restore`, { method: "POST" });
  },

  permanentlyDeleteProduct(productId) {
    return apiRequest(`/products/${productId}/permanent`, { method: "DELETE" });
  },

  addProductStock(productId, addPieces, reason) {
    return apiRequest(`/products/${productId}/stock`, { method: "POST", body: JSON.stringify({ addPieces, reason }) });
  },

  clearDamagedStock(productId, quantity, note) {
    return apiRequest(`/products/${productId}/clear-damage`, { method: "POST", body: JSON.stringify({ quantity, note }) });
  },

  listStockMovements({ page, pageSize, productId, type, dateFrom, dateTo } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    if (productId) params.set("productId", productId);
    if (type) params.set("type", type);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const query = params.toString();
    return apiRequest(`/stock-movements${query ? `?${query}` : ""}`);
  },

  listDsrDueLedger({ page, pageSize, dsrId, dateFrom, dateTo } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    if (dsrId) params.set("dsrId", dsrId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const query = params.toString();
    return apiRequest(`/dsr-due-ledger${query ? `?${query}` : ""}`);
  },

  getDsrDueStatement({ dsrId, dateFrom, dateTo } = {}) {
    const params = new URLSearchParams();
    if (dsrId) params.set("dsrId", dsrId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const query = params.toString();
    return apiRequest(`/dsr-due-ledger/statement${query ? `?${query}` : ""}`);
  },

  getDsrDueBalance(dsrId) {
    const params = new URLSearchParams();
    if (dsrId) params.set("dsrId", dsrId);
    const query = params.toString();
    return apiRequest(`/dsr-due-ledger/balance${query ? `?${query}` : ""}`);
  },

  settleDsrDue({ dsrId, amount, note }) {
    return apiRequest("/dsr-due-ledger/settle", {
      method: "POST",
      body: JSON.stringify({ dsrId, amount, note }),
    });
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

  deleteDsr(dsrId, reason) {
    return apiRequest(`/dsrs/${dsrId}`, { method: "DELETE", body: JSON.stringify({ reason }) });
  },

  listDsrsTrash({ page, pageSize } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiRequest(`/dsrs/trash${query ? `?${query}` : ""}`);
  },

  restoreDsr(dsrId) {
    return apiRequest(`/dsrs/${dsrId}/restore`, { method: "POST" });
  },

  permanentlyDeleteDsr(dsrId) {
    return apiRequest(`/dsrs/${dsrId}/permanent`, { method: "DELETE" });
  },

  createCustomer(customer) {
    return apiRequest("/customers", { method: "POST", body: JSON.stringify(customer) });
  },

  updateCustomer(customer) {
    return apiRequest(`/customers/${customer.id}`, { method: "PUT", body: JSON.stringify(customer) });
  },

  deleteCustomer(customerId, reason) {
    return apiRequest(`/customers/${customerId}`, { method: "DELETE", body: JSON.stringify({ reason }) });
  },

  listCustomersTrash({ page, pageSize } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiRequest(`/customers/trash${query ? `?${query}` : ""}`);
  },

  restoreCustomer(customerId) {
    return apiRequest(`/customers/${customerId}/restore`, { method: "POST" });
  },

  permanentlyDeleteCustomer(customerId) {
    return apiRequest(`/customers/${customerId}/permanent`, { method: "DELETE" });
  },

  saveIssue(issue) {
    return apiRequest("/issues", { method: "POST", body: JSON.stringify(issue) });
  },

  saveSettlement(settlement) {
    return apiRequest("/settlements", { method: "POST", body: JSON.stringify(settlement) });
  },
};
