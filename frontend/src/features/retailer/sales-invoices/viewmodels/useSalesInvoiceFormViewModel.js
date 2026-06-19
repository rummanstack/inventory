import { useEffect, useState } from 'react';
import { createId, todayISO } from '../../../../utils/calculations.js';

function priceForProduct(product, saleType) {
  if (!product) return 0;
  return saleType === 'WHOLESALE' ? Number(product.wholesalePrice || 0) : Number(product.retailPrice || 0);
}

export function useSalesInvoiceFormViewModel({ products, defaultSaleType = 'RETAIL', defaultCustomerType = 'WALK_IN', defaultTaxRate = 0 }) {
  const [customerId, setCustomerId] = useState('');
  const [customerType, setCustomerType] = useState(defaultCustomerType);
  const [saleType, setSaleType] = useState(defaultSaleType);
  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [items, setItems] = useState([]);
  const [discountInput, setDiscountInput] = useState('0');
  const [taxRateInput, setTaxRateInputState] = useState(String(Math.min(Math.max(0, Number(defaultTaxRate || 0)), 100)));
  const [paidAmountInput, setPaidAmountInputState] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [note, setNote] = useState('');

  function changeSaleType(nextSaleType) {
    setSaleType(nextSaleType);
    setItems((current) => current.map((row) => {
      const product = products.find((candidate) => candidate.id === row.productId);
      return product ? { ...row, actualSalePrice: priceForProduct(product, nextSaleType) } : row;
    }));
  }

  function changeCustomerType(nextCustomerType) {
    setCustomerType(nextCustomerType);
    if (nextCustomerType === 'WALK_IN') {
      setCustomerId('');
    }
  }

  function addItem() {
    const nextProduct = products.find((product) => !items.some((row) => row.productId === product.id)) || products[0];
    if (!nextProduct) {
      return;
    }

    setItems((current) => [
      ...current,
      {
        rowId: createId('sales-item'),
        productId: nextProduct.id,
        productName: nextProduct.name,
        quantityPieces: '',
        actualSalePrice: priceForProduct(nextProduct, saleType),
        lineDiscount: 0,
        availableStock: Number(nextProduct.stockPieces || 0),
      },
    ]);
  }

  function updateItem(rowId, field, value) {
    setItems((current) => current.map((row) => {
      if (row.rowId !== rowId) {
        return row;
      }

      if (field === 'productId') {
        const product = products.find((candidate) => candidate.id === value);
        if (!product) {
          return row;
        }

        return {
          ...row,
          productId: product.id,
          productName: product.name,
          actualSalePrice: priceForProduct(product, saleType),
          availableStock: Number(product.stockPieces || 0),
        };
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

  function getAvailableProducts(rowId) {
    const selectedProductIds = new Set(items.filter((row) => row.rowId !== rowId).map((row) => row.productId));
    const currentProductId = items.find((row) => row.rowId === rowId)?.productId;
    return products.filter((product) => !selectedProductIds.has(product.id) || currentProductId === product.id);
  }

  const lineRows = items.map((row) => {
    const quantityNumber = Math.max(0, Math.floor(Number(row.quantityPieces || 0)));
    const actualSalePriceNumber = Math.max(0, Number(row.actualSalePrice || 0));
    const lineDiscountNumber = Math.max(0, Number(row.lineDiscount || 0));
    const lineGross = quantityNumber * actualSalePriceNumber;
    const lineTotal = Math.max(0, lineGross - lineDiscountNumber);
    return { ...row, quantityNumber, actualSalePriceNumber, lineDiscountNumber, lineGross, lineTotal };
  });

  const subtotal = lineRows.reduce((sum, row) => sum + row.lineGross, 0);
  const lineDiscountTotal = lineRows.reduce((sum, row) => sum + row.lineDiscountNumber, 0);
  const maxDiscount = Math.max(0, subtotal - lineDiscountTotal);
  const discountRaw = Math.max(0, Number(discountInput || 0));
  const discount = Math.min(discountRaw, maxDiscount);
  const taxableAmount = Math.max(0, subtotal - lineDiscountTotal - discount);
  const taxRate = Math.min(Math.max(0, Number(taxRateInput || 0)), 100);
  const taxAmount = Math.max(0, taxableAmount * taxRate / 100);
  const totalAmount = Math.max(0, taxableAmount + taxAmount);
  const paidAmountRaw = Math.max(0, Number(paidAmountInput || 0));
  const paidAmount = Math.min(paidAmountRaw, totalAmount);
  const dueAmount = totalAmount - paidAmount;

  useEffect(() => {
    const currentValue = Number(discountInput || 0);
    if (Number.isFinite(currentValue) && currentValue > maxDiscount) {
      setDiscountInput(String(maxDiscount));
    }
  }, [discountInput, maxDiscount]);

  useEffect(() => {
    const currentValue = Number(taxRateInput || 0);
    if (Number.isFinite(currentValue) && currentValue > 100) {
      setTaxRateInputState('100');
    }
  }, [taxRateInput]);

  useEffect(() => {
    const currentValue = Number(paidAmountInput || 0);
    if (Number.isFinite(currentValue) && currentValue > totalAmount) {
      setPaidAmountInputState(String(totalAmount));
    }
  }, [paidAmountInput, totalAmount]);

  useEffect(() => {
    setItems((current) => {
      let changed = false;
      const next = current.map((row) => {
        const quantityNumber = Math.max(0, Math.floor(Number(row.quantityPieces || 0)));
        const actualSalePriceNumber = Math.max(0, Number(row.actualSalePrice || 0));
        const maxLineDiscount = quantityNumber * actualSalePriceNumber;
        const currentDiscount = Math.max(0, Number(row.lineDiscount || 0));
        const lineDiscount = Math.min(currentDiscount, maxLineDiscount);
        if (lineDiscount !== currentDiscount) {
          changed = true;
          return { ...row, lineDiscount };
        }
        return row;
      });
      return changed ? next : current;
    });
  }, [items]);

  const hasValidItems = lineRows.some((row) => row.productId && row.quantityNumber > 0);
  const hasInvalidItems = lineRows.some((row) => {
    if (!row.productId || row.quantityNumber <= 0 || row.actualSalePriceNumber < 0) {
      return true;
    }
    return row.quantityNumber > Number(row.availableStock || 0);
  });

  function markFullyPaid() {
    setPaidAmountInputState(String(totalAmount));
  }

  function setDiscountValue(nextValue) {
    if (nextValue === '') {
      setDiscountInput('');
      return;
    }

    const numericValue = Number(nextValue);
    if (!Number.isFinite(numericValue)) {
      setDiscountInput(String(nextValue));
      return;
    }

    setDiscountInput(String(Math.min(Math.max(0, numericValue), maxDiscount)));
  }

  function setTaxRateInput(nextValue) {
    if (nextValue === '') {
      setTaxRateInputState('');
      return;
    }

    const numericValue = Number(nextValue);
    if (!Number.isFinite(numericValue)) {
      setTaxRateInputState(String(nextValue));
      return;
    }

    setTaxRateInputState(String(Math.min(Math.max(0, numericValue), 100)));
  }

  function setPaidAmountInput(nextValue) {
    if (nextValue === '') {
      setPaidAmountInputState('');
      return;
    }

    const numericValue = Number(nextValue);
    if (!Number.isFinite(numericValue)) {
      setPaidAmountInputState(String(nextValue));
      return;
    }

    setPaidAmountInputState(String(Math.min(Math.max(0, numericValue), totalAmount)));
  }

  function buildPayload() {
    return {
      customerId: customerType === 'REGISTERED' ? customerId || null : null,
      customerType,
      saleType,
      invoiceDate,
      items: lineRows
        .filter((row) => row.productId)
        .map((row) => ({
          productId: row.productId,
          productName: row.productName,
          quantityPieces: row.quantityNumber,
          actualSalePrice: row.actualSalePriceNumber,
          lineDiscount: row.lineDiscountNumber,
      })),
      discount,
      taxRate,
      taxAmount,
      paidAmount,
      paymentMethod,
      note: note.trim(),
    };
  }

  return {
    customerId,
    setCustomerId,
    customerType,
    setCustomerType: changeCustomerType,
    saleType,
    setSaleType: changeSaleType,
    invoiceDate,
    setInvoiceDate,
    lineRows,
    addItem,
    updateItem,
    removeItem,
    getAvailableProducts,
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
    lineDiscountTotal,
    discount,
    totalAmount,
    paidAmount,
    dueAmount,
    hasValidItems,
    hasInvalidItems,
    markFullyPaid,
    buildPayload,
  };
}
