import { useState } from 'react';
import { inventoryApi } from '../../../../services/inventoryApi';
import { todayISO } from '../../../../utils/calculations.js';

export function useSalesReturnFormViewModel() {
  const [invoiceNumberInput, setInvoiceNumberInput] = useState('');
  const [salesInvoiceId, setSalesInvoiceId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [returnDate, setReturnDate] = useState(todayISO());
  const [items, setItems] = useState([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  async function loadInvoice() {
    const trimmed = invoiceNumberInput.trim();
    if (!trimmed) return;

    setLoading(true);
    setLoadError('');
    try {
      const result = await inventoryApi.listSalesInvoices({ invoiceNumber: trimmed, page: 1, pageSize: 1 });
      const match = (result.items || []).find((invoice) => invoice.invoiceNumber.toLowerCase() === trimmed.toLowerCase()) || result.items?.[0];
      if (!match) {
        setLoadError('notFound');
        return;
      }

      const detail = await inventoryApi.getSalesInvoice(match.id);
      const invoice = detail.invoice;
      setSalesInvoiceId(invoice.id);
      setInvoiceNumber(invoice.invoiceNumber);
      setCustomerId(invoice.customerId || '');
      setCustomerName(invoice.customerName || '');
      setItems((invoice.items || []).map((item) => ({
        rowId: item.id,
        salesInvoiceItemId: item.id,
        productId: item.productId,
        productName: item.productName,
        originalQuantity: item.quantityPieces,
        returnQuantity: 0,
        actualSalePrice: item.actualSalePrice,
        costPriceSnapshot: item.costPriceSnapshot,
      })));
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function updateReturnQuantity(rowId, value) {
    setItems((current) => current.map((row) => (row.rowId === rowId ? { ...row, returnQuantity: value } : row)));
  }

  const lineRows = items.map((row) => {
    const returnQuantityNumber = Math.max(0, Math.min(Math.floor(Number(row.returnQuantity || 0)), row.originalQuantity));
    const lineTotal = returnQuantityNumber * Number(row.actualSalePrice || 0);
    return { ...row, returnQuantityNumber, lineTotal };
  });

  const totalAmount = lineRows.reduce((sum, row) => sum + row.lineTotal, 0);
  const hasValidItems = lineRows.some((row) => row.returnQuantityNumber > 0);

  function buildPayload() {
    return {
      salesInvoiceId: salesInvoiceId || null,
      customerId: customerId || null,
      returnDate,
      items: lineRows
        .filter((row) => row.returnQuantityNumber > 0)
        .map((row) => ({
          salesInvoiceItemId: row.salesInvoiceItemId,
          productId: row.productId,
          productName: row.productName,
          quantityPieces: row.returnQuantityNumber,
          actualSalePrice: row.actualSalePrice,
          costPriceSnapshot: row.costPriceSnapshot,
        })),
      note: note.trim(),
    };
  }

  return {
    invoiceNumberInput,
    setInvoiceNumberInput,
    loadInvoice,
    loading,
    loadError,
    salesInvoiceId,
    invoiceNumber,
    customerName,
    returnDate,
    setReturnDate,
    lineRows,
    updateReturnQuantity,
    totalAmount,
    hasValidItems,
    note,
    setNote,
    buildPayload,
  };
}
