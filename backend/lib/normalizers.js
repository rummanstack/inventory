import { createId } from "./ids.js";

export function cleanInteger(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

export function cleanMoney(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeProduct(input) {
  return {
    id: input.id || createId("p"),
    name: String(input.name || "").trim(),
    category: String(input.category || "").trim(),
    piecesPerCase: cleanInteger(input.piecesPerCase),
    purchasePrice: cleanMoney(input.purchasePrice),
    sellingPrice: cleanMoney(input.sellingPrice),
    stockPieces: cleanInteger(input.stockPieces),
    orderIndex:
      input.orderIndex !== undefined && input.orderIndex !== null && String(input.orderIndex).trim() !== ""
        ? cleanInteger(input.orderIndex)
        : null,
  };
}

export function normalizeDsr(input) {
  return {
    id: input.id || createId("dsr"),
    name: String(input.name || "").trim(),
    phone: String(input.phone || "").trim(),
    area: String(input.area || "").trim(),
    status: input.status === "Inactive" ? "Inactive" : "Active",
    openingDue: Math.max(0, cleanMoney(input.openingDue)),
  };
}

export function normalizeCustomer(input) {
  const openingDue = Math.max(0, cleanMoney(input.openingDue));
  const hasCurrentDue = input.currentDue !== undefined && input.currentDue !== null && String(input.currentDue).trim() !== "";

  return {
    id: input.id || createId("customer"),
    shopName: String(input.shopName || "").trim(),
    ownerName: String(input.ownerName || "").trim(),
    phone: String(input.phone || "").trim(),
    address: String(input.address || "").trim(),
    market: String(input.market || "").trim(),
    assignedDsrId: String(input.assignedDsrId || "").trim() || null,
    openingDue,
    currentDue: hasCurrentDue ? Math.max(0, cleanMoney(input.currentDue)) : openingDue,
    status: input.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    note: String(input.note || "").trim(),
  };
}

export function normalizeIssue(input) {
  return {
    id: input.id || createId("issue"),
    date: String(input.date || "").trim(),
    dsrId: String(input.dsrId || "").trim(),
    dsrName: String(input.dsrName || "").trim(),
    area: String(input.area || "").trim(),
    phone: String(input.phone || "").trim(),
    items: Array.isArray(input.items)
      ? input.items.map((item) => ({
          productId: String(item.productId || "").trim(),
          productName: String(item.productName || "").trim(),
          piecesPerCase: cleanInteger(item.piecesPerCase),
          issuedPieces: cleanInteger(item.issuedPieces),
          rate: cleanMoney(item.rate),
        }))
      : [],
  };
}

export function normalizeSettlementBase(input) {
  const items = Array.isArray(input.items)
    ? input.items.map((item) => {
        const issuedPieces = cleanInteger(item.issuedPieces);
        const returnedPieces = cleanInteger(item.returnedPieces);
        const damagedPieces = cleanInteger(item.damagedPieces);
        const soldPieces = Math.max(issuedPieces - returnedPieces - damagedPieces, 0);
        const rate = cleanMoney(item.rate);

        return {
          id: item.id || createId("settlement-item"),
          productId: String(item.productId || "").trim(),
          productName: String(item.productName || "").trim(),
          piecesPerCase: cleanInteger(item.piecesPerCase),
          issuedPieces,
          returnedPieces,
          damagedPieces,
          soldPieces,
          rate,
          payable: soldPieces * rate,
        };
      })
    : [];

  const extraReturns = Array.isArray(input.extraReturns)
    ? Object.values(
        input.extraReturns.reduce((map, item) => {
          const productId = String(item.productId || "").trim();
          const returnedPieces = cleanInteger(item.returnedPieces);
          const damagedPieces = cleanInteger(item.damagedPieces);

          if (!productId || (returnedPieces <= 0 && damagedPieces <= 0)) {
            return map;
          }

          const existing = map[productId] || {
            id: item.id || createId("settlement-extra-return"),
            productId,
            productName: String(item.productName || "").trim(),
            piecesPerCase: cleanInteger(item.piecesPerCase),
            returnedPieces: 0,
            damagedPieces: 0,
          };

          existing.returnedPieces += returnedPieces;
          existing.damagedPieces += damagedPieces;
          if (!existing.productName) {
            existing.productName = String(item.productName || "").trim();
          }
          if (!existing.piecesPerCase) {
            existing.piecesPerCase = cleanInteger(item.piecesPerCase);
          }

          map[productId] = existing;
          return map;
        }, {}),
      )
    : [];

  const totalPayable = items.reduce((sum, item) => sum + item.payable, 0);
  const discount = Math.max(0, cleanMoney(input.discount));
  const extraReturnValue = Math.max(0, cleanMoney(input.extraReturnValue));

  return {
    id: input.id || createId("settlement"),
    date: String(input.date || "").trim(),
    dsrId: String(input.dsrId || "").trim(),
    dsrName: String(input.dsrName || "").trim(),
    area: String(input.area || "").trim(),
    phone: String(input.phone || "").trim(),
    issueIds: Array.isArray(input.issueIds) ? input.issueIds.map((item) => String(item)) : [],
    items,
    extraReturns,
    totalPayable,
    discount,
    extraReturnValue,
    amountPaidInput: cleanMoney(input.amountPaid),
    status: "Completed",
  };
}

export function normalizeSupplier(input) {
  const openingDue = Math.max(0, cleanMoney(input.openingDue));
  const hasCurrentDue = input.currentDue !== undefined && input.currentDue !== null && String(input.currentDue).trim() !== "";

  return {
    id: input.id || createId("supplier"),
    name: String(input.name || "").trim(),
    phone: String(input.phone || "").trim(),
    address: String(input.address || "").trim(),
    openingDue,
    currentDue: hasCurrentDue ? Math.max(0, cleanMoney(input.currentDue)) : openingDue,
    status: input.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    note: String(input.note || "").trim(),
  };
}

export function normalizePurchaseReceipt(input) {
  const items = Array.isArray(input.items)
    ? input.items
        .map((item) => {
          const quantityPieces = cleanInteger(item.quantityPieces);
          const purchasePrice = cleanMoney(item.purchasePrice);
          const lineDiscount = Math.max(0, cleanMoney(item.lineDiscount));
          const lineTotal = Math.max(0, quantityPieces * purchasePrice - lineDiscount);

          return {
            id: item.id || createId("purchase-item"),
            productId: String(item.productId || "").trim(),
            productName: String(item.productName || "").trim(),
            quantityPieces,
            purchasePrice,
            lineDiscount,
            lineTotal,
          };
        })
        .filter((item) => item.productId)
    : [];

  const grossTotal = items.reduce((sum, item) => sum + item.quantityPieces * item.purchasePrice, 0);
  const lineDiscountTotal = items.reduce((sum, item) => sum + item.lineDiscount, 0);
  const discount = Math.max(0, cleanMoney(input.discount));
  const totalAmount = Math.max(0, grossTotal - lineDiscountTotal - discount);
  const paidAmount = Math.max(0, Math.min(cleanMoney(input.paidAmount), totalAmount));
  const dueAmount = totalAmount - paidAmount;

  return {
    id: input.id || createId("purchase"),
    supplierId: String(input.supplierId || "").trim(),
    supplierInvoiceNo: String(input.supplierInvoiceNo || "").trim(),
    purchaseDate: String(input.purchaseDate || "").trim(),
    items,
    discount,
    totalAmount,
    paidAmount,
    dueAmount,
    paymentMethod: String(input.paymentMethod || "CASH").trim().toUpperCase() || "CASH",
    note: String(input.note || "").trim(),
  };
}

export function normalizeSupplierPayment(input) {
  return {
    id: input.id || createId("supplier-payment"),
    supplierId: String(input.supplierId || "").trim(),
    paymentDate: String(input.paymentDate || "").trim(),
    amount: Math.max(0, cleanMoney(input.amount)),
    paymentMethod: String(input.paymentMethod || "CASH").trim().toUpperCase() || "CASH",
    note: String(input.note || "").trim(),
  };
}

export function finalizeSettlementAmounts(base, previousDue) {
  const normalizedPreviousDue = Math.max(0, cleanMoney(previousDue));
  const receivableTotal = Math.max(0, base.totalPayable + normalizedPreviousDue - base.discount - base.extraReturnValue);
  const amountPaid = Math.min(Math.max(0, base.amountPaidInput), receivableTotal);

  return {
    ...base,
    previousDue: normalizedPreviousDue,
    amountPaid,
    dueAmount: receivableTotal - amountPaid,
  };
}
