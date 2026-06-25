import { Download, FileSpreadsheet, Printer, Wallet } from 'lucide-react';
import { Alert, EmptyState, SectionHeader, StatCard, StatCardSkeleton, TableSkeleton } from '../../../../components/ui.jsx';
import { DatePickerField } from '../../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../../services/printService.js';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { formatCurrency, formatDate, formatNumber } from '../../../../utils/calculations.js';
import { useDailySalesReportViewModel } from '../viewmodels/useDailySalesReportViewModel';

export default function DailySalesReportPage() {
  const { t, language } = useInventoryApp();
  const vm = useDailySalesReportViewModel();
  const printTargetId = 'daily-sales-report-print';
  const rows = vm.report?.rows || [];

  async function handleExportExcel() {
    const { utils, writeFile } = await import('xlsx');
    const header = [t('common.date'), t('retailer.dailySalesReport.invoiceCount'), t('retailer.shared.totalAmount'), t('retailer.shared.paidAmountLabel'), t('retailer.shared.dueAmount'), t('retailer.shared.taxAmountLabel'), t('retailer.profitReport.totalProfit')];
    const data = rows.map((row) => [row.date, row.invoiceCount, Number(row.totalAmount), Number(row.paidAmount), Number(row.dueAmount), Number(row.taxAmount), Number(row.totalProfit)]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('retailer.dailySalesReport.sheetName'));
    writeFile(wb, `daily-sales-report-${vm.dateFrom}-${vm.dateTo}.xlsx`);
  }

  const totals = rows.reduce(
    (acc, row) => {
      acc.invoiceCount += row.invoiceCount;
      acc.totalAmount += row.totalAmount;
      acc.paidAmount += row.paidAmount;
      acc.dueAmount += row.dueAmount;
      acc.taxAmount += row.taxAmount || 0;
      return acc;
    },
    { invoiceCount: 0, totalAmount: 0, paidAmount: 0, dueAmount: 0, taxAmount: 0 },
  );

  return (
    <div>
      <SectionHeader
        eyebrow={t('retailer.dailySalesReport.eyebrow')}
        title={t('retailer.dailySalesReport.title')}
        description={t('retailer.dailySalesReport.description')}
      />

      {vm.loading ? (
        <>
          <div className="surface mb-6 grid gap-4 p-5 sm:grid-cols-3">
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
              <div className="h-11 animate-pulse rounded-2xl bg-slate-100" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
              <div className="h-11 animate-pulse rounded-2xl bg-slate-100" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
              <div className="h-11 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>

          <TableSkeleton rows={6} columns={7} />
        </>
      ) : (
        <>
          {vm.error ? (
            <div className="mb-6">
              <Alert type="error">{vm.error}</Alert>
            </div>
          ) : null}

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
              <label className="label">{t('retailer.shared.saleTypeLabel')}</label>
              <select className="input" value={vm.saleType} onChange={(event) => vm.setSaleType(event.target.value)}>
                <option value="">{t('retailer.shared.allSaleTypes')}</option>
                <option value="RETAIL">{t('retailer.shared.saleTypes.RETAIL')}</option>
                <option value="WHOLESALE">{t('retailer.shared.saleTypes.WHOLESALE')}</option>
                <option value="QUICK_SALE">{t('retailer.shared.saleTypes.QUICK_SALE')}</option>
              </select>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2 no-print">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { inventoryApi.recordPrint({ entityType: 'daily_sales_report', entityId: null, label: 'pdf' }).catch(() => {}); downloadSheetPdf(printTargetId, `daily-sales-report-${vm.dateFrom}-${vm.dateTo}.pdf`); }}
            >
              <Download size={18} />
              {t('purchaseReceive.downloadPdf')}
            </button>
            <button type="button" className="btn-secondary" onClick={handleExportExcel}>
              <FileSpreadsheet size={18} />
              {t('common.exportExcel')}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { inventoryApi.recordPrint({ entityType: 'daily_sales_report', entityId: null, label: 'print' }).catch(() => {}); window.print(); }}
            >
              <Printer size={18} />
              {t('common.print')}
            </button>
          </div>

          <div id={printTargetId} className="print-target">
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard title={t('retailer.dailySalesReport.invoiceCount')} value={formatNumber(totals.invoiceCount, language)} icon={Wallet} tone="slate" />
            <StatCard title={t('retailer.shared.totalAmount')} value={formatCurrency(totals.totalAmount, language)} icon={Wallet} tone="blue" />
            <StatCard title={t('retailer.shared.paidAmountLabel')} value={formatCurrency(totals.paidAmount, language)} icon={Wallet} tone="emerald" />
            <StatCard title={t('retailer.shared.dueAmount')} value={formatCurrency(totals.dueAmount, language)} icon={Wallet} tone="rose" />
            <StatCard title={t('retailer.shared.taxAmountLabel')} value={formatCurrency(totals.taxAmount, language)} icon={Wallet} tone="amber" />
          </div>

          <div className="surface overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-slate-950">{t('retailer.dailySalesReport.tableTitle')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">{t('supplierStatement.when')}</th>
                    <th className="px-4 py-3 text-right">{t('retailer.dailySalesReport.invoiceCount')}</th>
                    <th className="px-4 py-3 text-right">{t('retailer.shared.totalAmount')}</th>
                    <th className="px-4 py-3 text-right">{t('retailer.shared.paidAmountLabel')}</th>
                    <th className="px-4 py-3 text-right">{t('retailer.shared.dueAmount')}</th>
                    <th className="px-4 py-3 text-right">{t('retailer.shared.taxAmountLabel')}</th>
                    <th className="px-4 py-3 text-right">{t('retailer.profitReport.totalProfit')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.date} className="hover:bg-slate-50">
                      <td className="table-cell font-semibold text-slate-950">{formatDate(row.date, language)}</td>
                      <td className="table-cell text-right">{formatNumber(row.invoiceCount, language)}</td>
                      <td className="table-cell text-right font-bold">{formatCurrency(row.totalAmount, language)}</td>
                      <td className="table-cell text-right text-emerald-700">{formatCurrency(row.paidAmount, language)}</td>
                      <td className="table-cell text-right text-rose-700">{formatCurrency(row.dueAmount, language)}</td>
                      <td className="table-cell text-right font-bold">{formatCurrency(row.taxAmount, language)}</td>
                      <td className="table-cell text-right font-bold">{formatCurrency(row.totalProfit, language)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!rows.length ? (
              <div className="p-5">
                <EmptyState title={t('retailer.dailySalesReport.noDataTitle')} description={t('retailer.dailySalesReport.noDataDescription')} icon={Wallet} />
              </div>
            ) : null}
          </div>
          </div>
        </>
      )}
    </div>
  );
}
