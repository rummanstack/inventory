import { Download, FileSpreadsheet, Printer, Handshake } from 'lucide-react';
import { Alert, EmptyState, SectionHeader, StatCard, StatCardSkeleton, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, formatDate, formatNumber } from '../../../utils/calculations.js';
import { useSettlementReportViewModel } from '../viewmodels/useSettlementReportViewModel';

export default function SettlementReportPage() {
  const { t, language } = useInventoryApp();
  const vm = useSettlementReportViewModel();
  const printTargetId = 'settlement-report-print';
  const rows = vm.report?.rows || [];

  const totals = rows.reduce(
    (acc, row) => {
      acc.settlementCount += Number(row.settlementCount || 0);
      acc.totalPayable += Number(row.totalPayable || 0);
      acc.amountPaid += Number(row.amountPaid || 0);
      acc.dueAmount += Number(row.dueAmount || 0);
      acc.discount += Number(row.discount || 0);
      return acc;
    },
    { settlementCount: 0, totalPayable: 0, amountPaid: 0, dueAmount: 0, discount: 0 },
  );

  async function handleExportExcel() {
    const { utils, writeFile } = await import('xlsx');
    const header = ['Date', 'Settlements', 'Total Payable', 'Amount Paid', 'Due', 'Discount'];
    const data = rows.map((row) => [row.date, row.settlementCount, Number(row.totalPayable), Number(row.amountPaid), Number(row.dueAmount), Number(row.discount)]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Settlement Report');
    writeFile(wb, `settlement-report-${vm.dateFrom}-${vm.dateTo}.xlsx`);
  }

  return (
    <div>
      <SectionHeader eyebrow="Reports" title="DSR Settlement Report" description="Daily evening settlement summary for all DSRs." />

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
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
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
            <button type="button" className="btn-secondary" onClick={() => { inventoryApi.recordPrint({ entityType: 'settlement_report', entityId: null, label: 'pdf' }).catch(() => {}); downloadSheetPdf(printTargetId, `settlement-report-${vm.dateFrom}-${vm.dateTo}.pdf`); }}>
              <Download size={18} />{t('purchaseReceive.downloadPdf')}
            </button>
            <button type="button" className="btn-secondary" onClick={handleExportExcel}>
              <FileSpreadsheet size={18} />{t('common.exportExcel')}
            </button>
            <button type="button" className="btn-secondary" onClick={() => { inventoryApi.recordPrint({ entityType: 'settlement_report', entityId: null, label: 'print' }).catch(() => {}); window.print(); }}>
              <Printer size={18} />{t('common.print')}
            </button>
          </div>

          <div id={printTargetId} className="print-target">
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Settlements" value={formatNumber(totals.settlementCount, language)} icon={Handshake} tone="slate" />
              <StatCard title="Total Payable" value={formatCurrency(totals.totalPayable, language)} icon={Handshake} tone="blue" />
              <StatCard title="Amount Paid" value={formatCurrency(totals.amountPaid, language)} icon={Handshake} tone="emerald" />
              <StatCard title="Outstanding Due" value={formatCurrency(totals.dueAmount, language)} icon={Handshake} tone="rose" />
            </div>

            <div className="surface overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-base font-bold text-slate-950">Daily Settlement Summary</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">{t('supplierStatement.when')}</th>
                      <th className="px-4 py-3 text-right">Settlements</th>
                      <th className="px-4 py-3 text-right">Total Payable</th>
                      <th className="px-4 py-3 text-right">Paid</th>
                      <th className="px-4 py-3 text-right">Due</th>
                      <th className="px-4 py-3 text-right">Discount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr key={row.date} className="hover:bg-slate-50">
                        <td className="table-cell font-semibold text-slate-950">{formatDate(row.date, language)}</td>
                        <td className="table-cell text-right">{formatNumber(row.settlementCount, language)}</td>
                        <td className="table-cell text-right font-bold">{formatCurrency(row.totalPayable, language)}</td>
                        <td className="table-cell text-right text-emerald-700">{formatCurrency(row.amountPaid, language)}</td>
                        <td className="table-cell text-right text-rose-700">{formatCurrency(row.dueAmount, language)}</td>
                        <td className="table-cell text-right">{formatCurrency(row.discount, language)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!rows.length ? (
                <div className="p-5">
                  <EmptyState title="No Settlement Data" description="No settlements found for the selected date range." icon={Handshake} />
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
