import { apiRequest, buildQueryString } from './client.js';

export const salesInvoicesApi = {
  listSalesInvoices({ page, pageSize, search, customerId, invoiceNumber, saleType, paymentStatus, dateFrom, dateTo } = {}) {
    return apiRequest(`/sales-invoices${buildQueryString({ page, pageSize, search, customerId, invoiceNumber, saleType, paymentStatus, dateFrom, dateTo })}`);
  },

  getSalesInvoice(invoiceId) {
    return apiRequest(`/sales-invoices/${invoiceId}`);
  },

  createSalesInvoice(invoice) {
    return apiRequest("/sales-invoices", { method: "POST", body: JSON.stringify(invoice) });
  },

  deleteSalesInvoice(invoiceId, reason) {
    return apiRequest(`/sales-invoices/${invoiceId}`, { method: "DELETE", body: JSON.stringify({ reason }) });
  },

  listSalesInvoicesTrash({ page, pageSize } = {}) {
    return apiRequest(`/sales-invoices/trash${buildQueryString({ page, pageSize })}`);
  },

  restoreSalesInvoice(invoiceId) {
    return apiRequest(`/sales-invoices/${invoiceId}/restore`, { method: "POST" });
  },

  getDailySalesReport({ dateFrom, dateTo, saleType } = {}) {
    return apiRequest(`/sales-invoices/reports/daily${buildQueryString({ dateFrom, dateTo, saleType })}`);
  },
};
