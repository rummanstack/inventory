import { BadgeDollarSign, Download, PiggyBank, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Alert, ChartPanel, ChartPanelSkeleton, EmptyState, SectionHeader, StatCard, StatCardSkeleton, TableSkeleton, TrendChart } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi';
import { formatCurrency, formatDate } from '../../../utils/calculations.js';
import { getCssVar } from '../../../utils/theme.js';
import { useProfitViewModel } from '../viewmodels/useProfitViewModel';

const VIEWS = [
  { key: 'daily', dataKey: 'daily', labelKey: 'profit.viewDay' },
  { key: 'weekly', dataKey: 'weekly', labelKey: 'profit.viewWeek' },
  { key: 'monthly', dataKey: 'monthly', labelKey: 'profit.viewMonth' },
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

export default function ProfitPage() {
  const { t } = useInventoryApp();
  const vm = useProfitViewModel();

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

  const totals = vm.report?.totals || { revenue: 0, cost: 0, expenses: 0, profit: 0 };
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
          <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} />
        </div>
      </div>

      <div className="mb-6 flex justify-end">
        <button type="button" className="btn-secondary" onClick={handleDownloadPdf}>
          <Download size={18} />
          {t('profit.downloadPdf')}
        </button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title={t('profit.revenue')} value={formatCurrency(totals.revenue)} icon={Wallet} tone="blue" helper={t('profit.revenueHelper')} />
        <StatCard title={t('profit.cost')} value={formatCurrency(totals.cost)} icon={BadgeDollarSign} tone="amber" helper={t('profit.costHelper')} />
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
              { key: 'revenue', label: t('profit.revenue'), color: getCssVar('--secondary', '#2563eb'), fill: true },
              { key: 'cost', label: t('profit.cost'), color: getCssVar('--warning', '#f59e0b') },
              { key: 'profit', label: t('profit.netProfitLoss'), color: getCssVar('--success', '#0f766e') },
            ]}
            valueFormatter={formatCurrency}
          />
        ) : (
          <EmptyState title={t('profit.noDataTitle')} description={t('profit.noDataDescription')} icon={Wallet} />
        )}
      </ChartPanel>

      <div id="profit-report-table" className="mt-6 surface overflow-hidden">
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
    </div>
  );
}
