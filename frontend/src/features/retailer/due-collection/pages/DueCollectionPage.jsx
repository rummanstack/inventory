import { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, Loader2, Pencil, Plus, Printer, Trash2, Wallet } from 'lucide-react';
import { Alert, CopyableText, EmptyState, MobileCardList, MobileListCard, Pagination, SectionHeader, TableSkeleton, Select } from '../../../../components/ui.jsx';
import { DateRangePickerField } from '../../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../../services/printService.js';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { formatCurrency, formatDateTime } from '../../../../utils/calculations.js';
import CustomerPaymentFormModal from '../components/CustomerPaymentFormModal';
import { useDueCollectionViewModel } from '../viewmodels/useDueCollectionViewModel';
import { useAsyncAction } from '../../../../hooks/useAsyncAction.js';

const DUE_COLLECTION_PRINT_ID = 'due-collection-print';
const DUE_COLLECTION_SHORTCUTS = {
  add: { alt: true, key: 'a', label: 'Alt+A' },
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

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

  async function handleDownloadPdf() {
    await downloadPdf(async () => {
      await inventoryApi.recordPrint({ entityType: 'due_collection', entityId: null, label: 'pdf' }).catch(() => {});
      await downloadSheetPdf(DUE_COLLECTION_PRINT_ID, `due-collection-report.pdf`);
    });
  }

  function handlePrint() {
    inventoryApi.recordPrint({ entityType: 'due_collection', entityId: null, label: 'print' }).catch(() => {});
    window.print();
  }

  function shortcutBadge(shortcut) {
    return <kbd className="ml-1 rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500">{shortcut.label}</kbd>;
  }

  function matchesShortcut(event, shortcut) {
    return (
      event.key.toLowerCase() === shortcut.key &&
      Boolean(event.altKey) === Boolean(shortcut.alt) &&
      Boolean(event.shiftKey) === Boolean(shortcut.shift) &&
      Boolean(event.ctrlKey || event.metaKey) === Boolean(shortcut.ctrlOrMeta)
    );
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (matchesShortcut(event, DUE_COLLECTION_SHORTCUTS.add) && canManageRetailers && !formModal) {
        event.preventDefault();
        setFormModal({ mode: 'add' });
      } else if (matchesShortcut(event, DUE_COLLECTION_SHORTCUTS.pdf) && !downloadingPdf) {
        event.preventDefault();
        handleDownloadPdf();
      } else if (matchesShortcut(event, DUE_COLLECTION_SHORTCUTS.excel)) {
        event.preventDefault();
        handleExportExcel();
      } else if (matchesShortcut(event, DUE_COLLECTION_SHORTCUTS.print)) {
        event.preventDefault();
        handlePrint();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [downloadingPdf, canManageRetailers, formModal, vm.customerId, vm.dateFrom, vm.dateTo, t]);

  return (
    <div>
      <SectionHeader
        title={t('retailer.dueCollection.title')}
        compact
        action={canManageRetailers ? (
          <button type="button" className="btn-primary" onClick={() => setFormModal({ mode: 'add' })}>
            <Plus size={18} />
            {t('retailer.dueCollection.add')}
            <kbd className="ml-1 rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200">Alt+A</kbd>
          </button>
        ) : null}
      />

      <div id={DUE_COLLECTION_PRINT_ID} className="surface overflow-hidden print-target">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:flex-wrap sm:items-center">
          <Select className="input w-full sm:w-56" value={vm.customerId} onChange={(event) => vm.setCustomerId(event.target.value)}>
            <option value="">{t('retailer.shared.allCustomers')}</option>
            {retailCustomerDirectory.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.name}</option>
            ))}
          </Select>
          <DateRangePickerField
            from={vm.dateFrom}
            to={vm.dateTo}
            onChange={(from, to) => { vm.setDateFrom(from); vm.setDateTo(to); }}
            placeholder={`${t('supplierPayments.dateFrom')} - ${t('supplierPayments.dateTo')}`}
            className="w-full min-w-[260px] sm:w-auto"
          />
          <div className="flex flex-wrap items-center gap-2 text-sm font-bold sm:ml-auto">
            <button
              type="button"
              className="btn-secondary no-print h-10 gap-1.5 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {t('purchaseReceive.downloadPdf')}
              {shortcutBadge(DUE_COLLECTION_SHORTCUTS.pdf)}
            </button>
            <button type="button" className="btn-secondary no-print h-10 gap-1.5 px-3 text-xs" onClick={handleExportExcel}>
              <FileSpreadsheet size={14} />
              {t('common.exportExcel')}
              {shortcutBadge(DUE_COLLECTION_SHORTCUTS.excel)}
            </button>
            <button type="button" className="btn-secondary no-print h-10 gap-1.5 px-3 text-xs" onClick={handlePrint}>
              <Printer size={14} />
              {t('common.print')}
              {shortcutBadge(DUE_COLLECTION_SHORTCUTS.print)}
            </button>
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
        <>
        <MobileCardList>
          {vm.items.map((payment) => (
            <MobileListCard
              key={payment.id}
              title={payment.customerName || '-'}
              subtitle={`${t(`purchaseReceive.paymentMethods.${payment.paymentMethod}`)} · ${formatDateTime(payment.paymentDate, language)}`}
              value={formatCurrency(payment.amount, language)}
              valueClass="text-emerald-700"
              action={canManageRetailers ? (
                <>
                  <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setFormModal({ mode: 'edit', payment })}>
                    <Pencil size={16} />
                  </button>
                  <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={async () => { const r = await deleteCustomerPayment(payment); if (r.ok) vm.reload(); }}>
                    <Trash2 size={16} />
                  </button>
                </>
              ) : null}
            />
          ))}
        </MobileCardList>
        <div className="hidden overflow-x-auto md:block">
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
        </>
        )}
        {!vm.loading && !vm.error && !vm.items.length ? (
          <div className="p-5">
            <EmptyState title={t('retailer.dueCollection.noMatchTitle')} description={t('retailer.dueCollection.noMatchDescription')} icon={Wallet} />
          </div>
        ) : null}
        {!vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4 no-print">
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

