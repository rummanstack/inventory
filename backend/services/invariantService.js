// Cross-cutting data-integrity checks that must always hold, regardless of which code path
// wrote the data. These are read-only — they report divergence, they never fix it.
//
// Known limitation: finance_account_transactions has no reference_type/reference_id column,
// unlike customer_due_ledger/supplier_due_ledger/dsr_due_ledger/stock_movements which all do.
// That makes a true per-transaction "this posting matches that source document" join
// impossible today. The finance checks below verify what the schema actually allows: that
// each account's stored balance matches its own transaction history (internal consistency),
// and that every transfer has exactly one matching in/out leg (double-entry correctness).
// Adding a reference column to finance_account_transactions would be the natural follow-up
// to get the same per-document guarantee the other three ledgers already have.
export class InvariantService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async checkStock(tenantId = null) {
    const result = await this.databaseManager.withClient((client) =>
      client.query(
        `SELECT
           p.id, p.tenant_id, p.name,
           p.stock_pieces AS recorded_stock,
           COALESCE(SUM(sm.quantity_in) - SUM(sm.quantity_out), 0)::INTEGER AS computed_stock
         FROM products p
         LEFT JOIN stock_movements sm ON sm.product_id = p.id
         WHERE p.deleted_at IS NULL
           AND ($1::text IS NULL OR p.tenant_id = $1)
         GROUP BY p.id, p.tenant_id, p.name, p.stock_pieces
         HAVING p.stock_pieces != COALESCE(SUM(sm.quantity_in) - SUM(sm.quantity_out), 0)
         ORDER BY p.name`,
        [tenantId],
      ),
    );

    const totalResult = await this.databaseManager.withClient((client) =>
      client.query(
        `SELECT COUNT(*)::INTEGER AS count FROM products WHERE deleted_at IS NULL AND ($1::text IS NULL OR tenant_id = $1)`,
        [tenantId],
      ),
    );

    return {
      checked: totalResult.rows[0].count,
      violations: result.rows.map((row) => ({
        productId: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        recordedStock: row.recorded_stock,
        computedFromMovements: row.computed_stock,
      })),
    };
  }

  async checkLedgerBalance({ entityTable, ledgerTable, fkColumn, balanceColumn, tenantId }) {
    const result = await this.databaseManager.withClient((client) =>
      client.query(
        `WITH latest AS (
           SELECT DISTINCT ON (${fkColumn}) ${fkColumn}, balance_after
           FROM ${ledgerTable}
           ORDER BY ${fkColumn}, created_at DESC, id DESC
         )
         SELECT e.id, e.tenant_id, e.name, e.${balanceColumn} AS current_value,
                COALESCE(l.balance_after, 0) AS ledger_balance
         FROM ${entityTable} e
         LEFT JOIN latest l ON l.${fkColumn} = e.id
         WHERE e.deleted_at IS NULL
           AND ($1::text IS NULL OR e.tenant_id = $1)
           AND e.${balanceColumn} != GREATEST(0, COALESCE(l.balance_after, 0))`,
        [tenantId],
      ),
    );

    const negativeResult = await this.databaseManager.withClient((client) =>
      client.query(
        `WITH latest AS (
           SELECT DISTINCT ON (${fkColumn}) ${fkColumn}, balance_after
           FROM ${ledgerTable}
           ORDER BY ${fkColumn}, created_at DESC, id DESC
         )
         SELECT e.id, e.tenant_id, e.name, e.${balanceColumn} AS current_value, l.balance_after AS ledger_balance
         FROM ${entityTable} e
         INNER JOIN latest l ON l.${fkColumn} = e.id
         WHERE e.deleted_at IS NULL
           AND ($1::text IS NULL OR e.tenant_id = $1)
           AND l.balance_after < 0`,
        [tenantId],
      ),
    );

    const totalResult = await this.databaseManager.withClient((client) =>
      client.query(
        `SELECT COUNT(*)::INTEGER AS count FROM ${entityTable} WHERE deleted_at IS NULL AND ($1::text IS NULL OR tenant_id = $1)`,
        [tenantId],
      ),
    );

    return {
      checked: totalResult.rows[0].count,
      violations: result.rows.map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        currentValue: Number(row.current_value),
        ledgerBalance: Number(row.ledger_balance),
      })),
      // Not a violation by itself — current_value is clamped to 0 by design (no refund/credit
      // feature exists yet), but a negative ledger balance means money is owed back. Surfaced
      // separately so it doesn't get confused with an actual data-integrity bug.
      negativeBalances: negativeResult.rows.map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        currentValue: Number(row.current_value),
        ledgerBalance: Number(row.ledger_balance),
      })),
    };
  }

  async checkCustomerLedger(tenantId = null) {
    return this.checkLedgerBalance({
      entityTable: "retail_customers",
      ledgerTable: "customer_due_ledger",
      fkColumn: "customer_id",
      balanceColumn: "current_due",
      tenantId,
    });
  }

  async checkSupplierLedger(tenantId = null) {
    return this.checkLedgerBalance({
      entityTable: "suppliers",
      ledgerTable: "supplier_due_ledger",
      fkColumn: "supplier_id",
      balanceColumn: "current_due",
      tenantId,
    });
  }

  async checkFinanceAccountBalance(tenantId = null) {
    const result = await this.databaseManager.withClient((client) =>
      client.query(
        `WITH latest AS (
           SELECT DISTINCT ON (account_id) account_id, balance_after
           FROM finance_account_transactions
           WHERE deleted_at IS NULL
           ORDER BY account_id, created_at DESC, id DESC
         )
         SELECT fa.id, fa.tenant_id, fa.type, fa.name, fa.balance, COALESCE(l.balance_after, 0) AS ledger_balance
         FROM finance_accounts fa
         LEFT JOIN latest l ON l.account_id = fa.id
         WHERE ($1::text IS NULL OR fa.tenant_id = $1)
           AND fa.balance != COALESCE(l.balance_after, 0)`,
        [tenantId],
      ),
    );

    const totalResult = await this.databaseManager.withClient((client) =>
      client.query(`SELECT COUNT(*)::INTEGER AS count FROM finance_accounts WHERE ($1::text IS NULL OR tenant_id = $1)`, [
        tenantId,
      ]),
    );

    return {
      checked: totalResult.rows[0].count,
      violations: result.rows.map((row) => ({
        accountId: row.id,
        tenantId: row.tenant_id,
        type: row.type,
        name: row.name,
        storedBalance: Number(row.balance),
        ledgerBalance: Number(row.ledger_balance),
      })),
    };
  }

  async checkShopDueLedger(tenantId = null) {
    const result = await this.databaseManager.withClient((client) =>
      client.query(
        `WITH latest AS (
           SELECT DISTINCT ON (shop_id) shop_id, balance_after
           FROM shop_due_ledger
           WHERE ($1::text IS NULL OR tenant_id = $1)
           ORDER BY shop_id, created_at DESC, id DESC
         )
         SELECT c.id, c.tenant_id, c.shop_name,
                c.current_due,
                COALESCE(l.balance_after, c.opening_due) AS expected_due
         FROM customers c
         LEFT JOIN latest l ON l.shop_id = c.id
         WHERE c.deleted_at IS NULL
           AND ($1::text IS NULL OR c.tenant_id = $1)
           AND ABS(c.current_due - COALESCE(l.balance_after, c.opening_due)) > 0.01`,
        [tenantId],
      ),
    );

    const totalResult = await this.databaseManager.withClient((client) =>
      client.query(
        `SELECT COUNT(*)::INTEGER AS count FROM customers WHERE deleted_at IS NULL AND ($1::text IS NULL OR tenant_id = $1)`,
        [tenantId],
      ),
    );

    return {
      checked: totalResult.rows[0].count,
      violations: result.rows.map((row) => ({
        shopId: row.id,
        tenantId: row.tenant_id,
        shopName: row.shop_name,
        storedCurrentDue: Number(row.current_due),
        expectedFromLedger: Number(row.expected_due),
      })),
    };
  }

  async checkDsrLedgerChain(tenantId = null) {
    // Verify every dsr_due_ledger entry's balance_after equals the previous
    // entry's balance_after + debit - credit, using the same insertion ordering
    // used by getLatestDueLedgerEntry (created_at, type priority, id).
    const result = await this.databaseManager.withClient((client) =>
      client.query(
        `WITH ordered AS (
           SELECT
             id, dsr_id, tenant_id, type, debit, credit, balance_after,
             LAG(balance_after) OVER (
               PARTITION BY dsr_id, tenant_id
               ORDER BY created_at,
                        CASE type WHEN 'SALE_DUE' THEN 10 WHEN 'COLLECTION' THEN 20 ELSE 30 END,
                        id
             ) AS prev_balance
           FROM dsr_due_ledger
           WHERE ($1::text IS NULL OR tenant_id = $1)
         )
         SELECT id, dsr_id, tenant_id, type, debit, credit, balance_after,
                COALESCE(prev_balance, 0) + debit - credit AS expected_balance
         FROM ordered
         WHERE ABS(balance_after - (COALESCE(prev_balance, 0) + debit - credit)) > 0.01
         ORDER BY dsr_id, id`,
        [tenantId],
      ),
    );

    const totalResult = await this.databaseManager.withClient((client) =>
      client.query(
        `SELECT COUNT(*)::INTEGER AS count FROM dsr_due_ledger WHERE ($1::text IS NULL OR tenant_id = $1)`,
        [tenantId],
      ),
    );

    return {
      checked: totalResult.rows[0].count,
      violations: result.rows.map((row) => ({
        entryId: row.id,
        dsrId: row.dsr_id,
        tenantId: row.tenant_id,
        type: row.type,
        debit: Number(row.debit),
        credit: Number(row.credit),
        storedBalanceAfter: Number(row.balance_after),
        expectedBalanceAfter: Number(row.expected_balance),
      })),
    };
  }

  async checkFinanceTransferPairing(tenantId = null) {
    const result = await this.databaseManager.withClient((client) =>
      client.query(
        `SELECT transfer_id, tenant_id,
                COUNT(*)::INTEGER AS leg_count,
                COUNT(*) FILTER (WHERE type = 'TRANSFER_OUT')::INTEGER AS out_count,
                COUNT(*) FILTER (WHERE type = 'TRANSFER_IN')::INTEGER AS in_count
         FROM finance_account_transactions
         WHERE transfer_id IS NOT NULL
           AND deleted_at IS NULL
           AND ($1::text IS NULL OR tenant_id = $1)
         GROUP BY transfer_id, tenant_id
         HAVING COUNT(*) != 2
           OR COUNT(*) FILTER (WHERE type = 'TRANSFER_OUT') != 1
           OR COUNT(*) FILTER (WHERE type = 'TRANSFER_IN') != 1`,
        [tenantId],
      ),
    );

    const totalResult = await this.databaseManager.withClient((client) =>
      client.query(
        `SELECT COUNT(DISTINCT transfer_id)::INTEGER AS count FROM finance_account_transactions
         WHERE transfer_id IS NOT NULL AND deleted_at IS NULL AND ($1::text IS NULL OR tenant_id = $1)`,
        [tenantId],
      ),
    );

    return {
      checked: totalResult.rows[0].count,
      violations: result.rows.map((row) => ({
        transferId: row.transfer_id,
        tenantId: row.tenant_id,
        legCount: row.leg_count,
        outCount: row.out_count,
        inCount: row.in_count,
      })),
    };
  }

  async checkAll(tenantId = null) {
    const [stock, customerLedger, supplierLedger, financeAccountBalance, financeTransferPairing, shopDueLedger, dsrLedgerChain] = await Promise.all([
      this.checkStock(tenantId),
      this.checkCustomerLedger(tenantId),
      this.checkSupplierLedger(tenantId),
      this.checkFinanceAccountBalance(tenantId),
      this.checkFinanceTransferPairing(tenantId),
      this.checkShopDueLedger(tenantId),
      this.checkDsrLedgerChain(tenantId),
    ]);

    const violationCount =
      stock.violations.length +
      customerLedger.violations.length +
      supplierLedger.violations.length +
      financeAccountBalance.violations.length +
      financeTransferPairing.violations.length +
      shopDueLedger.violations.length +
      dsrLedgerChain.violations.length;

    return {
      scope: tenantId || "all-tenants",
      generatedAt: new Date().toISOString(),
      ok: violationCount === 0,
      violationCount,
      stock,
      customerLedger,
      supplierLedger,
      financeAccountBalance,
      financeTransferPairing,
      shopDueLedger,
      dsrLedgerChain,
      limitations: [
        "finance_account_transactions has no reference_type/reference_id column, so individual " +
          "postings cannot be matched 1:1 back to the sales invoice/payment/purchase that created " +
          "them. Only internal balance-chain consistency and transfer double-entry pairing are " +
          "verified for finance.",
      ],
    };
  }
}
