import { useEffect, useState } from 'react';
import { createId, todayISO } from '../../../../utils/calculations.js';

function formatPromotionPrice(basePrice, promotion) {
  const price = Number(basePrice || 0);
  const discountValue = Math.max(0, Number(promotion?.discountValue || 0));
  if (!promotion || promotion.discountType === 'FIXED') {
    return Math.max(0, price - discountValue);
  }
  return Math.max(0, price * (1 - Math.min(100, discountValue) / 100));
}

function isPromotionActive(promotion, invoiceDate, saleType, product, quantityPieces, lineSubtotal) {
  if (!promotion || promotion.active === false) return false;
  if (promotion.level !== 'LINE') return false;
  if (promotion.saleType !== 'ALL') {
    const saleTypeMatches = saleType === 'QUICK_SALE'
      ? promotion.saleType === 'RETAIL' || promotion.saleType === 'QUICK_SALE'
      : promotion.saleType === saleType;
    if (!saleTypeMatches) return false;
  }
  const date = String(invoiceDate || '').slice(0, 10);
  const start = promotion.startDate ? String(promotion.startDate).slice(0, 10) : '';
  const end = promotion.endDate ? String(promotion.endDate).slice(0, 10) : '';
  if (start && date < start) return false;
  if (end && date > end) return false;
  if (promotion.minQuantity && quantityPieces < Number(promotion.minQuantity || 0)) return false;
  if (promotion.minSubtotal && lineSubtotal < Number(promotion.minSubtotal || 0)) return false;
  if (promotion.targetType === 'ALL') return true;
  if (promotion.targetType === 'PRODUCT') return promotion.targetId === product?.id;
  if (promotion.targetType === 'CATEGORY') return promotion.targetId === product?.categoryId;
  return false;
}

function bestPromotionForProduct(promotions, product, saleType, invoiceDate, quantityPieces = 1, lineSubtotal = 0) {
  if (saleType === 'WHOLESALE') return null;
  return promotions
    .filter((p) => isPromotionActive(p, invoiceDate, saleType, product, quantityPieces, lineSubtotal))
    .sort((a, b) => {
      const pd = Number(a.priority || 0) - Number(b.priority || 0);
      if (pd !== 0) return pd;
      const basePrice = Number(product?.retailPrice || 0);
      const da = a.discountType === 'FIXED' ? Number(a.discountValue || 0) : basePrice * Math.min(100, Number(a.discountValue || 0)) / 100;
      const db = b.discountType === 'FIXED' ? Number(b.discountValue || 0) : basePrice * Math.min(100, Number(b.discountValue || 0)) / 100;
      return db - da;
    })[0] || null;
}

function priceAndPromotionForProduct(product, saleType, invoiceDate, promotions = [], quantityPieces = 1) {
  if (!product) return { price: 0, originalPrice: 0, promotion: null };
  if (saleType === 'WHOLESALE') {
    const p = Number(product.wholesalePrice || 0);
    return { price: p, originalPrice: p, promotion: null };
  }
  const originalPrice = Number(product.retailPrice || 0);
  const qty = Number(quantityPieces) || 1;
  const promotion = bestPromotionForProduct(promotions, product, saleType, invoiceDate, qty, originalPrice * Math.max(1, qty));
  const price = promotion ? Math.min(originalPrice, formatPromotionPrice(originalPrice, promotion)) : originalPrice;
  return { price, originalPrice, promotion };
}

function taxRateForProduct(product, defaultTaxRate) {
  return Math.min(Math.max(0, Number(product?.taxRate ?? defaultTaxRate ?? 0)), 100);
}

function summarizeTaxes(lineRows, discount) {
  const gross = lineRows.reduce((sum, row) => sum + row.lineTotal, 0);
  const discountBase = Math.max(0, Number(discount || 0));
  let totalTaxAmount = 0;
  const nextRows = lineRows.map((row) => {
    const discountShare = gross > 0 ? discountBase * (row.lineTotal / gross) : 0;
    const taxableLine = Math.max(0, row.lineTotal - discountShare);
    const taxAmount = Math.max(0, taxableLine * row.taxRate / 100);
    totalTaxAmount += taxAmount;
    return { ...row, taxAmount };
  });
  const taxableAmount = Math.max(0, gross - discountBase);
  const totalAmount = Math.max(0, taxableAmount + totalTaxAmount);
  const taxRate = taxableAmount > 0 ? Math.min(Math.max(0, (totalTaxAmount / taxableAmount) * 100), 100) : 0;
  return { nextRows, taxableAmount, taxAmount: totalTaxAmount, totalAmount, taxRate };
}

export function useSalesInvoiceFormViewModel({
  products,
  promotions = [],
  retailCustomers = [],
  defaultSaleType = 'RETAIL',
  defaultCustomerType = 'WALK_IN',
  defaultTaxRate = 0,
  loyaltyEnabled = false,
  loyaltyPointsPer100 = 1,
  loyaltyPointValue = 1,
}) {
  const [customerId, setCustomerId] = useState('');
  const [customerType, setCustomerType] = useState(defaultCustomerType);
  const [saleType, setSaleType] = useState(defaultSaleType);
  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [items, setItems] = useState([]);
  const [discountInput, setDiscountInput] = useState('0');
  const [taxRateInput, setTaxRateInputState] = useState(String(Math.min(Math.max(0, Number(defaultTaxRate || 0)), 100)));
  const [paidAmountInput, setPaidAmountInputState] = useState('0');
  const [loyaltyRedeemPointsInput, setLoyaltyRedeemPointsInputState] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [note, setNote] = useState('');
  const [prescriptionNumber, setPrescriptionNumber] = useState('');
  const selectedCustomer = customerId ? retailCustomers.find((c) => c.id === customerId) : null;

  function changeSaleType(nextSaleType) {
    setSaleType(nextSaleType);
    setItems((current) => current.map((row) => {
      const product = products.find((c) => c.id === row.productId);
      if (!product) return row;
      const { price, originalPrice, promotion } = priceAndPromotionForProduct(product, nextSaleType, invoiceDate, promotions, row.quantityPieces);
      return { ...row, actualSalePrice: price, originalPrice, appliedPromotion: promotion };
    }));
  }

  function changeInvoiceDate(nextDate) {
    setInvoiceDate(nextDate);
    setItems((current) => current.map((row) => {
      const product = products.find((c) => c.id === row.productId);
      if (!product) return row;
      const { price, originalPrice, promotion } = priceAndPromotionForProduct(product, saleType, nextDate, promotions, row.quantityPieces);
      return { ...row, actualSalePrice: price, originalPrice, appliedPromotion: promotion };
    }));
  }

  function changeCustomerType(nextCustomerType) {
    setCustomerType(nextCustomerType);
    if (nextCustomerType === 'WALK_IN') {
      setCustomerId('');
      setLoyaltyRedeemPointsInputState('0');
    }
  }

  function changeCustomerId(nextCustomerId) {
    setCustomerId(nextCustomerId);
    if (!nextCustomerId) setLoyaltyRedeemPointsInputState('0');
  }

  useEffect(() => {
    setItems((current) => current.map((row) => {
      const product = products.find((c) => c.id === row.productId);
      if (!product) return row;
      const { price, originalPrice, promotion } = priceAndPromotionForProduct(product, saleType, invoiceDate, promotions, row.quantityPieces);
      return { ...row, actualSalePrice: price, originalPrice, appliedPromotion: promotion };
    }));
  }, [promotions, products, saleType, invoiceDate]);

  function addItem() {
    if (!products.length) return;
    setItems((current) => [
      ...current,
      {
        rowId: createId('sales-item'),
        productId: '',
        productName: '',
        quantityPieces: '',
        actualSalePrice: 0,
        originalPrice: 0,
        appliedPromotion: null,
        lineDiscount: 0,
        availableStock: 0,
        taxRate: defaultTaxRate,
        serialRequired: false,
        serialIds: [],
      },
    ]);
  }

  function updateItem(rowId, field, value) {
    setItems((current) => current.map((row) => {
      if (row.rowId !== rowId) return row;

      if (field === 'productId') {
        const product = products.find((c) => c.id === value);
        if (!product) return row;
        const { price, originalPrice, promotion } = priceAndPromotionForProduct(product, saleType, invoiceDate, promotions, row.quantityPieces);
        return {
          ...row,
          productId: product.id,
          productName: product.name,
          actualSalePrice: price,
          originalPrice,
          appliedPromotion: promotion,
          availableStock: Number(product.stockPieces || 0),
          taxRate: taxRateForProduct(product, defaultTaxRate),
          serialRequired: Boolean(product.serialRequired),
          serialIds: [],
        };
      }

      if (field === 'quantityPieces') {
        const product = products.find((c) => c.id === row.productId);
        if (!product) return { ...row, quantityPieces: value };
        const { price, originalPrice, promotion } = priceAndPromotionForProduct(product, saleType, invoiceDate, promotions, value);
        return { ...row, quantityPieces: value, actualSalePrice: price, originalPrice, appliedPromotion: promotion };
      }

      if (field === 'actualSalePrice') {
        // Manual price override clears the promo indicator so the badge doesn't mislead
        return { ...row, actualSalePrice: value, originalPrice: Number(value || 0), appliedPromotion: null };
      }

      if (field === 'lineDiscount') {
        const quantityNumber = Math.max(0, Math.floor(Number(row.quantityPieces || 0)));
        const actualSalePriceNumber = Math.max(0, Number(row.actualSalePrice || 0));
        const maxLineDiscount = quantityNumber * actualSalePriceNumber;
        const numericValue = Number(value);
        const nextValue = Number.isFinite(numericValue) ? Math.min(Math.max(0, numericValue), maxLineDiscount) : value;
        return { ...row, [field]: nextValue };
      }

      return { ...row, [field]: value };
    }));
  }

  function removeItem(rowId) {
    setItems((current) => current.filter((row) => row.rowId !== rowId));
  }

  function toggleItemSerial(rowId, serialId) {
    setItems((current) => current.map((row) => {
      if (row.rowId !== rowId) return row;
      const hasSerial = row.serialIds.includes(serialId);
      const nextSerialIds = hasSerial ? row.serialIds.filter((id) => id !== serialId) : [...row.serialIds, serialId];
      const product = products.find((c) => c.id === row.productId);
      if (!product) return { ...row, serialIds: nextSerialIds, quantityPieces: nextSerialIds.length };
      const { price, originalPrice, promotion } = priceAndPromotionForProduct(product, saleType, invoiceDate, promotions, nextSerialIds.length);
      return { ...row, serialIds: nextSerialIds, quantityPieces: nextSerialIds.length, actualSalePrice: price, originalPrice, appliedPromotion: promotion };
    }));
  }

  function getAvailableProducts(rowId) {
    const selectedProductIds = new Set(items.filter((row) => row.rowId !== rowId).map((row) => row.productId));
    const currentProductId = items.find((row) => row.rowId === rowId)?.productId;
    return products.filter((product) => !selectedProductIds.has(product.id) || currentProductId === product.id);
  }

  // Exposed so the product picker can show promo badges before selection
  function getBestPromotion(product, qty = 1) {
    if (!product) return null;
    const retailPrice = Number(product.retailPrice || 0);
    return bestPromotionForProduct(promotions, product, saleType, invoiceDate, qty, retailPrice * Math.max(1, qty));
  }

  const lineRows = items.map((row) => {
    const quantityNumber = Math.max(0, Math.floor(Number(row.quantityPieces || 0)));
    const actualSalePriceNumber = Math.max(0, Number(row.actualSalePrice || 0));
    const originalPrice = Math.max(0, Number(row.originalPrice !== undefined ? row.originalPrice : actualSalePriceNumber));
    const appliedPromotion = row.appliedPromotion || null;
    const lineDiscountNumber = Math.max(0, Number(row.lineDiscount || 0));
    const lineGross = quantityNumber * actualSalePriceNumber;
    const lineTotal = Math.max(0, lineGross - lineDiscountNumber);
    const taxRate = Math.min(Math.max(0, Number(row.taxRate || 0)), 100);
    const promotionSaving = Math.max(0, (originalPrice - actualSalePriceNumber) * quantityNumber);
    return { ...row, quantityNumber, actualSalePriceNumber, originalPrice, appliedPromotion, lineDiscountNumber, lineGross, lineTotal, taxRate, promotionSaving };
  });

  const subtotal = lineRows.reduce((sum, row) => sum + row.lineGross, 0);
  const lineDiscountTotal = lineRows.reduce((sum, row) => sum + row.lineDiscountNumber, 0);
  const promotionSavingsTotal = lineRows.reduce((sum, row) => sum + row.promotionSaving, 0);
  // originalSubtotal = what the lines would cost without any promotions (display only)
  const originalSubtotal = subtotal + promotionSavingsTotal;
  const maxDiscount = Math.max(0, subtotal - lineDiscountTotal);
  const discountRaw = Math.max(0, Number(discountInput || 0));
  const discount = Math.min(discountRaw, maxDiscount);
  const taxSummary = summarizeTaxes(lineRows, discount);
  const taxedLineRows = taxSummary.nextRows;
  const taxableAmount = taxSummary.taxableAmount;
  const taxRate = taxSummary.taxRate;
  const taxAmount = taxSummary.taxAmount;
  const totalAmount = Math.max(0, taxableAmount + taxAmount);
  const loyaltyEligible = Boolean(loyaltyEnabled && customerType === 'REGISTERED' && selectedCustomer && saleType !== 'WHOLESALE');
  const loyaltyCustomerBalance = Math.max(0, Number(selectedCustomer?.loyaltyPointsBalance || 0));
  const loyaltyPointsPer100Rate = Math.max(0, Number(loyaltyPointsPer100 || 0));
  const loyaltyPointCashValue = Math.max(0, Number(loyaltyPointValue || 0));
  const loyaltyRedeemPointsRaw = Math.max(0, Math.floor(Number(loyaltyRedeemPointsInput || 0)));
  const loyaltyRedeemPoints = loyaltyEligible ? Math.min(loyaltyRedeemPointsRaw, loyaltyCustomerBalance) : 0;
  const loyaltyRedeemAmount = loyaltyEligible ? Math.min(totalAmount, loyaltyRedeemPoints * loyaltyPointCashValue) : 0;
  const netTotalAfterLoyalty = Math.max(0, totalAmount - loyaltyRedeemAmount);
  const paidAmountRaw = Math.max(0, Number(paidAmountInput || 0));
  const paidAmount = Math.min(paidAmountRaw, netTotalAfterLoyalty);
  const dueAmount = netTotalAfterLoyalty - paidAmount;
  const loyaltyPointsEarned = loyaltyEligible ? Math.floor((paidAmount * loyaltyPointsPer100Rate) / 100) : 0;

  useEffect(() => {
    const currentValue = Number(discountInput || 0);
    if (Number.isFinite(currentValue) && currentValue > maxDiscount) setDiscountInput(String(maxDiscount));
  }, [discountInput, maxDiscount]);

  useEffect(() => {
    const currentValue = Number(taxRateInput || 0);
    if (Number.isFinite(currentValue) && currentValue > 100) setTaxRateInputState('100');
  }, [taxRateInput]);

  useEffect(() => {
    const currentValue = Number(paidAmountInput || 0);
    if (Number.isFinite(currentValue) && currentValue > netTotalAfterLoyalty) setPaidAmountInputState(String(netTotalAfterLoyalty));
  }, [paidAmountInput, netTotalAfterLoyalty]);

  useEffect(() => {
    if (!loyaltyEligible) {
      if (loyaltyRedeemPointsInput !== '0') setLoyaltyRedeemPointsInputState('0');
      return;
    }
    const currentValue = Number(loyaltyRedeemPointsInput || 0);
    if (Number.isFinite(currentValue) && currentValue > loyaltyCustomerBalance) setLoyaltyRedeemPointsInputState(String(loyaltyCustomerBalance));
  }, [loyaltyEligible, loyaltyRedeemPointsInput, loyaltyCustomerBalance]);

  useEffect(() => {
    setItems((current) => {
      let changed = false;
      const next = current.map((row) => {
        const quantityNumber = Math.max(0, Math.floor(Number(row.quantityPieces || 0)));
        const actualSalePriceNumber = Math.max(0, Number(row.actualSalePrice || 0));
        const maxLineDiscount = quantityNumber * actualSalePriceNumber;
        const currentDiscount = Math.max(0, Number(row.lineDiscount || 0));
        const lineDiscount = Math.min(currentDiscount, maxLineDiscount);
        if (lineDiscount !== currentDiscount) { changed = true; return { ...row, lineDiscount }; }
        return row;
      });
      return changed ? next : current;
    });
  }, [items]);

  const hasValidItems = lineRows.some((row) => row.productId && row.quantityNumber > 0);
  const hasInvalidItems = lineRows.some((row) => {
    if (!row.productId || row.quantityNumber <= 0 || row.actualSalePriceNumber < 0) return true;
    if (row.serialRequired && row.serialIds.length !== row.quantityNumber) return true;
    return row.quantityNumber > Number(row.availableStock || 0);
  });

  function markFullyPaid() {
    setPaidAmountInputState(String(netTotalAfterLoyalty));
  }

  function setDiscountValue(nextValue) {
    if (nextValue === '') { setDiscountInput(''); return; }
    const numericValue = Number(nextValue);
    if (!Number.isFinite(numericValue)) { setDiscountInput(String(nextValue)); return; }
    setDiscountInput(String(Math.min(Math.max(0, numericValue), maxDiscount)));
  }

  function setTaxRateInput(nextValue) {
    if (nextValue === '') { setTaxRateInputState(''); return; }
    const numericValue = Number(nextValue);
    if (!Number.isFinite(numericValue)) { setTaxRateInputState(String(nextValue)); return; }
    setTaxRateInputState(String(Math.min(Math.max(0, numericValue), 100)));
  }

  function setPaidAmountInput(nextValue) {
    if (nextValue === '') { setPaidAmountInputState(''); return; }
    const numericValue = Number(nextValue);
    if (!Number.isFinite(numericValue)) { setPaidAmountInputState(String(nextValue)); return; }
    setPaidAmountInputState(String(Math.min(Math.max(0, numericValue), netTotalAfterLoyalty)));
  }

  function buildPayload() {
    return {
      customerId: customerType === 'REGISTERED' ? customerId || null : null,
      customerType,
      customerName: customerType === 'REGISTERED' ? (selectedCustomer?.name || '') : '',
      customerPhone: customerType === 'REGISTERED' ? (selectedCustomer?.phone || '') : '',
      saleType,
      invoiceDate,
      prescriptionNumber: prescriptionNumber.trim(),
      items: taxedLineRows
        .filter((row) => row.productId)
        .map((row) => ({
          productId: row.productId,
          productName: row.productName,
          quantityPieces: row.quantityNumber,
          actualSalePrice: row.actualSalePriceNumber,
          originalSalePrice: row.originalPrice > row.actualSalePriceNumber ? row.originalPrice : null,
          lineDiscount: row.lineDiscountNumber,
          taxRate: row.taxRate,
          taxAmount: row.taxAmount,
          serialIds: row.serialIds,
        })),
      discount,
      taxRate,
      taxAmount,
      paidAmount,
      loyaltyRedeemPoints,
      paymentMethod,
      note: note.trim(),
    };
  }

  return {
    customerId,
    setCustomerId: changeCustomerId,
    customerType,
    setCustomerType: changeCustomerType,
    saleType,
    setSaleType: changeSaleType,
    invoiceDate,
    setInvoiceDate: changeInvoiceDate,
    lineRows: taxedLineRows,
    addItem,
    updateItem,
    removeItem,
    toggleItemSerial,
    getAvailableProducts,
    getBestPromotion,
    discountInput,
    setDiscountInput: setDiscountValue,
    taxRateInput,
    setTaxRateInput,
    taxRate,
    taxableAmount,
    taxAmount,
    paidAmountInput,
    setPaidAmountInput,
    paymentMethod,
    setPaymentMethod,
    note,
    setNote,
    subtotal,
    originalSubtotal,
    lineDiscountTotal,
    promotionSavingsTotal,
    discount,
    totalAmount,
    netTotalAfterLoyalty,
    paidAmount,
    dueAmount,
    loyaltyEligible,
    selectedCustomer,
    loyaltyCustomerBalance,
    loyaltyRedeemPointsInput,
    setLoyaltyRedeemPointsInput: setLoyaltyRedeemPointsInputState,
    loyaltyRedeemPoints,
    loyaltyRedeemAmount,
    loyaltyPointsEarned,
    hasValidItems,
    hasInvalidItems,
    markFullyPaid,
    buildPayload,
    prescriptionNumber,
    setPrescriptionNumber,
  };
}
