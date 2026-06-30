import { Download, FileSpreadsheet, Printer, ArrowLeftRight } from 'lucide-react';
import { Alert, EmptyState, SectionHeader, StatCard, StatCardSkeleton, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatDate, formatNumber } from '../../../utils/calculations.js';
import { useStockMovementReportViewModel } from '../viewmodels/useStockMovementReportViewModel';

const MOVEMENT_TYPES = ['PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'DAMAGE', 'TRANSFER'];

export default function StockMovementReportPage() {
  const { t, language } = useInventoryApp();
  const vm = useStockMovementReportViewModel();
  const printTargetId = 'stock-movement-report-print';
  const rows = vm.report?.rows || [];

  const totals = rows.reduce(
    (acc, row) => {
      acc.movementCount += Number(row.movementCount || 0);
      acc.totalIn += Number(row.totalIn || 0);
      acc.totalOut += Number(row.totalOut || 0);
      return acc;
    },
    { movementCount: 0, totalIn: 0, totalOut: 0 },
  );

  async function handleExportExcel() {
    const { utils, writeFile } = await import('xlsx');
    const header = ['Date', 'Type', 'Movements', 'Total In', 'Total Out'];
    const data = rows.map((row) => [row.date, row.type, row.movementCount, Number(row.totalIn), Number(row.totalOut)]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Stock Movement Report');
    writeFile(wb, `stock-movement-report-${vm.dateFrom}-${vm.dateTo}.xlsx`);
  }

  return (
    <div>
      <SectionHeader eyebrow={t('nav.reports')} title="Stock Movement Report" description="Stock in/out summary by type and date." />

      {vm.loading ? (
        <>
          <div className="surface mb-6 grid gap-4 p-5 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
                <div className="h-11 animate-pulse rounded-2xl bg-slate-100" />
              </div>
            ))}
          </div>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
          <TableSkeleton rows={6} columns={5} />
        </>
      ) : (
        <>
          {vm.error ? <div className="mb-6"><Alert type="error">{vm.error}</Alert></div> : null}

          <div className="surface mb-6 grid gap-4 p-5 sm:grid-cols-3">
            <div>
              <label className="label">{t('profit.dateFrom')}</label>
              <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} />
            </div>
            <div>
              <label className="label">{t('profit.dateTo')}</label>
              <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} min={vm.dateFrom} />
            </div>
            <div>
              <label className="label">Movement Type</label>
              <select className="input" value={vm.type} onChange={(e) => vm.setType(e.target.value)}>
                <option value="">All Types</option>
                {MOVEMENT_TYPES.map((mt) => <option key={mt} value={mt}>{mt}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2 no-print">
            <button type="button" className="btn-secondary" onClick={() => { inventoryApi.recordPrint({ entityType: 'stock_movement_report', entityId: null, label: 'pdf' }).catch(() => {}); downloadSheetPdf(printTargetId, `stock-movement-report-${vm.dateFrom}-${vm.dateTo}.pdf`); }}>
              <Download size={18} />{t('purchaseReceive.downloadPdf')}
            </button>
            <button type="button" className="btn-secondary" onClick={handleExportExcel}>
              <FileSpreadsheet size={18} />{t('common.exportExcel')}
            </button>
            <button type="button" className="btn-secondary" onClick={() => { inventoryApi.recordPrint({ entityType: 'stock_movement_report', entityId: null, label: 'print' }).catch(() => {}); window.print(); }}>
              <Printer size={18} />{t('common.print')}
            </button>
          </div>

          <div id={printTargetId} className="print-target">
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <StatCard title="Total Movements" value={formatNumber(totals.movementCount, language)} icon={ArrowLeftRight} tone="slate" />
              <StatCard title="Total In (pcs)" value={formatNumber(totals.totalIn, language)} icon={ArrowLeftRight} tone="emerald" />
              <StatCard title="Total Out (pcs)" value={formatNumber(totals.totalOut, language)} icon={ArrowLeftRight} tone="rose" />
            </div>

            <div className="surface overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="section-title">Stock Movements by Date & Type</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">{t('supplierStatement.when')}</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3 text-right">Movements</th>
                      <th className="px-4 py-3 text-right">Total In</th>
                      <th className="px-4 py-3 text-right">Total Out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row, i) => (
                      <tr key={`${row.date}-${row.type}-${i}`} className="hover:bg-slate-50">
                        <td className="table-cell font-semibold text-slate-950">{formatDate(row.date, language)}</td>
                        <td className="table-cell"><span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold">{row.type}</span></td>
                        <td className="table-cell text-right">{formatNumber(row.movementCount, language)}</td>
                        <td className="table-cell text-right text-emerald-700">{formatNumber(row.totalIn, language)}</td>
                        <td className="table-cell text-right text-rose-700">{formatNumber(row.totalOut, language)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!rows.length ? (
                <div className="p-5">
                  <EmptyState title="No Movement Data" description="No stock movements found for the selected date range." icon={ArrowLeftRight} />
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
