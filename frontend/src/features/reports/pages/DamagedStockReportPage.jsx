import { Download, FileSpreadsheet, Printer, PackageX } from 'lucide-react';
import { Alert, EmptyState, SectionHeader, StatCard, StatCardSkeleton, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, formatDate, formatNumber } from '../../../utils/calculations.js';
import { useDamagedStockReportViewModel } from '../viewmodels/useDamagedStockReportViewModel';

export default function DamagedStockReportPage() {
  const { t, language } = useInventoryApp();
  const vm = useDamagedStockReportViewModel();
  const printTargetId = 'damaged-stock-report-print';
  const rows = vm.report?.rows || [];

  const totals = rows.reduce(
    (acc, row) => {
      acc.quantityDamaged += Number(row.quantityDamaged || 0);
      acc.costValue += Number(row.costValue || 0);
      return acc;
    },
    { quantityDamaged: 0, costValue: 0 },
  );

  async function handleExportExcel() {
    const { utils, writeFile } = await import('xlsx');
    const header = ['Date', 'Product', 'Category', 'Qty Damaged', 'Cost Value'];
    const data = rows.map((row) => [row.date, row.productName, row.categoryName || '', Number(row.quantityDamaged), Number(row.costValue)]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 18 }, { wch: 14 }, { wch: 16 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Damaged Stock Report');
    writeFile(wb, `damaged-stock-report-${vm.dateFrom}-${vm.dateTo}.xlsx`);
  }

  return (
    <div>
      <SectionHeader eyebrow={t('nav.reports')} title="Damaged Stock Report" description="Damaged stock by product with quantity and estimated cost." />

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
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => <StatCardSkeleton key={i} />)}
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
            <button type="button" className="btn-secondary" onClick={() => { inventoryApi.recordPrint({ entityType: 'damaged_stock_report', entityId: null, label: 'pdf' }).catch(() => {}); downloadSheetPdf(printTargetId, `damaged-stock-report-${vm.dateFrom}-${vm.dateTo}.pdf`); }}>
              <Download size={18} />{t('purchaseReceive.downloadPdf')}
            </button>
            <button type="button" className="btn-secondary" onClick={handleExportExcel}>
              <FileSpreadsheet size={18} />{t('common.exportExcel')}
            </button>
            <button type="button" className="btn-secondary" onClick={() => { inventoryApi.recordPrint({ entityType: 'damaged_stock_report', entityId: null, label: 'print' }).catch(() => {}); window.print(); }}>
              <Printer size={18} />{t('common.print')}
            </button>
          </div>

          <div id={printTargetId} className="print-target">
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <StatCard title="Total Damaged (pcs)" value={formatNumber(totals.quantityDamaged, language)} icon={PackageX} tone="rose" />
              <StatCard title="Total Cost Value" value={formatCurrency(totals.costValue, language)} icon={PackageX} tone="amber" />
            </div>

            <div className="surface overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="section-title">Damaged Stock by Product</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">{t('supplierStatement.when')}</th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Qty Damaged</th>
                      <th className="px-4 py-3 text-right">Cost Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row, i) => (
                      <tr key={`${row.date}-${row.productId}-${i}`} className="hover:bg-slate-50">
                        <td className="table-cell font-semibold text-slate-950">{formatDate(row.date, language)}</td>
                        <td className="table-cell">{row.productName}</td>
                        <td className="table-cell text-slate-500">{row.categoryName || '—'}</td>
                        <td className="table-cell text-right font-bold text-rose-700">{formatNumber(row.quantityDamaged, language)}</td>
                        <td className="table-cell text-right text-amber-700">{formatCurrency(row.costValue, language)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!rows.length ? (
                <div className="p-5">
                  <EmptyState title="No Damaged Stock" description="No damaged stock records found for the selected date range." icon={PackageX} />
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
