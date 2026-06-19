import { useEffect, useState } from 'react';
import { createId, todayISO, toPieces } from '../../../utils/calculations.js';

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

export function usePurchaseReceiptFormViewModel({ purchaseReceipt, products }) {
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
        };
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
    return { ...row, quantityNumber, purchasePriceNumber, lineDiscountNumber, lineGross, lineTotal };
  });

  const grossTotal = lineRows.reduce((sum, row) => sum + row.lineGross, 0);
  const lineDiscountTotal = lineRows.reduce((sum, row) => sum + row.lineDiscountNumber, 0);
  const discount = Math.max(0, Number(discountInput || 0));
  const totalAmount = Math.max(0, grossTotal - lineDiscountTotal - discount);
  const paidAmountRaw = Math.max(0, Number(paidAmountInput || 0));
  const paidAmount = Math.min(paidAmountRaw, totalAmount);
  const dueAmount = totalAmount - paidAmount;

  useEffect(() => {
    const currentValue = Number(paidAmountInput || 0);
    if (Number.isFinite(currentValue) && currentValue > totalAmount) {
      setPaidAmountInputState(String(totalAmount));
    }
  }, [paidAmountInput, totalAmount]);

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

  const hasValidItems = lineRows.some((row) => row.productId && row.quantityNumber > 0);
  const hasInvalidItems = lineRows.some((row) => !row.productId || row.quantityNumber <= 0 || row.purchasePriceNumber < 0);

  function buildPayload() {
    return {
      id: purchaseReceipt?.id,
      supplierId,
      supplierInvoiceNo: supplierInvoiceNo.trim(),
      purchaseDate,
      items: lineRows
        .filter((row) => row.productId)
        .map((row) => ({
          id: row.existingId || undefined,
          productId: row.productId,
          productName: row.productName,
          quantityPieces: row.quantityNumber,
          purchasePrice: row.purchasePriceNumber,
          lineDiscount: row.lineDiscountNumber,
        })),
      discount,
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
    lineRows,
    addItem,
    updateItem,
    removeItem,
    getAvailableProducts,
    discountInput,
    setDiscountInput,
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
