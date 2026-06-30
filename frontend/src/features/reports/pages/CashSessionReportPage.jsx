import { Download, FileSpreadsheet, Printer, Vault } from 'lucide-react';
import { Alert, EmptyState, SectionHeader, StatCard, StatCardSkeleton, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, formatDate } from '../../../utils/calculations.js';
import { useCashSessionReportViewModel } from '../viewmodels/useCashSessionReportViewModel';

export default function CashSessionReportPage() {
  const { t, language } = useInventoryApp();
  const vm = useCashSessionReportViewModel();
  const printTargetId = 'cash-session-report-print';
  const rows = vm.report?.rows || [];

  const totals = rows.reduce(
    (acc, row) => {
      acc.openingCash += Number(row.openingCash || 0);
      acc.closingCash += Number(row.closingCash || 0);
      acc.totalSales += Number(row.totalSales || 0);
      return acc;
    },
    { openingCash: 0, closingCash: 0, totalSales: 0 },
  );

  async function handleExportExcel() {
    const { utils, writeFile } = await import('xlsx');
    const header = ['Date', 'Opened At', 'Closed At', 'Opening Cash', 'Closing Cash', 'Total Sales', 'Status'];
    const data = rows.map((row) => [
      row.sessionDate ? row.sessionDate.slice(0, 10) : '',
      row.openedAt ? new Date(row.openedAt).toLocaleTimeString() : '',
      row.closedAt ? new Date(row.closedAt).toLocaleTimeString() : 'Open',
      Number(row.openingCash),
      Number(row.closingCash || 0),
      Number(row.totalSales || 0),
      row.status,
    ]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Cash Session Report');
    writeFile(wb, `cash-session-report-${vm.dateFrom}-${vm.dateTo}.xlsx`);
  }

  return (
    <div>
      <SectionHeader eyebrow={t('nav.reports')} title="Cash Session Report" description="Retail cash session history with opening/closing balances." />

      {vm.loading ? (
        <>
          <div className="surface mb-6 grid gap-4 p-5 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
                <div className="h-11 animate-pulse rounded-2xl bg-slate-100" />
              </div>
            ))}
          </div>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
          <TableSkeleton rows={6} columns={6} />
        </>
      ) : (
        <>
          {vm.error ? <div className="mb-6"><Alert type="error">{vm.error}</Alert></div> : null}

          <div className="surface mb-6 grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <label className="label">{t('profit.dateFrom')}</label>
              <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} />
            </div>
            <div>
              <label className="label">{t('profit.dateTo')}</label>
              <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} min={vm.dateFrom} />
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2 no-print">
            <button type="button" className="btn-secondary" onClick={() => { inventoryApi.recordPrint({ entityType: 'cash_session_report', entityId: null, label: 'pdf' }).catch(() => {}); downloadSheetPdf(printTargetId, `cash-session-report-${vm.dateFrom}-${vm.dateTo}.pdf`); }}>
              <Download size={18} />{t('purchaseReceive.downloadPdf')}
            </button>
            <button type="button" className="btn-secondary" onClick={handleExportExcel}>
              <FileSpreadsheet size={18} />{t('common.exportExcel')}
            </button>
            <button type="button" className="btn-secondary" onClick={() => { inventoryApi.recordPrint({ entityType: 'cash_session_report', entityId: null, label: 'print' }).catch(() => {}); window.print(); }}>
              <Printer size={18} />{t('common.print')}
            </button>
          </div>

          <div id={printTargetId} className="print-target">
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <StatCard title="Total Sessions" value={String(rows.length)} icon={Vault} tone="slate" />
              <StatCard title="Total Opening Cash" value={formatCurrency(totals.openingCash, language)} icon={Vault} tone="blue" />
              <StatCard title="Total Sales" value={formatCurrency(totals.totalSales, language)} icon={Vault} tone="emerald" />
            </div>

            <div className="surface overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="section-title">Cash Session History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">{t('supplierStatement.when')}</th>
                      <th className="px-4 py-3 text-right">Opening Cash</th>
                      <th className="px-4 py-3 text-right">Closing Cash</th>
                      <th className="px-4 py-3 text-right">Total Sales</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="table-cell font-semibold text-slate-950">{formatDate(row.sessionDate || row.openedAt, language)}</td>
                        <td className="table-cell text-right">{formatCurrency(row.openingCash, language)}</td>
                        <td className="table-cell text-right">{row.closingCash != null ? formatCurrency(row.closingCash, language) : '—'}</td>
                        <td className="table-cell text-right font-bold text-emerald-700">{formatCurrency(row.totalSales || 0, language)}</td>
                        <td className="table-cell">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${row.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{row.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!rows.length ? (
                <div className="p-5">
                  <EmptyState title="No Sessions" description="No cash sessions found for the selected date range." icon={Vault} />
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
