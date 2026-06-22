import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { inventoryApi } from '../../../../services/inventoryApi';
import { usePagedList } from '../../../../hooks/usePagedList';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';

const SEARCH_DEBOUNCE_MS = 300;

export function useSalesInvoicesViewModel() {
  const [searchParams] = useSearchParams();
  const [customerId, setCustomerId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(searchParams.get('invoiceNumber') || '');
  const debouncedInvoiceNumber = useDebouncedValue(invoiceNumber.trim(), SEARCH_DEBOUNCE_MS);
  const [saleType, setSaleType] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const list = usePagedList(
    ({ page, pageSize }) => inventoryApi.listSalesInvoices({
      page,
      pageSize,
      customerId: customerId || undefined,
      invoiceNumber: debouncedInvoiceNumber || undefined,
      saleType: saleType || undefined,
      paymentStatus: paymentStatus || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [customerId, debouncedInvoiceNumber, saleType, paymentStatus, dateFrom, dateTo],
  );

  useEffect(() => {
    list.resetPage();
  }, [customerId, debouncedInvoiceNumber, saleType, paymentStatus, dateFrom, dateTo, list.resetPage]);

  return {
    customerId,
    setCustomerId,
    invoiceNumber,
    setInvoiceNumber,
    saleType,
    setSaleType,
    paymentStatus,
    setPaymentStatus,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    ...list,
  };
}
