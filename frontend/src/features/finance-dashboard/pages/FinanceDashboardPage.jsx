import { Building2, CircleDollarSign, HandCoins, Landmark, RotateCcw, Scale, ShoppingBag, Store, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Alert, EmptyState, SectionHeader, StatCard, StatCardSkeleton, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, formatDate, formatNumber } from '../../../utils/calculations.js';
import { useFinanceDashboardViewModel } from '../viewmodels/useFinanceDashboardViewModel';
import { useRangeReportViewModel } from '../viewmodels/useRangeReportViewModel';

const TRANSACTION_TYPE_STYLES = {
  DEPOSIT: { labelKey: 'financeDashboard.deposit', className: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  WITHDRAWAL: { labelKey: 'financeDashboard.withdrawal', className: 'bg-rose-50 text-rose-700 border border-rose-100' },
  TRANSFER_IN: { labelKey: 'financeDashboard.transferIn', className: 'bg-blue-50 text-blue-700 border border-blue-100' },
  TRANSFER_OUT: { labelKey: 'financeDashboard.transferOut', className: 'bg-amber-50 text-amber-700 border border-amber-100' },
};

function transactionAmount(tx) {
  return (tx.type === 'DEPOSIT' || tx.type === 'TRANSFER_IN') ? tx.debit : tx.credit;
}

function transactionAmountClass(tx) {
  return (tx.type === 'DEPOSIT' || tx.type === 'TRANSFER_IN')
    ? 'text-emerald-600 font-bold'
    : 'text-rose-600 font-bold';
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '-';
  return `${value.toFixed(1)}%`;
}

function BreakdownList({ items, language }) {
  return (
    <div className="divide-y divide-slate-100">
      {items.map(({ label, value, valueClass, bold }) => (
        <div key={label} className={`flex items-center justify-between px-5 py-3 ${bold ? 'bg-slate-50' : ''}`}>
          <span className={`text-sm ${bold ? 'font-bold text-slate-950' : 'text-slate-600'}`}>{label}</span>
          <span className={`text-sm font-semibold ${valueClass || 'text-slate-800'} ${bold ? 'font-bold' : ''}`}>{formatCurrency(value, language)}</span>
        </div>
      ))}
    </div>
  );
}

function SectionTitleSkeleton() {
  return <div className="mb-4 h-5 w-44 animate-pulse rounded-full bg-slate-200" />;
}

function BreakdownPanelSkeleton({ rows = 4 }) {
  return (
    <div className="surface overflow-hidden">
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
  const { data, loading, error } = useFinanceDashboardViewModel();
  const rr = useRangeReportViewModel();

  const cashInHand = data?.accounts?.find((a) => a.type === 'CASH')?.balance || 0;
  const bankBalance = data?.accounts?.find((a) => a.type === 'BANK')?.balance || 0;
  const netReceivable = rr.data
    ? rr.data.totalDsrDue + rr.data.totalCustomerDue - rr.data.totalSupplierDue
    : 0;

  return (
    <div className="space-y-10">
      <SectionHeader
        eyebrow={t('financeDashboard.eyebrow')}
        title={t('financeDashboard.title')}
        description={t('financeDashboard.description')}
      />

      <div>
        <h2 className="mb-4 text-base font-bold text-slate-950">{t('financeDashboard.rangeTitle')}</h2>

        <div className="surface mb-6 grid items-end gap-4 p-5 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <label className="label">{t('financeDashboard.from')}</label>
            <DatePickerField value={rr.dateFrom} onChange={rr.setDateFrom} />
          </div>
          <div>
            <label className="label">{t('financeDashboard.to')}</label>
            <DatePickerField value={rr.dateTo} onChange={rr.setDateTo} />
          </div>
          <button type="button" className="btn-primary" onClick={rr.applyRange} disabled={rr.loading}>
            {rr.loading ? <span className="inline-block h-4 w-28 animate-pulse rounded-full bg-white/60" /> : t('financeDashboard.generateReport')}
          </button>
        </div>

        {rr.error ? (
          <Alert type="error">{rr.error}</Alert>
        ) : rr.loading ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)}
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <BreakdownPanelSkeleton key={i} />)}
            </div>
          </div>
        ) : rr.data ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard title={t('financeDashboard.totalRevenue')} value={formatCurrency(rr.data.revenue, language)} icon={TrendingUp} tone="blue" />
              <StatCard title={t('financeDashboard.costOfGoods')} value={formatCurrency(rr.data.cogs, language)} icon={CircleDollarSign} tone="amber" />
              <StatCard title={t('financeDashboard.totalExpenses')} value={formatCurrency(rr.data.totalExpenses, language)} icon={CircleDollarSign} tone="slate" />
              <StatCard title={t('financeDashboard.grossProfit')} value={formatCurrency(rr.data.grossProfit, language)} helper={t('financeDashboard.revenueMinusCog')} icon={TrendingUp} tone="emerald" />
              <StatCard
                title={t('financeDashboard.netProfit')}
                value={formatCurrency(rr.data.netProfit, language)}
                helper={t('financeDashboard.afterAllExpenses')}
                icon={rr.data.netProfit >= 0 ? TrendingUp : TrendingDown}
                tone={rr.data.netProfit >= 0 ? 'emerald' : 'rose'}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="surface overflow-hidden">
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

              <div className="surface overflow-hidden">
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

              <div className="surface overflow-hidden">
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

              <div className="surface overflow-hidden">
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

              <div className="surface overflow-hidden">
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

              <div className="surface overflow-hidden">
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

      {loading ? (
        <div className="space-y-8">
          <div>
            <SectionTitleSkeleton />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 7 }).map((_, i) => <StatCardSkeleton key={i} />)}
            </div>
          </div>
          <div>
            <SectionTitleSkeleton />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)}
            </div>
          </div>
          <div>
            <SectionTitleSkeleton />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => <StatCardSkeleton key={i} />)}
            </div>
          </div>
          <div>
            <SectionTitleSkeleton />
            <TableSkeleton rows={5} columns={5} showHeader={false} />
          </div>
        </div>
      ) : error ? (
        <Alert type="error">{error}</Alert>
      ) : (
        <>
          <div>
            <h2 className="mb-4 text-base font-bold text-slate-950">{t('financeDashboard.balanceTitle')}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard title={t('financeDashboard.cashInHand')} value={formatCurrency(cashInHand, language)} icon={Wallet} tone="emerald" />
              <StatCard title={t('financeAccounts.bank')} value={formatCurrency(bankBalance, language)} icon={Landmark} tone="indigo" />
              <StatCard title={t('financeDashboard.dsrReceivables')} value={formatCurrency(data.totalDsrDue, language)} helper={t('financeDashboard.dsrReceivablesHelper')} icon={HandCoins} tone="amber" />
              <StatCard title={t('financeDashboard.customerReceivables')} value={formatCurrency(data.totalCustomerDue, language)} helper={t('financeDashboard.customerReceivablesHelper')} icon={Store} tone="amber" />
              <StatCard title={t('financeDashboard.supplierPayables')} value={formatCurrency(data.totalSupplierDue, language)} helper={t('financeDashboard.supplierPayablesHelper')} icon={Building2} tone="rose" />
              <StatCard title={t('financeDashboard.monthlyExpenses')} value={formatCurrency(data.monthlyExpenses, language)} helper={t('financeDashboard.monthlyExpensesHelper')} icon={CircleDollarSign} tone="rose" />
              <StatCard title={t('financeDashboard.monthlyProfit')} value={formatCurrency(data.monthlyProfit, language)} helper={t('financeDashboard.monthlyProfitHelper')} icon={TrendingUp} tone="emerald" />
              <StatCard title={t('financeDashboard.netPosition')} value={formatCurrency(data.netPosition, language)} helper={t('financeDashboard.netPositionHelper')} icon={Scale} tone="slate" />
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-base font-bold text-slate-950">{t('financeDashboard.operationsTitle')}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                title={t('financeDashboard.settlementCollected')}
                value={formatCurrency(data.monthlySettlementCollected, language)}
                helper={`${formatNumber(data.monthlySettlementCount, language)} ${t('financeDashboard.settlementCollectedHelper')}`}
                icon={RotateCcw}
                tone="emerald"
              />
              <StatCard
                title={t('financeDashboard.settlementDue')}
                value={formatCurrency(data.monthlySettlementDue, language)}
                helper={t('financeDashboard.settlementDueHelper')}
                icon={HandCoins}
                tone="rose"
              />
              <StatCard
                title={t('financeDashboard.monthlySales')}
                value={formatCurrency(data.monthlySalesAmount, language)}
                helper={`${formatNumber(data.monthlySalesCount, language)} ${t('financeDashboard.invoices')} · ${t('financeDashboard.monthlySalesHelper')}`}
                icon={ShoppingBag}
                tone="blue"
              />
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-base font-bold text-slate-950">{t('financeDashboard.cashFlowTitle')}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard title={t('financeDashboard.monthlyInflow')} value={formatCurrency(data.monthlyInflow, language)} helper={t('financeDashboard.monthlyInflowHelper')} icon={TrendingUp} tone="emerald" />
              <StatCard title={t('financeDashboard.monthlyOutflow')} value={formatCurrency(data.monthlyOutflow, language)} helper={t('financeDashboard.monthlyOutflowHelper')} icon={TrendingDown} tone="rose" />
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-base font-bold text-slate-950">{t('financeDashboard.recentTransactionsTitle')}</h2>
            {!data.recentTransactions?.length ? (
              <p className="text-sm text-slate-500">{t('financeDashboard.noRecentTransactions')}</p>
            ) : (
              <div className="surface overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">{t('financeAccounts.date')}</th>
                      <th className="px-4 py-3">{t('financeAccounts.account')}</th>
                      <th className="px-4 py-3">{t('financeAccounts.type')}</th>
                      <th className="px-4 py-3 text-right">{t('financeAccounts.amount')}</th>
                      <th className="hidden px-4 py-3 sm:table-cell">{t('financeAccounts.note')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recentTransactions.map((tx) => {
                      const style = TRANSACTION_TYPE_STYLES[tx.type] || {};
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50">
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">{formatDate(tx.transactionDate, language)}</td>
                          <td className="px-4 py-3 text-slate-600">{tx.accountName}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.className}`}>
                              {t(style.labelKey)}
                            </span>
                          </td>
                          <td className={`whitespace-nowrap px-4 py-3 text-right ${transactionAmountClass(tx)}`}>
                            {formatCurrency(transactionAmount(tx), language)}
                          </td>
                          <td className="hidden max-w-xs truncate px-4 py-3 text-slate-500 sm:table-cell">{tx.note}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
