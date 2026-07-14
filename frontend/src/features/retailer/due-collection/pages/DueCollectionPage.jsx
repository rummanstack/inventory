import { useState } from 'react';
import { Download, FileSpreadsheet, Loader2, Pencil, Plus, Printer, Trash2, Wallet } from 'lucide-react';
import { Alert, CopyableText, EmptyState, Pagination, SectionHeader, TableSkeleton, Select } from '../../../../components/ui.jsx';
import { DatePickerField } from '../../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../../services/printService.js';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '../../../../utils/calculations.js';
import CustomerPaymentFormModal from '../components/CustomerPaymentFormModal';
import { useDueCollectionViewModel } from '../viewmodels/useDueCollectionViewModel';
import { useAsyncAction } from '../../../../hooks/useAsyncAction.js';

export default function DueCollectionPage() {
  const { saveCustomerPayment, deleteCustomerPayment, t, can, retailCustomerDirectory, language } = useInventoryApp();
  const vm = useDueCollectionViewModel();
  const [formModal, setFormModal] = useState(null);
  const canManageRetailers = can('manage_retail_due_collection');
  const [downloadingPdf, downloadPdf] = useAsyncAction();

  async function handleExportExcel() {
    const result = await inventoryApi.listCustomerPayments({
      customerId: vm.customerId || undefined,
      dateFrom: vm.dateFrom || undefined,
      dateTo: vm.dateTo || undefined,
      page: 1,
      pageSize: 10000,
    });
    const all = result.items || [];
    const { utils, writeFile } = await import('xlsx');
    const header = ['#', t('supplierPayments.date'), t('retailer.shared.customerLabel'), t('supplierPayments.amount'), t('supplierPayments.method'), t('supplierPayments.note')];
    const data = all.map((p, i) => [i + 1, p.paymentDate, p.customerName || '', Number(p.amount), p.paymentMethod, p.note || '']);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 28 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('retailer.dueCollection.sheetName'));
    writeFile(wb, `due-collection-report.xlsx`);
  }

  return (
    <div>
      <SectionHeader
        eyebrow={t('retailer.dueCollection.eyebrow')}
        title={t('retailer.dueCollection.title')}
        description={t('retailer.dueCollection.description')}
        action={canManageRetailers ? (
          <button type="button" className="btn-primary" onClick={() => setFormModal({ mode: 'add' })}>
            <Plus size={18} />
            {t('retailer.dueCollection.add')}
          </button>
        ) : null}
      />

      <div id="due-collection-print" className="surface overflow-hidden print-target">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t('retailer.dueCollection.eyebrow')}</p>
            <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
              <span className="muted-chip">{formatNumber(vm.total, language)} {t('retailer.dueCollection.paymentCount')}</span>
              <button
                type="button"
                className="btn-secondary no-print py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => downloadPdf(async () => { await inventoryApi.recordPrint({ entityType: 'due_collection', entityId: null, label: 'pdf' }).catch(() => {}); await downloadSheetPdf('due-collection-print', `due-collection-report.pdf`); })}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {t('purchaseReceive.downloadPdf')}
              </button>
              <button type="button" className="btn-secondary no-print py-1.5 text-xs" onClick={handleExportExcel}>
                <FileSpreadsheet size={14} />
                {t('common.exportExcel')}
              </button>
              <button
                type="button"
                className="btn-secondary no-print py-1.5 text-xs"
                onClick={() => { inventoryApi.recordPrint({ entityType: 'due_collection', entityId: null, label: 'print' }).catch(() => {}); window.print(); }}
              >
                <Printer size={14} />
                {t('common.print')}
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Select className="input" value={vm.customerId} onChange={(event) => vm.setCustomerId(event.target.value)}>
              <option value="">{t('retailer.shared.allCustomers')}</option>
              {retailCustomerDirectory.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </Select>
            <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} placeholder={t('supplierPayments.dateFrom')} />
            <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} placeholder={t('supplierPayments.dateTo')} min={vm.dateFrom} />
          </div>
        </div>
        {vm.loading ? (
          <div className="p-5">
            <TableSkeleton columns={6} showHeader={false} />
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
                <th className="px-4 py-3">{t('supplierPayments.date')}</th>
                <th className="px-4 py-3">{t('retailer.shared.customerLabel')}</th>
                <th className="px-4 py-3 text-right">{t('supplierPayments.amount')}</th>
                <th className="px-4 py-3">{t('supplierPayments.method')}</th>
                <th className="px-4 py-3">{t('supplierPayments.note')}</th>
                <th className="px-4 py-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vm.items.map((payment, index) => (
                <tr key={payment.id} className="hover:bg-slate-50">
                  <td className="table-cell font-semibold text-slate-400">{(vm.page - 1) * vm.pageSize + index + 1}</td>
                  <td className="table-cell">
                    <div>{formatDateTime(payment.paymentDate, language)}</div>
                    <div className="mt-1"><CopyableText value={payment.id} copyLabel="payment ID" displayValue={payment.id.slice(0, 10)} textClassName="text-xs font-medium text-slate-500" buttonClassName="h-5 w-5" /></div>
                  </td>
                  <td className="table-cell font-semibold text-slate-950">{payment.customerName || '-'}</td>
                  <td className="table-cell text-right font-bold text-emerald-700">{formatCurrency(payment.amount, language)}</td>
                  <td className="table-cell">{t(`purchaseReceive.paymentMethods.${payment.paymentMethod}`)}</td>
                  <td className="table-cell">{payment.note || '-'}</td>
                  <td className="table-cell">
                    {canManageRetailers ? (
                      <div className="row-actions flex justify-end gap-2">
                        <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setFormModal({ mode: 'edit', payment })}>
                          <Pencil size={16} />
                        </button>
                        <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={async () => { const r = await deleteCustomerPayment(payment); if (r.ok) vm.reload(); }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
        {!vm.loading && !vm.error && !vm.items.length ? (
          <div className="p-5">
            <EmptyState title={t('retailer.dueCollection.noMatchTitle')} description={t('retailer.dueCollection.noMatchDescription')} icon={Wallet} />
          </div>
        ) : null}
        {!vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {formModal ? (
        <CustomerPaymentFormModal
          payment={formModal.payment}
          onClose={() => setFormModal(null)}
          onSave={async (value) => {
            const result = await saveCustomerPayment(value);
            if (result.ok) {
              setFormModal(null);
              vm.reload();
            }
            return result;
          }}
        />
      ) : null}
    </div>
  );
}

