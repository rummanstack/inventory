import { useEffect } from 'react';
import { BadgeDollarSign, PiggyBank, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Alert, ChartPanel, ChartPanelSkeleton, EmptyState, SectionHeader, StatCard, StatCardSkeleton, TableSkeleton, TrendChart, cx } from '../../../components/ui.jsx';
import { DateRangePickerField } from '../../../components/DatePicker.jsx';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
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

const PROFIT_REPORT_SHORTCUTS = {
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  csv: { alt: true, key: 'c', label: 'Alt+C' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

function getPeriodLabel(row, view) {
  if (view === 'weekly') {
    return `${formatDate(row.weekStart)} - ${formatDate(row.weekEnd)}`;
  }
  if (view === 'monthly') {
    return row.month;
  }
  return formatDate(row.date);
}

// Markup on cost (profit ÷ cost), not margin on revenue.
function marginOf(row) {
  if (!row.cost) return 0;
  return (row.grossProfit / row.cost) * 100;
}

function BreakdownTable({ t, columns, rows, emptyIcon, fileName, sheetName, printId }) {
  return (
    <div id={printId} className="surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="section-title">{t('profit.tableTitle')}</h2>
        {rows.length ? (
          <TableReportActions targetId={printId} title={sheetName} fileName={fileName} entityType="profit_breakdown" t={t} shortcuts={PROFIT_REPORT_SHORTCUTS} />
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
  const tabShortcuts = ['Alt+1', 'Alt+2', 'Alt+3', 'Alt+4', 'Alt+5'];

  useEffect(() => {
    function handleKeyDown(event) {
      const isShortcut = event.altKey && !event.ctrlKey && !event.metaKey;
      if (!isShortcut) return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < tabs.length) {
        event.preventDefault();
        vm.setTab(tabs[index].key);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.map((tab) => tab.key).join(','), vm.setTab]);

  const showSkeleton = vm.loading && !vm.report;
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

  const breakdownRows = (vm.breakdowns[vm.tab]?.rows || []);

  return (
    <div>
      <SectionHeader eyebrow={t('nav.profit')} title={t('profit.title')} description={t('profit.description')} />

      {vm.error ? (
        <div className="mb-6">
          <Alert type="error">{vm.error}</Alert>
        </div>
      ) : null}

      <div className="surface mb-6 p-5">
        <label className="label">{t('profit.dateRangeLabel')}</label>
        <DateRangePickerField
          from={vm.dateFrom}
          to={vm.dateTo}
          onChange={(from, to) => { vm.setDateFrom(from); vm.setDateTo(to); }}
          placeholder={`${t('profit.dateFrom')} - ${t('profit.dateTo')}`}
          className="max-w-sm"
        />
      </div>

      {showSkeleton ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
          <div className="mb-6">
            <ChartPanelSkeleton height="h-80" />
          </div>
          <div>
            <TableSkeleton rows={6} columns={5} />
          </div>
        </>
      ) : (
      <>
      <div className="no-print mb-6 overflow-x-auto">
        <div className="inline-flex min-w-full gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:min-w-0">
          {tabs.map((entry, index) => {
            const selected = entry.key === vm.tab;
            return (
              <button
                key={entry.key}
                type="button"
                className={cx(
                  'flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-bold transition sm:flex-none',
                  selected ? 'border border-indigo-200 bg-indigo-50 text-indigo-800 shadow-sm ring-2 ring-indigo-100' : 'border border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800',
                )}
                aria-pressed={selected}
                onClick={() => vm.setTab(entry.key)}
              >
                {t(entry.labelKey)}
                <kbd className={cx('rounded border px-1.5 py-0.5 text-[10px] font-black', selected ? 'border-indigo-200 bg-white text-indigo-700' : 'border-slate-200 bg-white text-slate-400')}>{tabShortcuts[index]}</kbd>
              </button>
            );
          })}
        </div>
      </div>

      {vm.tab === 'overview' ? (
        <>
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

          <div className="no-print mb-6 inline-flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {VIEWS.map((entry) => {
              const selected = entry.key === vm.view;
              return (
                <button
                  key={entry.key}
                  type="button"
                  className={cx(
                    'min-h-10 rounded-md px-3 text-sm font-bold transition',
                    selected ? 'border border-indigo-200 bg-indigo-50 text-indigo-800 shadow-sm ring-2 ring-indigo-100' : 'border border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800',
                  )}
                  aria-pressed={selected}
                  onClick={() => vm.setView(entry.key)}
                >
                  {t(entry.labelKey)}
                </button>
              );
            })}
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

          <div id="profit-report-table" className="mt-6 surface overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="section-title">{t('profit.tableTitle')}</h2>
                <TableReportActions targetId="profit-report-table" title={t('profit.tableTitle')} fileName={`profit-report-${vm.dateFrom}-to-${vm.dateTo}`} entityType="profit_report" t={t} shortcuts={PROFIT_REPORT_SHORTCUTS} />
              </div>
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
              emptyIcon={Wallet}
              sheetName={t('profit.tabByDsr')}
              printId="profit-breakdown-dsr"
              fileName={`profit-by-dsr-${vm.dateFrom}-${vm.dateTo}`}
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
              emptyIcon={Wallet}
              sheetName={t('profit.tabByProduct')}
              printId="profit-breakdown-product"
              fileName={`profit-by-product-${vm.dateFrom}-${vm.dateTo}`}
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
              emptyIcon={Wallet}
              sheetName={t('profit.tabByCustomer')}
              printId="profit-breakdown-customer"
              fileName={`profit-by-customer-${vm.dateFrom}-${vm.dateTo}`}
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
              emptyIcon={Wallet}
              sheetName={t('profit.tabByCategory')}
              printId="profit-breakdown-category"
              fileName={`profit-by-category-${vm.dateFrom}-${vm.dateTo}`}
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
      </>
      )}
    </div>
  );
}
