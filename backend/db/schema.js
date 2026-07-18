import { TENANT_BUSINESS_PERMISSIONS } from "../lib/permissions.js";

// One-time data backfills (permission/feature splits for pre-existing tenants).
// Each runs exactly once per database, tracked in schema_backfills â€” re-running
// them on every boot silently re-grants permissions and features that admins
// have since revoked ("menus coming back after a server restart").
async function runBackfillOnce(pool, key, sql, params = []) {
  const done = await pool.query("SELECT 1 FROM schema_backfills WHERE key = $1", [key]);
  if (done.rows.length > 0) {
    return;
  }
  await pool.query(sql, params);
  await pool.query("INSERT INTO schema_backfills (key) VALUES ($1) ON CONFLICT (key) DO NOTHING", [key]);
}

export async function createSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      slug        TEXT NOT NULL UNIQUE,
      email       TEXT NOT NULL,
      plan        TEXT NOT NULL DEFAULT 'starter',
      status      TEXT NOT NULL DEFAULT 'active',
      logo_url    TEXT,
      address     TEXT,
      tax_rate    NUMERIC NOT NULL DEFAULT 0,
      loyalty_enabled BOOLEAN NOT NULL DEFAULT false,
      loyalty_points_per_100 NUMERIC NOT NULL DEFAULT 1,
      loyalty_point_value NUMERIC NOT NULL DEFAULT 1,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      action_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      description TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS error_logs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      user_id TEXT,
      method TEXT,
      path TEXT,
      status_code INTEGER,
      message TEXT,
      stack TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      expense_date DATE NOT NULL,
      category TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      note TEXT NOT NULL,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date DESC);
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
    CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      pieces_per_case INTEGER NOT NULL,
      purchase_price NUMERIC NOT NULL,
      stock_pieces INTEGER NOT NULL,
      refundable BOOLEAN NOT NULL DEFAULT TRUE,
      tax_rate NUMERIC NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id             TEXT PRIMARY KEY,
      tenant_id      TEXT REFERENCES tenants(id),
      product_id     TEXT NOT NULL,
      type           TEXT NOT NULL,
      quantity_in    INTEGER NOT NULL DEFAULT 0,
      quantity_out   INTEGER NOT NULL DEFAULT 0,
      balance_after  INTEGER NOT NULL,
      reference_type TEXT NOT NULL,
      reference_id   TEXT,
      note           TEXT NOT NULL DEFAULT '',
      created_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS dsrs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      area TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE dsrs ADD COLUMN IF NOT EXISTS opening_due NUMERIC NOT NULL DEFAULT 0;

    CREATE TABLE IF NOT EXISTS dsr_due_ledger (
      id             TEXT PRIMARY KEY,
      tenant_id      TEXT REFERENCES tenants(id),
      dsr_id         TEXT NOT NULL,
      type           TEXT NOT NULL,
      debit          NUMERIC NOT NULL DEFAULT 0,
      credit         NUMERIC NOT NULL DEFAULT 0,
      balance_after  NUMERIC NOT NULL DEFAULT 0,
      reference_type TEXT NOT NULL,
      reference_id   TEXT,
      note           TEXT NOT NULL DEFAULT '',
      created_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_dsr_due_ledger_tenant_dsr_created_at
      ON dsr_due_ledger(tenant_id, dsr_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_dsr_due_ledger_reference
      ON dsr_due_ledger(reference_type, reference_id);


    CREATE TABLE IF NOT EXISTS issues (
      id TEXT PRIMARY KEY,
      issue_date TEXT NOT NULL,
      dsr_id TEXT NOT NULL,
      dsr_name TEXT NOT NULL,
      area TEXT NOT NULL,
      phone TEXT NOT NULL,
      items JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      settlement_date TEXT NOT NULL,
      dsr_id TEXT NOT NULL,
      dsr_name TEXT NOT NULL,
      area TEXT NOT NULL,
      phone TEXT NOT NULL,
      issue_ids JSONB NOT NULL,
      items JSONB NOT NULL,
      extra_returns JSONB NOT NULL DEFAULT '[]',
      total_payable NUMERIC NOT NULL,
      previous_due NUMERIC NOT NULL DEFAULT 0,
      amount_paid NUMERIC NOT NULL DEFAULT 0,
      due_amount NUMERIC NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE settlements ADD COLUMN IF NOT EXISTS previous_due NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE settlements ADD COLUMN IF NOT EXISTS amount_paid NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE settlements ADD COLUMN IF NOT EXISTS due_amount NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE settlements ADD COLUMN IF NOT EXISTS extra_returns JSONB NOT NULL DEFAULT '[]';
    ALTER TABLE settlements ADD COLUMN IF NOT EXISTS discount NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE settlements ADD COLUMN IF NOT EXISTS extra_return_value NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE settlements ADD COLUMN IF NOT EXISTS shop_collections JSONB NOT NULL DEFAULT '[]';
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tax_rate NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS loyalty_enabled BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS loyalty_points_per_100 NUMERIC NOT NULL DEFAULT 1;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS loyalty_point_value NUMERIC NOT NULL DEFAULT 1;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT 'ELECTRONICS';
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS seller_type TEXT NOT NULL DEFAULT 'DEALER';
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';
    ALTER TABLE purchase_receipts ADD COLUMN IF NOT EXISTS tax_rate NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE purchase_receipts ADD COLUMN IF NOT EXISTS tax_amount NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS tax_rate NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS tax_amount NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS loyalty_points_earned INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS loyalty_points_redeemed INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS loyalty_redeem_amount NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS refund_method TEXT NOT NULL DEFAULT 'DUE_ADJUSTMENT';
    ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS loyalty_points_adjustment INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE purchase_receipt_items ADD COLUMN IF NOT EXISTS tax_rate NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE purchase_receipt_items ADD COLUMN IF NOT EXISTS tax_amount NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE sales_invoice_items ADD COLUMN IF NOT EXISTS tax_rate NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE sales_invoice_items ADD COLUMN IF NOT EXISTS tax_amount NUMERIC NOT NULL DEFAULT 0;

    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_dsrs_name ON dsrs(name);
    CREATE INDEX IF NOT EXISTS idx_dsrs_status ON dsrs(status);
    CREATE INDEX IF NOT EXISTS idx_issues_issue_date ON issues(issue_date DESC);
    CREATE INDEX IF NOT EXISTS idx_issues_dsr_id ON issues(dsr_id);
    CREATE INDEX IF NOT EXISTS idx_settlements_settlement_date ON settlements(settlement_date DESC);
    CREATE INDEX IF NOT EXISTS idx_settlements_dsr_id ON settlements(dsr_id);

    ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'User';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'operator';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_date DATE NOT NULL DEFAULT CURRENT_DATE;
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Other';
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS amount NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT '';
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();


    ALTER TABLE users         ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
    ALTER TABLE products      ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
    ALTER TABLE dsrs          ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
    ALTER TABLE issues        ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
    ALTER TABLE settlements   ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
    ALTER TABLE expenses      ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
    ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);

    CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_dsrs_tenant_id ON dsrs(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_issues_tenant_id ON issues(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_settlements_tenant_id ON settlements(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_tenant_id ON expenses(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant_id ON activity_logs(tenant_id);

    ALTER TABLE products ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 9999;
    CREATE INDEX IF NOT EXISTS idx_products_order_index ON products(tenant_id, order_index ASC);
    UPDATE products SET order_index = 9999 WHERE order_index = 0;

    ALTER TABLE products ADD COLUMN IF NOT EXISTS damaged_pieces INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_rate NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS refundable BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
    ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS product_id TEXT NOT NULL DEFAULT '';
    ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'MANUAL_ADJUSTMENT';
    ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS quantity_in INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS quantity_out INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS balance_after INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS reference_type TEXT NOT NULL DEFAULT 'manual';
    ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS reference_id TEXT;
    ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT '';
    ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_product_created_at
      ON stock_movements(tenant_id, product_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_created_at
      ON stock_movements(tenant_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_reference
      ON stock_movements(reference_type, reference_id);

    CREATE TABLE IF NOT EXISTS customers (
      id              TEXT PRIMARY KEY,
      tenant_id       TEXT REFERENCES tenants(id),
      shop_name       TEXT NOT NULL,
      owner_name      TEXT NOT NULL DEFAULT '',
      phone           TEXT NOT NULL DEFAULT '',
      address         TEXT NOT NULL DEFAULT '',
      market          TEXT NOT NULL DEFAULT '',
      assigned_dsr_id TEXT REFERENCES dsrs(id) ON DELETE SET NULL,
      opening_due     NUMERIC NOT NULL DEFAULT 0,
      current_due     NUMERIC NOT NULL DEFAULT 0,
      status          TEXT NOT NULL DEFAULT 'ACTIVE',
      note            TEXT NOT NULL DEFAULT '',
      created_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_customers_assigned_dsr_id ON customers(assigned_dsr_id);
    CREATE INDEX IF NOT EXISTS idx_customers_shop_name ON customers(shop_name);
    CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

    -- Soft delete / trash support
    ALTER TABLE products  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE products  ADD COLUMN IF NOT EXISTS deleted_by_id TEXT REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE products  ADD COLUMN IF NOT EXISTS delete_reason TEXT NOT NULL DEFAULT '';
    CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(tenant_id, deleted_at);

    ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_by_id TEXT REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS delete_reason TEXT NOT NULL DEFAULT '';
    CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers(tenant_id, deleted_at);

    ALTER TABLE dsrs      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE dsrs      ADD COLUMN IF NOT EXISTS deleted_by_id TEXT REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE dsrs      ADD COLUMN IF NOT EXISTS delete_reason TEXT NOT NULL DEFAULT '';
    CREATE INDEX IF NOT EXISTS idx_dsrs_deleted_at ON dsrs(tenant_id, deleted_at);

    ALTER TABLE expenses  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE expenses  ADD COLUMN IF NOT EXISTS deleted_by_id TEXT REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE expenses  ADD COLUMN IF NOT EXISTS delete_reason TEXT NOT NULL DEFAULT '';
    CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON expenses(tenant_id, deleted_at);

    ALTER TABLE users     ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE users     ADD COLUMN IF NOT EXISTS deleted_by_id TEXT REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE users     ADD COLUMN IF NOT EXISTS delete_reason TEXT NOT NULL DEFAULT '';
    CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(tenant_id, deleted_at);

    CREATE TABLE IF NOT EXISTS role_permissions (
      role TEXT NOT NULL,
      tenant_id TEXT NOT NULL DEFAULT 'global',
      permission TEXT NOT NULL,
      PRIMARY KEY (role, tenant_id, permission)
    );

    CREATE TABLE IF NOT EXISTS tenant_features (
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      feature TEXT NOT NULL,
      PRIMARY KEY (tenant_id, feature)
    );

    ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS module TEXT NOT NULL DEFAULT 'system';
    ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS before_data JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS after_data JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS reason TEXT NOT NULL DEFAULT '';
    CREATE INDEX IF NOT EXISTS idx_activity_logs_module ON activity_logs(module);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);

    UPDATE users SET tenant_id = NULL WHERE role = 'system_developer';

    -- platform_admin role removed: its powers folded into system_developer.
    UPDATE users SET role = 'system_developer', tenant_id = NULL WHERE role = 'platform_admin';

    -- Advanced security basics: lockout, sessions metadata, login history, password reset
    ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

    ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS ip_address TEXT NOT NULL DEFAULT '';
    ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS user_agent TEXT NOT NULL DEFAULT '';
    ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS active_tenant_id TEXT REFERENCES tenants(id);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

    CREATE TABLE IF NOT EXISTS login_history (
      id              TEXT PRIMARY KEY,
      user_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
      tenant_id       TEXT REFERENCES tenants(id) ON DELETE SET NULL,
      email           TEXT NOT NULL,
      success         BOOLEAN NOT NULL,
      failure_reason  TEXT NOT NULL DEFAULT '',
      ip_address      TEXT NOT NULL DEFAULT '',
      user_agent      TEXT NOT NULL DEFAULT '',
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tenant_id   TEXT REFERENCES tenants(id) ON DELETE CASCADE,
      token       TEXT UNIQUE NOT NULL,
      expires_at  TIMESTAMPTZ NOT NULL,
      used_at     TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

    -- Supplier module
    CREATE TABLE IF NOT EXISTS suppliers (
      id              TEXT PRIMARY KEY,
      tenant_id       TEXT REFERENCES tenants(id),
      name            TEXT NOT NULL,
      phone           TEXT NOT NULL DEFAULT '',
      address         TEXT NOT NULL DEFAULT '',
      opening_due     NUMERIC NOT NULL DEFAULT 0,
      current_due     NUMERIC NOT NULL DEFAULT 0,
      status          TEXT NOT NULL DEFAULT 'ACTIVE',
      note            TEXT NOT NULL DEFAULT '',
      created_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_id ON suppliers(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
    CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);

    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS deleted_by_id TEXT REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS delete_reason TEXT NOT NULL DEFAULT '';
    CREATE INDEX IF NOT EXISTS idx_suppliers_deleted_at ON suppliers(tenant_id, deleted_at);

    CREATE TABLE IF NOT EXISTS purchase_number_counters (
      tenant_id  TEXT NOT NULL REFERENCES tenants(id),
      year       INTEGER NOT NULL,
      last_value INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (tenant_id, year)
    );

    CREATE TABLE IF NOT EXISTS purchase_receipts (
      id                  TEXT PRIMARY KEY,
      tenant_id           TEXT REFERENCES tenants(id),
      purchase_number     TEXT NOT NULL,
      supplier_id         TEXT NOT NULL,
      supplier_invoice_no TEXT NOT NULL DEFAULT '',
      purchase_date       DATE NOT NULL,
      discount            NUMERIC NOT NULL DEFAULT 0,
      tax_rate            NUMERIC NOT NULL DEFAULT 0,
      tax_amount          NUMERIC NOT NULL DEFAULT 0,
      total_amount        NUMERIC NOT NULL DEFAULT 0,
      paid_amount         NUMERIC NOT NULL DEFAULT 0,
      due_amount          NUMERIC NOT NULL DEFAULT 0,
      payment_method      TEXT NOT NULL DEFAULT 'CASH',
      note                TEXT NOT NULL DEFAULT '',
      created_by          TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at          TIMESTAMPTZ,
      deleted_by_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
      delete_reason       TEXT NOT NULL DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_purchase_receipts_tenant_id ON purchase_receipts(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_receipts_supplier_id ON purchase_receipts(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_receipts_purchase_date ON purchase_receipts(tenant_id, purchase_date);
    CREATE INDEX IF NOT EXISTS idx_purchase_receipts_deleted_at ON purchase_receipts(tenant_id, deleted_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_receipts_number ON purchase_receipts(tenant_id, purchase_number);

    CREATE TABLE IF NOT EXISTS purchase_receipt_items (
      id                  TEXT PRIMARY KEY,
      tenant_id           TEXT REFERENCES tenants(id),
      purchase_receipt_id TEXT NOT NULL REFERENCES purchase_receipts(id) ON DELETE CASCADE,
      product_id          TEXT NOT NULL,
      quantity_pieces     INTEGER NOT NULL DEFAULT 0,
      purchase_price      NUMERIC NOT NULL DEFAULT 0,
      line_discount       NUMERIC NOT NULL DEFAULT 0,
      line_total          NUMERIC NOT NULL DEFAULT 0,
      tax_rate            NUMERIC NOT NULL DEFAULT 0,
      tax_amount          NUMERIC NOT NULL DEFAULT 0,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_purchase_receipt_items_receipt_id ON purchase_receipt_items(purchase_receipt_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_receipt_items_product_id ON purchase_receipt_items(product_id);

    CREATE TABLE IF NOT EXISTS supplier_due_ledger (
      id             TEXT PRIMARY KEY,
      tenant_id      TEXT REFERENCES tenants(id),
      supplier_id    TEXT NOT NULL,
      type           TEXT NOT NULL,
      debit          NUMERIC NOT NULL DEFAULT 0,
      credit         NUMERIC NOT NULL DEFAULT 0,
      balance_after  NUMERIC NOT NULL DEFAULT 0,
      reference_type TEXT NOT NULL,
      reference_id   TEXT,
      note           TEXT NOT NULL DEFAULT '',
      created_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_supplier_due_ledger_tenant_supplier_created_at
      ON supplier_due_ledger(tenant_id, supplier_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_supplier_due_ledger_reference
      ON supplier_due_ledger(reference_type, reference_id);

    CREATE TABLE IF NOT EXISTS supplier_payments (
      id              TEXT PRIMARY KEY,
      tenant_id       TEXT REFERENCES tenants(id),
      supplier_id     TEXT NOT NULL,
      payment_date    DATE NOT NULL,
      amount          NUMERIC NOT NULL DEFAULT 0,
      payment_method  TEXT NOT NULL DEFAULT 'CASH',
      note            TEXT NOT NULL DEFAULT '',
      created_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at      TIMESTAMPTZ,
      deleted_by_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
      delete_reason   TEXT NOT NULL DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_supplier_payments_tenant_id ON supplier_payments(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier_id ON supplier_payments(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_supplier_payments_deleted_at ON supplier_payments(tenant_id, deleted_at);

    -- Retailer module
    ALTER TABLE products ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS retail_price NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE products DROP COLUMN IF EXISTS selling_price;

    CREATE TABLE IF NOT EXISTS sales_number_counters (
      tenant_id  TEXT NOT NULL REFERENCES tenants(id),
      year       INTEGER NOT NULL,
      counter_type TEXT NOT NULL,
      last_value INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (tenant_id, year, counter_type)
    );

    CREATE TABLE IF NOT EXISTS sales_invoices (
      id                TEXT PRIMARY KEY,
      tenant_id         TEXT REFERENCES tenants(id),
      invoice_number    TEXT NOT NULL,
      invoice_date      DATE NOT NULL,
      customer_id       TEXT REFERENCES customers(id) ON DELETE SET NULL,
      customer_type     TEXT NOT NULL DEFAULT 'WALK_IN',
      sale_type         TEXT NOT NULL DEFAULT 'RETAIL',
      subtotal          NUMERIC NOT NULL DEFAULT 0,
      discount          NUMERIC NOT NULL DEFAULT 0,
      tax_rate          NUMERIC NOT NULL DEFAULT 0,
      tax_amount        NUMERIC NOT NULL DEFAULT 0,
      total_amount      NUMERIC NOT NULL DEFAULT 0,
      paid_amount       NUMERIC NOT NULL DEFAULT 0,
      due_amount        NUMERIC NOT NULL DEFAULT 0,
      loyalty_points_earned   INTEGER NOT NULL DEFAULT 0,
      loyalty_points_redeemed INTEGER NOT NULL DEFAULT 0,
      loyalty_redeem_amount   NUMERIC NOT NULL DEFAULT 0,
      payment_method    TEXT NOT NULL DEFAULT 'CASH',
      total_profit      NUMERIC NOT NULL DEFAULT 0,
      note              TEXT NOT NULL DEFAULT '',
      created_by        TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at        TIMESTAMPTZ,
      deleted_by_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
      delete_reason     TEXT NOT NULL DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_sales_invoices_tenant_id ON sales_invoices(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sales_invoices_customer_id ON sales_invoices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_sales_invoices_invoice_date ON sales_invoices(tenant_id, invoice_date);
    CREATE INDEX IF NOT EXISTS idx_sales_invoices_sale_type ON sales_invoices(tenant_id, sale_type);
    CREATE INDEX IF NOT EXISTS idx_sales_invoices_deleted_at ON sales_invoices(tenant_id, deleted_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_invoices_number ON sales_invoices(tenant_id, invoice_number);

    CREATE TABLE IF NOT EXISTS retail_cash_sessions (
      id               TEXT PRIMARY KEY,
      tenant_id        TEXT REFERENCES tenants(id),
      opened_by        TEXT REFERENCES users(id) ON DELETE SET NULL,
      closed_by        TEXT REFERENCES users(id) ON DELETE SET NULL,
      started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      closed_at        TIMESTAMPTZ,
      opening_cash     NUMERIC NOT NULL DEFAULT 0,
      counted_cash     NUMERIC,
      cash_sales_count INTEGER NOT NULL DEFAULT 0,
      cash_sales_amount NUMERIC NOT NULL DEFAULT 0,
      expected_cash    NUMERIC NOT NULL DEFAULT 0,
      variance         NUMERIC NOT NULL DEFAULT 0,
      note             TEXT NOT NULL DEFAULT '',
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_retail_cash_sessions_active
      ON retail_cash_sessions(tenant_id)
      WHERE closed_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_retail_cash_sessions_tenant_started
      ON retail_cash_sessions(tenant_id, started_at DESC);

    ALTER TABLE retail_cash_sessions ADD COLUMN IF NOT EXISTS opened_by TEXT REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE retail_cash_sessions ADD COLUMN IF NOT EXISTS closed_by TEXT REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE retail_cash_sessions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    ALTER TABLE retail_cash_sessions ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
    ALTER TABLE retail_cash_sessions ADD COLUMN IF NOT EXISTS opening_cash NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE retail_cash_sessions ADD COLUMN IF NOT EXISTS counted_cash NUMERIC;
    ALTER TABLE retail_cash_sessions ADD COLUMN IF NOT EXISTS cash_sales_count INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE retail_cash_sessions ADD COLUMN IF NOT EXISTS cash_sales_amount NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE retail_cash_sessions ADD COLUMN IF NOT EXISTS expected_cash NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE retail_cash_sessions ADD COLUMN IF NOT EXISTS variance NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE retail_cash_sessions ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT '';

    CREATE TABLE IF NOT EXISTS sales_invoice_items (
      id                  TEXT PRIMARY KEY,
      tenant_id           TEXT REFERENCES tenants(id),
      sales_invoice_id    TEXT NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
      product_id          TEXT NOT NULL,
      product_name        TEXT NOT NULL DEFAULT '',
      quantity_pieces     INTEGER NOT NULL DEFAULT 0,
      actual_sale_price   NUMERIC NOT NULL DEFAULT 0,
      cost_price_snapshot NUMERIC NOT NULL DEFAULT 0,
      line_discount       NUMERIC NOT NULL DEFAULT 0,
      line_total          NUMERIC NOT NULL DEFAULT 0,
      tax_rate            NUMERIC NOT NULL DEFAULT 0,
      tax_amount          NUMERIC NOT NULL DEFAULT 0,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_sales_invoice_items_invoice_id ON sales_invoice_items(sales_invoice_id);
    CREATE INDEX IF NOT EXISTS idx_sales_invoice_items_product_id ON sales_invoice_items(product_id);

    CREATE TABLE IF NOT EXISTS customer_due_ledger (
      id             TEXT PRIMARY KEY,
      tenant_id      TEXT REFERENCES tenants(id),
      customer_id    TEXT NOT NULL,
      type           TEXT NOT NULL,
      debit          NUMERIC NOT NULL DEFAULT 0,
      credit         NUMERIC NOT NULL DEFAULT 0,
      balance_after  NUMERIC NOT NULL DEFAULT 0,
      reference_type TEXT NOT NULL,
      reference_id   TEXT,
      note           TEXT NOT NULL DEFAULT '',
      created_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_customer_due_ledger_tenant_customer_created_at
      ON customer_due_ledger(tenant_id, customer_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_customer_due_ledger_reference
      ON customer_due_ledger(reference_type, reference_id);

    CREATE TABLE IF NOT EXISTS customer_payments (
      id              TEXT PRIMARY KEY,
      tenant_id       TEXT REFERENCES tenants(id),
      customer_id     TEXT NOT NULL,
      payment_date    DATE NOT NULL,
      amount          NUMERIC NOT NULL DEFAULT 0,
      payment_method  TEXT NOT NULL DEFAULT 'CASH',
      note            TEXT NOT NULL DEFAULT '',
      created_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at      TIMESTAMPTZ,
      deleted_by_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
      delete_reason   TEXT NOT NULL DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_customer_payments_tenant_id ON customer_payments(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_customer_payments_customer_id ON customer_payments(customer_id);
    CREATE INDEX IF NOT EXISTS idx_customer_payments_deleted_at ON customer_payments(tenant_id, deleted_at);

    CREATE TABLE IF NOT EXISTS sales_returns (
      id                       TEXT PRIMARY KEY,
      tenant_id                TEXT REFERENCES tenants(id),
      return_number            TEXT NOT NULL,
      return_date              DATE NOT NULL,
      sales_invoice_id         TEXT REFERENCES sales_invoices(id) ON DELETE SET NULL,
      customer_id              TEXT REFERENCES customers(id) ON DELETE SET NULL,
      refund_method            TEXT NOT NULL DEFAULT 'DUE_ADJUSTMENT',
      total_amount             NUMERIC NOT NULL DEFAULT 0,
      total_profit_adjustment  NUMERIC NOT NULL DEFAULT 0,
      loyalty_points_adjustment INTEGER NOT NULL DEFAULT 0,
      note                     TEXT NOT NULL DEFAULT '',
      created_by               TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at               TIMESTAMPTZ,
      deleted_by_id            TEXT REFERENCES users(id) ON DELETE SET NULL,
      delete_reason            TEXT NOT NULL DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_sales_returns_tenant_id ON sales_returns(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sales_returns_invoice_id ON sales_returns(sales_invoice_id);
    CREATE INDEX IF NOT EXISTS idx_sales_returns_customer_id ON sales_returns(customer_id);
    CREATE INDEX IF NOT EXISTS idx_sales_returns_return_date ON sales_returns(tenant_id, return_date);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_returns_number ON sales_returns(tenant_id, return_number);

    CREATE TABLE IF NOT EXISTS sales_return_items (
      id                    TEXT PRIMARY KEY,
      tenant_id             TEXT REFERENCES tenants(id),
      sales_return_id       TEXT NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
      sales_invoice_item_id TEXT,
      product_id            TEXT NOT NULL,
      product_name          TEXT NOT NULL DEFAULT '',
      quantity_pieces       INTEGER NOT NULL DEFAULT 0,
      actual_sale_price     NUMERIC NOT NULL DEFAULT 0,
      cost_price_snapshot   NUMERIC NOT NULL DEFAULT 0,
      line_total            NUMERIC NOT NULL DEFAULT 0,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_sales_return_items_return_id ON sales_return_items(sales_return_id);
    CREATE INDEX IF NOT EXISTS idx_sales_return_items_product_id ON sales_return_items(product_id);

    CREATE TABLE IF NOT EXISTS contact_messages (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      phone       TEXT NOT NULL,
      message     TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'NEW',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at);

    CREATE TABLE IF NOT EXISTS finance_accounts (
      id            TEXT PRIMARY KEY,
      tenant_id     TEXT REFERENCES tenants(id),
      type          TEXT NOT NULL,
      name          TEXT NOT NULL,
      balance       NUMERIC NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_id, type)
    );

    CREATE TABLE IF NOT EXISTS finance_account_transactions (
      id             TEXT PRIMARY KEY,
      tenant_id      TEXT REFERENCES tenants(id),
      account_id     TEXT NOT NULL REFERENCES finance_accounts(id),
      transaction_date DATE NOT NULL,
      type           TEXT NOT NULL,
      debit          NUMERIC NOT NULL DEFAULT 0,
      credit         NUMERIC NOT NULL DEFAULT 0,
      balance_after  NUMERIC NOT NULL DEFAULT 0,
      transfer_id    TEXT,
      note           TEXT NOT NULL DEFAULT '',
      created_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at     TIMESTAMPTZ,
      deleted_by_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
      delete_reason  TEXT NOT NULL DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_finance_account_txns_tenant_account_created_at
      ON finance_account_transactions(tenant_id, account_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_finance_account_txns_transfer ON finance_account_transactions(transfer_id);

    -- Retail customers (individual walk-in customers, separate from registered shops)
    CREATE TABLE IF NOT EXISTS retail_customers (
      id          TEXT PRIMARY KEY,
      tenant_id   TEXT REFERENCES tenants(id),
      name        TEXT NOT NULL,
      phone       TEXT NOT NULL DEFAULT '',
      address     TEXT NOT NULL DEFAULT '',
      note        TEXT NOT NULL DEFAULT '',
      status      TEXT NOT NULL DEFAULT 'ACTIVE',
      created_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at  TIMESTAMPTZ,
      deleted_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      delete_reason TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_retail_customers_tenant_id ON retail_customers(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_retail_customers_deleted_at ON retail_customers(tenant_id, deleted_at);

    CREATE TABLE IF NOT EXISTS help_desk_ticket_counters (
      tenant_id  TEXT NOT NULL REFERENCES tenants(id),
      year       INTEGER NOT NULL,
      last_value INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (tenant_id, year)
    );

    CREATE TABLE IF NOT EXISTS help_desk_tickets (
      id               TEXT PRIMARY KEY,
      tenant_id        TEXT REFERENCES tenants(id),
      ticket_number    TEXT NOT NULL,
      subject          TEXT NOT NULL,
      category         TEXT NOT NULL DEFAULT 'OTHER',
      priority         TEXT NOT NULL DEFAULT 'MEDIUM',
      status           TEXT NOT NULL DEFAULT 'OPEN',
      channel          TEXT NOT NULL DEFAULT 'IN_APP',
      customer_name    TEXT NOT NULL DEFAULT '',
      customer_phone   TEXT NOT NULL DEFAULT '',
      reference_number TEXT NOT NULL DEFAULT '',
      description      TEXT NOT NULL DEFAULT '',
      assignee_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
      assignee_name    TEXT NOT NULL DEFAULT '',
      created_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_by_name  TEXT NOT NULL DEFAULT '',
      updated_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
      updated_by_name  TEXT NOT NULL DEFAULT '',
      escalated_at     TIMESTAMPTZ,
      closed_at        TIMESTAMPTZ,
      last_note_at     TIMESTAMPTZ,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_help_desk_tickets_number ON help_desk_tickets(tenant_id, ticket_number);
    CREATE INDEX IF NOT EXISTS idx_help_desk_tickets_tenant_id ON help_desk_tickets(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_help_desk_tickets_status ON help_desk_tickets(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_help_desk_tickets_priority ON help_desk_tickets(tenant_id, priority);
    CREATE INDEX IF NOT EXISTS idx_help_desk_tickets_updated_at ON help_desk_tickets(tenant_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS help_desk_ticket_notes (
      id          TEXT PRIMARY KEY,
      tenant_id   TEXT REFERENCES tenants(id),
      ticket_id   TEXT NOT NULL REFERENCES help_desk_tickets(id) ON DELETE CASCADE,
      body        TEXT NOT NULL,
      created_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
      author_name TEXT NOT NULL DEFAULT '',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_help_desk_ticket_notes_ticket_id ON help_desk_ticket_notes(ticket_id, created_at ASC);

    CREATE TABLE IF NOT EXISTS retail_promotions (
      id             TEXT PRIMARY KEY,
      tenant_id      TEXT NOT NULL REFERENCES tenants(id),
      name           TEXT NOT NULL,
      description    TEXT NOT NULL DEFAULT '',
      active         BOOLEAN NOT NULL DEFAULT TRUE,
      level          TEXT NOT NULL DEFAULT 'LINE',
      target_type    TEXT NOT NULL DEFAULT 'PRODUCT',
      target_id      TEXT,
      sale_type      TEXT NOT NULL DEFAULT 'ALL',
      discount_type  TEXT NOT NULL DEFAULT 'PERCENT',
      discount_value NUMERIC NOT NULL DEFAULT 0,
      min_quantity   INTEGER NOT NULL DEFAULT 0,
      min_subtotal   NUMERIC NOT NULL DEFAULT 0,
      start_date     DATE,
      end_date       DATE,
      priority       INTEGER NOT NULL DEFAULT 100,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_retail_promotions_tenant_id ON retail_promotions(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_retail_promotions_active ON retail_promotions(tenant_id, active);
    CREATE INDEX IF NOT EXISTS idx_retail_promotions_priority ON retail_promotions(tenant_id, priority);

    -- Migrate retailer module customer references to retail_customers table
    ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS opening_due NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS current_due NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS loyalty_points_balance INTEGER NOT NULL DEFAULT 0;

    CREATE TABLE IF NOT EXISTS retail_loyalty_ledger (
      id               TEXT PRIMARY KEY,
      tenant_id        TEXT REFERENCES tenants(id),
      customer_id      TEXT NOT NULL REFERENCES retail_customers(id) ON DELETE CASCADE,
      type             TEXT NOT NULL,
      points_delta     INTEGER NOT NULL DEFAULT 0,
      balance_after    INTEGER NOT NULL DEFAULT 0,
      reference_type   TEXT NOT NULL,
      reference_id     TEXT,
      note             TEXT NOT NULL DEFAULT '',
      created_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
      business_date    DATE,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_retail_loyalty_ledger_tenant_customer_created_at
      ON retail_loyalty_ledger(tenant_id, customer_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_retail_loyalty_ledger_reference
      ON retail_loyalty_ledger(reference_type, reference_id);
    ALTER TABLE sales_invoices DROP CONSTRAINT IF EXISTS sales_invoices_customer_id_fkey;
    ALTER TABLE sales_returns DROP CONSTRAINT IF EXISTS sales_returns_customer_id_fkey;

    -- Business date: the date the underlying transaction actually happened, as opposed to
    -- created_at (when the row was entered). Nullable so existing rows fall back to created_at
    -- in queries rather than disappearing from date-filtered reports.
    ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS business_date DATE;
    ALTER TABLE customer_due_ledger ADD COLUMN IF NOT EXISTS business_date DATE;
    ALTER TABLE supplier_due_ledger ADD COLUMN IF NOT EXISTS business_date DATE;
    ALTER TABLE dsr_due_ledger ADD COLUMN IF NOT EXISTS business_date DATE;

    CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_business_date
      ON stock_movements(tenant_id, business_date);
    CREATE INDEX IF NOT EXISTS idx_customer_due_ledger_tenant_business_date
      ON customer_due_ledger(tenant_id, business_date);
    CREATE INDEX IF NOT EXISTS idx_supplier_due_ledger_tenant_business_date
      ON supplier_due_ledger(tenant_id, business_date);
    CREATE INDEX IF NOT EXISTS idx_dsr_due_ledger_tenant_business_date
      ON dsr_due_ledger(tenant_id, business_date);

    -- Lock down tenant_id on every table that must always belong to exactly one tenant.
    -- Deliberately NOT included: users (system_developer has no home tenant), activity_logs
    -- and error_logs (platform-level actions and errors can occur with no tenant context Ã¢â‚¬â€
    -- e.g. the tenant-switch and full-platform-backup audit entries record tenant_id = NULL
    -- on purpose), login_history and password_reset_tokens (same reasoning for platform users).

    -- Step 1: root tables with no better signal than "the tenant this row has always
    -- implicitly belonged to" Ã¢â‚¬â€ backfill any leftover null to the oldest tenant.
    UPDATE products SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;
    UPDATE dsrs SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;
    UPDATE issues SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;
    UPDATE settlements SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;
    UPDATE expenses SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;
    UPDATE customers SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;
    UPDATE suppliers SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;
    UPDATE retail_customers SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;
    UPDATE finance_accounts SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;

    -- Step 2: tables one level down Ã¢â‚¬â€ infer tenant_id from the parent business record they
    -- reference (more accurate than guessing), then fall back to the oldest tenant for any
    -- row whose parent can't be resolved.
    UPDATE sales_invoices si SET tenant_id = rc.tenant_id
      FROM retail_customers rc WHERE rc.id = si.customer_id AND si.tenant_id IS NULL AND rc.tenant_id IS NOT NULL;
    UPDATE sales_invoices SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;

    UPDATE purchase_receipts pr SET tenant_id = s.tenant_id
      FROM suppliers s WHERE s.id = pr.supplier_id AND pr.tenant_id IS NULL AND s.tenant_id IS NOT NULL;
    UPDATE purchase_receipts SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;

    -- Step 3: tables two levels down, depending on step 2 having already run.
    UPDATE stock_movements sm SET tenant_id = p.tenant_id
      FROM products p WHERE p.id = sm.product_id AND sm.tenant_id IS NULL AND p.tenant_id IS NOT NULL;
    UPDATE stock_movements SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;

    UPDATE purchase_receipt_items pri SET tenant_id = pr.tenant_id
      FROM purchase_receipts pr WHERE pr.id = pri.purchase_receipt_id AND pri.tenant_id IS NULL AND pr.tenant_id IS NOT NULL;
    UPDATE purchase_receipt_items SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;

    UPDATE supplier_due_ledger sdl SET tenant_id = s.tenant_id
      FROM suppliers s WHERE s.id = sdl.supplier_id AND sdl.tenant_id IS NULL AND s.tenant_id IS NOT NULL;
    UPDATE supplier_due_ledger SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;

    UPDATE supplier_payments sp SET tenant_id = s.tenant_id
      FROM suppliers s WHERE s.id = sp.supplier_id AND sp.tenant_id IS NULL AND s.tenant_id IS NOT NULL;
    UPDATE supplier_payments SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;

    UPDATE sales_invoice_items sii SET tenant_id = si.tenant_id
      FROM sales_invoices si WHERE si.id = sii.sales_invoice_id AND sii.tenant_id IS NULL AND si.tenant_id IS NOT NULL;
    UPDATE sales_invoice_items SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;

    UPDATE customer_due_ledger cdl SET tenant_id = rc.tenant_id
      FROM retail_customers rc WHERE rc.id = cdl.customer_id AND cdl.tenant_id IS NULL AND rc.tenant_id IS NOT NULL;
    UPDATE customer_due_ledger SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;

    UPDATE customer_payments cp SET tenant_id = rc.tenant_id
      FROM retail_customers rc WHERE rc.id = cp.customer_id AND cp.tenant_id IS NULL AND rc.tenant_id IS NOT NULL;
    UPDATE customer_payments SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;

    UPDATE sales_returns sr SET tenant_id = si.tenant_id
      FROM sales_invoices si WHERE si.id = sr.sales_invoice_id AND sr.tenant_id IS NULL AND si.tenant_id IS NOT NULL;
    UPDATE sales_returns sr SET tenant_id = rc.tenant_id
      FROM retail_customers rc WHERE rc.id = sr.customer_id AND sr.tenant_id IS NULL AND rc.tenant_id IS NOT NULL;
    UPDATE sales_returns SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;

    UPDATE finance_account_transactions fat SET tenant_id = fa.tenant_id
      FROM finance_accounts fa WHERE fa.id = fat.account_id AND fat.tenant_id IS NULL AND fa.tenant_id IS NOT NULL;
    UPDATE finance_account_transactions SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;

    UPDATE dsr_due_ledger ddl SET tenant_id = d.tenant_id
      FROM dsrs d WHERE d.id = ddl.dsr_id AND ddl.tenant_id IS NULL AND d.tenant_id IS NOT NULL;
    UPDATE dsr_due_ledger SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;

    -- Step 4: tables three levels down, depending on step 3 having already run.
    UPDATE sales_return_items sri SET tenant_id = sr.tenant_id
      FROM sales_returns sr WHERE sr.id = sri.sales_return_id AND sri.tenant_id IS NULL AND sr.tenant_id IS NOT NULL;
    UPDATE sales_return_items SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;

    -- Every row above now has a tenant_id (or the table is empty) Ã¢â‚¬â€ safe to enforce.
    ALTER TABLE products ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE dsrs ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE issues ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE settlements ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE expenses ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE customers ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE suppliers ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE retail_customers ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE finance_accounts ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE sales_invoices ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE purchase_receipts ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE stock_movements ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE purchase_receipt_items ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE supplier_due_ledger ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE supplier_payments ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE sales_invoice_items ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE customer_due_ledger ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE customer_payments ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE sales_returns ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE finance_account_transactions ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE dsr_due_ledger ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE sales_return_items ALTER COLUMN tenant_id SET NOT NULL;

    -- Product categories
    CREATE TABLE IF NOT EXISTS categories (
      id          TEXT PRIMARY KEY,
      tenant_id   TEXT NOT NULL REFERENCES tenants(id),
      name        TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_tenant_name ON categories(tenant_id, LOWER(name));
    CREATE INDEX IF NOT EXISTS idx_categories_tenant_id ON categories(tenant_id);

    ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id TEXT REFERENCES categories(id);

    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'category'
      ) THEN
        INSERT INTO categories (id, tenant_id, name)
        SELECT DISTINCT ON (p.tenant_id, LOWER(p.category))
          'category-' || md5(p.tenant_id || '-' || LOWER(p.category)),
          p.tenant_id,
          p.category
        FROM products p
        WHERE p.category IS NOT NULL AND p.category <> ''
          AND NOT EXISTS (
            SELECT 1 FROM categories c
            WHERE c.tenant_id = p.tenant_id AND LOWER(c.name) = LOWER(p.category)
          );

        UPDATE products p
        SET category_id = c.id
        FROM categories c
        WHERE c.tenant_id = p.tenant_id
          AND LOWER(c.name) = LOWER(p.category)
          AND p.category_id IS NULL;

        ALTER TABLE products DROP COLUMN category;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

    ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_level INTEGER;

    -- Electronics retail: SKU/barcode/brand/model + serial/warranty requirements (Phase 1).
    ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT NOT NULL DEFAULT '';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT NOT NULL DEFAULT '';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT NOT NULL DEFAULT '';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS model TEXT NOT NULL DEFAULT '';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS serial_required BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty_months INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(tenant_id, barcode);
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(tenant_id, sku);
    CREATE INDEX IF NOT EXISTS idx_products_brand ON products(tenant_id, brand);
    CREATE INDEX IF NOT EXISTS idx_products_status ON products(tenant_id, status);

    CREATE UNIQUE INDEX IF NOT EXISTS uq_products_sku ON products(tenant_id, sku) WHERE sku <> '';
    CREATE UNIQUE INDEX IF NOT EXISTS uq_products_barcode ON products(tenant_id, barcode) WHERE barcode <> '';

    -- Electronics retail: individual serial/IMEI tracking per unit (Phase 2).
    CREATE TABLE IF NOT EXISTS product_serials (
      id                        TEXT PRIMARY KEY,
      tenant_id                 TEXT NOT NULL REFERENCES tenants(id),
      product_id                 TEXT NOT NULL REFERENCES products(id),

      serial_number              TEXT NOT NULL DEFAULT '',
      imei1                       TEXT NOT NULL DEFAULT '',
      imei2                       TEXT NOT NULL DEFAULT '',

      status                      TEXT NOT NULL DEFAULT 'IN_STOCK',

      purchase_receipt_id         TEXT REFERENCES purchase_receipts(id) ON DELETE SET NULL,
      purchase_receipt_item_id    TEXT REFERENCES purchase_receipt_items(id) ON DELETE SET NULL,

      sales_invoice_id             TEXT REFERENCES sales_invoices(id) ON DELETE SET NULL,
      sales_invoice_item_id         TEXT REFERENCES sales_invoice_items(id) ON DELETE SET NULL,

      warranty_start_date          DATE,
      warranty_end_date            DATE,

      created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      deleted_at                   TIMESTAMPTZ,
      deleted_by_id                TEXT REFERENCES users(id) ON DELETE SET NULL,
      delete_reason                TEXT NOT NULL DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_product_serials_tenant_product ON product_serials(tenant_id, product_id);
    CREATE INDEX IF NOT EXISTS idx_product_serials_status ON product_serials(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_product_serials_serial_number ON product_serials(tenant_id, serial_number);
    CREATE INDEX IF NOT EXISTS idx_product_serials_imei1 ON product_serials(tenant_id, imei1);
    CREATE INDEX IF NOT EXISTS idx_product_serials_imei2 ON product_serials(tenant_id, imei2);
    CREATE INDEX IF NOT EXISTS idx_product_serials_sale ON product_serials(tenant_id, sales_invoice_id);

    -- Electronics retail: one row per non-blank serial_number/imei1/imei2 value, so a single
    -- unique index can enforce that an identifier value is never reused across *any* of those
    -- three columns Ã¢â‚¬â€ not just within the same column (which per-column unique indexes can't do,
    -- since a unique index only constrains the tuple of columns it covers, never a union of
    -- values drawn from different columns across different rows).
    CREATE TABLE IF NOT EXISTS product_serial_identifiers (
      id                  TEXT PRIMARY KEY,
      tenant_id           TEXT NOT NULL REFERENCES tenants(id),
      product_serial_id   TEXT NOT NULL REFERENCES product_serials(id) ON DELETE CASCADE,
      identifier_type     TEXT NOT NULL,
      identifier_value    TEXT NOT NULL,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at          TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_product_serial_identifiers_serial_id ON product_serial_identifiers(product_serial_id);

    CREATE UNIQUE INDEX IF NOT EXISTS uq_product_serial_identifiers_value
      ON product_serial_identifiers(tenant_id, identifier_value) WHERE deleted_at IS NULL;

    -- One-time backfill for serials that existed before this table did; a no-op once every
    -- serial already has its identifier rows.
    INSERT INTO product_serial_identifiers (id, tenant_id, product_serial_id, identifier_type, identifier_value, deleted_at)
    SELECT 'serial-identifier-' || md5(ps.id || ':' || src.identifier_type), ps.tenant_id, ps.id, src.identifier_type, src.identifier_value, ps.deleted_at
    FROM product_serials ps
    CROSS JOIN LATERAL (
      VALUES ('SERIAL_NUMBER', ps.serial_number), ('IMEI1', ps.imei1), ('IMEI2', ps.imei2)
    ) AS src(identifier_type, identifier_value)
    WHERE src.identifier_value <> ''
      AND NOT EXISTS (
        SELECT 1 FROM product_serial_identifiers psi
        WHERE psi.product_serial_id = ps.id AND psi.identifier_type = src.identifier_type
      );

    -- Electronics retail: links sold serial/IMEI units to the sales invoice line that sold
    -- them (Phase 3). One invoice item can carry several serials (quantity > 1).
    CREATE TABLE IF NOT EXISTS sales_item_serials (
      id                      TEXT PRIMARY KEY,
      tenant_id               TEXT NOT NULL REFERENCES tenants(id),
      sales_invoice_id        TEXT NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
      sales_invoice_item_id   TEXT NOT NULL REFERENCES sales_invoice_items(id) ON DELETE CASCADE,
      product_id              TEXT NOT NULL REFERENCES products(id),
      product_serial_id       TEXT NOT NULL REFERENCES product_serials(id),

      serial_number_snapshot  TEXT NOT NULL DEFAULT '',
      imei1_snapshot          TEXT NOT NULL DEFAULT '',
      imei2_snapshot          TEXT NOT NULL DEFAULT '',

      created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_sales_item_serials_invoice ON sales_item_serials(tenant_id, sales_invoice_id);
    CREATE INDEX IF NOT EXISTS idx_sales_item_serials_item ON sales_item_serials(tenant_id, sales_invoice_item_id);
    CREATE INDEX IF NOT EXISTS idx_sales_item_serials_serial ON sales_item_serials(tenant_id, product_serial_id);

    -- Electronics retail: snapshot the customer's name/phone at sale time so invoice
    -- history (and reprints) stay stable even if the customer record changes later (Phase 4).
    ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS customer_name_snapshot TEXT NOT NULL DEFAULT '';
    ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS customer_phone_snapshot TEXT NOT NULL DEFAULT '';

    -- Electronics retail: snapshot brand/model/barcode/warranty on each sold line item, so
    -- invoice history and reprints stay stable even if the product record changes later (Phase 5).
    ALTER TABLE sales_invoice_items ADD COLUMN IF NOT EXISTS brand_snapshot TEXT NOT NULL DEFAULT '';
    ALTER TABLE sales_invoice_items ADD COLUMN IF NOT EXISTS model_snapshot TEXT NOT NULL DEFAULT '';
    ALTER TABLE sales_invoice_items ADD COLUMN IF NOT EXISTS barcode_snapshot TEXT NOT NULL DEFAULT '';
    ALTER TABLE sales_invoice_items ADD COLUMN IF NOT EXISTS warranty_months_snapshot INTEGER NOT NULL DEFAULT 0;

    -- Electronics retail: track the physical condition of each returned line item so serial
    -- status and stock vs. damaged-stock placement can follow it correctly (Phase 9).
    ALTER TABLE sales_return_items ADD COLUMN IF NOT EXISTS condition TEXT NOT NULL DEFAULT 'GOOD';

    -- Electronics retail: warranty/service claim tracking (Phase 10).
    CREATE TABLE IF NOT EXISTS warranty_claim_counters (
      tenant_id  TEXT NOT NULL REFERENCES tenants(id),
      year       INTEGER NOT NULL,
      last_value INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (tenant_id, year)
    );

    CREATE TABLE IF NOT EXISTS warranty_claims (
      id                      TEXT PRIMARY KEY,
      tenant_id               TEXT NOT NULL REFERENCES tenants(id),

      claim_number            TEXT NOT NULL,
      customer_id             TEXT,
      sales_invoice_id        TEXT REFERENCES sales_invoices(id) ON DELETE SET NULL,
      sales_invoice_item_id   TEXT REFERENCES sales_invoice_items(id) ON DELETE SET NULL,
      product_id              TEXT NOT NULL REFERENCES products(id),
      product_serial_id        TEXT REFERENCES product_serials(id) ON DELETE SET NULL,

      problem_note             TEXT NOT NULL DEFAULT '',
      received_date            DATE NOT NULL DEFAULT CURRENT_DATE,

      status                   TEXT NOT NULL DEFAULT 'RECEIVED',

      supplier_id               TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
      resolution_note            TEXT NOT NULL DEFAULT '',

      created_by                 TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      deleted_at                  TIMESTAMPTZ,
      deleted_by_id                TEXT REFERENCES users(id) ON DELETE SET NULL,
      delete_reason                 TEXT NOT NULL DEFAULT '',

      UNIQUE (tenant_id, claim_number)
    );

    CREATE INDEX IF NOT EXISTS idx_warranty_claims_tenant_status ON warranty_claims(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_warranty_claims_invoice ON warranty_claims(tenant_id, sales_invoice_id);
    CREATE INDEX IF NOT EXISTS idx_warranty_claims_serial ON warranty_claims(tenant_id, product_serial_id);
    CREATE INDEX IF NOT EXISTS idx_warranty_claims_date ON warranty_claims(tenant_id, received_date DESC);

    -- Anonymous landing-page chat: one conversation per visitor browser/device, platform-level
    -- (not tenant-scoped) since visitors are prospective customers of the product itself.
    CREATE TABLE IF NOT EXISTS visitor_chats (
      id                TEXT PRIMARY KEY,
      visitor_token     TEXT NOT NULL,
      visitor_name      TEXT NOT NULL DEFAULT '',
      visitor_phone     TEXT NOT NULL DEFAULT '',
      status            TEXT NOT NULL DEFAULT 'OPEN',
      last_message_at   TIMESTAMPTZ,
      unread_for_admin  BOOLEAN NOT NULL DEFAULT TRUE,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_visitor_chats_token ON visitor_chats(visitor_token);
    CREATE INDEX IF NOT EXISTS idx_visitor_chats_updated_at ON visitor_chats(updated_at DESC);

    CREATE TABLE IF NOT EXISTS visitor_chat_messages (
      id              BIGSERIAL PRIMARY KEY,
      visitor_chat_id TEXT NOT NULL REFERENCES visitor_chats(id) ON DELETE CASCADE,
      sender_role     TEXT NOT NULL,
      sender_user_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
      body            TEXT NOT NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_visitor_chat_messages_chat_id_id ON visitor_chat_messages(visitor_chat_id, id);

    CREATE TABLE IF NOT EXISTS schema_backfills (
      key        TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await runBackfillOnce(pool, "retail-permission-split", `
    -- Per-menu-item permission split: expand any existing role_permissions row
    -- that referenced a retired shared permission into all of its granular
    -- successors, for the same (role, tenant_id) scope, so no tenant silently
    -- loses access it had before the split. Idempotent via ON CONFLICT.
    DO $$
    DECLARE
      new_perm TEXT;
      new_perms TEXT[] := ARRAY[
        'manage_retail_quick_sale','manage_retail_sales_invoices','manage_retail_sales_returns',
        'manage_retail_customer_due','manage_retail_due_collection','manage_retail_promotions',
        'manage_retail_daily_sales_report','manage_profit_report','manage_retail_customers_write'
      ];
    BEGIN
      FOREACH new_perm IN ARRAY new_perms LOOP
        INSERT INTO role_permissions (role, tenant_id, permission)
        SELECT role, tenant_id, new_perm FROM role_permissions WHERE permission = 'manage_retailers'
        ON CONFLICT (role, tenant_id, permission) DO NOTHING;
      END LOOP;
    END $$;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'manage_profit_report' FROM role_permissions WHERE permission = 'manage_dsr_finance'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'view_retail_customer_retention' FROM role_permissions WHERE permission = 'view_state'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'view_supplier_statement' FROM role_permissions WHERE permission = 'manage_suppliers'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;

    DELETE FROM role_permissions WHERE permission = 'manage_retailers';
  `);

  await runBackfillOnce(pool, "menu-feature-split", `
    -- Per-menu-item tenant feature split: backfill the new feature keys onto
    -- every tenant that already has an explicit tenant_features config, so
    -- they don't lose access to previously-always-on items (Dashboard, etc.)
    -- now that feature flags are enforced server-side. Tenants with zero rows
    -- are left untouched on purpose Ã¢â‚¬â€ getTenantFeatures() already treats "no
    -- rows" as "everything enabled", and inserting rows here would wrongly
    -- freeze them out of any future feature additions.
    DO $$
    DECLARE
      new_feature TEXT;
      new_features TEXT[] := ARRAY[
        'dashboard','my-profile','security','help-desk','org-settings','user-management','permissions',
        'retail-customers','retail-customer-retention','database-backup','platform','visitor-chats',
        'system-health','error-logs','damaged-stock','stock-movement','low-stock-alerts'
      ];
    BEGIN
      FOREACH new_feature IN ARRAY new_features LOOP
        INSERT INTO tenant_features (tenant_id, feature)
        SELECT DISTINCT tenant_id, new_feature FROM tenant_features
        ON CONFLICT (tenant_id, feature) DO NOTHING;
      END LOOP;
    END $$;
  `);

  await pool.query(`
    ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS rma_number TEXT NOT NULL DEFAULT '';
    ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS sent_to_supplier_date DATE;
    ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS received_from_supplier_date DATE;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS repair_job_counters (
      tenant_id  TEXT NOT NULL REFERENCES tenants(id),
      year       INTEGER NOT NULL,
      last_value INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (tenant_id, year)
    );

    CREATE TABLE IF NOT EXISTS repair_jobs (
      id                  TEXT PRIMARY KEY,
      tenant_id           TEXT NOT NULL REFERENCES tenants(id),
      job_number          TEXT NOT NULL,
      customer_name       TEXT NOT NULL DEFAULT '',
      customer_phone      TEXT NOT NULL DEFAULT '',
      product_id          TEXT REFERENCES products(id) ON DELETE SET NULL,
      serial_number       TEXT NOT NULL DEFAULT '',
      problem_description TEXT NOT NULL DEFAULT '',
      estimated_cost      NUMERIC NOT NULL DEFAULT 0,
      labor_cost          NUMERIC NOT NULL DEFAULT 0,
      actual_cost         NUMERIC NOT NULL DEFAULT 0,
      parts_used          TEXT NOT NULL DEFAULT '',
      technician_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
      status              TEXT NOT NULL DEFAULT 'RECEIVED',
      approval_status     TEXT NOT NULL DEFAULT 'PENDING',
      received_date       DATE NOT NULL DEFAULT CURRENT_DATE,
      promised_date       DATE,
      delivered_date      DATE,
      resolution_note     TEXT NOT NULL DEFAULT '',
      created_by          TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at          TIMESTAMPTZ,
      deleted_by_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
      delete_reason       TEXT NOT NULL DEFAULT '',
      UNIQUE (tenant_id, job_number)
    );

    CREATE INDEX IF NOT EXISTS idx_repair_jobs_tenant_status ON repair_jobs(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_repair_jobs_tenant_technician ON repair_jobs(tenant_id, technician_id);
    CREATE INDEX IF NOT EXISTS idx_repair_jobs_date ON repair_jobs(tenant_id, received_date DESC);
    CREATE INDEX IF NOT EXISTS idx_repair_jobs_deleted ON repair_jobs(tenant_id, deleted_at);
  `);

  await pool.query(`
    ALTER TABLE repair_jobs ADD COLUMN IF NOT EXISTS device_name TEXT NOT NULL DEFAULT '';
  `);

  await pool.query(`
    ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS repair_job_id TEXT REFERENCES repair_jobs(id) ON DELETE SET NULL;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quotation_counters (
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      year INTEGER NOT NULL,
      last_value INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (tenant_id, year)
    );

    CREATE TABLE IF NOT EXISTS quotations (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      quote_number TEXT NOT NULL,
      customer_id TEXT REFERENCES retail_customers(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL DEFAULT '',
      customer_phone TEXT NOT NULL DEFAULT '',
      customer_email TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'DRAFT',
      validity_days INTEGER NOT NULL DEFAULT 7,
      valid_until DATE,
      quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
      tax_rate NUMERIC NOT NULL DEFAULT 0,
      subtotal NUMERIC NOT NULL DEFAULT 0,
      discount_amount NUMERIC NOT NULL DEFAULT 0,
      tax_amount NUMERIC NOT NULL DEFAULT 0,
      total_amount NUMERIC NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      converted_invoice_id TEXT REFERENCES sales_invoices(id) ON DELETE SET NULL,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ,
      deleted_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      delete_reason TEXT NOT NULL DEFAULT '',
      UNIQUE (tenant_id, quote_number)
    );

    CREATE TABLE IF NOT EXISTS quotation_items (
      id TEXT PRIMARY KEY,
      quotation_id TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL DEFAULT '',
      quantity NUMERIC NOT NULL DEFAULT 1,
      unit_price NUMERIC NOT NULL DEFAULT 0,
      discount_amount NUMERIC NOT NULL DEFAULT 0,
      line_total NUMERIC NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_quotations_tenant_status ON quotations(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_quotations_tenant_date ON quotations(tenant_id, quote_date DESC);
    CREATE INDEX IF NOT EXISTS idx_quotations_tenant_customer ON quotations(tenant_id, customer_id);
    CREATE INDEX IF NOT EXISTS idx_quotations_deleted ON quotations(tenant_id, deleted_at);
    CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON quotation_items(quotation_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS trade_in_counters (
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      year      INTEGER NOT NULL,
      last_value INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (tenant_id, year)
    );

    CREATE TABLE IF NOT EXISTS trade_ins (
      id                    TEXT PRIMARY KEY,
      tenant_id             TEXT NOT NULL REFERENCES tenants(id),
      trade_in_number       TEXT NOT NULL,
      trade_in_date         DATE NOT NULL DEFAULT CURRENT_DATE,
      customer_name         TEXT NOT NULL DEFAULT '',
      customer_phone        TEXT NOT NULL DEFAULT '',
      total_trade_in_value  NUMERIC NOT NULL DEFAULT 0,
      total_sale_amount     NUMERIC NOT NULL DEFAULT 0,
      payment_amount        NUMERIC NOT NULL DEFAULT 0,
      payment_method        TEXT NOT NULL DEFAULT 'CASH',
      notes                 TEXT NOT NULL DEFAULT '',
      created_by            TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at            TIMESTAMPTZ,
      deleted_by_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
      delete_reason         TEXT NOT NULL DEFAULT '',
      UNIQUE (tenant_id, trade_in_number)
    );

    CREATE TABLE IF NOT EXISTS trade_in_received_items (
      id              TEXT PRIMARY KEY,
      trade_in_id     TEXT NOT NULL REFERENCES trade_ins(id) ON DELETE CASCADE,
      tenant_id       TEXT NOT NULL REFERENCES tenants(id),
      product_id      TEXT REFERENCES products(id) ON DELETE SET NULL,
      product_name    TEXT NOT NULL DEFAULT '',
      serial_number   TEXT NOT NULL DEFAULT '',
      condition       TEXT NOT NULL DEFAULT 'GOOD',
      quantity        NUMERIC NOT NULL DEFAULT 1,
      trade_in_value  NUMERIC NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS trade_in_sold_items (
      id                   TEXT PRIMARY KEY,
      trade_in_id          TEXT NOT NULL REFERENCES trade_ins(id) ON DELETE CASCADE,
      tenant_id            TEXT NOT NULL REFERENCES tenants(id),
      product_id           TEXT REFERENCES products(id) ON DELETE SET NULL,
      product_name         TEXT NOT NULL DEFAULT '',
      quantity             NUMERIC NOT NULL DEFAULT 1,
      unit_price           NUMERIC NOT NULL DEFAULT 0,
      cost_price_snapshot  NUMERIC NOT NULL DEFAULT 0,
      line_total           NUMERIC NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_trade_ins_tenant_date ON trade_ins(tenant_id, trade_in_date DESC);
    CREATE INDEX IF NOT EXISTS idx_trade_ins_tenant_deleted ON trade_ins(tenant_id, deleted_at);
    CREATE INDEX IF NOT EXISTS idx_trade_in_received_trade_in ON trade_in_received_items(trade_in_id);
    CREATE INDEX IF NOT EXISTS idx_trade_in_sold_trade_in ON trade_in_sold_items(trade_in_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS brands (
      id          TEXT PRIMARY KEY,
      tenant_id   TEXT NOT NULL REFERENCES tenants(id),
      name        TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_brands_tenant_name ON brands(tenant_id, LOWER(name));
    CREATE INDEX IF NOT EXISTS idx_brands_tenant_id ON brands(tenant_id);

    CREATE TABLE IF NOT EXISTS manufacturers (
      id           TEXT PRIMARY KEY,
      tenant_id    TEXT NOT NULL REFERENCES tenants(id),
      name         TEXT NOT NULL,
      short_name   TEXT NOT NULL DEFAULT '',
      country      TEXT NOT NULL DEFAULT '',
      dgda_license TEXT NOT NULL DEFAULT '',
      phone        TEXT NOT NULL DEFAULT '',
      address      TEXT NOT NULL DEFAULT '',
      status       TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_manufacturers_tenant_name ON manufacturers(tenant_id, LOWER(name));
    CREATE INDEX IF NOT EXISTS idx_manufacturers_tenant_id ON manufacturers(tenant_id);

    CREATE TABLE IF NOT EXISTS generic_medicines (
      id          TEXT PRIMARY KEY,
      tenant_id   TEXT NOT NULL REFERENCES tenants(id),
      name        TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status      TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_generic_medicines_tenant_name ON generic_medicines(tenant_id, LOWER(name));
    CREATE INDEX IF NOT EXISTS idx_generic_medicines_tenant_id ON generic_medicines(tenant_id);

    CREATE TABLE IF NOT EXISTS shop_due_ledger (
      id              TEXT PRIMARY KEY,
      tenant_id       TEXT NOT NULL REFERENCES tenants(id),
      shop_id         TEXT NOT NULL REFERENCES customers(id),
      type            TEXT NOT NULL,
      debit           NUMERIC(14,4) NOT NULL DEFAULT 0,
      credit          NUMERIC(14,4) NOT NULL DEFAULT 0,
      balance_after   NUMERIC(14,4) NOT NULL DEFAULT 0,
      reference_type  TEXT,
      reference_id    TEXT,
      note            TEXT NOT NULL DEFAULT '',
      created_by      TEXT REFERENCES users(id),
      business_date   DATE,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
    );

    CREATE INDEX IF NOT EXISTS idx_shop_due_ledger_tenant_shop_created_at
      ON shop_due_ledger(tenant_id, shop_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_shop_due_ledger_reference
      ON shop_due_ledger(reference_type, reference_id);
    CREATE INDEX IF NOT EXISTS idx_shop_due_ledger_tenant_business_date
      ON shop_due_ledger(tenant_id, business_date);

    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'shop_due_ledger' AND column_name = 'debit' AND numeric_scale = 2
      ) THEN
        ALTER TABLE shop_due_ledger
          ALTER COLUMN debit TYPE NUMERIC(14,4),
          ALTER COLUMN credit TYPE NUMERIC(14,4),
          ALTER COLUMN balance_after TYPE NUMERIC(14,4);
      END IF;
    END $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS srs (
      id             TEXT PRIMARY KEY,
      tenant_id      TEXT NOT NULL REFERENCES tenants(id),
      name           TEXT NOT NULL,
      phone          TEXT NOT NULL,
      status         TEXT NOT NULL DEFAULT 'Active',
      opening_due    NUMERIC NOT NULL DEFAULT 0,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at     TIMESTAMPTZ,
      deleted_by_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
      delete_reason  TEXT NOT NULL DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_srs_tenant_id ON srs(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_srs_deleted_at ON srs(tenant_id, deleted_at);

    CREATE TABLE IF NOT EXISTS sr_due_ledger (
      id             TEXT PRIMARY KEY,
      tenant_id      TEXT NOT NULL REFERENCES tenants(id),
      sr_id          TEXT NOT NULL,
      type           TEXT NOT NULL,
      debit          NUMERIC NOT NULL DEFAULT 0,
      credit         NUMERIC NOT NULL DEFAULT 0,
      balance_after  NUMERIC NOT NULL DEFAULT 0,
      reference_type TEXT NOT NULL,
      reference_id   TEXT,
      note           TEXT NOT NULL DEFAULT '',
      business_date  DATE,
      created_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
    );

    CREATE INDEX IF NOT EXISTS idx_sr_due_ledger_tenant_sr_created_at
      ON sr_due_ledger(tenant_id, sr_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sr_due_ledger_reference
      ON sr_due_ledger(reference_type, reference_id);

    ALTER TABLE settlements ADD COLUMN IF NOT EXISTS sr_handovers JSONB NOT NULL DEFAULT '[]';
    ALTER TABLE settlements ADD COLUMN IF NOT EXISTS discount_supplier_id TEXT;

    CREATE TABLE IF NOT EXISTS supplier_discounts (
      id              TEXT PRIMARY KEY,
      tenant_id       TEXT NOT NULL REFERENCES tenants(id),
      supplier_id     TEXT,
      discount_date   DATE NOT NULL,
      amount          NUMERIC NOT NULL DEFAULT 0,
      dsr_name        TEXT NOT NULL DEFAULT '',
      reference_type  TEXT NOT NULL DEFAULT 'settlement',
      reference_id    TEXT,
      note            TEXT NOT NULL DEFAULT '',
      created_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE supplier_discounts ADD COLUMN IF NOT EXISTS supplier_id TEXT;
    ALTER TABLE supplier_discounts ADD COLUMN IF NOT EXISTS dsr_name TEXT NOT NULL DEFAULT '';
    ALTER TABLE supplier_discounts ADD COLUMN IF NOT EXISTS reference_type TEXT NOT NULL DEFAULT 'settlement';
    ALTER TABLE supplier_discounts ADD COLUMN IF NOT EXISTS reference_id TEXT;

    CREATE INDEX IF NOT EXISTS idx_supplier_discounts_tenant_id ON supplier_discounts(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_supplier_discounts_supplier_id ON supplier_discounts(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_supplier_discounts_reference ON supplier_discounts(reference_type, reference_id);
  `);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Salary Management Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  await pool.query(`
    CREATE TABLE IF NOT EXISTS employee_number_counters (
      tenant_id  TEXT NOT NULL REFERENCES tenants(id),
      year       INTEGER NOT NULL,
      last_value INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (tenant_id, year)
    );

    CREATE TABLE IF NOT EXISTS employees (
      id              TEXT PRIMARY KEY,
      tenant_id       TEXT NOT NULL REFERENCES tenants(id),
      employee_number TEXT NOT NULL,
      name            TEXT NOT NULL,
      phone           TEXT NOT NULL DEFAULT '',
      email           TEXT NOT NULL DEFAULT '',
      address         TEXT NOT NULL DEFAULT '',
      department      TEXT NOT NULL DEFAULT '',
      designation     TEXT NOT NULL DEFAULT '',
      join_date       DATE NOT NULL DEFAULT CURRENT_DATE,
      status          TEXT NOT NULL DEFAULT 'ACTIVE',
      note            TEXT NOT NULL DEFAULT '',
      created_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at      TIMESTAMPTZ,
      deleted_by_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
      delete_reason   TEXT NOT NULL DEFAULT '',
      UNIQUE (tenant_id, employee_number)
    );
    CREATE INDEX IF NOT EXISTS idx_employees_tenant_id ON employees(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_employees_deleted_at ON employees(tenant_id, deleted_at);
    CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(tenant_id, status);
    CREATE TABLE IF NOT EXISTS departments (
      id               TEXT PRIMARY KEY,
      tenant_id        TEXT NOT NULL REFERENCES tenants(id),
      name             TEXT NOT NULL,
      code             TEXT NOT NULL DEFAULT '',
      status           TEXT NOT NULL DEFAULT 'ACTIVE',
      head_employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
      note             TEXT NOT NULL DEFAULT '',
      created_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at       TIMESTAMPTZ,
      deleted_by_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
      delete_reason    TEXT NOT NULL DEFAULT ''
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_tenant_name ON departments(tenant_id, LOWER(name)) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_departments_tenant_status ON departments(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_departments_deleted_at ON departments(tenant_id, deleted_at);
    CREATE INDEX IF NOT EXISTS idx_departments_head_employee ON departments(head_employee_id);


    CREATE TABLE IF NOT EXISTS designations (
      id               TEXT PRIMARY KEY,
      tenant_id        TEXT NOT NULL REFERENCES tenants(id),
      name             TEXT NOT NULL,
      code             TEXT NOT NULL DEFAULT '',
      status           TEXT NOT NULL DEFAULT 'ACTIVE',
      note             TEXT NOT NULL DEFAULT '',
      created_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at       TIMESTAMPTZ,
      deleted_by_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
      delete_reason    TEXT NOT NULL DEFAULT ''
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_designations_tenant_name ON designations(tenant_id, LOWER(name)) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_designations_tenant_status ON designations(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_designations_deleted_at ON designations(tenant_id, deleted_at);

    ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo_url TEXT NOT NULL DEFAULT '';
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS department_id TEXT REFERENCES departments(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(tenant_id, department_id);
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS designation_id TEXT REFERENCES designations(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_employees_designation_id ON employees(tenant_id, designation_id);
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT NOT NULL DEFAULT '';
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT NOT NULL DEFAULT '';
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT NOT NULL DEFAULT '';
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS national_id TEXT NOT NULL DEFAULT '';
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS date_of_birth DATE;
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender TEXT NOT NULL DEFAULT '';
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS blood_group TEXT NOT NULL DEFAULT '';
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_name TEXT NOT NULL DEFAULT '';
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account_name TEXT NOT NULL DEFAULT '';
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account_number TEXT NOT NULL DEFAULT '';
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_branch TEXT NOT NULL DEFAULT '';

    CREATE TABLE IF NOT EXISTS employee_documents (
      id                TEXT PRIMARY KEY,
      tenant_id         TEXT NOT NULL REFERENCES tenants(id),
      employee_id       TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      document_type     TEXT NOT NULL,
      title             TEXT NOT NULL DEFAULT '',
      original_filename TEXT NOT NULL,
      stored_filename   TEXT NOT NULL,
      storage_path      TEXT NOT NULL,
      mime_type         TEXT NOT NULL,
      file_size         INTEGER NOT NULL DEFAULT 0,
      uploaded_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at        TIMESTAMPTZ,
      deleted_by_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
      delete_reason     TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_employee_documents_employee ON employee_documents(tenant_id, employee_id, deleted_at);
    CREATE INDEX IF NOT EXISTS idx_employee_documents_type ON employee_documents(tenant_id, document_type);

    CREATE TABLE IF NOT EXISTS attendance (
      id                TEXT PRIMARY KEY,
      tenant_id         TEXT NOT NULL REFERENCES tenants(id),
      employee_id       TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      attendance_date   DATE NOT NULL,
      status            TEXT NOT NULL,
      check_in_time     TIME,
      check_out_time    TIME,
      late_minutes      INTEGER NOT NULL DEFAULT 0,
      overtime_minutes  INTEGER NOT NULL DEFAULT 0,
      note              TEXT NOT NULL DEFAULT '',
      created_by        TEXT REFERENCES users(id) ON DELETE SET NULL,
      updated_by        TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_id, employee_id, attendance_date)
    );
    CREATE INDEX IF NOT EXISTS idx_attendance_tenant_date ON attendance(tenant_id, attendance_date);
    CREATE INDEX IF NOT EXISTS idx_attendance_employee_month ON attendance(tenant_id, employee_id, attendance_date);
    CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(tenant_id, status);

    CREATE TABLE IF NOT EXISTS leave_types (
      id                TEXT PRIMARY KEY,
      tenant_id         TEXT NOT NULL REFERENCES tenants(id),
      name              TEXT NOT NULL,
      code              TEXT NOT NULL DEFAULT '',
      status            TEXT NOT NULL DEFAULT 'ACTIVE',
      paid              BOOLEAN NOT NULL DEFAULT TRUE,
      annual_days       INTEGER NOT NULL DEFAULT 0,
      carry_forward     BOOLEAN NOT NULL DEFAULT FALSE,
      note              TEXT NOT NULL DEFAULT '',
      created_by        TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at        TIMESTAMPTZ,
      deleted_by_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
      delete_reason     TEXT NOT NULL DEFAULT ''
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_leave_types_name_active ON leave_types(tenant_id, LOWER(name)) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_leave_types_status ON leave_types(tenant_id, status, deleted_at);

    CREATE TABLE IF NOT EXISTS leave_requests (
      id                TEXT PRIMARY KEY,
      tenant_id         TEXT NOT NULL REFERENCES tenants(id),
      employee_id       TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      leave_type_id     TEXT NOT NULL REFERENCES leave_types(id),
      start_date        DATE NOT NULL,
      end_date          DATE NOT NULL,
      total_days        NUMERIC(10,2) NOT NULL,
      status            TEXT NOT NULL DEFAULT 'PENDING',
      reason            TEXT NOT NULL DEFAULT '',
      decision_note     TEXT NOT NULL DEFAULT '',
      requested_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
      approved_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
      approved_at       TIMESTAMPTZ,
      rejected_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
      rejected_at       TIMESTAMPTZ,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_leave_requests_date_range CHECK (end_date >= start_date),
      CONSTRAINT chk_leave_requests_total_days CHECK (total_days > 0)
    );
    CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_dates ON leave_requests(tenant_id, employee_id, start_date, end_date);
    CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_leave_requests_type ON leave_requests(tenant_id, leave_type_id);

    CREATE TABLE IF NOT EXISTS salary_structures (
      id                TEXT PRIMARY KEY,
      tenant_id         TEXT NOT NULL REFERENCES tenants(id),
      employee_id       TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      basic_salary      NUMERIC(14,2) NOT NULL DEFAULT 0,
      allowances        NUMERIC(14,2) NOT NULL DEFAULT 0,
      deductions        NUMERIC(14,2) NOT NULL DEFAULT 0,
      gross_salary      NUMERIC(14,2) NOT NULL DEFAULT 0,
      effective_from    DATE NOT NULL,
      status            TEXT NOT NULL DEFAULT 'ACTIVE',
      note              TEXT NOT NULL DEFAULT '',
      created_by        TEXT REFERENCES users(id) ON DELETE SET NULL,
      updated_by        TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_id, employee_id)
    );
    ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS basic_salary NUMERIC(14,2) NOT NULL DEFAULT 0;
    ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS allowances NUMERIC(14,2) NOT NULL DEFAULT 0;
    ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS deductions NUMERIC(14,2) NOT NULL DEFAULT 0;
    ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS gross_salary NUMERIC(14,2) NOT NULL DEFAULT 0;
    ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS effective_from DATE NOT NULL DEFAULT CURRENT_DATE;
    ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE';
    ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT '';
    ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    CREATE UNIQUE INDEX IF NOT EXISTS idx_salary_structures_tenant_employee_unique ON salary_structures(tenant_id, employee_id);
    CREATE INDEX IF NOT EXISTS idx_salary_structures_employee ON salary_structures(tenant_id, employee_id, status);

    CREATE TABLE IF NOT EXISTS payroll_runs (
      id                TEXT PRIMARY KEY,
      tenant_id         TEXT NOT NULL REFERENCES tenants(id),
      payroll_month     VARCHAR(7) NOT NULL,
      status            TEXT NOT NULL DEFAULT 'DRAFT',
      total_employees   INTEGER NOT NULL DEFAULT 0,
      gross_total       NUMERIC(14,2) NOT NULL DEFAULT 0,
      allowance_total   NUMERIC(14,2) NOT NULL DEFAULT 0,
      deduction_total   NUMERIC(14,2) NOT NULL DEFAULT 0,
      attendance_deduction_total NUMERIC(14,2) NOT NULL DEFAULT 0,
      net_total         NUMERIC(14,2) NOT NULL DEFAULT 0,
      journal_entry_id  TEXT REFERENCES journal_entries(id),
      payment_journal_entry_id TEXT REFERENCES journal_entries(id),
      payment_status   TEXT NOT NULL DEFAULT 'UNPAID',
      payment_method   TEXT NOT NULL DEFAULT '',
      paid_at          TIMESTAMPTZ,
      paid_by          TEXT REFERENCES users(id) ON DELETE SET NULL,
      generated_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
      approved_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
      approved_at       TIMESTAMPTZ,
      note              TEXT NOT NULL DEFAULT '',
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_id, payroll_month)
    );
    CREATE INDEX IF NOT EXISTS idx_payroll_runs_month ON payroll_runs(tenant_id, payroll_month, status);
    ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS payment_journal_entry_id TEXT REFERENCES journal_entries(id);
    ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'UNPAID';
    ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT '';
    ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
    ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS paid_by TEXT REFERENCES users(id) ON DELETE SET NULL;

    CREATE TABLE IF NOT EXISTS payroll_run_items (
      id                TEXT PRIMARY KEY,
      tenant_id         TEXT NOT NULL REFERENCES tenants(id),
      payroll_run_id    TEXT NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
      employee_id       TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      employee_name     TEXT NOT NULL DEFAULT '',
      employee_number   TEXT NOT NULL DEFAULT '',
      department_name   TEXT NOT NULL DEFAULT '',
      designation_name  TEXT NOT NULL DEFAULT '',
      basic_salary      NUMERIC(14,2) NOT NULL DEFAULT 0,
      allowances        NUMERIC(14,2) NOT NULL DEFAULT 0,
      fixed_deductions  NUMERIC(14,2) NOT NULL DEFAULT 0,
      gross_salary      NUMERIC(14,2) NOT NULL DEFAULT 0,
      present_days      INTEGER NOT NULL DEFAULT 0,
      absent_days       INTEGER NOT NULL DEFAULT 0,
      paid_leave_days   NUMERIC(10,2) NOT NULL DEFAULT 0,
      unpaid_leave_days NUMERIC(10,2) NOT NULL DEFAULT 0,
      payable_days      NUMERIC(10,2) NOT NULL DEFAULT 0,
      attendance_deduction NUMERIC(14,2) NOT NULL DEFAULT 0,
      advance_recovery NUMERIC(14,2) NOT NULL DEFAULT 0,
      loan_recovery NUMERIC(14,2) NOT NULL DEFAULT 0,
      net_pay           NUMERIC(14,2) NOT NULL DEFAULT 0,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_id, payroll_run_id, employee_id)
    );
    CREATE INDEX IF NOT EXISTS idx_payroll_run_items_run ON payroll_run_items(tenant_id, payroll_run_id);
    CREATE INDEX IF NOT EXISTS idx_payroll_run_items_employee ON payroll_run_items(tenant_id, employee_id);
    ALTER TABLE payroll_run_items ADD COLUMN IF NOT EXISTS advance_recovery NUMERIC(14,2) NOT NULL DEFAULT 0;
    ALTER TABLE payroll_run_items ADD COLUMN IF NOT EXISTS loan_recovery NUMERIC(14,2) NOT NULL DEFAULT 0;

    CREATE TABLE IF NOT EXISTS employee_advances (
      id                TEXT PRIMARY KEY,
      tenant_id         TEXT NOT NULL REFERENCES tenants(id),
      employee_id       TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      request_date      DATE NOT NULL DEFAULT CURRENT_DATE,
      amount            NUMERIC(14,2) NOT NULL DEFAULT 0,
      recovered_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
      monthly_recovery  NUMERIC(14,2) NOT NULL DEFAULT 0,
      status            TEXT NOT NULL DEFAULT 'PENDING',
      reason            TEXT NOT NULL DEFAULT '',
      decision_note     TEXT NOT NULL DEFAULT '',
      requested_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
      approved_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
      approved_at       TIMESTAMPTZ,
      rejected_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
      rejected_at       TIMESTAMPTZ,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_employee_advances_amount CHECK (amount >= 0),
      CONSTRAINT chk_employee_advances_recovered CHECK (recovered_amount >= 0)
    );
    CREATE INDEX IF NOT EXISTS idx_employee_advances_employee ON employee_advances(tenant_id, employee_id, status);

    CREATE TABLE IF NOT EXISTS employee_loans (
      id                TEXT PRIMARY KEY,
      tenant_id         TEXT NOT NULL REFERENCES tenants(id),
      employee_id       TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      request_date      DATE NOT NULL DEFAULT CURRENT_DATE,
      principal_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
      installment_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      recovered_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
      status            TEXT NOT NULL DEFAULT 'PENDING',
      reason            TEXT NOT NULL DEFAULT '',
      decision_note     TEXT NOT NULL DEFAULT '',
      requested_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
      approved_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
      approved_at       TIMESTAMPTZ,
      rejected_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
      rejected_at       TIMESTAMPTZ,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_employee_loans_principal CHECK (principal_amount >= 0),
      CONSTRAINT chk_employee_loans_recovered CHECK (recovered_amount >= 0)
    );
    CREATE INDEX IF NOT EXISTS idx_employee_loans_employee ON employee_loans(tenant_id, employee_id, status);
  `);

  // Ã¢â€â‚¬Ã¢â€â‚¬ DSR Monthly Targets Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dsr_targets (
      id          TEXT PRIMARY KEY,
      tenant_id   TEXT NOT NULL REFERENCES tenants(id),
      dsr_id      TEXT NOT NULL,
      month       VARCHAR(7) NOT NULL,
      target_amount NUMERIC NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(tenant_id, dsr_id, month)
    );
    CREATE INDEX IF NOT EXISTS idx_dsr_targets_tenant_month ON dsr_targets(tenant_id, month);
  `);

  // Backfill HR features onto all tenants that already have explicit feature rows
  // (tenants with zero rows are untouched Ã¢â‚¬â€ "no rows" already means "all enabled").
  await runBackfillOnce(pool, "hr-feature-backfill", `
    DO $$
    DECLARE
      new_feature TEXT;
      new_features TEXT[] := ARRAY['employees','departments','designations','salary-payments','leave_management','payroll','employee_advances','employee_loans','attendance','hr-reports'];
    BEGIN
      FOREACH new_feature IN ARRAY new_features LOOP
        INSERT INTO tenant_features (tenant_id, feature)
        SELECT DISTINCT tenant_id, new_feature FROM tenant_features
        ON CONFLICT (tenant_id, feature) DO NOTHING;
      END LOOP;
    END $$;
  `);



  await runBackfillOnce(pool, "attendance-feature-permission-backfill", `
    INSERT INTO tenant_features (tenant_id, feature)
    SELECT DISTINCT tenant_id, 'attendance' FROM tenant_features
    ON CONFLICT (tenant_id, feature) DO NOTHING;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'attendance.view'
    FROM role_permissions
    WHERE role IN ('admin','manager','super_admin') AND permission = 'view_state'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'attendance.manage'
    FROM role_permissions
    WHERE role IN ('admin','super_admin') AND permission = 'view_state'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;
  `);

  await runBackfillOnce(pool, "leave-feature-permission-backfill", `
    INSERT INTO tenant_features (tenant_id, feature)
    SELECT DISTINCT tenant_id, 'leave_management' FROM tenant_features
    ON CONFLICT (tenant_id, feature) DO NOTHING;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'leave.manage'
    FROM role_permissions
    WHERE role IN ('admin','manager','super_admin') AND permission = 'view_state'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'leave.approve'
    FROM role_permissions
    WHERE role IN ('admin','super_admin') AND permission = 'view_state'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;
  `);

  await runBackfillOnce(pool, "payroll-permission-backfill", `
    INSERT INTO tenant_features (tenant_id, feature)
    SELECT DISTINCT tenant_id, 'payroll' FROM tenant_features
    ON CONFLICT (tenant_id, feature) DO NOTHING;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'payroll.view'
    FROM role_permissions
    WHERE role IN ('admin','manager','super_admin') AND permission = 'view_state'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'payroll.generate'
    FROM role_permissions
    WHERE role IN ('admin','super_admin') AND permission = 'view_state'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'payroll.approve'
    FROM role_permissions
    WHERE role IN ('admin','super_admin') AND permission = 'view_state'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;
  `);

  await runBackfillOnce(pool, "employee-finance-permission-backfill", `
    INSERT INTO tenant_features (tenant_id, feature)
    SELECT DISTINCT tenant_id, 'employee_advances' FROM tenant_features
    ON CONFLICT (tenant_id, feature) DO NOTHING;

    INSERT INTO tenant_features (tenant_id, feature)
    SELECT DISTINCT tenant_id, 'employee_loans' FROM tenant_features
    ON CONFLICT (tenant_id, feature) DO NOTHING;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'advance.manage'
    FROM role_permissions
    WHERE role IN ('admin','super_admin') AND permission = 'view_state'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'loan.manage'
    FROM role_permissions
    WHERE role IN ('admin','super_admin') AND permission = 'view_state'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;
  `);
  await runBackfillOnce(pool, "hr-reports-permission-backfill", `
    INSERT INTO tenant_features (tenant_id, feature)
    SELECT DISTINCT tenant_id, 'hr-reports' FROM tenant_features
    ON CONFLICT (tenant_id, feature) DO NOTHING;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'hr.reports'
    FROM role_permissions
    WHERE role IN ('admin','manager','super_admin') AND permission = 'view_state'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;
  `);
  // Split Issue Center from Activity Logs without changing current tenant access:
  // any tenant that had Activity Logs enabled already should get Issue Center too.
  await runBackfillOnce(pool, "issue-center-split", `
    INSERT INTO tenant_features (tenant_id, feature)
    SELECT tenant_id, 'issue-center'
    FROM tenant_features
    WHERE feature = 'activity-logs'
    ON CONFLICT (tenant_id, feature) DO NOTHING;
  `);
  // Backfill HR permissions onto admin/manager roles that already have custom permission rows.
  await runBackfillOnce(pool, "hr-permission-backfill", `
    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'view_employees'
    FROM role_permissions
    WHERE role IN ('admin','manager','super_admin') AND permission = 'view_state'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'manage_employees'
    FROM role_permissions
    WHERE role IN ('admin','super_admin') AND permission = 'view_state'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'manage_departments'
    FROM role_permissions
    WHERE role IN ('admin','super_admin') AND permission = 'view_state'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;


    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'manage_designations'
    FROM role_permissions
    WHERE role IN ('admin','super_admin') AND permission = 'view_state'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'manage_payroll'
    FROM role_permissions
    WHERE role IN ('admin','manager','super_admin') AND permission = 'view_state'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;
  `);

  // Backfill the new read permissions so existing custom role rows keep the
  // same effective access after read/write permissions are split.
  await runBackfillOnce(pool, "read-write-permission-split", `
    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'view_products'
    FROM role_permissions
    WHERE permission IN ('view_state', 'manage_products')
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'view_dsrs'
    FROM role_permissions
    WHERE permission IN ('view_state', 'manage_dsrs')
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'view_customers'
    FROM role_permissions
    WHERE permission IN ('view_state', 'manage_customers')
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'view_srs'
    FROM role_permissions
    WHERE permission = 'manage_srs'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'view_suppliers'
    FROM role_permissions
    WHERE permission = 'manage_suppliers'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'view_purchases'
    FROM role_permissions
    WHERE permission = 'manage_purchases'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'view_supplier_payments'
    FROM role_permissions
    WHERE permission = 'manage_supplier_payments'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'view_retail_customers'
    FROM role_permissions
    WHERE permission IN ('view_state', 'manage_retail_customers_write')
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'view_retail_sales_invoices'
    FROM role_permissions
    WHERE permission = 'manage_retail_sales_invoices'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'view_retail_sales_returns'
    FROM role_permissions
    WHERE permission = 'manage_retail_sales_returns'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'view_retail_customer_due'
    FROM role_permissions
    WHERE permission = 'manage_retail_customer_due'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'view_retail_due_collection'
    FROM role_permissions
    WHERE permission = 'manage_retail_due_collection'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;
  `);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Trade-in conversion tracking Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  await pool.query(`
    ALTER TABLE trade_ins ADD COLUMN IF NOT EXISTS converted_invoice_id TEXT REFERENCES sales_invoices(id);
  `);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Simple Salary Payments Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  await pool.query(`
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS salary_amount NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS pay_type TEXT NOT NULL DEFAULT 'MONTHLY';

    CREATE TABLE IF NOT EXISTS salary_payments (
      id              TEXT PRIMARY KEY,
      tenant_id       TEXT NOT NULL REFERENCES tenants(id),
      employee_id     TEXT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
      employee_name   TEXT NOT NULL DEFAULT '',
      payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
      payment_month   TEXT NOT NULL,
      amount          NUMERIC NOT NULL DEFAULT 0,
      payment_method  TEXT NOT NULL DEFAULT 'CASH',
      note            TEXT NOT NULL DEFAULT '',
      created_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_salary_payments_tenant_month ON salary_payments(tenant_id, payment_month DESC);
    CREATE INDEX IF NOT EXISTS idx_salary_payments_employee ON salary_payments(employee_id);
  `);

  // Ã¢â€â‚¬Ã¢â€â‚¬ NOT NULL enforcement for tables created after the original enforcement block Ã¢â€â‚¬Ã¢â€â‚¬
  // retail_cash_sessions, help_desk_tickets, help_desk_ticket_notes, and
  // retail_loyalty_ledger were added with nullable tenant_id and were not covered
  // by the earlier backfill+enforce block. Backfill any NULL rows, then lock down.
  await pool.query(`
    UPDATE retail_cash_sessions
      SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1)
      WHERE tenant_id IS NULL;

    UPDATE help_desk_tickets
      SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1)
      WHERE tenant_id IS NULL;

    UPDATE help_desk_ticket_notes hdn
      SET tenant_id = hdt.tenant_id
      FROM help_desk_tickets hdt
      WHERE hdt.id = hdn.ticket_id AND hdn.tenant_id IS NULL AND hdt.tenant_id IS NOT NULL;
    UPDATE help_desk_ticket_notes
      SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1)
      WHERE tenant_id IS NULL;

    UPDATE retail_loyalty_ledger rll
      SET tenant_id = rc.tenant_id
      FROM retail_customers rc
      WHERE rc.id = rll.customer_id AND rll.tenant_id IS NULL AND rc.tenant_id IS NOT NULL;
    UPDATE retail_loyalty_ledger
      SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1)
      WHERE tenant_id IS NULL;

    ALTER TABLE retail_cash_sessions  ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE help_desk_tickets      ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE help_desk_ticket_notes ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE retail_loyalty_ledger  ALTER COLUMN tenant_id SET NOT NULL;

    -- Salary active days: tracks worked days per employee per month
    CREATE TABLE IF NOT EXISTS salary_active_days (
      id          TEXT PRIMARY KEY,
      tenant_id   TEXT NOT NULL REFERENCES tenants(id),
      employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      month       TEXT NOT NULL,
      active_days INTEGER NOT NULL DEFAULT 0,
      updated_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_id, employee_id, month)
    );
    CREATE INDEX IF NOT EXISTS idx_salary_active_days_month ON salary_active_days(tenant_id, month);

    -- Product-supplier many-to-many relationship
    CREATE TABLE IF NOT EXISTS product_suppliers (
      product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
      tenant_id   TEXT NOT NULL REFERENCES tenants(id),
      PRIMARY KEY (product_id, supplier_id)
    );
    CREATE INDEX IF NOT EXISTS idx_product_suppliers_product_id ON product_suppliers(product_id);
    CREATE INDEX IF NOT EXISTS idx_product_suppliers_supplier_id ON product_suppliers(supplier_id, tenant_id);
  `);

  await pool.query(`
    ALTER TABLE sales_invoice_items ADD COLUMN IF NOT EXISTS original_sale_price NUMERIC;
  `);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Drug & Pharmacy: product fields Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  await pool.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS generic_name TEXT NOT NULL DEFAULT '';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS drug_type TEXT NOT NULL DEFAULT '';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS dosage_form TEXT NOT NULL DEFAULT '';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS strength TEXT NOT NULL DEFAULT '';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS manufacturer TEXT NOT NULL DEFAULT '';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS reg_number TEXT NOT NULL DEFAULT '';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS controlled_substance BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS pack_size INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS medicine_type TEXT NOT NULL DEFAULT '';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS requires_batch BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS manufacturer_id TEXT REFERENCES manufacturers(id) ON DELETE SET NULL;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS generic_medicine_id TEXT REFERENCES generic_medicines(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_products_generic_name ON products(tenant_id, generic_name) WHERE generic_name <> '';
    CREATE INDEX IF NOT EXISTS idx_products_manufacturer ON products(tenant_id, manufacturer) WHERE manufacturer <> '';
    CREATE INDEX IF NOT EXISTS idx_products_manufacturer_id ON products(manufacturer_id) WHERE manufacturer_id IS NOT NULL;
  `);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Drug & Pharmacy: batch/lot/expiry on purchase receipt items Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  await pool.query(`
    ALTER TABLE purchase_receipt_items ADD COLUMN IF NOT EXISTS batch_number TEXT NOT NULL DEFAULT '';
    ALTER TABLE purchase_receipt_items ADD COLUMN IF NOT EXISTS lot_number TEXT NOT NULL DEFAULT '';
    ALTER TABLE purchase_receipt_items ADD COLUMN IF NOT EXISTS expiry_date DATE;
    ALTER TABLE purchase_receipt_items ADD COLUMN IF NOT EXISTS manufacture_date DATE;
  `);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Drug & Pharmacy: batch snapshot on sold line items Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  await pool.query(`
    ALTER TABLE sales_invoice_items ADD COLUMN IF NOT EXISTS batch_number_snapshot TEXT NOT NULL DEFAULT '';
    ALTER TABLE sales_invoice_items ADD COLUMN IF NOT EXISTS expiry_date_snapshot DATE;
    ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS prescription_number TEXT NOT NULL DEFAULT '';
  `);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Drug & Pharmacy: drug_batches Ã¢â‚¬â€ one row per received batch, tracks remaining qty Ã¢â€â‚¬Ã¢â€â‚¬
  await pool.query(`
    CREATE TABLE IF NOT EXISTS drug_batches (
      id                      TEXT PRIMARY KEY,
      tenant_id               TEXT NOT NULL REFERENCES tenants(id),
      product_id              TEXT NOT NULL REFERENCES products(id),
      purchase_receipt_id     TEXT REFERENCES purchase_receipts(id) ON DELETE SET NULL,
      purchase_receipt_item_id TEXT REFERENCES purchase_receipt_items(id) ON DELETE SET NULL,

      batch_number            TEXT NOT NULL DEFAULT '',
      lot_number              TEXT NOT NULL DEFAULT '',
      expiry_date             DATE,
      manufacture_date        DATE,

      quantity_received       INTEGER NOT NULL DEFAULT 0,
      quantity_remaining      INTEGER NOT NULL DEFAULT 0,

      purchase_price          NUMERIC NOT NULL DEFAULT 0,

      created_by              TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_drug_batches_tenant_product ON drug_batches(tenant_id, product_id);
    CREATE INDEX IF NOT EXISTS idx_drug_batches_expiry ON drug_batches(tenant_id, expiry_date) WHERE expiry_date IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_drug_batches_remaining ON drug_batches(tenant_id, product_id, quantity_remaining) WHERE quantity_remaining > 0;
  `);

  // drug_batch_id FK can only be added after drug_batches table exists
  await pool.query(`
    ALTER TABLE sales_invoice_items ADD COLUMN IF NOT EXISTS drug_batch_id TEXT REFERENCES drug_batches(id) ON DELETE SET NULL;
  `);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Drug & Pharmacy: per-line-item batch allocation log Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  // Tracks which drug_batches were consumed (FEFO) for each sales invoice line,
  // enabling a batch-level sales report and clean quantity restore on void.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales_invoice_item_batches (
      id                      TEXT PRIMARY KEY,
      tenant_id               TEXT NOT NULL REFERENCES tenants(id),
      sales_invoice_id        TEXT NOT NULL REFERENCES sales_invoices(id),
      sales_invoice_item_id   TEXT NOT NULL REFERENCES sales_invoice_items(id),
      drug_batch_id           TEXT NOT NULL REFERENCES drug_batches(id),
      batch_number            TEXT NOT NULL DEFAULT '',
      lot_number              TEXT NOT NULL DEFAULT '',
      expiry_date             DATE,
      quantity_from_batch     INTEGER NOT NULL DEFAULT 0,
      created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_siib_invoice ON sales_invoice_item_batches(tenant_id, sales_invoice_id);
    CREATE INDEX IF NOT EXISTS idx_siib_item ON sales_invoice_item_batches(sales_invoice_item_id);
    CREATE INDEX IF NOT EXISTS idx_siib_batch ON sales_invoice_item_batches(drug_batch_id);
  `);

  // â”€â”€ Transaction integrity: SHA-256 content hash on every money-movement row â”€â”€
  // Computed at creation from the row's immutable business fields (see lib/transactionHash.js).
  // Nullable: rows created before this feature have no hash.
  await pool.query(`
    ALTER TABLE finance_account_transactions ADD COLUMN IF NOT EXISTS transaction_hash TEXT;
    ALTER TABLE customer_payments            ADD COLUMN IF NOT EXISTS transaction_hash TEXT;
    ALTER TABLE supplier_payments            ADD COLUMN IF NOT EXISTS transaction_hash TEXT;
    ALTER TABLE sales_invoices               ADD COLUMN IF NOT EXISTS transaction_hash TEXT;
    ALTER TABLE purchase_receipts            ADD COLUMN IF NOT EXISTS transaction_hash TEXT;
    ALTER TABLE sales_returns                ADD COLUMN IF NOT EXISTS transaction_hash TEXT;
    ALTER TABLE settlements                  ADD COLUMN IF NOT EXISTS transaction_hash TEXT;
    ALTER TABLE expenses                     ADD COLUMN IF NOT EXISTS transaction_hash TEXT;
    ALTER TABLE salary_payments              ADD COLUMN IF NOT EXISTS transaction_hash TEXT;
    ALTER TABLE customer_due_ledger          ADD COLUMN IF NOT EXISTS transaction_hash TEXT;
    ALTER TABLE supplier_due_ledger          ADD COLUMN IF NOT EXISTS transaction_hash TEXT;
    ALTER TABLE dsr_due_ledger               ADD COLUMN IF NOT EXISTS transaction_hash TEXT;
    ALTER TABLE sr_due_ledger                ADD COLUMN IF NOT EXISTS transaction_hash TEXT;
    ALTER TABLE shop_due_ledger              ADD COLUMN IF NOT EXISTS transaction_hash TEXT;
  `);

  // â”€â”€ Purchase returns: free-form return of stock to a supplier â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Not linked to a purchase receipt (FMCG returns of expired/unsold stock span
  // many receipts). Credits the supplier due ledger; balance may go negative,
  // which the UI surfaces as an advance held by the supplier.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS purchase_return_counters (
      tenant_id  TEXT NOT NULL REFERENCES tenants(id),
      year       INTEGER NOT NULL,
      last_value INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (tenant_id, year)
    );

    CREATE TABLE IF NOT EXISTS purchase_returns (
      id               TEXT PRIMARY KEY,
      tenant_id        TEXT NOT NULL REFERENCES tenants(id),
      return_number    TEXT NOT NULL,
      return_date      DATE NOT NULL,
      supplier_id      TEXT NOT NULL REFERENCES suppliers(id),
      total_amount     NUMERIC NOT NULL DEFAULT 0,
      note             TEXT NOT NULL DEFAULT '',
      transaction_hash TEXT,
      created_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at       TIMESTAMPTZ,
      deleted_by_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
      delete_reason    TEXT NOT NULL DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_purchase_returns_tenant_date ON purchase_returns(tenant_id, return_date DESC);
    CREATE INDEX IF NOT EXISTS idx_purchase_returns_tenant_supplier ON purchase_returns(tenant_id, supplier_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_returns_deleted_at ON purchase_returns(tenant_id, deleted_at);

    CREATE TABLE IF NOT EXISTS purchase_return_items (
      id                 TEXT PRIMARY KEY,
      tenant_id          TEXT NOT NULL REFERENCES tenants(id),
      purchase_return_id TEXT NOT NULL REFERENCES purchase_returns(id),
      product_id         TEXT NOT NULL REFERENCES products(id),
      product_name       TEXT NOT NULL DEFAULT '',
      quantity_pieces    INTEGER NOT NULL DEFAULT 0,
      unit_price         NUMERIC NOT NULL DEFAULT 0,
      line_total         NUMERIC NOT NULL DEFAULT 0,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_purchase_return_items_return ON purchase_return_items(tenant_id, purchase_return_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_return_items_product ON purchase_return_items(product_id);
  `);

  // â”€â”€ General Ledger: fixed chart of accounts (global â€” identical for every
  // tenant, no per-tenant customization yet) plus a tenant-scoped double-entry
  // journal. Existing modules (sales, purchases, payments, expenses, finance
  // accounts) keep their own tables as the source of truth for their own
  // pages; the journal is an additive layer fed by JournalService so General
  // Ledger / Trial Balance reports can exist without changing anything else. â”€â”€
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chart_of_accounts (
      code            TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      type            TEXT NOT NULL,
      normal_balance  TEXT NOT NULL,
      is_active       BOOLEAN NOT NULL DEFAULT true
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id                    TEXT PRIMARY KEY,
      tenant_id             TEXT NOT NULL REFERENCES tenants(id),
      entry_date            DATE NOT NULL,
      source_type           TEXT NOT NULL,
      source_id             TEXT NOT NULL,
      memo                  TEXT NOT NULL DEFAULT '',
      created_by            TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reversed_at           TIMESTAMPTZ,
      reversal_of_entry_id  TEXT REFERENCES journal_entries(id)
    );

    -- One live (non-reversal) entry per business event â€” the app-level
    -- correctness guard against double-posting is backed by this constraint.
    CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_source
      ON journal_entries(tenant_id, source_type, source_id)
      WHERE reversal_of_entry_id IS NULL;
    CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_date
      ON journal_entries(tenant_id, entry_date DESC);

    CREATE TABLE IF NOT EXISTS journal_lines (
      id                TEXT PRIMARY KEY,
      tenant_id         TEXT NOT NULL REFERENCES tenants(id),
      journal_entry_id  TEXT NOT NULL REFERENCES journal_entries(id),
      account_code      TEXT NOT NULL REFERENCES chart_of_accounts(code),
      debit             NUMERIC NOT NULL DEFAULT 0,
      credit            NUMERIC NOT NULL DEFAULT 0,
      CHECK (debit >= 0 AND credit >= 0 AND (debit = 0 OR credit = 0))
    );

    CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(journal_entry_id);
    CREATE INDEX IF NOT EXISTS idx_journal_lines_tenant_account
      ON journal_lines(tenant_id, account_code, id);

    INSERT INTO chart_of_accounts (code, name, type, normal_balance) VALUES
      ('1000', 'Cash in Hand',           'ASSET',     'DEBIT'),
      ('1010', 'Bank',                   'ASSET',     'DEBIT'),
      ('1100', 'Accounts Receivable',    'ASSET',     'DEBIT'),
      ('1110', 'DSR Receivable',         'ASSET',     'DEBIT'),
      ('1120', 'SR Receivable',          'ASSET',     'DEBIT'),
      ('1130', 'Goods with DSR',         'ASSET',     'DEBIT'),
      ('1200', 'Inventory',              'ASSET',     'DEBIT'),
      ('2000', 'Accounts Payable',       'LIABILITY', 'CREDIT'),
      ('2100', 'Tax Payable',            'LIABILITY', 'CREDIT'),
      ('2200', 'Employee Payable',       'LIABILITY', 'CREDIT'),
      ('3000', 'Owner''s Equity',        'EQUITY',    'CREDIT'),
      ('4000', 'Sales Revenue',          'REVENUE',   'CREDIT'),
      ('4010', 'Sales Returns',          'REVENUE',   'DEBIT'),
      ('4020', 'Discounts Given',        'REVENUE',   'DEBIT'),
      ('5000', 'Cost of Goods Sold',     'EXPENSE',   'DEBIT'),
      ('5010', 'Purchase Returns',       'EXPENSE',   'CREDIT'),
      ('6000', 'Operating Expenses',     'EXPENSE',   'DEBIT'),
      ('6010', 'Salary Expense',         'EXPENSE',   'DEBIT'),
      ('7000', 'Stock Adjustment',       'EXPENSE',   'DEBIT')
    ON CONFLICT (code) DO NOTHING;

    -- Purchase returns turned out to have no P&L effect under this app's
    -- perpetual-inventory model (COGS is only ever recognized at the point of
    -- sale, never derived from a periodic Purchases-less-Returns formula) â€”
    -- a purchase return is booked straight against Inventory instead (see
    -- JournalService.postPurchaseReturn). This account is retired rather than
    -- deleted, so historical rows (if any were ever posted) stay queryable.
    INSERT INTO chart_of_accounts (code, name, type, normal_balance) VALUES ('2200', 'Employee Payable', 'LIABILITY', 'CREDIT') ON CONFLICT (code) DO NOTHING;

    UPDATE chart_of_accounts SET is_active = false WHERE code = '5010';
  `);

  await pool.query(`
    ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS parent_code TEXT REFERENCES chart_of_accounts(code);
    ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS account_group TEXT NOT NULL DEFAULT '';
    ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS is_cash_account BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS is_bank_account BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS is_receivable_account BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS is_payable_account BOOLEAN NOT NULL DEFAULT false;

    CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_parent ON chart_of_accounts(parent_code);

    UPDATE chart_of_accounts SET account_group = 'Current Assets', is_system = true, is_cash_account = true WHERE code = '1000';
    UPDATE chart_of_accounts SET account_group = 'Current Assets', is_system = true, is_bank_account = true WHERE code = '1010';
    UPDATE chart_of_accounts SET account_group = 'Current Assets', is_system = true, is_receivable_account = true WHERE code IN ('1100', '1110', '1120');
    UPDATE chart_of_accounts SET account_group = 'Current Assets', is_system = true WHERE code IN ('1130', '1200');
    UPDATE chart_of_accounts SET account_group = 'Current Liabilities', is_system = true, is_payable_account = true WHERE code IN ('2000', '2100', '2200');
    UPDATE chart_of_accounts SET account_group = 'Equity', is_system = true WHERE code = '3000';
    UPDATE chart_of_accounts SET account_group = 'Operating Income', is_system = true WHERE code IN ('4000', '4010', '4020');
    UPDATE chart_of_accounts SET account_group = 'Cost of Sales', is_system = true WHERE code IN ('5000', '5010');
    UPDATE chart_of_accounts SET account_group = 'Operating Expenses', is_system = true WHERE code IN ('6000', '6010', '7000');
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS fiscal_years (
      id           TEXT PRIMARY KEY,
      tenant_id    TEXT NOT NULL REFERENCES tenants(id),
      name         TEXT NOT NULL,
      start_date   DATE NOT NULL,
      end_date     DATE NOT NULL,
      status       TEXT NOT NULL DEFAULT 'OPEN',
      is_active    BOOLEAN NOT NULL DEFAULT false,
      closed_at    TIMESTAMPTZ,
      closed_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (start_date <= end_date)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_fiscal_years_active ON fiscal_years(tenant_id) WHERE is_active = true;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_fiscal_years_name ON fiscal_years(tenant_id, name);

    CREATE TABLE IF NOT EXISTS accounting_periods (
      id              TEXT PRIMARY KEY,
      tenant_id       TEXT NOT NULL REFERENCES tenants(id),
      fiscal_year_id  TEXT NOT NULL REFERENCES fiscal_years(id) ON DELETE CASCADE,
      name            TEXT NOT NULL,
      start_date      DATE NOT NULL,
      end_date        DATE NOT NULL,
      status          TEXT NOT NULL DEFAULT 'OPEN',
      locked          BOOLEAN NOT NULL DEFAULT false,
      closed_at       TIMESTAMPTZ,
      closed_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (start_date <= end_date)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_accounting_periods_name ON accounting_periods(fiscal_year_id, name);
    CREATE INDEX IF NOT EXISTS idx_accounting_periods_range ON accounting_periods(tenant_id, start_date, end_date);

    CREATE TABLE IF NOT EXISTS accounting_settings (
      tenant_id                TEXT PRIMARY KEY REFERENCES tenants(id),
      default_currency         TEXT NOT NULL DEFAULT 'BDT',
      decimal_precision        INTEGER NOT NULL DEFAULT 2,
      voucher_prefix           TEXT NOT NULL DEFAULT 'JV',
      journal_voucher_prefix   TEXT NOT NULL DEFAULT 'JV',
      receipt_voucher_prefix   TEXT NOT NULL DEFAULT 'RV',
      payment_voucher_prefix   TEXT NOT NULL DEFAULT 'PV',
      contra_voucher_prefix    TEXT NOT NULL DEFAULT 'CV',
      financial_year_start     TEXT NOT NULL DEFAULT '01-01',
      negative_cash_policy     TEXT NOT NULL DEFAULT 'WARN',
      auto_posting_enabled     BOOLEAN NOT NULL DEFAULT true,
      created_by               TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by               TEXT REFERENCES users(id) ON DELETE SET NULL,
      updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS opening_balances (
      id                    TEXT PRIMARY KEY,
      tenant_id             TEXT NOT NULL REFERENCES tenants(id),
      reference_key         TEXT NOT NULL,
      reference_type        TEXT NOT NULL,
      reference_id          TEXT,
      account_code          TEXT NOT NULL REFERENCES chart_of_accounts(code),
      offset_account_code   TEXT NOT NULL REFERENCES chart_of_accounts(code),
      balance_date          DATE NOT NULL,
      amount                NUMERIC NOT NULL DEFAULT 0,
      balance_side          TEXT NOT NULL,
      note                  TEXT NOT NULL DEFAULT '',
      journal_entry_id      TEXT NOT NULL REFERENCES journal_entries(id),
      created_by            TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by            TEXT REFERENCES users(id) ON DELETE SET NULL,
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_id, reference_key),
      UNIQUE (journal_entry_id),
      CHECK (amount >= 0)
    );

    CREATE INDEX IF NOT EXISTS idx_opening_balances_tenant_date ON opening_balances(tenant_id, balance_date DESC, created_at DESC);
  `);

  await pool.query(`
    INSERT INTO chart_of_accounts (code, name, type, normal_balance) VALUES
      ('3010', 'Retained Earnings', 'EQUITY', 'CREDIT'),
      ('3990', 'Profit & Loss Summary', 'EQUITY', 'CREDIT')
    ON CONFLICT (code) DO NOTHING;

    UPDATE chart_of_accounts SET account_group = 'Equity', is_system = true WHERE code IN ('3000', '3010', '3990');

    ALTER TABLE fiscal_years ADD COLUMN IF NOT EXISTS closing_journal_entry_id TEXT REFERENCES journal_entries(id) ON DELETE SET NULL;
    ALTER TABLE fiscal_years ADD COLUMN IF NOT EXISTS closed_checklist JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE fiscal_years ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMPTZ;
    ALTER TABLE fiscal_years ADD COLUMN IF NOT EXISTS reopened_by TEXT REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE fiscal_years ADD COLUMN IF NOT EXISTS opening_generated_at TIMESTAMPTZ;
    ALTER TABLE fiscal_years ADD COLUMN IF NOT EXISTS opening_source_fiscal_year_id TEXT REFERENCES fiscal_years(id) ON DELETE SET NULL;

    ALTER TABLE opening_balances ADD COLUMN IF NOT EXISTS fiscal_year_id TEXT REFERENCES fiscal_years(id) ON DELETE SET NULL;
    ALTER TABLE opening_balances ADD COLUMN IF NOT EXISTS generated_from_fiscal_year_id TEXT REFERENCES fiscal_years(id) ON DELETE SET NULL;
    ALTER TABLE opening_balances ADD COLUMN IF NOT EXISTS is_system_generated BOOLEAN NOT NULL DEFAULT false;

    ALTER TABLE opening_balances DROP CONSTRAINT IF EXISTS opening_balances_tenant_id_reference_key_key;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_opening_balances_reference_scope
      ON opening_balances(tenant_id, COALESCE(fiscal_year_id, ''), reference_key);
    CREATE INDEX IF NOT EXISTS idx_opening_balances_fiscal_year ON opening_balances(tenant_id, fiscal_year_id, balance_date DESC);
  `);

  await pool.query(`
    ALTER TABLE purchase_receipts ADD COLUMN IF NOT EXISTS invoice_photo_url TEXT NOT NULL DEFAULT '';
  `);

  await pool.query(`
    ALTER TABLE accounting_settings ADD COLUMN IF NOT EXISTS journal_voucher_prefix TEXT NOT NULL DEFAULT 'JV';
    ALTER TABLE accounting_settings ADD COLUMN IF NOT EXISTS receipt_voucher_prefix TEXT NOT NULL DEFAULT 'RV';
    ALTER TABLE accounting_settings ADD COLUMN IF NOT EXISTS payment_voucher_prefix TEXT NOT NULL DEFAULT 'PV';
    ALTER TABLE accounting_settings ADD COLUMN IF NOT EXISTS contra_voucher_prefix  TEXT NOT NULL DEFAULT 'CV';

    CREATE TABLE IF NOT EXISTS voucher_counters (
      tenant_id     TEXT NOT NULL REFERENCES tenants(id),
      voucher_type  TEXT NOT NULL,
      last_value    INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (tenant_id, voucher_type)
    );

    CREATE TABLE IF NOT EXISTS vouchers (
      id                     TEXT PRIMARY KEY,
      tenant_id              TEXT NOT NULL REFERENCES tenants(id),
      voucher_number         TEXT NOT NULL,
      voucher_type           TEXT NOT NULL,
      status                 TEXT NOT NULL DEFAULT 'DRAFT',
      voucher_date           DATE NOT NULL,
      fiscal_year_id         TEXT REFERENCES fiscal_years(id) ON DELETE SET NULL,
      accounting_period_id   TEXT REFERENCES accounting_periods(id) ON DELETE SET NULL,
      reference_number       TEXT NOT NULL DEFAULT '',
      narration              TEXT NOT NULL DEFAULT '',
      notes                  TEXT NOT NULL DEFAULT '',
      counterparty_name      TEXT NOT NULL DEFAULT '',
      cash_bank_account_code TEXT REFERENCES chart_of_accounts(code),
      from_account_code      TEXT REFERENCES chart_of_accounts(code),
      to_account_code        TEXT REFERENCES chart_of_accounts(code),
      journal_entry_id       TEXT REFERENCES journal_entries(id),
      reversal_journal_entry_id TEXT REFERENCES journal_entries(id),
      reversal_of_voucher_id TEXT REFERENCES vouchers(id),
      created_by             TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      submitted_by           TEXT REFERENCES users(id) ON DELETE SET NULL,
      submitted_at           TIMESTAMPTZ,
      approved_by            TEXT REFERENCES users(id) ON DELETE SET NULL,
      approved_at            TIMESTAMPTZ,
      posted_by              TEXT REFERENCES users(id) ON DELETE SET NULL,
      posted_at              TIMESTAMPTZ,
      locked_at              TIMESTAMPTZ,
      reversed_by            TEXT REFERENCES users(id) ON DELETE SET NULL,
      reversed_at            TIMESTAMPTZ,
      deleted_at             TIMESTAMPTZ,
      deleted_by_id          TEXT REFERENCES users(id) ON DELETE SET NULL,
      delete_reason          TEXT NOT NULL DEFAULT ''
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_vouchers_number ON vouchers(tenant_id, voucher_number) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_vouchers_type_status ON vouchers(tenant_id, voucher_type, status, voucher_date DESC);
    CREATE INDEX IF NOT EXISTS idx_vouchers_period ON vouchers(tenant_id, fiscal_year_id, accounting_period_id);

    CREATE TABLE IF NOT EXISTS voucher_lines (
      id              TEXT PRIMARY KEY,
      tenant_id       TEXT NOT NULL REFERENCES tenants(id),
      voucher_id      TEXT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
      line_no         INTEGER NOT NULL,
      account_code    TEXT NOT NULL REFERENCES chart_of_accounts(code),
      side            TEXT NOT NULL,
      amount          NUMERIC NOT NULL DEFAULT 0,
      note            TEXT NOT NULL DEFAULT '',
      reference_type  TEXT NOT NULL DEFAULT '',
      reference_id    TEXT,
      reference_name  TEXT NOT NULL DEFAULT '',
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (amount >= 0)
    );

    CREATE INDEX IF NOT EXISTS idx_voucher_lines_voucher ON voucher_lines(voucher_id, line_no);
    CREATE INDEX IF NOT EXISTS idx_voucher_lines_account ON voucher_lines(tenant_id, account_code);
    CREATE INDEX IF NOT EXISTS idx_voucher_lines_reference ON voucher_lines(tenant_id, reference_type, reference_id);

    CREATE TABLE IF NOT EXISTS voucher_attachments (
      id                TEXT PRIMARY KEY,
      tenant_id         TEXT NOT NULL REFERENCES tenants(id),
      voucher_id        TEXT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
      title             TEXT NOT NULL DEFAULT '',
      original_filename TEXT NOT NULL,
      stored_filename   TEXT NOT NULL,
      storage_path      TEXT NOT NULL,
      mime_type         TEXT NOT NULL DEFAULT '',
      file_size         INTEGER NOT NULL DEFAULT 0,
      uploaded_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at        TIMESTAMPTZ,
      deleted_by_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
      delete_reason     TEXT NOT NULL DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_voucher_attachments_voucher ON voucher_attachments(voucher_id, created_at DESC);
  `);

  // â”€â”€ Trade Promotion Engine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Generic, rule-driven supplier purchase-incentive engine. A rule is evaluated
  // automatically whenever a purchase receipt is created/edited; every qualifying
  // rule earns its own row (rules stack â€” no single "best match" winner). Earnings
  // are settled later, in full or in part, via cash, free stock, or a credit note
  // against the supplier's payable balance.
  await pool.query(`
    INSERT INTO chart_of_accounts (code, name, type, normal_balance) VALUES
      ('1140', 'Purchase Incentive Receivable', 'ASSET',   'DEBIT'),
      ('4030', 'Purchase Incentive Income',      'REVENUE', 'CREDIT')
    ON CONFLICT (code) DO NOTHING;

    UPDATE chart_of_accounts SET account_group = 'Current Assets', is_system = true, is_receivable_account = true WHERE code = '1140';
    UPDATE chart_of_accounts SET account_group = 'Other Income', is_system = true WHERE code = '4030';

    CREATE TABLE IF NOT EXISTS trade_promotion_rules (
      id                 TEXT PRIMARY KEY,
      tenant_id          TEXT NOT NULL REFERENCES tenants(id),
      name               TEXT NOT NULL,
      remarks            TEXT NOT NULL DEFAULT '',

      supplier_scope     TEXT NOT NULL DEFAULT 'SPECIFIC',
      supplier_id        TEXT REFERENCES suppliers(id) ON DELETE SET NULL,

      target_type        TEXT NOT NULL DEFAULT 'PRODUCT',
      target_id          TEXT,

      buy_unit           TEXT NOT NULL DEFAULT 'PIECE',
      buy_quantity       NUMERIC NOT NULL DEFAULT 0,

      reward_type        TEXT NOT NULL DEFAULT 'FREE_QUANTITY',
      reward_unit        TEXT,
      reward_quantity    NUMERIC NOT NULL DEFAULT 0,
      reward_amount      NUMERIC NOT NULL DEFAULT 0,
      reward_percentage  NUMERIC NOT NULL DEFAULT 0,

      settlement_method  TEXT NOT NULL DEFAULT 'MULTIPLE',
      effective_from     DATE,
      effective_to       DATE,
      active             BOOLEAN NOT NULL DEFAULT TRUE,
      priority           INTEGER NOT NULL DEFAULT 100,

      created_by         TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at         TIMESTAMPTZ,
      deleted_by_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
      delete_reason      TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_trade_promotion_rules_tenant_id ON trade_promotion_rules(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_trade_promotion_rules_active ON trade_promotion_rules(tenant_id, active) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_trade_promotion_rules_supplier ON trade_promotion_rules(tenant_id, supplier_id);
    CREATE INDEX IF NOT EXISTS idx_trade_promotion_rules_target ON trade_promotion_rules(tenant_id, target_type, target_id);

    CREATE TABLE IF NOT EXISTS trade_promotion_earnings (
      id                        TEXT PRIMARY KEY,
      tenant_id                 TEXT NOT NULL REFERENCES tenants(id),
      rule_id                   TEXT NOT NULL REFERENCES trade_promotion_rules(id) ON DELETE RESTRICT,
      purchase_receipt_id       TEXT NOT NULL REFERENCES purchase_receipts(id) ON DELETE RESTRICT,
      supplier_id               TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
      product_id                TEXT REFERENCES products(id) ON DELETE SET NULL,

      matched_item_ids          JSONB NOT NULL DEFAULT '[]',
      purchased_quantity_pieces NUMERIC NOT NULL DEFAULT 0,
      qualifying_value          NUMERIC NOT NULL DEFAULT 0,

      reward_kind               TEXT NOT NULL,
      earned_quantity_pieces    NUMERIC NOT NULL DEFAULT 0,
      earned_amount             NUMERIC NOT NULL DEFAULT 0,
      settlement_method         TEXT NOT NULL,

      status                    TEXT NOT NULL DEFAULT 'PENDING',
      settled_quantity_pieces   NUMERIC NOT NULL DEFAULT 0,
      settled_amount            NUMERIC NOT NULL DEFAULT 0,

      earned_date               DATE NOT NULL,
      created_by                TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_id, rule_id, purchase_receipt_id)
    );
    CREATE INDEX IF NOT EXISTS idx_trade_promotion_earnings_tenant_status ON trade_promotion_earnings(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_trade_promotion_earnings_purchase ON trade_promotion_earnings(tenant_id, purchase_receipt_id);
    CREATE INDEX IF NOT EXISTS idx_trade_promotion_earnings_supplier ON trade_promotion_earnings(tenant_id, supplier_id);
    CREATE INDEX IF NOT EXISTS idx_trade_promotion_earnings_product ON trade_promotion_earnings(tenant_id, product_id);
    CREATE INDEX IF NOT EXISTS idx_trade_promotion_earnings_date ON trade_promotion_earnings(tenant_id, earned_date DESC);

    CREATE TABLE IF NOT EXISTS trade_promotion_settlements (
      id                    TEXT PRIMARY KEY,
      tenant_id             TEXT NOT NULL REFERENCES tenants(id),
      earning_id            TEXT NOT NULL REFERENCES trade_promotion_earnings(id) ON DELETE RESTRICT,
      method                TEXT NOT NULL,
      settlement_date       DATE NOT NULL,
      quantity_pieces       NUMERIC NOT NULL DEFAULT 0,
      amount                NUMERIC NOT NULL DEFAULT 0,
      finance_account_type  TEXT,
      note                  TEXT NOT NULL DEFAULT '',
      created_by            TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at            TIMESTAMPTZ,
      deleted_by_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
      delete_reason         TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_trade_promotion_settlements_tenant_id ON trade_promotion_settlements(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_trade_promotion_settlements_earning ON trade_promotion_settlements(tenant_id, earning_id);
    CREATE INDEX IF NOT EXISTS idx_trade_promotion_settlements_date ON trade_promotion_settlements(tenant_id, settlement_date DESC);
  `);

  // ── Retail Installments (Phase 1: core loop only — no accounting/late-fee/ ──
  // guarantor/document tables yet; see RETAIL-INSTALLMENT-MODULE-BUILD-SPEC.txt.
  // An installment plan wraps a normal sales_invoices row (created via
  // salesInvoiceService.createSalesInvoiceRecord) — the invoice covers stock
  // deduction and the down payment; the schedule below is the source of truth
  // for the financed amount plus markup, collected over time.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS installment_number_counters (
      tenant_id  TEXT NOT NULL REFERENCES tenants(id),
      year       INTEGER NOT NULL,
      last_value INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (tenant_id, year)
    );

    CREATE TABLE IF NOT EXISTS installment_plans (
      id                          TEXT PRIMARY KEY,
      tenant_id                   TEXT NOT NULL REFERENCES tenants(id),
      plan_number                 TEXT NOT NULL,
      customer_id                 TEXT NOT NULL REFERENCES retail_customers(id),
      sales_invoice_id            TEXT NOT NULL REFERENCES sales_invoices(id),
      sale_date                   DATE NOT NULL,
      product_total               NUMERIC NOT NULL DEFAULT 0,
      discount_amount             NUMERIC NOT NULL DEFAULT 0,
      net_sale_amount             NUMERIC NOT NULL DEFAULT 0,
      down_payment                NUMERIC NOT NULL DEFAULT 0,
      finance_amount              NUMERIC NOT NULL DEFAULT 0,
      markup_type                 TEXT NOT NULL,
      markup_value                NUMERIC NOT NULL DEFAULT 0,
      markup_amount               NUMERIC NOT NULL DEFAULT 0,
      final_payable_amount        NUMERIC NOT NULL DEFAULT 0,
      number_of_months            INTEGER NOT NULL,
      first_payment_date          DATE NOT NULL,
      payment_day_of_month        INTEGER NOT NULL,
      monthly_installment_amount  NUMERIC NOT NULL DEFAULT 0,
      total_paid                  NUMERIC NOT NULL DEFAULT 0,
      outstanding_amount          NUMERIC NOT NULL DEFAULT 0,
      overdue_amount              NUMERIC NOT NULL DEFAULT 0,
      status                      TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'COMPLETED', 'OVERDUE', 'CANCELLED', 'DEFAULTED', 'WRITTEN_OFF')),
      note                        TEXT NOT NULL DEFAULT '',
      created_by                  TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      cancelled_at                TIMESTAMPTZ,
      cancelled_by                TEXT REFERENCES users(id) ON DELETE SET NULL,
      cancel_reason               TEXT,
      deleted_at                  TIMESTAMPTZ,
      deleted_by_id               TEXT REFERENCES users(id) ON DELETE SET NULL,
      delete_reason               TEXT NOT NULL DEFAULT '',
      UNIQUE (tenant_id, plan_number)
    );
    CREATE INDEX IF NOT EXISTS idx_installment_plans_tenant_customer ON installment_plans(tenant_id, customer_id);
    CREATE INDEX IF NOT EXISTS idx_installment_plans_tenant_status ON installment_plans(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_installment_plans_tenant_deleted ON installment_plans(tenant_id, deleted_at);

    CREATE TABLE IF NOT EXISTS installment_schedule (
      id               TEXT PRIMARY KEY,
      tenant_id        TEXT NOT NULL REFERENCES tenants(id),
      plan_id          TEXT NOT NULL REFERENCES installment_plans(id) ON DELETE CASCADE,
      installment_no   INTEGER NOT NULL,
      due_date         DATE NOT NULL,
      due_amount       NUMERIC NOT NULL DEFAULT 0,
      paid_amount      NUMERIC NOT NULL DEFAULT 0,
      remaining_amount NUMERIC NOT NULL DEFAULT 0,
      paid_date        DATE,
      status           TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED', 'RESTRUCTURED')),
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_id, plan_id, installment_no)
    );
    CREATE INDEX IF NOT EXISTS idx_installment_schedule_plan ON installment_schedule(tenant_id, plan_id, installment_no);
    CREATE INDEX IF NOT EXISTS idx_installment_schedule_due ON installment_schedule(tenant_id, due_date, status);

    CREATE TABLE IF NOT EXISTS installment_payments (
      id             TEXT PRIMARY KEY,
      tenant_id      TEXT NOT NULL REFERENCES tenants(id),
      plan_id        TEXT NOT NULL REFERENCES installment_plans(id),
      customer_id    TEXT NOT NULL REFERENCES retail_customers(id),
      payment_date   DATE NOT NULL,
      amount         NUMERIC NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'CASH',
      note           TEXT NOT NULL DEFAULT '',
      created_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at     TIMESTAMPTZ,
      deleted_by_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
      delete_reason  TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_installment_payments_plan ON installment_payments(tenant_id, plan_id);
    CREATE INDEX IF NOT EXISTS idx_installment_payments_date ON installment_payments(tenant_id, payment_date);

    CREATE TABLE IF NOT EXISTS installment_payment_allocations (
      id                TEXT PRIMARY KEY,
      tenant_id         TEXT NOT NULL REFERENCES tenants(id),
      payment_id        TEXT NOT NULL REFERENCES installment_payments(id) ON DELETE CASCADE,
      schedule_id       TEXT NOT NULL REFERENCES installment_schedule(id),
      allocated_amount  NUMERIC NOT NULL,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_installment_allocations_payment ON installment_payment_allocations(tenant_id, payment_id);
    CREATE INDEX IF NOT EXISTS idx_installment_allocations_schedule ON installment_payment_allocations(tenant_id, schedule_id);
  `);

  // ── Retail Installments — Phase 2: accounting integration ──────────────
  // The underlying sales invoice (created via salesInvoiceService.createSalesInvoiceRecord)
  // already posted its financed amount into the generic Accounts Receivable
  // (1100) account. At plan-creation time we reclassify that amount onto a
  // dedicated Installment Receivable account and bring the markup onto the
  // books too — as deferred (unearned) income by default, recognized
  // proportionally on each payment (see JournalService.postInstallmentPlan /
  // postInstallmentPayment). markup_recognition_mode is a per-plan override
  // (not a global tenant setting yet) so the choice is explicit and testable
  // without a wider settings subsystem.
  await pool.query(`
    INSERT INTO chart_of_accounts (code, name, type, normal_balance) VALUES
      ('1150', 'Installment Receivable',   'ASSET',     'DEBIT'),
      ('2150', 'Unearned Markup Income',   'LIABILITY', 'CREDIT'),
      ('4040', 'Markup Income',            'REVENUE',   'CREDIT')
    ON CONFLICT (code) DO NOTHING;

    UPDATE chart_of_accounts SET account_group = 'Current Assets', is_system = true, is_receivable_account = true WHERE code = '1150';
    UPDATE chart_of_accounts SET account_group = 'Current Liabilities', is_system = true WHERE code = '2150';
    UPDATE chart_of_accounts SET account_group = 'Other Income', is_system = true WHERE code = '4040';

    ALTER TABLE installment_plans
      ADD COLUMN IF NOT EXISTS markup_recognition_mode TEXT NOT NULL DEFAULT 'GRADUAL'
        CHECK (markup_recognition_mode IN ('GRADUAL', 'IMMEDIATE'));
  `);

  // ── Retail Installments — Phase 4: reschedule, early settlement, write-off, ──
  // cancel. Reschedule never deletes a row: superseded PENDING/PARTIAL rows
  // become RESTRUCTURED and installment_reschedule_log keeps a full before/after
  // snapshot. Write-off reuses the schedule's existing WAIVED status (already in
  // the Phase 1 CHECK constraint) rather than adding a new one.
  await pool.query(`
    INSERT INTO chart_of_accounts (code, name, type, normal_balance) VALUES
      ('6020', 'Bad Debt Expense', 'EXPENSE', 'DEBIT')
    ON CONFLICT (code) DO NOTHING;
    UPDATE chart_of_accounts SET account_group = 'Operating Expenses', is_system = true WHERE code = '6020';

    CREATE TABLE IF NOT EXISTS installment_reschedule_log (
      id             TEXT PRIMARY KEY,
      tenant_id      TEXT NOT NULL REFERENCES tenants(id),
      plan_id        TEXT NOT NULL REFERENCES installment_plans(id),
      reason         TEXT NOT NULL,
      old_schedule   JSONB NOT NULL DEFAULT '[]',
      new_schedule   JSONB NOT NULL DEFAULT '[]',
      created_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_installment_reschedule_log_plan ON installment_reschedule_log(tenant_id, plan_id);

    ALTER TABLE installment_plans ADD COLUMN IF NOT EXISTS written_off_at TIMESTAMPTZ;
    ALTER TABLE installment_plans ADD COLUMN IF NOT EXISTS written_off_by TEXT REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE installment_plans ADD COLUMN IF NOT EXISTS write_off_reason TEXT;
  `);

  // ── Retail Installments — Phase 5: credit checking, guarantors, documents ──
  // credit_limit = 0 means "no limit configured" (unlimited) rather than "zero
  // credit allowed" — otherwise every existing customer would instantly exceed
  // an unset limit the moment this column appears. is_credit_blocked is a
  // separate, explicit flag for "never extend this customer credit at all,"
  // independent of any numeric limit.
  await pool.query(`
    ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS is_credit_blocked BOOLEAN NOT NULL DEFAULT false;

    CREATE TABLE IF NOT EXISTS installment_guarantors (
      id               TEXT PRIMARY KEY,
      tenant_id        TEXT NOT NULL REFERENCES tenants(id),
      plan_id          TEXT NOT NULL REFERENCES installment_plans(id),
      name             TEXT NOT NULL,
      phone            TEXT NOT NULL DEFAULT '',
      address          TEXT NOT NULL DEFAULT '',
      national_id      TEXT NOT NULL DEFAULT '',
      relationship     TEXT NOT NULL DEFAULT '',
      occupation       TEXT NOT NULL DEFAULT '',
      employer         TEXT NOT NULL DEFAULT '',
      monthly_income   NUMERIC NOT NULL DEFAULT 0,
      reference_notes  TEXT NOT NULL DEFAULT '',
      emergency_contact TEXT NOT NULL DEFAULT '',
      created_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at       TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_installment_guarantors_plan ON installment_guarantors(tenant_id, plan_id);

    -- Generic document metadata, reused across entity types (installment plan,
    -- guarantor, customer, ...) rather than one table per type. The uploaded
    -- file itself still goes through the existing POST /api/upload/photo
    -- endpoint (local disk on Render) — see the build spec's note that this
    -- doesn't survive the Vercel serverless target; a cloud-storage backend
    -- swap is a separate decision, deferred here, not solved by this table.
    CREATE TABLE IF NOT EXISTS documents (
      id             TEXT PRIMARY KEY,
      tenant_id      TEXT NOT NULL REFERENCES tenants(id),
      entity_type    TEXT NOT NULL,
      entity_id      TEXT NOT NULL,
      document_type  TEXT NOT NULL,
      url            TEXT NOT NULL,
      uploaded_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at     TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(tenant_id, entity_type, entity_id);
  `);

  // ── Retail Installments — Phase 6: late fees, dashboard, agreements, ──────
  // notifications. Late fee rules are tenant-level config (same shape as
  // trade_promotion_rules) — the fee itself is only ever computed on demand
  // (surfaced in the Overdue Report) and applied to a specific installment
  // explicitly via its own endpoint, never automatically: this app has no
  // cron/job runner, so "automatic calculation" here means "computed live at
  // read time," not "silently charged by a background process."
  await pool.query(`
    CREATE TABLE IF NOT EXISTS installment_late_fee_rules (
      id                  TEXT PRIMARY KEY,
      tenant_id           TEXT NOT NULL REFERENCES tenants(id),
      fee_type            TEXT NOT NULL CHECK (fee_type IN ('FIXED', 'PERCENT', 'DAILY', 'WEEKLY', 'MONTHLY')),
      fee_value           NUMERIC NOT NULL DEFAULT 0,
      grace_period_days   INTEGER NOT NULL DEFAULT 0,
      max_penalty_amount  NUMERIC NOT NULL DEFAULT 0,
      active              BOOLEAN NOT NULL DEFAULT true,
      created_by          TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at          TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_installment_late_fee_rules_tenant ON installment_late_fee_rules(tenant_id, active) WHERE deleted_at IS NULL;

    ALTER TABLE installment_schedule ADD COLUMN IF NOT EXISTS late_fee_applied NUMERIC NOT NULL DEFAULT 0;
  `);

  await runBackfillOnce(pool, "normalize-retail-profit-permission", `
    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'manage_profit_report'
    FROM role_permissions
    WHERE permission = 'manage_retail_profit_report'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;

    DELETE FROM role_permissions WHERE permission = 'manage_retail_profit_report';
  `);

  await runBackfillOnce(pool, "seed-registered-owner-permissions", `
    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT DISTINCT 'super_admin', tenant.id, granted.permission
    FROM tenants tenant
    JOIN users owner
      ON owner.tenant_id = tenant.id
     AND owner.role = 'super_admin'
     AND owner.deleted_at IS NULL
    CROSS JOIN UNNEST($1::text[]) AS granted(permission)
    WHERE COALESCE(tenant.phone, '') <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM role_permissions existing
        WHERE existing.role = 'super_admin'
          AND existing.tenant_id IN (tenant.id, 'global')
      )
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;
  `, [TENANT_BUSINESS_PERMISSIONS]);

  await runBackfillOnce(pool, "help-desk-permission-split", `
    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'view_help_desk'
    FROM role_permissions
    WHERE permission = 'view_state'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;

    INSERT INTO role_permissions (role, tenant_id, permission)
    SELECT role, tenant_id, 'manage_help_desk'
    FROM role_permissions
    WHERE permission = 'view_state'
    ON CONFLICT (role, tenant_id, permission) DO NOTHING;
  `);

  // quotationService.convertToInvoice already handles a null productId
  // defensively throughout (cost-snapshot lookup, stock-delta skip) so an
  // ad-hoc/non-catalog quotation line — a real, user-reachable feature in
  // the Quotation form — can be converted to an invoice. The NOT NULL
  // constraint below was the only thing stopping that from actually
  // working; relax it to match what the service layer already expects.
  await pool.query(`
    ALTER TABLE sales_invoice_items ALTER COLUMN product_id DROP NOT NULL;
  `);
}
