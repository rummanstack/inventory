// Maps a supplier-facing payment method to the internal finance account it actually
// draws from: cash in hand for CASH, otherwise the bank account (mobile banking and
// cheques both settle through the bank, not the physical cash drawer).
const PAYMENT_METHOD_ACCOUNT_TYPES = {
  CASH: "CASH",
  MOBILE_BANKING: "BANK",
  CHEQUE: "BANK",
};

export function accountTypeForPaymentMethod(paymentMethod) {
  return PAYMENT_METHOD_ACCOUNT_TYPES[String(paymentMethod || "").trim().toUpperCase()] || "CASH";
}
