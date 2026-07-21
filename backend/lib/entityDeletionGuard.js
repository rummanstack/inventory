import { assert } from './errors.js';

const CURRENCY_EPSILON = 0.005;

export function assertZeroBalanceBeforeDelete(balance, entityLabel) {
  const roundedBalance = Math.round((Number(balance) || 0) * 100) / 100;
  assert(
    Math.abs(roundedBalance) < CURRENCY_EPSILON,
    entityLabel + ' cannot be deleted while its balance is ' + roundedBalance.toFixed(2) + '. Settle the balance to 0.00 before deleting.',
    409,
  );
}
