// Standalone, read-only regression check for the data-integrity invariants in
// services/invariantService.js. Run manually or wire into a deploy/CI step:
//
//   node scripts/checkInvariants.js [tenantId]
//
// Exits 0 if every invariant holds, 1 if any violation is found. Never writes anything.
import dotenv from "dotenv";
import { envPath } from "../config/paths.js";
import { DatabaseManager } from "../db/pool.js";
import { InvariantService } from "../services/invariantService.js";

dotenv.config({ path: envPath });

async function main() {
  const { env } = await import("../config/env.js");
  const tenantId = process.argv[2] || null;

  const databaseManager = new DatabaseManager(env.DATABASE_URL);
  const invariantService = new InvariantService(databaseManager);

  console.log(`Checking invariants against ${env.DATABASE_LABEL} database${tenantId ? ` (tenant ${tenantId})` : " (all tenants)"}...\n`);

  const report = await invariantService.checkAll(tenantId);

  const sections = [
    ["Stock reconciliation", report.stock],
    ["Customer ledger balance == current due", report.customerLedger],
    ["Supplier ledger balance == current payable", report.supplierLedger],
    ["Finance account balance == ledger balance", report.financeAccountBalance],
    ["Finance transfer pairing", report.financeTransferPairing],
    ["Shop due ledger == customers.current_due", report.shopDueLedger],
    ["DSR due ledger running balance chain", report.dsrLedgerChain],
  ];

  for (const [label, section] of sections) {
    const status = section.violations.length === 0 ? "PASS" : "FAIL";
    console.log(`[${status}] ${label} — checked ${section.checked}, violations ${section.violations.length}`);
    if (section.violations.length > 0) {
      console.log(JSON.stringify(section.violations, null, 2));
    }
  }

  if (report.customerLedger.negativeBalances.length > 0 || report.supplierLedger.negativeBalances.length > 0) {
    console.log(
      `\n[INFO] ${report.customerLedger.negativeBalances.length} customer(s) and ${report.supplierLedger.negativeBalances.length} supplier(s) ` +
        "have a negative ledger balance (overcollected/overpaid with no refund recorded). Not a data-integrity bug — current_due/current payable " +
        "is clamped to 0 by design until a refund/credit feature exists — but worth knowing about.",
    );
  }

  console.log(`\n${report.limitations.join("\n")}`);
  console.log(`\n${report.ok ? "ALL INVARIANTS HOLD" : `${report.violationCount} VIOLATION(S) FOUND`}`);

  await databaseManager.getPool().end();
  process.exit(report.ok ? 0 : 1);
}

main().catch((error) => {
  console.error("Invariant check crashed:", error);
  process.exit(1);
});
