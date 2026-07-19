import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, BadgeDollarSign, PiggyBank, Search, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Alert, ChartPanel, ChartPanelSkeleton, EmptyState, HorizontalBarChart, MobileCardList, MobileListCard, SectionHeader, StatCard, StatCardSkeleton, TableSkeleton, WaterfallChart, cx } from '../../../components/ui.jsx';
import { DateRangePickerField } from '../../../components/DatePicker.jsx';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, formatDate, formatNumber, todayISO } from '../../../utils/calculations.js';
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

const DATE_PRESETS = [
  { key: 'today', labelKey: 'profit.presetToday' },
  { key: 'last7', labelKey: 'profit.presetLast7Days' },
  { key: 'last30', labelKey: 'profit.presetLast30Days' },
  { key: 'thisMonth', labelKey: 'profit.presetThisMonth' },
  { key: 'previousMonth', labelKey: 'profit.presetPreviousMonth' },
];

function localISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function getPresetRange(key) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let from = new Date(today);
  let to = new Date(today);

  if (key === 'last7') from.setDate(from.getDate() - 6);
  if (key === 'last30') from.setDate(from.getDate() - 29);
  if (key === 'thisMonth') from = new Date(today.getFullYear(), today.getMonth(), 1);
  if (key === 'previousMonth') {
    from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    to = new Date(today.getFullYear(), today.getMonth(), 0);
  }

  return { from: localISO(from), to: localISO(to) };
}
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

function BreakdownTable({ t, language, columns, rows, emptyIcon, fileName, sheetName, printId }) {
  const [search, setSearch] = useState('');
  const [profitability, setProfitability] = useState('all');
  const [sort, setSort] = useState({ key: (columns.find((column) => column.bold) || columns[columns.length - 1]).key, direction: 'desc' });
  const titleCol = columns.find((column) => column.key === 'name') || columns[0];
  const boldCol = columns.find((column) => column.bold) || columns[columns.length - 1];
  const revenueCol = columns.find((column) => column.key === 'revenue');
  const marginCol = columns.find((column) => column.key === 'margin');
  const renderCol = (column, row) => (column.render ? column.render(row) : column.value(row));
  const searchTerm = search.trim().toLowerCase();

  const filteredRows = rows.filter((row) => {
    const title = String(titleCol.value(row) || '').toLowerCase();
    const profit = Number(boldCol.value(row) || 0);
    const matchesSearch = !searchTerm || title.includes(searchTerm);
    const matchesProfitability = profitability === 'all'
      || (profitability === 'profitable' && profit > 0)
      || (profitability === 'loss' && profit < 0);
    return matchesSearch && matchesProfitability;
  });

  const sortColumn = columns.find((column) => column.key === sort.key) || titleCol;
  const sortedRows = [...filteredRows].sort((left, right) => {
    const leftValue = sortColumn.sortValue ? sortColumn.sortValue(left) : sortColumn.value(left);
    const rightValue = sortColumn.sortValue ? sortColumn.sortValue(right) : sortColumn.value(right);
    const leftNumber = Number(leftValue);
    const rightNumber = Number(rightValue);
    const comparison = Number.isFinite(leftNumber) && Number.isFinite(rightNumber)
      ? leftNumber - rightNumber
      : String(leftValue || '').localeCompare(String(rightValue || ''));
    return sort.direction === 'asc' ? comparison : -comparison;
  });

  const topData = [...filteredRows]
    .sort((left, right) => Number(boldCol.value(right) || 0) - Number(boldCol.value(left) || 0))
    .slice(0, 8)
    .map((row) => {
      const value = Number(boldCol.value(row) || 0);
      return {
        label: String(titleCol.value(row) || ''),
        value,
        color: value >= 0 ? getCssVar('--success', '#37a864') : getCssVar('--danger', '#f1454f'),
      };
    });

  function toggleSort(key) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  }

  return (
    <div id={printId} className="space-y-6">
      {topData.length ? (
        <ChartPanel title={t('profit.topPerformers')} description={t('profit.topPerformersDescription')}>
          <HorizontalBarChart
            data={topData}
            valueFormatter={(value) => formatCurrency(value, language)}
            height={Math.max(240, topData.length * 48)}
          />
        </ChartPanel>
      ) : null}

      <div className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className="section-title">{t('profit.tableTitle')}</h2>
          {rows.length ? (
            <TableReportActions targetId={printId} title={sheetName} fileName={fileName} entityType="profit_breakdown" t={t} shortcuts={PROFIT_REPORT_SHORTCUTS} />
          ) : null}
        </div>

        {rows.length ? (
          <div className="no-print grid gap-3 border-b border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-[minmax(0,1fr)_220px]">
            <label className="relative">
              <span className="sr-only">{t('profit.searchBreakdown')}</span>
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('profit.searchBreakdown')}
              />
            </label>
            <select className="input" value={profitability} onChange={(event) => setProfitability(event.target.value)}>
              <option value="all">{t('profit.allResults')}</option>
              <option value="profitable">{t('profit.profitableOnly')}</option>
              <option value="loss">{t('profit.lossOnly')}</option>
            </select>
          </div>
        ) : null}

        {sortedRows.length ? (
          <>
            <MobileCardList>
              {sortedRows.map((row, index) => (
                <MobileListCard
                  key={row.key ?? index}
                  title={renderCol(titleCol, row)}
                  subtitle={revenueCol ? revenueCol.label + ': ' + renderCol(revenueCol, row) : null}
                  value={renderCol(boldCol, row)}
                  valueClass={boldCol.valueClass ? boldCol.valueClass(row) : null}
                  valueSub={marginCol ? renderCol(marginCol, row) : null}
                />
              ))}
            </MobileCardList>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    {columns.map((column) => {
                      const active = sort.key === column.key;
                      const SortIcon = active ? (sort.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
                      return (
                        <th key={column.key} className={'px-4 py-3 ' + (column.align === 'right' ? 'text-right' : '')}>
                          <button
                            type="button"
                            className={cx('inline-flex items-center gap-1.5 font-inherit', column.align === 'right' && 'ml-auto')}
                            onClick={() => toggleSort(column.key)}
                          >
                            {column.label}
                            <SortIcon size={13} className={active ? 'text-slate-700' : 'text-slate-400'} />
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedRows.map((row, index) => (
                    <tr key={row.key ?? index} className="hover:bg-slate-50">
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={cx(
                            'table-cell',
                            column.align === 'right' && 'text-right',
                            column.bold && 'font-bold',
                            column.valueClass && column.valueClass(row),
                          )}
                        >
                          {renderCol(column, row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="p-5">
            <EmptyState
              title={rows.length ? t('profit.noMatchesTitle') : t('profit.noDataTitle')}
              description={rows.length ? t('profit.noMatchesDescription') : t('profit.noDataDescription')}
              icon={emptyIcon}
            />
          </div>
        )}
      </div>
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
  const grossIsProfit = totals.grossProfit >= 0;
  const today = todayISO();
  const datePresets = DATE_PRESETS.map((entry) => ({ ...entry, ...getPresetRange(entry.key) }));
  const activeView = VIEWS.find((entry) => entry.key === vm.view) || VIEWS[0];
  const rows = vm.report?.[activeView.dataKey] || [];
  const waterfallData = [
    { label: t('profit.revenue'), start: 0, end: totals.revenue, value: totals.revenue, color: getCssVar('--secondary', '#5e5b8e') },
    { label: t('profit.cost'), start: totals.revenue, end: totals.grossProfit, value: -totals.cost, color: getCssVar('--warning', '#f8aa17') },
    { label: t('profit.grossProfit'), start: 0, end: totals.grossProfit, value: totals.grossProfit, color: getCssVar(grossIsProfit ? '--success' : '--danger', grossIsProfit ? '#37a864' : '#f1454f') },
    { label: t('profit.expensesLabel'), start: totals.grossProfit, end: totals.profit, value: -totals.expenses, color: getCssVar('--danger', '#f1454f') },
    { label: t('profit.netProfitLoss'), start: 0, end: totals.profit, value: totals.profit, color: getCssVar(isProfit ? '--success' : '--danger', isProfit ? '#37a864' : '#f1454f') },
  ];

  const breakdownRows = (vm.breakdowns[vm.tab]?.rows || []);

  return (
    <div>
      <SectionHeader title={t('profit.title')} compact />

      {vm.error ? (
        <div className="mb-6">
          <Alert type="error">{vm.error}</Alert>
        </div>
      ) : null}

      <div className="no-print mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="overflow-x-auto">
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
        <div className="sm:w-72">
          <label className="label">{t('profit.dateRangeLabel')}</label>
          <DateRangePickerField
            from={vm.dateFrom}
            to={vm.dateTo}
            max={today}
            onChange={(from, to) => { vm.setDateFrom(from); vm.setDateTo(to); }}
            placeholder={`${t('profit.dateFrom')} - ${t('profit.dateTo')}`}
          />
        </div>
      </div>

      <div className="no-print -mt-3 mb-6 flex flex-wrap justify-end gap-2">
        {datePresets.map((preset) => {
          const selected = vm.dateFrom === preset.from && vm.dateTo === preset.to;
          return (
            <button
              key={preset.key}
              type="button"
              className={cx(
                'rounded-full border px-3 py-1.5 text-xs font-bold transition',
                selected ? 'border-indigo-300 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-100' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700',
              )}
              aria-pressed={selected}
              onClick={() => { vm.setDateFrom(preset.from); vm.setDateTo(preset.to); }}
            >
              {t(preset.labelKey)}
            </button>
          );
        })}
      </div>

      {showSkeleton ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)}
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

      {vm.tab === 'overview' ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard title={t('profit.revenue')} value={formatCurrency(totals.revenue)} icon={Wallet} tone="blue" />
            <StatCard title={t('profit.cost')} value={formatCurrency(totals.cost)} icon={BadgeDollarSign} tone="amber" />
            <StatCard title={t('profit.grossProfit')} value={formatCurrency(totals.grossProfit)} icon={grossIsProfit ? TrendingUp : TrendingDown} tone={grossIsProfit ? 'emerald' : 'rose'} />
            <StatCard title={t('profit.expensesLabel')} value={formatCurrency(totals.expenses)} icon={PiggyBank} tone="slate" />
            <StatCard
              title={t('profit.netProfitLoss')}
              value={formatCurrency(totals.profit)}
              icon={isProfit ? TrendingUp : TrendingDown}
              tone={isProfit ? 'emerald' : 'rose'}
            />
          </div>


          <ChartPanel title={t('profit.waterfallTitle')} description={t('profit.waterfallDescription')}>
            {rows.length ? (
              <WaterfallChart data={waterfallData} valueFormatter={formatCurrency} />
            ) : (
              <EmptyState title={t('profit.noDataTitle')} description={t('profit.noDataDescription')} icon={Wallet} />
            )}
          </ChartPanel>

          <div className="no-print mt-6 inline-flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
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
          <div id="profit-report-table" className="mt-6 surface overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="section-title">{t('profit.tableTitle')}</h2>
                <TableReportActions targetId="profit-report-table" title={t('profit.tableTitle')} fileName={`profit-report-${vm.dateFrom}-to-${vm.dateTo}`} entityType="profit_report" t={t} shortcuts={PROFIT_REPORT_SHORTCUTS} />
              </div>
            </div>
            <MobileCardList>
              {rows.map((row) => (
                <MobileListCard
                  key={getPeriodLabel(row, activeView.key)}
                  title={getPeriodLabel(row, activeView.key)}
                  subtitle={`${t('profit.revenue')}: ${formatCurrency(row.revenue)} · ${t('profit.cost')}: ${formatCurrency(row.cost)}`}
                  value={formatCurrency(row.profit)}
                  valueClass={row.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}
                  valueSub={formatCurrency(row.grossProfit)}
                  valueSubClass={row.grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}
                />
              ))}
            </MobileCardList>
            <div className="hidden overflow-x-auto md:block">
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
                      <td className={cx('table-cell font-semibold', row.grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{formatCurrency(row.grossProfit)}</td>
                      <td className="table-cell">{formatCurrency(row.expenses)}</td>
                      <td className={`table-cell font-bold ${row.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(row.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                  <tr>
                    <td className="table-cell font-black text-slate-800">{t('common.total')}</td>
                    <td className="table-cell font-bold">{formatCurrency(totals.revenue)}</td>
                    <td className="table-cell font-bold">{formatCurrency(totals.cost)}</td>
                    <td className={cx('table-cell font-black', grossIsProfit ? 'text-emerald-600' : 'text-rose-600')}>{formatCurrency(totals.grossProfit)}</td>
                    <td className="table-cell font-bold">{formatCurrency(totals.expenses)}</td>
                    <td className={cx('table-cell font-black', isProfit ? 'text-emerald-600' : 'text-rose-600')}>{formatCurrency(totals.profit)}</td>
                  </tr>
                </tfoot>
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
              key={vm.tab}
              t={t}
              language={language}
              emptyIcon={Wallet}
              sheetName={t('profit.tabByDsr')}
              printId="profit-breakdown-dsr"
              fileName={`profit-by-dsr-${vm.dateFrom}-${vm.dateTo}`}
              rows={breakdownRows.map((row) => ({ key: row.dsrId, ...row }))}
              columns={[
                { key: 'name', label: t('profit.dsrName'), value: (row) => row.dsrName || row.dsrId },
                { key: 'revenue', label: t('profit.revenue'), align: 'right', value: (row) => Number(row.revenue), render: (row) => formatCurrency(row.revenue, language) },
                { key: 'cost', label: t('profit.cost'), align: 'right', value: (row) => Number(row.cost), render: (row) => formatCurrency(row.cost, language) },
                { key: 'grossProfit', label: t('profit.grossProfit'), align: 'right', bold: true, value: (row) => Number(row.grossProfit), render: (row) => formatCurrency(row.grossProfit, language), valueClass: (row) => Number(row.grossProfit) >= 0 ? 'text-emerald-600' : 'text-rose-600' },
                { key: 'margin', label: t('profit.margin'), align: 'right', value: (row) => marginOf(row).toFixed(1), render: (row) => `${marginOf(row).toFixed(1)}%` },
              ]}
            />
          ) : vm.tab === 'product' ? (
            <BreakdownTable
              key={vm.tab}
              t={t}
              language={language}
              emptyIcon={Wallet}
              sheetName={t('profit.tabByProduct')}
              printId="profit-breakdown-product"
              fileName={`profit-by-product-${vm.dateFrom}-${vm.dateTo}`}
              rows={breakdownRows.map((row) => ({ key: row.productId, ...row }))}
              columns={[
                { key: 'name', label: t('profit.productName'), value: (row) => row.productName },
                { key: 'category', label: t('profit.categoryName'), value: (row) => row.categoryName || t('profit.uncategorized') },
                { key: 'quantity', label: t('profit.quantity'), align: 'right', value: (row) => Number(row.quantity), render: (row) => formatNumber(row.quantity, language) },
                { key: 'revenue', label: t('profit.revenue'), align: 'right', value: (row) => Number(row.revenue), render: (row) => formatCurrency(row.revenue, language) },
                { key: 'cost', label: t('profit.cost'), align: 'right', value: (row) => Number(row.cost), render: (row) => formatCurrency(row.cost, language) },
                { key: 'grossProfit', label: t('profit.grossProfit'), align: 'right', bold: true, value: (row) => Number(row.grossProfit), render: (row) => formatCurrency(row.grossProfit, language), valueClass: (row) => Number(row.grossProfit) >= 0 ? 'text-emerald-600' : 'text-rose-600' },
                { key: 'margin', label: t('profit.margin'), align: 'right', value: (row) => marginOf(row).toFixed(1), render: (row) => `${marginOf(row).toFixed(1)}%` },
              ]}
            />
          ) : vm.tab === 'customer' ? (
            <BreakdownTable
              key={vm.tab}
              t={t}
              language={language}
              emptyIcon={Wallet}
              sheetName={t('profit.tabByCustomer')}
              printId="profit-breakdown-customer"
              fileName={`profit-by-customer-${vm.dateFrom}-${vm.dateTo}`}
              rows={breakdownRows.map((row, index) => ({ key: row.customerId || `walk-in-${index}`, ...row }))}
              columns={[
                { key: 'name', label: t('profit.customerName'), value: (row) => row.customerName || t('profit.walkInCustomer') },
                { key: 'invoiceCount', label: t('profit.invoiceCount'), align: 'right', value: (row) => Number(row.invoiceCount), render: (row) => formatNumber(row.invoiceCount, language) },
                { key: 'revenue', label: t('profit.revenue'), align: 'right', value: (row) => Number(row.revenue), render: (row) => formatCurrency(row.revenue, language) },
                { key: 'grossProfit', label: t('profit.grossProfit'), align: 'right', bold: true, value: (row) => Number(row.grossProfit), render: (row) => formatCurrency(row.grossProfit, language), valueClass: (row) => Number(row.grossProfit) >= 0 ? 'text-emerald-600' : 'text-rose-600' },
                { key: 'margin', label: t('profit.margin'), align: 'right', value: (row) => marginOf(row).toFixed(1), render: (row) => `${marginOf(row).toFixed(1)}%` },
              ]}
            />
          ) : (
            <BreakdownTable
              key={vm.tab}
              t={t}
              language={language}
              emptyIcon={Wallet}
              sheetName={t('profit.tabByCategory')}
              printId="profit-breakdown-category"
              fileName={`profit-by-category-${vm.dateFrom}-${vm.dateTo}`}
              rows={breakdownRows.map((row, index) => ({ key: row.categoryId || `uncategorized-${index}`, ...row }))}
              columns={[
                { key: 'name', label: t('profit.categoryName'), value: (row) => row.categoryName || t('profit.uncategorized') },
                { key: 'quantity', label: t('profit.quantity'), align: 'right', value: (row) => Number(row.quantity), render: (row) => formatNumber(row.quantity, language) },
                { key: 'revenue', label: t('profit.revenue'), align: 'right', value: (row) => Number(row.revenue), render: (row) => formatCurrency(row.revenue, language) },
                { key: 'cost', label: t('profit.cost'), align: 'right', value: (row) => Number(row.cost), render: (row) => formatCurrency(row.cost, language) },
                { key: 'grossProfit', label: t('profit.grossProfit'), align: 'right', bold: true, value: (row) => Number(row.grossProfit), render: (row) => formatCurrency(row.grossProfit, language), valueClass: (row) => Number(row.grossProfit) >= 0 ? 'text-emerald-600' : 'text-rose-600' },
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
