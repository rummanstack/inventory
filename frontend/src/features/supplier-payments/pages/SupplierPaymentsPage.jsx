import { useState } from 'react';
import { Download, FileSpreadsheet, Loader2, Pencil, Plus, Printer, Trash2, Wallet } from 'lucide-react';
import { Alert, EmptyState, Pagination, SectionHeader, TableSkeleton, Select } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { downloadSheetPdf } from '../../../services/printService.js';
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '../../../utils/calculations.js';
import SupplierPaymentFormModal from '../components/SupplierPaymentFormModal';
import { useSupplierPaymentsViewModel } from '../viewmodels/useSupplierPaymentsViewModel';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';

const SUPPLIER_PAYMENTS_PRINT_ID = 'supplier-payments-print';

export default function SupplierPaymentsPage() {
  const { saveSupplierPayment, deleteSupplierPayment, t, can, supplierDirectory } = useInventoryApp();
  const vm = useSupplierPaymentsViewModel();
  const [formModal, setFormModal] = useState(null);
  const canManagePayments = can('manage_supplier_payments');
  const [downloadingPdf, downloadPdf] = useAsyncAction();

  async function handleExportExcel() {
    const result = await inventoryApi.listSupplierPayments({
      page: 1,
      pageSize: 10000,
      supplierId: vm.supplierId || undefined,
      dateFrom: vm.dateFrom || undefined,
      dateTo: vm.dateTo || undefined,
    });
    const all = result.items || [];
    const { utils, writeFile } = await import('xlsx');
    const header = [t('supplierPayments.date'), t('supplierPayments.supplier'), t('supplierPayments.amount'), t('supplierPayments.method'), t('supplierPayments.note')];
    const data = all.map((payment) => [
      payment.paymentDate,
      payment.supplierName || '',
      Number(payment.amount || 0),
      t(`purchaseReceive.paymentMethods.${payment.paymentMethod}`),
      payment.note || '',
    ]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 14 }, { wch: 24 }, { wch: 14 }, { wch: 16 }, { wch: 28 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('supplierPayments.sheetName'));
    writeFile(wb, 'supplier-payments.xlsx');
  }

  return (
    <div>
      <SectionHeader
        eyebrow={t('supplierPayments.eyebrow')}
        title={t('supplierPayments.title')}
        description={t('supplierPayments.description')}
        action={canManagePayments ? (
          <button type="button" className="btn-primary" onClick={() => setFormModal({ mode: 'add' })}>
            <Plus size={18} />
            {t('supplierPayments.add')}
          </button>
        ) : null}
      />

      <div id={SUPPLIER_PAYMENTS_PRINT_ID} className="surface overflow-hidden print-target">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 no-print">
          <span className="text-sm font-bold text-slate-700">{t('supplierPayments.title')}</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => downloadPdf(async () => { await inventoryApi.recordPrint({ entityType: 'supplier_payments', entityId: null, label: 'pdf' }).catch(() => {}); await downloadSheetPdf(SUPPLIER_PAYMENTS_PRINT_ID, 'supplier-payments.pdf'); })}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {t('purchaseReceive.downloadPdf')}
            </button>
            <button type="button" className="btn-secondary py-1.5 text-xs" onClick={handleExportExcel}>
              <FileSpreadsheet size={14} />
              {t('common.exportExcel')}
            </button>
            <button
              type="button"
              className="btn-secondary py-1.5 text-xs"
              onClick={() => { inventoryApi.recordPrint({ entityType: 'supplier_payments', entityId: null, label: 'print' }).catch(() => {}); window.print(); }}
            >
              <Printer size={14} />
              {t('common.print')}
            </button>
          </div>
        </div>
        <div className="border-b border-slate-100 p-5 no-print">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t('supplierPayments.eyebrow')}</p>
            <div className="flex flex-wrap gap-2 text-sm font-bold">
              <span className="muted-chip">{formatNumber(vm.total)} {t('supplierPayments.paymentCount')}</span>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Select className="input" value={vm.supplierId} onChange={(event) => vm.setSupplierId(event.target.value)}>
              <option value="">{t('supplierPayments.allSuppliers')}</option>
              {supplierDirectory.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
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
                <th className="px-4 py-3">{t('supplierPayments.supplier')}</th>
                <th className="px-4 py-3 text-right">{t('supplierPayments.amount')}</th>
                <th className="px-4 py-3">{t('supplierPayments.method')}</th>
                <th className="px-4 py-3">{t('supplierPayments.note')}</th>
                <th className="px-4 py-3 text-right no-print">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vm.items.map((payment, index) => (
                <tr key={payment.id} className="hover:bg-slate-50">
                  <td className="table-cell font-semibold text-slate-400">{(vm.page - 1) * vm.pageSize + index + 1}</td>
                  <td className="table-cell">{formatDateTime(payment.paymentDate)}</td>
                  <td className="table-cell font-semibold text-slate-950">{payment.supplierName || '-'}</td>
                  <td className="table-cell text-right font-bold text-emerald-700">{formatCurrency(payment.amount)}</td>
                  <td className="table-cell">{t(`purchaseReceive.paymentMethods.${payment.paymentMethod}`)}</td>
                  <td className="hidden table-cell lg:table-cell">{payment.note || '-'}</td>
                  <td className="table-cell no-print">
                    {canManagePayments ? (
                      <div className="row-actions flex justify-end gap-2">
                        <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setFormModal({ mode: 'edit', payment })}>
                          <Pencil size={16} />
                        </button>
                        <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={async () => { const r = await deleteSupplierPayment(payment); if (r.ok) vm.reload(); }}>
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
            <EmptyState title={t('supplierPayments.noMatchTitle')} description={t('supplierPayments.noMatchDescription')} icon={Wallet} />
          </div>
        ) : null}
        {!vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4 no-print">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {formModal ? (
        <SupplierPaymentFormModal
          payment={formModal.payment}
          onClose={() => setFormModal(null)}
          onSave={async (value) => {
            const result = await saveSupplierPayment(value);
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

