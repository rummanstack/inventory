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
    categoryId: String(input.categoryId || "").trim(),
    piecesPerCase: cleanInteger(input.piecesPerCase),
    purchasePrice: cleanMoney(input.purchasePrice),
    wholesalePrice: cleanMoney(input.wholesalePrice),
    retailPrice: cleanMoney(input.retailPrice),
    stockPieces: cleanInteger(input.stockPieces),
    taxRate: Math.min(Math.max(0, cleanMoney(input.taxRate)), 100),
    orderIndex:
      input.orderIndex !== undefined && input.orderIndex !== null && String(input.orderIndex).trim() !== ""
        ? cleanInteger(input.orderIndex)
        : null,
    reorderLevel:
      input.reorderLevel !== undefined && input.reorderLevel !== null && String(input.reorderLevel).trim() !== ""
        ? cleanInteger(input.reorderLevel)
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
          const taxRate = Math.min(Math.max(0, cleanMoney(item.taxRate)), 100);

          return {
            id: item.id || createId("purchase-item"),
            productId: String(item.productId || "").trim(),
            productName: String(item.productName || "").trim(),
            quantityPieces,
            purchasePrice,
            lineDiscount,
            lineTotal,
            taxRate,
            taxAmount: Math.max(0, lineTotal * taxRate / 100),
          };
        })
        .filter((item) => item.productId)
    : [];

  const grossTotal = items.reduce((sum, item) => sum + item.quantityPieces * item.purchasePrice, 0);
  const lineDiscountTotal = items.reduce((sum, item) => sum + item.lineDiscount, 0);
  const discount = Math.max(0, cleanMoney(input.discount));
  const taxableAmount = Math.max(0, grossTotal - lineDiscountTotal - discount);
  const taxAmount = items.reduce((sum, item) => sum + Math.max(0, cleanMoney(item.taxAmount)), 0);
  const totalAmount = Math.max(0, taxableAmount + taxAmount);
  const taxRate = taxableAmount > 0 ? Math.min(Math.max(0, (taxAmount / taxableAmount) * 100), 100) : 0;
  const paidAmount = Math.max(0, Math.min(cleanMoney(input.paidAmount), totalAmount));
  const dueAmount = totalAmount - paidAmount;

  return {
    id: input.id || createId("purchase"),
    supplierId: String(input.supplierId || "").trim(),
    supplierInvoiceNo: String(input.supplierInvoiceNo || "").trim(),
    purchaseDate: String(input.purchaseDate || "").trim(),
    items,
    discount,
    taxRate,
    taxAmount,
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

const SALE_TYPES = ["WHOLESALE", "RETAIL", "QUICK_SALE"];
const CUSTOMER_TYPES = ["REGISTERED", "WALK_IN"];

export function normalizeSalesInvoice(input) {
  const items = Array.isArray(input.items)
    ? input.items
        .map((item) => {
          const quantityPieces = cleanInteger(item.quantityPieces);
          const actualSalePrice = cleanMoney(item.actualSalePrice);
          const lineDiscount = Math.max(0, cleanMoney(item.lineDiscount));
          const lineTotal = Math.max(0, quantityPieces * actualSalePrice - lineDiscount);
          const taxRate = Math.min(Math.max(0, cleanMoney(item.taxRate)), 100);

          return {
            id: item.id || createId("sales-item"),
            productId: String(item.productId || "").trim(),
            productName: String(item.productName || "").trim(),
            quantityPieces,
            actualSalePrice,
            lineDiscount,
            lineTotal,
            taxRate,
            taxAmount: Math.max(0, lineTotal * taxRate / 100),
          };
        })
        .filter((item) => item.productId && item.quantityPieces > 0)
    : [];

  const subtotal = items.reduce((sum, item) => sum + item.quantityPieces * item.actualSalePrice, 0);
  const lineDiscountTotal = items.reduce((sum, item) => sum + item.lineDiscount, 0);
  const discount = Math.max(0, cleanMoney(input.discount));
  const taxableAmount = Math.max(0, subtotal - lineDiscountTotal - discount);
  const taxAmount = items.reduce((sum, item) => sum + Math.max(0, cleanMoney(item.taxAmount)), 0);
  const totalAmount = Math.max(0, taxableAmount + taxAmount);
  const taxRate = taxableAmount > 0 ? Math.min(Math.max(0, (taxAmount / taxableAmount) * 100), 100) : 0;
  const paidAmount = Math.max(0, Math.min(cleanMoney(input.paidAmount), totalAmount));
  const dueAmount = totalAmount - paidAmount;

  const saleType = SALE_TYPES.includes(String(input.saleType || "").trim().toUpperCase())
    ? String(input.saleType).trim().toUpperCase()
    : "RETAIL";
  const customerType = CUSTOMER_TYPES.includes(String(input.customerType || "").trim().toUpperCase())
    ? String(input.customerType).trim().toUpperCase()
    : "WALK_IN";

  return {
    id: input.id || createId("sales-invoice"),
    customerId: String(input.customerId || "").trim() || null,
    customerType,
    saleType,
    invoiceDate: String(input.invoiceDate || "").trim(),
    items,
    subtotal,
    discount,
    taxRate,
    taxAmount,
    totalAmount,
    paidAmount,
    dueAmount,
    paymentMethod: String(input.paymentMethod || "CASH").trim().toUpperCase() || "CASH",
    note: String(input.note || "").trim(),
  };
}

export function normalizeSalesReturn(input) {
  const items = Array.isArray(input.items)
    ? input.items
        .map((item) => {
          const quantityPieces = cleanInteger(item.quantityPieces);
          const actualSalePrice = cleanMoney(item.actualSalePrice);
          const costPriceSnapshot = cleanMoney(item.costPriceSnapshot);
          const lineTotal = quantityPieces * actualSalePrice;

          return {
            id: item.id || createId("sales-return-item"),
            salesInvoiceItemId: String(item.salesInvoiceItemId || "").trim() || null,
            productId: String(item.productId || "").trim(),
            productName: String(item.productName || "").trim(),
            quantityPieces,
            actualSalePrice,
            costPriceSnapshot,
            lineTotal,
          };
        })
        .filter((item) => item.productId && item.quantityPieces > 0)
    : [];

  const totalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalProfitAdjustment = items.reduce(
    (sum, item) => sum + (item.actualSalePrice - item.costPriceSnapshot) * item.quantityPieces,
    0,
  );

  return {
    id: input.id || createId("sales-return"),
    salesInvoiceId: String(input.salesInvoiceId || "").trim() || null,
    customerId: String(input.customerId || "").trim() || null,
    returnDate: String(input.returnDate || "").trim(),
    items,
    totalAmount,
    totalProfitAdjustment,
    note: String(input.note || "").trim(),
  };
}

export function normalizeRetailCustomer(input) {
  return {
    id: input.id || createId("rc"),
    name: String(input.name || "").trim(),
    phone: String(input.phone || "").trim(),
    address: String(input.address || "").trim(),
    note: String(input.note || "").trim(),
    status: input.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
  };
}

export function normalizeCustomerPayment(input) {
  return {
    id: input.id || createId("customer-payment"),
    customerId: String(input.customerId || "").trim(),
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
