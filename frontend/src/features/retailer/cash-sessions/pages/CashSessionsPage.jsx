import { Download, FileSpreadsheet, Loader2, Printer, Vault } from 'lucide-react';
import { Alert, Badge, CopyableText, EmptyState, MobileCardList, MobileListCard, Pagination, SectionHeader, TableSkeleton } from '../../../../components/ui.jsx';
import { DatePickerField } from '../../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { downloadSheetPdf } from '../../../../services/printService.js';
import { formatCurrency, formatDateTime, formatNumber } from '../../../../utils/calculations.js';
import { useCashSessionsViewModel } from '../viewmodels/useCashSessionsViewModel';
import { useAsyncAction } from '../../../../hooks/useAsyncAction.js';

const PRINT_ID = 'cash-sessions-print';

function varianceTone(variance) {
  if (variance > 0) return 'green';
  if (variance < 0) return 'rose';
  return 'slate';
}

function varianceLabel(variance) {
  if (variance > 0) return `+${formatCurrency(variance)}`;
  return formatCurrency(variance);
}

export default function CashSessionsPage() {
  const { t } = useInventoryApp();
  const vm = useCashSessionsViewModel();
  const sessions = vm.items || [];
  const [downloadingPdf, downloadPdf] = useAsyncAction();

  const totals = sessions.reduce(
    (acc, s) => {
      acc.cashSalesAmount += s.cashSalesAmount;
      acc.cashSalesCount += s.cashSalesCount;
      acc.variance += s.isOpen ? 0 : (s.variance || 0);
      return acc;
    },
    { cashSalesAmount: 0, cashSalesCount: 0, variance: 0 },
  );

  async function handleExportExcel() {
    const result = await inventoryApi.listRetailCashSessions({
      page: 1,
      pageSize: 10000,
      dateFrom: vm.dateFrom || undefined,
      dateTo: vm.dateTo || undefined,
    });
    const all = result.items || [];
    const { utils, writeFile } = await import('xlsx');
    const header = [
      t('cashSessions.startedAt'),
      t('cashSessions.closedAt'),
      t('cashSessions.openedBy'),
      t('cashSessions.closedBy'),
      t('cashSessions.openingCash'),
      t('cashSessions.salesCount'),
      t('cashSessions.cashSalesAmount'),
      t('cashSessions.expectedCash'),
      t('cashSessions.countedCash'),
      t('cashSessions.variance'),
      t('cashSessions.statusLabel'),
    ];
    const data = all.map((s) => [
      s.startedAt ? new Date(s.startedAt).toLocaleString() : '',
      s.closedAt ? new Date(s.closedAt).toLocaleString() : '',
      s.openedByName || '',
      s.closedByName || '',
      s.openingCash,
      s.cashSalesCount,
      s.cashSalesAmount,
      s.expectedCash,
      s.countedCash ?? '',
      s.isOpen ? '' : s.variance,
      s.isOpen ? t('cashSessions.statusOpen') : t('cashSessions.statusClosed'),
    ]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('cashSessions.sheetName'));
    writeFile(wb, 'cash-sessions.xlsx');
  }

  return (
    <div>
      <SectionHeader
        eyebrow={t('cashSessions.eyebrow')}
        title={t('cashSessions.title')}
        description={t('cashSessions.description')}
      />

      <div id={PRINT_ID} className="surface overflow-hidden print-target">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 no-print">
          <span className="text-sm font-bold text-slate-700">{t('cashSessions.title')}</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => downloadPdf(async () => { await inventoryApi.recordPrint({ entityType: 'cash_sessions', entityId: null, label: 'pdf' }).catch(() => {}); await downloadSheetPdf(PRINT_ID, 'cash-sessions.pdf'); })}
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
              onClick={() => { inventoryApi.recordPrint({ entityType: 'cash_sessions', entityId: null, label: 'print' }).catch(() => {}); window.print(); }}
            >
              <Printer size={14} />
              {t('common.print')}
            </button>
          </div>
        </div>

        <div className="border-b border-slate-100 p-5 no-print">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-3 text-sm font-bold">
              <span className="muted-chip">{formatNumber(vm.total)} {t('cashSessions.sessionCount')}</span>
              <span className="muted-chip">{formatNumber(totals.cashSalesCount)} {t('cashSessions.salesCountLabel')}</span>
              <span className="muted-chip">{formatCurrency(totals.cashSalesAmount)} {t('cashSessions.totalSalesLabel')}</span>
              {totals.variance !== 0 ? (
                <span className={`muted-chip ${totals.variance > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {varianceLabel(totals.variance)} {t('cashSessions.netVariance')}
                </span>
              ) : null}
            </div>
            <div className="flex gap-2">
              <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} placeholder={t('purchaseReceive.dateFrom')} />
              <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} placeholder={t('purchaseReceive.dateTo')} min={vm.dateFrom} />
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
          <>
          <MobileCardList>
            {sessions.map((session) => (
              <MobileListCard
                key={session.id}
                title={formatDateTime(session.startedAt)}
                badge={
                  <Badge tone={session.isOpen ? 'blue' : 'slate'}>
                    {session.isOpen ? t('cashSessions.statusOpen') : t('cashSessions.statusClosed')}
                  </Badge>
                }
                subtitle={session.openedByName || undefined}
                value={formatCurrency(session.cashSalesAmount)}
                valueSub={!session.isOpen ? varianceLabel(session.variance) : null}
                valueClass={!session.isOpen && session.variance !== 0 ? (session.variance > 0 ? 'text-emerald-700' : 'text-rose-700') : undefined}
              />
            ))}
          </MobileCardList>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">{t('cashSessions.startedAt')}</th>
                  <th className="px-4 py-3">{t('cashSessions.closedAt')}</th>
                  <th className="px-4 py-3">{t('cashSessions.openedBy')}</th>
                  <th className="px-4 py-3 text-right">{t('cashSessions.openingCash')}</th>
                  <th className="px-4 py-3 text-right">{t('cashSessions.cashSalesAmount')}</th>
                  <th className="px-4 py-3 text-right">{t('cashSessions.expectedCash')}</th>
                  <th className="px-4 py-3 text-right">{t('cashSessions.countedCash')}</th>
                  <th className="px-4 py-3 text-right">{t('cashSessions.variance')}</th>
                  <th className="px-4 py-3">{t('cashSessions.statusLabel')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50">
                    <td className="table-cell">
                      <div className="font-semibold text-slate-950">{formatDateTime(session.startedAt)}</div>
                      <div className="mt-1"><CopyableText value={session.id} copyLabel="session ID" displayValue={session.id.slice(0, 10)} textClassName="text-xs font-medium text-slate-500" buttonClassName="h-5 w-5" /></div>
                      {session.openedByName ? <div className="text-xs text-slate-500">{session.openedByName}</div> : null}
                    </td>
                    <td className="table-cell text-slate-600">
                      {session.closedAt ? (
                        <>
                          <div>{formatDateTime(session.closedAt)}</div>
                          {session.closedByName ? <div className="text-xs text-slate-500">{session.closedByName}</div> : null}
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="table-cell text-slate-600">{session.openedByName || '—'}</td>
                    <td className="table-cell text-right font-medium">{formatCurrency(session.openingCash)}</td>
                    <td className="table-cell text-right">
                      <div className="font-medium">{formatCurrency(session.cashSalesAmount)}</div>
                      <div className="text-xs text-slate-500">{formatNumber(session.cashSalesCount)} {t('cashSessions.salesCountLabel')}</div>
                    </td>
                    <td className="table-cell text-right font-medium">{formatCurrency(session.expectedCash)}</td>
                    <td className="table-cell text-right font-medium">
                      {session.countedCash !== null && session.countedCash !== undefined
                        ? formatCurrency(session.countedCash)
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="table-cell text-right">
                      {session.isOpen ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className={`font-bold ${session.variance > 0 ? 'text-emerald-700' : session.variance < 0 ? 'text-rose-700' : 'text-slate-600'}`}>
                          {varianceLabel(session.variance)}
                        </span>
                      )}
                    </td>
                    <td className="table-cell">
                      <Badge tone={session.isOpen ? 'blue' : 'slate'}>
                        {session.isOpen ? t('cashSessions.statusOpen') : t('cashSessions.statusClosed')}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}

        {!vm.loading && !vm.error && sessions.length === 0 ? (
          <div className="p-5">
            <EmptyState title={t('cashSessions.noMatchTitle')} description={t('cashSessions.noMatchDescription')} icon={Vault} />
          </div>
        ) : null}

        {!vm.loading && !vm.error && sessions.length > 0 ? (
          <div className="border-t border-slate-100 px-5 py-4 no-print">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
