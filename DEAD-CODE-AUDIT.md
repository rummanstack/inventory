# Dead Code Audit — StockLedger

*Generated: 2026-06-30*

---

## 1. Dead Files (safe to delete)

| File | Reason |
|---|---|
| `frontend/src/app/tenantFeatures.js` | Never imported anywhere in the codebase |
| `frontend/src/app/permissions.js` | Never imported — `can()` closure in `useInventoryApp` is used instead |
| `frontend/src/services/exportService.js` | Exports `downloadExcel` — zero call sites anywhere |

---

## 2. Dead HR Module

The entire HR feature set is fully implemented on both backend and frontend but has **no `APP_ROUTES` entry** — no page is reachable from the app. The backend routes exist and are guarded by feature flags (`payroll`, `salary-structure`, `payslips`, `salary-reports`) but no frontend page renders them.

### Dead Pages

| File | Reason |
|---|---|
| `frontend/src/features/hr/payroll/pages/PayrollPage.jsx` | No entry in `APP_ROUTES` |
| `frontend/src/features/hr/payslips/pages/PayslipsPage.jsx` | No entry in `APP_ROUTES` |
| `frontend/src/features/hr/salary-reports/pages/SalaryReportsPage.jsx` | No entry in `APP_ROUTES` |
| `frontend/src/features/hr/salary-structure/pages/SalaryStructurePage.jsx` | No entry in `APP_ROUTES` |

### Dead Components (only used by dead pages)

| File | Reason |
|---|---|
| `frontend/src/features/hr/payroll/components/GeneratePayrollModal.jsx` | Only imported by `PayrollPage.jsx` |
| `frontend/src/features/hr/payroll/components/PayPayrollModal.jsx` | Only imported by `PayrollPage.jsx` |
| `frontend/src/features/hr/payroll/components/PayrollDetailModal.jsx` | Only imported by `PayrollPage.jsx` |
| `frontend/src/features/hr/salary-structure/components/SalaryStructureModal.jsx` | Only imported by `SalaryStructurePage.jsx` |

### Dead Viewmodels (only used by dead pages)

| File | Reason |
|---|---|
| `frontend/src/features/hr/payroll/viewmodels/usePayrollViewModel.js` | Only imported by `PayrollPage.jsx` |
| `frontend/src/features/hr/salary-reports/viewmodels/useSalaryReportsViewModel.js` | Only imported by `SalaryReportsPage.jsx` |
| `frontend/src/features/hr/salary-structure/viewmodels/useSalaryStructureViewModel.js` | Only imported by `SalaryStructurePage.jsx` |

---

## 3. Dead Manufacturers Page

`ManufacturersPage` was superseded by a `ManufacturersManagerModal` embedded inside `ProductsPage`. The page and its viewmodel are unreachable.

| File | Reason |
|---|---|
| `frontend/src/features/pharmacy/pages/ManufacturersPage.jsx` | Imported in `routes.js` line 105 but never added to the `APP_ROUTES` array |
| `frontend/src/features/pharmacy/viewmodels/useManufacturersViewModel.js` | Only imported by the dead `ManufacturersPage` |

> **Note:** The dead import in `routes.js` line 105 (`import ManufacturersPage from ...`) should also be removed.

---

## 4. Dead Viewmodel (replaced)

| File | Reason |
|---|---|
| `frontend/src/features/dsr-finance/viewmodels/useDsrFinanceViewModel.js` | `DsrFinancePage` now uses `useDsrDueStatementViewModel` — this is an old replaced implementation |

---

## 5. Dead Exports

### `frontend/src/utils/theme.js`

| Export | Reason |
|---|---|
| `setTheme` | Exported but never imported by any file |
| `clearThemeCache` | Exported but never imported by any file |

### `frontend/src/models/inventoryViewData.js`

| Export | Reason |
|---|---|
| `getDsrSnapshot` | Exported but zero call sites outside the file |
| `shortDate` | Exported but zero call sites outside the file |

### `backend/lib/permissions.js`

| Export | Reason |
|---|---|
| `PERMISSIONS.VIEW_DRUG_REGISTER` | Defined and in role defaults but no route calls `requirePermission(...)` with it |
| `PERMISSIONS.MANAGE_CONTROLLED_DRUGS` | Same as above — no route uses it |
| `PERMISSIONS.MANAGE_TENANTS` | In role map but platform tenant management uses `requirePlatformAdmin` middleware instead |

---

## 6. Dead Feature Flags

Defined in `backend/lib/features.js` (`TENANT_FEATURES`) but referenced by no live backend route or frontend page.

| Feature Key | Backend Route | Frontend Page | Verdict |
|---|---|---|---|
| `retailer-profit-report` | No | No | **Dead** |
| `payslips` | No | No | **Dead** |
| `salary-reports` | No | No | **Dead** |
| `expiry-alerts` | No | No | **Dead** — drug batches use `batch-tracking` instead |
| `controlled-drug-register` | No | No | **Dead** — no controller, route, or page anywhere |
| `salary-structure` | Yes | No | **Partial** — backend guarded, no frontend page |
| `payroll` | Yes | No | **Partial** — backend guarded, no frontend page |

---

## 7. Dead i18n Keys

In `frontend/src/i18n/locales/en.js` (and mirrored in `bn.js`).

### Dead nav label keys

| Key | Reason |
|---|---|
| `nav.manufacturers` | No `APP_ROUTES` entry has this `labelKey`; `ManufacturersPage` is dead |
| `nav.salaryStructure` | Only referenced in `SalaryStructurePage.jsx` (dead) |
| `nav.payroll` | Not used as a route `labelKey` in any live `APP_ROUTES` entry |
| `nav.payslips` | Only referenced in dead files |
| `nav.salaryReports` | Only referenced in dead files |

### Dead i18n sections (entire namespace blocks)

| Section | Reason |
|---|---|
| `en.payroll` block | All keys used exclusively in dead HR payroll components |
| `en.payslips` block | All keys used exclusively in `PayslipsPage.jsx` (dead) |
| `en.salaryReports` block | All keys used exclusively in `SalaryReportsPage.jsx` (dead) |
| `en.salaryStructure` block | All keys used exclusively in dead HR salary-structure components |

---

## 8. Dead Backend Endpoints

Backend routes that are fully implemented but have no live frontend caller.

| Endpoint | Reason |
|---|---|
| `GET /drug-batches/expiring` | `drugBatchApi.listExpiring()` is defined but never called by any live component |
| `GET/POST /payroll/*` | All payroll endpoints only called from `usePayrollViewModel` (dead) |
| `GET/POST /salary-structure/*` | All salary-structure endpoints only called from `useSalaryStructureViewModel` (dead) |

---

## Summary

| Category | Count | Confidence |
|---|---|---|
| Dead files | 3 | HIGH |
| Dead HR pages | 4 | HIGH |
| Dead HR components | 4 | HIGH |
| Dead HR viewmodels | 3 | HIGH |
| Dead pharmacy page + viewmodel | 2 | HIGH |
| Dead replaced viewmodel | 1 | HIGH |
| Dead exports (frontend) | 4 | HIGH |
| Dead exports (backend permissions) | 3 | HIGH/MEDIUM |
| Dead feature flags | 5 fully dead + 2 partial | HIGH/MEDIUM |
| Dead i18n nav keys | 5 | HIGH |
| Dead i18n sections | 4 | HIGH |
| Dead backend endpoints | 3 groups | MEDIUM |

**Biggest chunk:** The entire HR module (payroll, payslips, salary reports, salary structure) was built end-to-end but never wired to the router. Deleting the HIGH-confidence items would remove ~25 files and ~4 feature flag entries with no impact on any live feature.
