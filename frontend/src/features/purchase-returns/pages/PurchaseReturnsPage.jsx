import { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, Loader2, Plus, Printer, Trash2, Undo2 } from 'lucide-react';
import { Alert, CopyableText, EmptyState, Pagination, SectionHeader, TableSkeleton, Select } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { downloadSheetPdf } from '../../../services/printService.js';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';
import { formatCurrency, formatDateTime, formatNumber } from '../../../utils/calculations.js';
import PurchaseReturnFormModal from '../components/PurchaseReturnFormModal';
import { usePurchaseReturnsViewModel } from '../viewmodels/usePurchaseReturnsViewModel';

const PURCHASE_RETURNS_PRINT_ID = 'purchase-returns-print';
const PURCHASE_RETURNS_SHORTCUTS = {
  add: { alt: true, key: 'a', label: 'Alt+A' },
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

export default function PurchaseReturnsPage() {
  const { savePurchaseReturn, deletePurchaseReturn, t, can, supplierDirectory } = useInventoryApp();
  const vm = usePurchaseReturnsViewModel();
  const [formOpen, setFormOpen] = useState(false);
  const canManage = can('manage_purchase_returns');
  const [downloadingPdf, downloadPdf] = useAsyncAction();

  async function handleExportExcel() {
    const result = await inventoryApi.listPurchaseReturns({ page: 1, pageSize: 10000, supplierId: vm.supplierId || undefined, dateFrom: vm.dateFrom || undefined, dateTo: vm.dateTo || undefined });
    const all = result.items || [];
    const { utils, writeFile } = await import('xlsx');
    const header = [t('purchaseReturns.number'), t('purchaseReturns.date'), t('purchaseReturns.supplier'), t('purchaseReturns.total'), t('purchaseReturns.note')];
    const data = all.map((purchaseReturn) => [
      purchaseReturn.returnNumber,
      purchaseReturn.returnDate,
      purchaseReturn.supplierName || '',
      Number(purchaseReturn.totalAmount || 0),
      purchaseReturn.note || '',
    ]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 24 }, { wch: 16 }, { wch: 28 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Purchase Returns');
    writeFile(wb, 'purchase-returns.xlsx');
  }

  async function handleDownloadPdf() {
    await downloadPdf(async () => {
      await inventoryApi.recordPrint({ entityType: 'purchase_returns', entityId: null, label: 'pdf' }).catch(() => {});
      await downloadSheetPdf(PURCHASE_RETURNS_PRINT_ID, 'purchase-returns.pdf');
    });
  }

  function handlePrint() {
    inventoryApi.recordPrint({ entityType: 'purchase_returns', entityId: null, label: 'print' }).catch(() => {});
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
      if (matchesShortcut(event, PURCHASE_RETURNS_SHORTCUTS.add) && canManage && !formOpen) {
        event.preventDefault();
        setFormOpen(true);
      } else if (matchesShortcut(event, PURCHASE_RETURNS_SHORTCUTS.pdf) && !downloadingPdf) {
        event.preventDefault();
        handleDownloadPdf();
      } else if (matchesShortcut(event, PURCHASE_RETURNS_SHORTCUTS.excel)) {
        event.preventDefault();
        handleExportExcel();
      } else if (matchesShortcut(event, PURCHASE_RETURNS_SHORTCUTS.print)) {
        event.preventDefault();
        handlePrint();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [downloadingPdf, canManage, formOpen, vm.supplierId, vm.dateFrom, vm.dateTo, t]);

  return (
    <div>
      <SectionHeader
        eyebrow={t('purchaseReturns.eyebrow')}
        title={t('purchaseReturns.title')}
        description={t('purchaseReturns.description')}
        action={canManage ? (
          <button type="button" className="btn-primary" onClick={() => setFormOpen(true)}>
            <Plus size={18} />
            {t('purchaseReturns.add')}
            <kbd className="ml-1 rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200">Alt+A</kbd>
          </button>
        ) : null}
      />

      <div id={PURCHASE_RETURNS_PRINT_ID} className="surface overflow-hidden print-target">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t('purchaseReturns.eyebrow')}</p>
            <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
              <span className="muted-chip">{formatNumber(vm.total)} {t('purchaseReturns.returnCount')}</span>
              <button
                type="button"
                className="btn-secondary no-print py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {t('purchaseReceive.downloadPdf')}
                {shortcutBadge(PURCHASE_RETURNS_SHORTCUTS.pdf)}
              </button>
              <button type="button" className="btn-secondary no-print py-1.5 text-xs" onClick={handleExportExcel}>
                <FileSpreadsheet size={14} />
                {t('common.exportExcel')}
                {shortcutBadge(PURCHASE_RETURNS_SHORTCUTS.excel)}
              </button>
              <button
                type="button"
                className="btn-secondary no-print py-1.5 text-xs"
                onClick={handlePrint}
              >
                <Printer size={14} />
                {t('common.print')}
                {shortcutBadge(PURCHASE_RETURNS_SHORTCUTS.print)}
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Select className="input" value={vm.supplierId} onChange={(event) => vm.setSupplierId(event.target.value)}>
              <option value="">{t('purchaseReturns.allSuppliers')}</option>
              {supplierDirectory.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </Select>
            <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} placeholder={t('purchaseReturns.dateFrom')} />
            <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} placeholder={t('purchaseReturns.dateTo')} min={vm.dateFrom} />
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
                <th className="px-4 py-3">{t('purchaseReturns.number')}</th>
                <th className="px-4 py-3">{t('purchaseReturns.date')}</th>
                <th className="px-4 py-3">{t('purchaseReturns.supplier')}</th>
                <th className="px-4 py-3">{t('purchaseReturns.items')}</th>
                <th className="px-4 py-3 text-right">{t('purchaseReturns.total')}</th>
                <th className="px-4 py-3">{t('purchaseReturns.note')}</th>
                <th className="px-4 py-3 text-right no-print">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vm.items.map((purchaseReturn) => (
                <tr key={purchaseReturn.id} className="hover:bg-slate-50">
                  <td className="table-cell"><CopyableText value={purchaseReturn.returnNumber} copyLabel={t('purchaseReturns.number')} displayValue={purchaseReturn.returnNumber} textClassName="font-semibold text-slate-950" /></td>
                  <td className="table-cell">{formatDateTime(purchaseReturn.returnDate)}</td>
                  <td className="table-cell font-semibold text-slate-950">{purchaseReturn.supplierName || '-'}</td>
                  <td className="table-cell">
                    {purchaseReturn.items.map((item) => (
                      <div key={item.id} className="text-sm">
                        {item.productName} × {formatNumber(item.quantityPieces)}
                      </div>
                    ))}
                  </td>
                  <td className="table-cell text-right font-bold text-rose-700">{formatCurrency(purchaseReturn.totalAmount)}</td>
                  <td className="table-cell">{purchaseReturn.note || '-'}</td>
                  <td className="table-cell no-print">
                    {canManage ? (
                      <div className="row-actions flex justify-end gap-2">
                        <button
                          type="button"
                          className="icon-btn text-rose-600 hover:text-rose-700"
                          title={t('common.delete')}
                          onClick={async () => { const r = await deletePurchaseReturn(purchaseReturn); if (r.ok) vm.reload(); }}
                        >
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
            <EmptyState title={t('purchaseReturns.noMatchTitle')} description={t('purchaseReturns.noMatchDescription')} icon={Undo2} />
          </div>
        ) : null}
        {!vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4 no-print">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {formOpen ? (
        <PurchaseReturnFormModal
          onClose={() => setFormOpen(false)}
          onSave={async (value) => {
            const result = await savePurchaseReturn(value);
            if (result.ok) {
              setFormOpen(false);
              vm.reload();
            }
            return result;
          }}
        />
      ) : null}
    </div>
  );
}
