import test from 'node:test';
import assert from 'node:assert/strict';
import { queryClient } from './queryClient.js';
import { productKeys } from './features/products/queries/productQueries.js';
import { apiListKeys } from './queries/apiQueryKeys.js';

test('queries do not refetch when the browser regains focus', () => {
  assert.equal(queryClient.getDefaultOptions().queries.refetchOnWindowFocus, false);
});

test('product query keys keep each tenant cache isolated', () => {
  assert.deepEqual(productKeys.directory('tenant-a'), ['products', 'directory', 'tenant-a']);
  assert.notDeepEqual(productKeys.directory('tenant-a'), productKeys.directory('tenant-b'));
  assert.deepEqual(
    productKeys.list('tenant-a', { page: 1 }),
    ['products', 'list', 'tenant-a', { page: 1 }],
  );
  assert.deepEqual(productKeys.categories('tenant-a'), ['products', 'references', 'tenant-a', 'categories']);
  assert.notDeepEqual(
    productKeys.stockMovements('tenant-a', { page: 1 }),
    productKeys.stockMovements('tenant-b', { page: 1 }),
  );
});

test('shared API list keys include tenant, pagination, and filter dependencies', () => {
  assert.deepEqual(apiListKeys.list({
    tenantId: 'tenant-a',
    scope: 'suppliers',
    page: 2,
    pageSize: 20,
    dependencies: ['active', 'search'],
  }), ['api-lists', 'tenant-a', 'suppliers', 2, 20, 'active', 'search']);
});
