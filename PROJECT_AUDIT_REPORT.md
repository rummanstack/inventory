# Project Audit Report

Date: 2026-06-17

## Scope

I inspected the project structure, backend bootstrap, frontend routing/auth gating, permission wiring, and several core finance flows.

## Findings

### High: Purchase receipt edit path is broken

`backend/services/purchaseReceiveService.js` references `oldDue` and `newDue` in the audit diff block, but neither variable is defined.

Impact:
- Any purchase receipt update will throw at runtime before the save finishes.
- The edit path for a core accounting flow is effectively broken.

References:
- [backend/services/purchaseReceiveService.js](./backend/services/purchaseReceiveService.js)

### High: Vercel runtime bootstraps a different service graph than local/server bootstrap

`backend/runtime.js` constructs several finance-related services without `financeAccountService`, while `backend/server.js` passes it in.

Impact:
- In serverless/runtime deployments, finance postings are silently skipped for services that depend on `financeAccountService`.
- Cash balance, ledger, and dashboard data will diverge from local/server behavior.

References:
- [backend/runtime.js](./backend/runtime.js)
- [backend/server.js](./backend/server.js)

Affected services in runtime:
- SettlementService
- ExpenseService
- DsrFinanceService
- DsrDueLedgerService
- PurchaseReceiveService
- SupplierPaymentService
- SalesInvoiceService
- CustomerPaymentService

### Medium: DSR due settlement can over-collect and produce a negative balance

`backend/services/dsrDueLedgerService.js` subtracts the payment amount from the current balance, but does not enforce `amount <= currentBalance`.

The UI modal also only checks that the amount is greater than zero.

Impact:
- A user can collect more than the outstanding DSR due.
- This can create negative ledger balances and inconsistent reporting.

References:
- [backend/services/dsrDueLedgerService.js](./backend/services/dsrDueLedgerService.js)
- [frontend/src/features/dsr-finance/components/SettleDueModal.jsx](./frontend/src/features/dsr-finance/components/SettleDueModal.jsx)

### Low: Frontend permission matrix is stale and diverges from backend

`frontend/src/app/permissions.js` duplicates backend permission definitions but does not match `backend/lib/permissions.js`.

Impact:
- Future UI auth work can drift from the actual backend authorization model.
- The file is currently dead code, but it is misleading and easy to trust by mistake.

References:
- [frontend/src/app/permissions.js](./frontend/src/app/permissions.js)
- [backend/lib/permissions.js](./backend/lib/permissions.js)

## Additional Notes

- I did not find a test suite in the repository, so these flows do not appear to be covered by automated tests.
- A frontend build verification attempt failed in this environment with `spawn EPERM` from `esbuild`, so I could not confirm build health end to end here.

## Recommended Next Steps

1. Fix the undefined `oldDue` / `newDue` references in purchase receipt editing.
2. Make `backend/runtime.js` construct the same service graph as `backend/server.js`.
3. Add an upper-bound check for DSR due settlement, both in backend and UI.
4. Remove or consolidate the stale frontend permission matrix.
