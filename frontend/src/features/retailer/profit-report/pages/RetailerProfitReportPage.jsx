import { Download, FileSpreadsheet, Printer, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Alert, EmptyState, SectionHeader, StatCard, StatCardSkeleton, TableSkeleton } from '../../../../components/ui.jsx';
import { DatePickerField } from '../../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../../services/printService.js';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { formatCurrency, formatDate, formatNumber } from '../../../../utils/calculations.js';
import { useRetailerProfitReportViewModel } from '../viewmodels/useRetailerProfitReportViewModel';

export default function RetailerProfitReportPage() {
  const { t, language } = useInventoryApp();
  const vm = useRetailerProfitReportViewModel();
  const printTargetId = 'retailer-profit-report-print';
  const rows = vm.report?.rows || [];
  const totals = vm.report?.totals || { totalSales: 0, totalProfit: 0, invoiceCount: 0, taxAmount: 0 };

  async function handleExportExcel() {
    const { utils, writeFile } = await import('xlsx');
    const header = [t('common.date'), t('retailer.dailySalesReport.invoiceCount'), t('retailer.profitReport.totalSales'), t('retailer.shared.taxAmountLabel'), t('retailer.profitReport.totalProfit')];
    const data = rows.map((row) => [row.date, row.invoiceCount, Number(row.totalSales), Number(row.taxAmount), Number(row.totalProfit)]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 14 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('retailer.profitReport.sheetName'));
    writeFile(wb, `profit-report-${vm.dateFrom}-${vm.dateTo}.xlsx`);
  }
  const isProfit = totals.totalProfit >= 0;

  return (
    <div>
      <SectionHeader
        eyebrow={t('retailer.profitReport.eyebrow')}
        title={t('retailer.profitReport.title')}
        description={t('retailer.profitReport.description')}
      />

      <div className="surface mb-6 grid gap-4 p-5 sm:grid-cols-3">
        <div>
          <label className="label">{t('profit.dateFrom')}</label>
          <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} />
        </div>
        <div>
          <label className="label">{t('profit.dateTo')}</label>
          <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} />
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

      {vm.error ? (
        <div className="mb-6">
          <Alert type="error">{vm.error}</Alert>
        </div>
      ) : null}

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

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>

          <TableSkeleton rows={6} columns={5} />
        </>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2 no-print">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { inventoryApi.recordPrint({ entityType: 'retailer_profit_report', entityId: null, label: 'pdf' }).catch(() => {}); downloadSheetPdf(printTargetId, `profit-report-${vm.dateFrom}-${vm.dateTo}.pdf`); }}
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
              onClick={() => { inventoryApi.recordPrint({ entityType: 'retailer_profit_report', entityId: null, label: 'print' }).catch(() => {}); window.print(); }}
            >
              <Printer size={18} />
              {t('common.print')}
            </button>
          </div>

          <div id={printTargetId}>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title={t('retailer.dailySalesReport.invoiceCount')} value={formatNumber(totals.invoiceCount, language)} icon={Wallet} tone="slate" />
            <StatCard title={t('retailer.profitReport.totalSales')} value={formatCurrency(totals.totalSales, language)} icon={Wallet} tone="blue" />
            <StatCard title={t('retailer.shared.taxAmountLabel')} value={formatCurrency(totals.taxAmount, language)} icon={Wallet} tone="amber" />
            <StatCard
              title={t('retailer.profitReport.totalProfit')}
              value={formatCurrency(totals.totalProfit, language)}
              icon={isProfit ? TrendingUp : TrendingDown}
              tone={isProfit ? 'emerald' : 'rose'}
            />
          </div>

          <div className="surface overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-slate-950">{t('retailer.profitReport.tableTitle')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">{t('supplierStatement.when')}</th>
                    <th className="px-4 py-3 text-right">{t('retailer.dailySalesReport.invoiceCount')}</th>
                    <th className="px-4 py-3 text-right">{t('retailer.profitReport.totalSales')}</th>
                    <th className="px-4 py-3 text-right">{t('retailer.shared.taxAmountLabel')}</th>
                    <th className="px-4 py-3 text-right">{t('retailer.profitReport.totalProfit')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.date} className="hover:bg-slate-50">
                      <td className="table-cell font-semibold text-slate-950">{formatDate(row.date, language)}</td>
                      <td className="table-cell text-right">{formatNumber(row.invoiceCount, language)}</td>
                      <td className="table-cell text-right font-bold">{formatCurrency(row.totalSales, language)}</td>
                      <td className="table-cell text-right font-bold">{formatCurrency(row.taxAmount, language)}</td>
                      <td className={`table-cell text-right font-bold ${row.totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(row.totalProfit, language)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!rows.length ? (
              <div className="p-5">
                <EmptyState title={t('profit.noDataTitle')} description={t('profit.noDataDescription')} icon={Wallet} />
              </div>
            ) : null}
          </div>
          </div>
        </>
      )}
    </div>
  );
}
