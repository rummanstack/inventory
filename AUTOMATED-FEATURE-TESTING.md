# Automated Feature Testing

This project already has a useful automated testing base for the dealer feature set you want to check.

## 1. Required Database Setup

Backend tests boot the real Express app and use the real PostgreSQL database path. Configure a development/test database in `backend/.env`:

```env
DEV_DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DATABASE_NAME
```

`backend/config/env.js` uses `DEV_DATABASE_URL` when running `npm test`; otherwise it falls back to `DATABASE_URL`.

Use a disposable local or dedicated test database for testing because the schema bootstrap and tests create/update data. Avoid running the suite against a production/shared Supabase pooler URL, especially with connection_limit=1; schema initialization can lock or time out before the feature tests start.

## 2. Run Today's Feature Automation

From the project root:

```powershell
npm run test:dealer-check
```

Or from the backend folder:

```powershell
npm --prefix backend run test:dealer-check
```

This runs focused backend tests for:

- products, stock movement, low stock alerts, product serials, damaged stock
- DSRs, morning issue, settlements, DSR due ledger settlement
- shops/customers, shop/SR due ledgers, SRs
- suppliers, purchase receive, purchase returns, supplier payments, supplier discounts, supplier statement
- trade promotions
- finance accounts, expenses, profit

## 3. Run All Backend Tests

```powershell
npm --prefix backend test
```

This is broader and may take longer because it includes unrelated modules too.

## 4. Run Frontend Build Check

```powershell
npm --prefix frontend run build
```

This validates that all route chunks compile, including the pages in the dealer-check list. It does not prove the screens work against real data.

## 5. What These Tests Actually Prove

The backend tests are API/integration tests. They exercise the same route/controller/service/repository/database path that the frontend uses, so they are strong for business correctness:

- validation errors
- stock movement records and balances
- ledger balances
- supplier/customer/DSR/SR due effects
- purchase, return, payment, discount, settlement flows
- finance account balance effects
- profit calculations
- tenant isolation in covered tests

## 6. What Still Needs Browser Automation

The current automated suite does not fully click through the React UI. For UI regression coverage, add Playwright tests for critical screens after the backend tests pass:

- login and navigation visibility by role/feature flag
- create/edit forms open and submit correctly
- tables render expected rows after API setup
- print/export buttons do not crash
- mobile viewport layout smoke checks

Start with backend tests first because most risk in this app is stock, ledger, and finance math.
