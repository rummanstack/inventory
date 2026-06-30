import { Download, FileSpreadsheet, Printer, ShoppingBag } from 'lucide-react';
import { Alert, EmptyState, SectionHeader, StatCard, StatCardSkeleton, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, formatDate, formatNumber } from '../../../utils/calculations.js';
import { usePurchaseReportViewModel } from '../viewmodels/usePurchaseReportViewModel';

export default function PurchaseReportPage() {
  const { t, language } = useInventoryApp();
  const vm = usePurchaseReportViewModel();
  const printTargetId = 'purchase-report-print';
  const rows = vm.report?.rows || [];

  const totals = rows.reduce(
    (acc, row) => {
      acc.purchaseCount += Number(row.purchaseCount || 0);
      acc.totalAmount += Number(row.totalAmount || 0);
      acc.paidAmount += Number(row.paidAmount || 0);
      acc.dueAmount += Number(row.dueAmount || 0);
      return acc;
    },
    { purchaseCount: 0, totalAmount: 0, paidAmount: 0, dueAmount: 0 },
  );

  async function handleExportExcel() {
    const { utils, writeFile } = await import('xlsx');
    const header = ['Date', 'Purchases', 'Total Amount', 'Paid', 'Due'];
    const data = rows.map((row) => [row.date, row.purchaseCount, Number(row.totalAmount), Number(row.paidAmount), Number(row.dueAmount)]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Purchase Report');
    writeFile(wb, `purchase-report-${vm.dateFrom}-${vm.dateTo}.xlsx`);
  }

  return (
    <div>
      <SectionHeader eyebrow="Reports" title="Purchase Report" description="Daily purchase summary with amounts paid and outstanding." />

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
          <TableSkeleton rows={6} columns={5} />
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
            <button type="button" className="btn-secondary" onClick={() => { inventoryApi.recordPrint({ entityType: 'purchase_report', entityId: null, label: 'pdf' }).catch(() => {}); downloadSheetPdf(printTargetId, `purchase-report-${vm.dateFrom}-${vm.dateTo}.pdf`); }}>
              <Download size={18} />{t('purchaseReceive.downloadPdf')}
            </button>
            <button type="button" className="btn-secondary" onClick={handleExportExcel}>
              <FileSpreadsheet size={18} />{t('common.exportExcel')}
            </button>
            <button type="button" className="btn-secondary" onClick={() => { inventoryApi.recordPrint({ entityType: 'purchase_report', entityId: null, label: 'print' }).catch(() => {}); window.print(); }}>
              <Printer size={18} />{t('common.print')}
            </button>
          </div>

          <div id={printTargetId} className="print-target">
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Total Purchases" value={formatNumber(totals.purchaseCount, language)} icon={ShoppingBag} tone="slate" />
              <StatCard title="Total Amount" value={formatCurrency(totals.totalAmount, language)} icon={ShoppingBag} tone="blue" />
              <StatCard title="Paid Amount" value={formatCurrency(totals.paidAmount, language)} icon={ShoppingBag} tone="emerald" />
              <StatCard title="Due Amount" value={formatCurrency(totals.dueAmount, language)} icon={ShoppingBag} tone="rose" />
            </div>

            <div className="surface overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="section-title">Daily Purchase Summary</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">{t('supplierStatement.when')}</th>
                      <th className="px-4 py-3 text-right">Purchases</th>
                      <th className="px-4 py-3 text-right">Total Amount</th>
                      <th className="px-4 py-3 text-right">Paid</th>
                      <th className="px-4 py-3 text-right">Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr key={row.date} className="hover:bg-slate-50">
                        <td className="table-cell font-semibold text-slate-950">{formatDate(row.date, language)}</td>
                        <td className="table-cell text-right">{formatNumber(row.purchaseCount, language)}</td>
                        <td className="table-cell text-right font-bold">{formatCurrency(row.totalAmount, language)}</td>
                        <td className="table-cell text-right text-emerald-700">{formatCurrency(row.paidAmount, language)}</td>
                        <td className="table-cell text-right text-rose-700">{formatCurrency(row.dueAmount, language)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!rows.length ? (
                <div className="p-5">
                  <EmptyState title="No Purchase Data" description="No purchase receipts found for the selected date range." icon={ShoppingBag} />
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
