import { apiRequest } from './client.js';

export const aiInsightsApi = {
  getAiInsightStatus() {
    return apiRequest('/ai-insights/status');
  },

  sendAiChatMessage(payload) {
    return apiRequest('/ai-insights/chat', { method: 'POST', body: JSON.stringify(payload) });
  },

  analyzeRetailCustomer(customerId) {
    return apiRequest(`/ai-insights/customers/${customerId}/insight`, { method: 'POST' });
  },

  getLowStockAiAdvice() {
    return apiRequest('/ai-insights/low-stock/advice', { method: 'POST' });
  },
};
