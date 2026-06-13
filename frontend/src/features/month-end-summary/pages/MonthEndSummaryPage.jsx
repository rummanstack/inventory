import { useMemo } from 'react';
import { BarChart3, BadgeDollarSign, CircleDollarSign, Coins, ReceiptText, Tag, TrendingUp } from 'lucide-react';
import { Alert, ChartPanel, EmptyState, LoadingState, SectionHeader, HorizontalBarChart, StatCard, TableSkeleton } from '../../../components/ui.jsx';
import { MonthPickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, formatNumber } from '../../../utils/calculations.js';
import { toBarChartData } from '../../../utils/charts.js';
import { useMonthEndSummaryViewModel } from '../viewmodels/useMonthEndSummaryViewModel';

const CHART_FIELDS = { labelField: 'dsrName', valueField: 'netBalance', metaFields: ['dsrArea', 'dsrPhone'] };

export default function MonthEndSummaryPage() {
  const { t } = useInventoryApp();
  const vm = useMonthEndSummaryViewModel();
  const rows = vm.report?.rows || [];
  const chartData = useMemo(() => toBarChartData(rows.slice(0, 8), CHART_FIELDS), [rows]);

  if (vm.loading) {
    return (
      <div>
        <SectionHeader
          eyebrow={t('nav.monthEndSummary')}
          title={t('monthEndSummary.title')}
          description={t('monthEndSummary.description')}
        />
        <div className="mb-6 grid gap-4 lg:grid-cols-[320px_1fr]">
          <LoadingState title={t('status.loadingData')} description={t('monthEndSummary.helper')} compact />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TableSkeleton rows={1} columns={1} showHeader={false} />
            <TableSkeleton rows={1} columns={1} showHeader={false} />
            <TableSkeleton rows={1} columns={1} showHeader={false} />
            <TableSkeleton rows={1} columns={1} showHeader={false} />
            <TableSkeleton rows={1} columns={1} showHeader={false} />
            <TableSkeleton rows={1} columns={1} showHeader={false} />
            <TableSkeleton rows={1} columns={1} showHeader={false} />
            <TableSkeleton rows={1} columns={1} showHeader={false} />
          </div>
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <LoadingState title={t('status.loadingData')} description={t('monthEndSummary.balanceChartDescription')} />
          <LoadingState title={t('status.loadingData')} description={t('monthEndSummary.summaryNotesDescription')} />
        </div>
        <div className="mt-6">
          <TableSkeleton rows={8} columns={8} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        eyebrow={t('nav.monthEndSummary')}
        title={t('monthEndSummary.title')}
        description={t('monthEndSummary.description')}
      />

      {vm.error ? (
        <div className="mb-6">
          <Alert type="error">{vm.error}</Alert>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="surface rounded-[28px] p-5">
          <label className="label mt-3">{t('monthEndSummary.reportMonth')}</label>
          <MonthPickerField value={vm.month} onChange={vm.setMonth} />
          <p className="mt-3 text-sm text-slate-500">{t('monthEndSummary.helper')}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title={t('monthEndSummary.totalPayable')} value={formatCurrency(vm.report?.totals?.totalPayable || 0)} icon={Coins} tone="blue" />
          <StatCard title={t('monthEndSummary.totalDiscount')} value={formatCurrency(vm.report?.totals?.totalDiscount || 0)} icon={Tag} tone="slate" />
          <StatCard title={t('monthEndSummary.settlementPaid')} value={formatCurrency(vm.report?.totals?.totalPaidAtSettlement || 0)} icon={BadgeDollarSign} tone="emerald" />
          <StatCard title={t('monthEndSummary.cashReceived')} value={formatCurrency(vm.report?.totals?.totalCashReceived || 0)} icon={ReceiptText} tone="amber" />
          <StatCard title={t('monthEndSummary.advanceGiven')} value={formatCurrency(vm.report?.totals?.totalAdvance || 0)} icon={TrendingUp} tone="rose" />
          <StatCard title={t('monthEndSummary.totalExpenses')} value={formatCurrency(vm.report?.totalExpenses || 0)} icon={CircleDollarSign} tone="slate" />
          <StatCard title={t('monthEndSummary.remainingDue')} value={formatCurrency(vm.report?.totals?.remainingDue || 0)} icon={BarChart3} tone="amber" />
          <StatCard title={t('monthEndSummary.netBalance')} value={formatCurrency(vm.report?.totals?.netBalance || 0)} icon={BarChart3} tone="blue" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartPanel title={t('monthEndSummary.balanceChart')} description={t('monthEndSummary.balanceChartDescription')}>
          {chartData.length ? (
            <HorizontalBarChart data={chartData} valueFormatter={formatCurrency} />
          ) : (
            <EmptyState title={t('monthEndSummary.noSummaryTitle')} description={t('monthEndSummary.noSummaryDescription')} icon={BarChart3} />
          )}
        </ChartPanel>

        <ChartPanel title={t('monthEndSummary.summaryNotes')} description={t('monthEndSummary.summaryNotesDescription')}>
          <div className="space-y-2 text-sm text-slate-600">
            <p>{t('monthEndSummary.formula1')}</p>
            <p>{t('monthEndSummary.formula2')}</p>
            <p>{t('monthEndSummary.formula3')}</p>
            <p>{t('monthEndSummary.formula4')}</p>
          </div>
        </ChartPanel>
      </div>

      <div className="surface mt-6 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-950">{t('monthEndSummary.tableTitle', { month: vm.month })}</h2>
            <span className="muted-chip">{formatNumber(rows.length)} {t('common.dsr')}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">{t('dsr.title')}</th>
                <th className="px-4 py-3">{t('monthEndSummary.totalPayable')}</th>
                <th className="px-4 py-3 hidden md:table-cell">{t('monthEndSummary.totalDiscount')}</th>
                <th className="px-4 py-3 hidden lg:table-cell">{t('monthEndSummary.settlementPaid')}</th>
                <th className="px-4 py-3 hidden sm:table-cell">{t('monthEndSummary.cashReceived')}</th>
                <th className="px-4 py-3 hidden md:table-cell">{t('monthEndSummary.advanceGiven')}</th>
                <th className="px-4 py-3 hidden sm:table-cell">{t('monthEndSummary.remainingDue')}</th>
                <th className="px-4 py-3">{t('monthEndSummary.netBalance')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.dsrId} className="hover:bg-slate-50">
                  <td className="table-cell">
                    <p className="font-semibold text-slate-950">{row.dsrName}</p>
                    <p className="text-xs text-slate-500">{row.dsrArea}</p>
                  </td>
                  <td className="table-cell font-semibold">{formatCurrency(row.totalPayable)}</td>
                  <td className="table-cell hidden md:table-cell text-slate-500">{formatCurrency(row.totalDiscount)}</td>
                  <td className="table-cell hidden lg:table-cell">{formatCurrency(row.totalPaidAtSettlement)}</td>
                  <td className="table-cell hidden sm:table-cell">{formatCurrency(row.totalCashReceived)}</td>
                  <td className="table-cell hidden md:table-cell">{formatCurrency(row.totalAdvance)}</td>
                  <td className="table-cell hidden sm:table-cell">{formatCurrency(row.remainingDue)}</td>
                  <td className="table-cell font-bold">{formatCurrency(row.netBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length ? (
          <div className="p-5">
            <EmptyState title={t('monthEndSummary.noSummaryTitle')} description={t('monthEndSummary.noSummaryDescription')} icon={BarChart3} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
