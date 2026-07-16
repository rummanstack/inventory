import test from 'node:test';
import assert from 'node:assert/strict';
import { createTranslator, loadLanguage } from './translations.js';

test('loads English and Bangla bundles on demand', async () => {
  await loadLanguage('en');
  assert.notEqual(createTranslator('en')('app.brand'), 'app.brand');

  await loadLanguage('bn');
  assert.notEqual(createTranslator('bn')('app.brand'), 'app.brand');
});
