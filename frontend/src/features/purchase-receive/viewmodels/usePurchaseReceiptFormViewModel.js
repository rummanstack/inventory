import { useEffect, useState } from 'react';
import { createId, todayISO, toPieces } from '../../../utils/calculations.js';

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

function toLineItemRow(item, products) {
  const product = products.find((candidate) => candidate.id === item.productId);
  const piecesPerCase = Math.max(1, Number(item.piecesPerCase || product?.piecesPerCase || 1));
  const totalPieces = Math.max(0, Number(item.quantityPieces || 0));
  return {
    rowId: item.id || createId('purchase-item'),
    existingId: item.id || null,
    productId: item.productId || '',
    productName: item.productName || product?.name || '',
    piecesPerCase,
    caseQty: totalPieces ? Math.floor(totalPieces / piecesPerCase) : '',
    pieceQty: totalPieces ? totalPieces % piecesPerCase : '',
    purchasePrice: item.purchasePrice ?? (product?.purchasePrice ?? 0),
    lineDiscount: item.lineDiscount ?? 0,
  };
}

export function usePurchaseReceiptFormViewModel({ purchaseReceipt, products, defaultTaxRate = 0 }) {
  const isEdit = Boolean(purchaseReceipt);

  const [supplierId, setSupplierId] = useState(purchaseReceipt?.supplierId || '');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState(purchaseReceipt?.supplierInvoiceNo || '');
  const [purchaseDate, setPurchaseDate] = useState(purchaseReceipt?.purchaseDate || todayISO());
  const [items, setItems] = useState(() => (
    purchaseReceipt?.items?.length
      ? purchaseReceipt.items.map((item) => toLineItemRow(item, products))
      : []
  ));
  const [discountInput, setDiscountInput] = useState(String(Number(purchaseReceipt?.discount || 0)));
  const [taxRateInput, setTaxRateInputState] = useState(String(Number(purchaseReceipt?.taxRate ?? defaultTaxRate ?? 0)));
  const [paidAmountInput, setPaidAmountInputState] = useState(String(Number(purchaseReceipt?.paidAmount || 0)));
  const [paymentMethod, setPaymentMethod] = useState(purchaseReceipt?.paymentMethod || 'CASH');
  const [note, setNote] = useState(purchaseReceipt?.note || '');
  const [reasonInput, setReasonInput] = useState('');

  function addItem() {
    const nextProduct = products.find((product) => !items.some((row) => row.productId === product.id)) || products[0];
    if (!nextProduct) {
      return;
    }

    setItems((current) => [
      ...current,
      {
        rowId: createId('purchase-item'),
        existingId: null,
        productId: nextProduct.id,
        productName: nextProduct.name,
        piecesPerCase: Math.max(1, Number(nextProduct.piecesPerCase || 1)),
        caseQty: '',
        pieceQty: '',
        purchasePrice: Number(nextProduct.purchasePrice || 0),
        lineDiscount: 0,
        taxRate: taxRateForProduct(nextProduct, defaultTaxRate),
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
          piecesPerCase: Math.max(1, Number(product.piecesPerCase || 1)),
          purchasePrice: Number(product.purchasePrice || 0),
          taxRate: taxRateForProduct(product, defaultTaxRate),
        };
      }

      if (field === 'lineDiscount') {
        const quantityNumber = toPieces(row.caseQty, row.pieceQty, row.piecesPerCase);
        const purchasePriceNumber = Math.max(0, Number(row.purchasePrice || 0));
        const maxLineDiscount = quantityNumber * purchasePriceNumber;
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
    const quantityNumber = toPieces(row.caseQty, row.pieceQty, row.piecesPerCase);
    const purchasePriceNumber = Math.max(0, Number(row.purchasePrice || 0));
    const lineDiscountNumber = Math.max(0, Number(row.lineDiscount || 0));
    const lineGross = quantityNumber * purchasePriceNumber;
    const lineTotal = Math.max(0, lineGross - lineDiscountNumber);
    const taxRate = Math.min(Math.max(0, Number(row.taxRate || 0)), 100);
    return { ...row, quantityNumber, purchasePriceNumber, lineDiscountNumber, lineGross, lineTotal, taxRate };
  });

  const grossTotal = lineRows.reduce((sum, row) => sum + row.lineGross, 0);
  const lineDiscountTotal = lineRows.reduce((sum, row) => sum + row.lineDiscountNumber, 0);
  const maxDiscount = Math.max(0, grossTotal - lineDiscountTotal);
  const discountRaw = Math.max(0, Number(discountInput || 0));
  const discount = Math.min(discountRaw, maxDiscount);
  const taxSummary = summarizeTaxes(lineRows, discount);
  const taxedLineRows = taxSummary.nextRows;
  const taxableAmount = taxSummary.taxableAmount;
  const taxRate = taxSummary.taxRate;
  const taxAmount = taxSummary.taxAmount;
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
        const quantityNumber = toPieces(row.caseQty, row.pieceQty, row.piecesPerCase);
        const purchasePriceNumber = Math.max(0, Number(row.purchasePrice || 0));
        const maxLineDiscount = quantityNumber * purchasePriceNumber;
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

  const hasValidItems = lineRows.some((row) => row.productId && row.quantityNumber > 0);
  const hasInvalidItems = lineRows.some((row) => !row.productId || row.quantityNumber <= 0 || row.purchasePriceNumber < 0);

  function buildPayload() {
    return {
      id: purchaseReceipt?.id,
      supplierId,
      supplierInvoiceNo: supplierInvoiceNo.trim(),
      purchaseDate,
      items: taxedLineRows
        .filter((row) => row.productId)
        .map((row) => ({
          id: row.existingId || undefined,
          productId: row.productId,
          productName: row.productName,
          quantityPieces: row.quantityNumber,
          purchasePrice: row.purchasePriceNumber,
          lineDiscount: row.lineDiscountNumber,
          taxRate: row.taxRate,
          taxAmount: row.taxAmount,
      })),
      discount,
      taxRate,
      taxAmount,
      paidAmount,
      paymentMethod,
      note: note.trim(),
      ...(isEdit ? { reason: reasonInput.trim() } : {}),
    };
  }

  return {
    isEdit,
    supplierId,
    setSupplierId,
    supplierInvoiceNo,
    setSupplierInvoiceNo,
    purchaseDate,
    setPurchaseDate,
    lineRows: taxedLineRows,
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
    reasonInput,
    setReasonInput,
    grossTotal,
    lineDiscountTotal,
    discount,
    totalAmount,
    paidAmount,
    dueAmount,
    hasValidItems,
    hasInvalidItems,
    buildPayload,
  };
}
