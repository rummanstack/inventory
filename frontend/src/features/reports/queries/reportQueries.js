export const reportKeys = {
  all: ['reports'],
  tenant: (tenantId) => ['reports', tenantId],
  query: (tenantId, scope, params = {}) => ['reports', tenantId, scope, params],
};
