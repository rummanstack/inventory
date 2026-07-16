import { useState } from 'react';
import { inventoryApi } from '../../../../services/inventoryApi';
import { todayISO } from '../../../../utils/calculations.js';
import { useQueryClient } from '@tanstack/react-query';
import { getActiveTenantId } from '../../../../services/api/client.js';
import { transactionKeys } from '../../../transactions/queries/transactionQueries.js';

export function useSalesReturnFormViewModel() {
  const queryClient = useQueryClient();
  const [invoiceNumberInput, setInvoiceNumberInput] = useState('');
  const [salesInvoiceId, setSalesInvoiceId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [returnDate, setReturnDate] = useState(todayISO());
  const [refundMethod, setRefundMethod] = useState('DUE_ADJUSTMENT');
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
      const tenantId = getActiveTenantId() || 'session-tenant';
      const result = await queryClient.fetchQuery({
        queryKey: transactionKeys.lookup(tenantId, 'sales-invoice-number', trimmed.toLowerCase()),
        queryFn: () => inventoryApi.listSalesInvoices({ invoiceNumber: trimmed, page: 1, pageSize: 1 }),
        staleTime: 30_000,
      });
      const match = (result.items || []).find((invoice) => invoice.invoiceNumber.toLowerCase() === trimmed.toLowerCase()) || result.items?.[0];
      if (!match) {
        setLoadError('notFound');
        return;
      }

      const detail = await queryClient.fetchQuery({
        queryKey: transactionKeys.detail(tenantId, 'sales-invoice', match.id),
        queryFn: () => inventoryApi.getSalesInvoice(match.id),
        staleTime: 30_000,
      });
      const invoice = detail.invoice;
      setSalesInvoiceId(invoice.id);
      setInvoiceNumber(invoice.invoiceNumber);
      setCustomerId(invoice.customerId || '');
      setCustomerName(invoice.customerName || '');
      setRefundMethod(Number(invoice.dueAmount || 0) > 0 ? 'DUE_ADJUSTMENT' : 'CASH');
      setItems((invoice.items || []).map((item) => ({
        rowId: item.id,
        salesInvoiceItemId: item.id,
        productId: item.productId,
        productName: item.productName,
        originalQuantity: item.quantityPieces,
        returnQuantity: 0,
        actualSalePrice: item.actualSalePrice,
        costPriceSnapshot: item.costPriceSnapshot,
        soldSerials: item.serials || [],
        serialRequired: (item.serials || []).length > 0,
        selectedSerialIds: [],
        condition: 'GOOD',
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

  function updateReturnCondition(rowId, condition) {
    setItems((current) => current.map((row) => (row.rowId === rowId ? { ...row, condition } : row)));
  }

  function toggleReturnSerial(rowId, serialId) {
    setItems((current) => current.map((row) => {
      if (row.rowId !== rowId) {
        return row;
      }

      const hasSerial = row.selectedSerialIds.includes(serialId);
      const selectedSerialIds = hasSerial
        ? row.selectedSerialIds.filter((id) => id !== serialId)
        : [...row.selectedSerialIds, serialId];
      return { ...row, selectedSerialIds };
    }));
  }

  const lineRows = items.map((row) => {
    const returnQuantityNumber = row.serialRequired
      ? row.selectedSerialIds.length
      : Math.max(0, Math.min(Math.floor(Number(row.returnQuantity || 0)), row.originalQuantity));
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
      refundMethod,
      items: lineRows
        .filter((row) => row.returnQuantityNumber > 0)
        .map((row) => ({
          salesInvoiceItemId: row.salesInvoiceItemId,
          productId: row.productId,
          productName: row.productName,
          quantityPieces: row.returnQuantityNumber,
          actualSalePrice: row.actualSalePrice,
          costPriceSnapshot: row.costPriceSnapshot,
          condition: row.condition,
          serialIds: row.selectedSerialIds,
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
    refundMethod,
    setRefundMethod,
    lineRows,
    updateReturnQuantity,
    updateReturnCondition,
    toggleReturnSerial,
    totalAmount,
    hasValidItems,
    note,
    setNote,
    buildPayload,
  };
}
