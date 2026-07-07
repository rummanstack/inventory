// One entry per (tenantId, sourceType, sourceId) is enforced at the DB level
// (see idx_journal_entries_source). Adjustment/delta postings use their own
// sourceType with a freshly generated sourceId so they never collide with the
// original create-time entry.
export const JOURNAL_SOURCE_TYPES = {
  SALES_INVOICE: "sales_invoice",
  PURCHASE_RECEIPT: "purchase_receipt",
  PURCHASE_RECEIPT_ADJUSTMENT: "purchase_receipt_adjustment",
  CUSTOMER_PAYMENT: "customer_payment",
  CUSTOMER_PAYMENT_ADJUSTMENT: "customer_payment_adjustment",
  SUPPLIER_PAYMENT: "supplier_payment",
  SUPPLIER_PAYMENT_ADJUSTMENT: "supplier_payment_adjustment",
  EXPENSE: "expense",
  EXPENSE_ADJUSTMENT: "expense_adjustment",
  FINANCE_MANUAL_TRANSACTION: "finance_manual_transaction",
  FINANCE_TRANSFER: "finance_transfer",
  SALES_RETURN: "sales_return",
  PURCHASE_RETURN: "purchase_return",
  MORNING_ISSUE: "morning_issue",
  SETTLEMENT: "settlement",
};
