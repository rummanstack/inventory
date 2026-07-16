import { useEffect } from 'react';
import { Download, FileSpreadsheet, Loader2, Printer, RefreshCw, Wallet } from 'lucide-react';
import { Badge, CopyableText, EmptyState, SectionHeader, StatCard, TableSkeleton, Select } from '../../../components/ui.jsx';
import { DateRangePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf, printElementById } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi';
import { formatCurrency, formatDateTime } from '../../../utils/calculations.js';
import SupplierStatementPrintSheet from '../components/SupplierStatementPrintSheet';
import { useSupplierStatementViewModel } from '../viewmodels/useSupplierStatementViewModel';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';

const SUPPLIER_STATEMENT_SHORTCUTS = {
  refresh: { alt: true, key: 'r', label: 'Alt+R' },
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

function ledgerTone(type) {
  if (type === 'PAYMENT') return 'emerald';
  if (type === 'PURCHASE_DUE') return 'rose';
  if (type === 'DISCOUNT') return 'emerald';
  if (type === 'MANUAL_ADJUSTMENT') return 'amber';
  return 'blue';
}

export default function SupplierStatementPage() {
  const { t, supplierDirectory } = useInventoryApp();
  const vm = useSupplierStatementViewModel({ suppliers: supplierDirectory });
  const entries = vm.statement?.entries || [];
  const printTargetId = 'supplier-statement-print-sheet';
  const [downloadingPdf, downloadPdf] = useAsyncAction();

  function recordStatementPrint(label) {
    if (!vm.supplierId) return;
    inventoryApi.recordPrint({ entityType: 'supplier_statement', entityId: vm.supplierId, label }).catch(() => {});
  }

  async function handleExportExcel() {
    const { utils, writeFile } = await import('xlsx');
    const header = [t('supplierStatement.when'), t('supplierStatement.type'), t('supplierStatement.debit'), t('supplierStatement.credit'), t('supplierStatement.balanceAfter')];
    const data = entries.map((entry) => [
      entry.createdAt,
      t(`supplierStatement.types.${entry.type}`),
      Number(entry.debit || 0),
      Number(entry.credit || 0),
      Number(entry.balanceAfter || 0),
    ]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('supplierStatement.sheetName'));
    writeFile(wb, `supplier-statement-${vm.statement?.supplier?.name || vm.supplierId}.xlsx`);
  }

  function handleDownloadPdf() {
    return downloadPdf(async () => {
      recordStatementPrint('pdf');
      await downloadSheetPdf(printTargetId, `supplier-statement-${vm.statement.supplier?.name || vm.supplierId}.pdf`);
    });
  }

  function handlePrint() {
    recordStatementPrint('print');
    printElementById(printTargetId);
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
      if (matchesShortcut(event, SUPPLIER_STATEMENT_SHORTCUTS.refresh)) {
        event.preventDefault();
        vm.refresh();
        return;
      }
      if (!vm.statement) return;
      if (matchesShortcut(event, SUPPLIER_STATEMENT_SHORTCUTS.pdf) && !downloadingPdf) {
        event.preventDefault();
        handleDownloadPdf();
      } else if (matchesShortcut(event, SUPPLIER_STATEMENT_SHORTCUTS.excel)) {
        event.preventDefault();
        handleExportExcel();
      } else if (matchesShortcut(event, SUPPLIER_STATEMENT_SHORTCUTS.print)) {
        event.preventDefault();
        handlePrint();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [downloadingPdf, vm.statement, vm.supplierId, vm.refresh, entries, t]);

  return (
    <div>
      <SectionHeader
        eyebrow={t('supplierStatement.eyebrow')}
        title={t('supplierStatement.title')}
        description={t('supplierStatement.description')}
      />

      <div className="surface p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-48">
            <label className="label">{t('supplierStatement.supplier')}</label>
            <Select className="input" value={vm.supplierId} onChange={(event) => vm.setSupplierId(event.target.value)}>
              <option value="">{t('supplierStatement.selectSupplier')}</option>
              {supplierDirectory.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </Select>
          </div>
          <div className="min-w-[230px]">
            <label className="label">{t('supplierStatement.dateRangeLabel')}</label>
            <DateRangePickerField
              from={vm.dateFrom}
              to={vm.dateTo}
              onChange={(from, to) => { vm.setDateFrom(from); vm.setDateTo(to); }}
              placeholder={`${t('supplierStatement.dateFrom')} - ${t('supplierStatement.dateTo')}`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-secondary" onClick={vm.refresh}>
              <RefreshCw size={18} />
              {t('supplierStatement.refresh')}
              {shortcutBadge(SUPPLIER_STATEMENT_SHORTCUTS.refresh)}
            </button>
            {vm.statement ? (
              <>
                <button
                  type="button"
                  className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                >
                  {downloadingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  {t('supplierStatement.downloadPdf')}
                  {shortcutBadge(SUPPLIER_STATEMENT_SHORTCUTS.pdf)}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handlePrint}
                >
                  <Printer size={18} />
                  {t('supplierStatement.printSheet')}
                  {shortcutBadge(SUPPLIER_STATEMENT_SHORTCUTS.print)}
                </button>
                <button type="button" className="btn-secondary" onClick={handleExportExcel}>
                  <FileSpreadsheet size={18} />
                  {t('common.exportExcel')}
                  {shortcutBadge(SUPPLIER_STATEMENT_SHORTCUTS.excel)}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {vm.loading ? (
        <div className="surface mt-6 p-5">
          <TableSkeleton columns={7} showHeader={false} />
        </div>
      ) : vm.error ? (
        <div className="surface mt-6 p-5">
          <EmptyState title={t('supplierStatement.emptyTitle')} description={vm.error} icon={Wallet} />
        </div>
      ) : !vm.statement ? (
        <div className="surface mt-6 p-5">
          <EmptyState title={t('supplierStatement.emptyTitle')} description={t('supplierStatement.emptyDescription')} icon={Wallet} />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title={t('supplierStatement.openingBalance')} value={formatCurrency(vm.statement.openingBalance)} icon={Wallet} tone="slate" />
            <StatCard title={t('supplierStatement.totalDebit')} value={formatCurrency(vm.statement.totalDebit)} icon={Wallet} tone="rose" />
            <StatCard title={t('supplierStatement.totalCredit')} value={formatCurrency(vm.statement.totalCredit)} icon={Wallet} tone="emerald" />
            <StatCard
              title={t('supplierStatement.closingBalance')}
              value={vm.statement.closingBalance < 0
                ? `${formatCurrency(Math.abs(vm.statement.closingBalance))} ${t('supplierStatement.advanceLabel')}`
                : formatCurrency(vm.statement.closingBalance)}
              icon={Wallet}
              tone="blue"
            />
          </div>

          <div className="surface mt-6 overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">{t('supplierStatement.entriesTitle')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">{t('supplierStatement.when')}</th>
                    <th className="px-4 py-3">{t('supplierStatement.type')}</th>
                    <th className="px-4 py-3 text-right">{t('supplierStatement.debit')}</th>
                    <th className="px-4 py-3 text-right">{t('supplierStatement.credit')}</th>
                    <th className="px-4 py-3 text-right">{t('supplierStatement.balanceAfter')}</th>
                    <th className="px-4 py-3">{t('supplierStatement.reference')}</th>
                    <th className="px-4 py-3">{t('supplierStatement.createdBy')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="table-cell whitespace-nowrap text-sm font-semibold text-slate-700">{formatDateTime(entry.createdAt)}</td>
                      <td className="table-cell">
                        <Badge tone={ledgerTone(entry.type)}>{t(`supplierStatement.types.${entry.type}`)}</Badge>
                        {entry.note ? <p className="mt-1 max-w-56 truncate text-xs text-slate-500">{entry.note}</p> : null}
                      </td>
                      <td className="table-cell text-right font-semibold text-rose-700">{entry.debit ? formatCurrency(entry.debit) : '-'}</td>
                      <td className="table-cell text-right font-semibold text-emerald-700">{entry.credit ? formatCurrency(entry.credit) : '-'}</td>
                      <td className="table-cell text-right font-semibold text-slate-950">{formatCurrency(entry.balanceAfter)}</td>
                      <td className="table-cell">
                        <CopyableText value={entry.referenceId ? `${entry.referenceType || 'reference'} / ${entry.referenceId}` : ''} copyLabel={t('supplierStatement.reference')} displayValue={entry.referenceType ? `${entry.referenceType} / ${String(entry.referenceId || '').slice(0, 18)}` : '-'} textClassName="max-w-52 text-xs font-semibold text-slate-600" buttonClassName="h-5 w-5" />
                      </td>
                      <td className="table-cell">
                        <p className="font-semibold text-slate-950">{entry.createdByName || '-'}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!entries.length ? (
              <div className="p-5">
                <EmptyState title={t('supplierStatement.emptyTitle')} description={t('supplierStatement.emptyDescription')} icon={Wallet} />
              </div>
            ) : null}
          </div>

          <div className="absolute -left-[10000px] top-0">
            <SupplierStatementPrintSheet statement={vm.statement} printTarget targetId={printTargetId} />
          </div>
        </>
      )}
    </div>
  );
}

