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

    CREATE TABLE IF NOT EXISTS dsr_cash_receipts (
      id TEXT PRIMARY KEY,
      receipt_date DATE NOT NULL,
      dsr_id TEXT NOT NULL REFERENCES dsrs(id) ON DELETE CASCADE,
      amount NUMERIC NOT NULL,
      note TEXT NOT NULL,
      received_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_dsr_cash_receipts_receipt_date ON dsr_cash_receipts(receipt_date DESC);
    CREATE INDEX IF NOT EXISTS idx_dsr_cash_receipts_dsr_id ON dsr_cash_receipts(dsr_id);
    CREATE INDEX IF NOT EXISTS idx_dsr_cash_receipts_received_by ON dsr_cash_receipts(received_by);

    CREATE TABLE IF NOT EXISTS dsr_advances (
      id TEXT PRIMARY KEY,
      advance_date DATE NOT NULL,
      dsr_id TEXT NOT NULL REFERENCES dsrs(id) ON DELETE CASCADE,
      amount NUMERIC NOT NULL,
      note TEXT NOT NULL,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_dsr_advances_advance_date ON dsr_advances(advance_date DESC);
    CREATE INDEX IF NOT EXISTS idx_dsr_advances_dsr_id ON dsr_advances(dsr_id);
    CREATE INDEX IF NOT EXISTS idx_dsr_advances_created_by ON dsr_advances(created_by);

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

    ALTER TABLE dsr_cash_receipts ADD COLUMN IF NOT EXISTS receipt_date DATE NOT NULL DEFAULT CURRENT_DATE;
    ALTER TABLE dsr_cash_receipts ADD COLUMN IF NOT EXISTS dsr_id TEXT REFERENCES dsrs(id) ON DELETE CASCADE;
    ALTER TABLE dsr_cash_receipts ADD COLUMN IF NOT EXISTS amount NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE dsr_cash_receipts ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT '';
    ALTER TABLE dsr_cash_receipts ADD COLUMN IF NOT EXISTS received_by TEXT REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE dsr_cash_receipts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    ALTER TABLE dsr_advances ADD COLUMN IF NOT EXISTS advance_date DATE NOT NULL DEFAULT CURRENT_DATE;
    ALTER TABLE dsr_advances ADD COLUMN IF NOT EXISTS dsr_id TEXT REFERENCES dsrs(id) ON DELETE CASCADE;
    ALTER TABLE dsr_advances ADD COLUMN IF NOT EXISTS amount NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE dsr_advances ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT '';
    ALTER TABLE dsr_advances ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE dsr_advances ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    ALTER TABLE users         ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
    ALTER TABLE products      ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
    ALTER TABLE dsrs          ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
    ALTER TABLE issues        ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
    ALTER TABLE settlements   ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
    ALTER TABLE expenses      ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
    ALTER TABLE dsr_cash_receipts ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
    ALTER TABLE dsr_advances  ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);
    ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);

    CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_dsrs_tenant_id ON dsrs(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_issues_tenant_id ON issues(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_settlements_tenant_id ON settlements(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_tenant_id ON expenses(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_dsr_cash_receipts_tenant_id ON dsr_cash_receipts(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_dsr_advances_tenant_id ON dsr_advances(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant_id ON activity_logs(tenant_id);

    ALTER TABLE products ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 9999;
    CREATE INDEX IF NOT EXISTS idx_products_order_index ON products(tenant_id, order_index ASC);
    UPDATE products SET order_index = 9999 WHERE order_index = 0;

    ALTER TABLE products ADD COLUMN IF NOT EXISTS damaged_pieces INTEGER NOT NULL DEFAULT 0;

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
      total_amount      NUMERIC NOT NULL DEFAULT 0,
      paid_amount       NUMERIC NOT NULL DEFAULT 0,
      due_amount        NUMERIC NOT NULL DEFAULT 0,
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
      total_amount             NUMERIC NOT NULL DEFAULT 0,
      total_profit_adjustment  NUMERIC NOT NULL DEFAULT 0,
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

    -- Migrate retailer module customer references to retail_customers table
    ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS opening_due NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS current_due NUMERIC NOT NULL DEFAULT 0;
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
    -- and error_logs (platform-level actions and errors can occur with no tenant context —
    -- e.g. the tenant-switch and full-platform-backup audit entries record tenant_id = NULL
    -- on purpose), login_history and password_reset_tokens (same reasoning for platform users).

    -- Step 1: root tables with no better signal than "the tenant this row has always
    -- implicitly belonged to" — backfill any leftover null to the oldest tenant.
    UPDATE products SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;
    UPDATE dsrs SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;
    UPDATE issues SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;
    UPDATE settlements SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;
    UPDATE expenses SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;
    UPDATE dsr_cash_receipts SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;
    UPDATE dsr_advances SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;
    UPDATE customers SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;
    UPDATE suppliers SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;
    UPDATE retail_customers SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;
    UPDATE finance_accounts SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1) WHERE tenant_id IS NULL;

    -- Step 2: tables one level down — infer tenant_id from the parent business record they
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

    -- Every row above now has a tenant_id (or the table is empty) — safe to enforce.
    ALTER TABLE products ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE dsrs ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE issues ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE settlements ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE expenses ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE dsr_cash_receipts ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE dsr_advances ALTER COLUMN tenant_id SET NOT NULL;
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
  `);
}
