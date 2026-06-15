export const PRODUCT_ACTIONS = {
  CREATE: "product.create",
  UPDATE: "product.update",
  DELETE: "product.delete",
  RESTORE: "product.restore",
  PERMANENT_DELETE: "product.permanent_delete",
  STOCK_ADD: "product.stock_add",
  DAMAGE_CLEAR: "product.damage_clear",
};

export const DSR_ACTIONS = {
  CREATE: "dsr.create",
  UPDATE: "dsr.update",
  DELETE: "dsr.delete",
  RESTORE: "dsr.restore",
  PERMANENT_DELETE: "dsr.permanent_delete",
  DUE_ADJUSTMENT: "dsr.due_adjustment",
};

export const ISSUE_ACTIONS = {
  CREATE: "issue.create",
  UPDATE: "issue.update",
};

export const SETTLEMENT_ACTIONS = {
  CREATE: "settlement.create",
  UPDATE: "settlement.update",
};

export const SUPPLIER_ACTIONS = {
  CREATE: "supplier.create",
  UPDATE: "supplier.update",
  DELETE: "supplier.delete",
  RESTORE: "supplier.restore",
  PERMANENT_DELETE: "supplier.permanent_delete",
};

export const PURCHASE_ACTIONS = {
  CREATE: "purchase_receipt.create",
  UPDATE: "purchase_receipt.update",
  DELETE: "purchase_receipt.delete",
  RESTORE: "purchase_receipt.restore",
};

export const SUPPLIER_PAYMENT_ACTIONS = {
  CREATE: "supplier_payment.create",
  UPDATE: "supplier_payment.update",
  DELETE: "supplier_payment.delete",
  RESTORE: "supplier_payment.restore",
};

export const SALES_INVOICE_ACTIONS = {
  CREATE: "sales_invoice.create",
  UPDATE: "sales_invoice.update",
  DELETE: "sales_invoice.delete",
  RESTORE: "sales_invoice.restore",
};

export const SALES_RETURN_ACTIONS = {
  CREATE: "sales_return.create",
};

export const CUSTOMER_PAYMENT_ACTIONS = {
  CREATE: "customer_payment.create",
  UPDATE: "customer_payment.update",
  DELETE: "customer_payment.delete",
  RESTORE: "customer_payment.restore",
};

export const FINANCE_ACCOUNT_ACTIONS = {
  DEPOSIT: "finance_account.deposit",
  WITHDRAWAL: "finance_account.withdrawal",
  TRANSFER: "finance_account.transfer",
  DELETE: "finance_account.delete_transaction",
};
