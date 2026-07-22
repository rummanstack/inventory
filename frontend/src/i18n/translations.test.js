import test from 'node:test';
import assert from 'node:assert/strict';
import { createTranslator, loadLanguage } from './translations.js';
import en from './locales/en.js';
import bn from './locales/bn.js';

function leafShape(value, prefix = '', result = new Map()) {
  if (Array.isArray(value)) { result.set(prefix, 'array'); return result; }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) leafShape(child, prefix ? `${prefix}.${key}` : key, result);
    return result;
  }
  result.set(prefix, typeof value);
  return result;
}

test('loads English and Bangla bundles on demand', async () => {
  await loadLanguage('en');
  assert.notEqual(createTranslator('en')('app.brand'), 'app.brand');

  await loadLanguage('bn');
  assert.notEqual(createTranslator('bn')('app.brand'), 'app.brand');
});


test('English and Bangla bundles have identical key and value shapes', () => {
  assert.deepEqual([...leafShape(bn)].sort(([a], [b]) => a.localeCompare(b)), [...leafShape(en)].sort(([a], [b]) => a.localeCompare(b)));
});
