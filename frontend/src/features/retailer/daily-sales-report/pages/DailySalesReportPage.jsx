import { Download, FileSpreadsheet, Printer, Wallet } from 'lucide-react';
import { Alert, EmptyState, LoadingState, SectionHeader, StatCard } from '../../../../components/ui.jsx';
import { DatePickerField } from '../../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../../services/printService.js';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { formatCurrency, formatDate, formatNumber } from '../../../../utils/calculations.js';
import { useDailySalesReportViewModel } from '../viewmodels/useDailySalesReportViewModel';

export default function DailySalesReportPage() {
  const { t } = useInventoryApp();
  const vm = useDailySalesReportViewModel();
  const printTargetId = 'daily-sales-report-print';
  const rows = vm.report?.rows || [];

  async function handleExportExcel() {
    const { utils, writeFile } = await import('xlsx');
    const header = ['Date', 'Invoices', 'Total Amount', 'Paid Amount', 'Due Amount', 'Profit'];
    const data = rows.map((row) => [row.date, row.invoiceCount, Number(row.totalAmount), Number(row.paidAmount), Number(row.dueAmount), Number(row.totalProfit)]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Daily Sales');
    writeFile(wb, `daily-sales-report-${vm.dateFrom}-${vm.dateTo}.xlsx`);
  }

  const totals = rows.reduce(
    (acc, row) => {
      acc.invoiceCount += row.invoiceCount;
      acc.totalAmount += row.totalAmount;
      acc.paidAmount += row.paidAmount;
      acc.dueAmount += row.dueAmount;
      return acc;
    },
    { invoiceCount: 0, totalAmount: 0, paidAmount: 0, dueAmount: 0 },
  );

  return (
    <div>
      <SectionHeader
        eyebrow={t('retailer.dailySalesReport.eyebrow')}
        title={t('retailer.dailySalesReport.title')}
        description={t('retailer.dailySalesReport.description')}
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
        <LoadingState />
      ) : (
        <>
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
              Export as Excel
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { inventoryApi.recordPrint({ entityType: 'daily_sales_report', entityId: null, label: 'print' }).catch(() => {}); window.print(); }}
            >
              <Printer size={18} />
              {t('purchaseReceive.printSheet')}
            </button>
          </div>

          <div id={printTargetId}>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title={t('retailer.dailySalesReport.invoiceCount')} value={formatNumber(totals.invoiceCount)} icon={Wallet} tone="slate" />
            <StatCard title={t('retailer.shared.totalAmount')} value={formatCurrency(totals.totalAmount)} icon={Wallet} tone="blue" />
            <StatCard title={t('retailer.shared.paidAmountLabel')} value={formatCurrency(totals.paidAmount)} icon={Wallet} tone="emerald" />
            <StatCard title={t('retailer.shared.dueAmount')} value={formatCurrency(totals.dueAmount)} icon={Wallet} tone="rose" />
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
                    <th className="px-4 py-3 text-right">{t('retailer.profitReport.totalProfit')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.date} className="hover:bg-slate-50">
                      <td className="table-cell font-semibold text-slate-950">{formatDate(row.date)}</td>
                      <td className="table-cell text-right">{formatNumber(row.invoiceCount)}</td>
                      <td className="table-cell text-right font-bold">{formatCurrency(row.totalAmount)}</td>
                      <td className="table-cell text-right text-emerald-700">{formatCurrency(row.paidAmount)}</td>
                      <td className="table-cell text-right text-rose-700">{formatCurrency(row.dueAmount)}</td>
                      <td className="table-cell text-right font-bold">{formatCurrency(row.totalProfit)}</td>
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
