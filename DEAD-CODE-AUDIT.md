# Dead Code Audit - Resolved

Updated: 2026-07-01

This cleanup has been applied to the codebase.

Removed:
- unused tenant feature/permission helper files and unused export service
- unreachable payroll, salary structure, payslips, and salary report frontend pages
- dead payroll and salary-structure backend routes, controllers, services, repositories, and API modules
- orphaned manufacturers page/viewmodel and the legacy DSR finance viewmodel
- unused expiring drug-batch endpoint and stale feature/i18n entries tied to removed screens
- dead backend permission constants that no live route uses

Still live by design:
- `employees` and `salary-payments` features
- the `manage_payroll` permission, because salary payments still rely on it
