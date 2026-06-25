import { BadgeDollarSign, Download, FileSpreadsheet, PiggyBank, Printer, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Alert, ChartPanel, ChartPanelSkeleton, EmptyState, SectionHeader, StatCard, StatCardSkeleton, TableSkeleton, TrendChart } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi';
import { formatCurrency, formatDate, formatNumber } from '../../../utils/calculations.js';
import { getCssVar } from '../../../utils/theme.js';
import { useProfitViewModel } from '../viewmodels/useProfitViewModel';

const VIEWS = [
  { key: 'daily', dataKey: 'daily', labelKey: 'profit.viewDay' },
  { key: 'weekly', dataKey: 'weekly', labelKey: 'profit.viewWeek' },
  { key: 'monthly', dataKey: 'monthly', labelKey: 'profit.viewMonth' },
];

const BREAKDOWN_TABS = [
  { key: 'dsr', labelKey: 'profit.tabByDsr', feature: 'settlements' },
  { key: 'product', labelKey: 'profit.tabByProduct' },
  { key: 'customer', labelKey: 'profit.tabByCustomer' },
  { key: 'category', labelKey: 'profit.tabByCategory' },
];

function getPeriodLabel(row, view) {
  if (view === 'weekly') {
    return `${formatDate(row.weekStart)} - ${formatDate(row.weekEnd)}`;
  }
  if (view === 'monthly') {
    return row.month;
  }
  return formatDate(row.date);
}

function marginOf(row) {
  if (!row.revenue) return 0;
  return (row.grossProfit / row.revenue) * 100;
}

function BreakdownTable({ t, language, columns, rows, emptyIcon, exportFileName, pdfFileName, sheetName, printId }) {
  async function handleExportExcel() {
    const { utils, writeFile } = await import('xlsx');
    const header = columns.map((column) => column.label);
    const data = rows.map((row) => columns.map((column) => column.value(row)));
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = columns.map((column) => ({ wch: column.width || 16 }));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, sheetName);
    writeFile(wb, exportFileName);
  }

  return (
    <div id={printId} className="surface overflow-hidden print-target">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-bold text-slate-950">{t('profit.tableTitle')}</h2>
        {rows.length ? (
          <div className="flex items-center gap-2 no-print">
            <button
              type="button"
              className="btn-secondary py-1.5 text-xs"
              onClick={() => { inventoryApi.recordPrint({ entityType: 'profit_breakdown', entityId: null, label: 'pdf' }).catch(() => {}); downloadSheetPdf(printId, pdfFileName); }}
            >
              <Download size={14} />
              {t('purchaseReceive.downloadPdf')}
            </button>
            <button type="button" className="btn-secondary py-1.5 text-xs" onClick={handleExportExcel}>
              <FileSpreadsheet size={14} />
              {t('common.exportExcel')}
            </button>
            <button
              type="button"
              className="btn-secondary py-1.5 text-xs"
              onClick={() => { inventoryApi.recordPrint({ entityType: 'profit_breakdown', entityId: null, label: 'print' }).catch(() => {}); window.print(); }}
            >
              <Printer size={14} />
              {t('common.print')}
            </button>
          </div>
        ) : null}
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className={`px-4 py-3 ${column.align === 'right' ? 'text-right' : ''}`}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <tr key={row.key ?? index} className="hover:bg-slate-50">
                  {columns.map((column) => (
                    <td key={column.key} className={`table-cell ${column.align === 'right' ? 'text-right' : ''} ${column.bold ? 'font-bold' : ''}`}>
                      {column.render ? column.render(row) : column.value(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-5">
          <EmptyState title={t('profit.noDataTitle')} description={t('profit.noDataDescription')} icon={emptyIcon} />
        </div>
      )}
    </div>
  );
}

export default function ProfitPage() {
  const { t, language, hasFeature } = useInventoryApp();
  const vm = useProfitViewModel();

  const tabs = [
    { key: 'overview', labelKey: 'profit.tabOverview' },
    ...BREAKDOWN_TABS.filter((tab) => hasFeature(tab.feature)),
  ];

  if (vm.loading && !vm.report) {
    return (
      <div>
        <SectionHeader eyebrow={t('nav.profit')} description={t('profit.description')} />
        <div className="surface mb-6 grid gap-4 p-5 md:grid-cols-2">
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
        <div className="mb-6">
          <ChartPanelSkeleton height="h-80" />
        </div>
        <div>
          <TableSkeleton rows={6} columns={5} />
        </div>
      </div>
    );
  }

  const totals = vm.report?.totals || { revenue: 0, cost: 0, expenses: 0, grossProfit: 0, profit: 0 };
  const isProfit = totals.profit >= 0;
  const activeView = VIEWS.find((entry) => entry.key === vm.view) || VIEWS[0];
  const rows = vm.report?.[activeView.dataKey] || [];
  const chartData = rows.map((row) => ({
    label: getPeriodLabel(row, activeView.key),
    revenue: row.revenue,
    cost: row.cost,
    profit: row.profit,
  }));

  function handleDownloadPdf() {
    inventoryApi.recordPrint({ entityType: 'report', entityId: `${vm.dateFrom}_to_${vm.dateTo}`, label: `profit ${vm.dateFrom} to ${vm.dateTo}` }).catch(() => {});
    return downloadSheetPdf('profit-report-table', `profit-report-${vm.dateFrom}-to-${vm.dateTo}.pdf`);
  }

  function handlePrintOverview() {
    inventoryApi.recordPrint({ entityType: 'report', entityId: `${vm.dateFrom}_to_${vm.dateTo}`, label: `profit ${vm.dateFrom} to ${vm.dateTo} print` }).catch(() => {});
    window.print();
  }

  const breakdownRows = (vm.breakdowns[vm.tab]?.rows || []);

  return (
    <div>
      <SectionHeader eyebrow={t('nav.profit')} description={t('profit.description')} />

      {vm.error ? (
        <div className="mb-6">
          <Alert type="error">{vm.error}</Alert>
        </div>
      ) : null}

      <div className="surface mb-6 grid gap-4 p-5 md:grid-cols-2">
        <div>
          <label className="label">{t('profit.dateFrom')}</label>
          <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} />
        </div>
        <div>
          <label className="label">{t('profit.dateTo')}</label>
          <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} min={vm.dateFrom} />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((entry) => (
          <button
            key={entry.key}
            type="button"
            className={entry.key === vm.tab ? 'btn-primary' : 'btn-secondary'}
            onClick={() => vm.setTab(entry.key)}
          >
            {t(entry.labelKey)}
          </button>
        ))}
      </div>

      {vm.tab === 'overview' ? (
        <>
          <div className="mb-6 flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={handleDownloadPdf}>
              <Download size={18} />
              {t('profit.downloadPdf')}
            </button>
            <button type="button" className="btn-secondary" onClick={handlePrintOverview}>
              <Printer size={18} />
              {t('common.print')}
            </button>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard title={t('profit.revenue')} value={formatCurrency(totals.revenue)} icon={Wallet} tone="blue" helper={t('profit.revenueHelper')} />
            <StatCard title={t('profit.cost')} value={formatCurrency(totals.cost)} icon={BadgeDollarSign} tone="amber" helper={t('profit.costHelper')} />
            <StatCard title={t('profit.grossProfit')} value={formatCurrency(totals.grossProfit)} icon={TrendingUp} tone="slate" helper={t('profit.grossProfitHelper')} />
            <StatCard title={t('profit.expensesLabel')} value={formatCurrency(totals.expenses)} icon={PiggyBank} tone="slate" helper={t('profit.expensesHelper')} />
            <StatCard
              title={t('profit.netProfitLoss')}
              value={formatCurrency(totals.profit)}
              icon={isProfit ? TrendingUp : TrendingDown}
              tone={isProfit ? 'emerald' : 'rose'}
              helper={t('profit.netProfitLossHelper')}
            />
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {VIEWS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                className={entry.key === vm.view ? 'btn-primary' : 'btn-secondary'}
                onClick={() => vm.setView(entry.key)}
              >
                {t(entry.labelKey)}
              </button>
            ))}
          </div>

          <ChartPanel title={t('profit.chartTitle')} description={t('profit.chartDescription')}>
            {chartData.length ? (
              <TrendChart
                data={chartData}
                series={[
                  { key: 'revenue', label: t('profit.revenue'), color: getCssVar('--secondary', '#5e5b8e'), fill: true },
                  { key: 'cost', label: t('profit.cost'), color: getCssVar('--warning', '#f8aa17') },
                  { key: 'profit', label: t('profit.netProfitLoss'), color: getCssVar('--success', '#37a864') },
                ]}
                valueFormatter={formatCurrency}
              />
            ) : (
              <EmptyState title={t('profit.noDataTitle')} description={t('profit.noDataDescription')} icon={Wallet} />
            )}
          </ChartPanel>

          <div id="profit-report-table" className="mt-6 surface overflow-hidden print-target">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-slate-950">{t('profit.tableTitle')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">{t('profit.period')}</th>
                    <th className="px-4 py-3">{t('profit.revenue')}</th>
                    <th className="px-4 py-3">{t('profit.cost')}</th>
                    <th className="px-4 py-3">{t('profit.grossProfit')}</th>
                    <th className="px-4 py-3">{t('profit.expensesLabel')}</th>
                    <th className="px-4 py-3">{t('profit.netProfitLoss')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={getPeriodLabel(row, activeView.key)} className="hover:bg-slate-50">
                      <td className="table-cell">{getPeriodLabel(row, activeView.key)}</td>
                      <td className="table-cell font-semibold">{formatCurrency(row.revenue)}</td>
                      <td className="table-cell">{formatCurrency(row.cost)}</td>
                      <td className="table-cell">{formatCurrency(row.grossProfit)}</td>
                      <td className="table-cell">{formatCurrency(row.expenses)}</td>
                      <td className={`table-cell font-bold ${row.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(row.profit)}
                      </td>
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
        </>
      ) : (
        <>
          <div className="mb-4">
            <Alert type="info">{t('profit.breakdownHint')}</Alert>
          </div>

          {vm.breakdownError ? (
            <div className="mb-4">
              <Alert type="error">{vm.breakdownError}</Alert>
            </div>
          ) : null}

          {vm.breakdownLoading && !vm.breakdowns[vm.tab] ? (
            <TableSkeleton rows={6} columns={5} />
          ) : vm.tab === 'dsr' ? (
            <BreakdownTable
              t={t}
              language={language}
              emptyIcon={Wallet}
              sheetName={t('profit.tabByDsr')}
              printId="profit-breakdown-dsr"
              exportFileName={`profit-by-dsr-${vm.dateFrom}-${vm.dateTo}.xlsx`}
              pdfFileName={`profit-by-dsr-${vm.dateFrom}-${vm.dateTo}.pdf`}
              rows={breakdownRows.map((row) => ({ key: row.dsrId, ...row }))}
              columns={[
                { key: 'name', label: t('profit.dsrName'), value: (row) => row.dsrName || row.dsrId },
                { key: 'revenue', label: t('profit.revenue'), align: 'right', value: (row) => Number(row.revenue), render: (row) => formatCurrency(row.revenue, language) },
                { key: 'cost', label: t('profit.cost'), align: 'right', value: (row) => Number(row.cost), render: (row) => formatCurrency(row.cost, language) },
                { key: 'grossProfit', label: t('profit.grossProfit'), align: 'right', bold: true, value: (row) => Number(row.grossProfit), render: (row) => formatCurrency(row.grossProfit, language) },
                { key: 'margin', label: t('profit.margin'), align: 'right', value: (row) => marginOf(row).toFixed(1), render: (row) => `${marginOf(row).toFixed(1)}%` },
              ]}
            />
          ) : vm.tab === 'product' ? (
            <BreakdownTable
              t={t}
              language={language}
              emptyIcon={Wallet}
              sheetName={t('profit.tabByProduct')}
              printId="profit-breakdown-product"
              exportFileName={`profit-by-product-${vm.dateFrom}-${vm.dateTo}.xlsx`}
              pdfFileName={`profit-by-product-${vm.dateFrom}-${vm.dateTo}.pdf`}
              rows={breakdownRows.map((row) => ({ key: row.productId, ...row }))}
              columns={[
                { key: 'name', label: t('profit.productName'), value: (row) => row.productName },
                { key: 'category', label: t('profit.categoryName'), value: (row) => row.categoryName || t('profit.uncategorized') },
                { key: 'quantity', label: t('profit.quantity'), align: 'right', value: (row) => formatNumber(row.quantity, language) },
                { key: 'revenue', label: t('profit.revenue'), align: 'right', value: (row) => Number(row.revenue), render: (row) => formatCurrency(row.revenue, language) },
                { key: 'cost', label: t('profit.cost'), align: 'right', value: (row) => Number(row.cost), render: (row) => formatCurrency(row.cost, language) },
                { key: 'grossProfit', label: t('profit.grossProfit'), align: 'right', bold: true, value: (row) => Number(row.grossProfit), render: (row) => formatCurrency(row.grossProfit, language) },
                { key: 'margin', label: t('profit.margin'), align: 'right', value: (row) => marginOf(row).toFixed(1), render: (row) => `${marginOf(row).toFixed(1)}%` },
              ]}
            />
          ) : vm.tab === 'customer' ? (
            <BreakdownTable
              t={t}
              language={language}
              emptyIcon={Wallet}
              sheetName={t('profit.tabByCustomer')}
              printId="profit-breakdown-customer"
              exportFileName={`profit-by-customer-${vm.dateFrom}-${vm.dateTo}.xlsx`}
              pdfFileName={`profit-by-customer-${vm.dateFrom}-${vm.dateTo}.pdf`}
              rows={breakdownRows.map((row, index) => ({ key: row.customerId || `walk-in-${index}`, ...row }))}
              columns={[
                { key: 'name', label: t('profit.customerName'), value: (row) => row.customerName || t('profit.walkInCustomer') },
                { key: 'invoiceCount', label: t('profit.invoiceCount'), align: 'right', value: (row) => formatNumber(row.invoiceCount, language) },
                { key: 'revenue', label: t('profit.revenue'), align: 'right', value: (row) => Number(row.revenue), render: (row) => formatCurrency(row.revenue, language) },
                { key: 'grossProfit', label: t('profit.grossProfit'), align: 'right', bold: true, value: (row) => Number(row.grossProfit), render: (row) => formatCurrency(row.grossProfit, language) },
                { key: 'margin', label: t('profit.margin'), align: 'right', value: (row) => marginOf(row).toFixed(1), render: (row) => `${marginOf(row).toFixed(1)}%` },
              ]}
            />
          ) : (
            <BreakdownTable
              t={t}
              language={language}
              emptyIcon={Wallet}
              sheetName={t('profit.tabByCategory')}
              printId="profit-breakdown-category"
              exportFileName={`profit-by-category-${vm.dateFrom}-${vm.dateTo}.xlsx`}
              pdfFileName={`profit-by-category-${vm.dateFrom}-${vm.dateTo}.pdf`}
              rows={breakdownRows.map((row, index) => ({ key: row.categoryId || `uncategorized-${index}`, ...row }))}
              columns={[
                { key: 'name', label: t('profit.categoryName'), value: (row) => row.categoryName || t('profit.uncategorized') },
                { key: 'quantity', label: t('profit.quantity'), align: 'right', value: (row) => formatNumber(row.quantity, language) },
                { key: 'revenue', label: t('profit.revenue'), align: 'right', value: (row) => Number(row.revenue), render: (row) => formatCurrency(row.revenue, language) },
                { key: 'cost', label: t('profit.cost'), align: 'right', value: (row) => Number(row.cost), render: (row) => formatCurrency(row.cost, language) },
                { key: 'grossProfit', label: t('profit.grossProfit'), align: 'right', bold: true, value: (row) => Number(row.grossProfit), render: (row) => formatCurrency(row.grossProfit, language) },
                { key: 'margin', label: t('profit.margin'), align: 'right', value: (row) => marginOf(row).toFixed(1), render: (row) => `${marginOf(row).toFixed(1)}%` },
              ]}
            />
          )}
        </>
      )}
    </div>
  );
}
