import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2, Printer, RotateCcw, Search, Truck } from 'lucide-react';
import { Alert, Badge, EmptyState, MobileCardList, MobileListCard, Pagination, SectionHeader, TableSkeleton, cx } from '../../../components/ui.jsx';
import { statusTone } from '../../../models/inventoryViewData.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, formatDate, formatNumber } from '../../../utils/calculations.js';
import { useHistoryViewModel } from '../viewmodels/useHistoryViewModel';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';

const TABS = [
  { key: 'issues', labelKey: 'history.issuesTab', icon: Truck },
  { key: 'settlements', labelKey: 'history.settlementsTab', icon: RotateCcw },
];

const HISTORY_PRINT_ID = 'history-print';

export default function HistoryPage() {
  const { t } = useInventoryApp();
  const [activeTab, setActiveTab] = useState('issues');
  const issuesVm = useHistoryViewModel('issues');
  const settlementsVm = useHistoryViewModel('settlements');
  const vm = activeTab === 'issues' ? issuesVm : settlementsVm;
  const [downloadingPdf, downloadPdf] = useAsyncAction();
  const [exportingExcel, exportExcel] = useAsyncAction();

  async function handleExportExcel() {
    const { utils, writeFile } = await import('xlsx');
    const header = [t('common.date'), t('history.type'), t('dsr.title'), t('history.qty'), t('history.amount'), t('history.paid'), t('history.due'), t('dsr.status')];
    const data = vm.rows.map((row) => [
      formatDate(row.date),
      row.type === 'Morning Issue' ? t('history.issueType') : t('history.settlementType'),
      `${row.dsrName} / ${row.area}`,
      Number(row.pieces),
      Number(row.amount),
      Number(row.amountPaid || 0),
      Number(row.dueAmount || 0),
      row.status === 'Issued' ? t('history.issued') : t('history.completed'),
    ]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 24 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('history.sheetName'));
    writeFile(wb, `history-${activeTab}.xlsx`);
  }

  return (
    <div>
      <SectionHeader title={t('nav.history')} compact />


      <div id={HISTORY_PRINT_ID} className="surface overflow-hidden print-target">
        <div className="space-y-4 border-b border-slate-100 p-4 no-print sm:p-5">
          <div className="overflow-x-auto">
            <div className="inline-flex min-w-full gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:min-w-0">
              {TABS.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = tab.key === activeTab;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    className={cx(
                      'flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-bold transition sm:flex-none',
                      isActive
                        ? 'border border-indigo-200 bg-indigo-50 text-indigo-800 shadow-sm ring-2 ring-indigo-100'
                        : 'border border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800',
                    )}
                    aria-pressed={isActive}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    <TabIcon size={16} />
                    {t(tab.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative w-full lg:max-w-md lg:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className="input w-full pl-10" value={vm.search} onChange={(event) => vm.setSearch(event.target.value)} placeholder={t('history.searchByDsrPlaceholder')} />
            </div>
            <div className="flex w-full flex-wrap gap-2 lg:ml-auto lg:w-auto">
              <button
                type="button"
                className="btn-secondary h-10 flex-1 justify-center gap-1.5 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                onClick={() => downloadPdf(async () => {
                  await inventoryApi.recordPrint({ entityType: 'history', entityId: null, label: 'pdf' }).catch(() => {});
                  await downloadSheetPdf(HISTORY_PRINT_ID, `history-${activeTab}.pdf`);
                })}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {t('purchaseReceive.downloadPdf')}
              </button>
              <button
                type="button"
                className="btn-secondary h-10 flex-1 justify-center gap-1.5 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                onClick={() => exportExcel(handleExportExcel)}
                disabled={exportingExcel}
              >
                {exportingExcel ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                {t('common.exportExcel')}
              </button>
              <button
                type="button"
                className="btn-secondary h-10 flex-1 justify-center gap-1.5 px-3 text-xs sm:flex-none"
                onClick={() => { inventoryApi.recordPrint({ entityType: 'history', entityId: null, label: 'print' }).catch(() => {}); window.print(); }}
              >
                <Printer size={14} />
                {t('common.print')}
              </button>
            </div>
          </div>
        </div>
        {vm.loading ? (
          <div className="p-5 md:hidden">
            <TableSkeleton columns={9} showHeader={false} />
          </div>
        ) : (
          <MobileCardList>
            {vm.rows.map((row) => (
              <MobileListCard
                key={row.id}
                title={row.dsrName}
                badge={<Badge tone={row.type === 'Morning Issue' ? 'amber' : 'emerald'}>{row.type === 'Morning Issue' ? t('history.issueType') : t('history.settlementType')}</Badge>}
                subtitle={`${row.area} - ${formatDate(row.date)}`}
                value={formatCurrency(row.amount)}
                valueSub={Number(row.dueAmount || 0) > 0 ? formatCurrency(row.dueAmount) : null}
              />
            ))}
          </MobileCardList>
        )}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">{t('common.date')}</th>
                <th className="px-4 py-3">{t('history.type')}</th>
                <th className="px-4 py-3">{t('dsr.title')}</th>
                <th className="px-4 py-3">{t('history.qty')}</th>
                <th className="px-4 py-3">{t('history.amount')}</th>
                <th className="px-4 py-3">{t('history.paid')}</th>
                <th className="px-4 py-3">{t('history.due')}</th>
                <th className="px-4 py-3">{t('dsr.status')}</th>
              </tr>
            </thead>
            {vm.loading ? null : (
              <tbody className="divide-y divide-slate-100">
                {vm.rows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="table-cell font-semibold text-slate-400">{(vm.page - 1) * vm.pageSize + index + 1}</td>
                    <td className="table-cell font-semibold text-slate-950">{formatDate(row.date)}</td>
                    <td className="table-cell">
                      <Badge tone={row.type === 'Morning Issue' ? 'amber' : 'emerald'}>{row.type === 'Morning Issue' ? t('history.issueType') : t('history.settlementType')}</Badge>
                    </td>
                    <td className="table-cell">
                      <p className="font-semibold text-slate-950">{row.dsrName}</p>
                      <p className="text-xs text-slate-500">{row.area}</p>
                    </td>
                    <td className="table-cell">{formatNumber(row.pieces)} pcs</td>
                    <td className="table-cell font-bold">{formatCurrency(row.amount)}</td>
                    <td className="table-cell">{formatCurrency(row.amountPaid || 0)}</td>
                    <td className="table-cell">{formatCurrency(row.dueAmount || 0)}</td>
                    <td className="table-cell">
                      <Badge tone={statusTone(row.status)}>{row.status === 'Issued' ? t('history.issued') : t('history.completed')}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
          {vm.loading ? (
            <div className="p-5">
              <TableSkeleton columns={9} showHeader={false} />
            </div>
          ) : null}
        </div>
        {vm.error ? (
          <div className="p-5">
            <Alert type="error">{vm.error}</Alert>
          </div>
        ) : !vm.loading && !vm.rows.length ? (
          <div className="p-5">
            <EmptyState title={t('history.noMatchTitle')} description={t('history.noMatchDescription')} icon={FileText} />
          </div>
        ) : null}
        {!vm.loading && !vm.error && vm.rows.length ? (
          <div className="border-t border-slate-100 p-4 no-print">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
