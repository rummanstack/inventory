import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { usePagedList } from '../../../hooks/usePagedList';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';

const SEARCH_DEBOUNCE_MS = 300;

export function usePurchaseReceiveViewModel() {
  const [supplierId, setSupplierId] = useState('');
  const [purchaseNumber, setPurchaseNumber] = useState('');
  const debouncedPurchaseNumber = useDebouncedValue(purchaseNumber.trim(), SEARCH_DEBOUNCE_MS);
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const debouncedSupplierInvoiceNo = useDebouncedValue(supplierInvoiceNo.trim(), SEARCH_DEBOUNCE_MS);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  const list = usePagedList(
    ({ page, pageSize }) => inventoryApi.listPurchaseReceipts({
      page,
      pageSize,
      supplierId: supplierId || undefined,
      purchaseNumber: debouncedPurchaseNumber || undefined,
      supplierInvoiceNo: debouncedSupplierInvoiceNo || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      paymentStatus: paymentStatus || undefined,
    }),
    [supplierId, debouncedPurchaseNumber, debouncedSupplierInvoiceNo, dateFrom, dateTo, paymentStatus],
    'purchase-receipts',
  );

  useEffect(() => {
    list.resetPage();
  }, [debouncedPurchaseNumber, debouncedSupplierInvoiceNo, supplierId, dateFrom, dateTo, paymentStatus, list.resetPage]);

  return {
    supplierId,
    setSupplierId,
    purchaseNumber,
    setPurchaseNumber,
    supplierInvoiceNo,
    setSupplierInvoiceNo,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    paymentStatus,
    setPaymentStatus,
    ...list,
  };
}
