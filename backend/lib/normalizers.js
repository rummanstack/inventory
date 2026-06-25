import { createId } from "./ids.js";
import { PRODUCT_SERIAL_STATUS_VALUES, PRODUCT_SERIAL_STATUSES } from "./productSerials.js";
import { WARRANTY_CLAIM_STATUS_VALUES, WARRANTY_CLAIM_STATUSES } from "./warrantyClaims.js";
import {
  REPAIR_JOB_STATUS_VALUES,
  REPAIR_JOB_STATUSES,
  REPAIR_JOB_APPROVAL_STATUS_VALUES,
  REPAIR_JOB_APPROVAL_STATUSES,
} from "./repairJobs.js";

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
    refundable:
      input.refundable === false ||
      String(input.refundable || "").trim().toLowerCase() === "false"
        ? false
        : true,
    taxRate: Math.min(Math.max(0, cleanMoney(input.taxRate)), 100),
    orderIndex:
      input.orderIndex !== undefined && input.orderIndex !== null && String(input.orderIndex).trim() !== ""
        ? cleanInteger(input.orderIndex)
        : null,
    reorderLevel:
      input.reorderLevel !== undefined && input.reorderLevel !== null && String(input.reorderLevel).trim() !== ""
        ? cleanInteger(input.reorderLevel)
        : null,
    sku: String(input.sku || "").trim(),
    barcode: String(input.barcode || "").trim(),
    brand: String(input.brand || "").trim(),
    model: String(input.model || "").trim(),
    serialRequired:
      input.serialRequired === true ||
      String(input.serialRequired || "").trim().toLowerCase() === "true"
        ? true
        : false,
    warrantyMonths: cleanInteger(input.warrantyMonths),
    status: input.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    description: String(input.description || "").trim(),
    imageUrl: String(input.imageUrl || "").trim() || null,
  };
}

export function normalizeProductSerial(input) {
  const status = PRODUCT_SERIAL_STATUS_VALUES.includes(String(input.status || "").trim().toUpperCase())
    ? String(input.status).trim().toUpperCase()
    : PRODUCT_SERIAL_STATUSES.IN_STOCK;

  return {
    id: input.id || createId("serial"),
    productId: String(input.productId || "").trim(),
    serialNumber: String(input.serialNumber || "").trim(),
    imei1: String(input.imei1 || "").trim(),
    imei2: String(input.imei2 || "").trim(),
    status,
    purchaseReceiptId: String(input.purchaseReceiptId || "").trim() || null,
    purchaseReceiptItemId: String(input.purchaseReceiptItemId || "").trim() || null,
    salesInvoiceId: String(input.salesInvoiceId || "").trim() || null,
    salesInvoiceItemId: String(input.salesInvoiceItemId || "").trim() || null,
    warrantyStartDate: String(input.warrantyStartDate || "").trim() || null,
    warrantyEndDate: String(input.warrantyEndDate || "").trim() || null,
  };
}

export function normalizeWarrantyClaim(input) {
  const status = WARRANTY_CLAIM_STATUS_VALUES.includes(String(input.status || "").trim().toUpperCase())
    ? String(input.status).trim().toUpperCase()
    : WARRANTY_CLAIM_STATUSES.RECEIVED;

  return {
    id: input.id || createId("warranty-claim"),
    customerId: String(input.customerId || "").trim() || null,
    salesInvoiceId: String(input.salesInvoiceId || "").trim() || null,
    salesInvoiceItemId: String(input.salesInvoiceItemId || "").trim() || null,
    productId: String(input.productId || "").trim(),
    productSerialId: String(input.productSerialId || "").trim() || null,
    problemNote: String(input.problemNote || "").trim(),
    receivedDate: String(input.receivedDate || "").trim(),
    status,
    supplierId: String(input.supplierId || "").trim() || null,
    resolutionNote: String(input.resolutionNote || "").trim(),
    repairJobId: String(input.repairJobId || "").trim() || null,
    rmaNumber: String(input.rmaNumber || "").trim(),
    sentToSupplierDate: String(input.sentToSupplierDate || "").trim() || null,
    receivedFromSupplierDate: String(input.receivedFromSupplierDate || "").trim() || null,
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

export function normalizeSr(input) {
  return {
    id: input.id || createId("sr"),
    name: String(input.name || "").trim(),
    phone: String(input.phone || "").trim(),
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

  const shopCollections = Array.isArray(input.shopCollections)
    ? input.shopCollections
        .map((sc) => ({
          shopId: String(sc.shopId || "").trim(),
          amount: cleanMoney(sc.amount),
          note: String(sc.note || "").trim(),
        }))
        .filter((sc) => sc.shopId && sc.amount > 0)
    : [];

  const srHandovers = Array.isArray(input.srHandovers)
    ? input.srHandovers
        .map((h) => ({
          srId: String(h.srId || "").trim(),
          srName: String(h.srName || "").trim(),
          amount: cleanMoney(h.amount),
          note: String(h.note || "").trim(),
        }))
        .filter((h) => h.srId && h.amount > 0)
    : [];

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
    shopCollections,
    srHandovers,
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

          const serials = Array.isArray(item.serials)
            ? [...new Set(item.serials.map((serial) => String(serial || "").trim()).filter(Boolean))]
            : [];

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
            serials,
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

export function normalizeSupplierDiscount(input) {
  return {
    id: input.id || createId("supplier-discount"),
    supplierId: String(input.supplierId || "").trim(),
    discountDate: String(input.discountDate || "").trim(),
    amount: Math.max(0, cleanMoney(input.amount)),
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
          const serialIds = Array.isArray(item.serialIds)
            ? [...new Set(item.serialIds.map((id) => String(id || "").trim()).filter(Boolean))]
            : [];

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
            serialIds,
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
    // Raw walk-in name/phone, used to populate customer_name_snapshot/customer_phone_snapshot
    // when there's no registered customer record to snapshot from. Distinct from mapSalesInvoice's
    // `customerName` (a live join), since this is the as-typed value at sale time.
    customerNameSnapshot: String(input.customerName || "").trim(),
    customerPhoneSnapshot: String(input.customerPhone || "").trim(),
  };
}

const RETURN_ITEM_CONDITIONS = ["GOOD", "DAMAGED", "WARRANTY"];

export function normalizeSalesReturn(input) {
  const items = Array.isArray(input.items)
    ? input.items
        .map((item) => {
          const quantityPieces = cleanInteger(item.quantityPieces);
          const actualSalePrice = cleanMoney(item.actualSalePrice);
          const costPriceSnapshot = cleanMoney(item.costPriceSnapshot);
          const lineTotal = quantityPieces * actualSalePrice;
          const condition = RETURN_ITEM_CONDITIONS.includes(String(item.condition || "").trim().toUpperCase())
            ? String(item.condition).trim().toUpperCase()
            : "GOOD";
          const serialIds = Array.isArray(item.serialIds)
            ? [...new Set(item.serialIds.map((id) => String(id || "").trim()).filter(Boolean))]
            : [];

          return {
            id: item.id || createId("sales-return-item"),
            salesInvoiceItemId: String(item.salesInvoiceItemId || "").trim() || null,
            productId: String(item.productId || "").trim(),
            productName: String(item.productName || "").trim(),
            quantityPieces,
            actualSalePrice,
            costPriceSnapshot,
            lineTotal,
            condition,
            serialIds,
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
    refundMethod: ["CASH", "DUE_ADJUSTMENT"].includes(String(input.refundMethod || "").trim().toUpperCase())
      ? String(input.refundMethod).trim().toUpperCase()
      : "DUE_ADJUSTMENT",
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

const PROMOTION_TARGET_TYPES = ["PRODUCT", "CATEGORY", "ALL"];
const PROMOTION_LEVELS = ["LINE"];
const PROMOTION_SALE_TYPES = ["ALL", "WHOLESALE", "RETAIL", "QUICK_SALE"];
const PROMOTION_DISCOUNT_TYPES = ["PERCENT", "FIXED"];

export function normalizeRetailPromotion(input) {
  const targetType = PROMOTION_TARGET_TYPES.includes(String(input.targetType || "").trim().toUpperCase())
    ? String(input.targetType).trim().toUpperCase()
    : "PRODUCT";
  const discountType = PROMOTION_DISCOUNT_TYPES.includes(String(input.discountType || "").trim().toUpperCase())
    ? String(input.discountType).trim().toUpperCase()
    : "PERCENT";
  const saleType = PROMOTION_SALE_TYPES.includes(String(input.saleType || "").trim().toUpperCase())
    ? String(input.saleType).trim().toUpperCase()
    : "ALL";
  const level = PROMOTION_LEVELS.includes(String(input.level || "").trim().toUpperCase())
    ? String(input.level).trim().toUpperCase()
    : "LINE";

  return {
    id: input.id || createId("promo"),
    name: String(input.name || "").trim(),
    description: String(input.description || "").trim(),
    active:
      input.active === false ||
      String(input.active || "").trim().toLowerCase() === "false"
        ? false
        : true,
    level,
    targetType,
    targetId: String(input.targetId || "").trim() || null,
    saleType,
    discountType,
    discountValue: Math.max(0, cleanMoney(input.discountValue)),
    minQuantity: cleanInteger(input.minQuantity),
    minSubtotal: Math.max(0, cleanMoney(input.minSubtotal)),
    startDate: String(input.startDate || "").trim() || null,
    endDate: String(input.endDate || "").trim() || null,
    priority: cleanInteger(input.priority) || 100,
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

export function normalizeRepairJob(input) {
  const status = REPAIR_JOB_STATUS_VALUES.includes(String(input.status || "").trim().toUpperCase())
    ? String(input.status).trim().toUpperCase()
    : REPAIR_JOB_STATUSES.RECEIVED;

  const approvalStatus = REPAIR_JOB_APPROVAL_STATUS_VALUES.includes(
    String(input.approvalStatus || "").trim().toUpperCase(),
  )
    ? String(input.approvalStatus).trim().toUpperCase()
    : REPAIR_JOB_APPROVAL_STATUSES.PENDING;

  return {
    id: input.id || createId("repair-job"),
    customerName: String(input.customerName || "").trim(),
    customerPhone: String(input.customerPhone || "").trim(),
    deviceName: String(input.deviceName || "").trim(),
    productId: String(input.productId || "").trim() || null,
    serialNumber: String(input.serialNumber || "").trim(),
    problemDescription: String(input.problemDescription || "").trim(),
    estimatedCost: Math.max(0, cleanMoney(input.estimatedCost)),
    laborCost: Math.max(0, cleanMoney(input.laborCost)),
    actualCost: Math.max(0, cleanMoney(input.actualCost)),
    partsUsed: String(input.partsUsed || "").trim(),
    technicianId: String(input.technicianId || "").trim() || null,
    status,
    approvalStatus,
    receivedDate: String(input.receivedDate || "").trim(),
    promisedDate: String(input.promisedDate || "").trim() || null,
    deliveredDate: String(input.deliveredDate || "").trim() || null,
    resolutionNote: String(input.resolutionNote || "").trim(),
  };
}

export function normalizeQuotationItem(input) {
  const quantity = Math.max(0.001, cleanMoney(input.quantity));
  const unitPrice = Math.max(0, cleanMoney(input.unitPrice));
  const discountAmount = Math.max(0, cleanMoney(input.discountAmount));
  const lineTotal = Math.max(0, quantity * unitPrice - discountAmount);
  return {
    id: input.id || createId("quot-item"),
    productId: String(input.productId || "").trim() || null,
    productName: String(input.productName || "").trim(),
    quantity,
    unitPrice,
    discountAmount,
    lineTotal,
  };
}

export function finalizeSettlementAmounts(base, previousDue) {
  const normalizedPreviousDue = Math.max(0, cleanMoney(previousDue));
  const totalSrHandovers = (base.srHandovers || []).reduce((sum, h) => sum + Number(h.amount || 0), 0);
  const receivableTotal = Math.max(0, base.totalPayable + normalizedPreviousDue - base.discount - base.extraReturnValue - totalSrHandovers);
  const amountPaid = Math.min(Math.max(0, base.amountPaidInput), receivableTotal);

  return {
    ...base,
    previousDue: normalizedPreviousDue,
    totalSrHandovers,
    amountPaid,
    dueAmount: receivableTotal - amountPaid,
  };
}
