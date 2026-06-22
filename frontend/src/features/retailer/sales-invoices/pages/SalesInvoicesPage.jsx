import { useState } from 'react';
import { Eye, Plus, Receipt, Search, Trash2 } from 'lucide-react';
import { Alert, Badge, EmptyState, Pagination, SectionHeader, TableSkeleton } from '../../../../components/ui.jsx';
import { DatePickerField } from '../../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { formatCurrency, formatDate, formatNumber } from '../../../../utils/calculations.js';
import SalesInvoiceFormModal from '../components/SalesInvoiceFormModal';
import SalesInvoiceViewModal from '../components/SalesInvoiceViewModal';
import { useSalesInvoicesViewModel } from '../viewmodels/useSalesInvoicesViewModel';
import { paymentStatusOf, paymentStatusTone } from '../../../../models/inventoryViewData.js';

export default function SalesInvoicesPage() {
  const { saveSalesInvoice, deleteSalesInvoice, t, can, retailCustomerDirectory } = useInventoryApp();
  const vm = useSalesInvoicesViewModel();
  const [showFormModal, setShowFormModal] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const canManageRetailers = can('manage_retail_sales_invoices');

  return (
    <div>
      <SectionHeader
        eyebrow={t('retailer.salesInvoices.eyebrow')}
        title={t('retailer.salesInvoices.title')}
        description={t('retailer.salesInvoices.description')}
        action={canManageRetailers ? (
          <button type="button" className="btn-primary" onClick={() => setShowFormModal(true)}>
            <Plus size={18} />
            {t('retailer.salesInvoices.add')}
          </button>
        ) : null}
      />

      <div className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{t('retailer.salesInvoices.eyebrow')}</p>
              <p className="text-sm font-medium text-slate-500">{t('retailer.salesInvoices.description')}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm font-bold">
              <span className="muted-chip">{formatNumber(vm.total)} {t('retailer.salesInvoices.invoiceCount')}</span>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className="input pl-10" value={vm.invoiceNumber} onChange={(event) => vm.setInvoiceNumber(event.target.value)} placeholder={t('retailer.shared.invoiceNumberLabel')} />
            </div>
            <select className="input" value={vm.customerId} onChange={(event) => vm.setCustomerId(event.target.value)}>
              <option value="">{t('retailer.shared.allCustomers')}</option>
              {retailCustomerDirectory.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
            <select className="input" value={vm.saleType} onChange={(event) => vm.setSaleType(event.target.value)}>
              <option value="">{t('retailer.shared.allSaleTypes')}</option>
              <option value="RETAIL">{t('retailer.shared.saleTypes.RETAIL')}</option>
              <option value="WHOLESALE">{t('retailer.shared.saleTypes.WHOLESALE')}</option>
              <option value="QUICK_SALE">{t('retailer.shared.saleTypes.QUICK_SALE')}</option>
            </select>
            <select className="input" value={vm.paymentStatus} onChange={(event) => vm.setPaymentStatus(event.target.value)}>
              <option value="">{t('purchaseReceive.allPaymentStatuses')}</option>
              <option value="PAID">{t('purchaseReceive.paymentStatuses.PAID')}</option>
              <option value="PARTIAL">{t('purchaseReceive.paymentStatuses.PARTIAL')}</option>
              <option value="DUE">{t('purchaseReceive.paymentStatuses.DUE')}</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} placeholder={t('purchaseReceive.dateFrom')} />
              <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} placeholder={t('purchaseReceive.dateTo')} />
            </div>
          </div>
        </div>
        {vm.loading ? (
          <div className="p-5">
            <TableSkeleton columns={8} showHeader={false} />
          </div>
        ) : vm.error ? (
          <div className="p-5">
            <Alert type="error">{vm.error}</Alert>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">{t('retailer.shared.invoiceNumberLabel')}</th>
                <th className="px-4 py-3">{t('retailer.shared.invoiceDateLabel')}</th>
                <th className="px-4 py-3">{t('retailer.shared.customerLabel')}</th>
                <th className="hidden px-4 py-3 lg:table-cell">{t('retailer.shared.saleTypeLabel')}</th>
                <th className="px-4 py-3 text-right">{t('retailer.shared.totalAmount')}</th>
                <th className="hidden px-4 py-3 text-right sm:table-cell">{t('retailer.shared.dueAmount')}</th>
                <th className="px-4 py-3">{t('purchaseReceive.paymentStatus')}</th>
                <th className="px-4 py-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vm.items.map((invoice, index) => (
                <tr key={invoice.id} className="hover:bg-slate-50">
                  <td className="table-cell font-black text-slate-400">{(vm.page - 1) * vm.pageSize + index + 1}</td>
                  <td className="table-cell font-semibold text-slate-950">{invoice.invoiceNumber}</td>
                  <td className="table-cell">{formatDate(invoice.invoiceDate)}</td>
                  <td className="table-cell">{invoice.customerName || t('retailer.shared.customerTypes.WALK_IN')}</td>
                  <td className="hidden table-cell lg:table-cell">{t(`retailer.shared.saleTypes.${invoice.saleType}`)}</td>
                  <td className="table-cell text-right font-bold">{formatCurrency(invoice.totalAmount)}</td>
                  <td className="hidden table-cell text-right font-bold text-rose-700 sm:table-cell">{formatCurrency(invoice.dueAmount)}</td>
                  <td className="table-cell">
                    <Badge tone={paymentStatusTone(paymentStatusOf(invoice))}>
                      {t(`purchaseReceive.paymentStatuses.${paymentStatusOf(invoice)}`)}
                    </Badge>
                  </td>
                  <td className="table-cell">
                    <div className="flex justify-end gap-2">
                      <button type="button" className="icon-btn" title={t('common.view')} onClick={() => setViewInvoice(invoice)}>
                        <Eye size={16} />
                      </button>
                      {canManageRetailers ? (
                        <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={async () => { const r = await deleteSalesInvoice(invoice); if (r.ok) vm.reload(); }}>
                          <Trash2 size={16} />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
        {!vm.loading && !vm.error && !vm.items.length ? (
          <div className="p-5">
            <EmptyState title={t('retailer.salesInvoices.noMatchTitle')} description={t('retailer.salesInvoices.noMatchDescription')} icon={Receipt} />
          </div>
        ) : null}
        {!vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {showFormModal ? (
        <SalesInvoiceFormModal
          onClose={() => setShowFormModal(false)}
          onSave={async (value) => {
            const result = await saveSalesInvoice(value);
            if (result.ok) {
              setShowFormModal(false);
              vm.reload();
            }
            return result;
          }}
        />
      ) : null}

      {viewInvoice ? <SalesInvoiceViewModal salesInvoice={viewInvoice} onClose={() => setViewInvoice(null)} /> : null}
    </div>
  );
}
