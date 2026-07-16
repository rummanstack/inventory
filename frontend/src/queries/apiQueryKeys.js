export const apiListKeys = {
  all: ['api-lists'],
  list: ({ tenantId, scope, page, pageSize, dependencies = [] }) => [
    'api-lists',
    tenantId || 'session-tenant',
    scope,
    page,
    pageSize,
    ...dependencies,
  ],
};
