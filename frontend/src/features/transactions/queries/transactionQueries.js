export const transactionKeys = {
  all: ['transactions'],
  tenant: (tenantId) => ['transactions', tenantId || 'session-tenant'],
  detail: (tenantId, scope, id) => ['transactions', tenantId || 'session-tenant', scope, 'detail', id],
  lookup: (tenantId, scope, value) => ['transactions', tenantId || 'session-tenant', scope, 'lookup', value],
  mutation: (tenantId, scope) => ['transactions', tenantId || 'session-tenant', scope, 'mutation'],
};
