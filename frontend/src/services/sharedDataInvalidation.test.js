import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSharedDataDependencies,
  getSharedDataDomainsForMutation,
  notifySharedDataMutation,
  subscribeToSharedDataInvalidation,
  shouldInvalidateApiListScope,
} from './sharedDataInvalidation.js';

test('maps cross-menu sales mutations to only affected shared domains', () => {
  assert.deepEqual(
    getSharedDataDomainsForMutation('/sales-invoices/42'),
    ['products', 'retailCustomers'],
  );
  assert.deepEqual(
    getSharedDataDomainsForMutation('/quotations/42/convert'),
    ['products', 'retailCustomers'],
  );
});

test('maps accounting mutations so reports become stale without immediate refetch', () => {
  assert.deepEqual(getSharedDataDomainsForMutation('/expenses/12'), ['accounting']);
  assert.deepEqual(getSharedDataDomainsForMutation('/vouchers/12/post'), ['accounting']);
  assert.deepEqual(getSharedDataDomainsForMutation('/accounting/fiscal-years/12/close'), ['accounting']);
  assert.deepEqual(getSharedDataDomainsForMutation('/finance-accounts/transfers'), ['accounting']);
});

test('only invalidates known list scopes for their related domains', () => {
  assert.equal(shouldInvalidateApiListScope('sales-invoices', ['suppliers']), false);
  assert.equal(shouldInvalidateApiListScope('sales-invoices', ['retailCustomers']), true);
  assert.equal(shouldInvalidateApiListScope('finance-account-transactions', ['accounting']), true);
  assert.equal(shouldInvalidateApiListScope('legacy-unscoped-list', ['accounting']), true);
});

test('maps destination routes to their shared dependencies', () => {
  assert.deepEqual(
    getSharedDataDependencies('/purchase-receive'),
    ['products', 'suppliers'],
  );
  assert.deepEqual(getSharedDataDependencies('/security'), ['admin']);
});

test('maps people and platform mutations to their query domains', () => {
  assert.deepEqual(getSharedDataDomainsForMutation('/employees/12/documents'), ['people']);
  assert.deepEqual(getSharedDataDomainsForMutation('/platform/tenants/12/features'), ['platform']);
  assert.deepEqual(getSharedDataDomainsForMutation('/help-desk/12/notes'), ['operations']);
  assert.deepEqual(getSharedDataDomainsForMutation('/sr-due-ledger/collect'), ['srs']);
  assert.deepEqual(getSharedDataDomainsForMutation('/trade-promotion-rules/12'), ['promotions']);
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
