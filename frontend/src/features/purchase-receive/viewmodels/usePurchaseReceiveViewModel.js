import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { usePagedList } from '../../../hooks/usePagedList';

const SEARCH_DEBOUNCE_MS = 300;

export function usePurchaseReceiveViewModel() {
  const [supplierId, setSupplierId] = useState('');
  const [purchaseNumber, setPurchaseNumber] = useState('');
  const [debouncedPurchaseNumber, setDebouncedPurchaseNumber] = useState('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [debouncedSupplierInvoiceNo, setDebouncedSupplierInvoiceNo] = useState('');
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
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedPurchaseNumber(purchaseNumber.trim());
      list.resetPage();
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseNumber]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSupplierInvoiceNo(supplierInvoiceNo.trim());
      list.resetPage();
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierInvoiceNo]);

  useEffect(() => {
    list.resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId, dateFrom, dateTo, paymentStatus]);

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
