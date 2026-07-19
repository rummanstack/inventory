import { useEffect, useState } from 'react';
import { CircleDollarSign, Download, FileSpreadsheet, Loader2, Printer, TrendingDown, TrendingUp } from 'lucide-react';
import { Alert, ChartPanel, ChartPanelSkeleton, cx, HorizontalBarChart, SectionHeader, StatCard, StatCardSkeleton } from '../../../components/ui.jsx';
import { DateRangePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, formatNumber, todayISO } from '../../../utils/calculations.js';
import { getCssVar } from '../../../utils/theme.js';
import { useRangeReportViewModel } from '../viewmodels/useRangeReportViewModel';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';

const RANGE_REPORT_PRINT_ID = 'finance-dashboard-range-report';
function formatPercent(value) {
  if (!Number.isFinite(value)) return '-';
  return `${value.toFixed(1)}%`;
}

function BreakdownList({ items, language }) {
  return (
    <div className="flex flex-1 flex-col divide-y divide-slate-100">
      {items.map(({ label, value, valueClass, bold }, index) => {
        const pinToBottom = bold && index === items.length - 1;
        return (
          <div
            key={label}
            className={cx(
              'flex items-center justify-between px-5 py-3',
              bold && 'bg-slate-50',
              pinToBottom && 'mt-auto',
            )}
          >
            <span className={cx('text-sm', bold ? 'font-bold text-slate-950' : 'text-slate-600')}>{label}</span>
            <span className={cx('text-sm font-semibold', valueClass || 'text-slate-800', bold && 'font-bold')}>{formatCurrency(value, language)}</span>
          </div>
        );
      })}
    </div>
  );
}
function BreakdownPanelSkeleton({ rows = 4 }) {
  return (
    <div className="surface flex h-full flex-col overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="h-4 w-36 animate-pulse rounded-full bg-slate-200" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3">
            <div className="h-3.5 w-28 animate-pulse rounded-full bg-slate-200" />
            <div className="h-3.5 w-20 animate-pulse rounded-full bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FinanceDashboardPage() {
  const { t, language } = useInventoryApp();
  const rr = useRangeReportViewModel();
  // Activate print styling only while this report is being printed.
  const [printingSection, setPrintingSection] = useState(null);
  const [downloadingRangePdf, downloadRangePdf] = useAsyncAction();
  const [exportingRangeExcel, exportRangeExcel] = useAsyncAction();

  const netReceivable = rr.data
    ? rr.data.totalDsrDue + rr.data.totalCustomerDue - rr.data.totalSupplierDue
    : 0;

  const chartPalette = [
    getCssVar('--secondary', '#4b4b6a'),
    getCssVar('--warning', '#f8aa17'),
    getCssVar('--success', '#37a864'),
    getCssVar('--danger', '#f1454f'),
    getCssVar('--teal', '#0891b2'),
    getCssVar('--purple', '#9b44ad'),
  ];
  const profitComparisonData = rr.data ? [
    { label: t('financeDashboard.totalRevenue'), value: rr.data.revenue, color: chartPalette[0] },
    { label: t('financeDashboard.costOfGoods'), value: rr.data.cogs, color: chartPalette[1] },
    { label: t('financeDashboard.totalExpenses'), value: rr.data.totalExpenses, color: '#64748b' },
    { label: t('financeDashboard.grossProfit'), value: rr.data.grossProfit, color: rr.data.grossProfit >= 0 ? chartPalette[2] : chartPalette[3] },
    { label: t('financeDashboard.netProfit'), value: rr.data.netProfit, color: rr.data.netProfit >= 0 ? chartPalette[4] : chartPalette[3] },
  ] : [];
  const rankedExpenses = rr.data
    ? [...rr.data.expenseBreakdown].sort((a, b) => Number(b.amount) - Number(a.amount))
    : [];
  const expenseChartData = rankedExpenses.slice(0, 5).map((item, index) => ({
    label: item.category,
    value: item.amount,
    color: chartPalette[index % chartPalette.length],
  }));
  if (rankedExpenses.length > 5) {
    expenseChartData.push({
      label: t('financeDashboard.otherExpenses'),
      value: rankedExpenses.slice(5).reduce((sum, item) => sum + Number(item.amount || 0), 0),
      color: chartPalette[5],
    });
  }

  useEffect(() => {
    const resetPrintingSection = () => setPrintingSection(null);
    window.addEventListener('afterprint', resetPrintingSection);
    return () => window.removeEventListener('afterprint', resetPrintingSection);
  }, []);

  function printSection(section, entityType) {
    inventoryApi.recordPrint({ entityType, entityId: null, label: 'print' }).catch(() => {});
    setPrintingSection(section);
    requestAnimationFrame(() => window.print());
  }

  async function handleExportRangeReportExcel() {
    if (!rr.data) return;
    const { utils, writeFile } = await import('xlsx');
    const header = [t('financeDashboard.profitBreakdown'), t('common.total')];
    const rows = [
      [t('financeDashboard.revenue'), Number(rr.data.revenue)],
      [t('financeDashboard.costOfGoods'), Number(rr.data.cogs)],
      [t('financeDashboard.grossProfit'), Number(rr.data.grossProfit)],
      [t('financeDashboard.operatingExpenses'), Number(rr.data.totalExpenses)],
      [t('financeDashboard.netProfit'), Number(rr.data.netProfit)],
      [],
      [t('financeDashboard.expenseBreakdown')],
      ...rr.data.expenseBreakdown.map((item) => [item.category, Number(item.amount)]),
      [],
      [t('financeDashboard.outstandingBalances')],
      [t('financeDashboard.dueFromDsrs'), Number(rr.data.totalDsrDue)],
      [t('financeDashboard.dueFromCustomers'), Number(rr.data.totalCustomerDue)],
      [t('financeDashboard.oweToSuppliers'), Number(rr.data.totalSupplierDue)],
      [t('financeDashboard.netReceivable'), Number(netReceivable)],
      [],
      [t('financeDashboard.cashFlow')],
      [t('financeDashboard.totalInflow'), Number(rr.data.cashFlow.inflow)],
      [t('financeDashboard.totalOutflow'), Number(rr.data.cashFlow.outflow)],
      [t('financeDashboard.netMovement'), Number(rr.data.cashFlow.inflow - rr.data.cashFlow.outflow)],
      [],
      [t('financeDashboard.salesSummary')],
      [t('financeDashboard.totalSales'), Number(rr.data.sales.totalAmount)],
      [t('financeDashboard.amountCollected'), Number(rr.data.sales.paidAmount)],
      [t('financeDashboard.outstanding'), Number(rr.data.sales.totalAmount - rr.data.sales.paidAmount)],
      [t('financeDashboard.avgPerInvoice'), Number(rr.data.sales.averageInvoice)],
    ];
    const ws = utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = [{ wch: 28 }, { wch: 18 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('financeDashboard.rangeTitle'));
    writeFile(wb, `finance-dashboard-${rr.dateFrom}-${rr.dateTo}.xlsx`);
  }

  return (
    <div className="space-y-6">
      <SectionHeader title={t('financeDashboard.title')} compact />

      <div>
        <div className="surface mb-6 flex flex-wrap items-end gap-4 p-5">
          <div className="w-full sm:w-80">
            <label className="label">{t('financeDashboard.from')} - {t('financeDashboard.to')}</label>
            <DateRangePickerField
              from={rr.dateFrom}
              to={rr.dateTo}
              onChange={(from, to) => { rr.setDateFrom(from); rr.setDateTo(to); }}
              placeholder={`${t('financeDashboard.from')} - ${t('financeDashboard.to')}`}
              max={todayISO()}
            />
          </div>
          <button
            type="button"
            className="btn-primary w-full shrink-0 sm:w-auto sm:min-w-40"
            onClick={rr.applyRange}
            disabled={rr.loading}
            aria-busy={rr.loading}
          >
            {rr.loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {t('financeDashboard.generateReport')}
          </button>
          {rr.data ? (
            <div className="no-print flex w-full flex-wrap gap-2 lg:ml-auto lg:w-auto">
              <button
                type="button"
                className="btn-secondary h-10 gap-1.5 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => downloadRangePdf(async () => {
                  await inventoryApi.recordPrint({ entityType: 'finance_dashboard', entityId: null, label: 'pdf' }).catch(() => {});
                  await downloadSheetPdf(RANGE_REPORT_PRINT_ID, `finance-dashboard-${rr.dateFrom}-${rr.dateTo}.pdf`);
                })}
                disabled={downloadingRangePdf}
              >
                {downloadingRangePdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {t('purchaseReceive.downloadPdf')}
              </button>
              <button
                type="button"
                className="btn-secondary h-10 gap-1.5 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => exportRangeExcel(handleExportRangeReportExcel)}
                disabled={exportingRangeExcel}
              >
                {exportingRangeExcel ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                {t('common.exportExcel')}
              </button>
              <button
                type="button"
                className="btn-secondary h-10 gap-1.5 px-3 text-xs"
                onClick={() => printSection('range', 'finance_dashboard')}
              >
                <Printer size={14} />
                {t('common.print')}
              </button>
            </div>
          ) : null}
        </div>

        {rr.error ? (
          <Alert type="error">{rr.error}</Alert>
        ) : rr.loading ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)}
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              <ChartPanelSkeleton height="h-[300px]" />
              <ChartPanelSkeleton height="h-[300px]" />
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <BreakdownPanelSkeleton key={i} />)}
            </div>
          </div>
        ) : rr.data ? (
          <div id={RANGE_REPORT_PRINT_ID} className={cx('space-y-6', printingSection === 'range' && 'print-target')}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <StatCard title={t('financeDashboard.totalRevenue')} value={formatCurrency(rr.data.revenue, language)} icon={TrendingUp} tone="blue" />
              <StatCard title={t('financeDashboard.costOfGoods')} value={formatCurrency(rr.data.cogs, language)} icon={CircleDollarSign} tone="amber" />
              <StatCard title={t('financeDashboard.totalExpenses')} value={formatCurrency(rr.data.totalExpenses, language)} icon={CircleDollarSign} tone="slate" />
              <StatCard title={t('financeDashboard.grossProfit')} value={formatCurrency(rr.data.grossProfit, language)} icon={TrendingUp} tone="emerald" />
              <StatCard
                title={t('financeDashboard.netProfit')}
                value={formatCurrency(rr.data.netProfit, language)}
                icon={rr.data.netProfit >= 0 ? TrendingUp : TrendingDown}
                tone={rr.data.netProfit >= 0 ? 'emerald' : 'rose'}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <ChartPanel
                title={t('financeDashboard.profitComparisonTitle')}
                description={t('financeDashboard.profitComparisonDescription')}
              >
                <HorizontalBarChart
                  data={profitComparisonData}
                  valueFormatter={(value) => formatCurrency(value, language)}
                  height={300}
                />
              </ChartPanel>

              <ChartPanel
                title={t('financeDashboard.expenseChartTitle')}
                description={t('financeDashboard.expenseChartDescription')}
              >
                {expenseChartData.length ? (
                  <HorizontalBarChart
                    data={expenseChartData}
                    valueFormatter={(value) => formatCurrency(value, language)}
                    height={300}
                  />
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-center text-sm font-medium text-slate-400">
                    {t('financeDashboard.noExpensesInPeriod')}
                  </div>
                )}
              </ChartPanel>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="surface flex h-full flex-col overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h3 className="text-sm font-bold text-slate-950">{t('financeDashboard.profitBreakdown')}</h3>
                </div>
                <BreakdownList
                  language={language}
                  items={[
                    { label: t('financeDashboard.revenue'), value: rr.data.revenue, valueClass: 'text-blue-600' },
                    { label: t('financeDashboard.costOfGoods'), value: rr.data.cogs, valueClass: 'text-amber-600' },
                    { label: t('financeDashboard.grossProfit'), value: rr.data.grossProfit, valueClass: rr.data.grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600', bold: true },
                    { label: t('financeDashboard.operatingExpenses'), value: rr.data.totalExpenses, valueClass: 'text-slate-600' },
                    { label: t('financeDashboard.netProfit'), value: rr.data.netProfit, valueClass: rr.data.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600', bold: true },
                  ]}
                />
              </div>

              <div className="surface flex h-full flex-col overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h3 className="text-sm font-bold text-slate-950">{t('financeDashboard.expenseBreakdown')}</h3>
                </div>
                {rr.data.expenseBreakdown.length === 0 ? (
                  <div className="p-5">
                    <p className="text-sm text-slate-400">{t('financeDashboard.noExpensesInPeriod')}</p>
                  </div>
                ) : (
                  <BreakdownList
                    language={language}
                    items={[
                      ...rr.data.expenseBreakdown.map((item) => ({ label: item.category, value: item.amount })),
                      { label: t('common.total'), value: rr.data.totalExpenses, bold: true },
                    ]}
                  />
                )}
              </div>

              <div className="surface flex h-full flex-col overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h3 className="text-sm font-bold text-slate-950">{t('financeDashboard.outstandingBalances')}</h3>
                  <p className="mt-0.5 text-xs text-slate-400">{t('financeDashboard.currentBalancesToday')}</p>
                </div>
                <BreakdownList
                  language={language}
                  items={[
                    { label: t('financeDashboard.dueFromDsrs'), value: rr.data.totalDsrDue, valueClass: 'text-amber-600' },
                    { label: t('financeDashboard.dueFromCustomers'), value: rr.data.totalCustomerDue, valueClass: 'text-amber-600' },
                    { label: t('financeDashboard.oweToSuppliers'), value: rr.data.totalSupplierDue, valueClass: 'text-rose-600' },
                    { label: t('financeDashboard.netReceivable'), value: netReceivable, valueClass: netReceivable >= 0 ? 'text-emerald-600' : 'text-rose-600', bold: true },
                  ]}
                />
              </div>

              <div className="surface flex h-full flex-col overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h3 className="text-sm font-bold text-slate-950">{t('financeDashboard.marginAnalysis')}</h3>
                  <p className="mt-0.5 text-xs text-slate-400">{t('financeDashboard.asPercentageOfRevenue')}</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {[
                    { label: t('financeDashboard.grossMargin'), pct: rr.data.revenue > 0 ? (rr.data.grossProfit / rr.data.revenue) * 100 : 0, positive: rr.data.grossProfit >= 0 },
                    { label: t('financeDashboard.netMargin'), pct: rr.data.revenue > 0 ? (rr.data.netProfit / rr.data.revenue) * 100 : 0, positive: rr.data.netProfit >= 0 },
                    { label: t('financeDashboard.expenseRatio'), pct: rr.data.revenue > 0 ? (rr.data.totalExpenses / rr.data.revenue) * 100 : 0, positive: false },
                    { label: t('financeDashboard.cogsRatio'), pct: rr.data.revenue > 0 ? (rr.data.cogs / rr.data.revenue) * 100 : 0, positive: false },
                  ].map(({ label, pct, positive }) => (
                    <div key={label} className="flex items-center justify-between px-5 py-3">
                      <span className="text-sm text-slate-600">{label}</span>
                      <span className={`text-sm font-semibold ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>{formatPercent(pct)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="surface flex h-full flex-col overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h3 className="text-sm font-bold text-slate-950">{t('financeDashboard.cashFlow')}</h3>
                  <p className="mt-0.5 text-xs text-slate-400">{t('financeDashboard.moneyInOutPeriod')}</p>
                </div>
                <BreakdownList
                  language={language}
                  items={[
                    { label: t('financeDashboard.totalInflow'), value: rr.data.cashFlow.inflow, valueClass: 'text-emerald-600' },
                    { label: t('financeDashboard.totalOutflow'), value: rr.data.cashFlow.outflow, valueClass: 'text-rose-600' },
                    {
                      label: t('financeDashboard.netMovement'),
                      value: rr.data.cashFlow.inflow - rr.data.cashFlow.outflow,
                      valueClass: rr.data.cashFlow.inflow >= rr.data.cashFlow.outflow ? 'text-emerald-600' : 'text-rose-600',
                      bold: true,
                    },
                  ]}
                />
              </div>

              <div className="surface flex h-full flex-col overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h3 className="text-sm font-bold text-slate-950">{t('financeDashboard.salesSummary')}</h3>
                  <p className="mt-0.5 text-xs text-slate-400">{t('financeDashboard.invoiceCountPeriod', { count: formatNumber(rr.data.sales.count, language) })}</p>
                </div>
                <BreakdownList
                  language={language}
                  items={[
                    { label: t('financeDashboard.totalSales'), value: rr.data.sales.totalAmount, valueClass: 'text-blue-600', bold: true },
                    { label: t('financeDashboard.amountCollected'), value: rr.data.sales.paidAmount, valueClass: 'text-emerald-600' },
                    { label: t('financeDashboard.outstanding'), value: rr.data.sales.totalAmount - rr.data.sales.paidAmount, valueClass: 'text-amber-600' },
                    { label: t('financeDashboard.avgPerInvoice'), value: rr.data.sales.averageInvoice, valueClass: 'text-slate-600' },
                  ]}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
