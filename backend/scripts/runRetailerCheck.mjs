import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checkFilesOnly = process.argv.includes('--check-files');

const testFiles = [
  'tests/products.test.js',
  'tests/productSerials.test.js',
  'tests/retailCustomers.test.js',
  'tests/customerDueLedger.test.js',
  'tests/dailySalesReport.test.js',
  'tests/retailPromotions.test.js',
  'tests/salesInvoices.test.js',
  'tests/installmentPlans.test.js',
  'tests/installmentPayments.test.js',
  'tests/installmentReports.test.js',
  'tests/quickSale.test.js',
  'tests/salesReturns.test.js',
  'tests/customerPayments.test.js',
  'tests/cashSessions.test.js',
  'tests/quotations.test.js',
  'tests/warrantyClaims.test.js',
  'tests/repairJobs.test.js',
  'tests/tradeIns.test.js',
  'tests/financeAccounts.test.js',
  'tests/expenses.test.js',
  'tests/profitReport.test.js',
  'tests/tenantIsolation.test.js',
  'tests/permissionFixes.test.js',
  'tests/journal.test.js',
  'tests/financialReporting.test.js',
];

const missing = testFiles.filter((file) => !existsSync(resolve(backendRoot, file)));
if (missing.length) {
  console.error('Missing retailer test file(s):');
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

console.log(`Retailer check configured ${testFiles.length} test files:`);
for (const file of testFiles) console.log(`- ${file}`);

if (checkFilesOnly) {
  console.log('All configured retailer test files exist.');
  process.exit(0);
}

for (const file of testFiles) {
  const result = spawnSync(process.execPath, [
    '--import',
    './scripts/skipDatabaseInitForTests.mjs',
    '--test',
    '--test-isolation=none',
    '--test-concurrency=1',
    file,
  ], {
    cwd: backendRoot,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}
process.exit(0);
