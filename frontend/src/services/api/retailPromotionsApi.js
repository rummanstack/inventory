import { apiRequest } from './client.js';

export const retailPromotionsApi = {
  listRetailPromotions() {
    return apiRequest('/retail-promotions');
  },

  createRetailPromotion(promotion) {
    return apiRequest('/retail-promotions', { method: 'POST', body: JSON.stringify(promotion) });
  },

  updateRetailPromotion(promotion) {
    return apiRequest(`/retail-promotions/${promotion.id}`, { method: 'PATCH', body: JSON.stringify(promotion) });
  },

  deleteRetailPromotion(promotionId) {
    return apiRequest(`/retail-promotions/${promotionId}`, { method: 'DELETE' });
  },
};
