export const AUDIT_MODULES = [
  "products",
  "dsrs",
  "customers",
  "expenses",
  "morning-issue",
  "settlements",
  "dsr-finance",
  "due-ledger",
  "users",
  "suppliers",
  "purchases",
  "retailer",
  "system",
];

const ENTITY_TYPE_MODULES = {
  product: "products",
  dsr: "dsrs",
  customer: "customers",
  expense: "expenses",
  issue: "morning-issue",
  settlement: "settlements",
  dsr_cash_receipt: "dsr-finance",
  dsr_advance: "dsr-finance",
  due_ledger: "due-ledger",
  user: "users",
  supplier: "suppliers",
  supplier_due_ledger: "suppliers",
  purchase_receipt: "purchases",
  supplier_payment: "purchases",
  sales_invoice: "retailer",
  sales_return: "retailer",
  customer_payment: "retailer",
  customer_due_ledger: "retailer",
};

export function moduleForEntityType(entityType) {
  return ENTITY_TYPE_MODULES[entityType] || "system";
}
