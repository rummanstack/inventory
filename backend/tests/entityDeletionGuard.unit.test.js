import test from 'node:test';
import assert from 'node:assert/strict';
import { assertZeroBalanceBeforeDelete } from '../lib/entityDeletionGuard.js';

test('zero-balance deletion guard accepts settled balances', () => {
  assert.doesNotThrow(() => assertZeroBalanceBeforeDelete(0, 'Party'));
  assert.doesNotThrow(() => assertZeroBalanceBeforeDelete(0.004, 'Party'));
});

test('zero-balance deletion guard rejects money owed in either direction', () => {
  assert.throws(() => assertZeroBalanceBeforeDelete(10, 'Party'), /balance is 10.00/);
  assert.throws(() => assertZeroBalanceBeforeDelete(-10, 'Party'), /balance is -10.00/);
});
