import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSharedDataDependencies,
  getSharedDataDomainsForMutation,
  notifySharedDataMutation,
  subscribeToSharedDataInvalidation,
} from './sharedDataInvalidation.js';

test('maps cross-menu sales mutations to only affected shared domains', () => {
  assert.deepEqual(
    getSharedDataDomainsForMutation('/sales-invoices/42'),
    ['products', 'retailCustomers'],
  );
});

test('maps destination routes to their shared dependencies', () => {
  assert.deepEqual(
    getSharedDataDependencies('/purchase-receive'),
    ['products', 'suppliers'],
  );
  assert.deepEqual(getSharedDataDependencies('/security'), []);
});

test('notifies only for successful mutation methods with mapped domains', () => {
  const notifications = [];
  const unsubscribe = subscribeToSharedDataInvalidation((domains) => notifications.push(domains));

  notifySharedDataMutation('/products/7', 'GET');
  notifySharedDataMutation('/unmapped-action', 'POST');
  notifySharedDataMutation('/products/7', 'PATCH');
  unsubscribe();

  assert.deepEqual(notifications, [['products']]);
});
