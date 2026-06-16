import { Building2, CircleDollarSign, HandCoins, RotateCcw, Scale, ShoppingBag, Store, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Alert, EmptyState, LoadingState, SectionHeader, StatCard } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, formatDate } from '../../../utils/calculations.js';
import { useFinanceDashboardViewModel } from '../viewmodels/useFinanceDashboardViewModel';
import { useRangeReportViewModel } from '../viewmodels/useRangeReportViewModel';

const TRANSACTION_TYPE_STYLES = {
  DEPOSIT:      { label: 'Deposit',      className: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  WITHDRAWAL:   { label: 'Withdrawal',   className: 'bg-rose-50 text-rose-700 border border-rose-100' },
  TRANSFER_IN:  { label: 'Transfer In',  className: 'bg-blue-50 text-blue-700 border border-blue-100' },
  TRANSFER_OUT: { label: 'Transfer Out', className: 'bg-amber-50 text-amber-700 border border-amber-100' },
};

function transactionAmount(tx) {
  return (tx.type === 'DEPOSIT' || tx.type === 'TRANSFER_IN') ? tx.debit : tx.credit;
}

function transactionAmountClass(tx) {
  return (tx.type === 'DEPOSIT' || tx.type === 'TRANSFER_IN')
    ? 'text-emerald-600 font-bold'
    : 'text-rose-600 font-bold';
}

function BreakdownList({ items }) {
  return (
    <div className="divide-y divide-slate-100">
      {items.map(({ label, value, valueClass, bold }) => (
        <div key={label} className={`flex items-center justify-between px-5 py-3 ${bold ? 'bg-slate-50' : ''}`}>
          <span className={`text-sm ${bold ? 'font-bold text-slate-950' : 'text-slate-600'}`}>{label}</span>
          <span className={`text-sm font-semibold ${valueClass || 'text-slate-800'} ${bold ? 'font-bold' : ''}`}>{formatCurrency(value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function FinanceDashboardPage() {
  const { t } = useInventoryApp();
  const { data, loading, error } = useFinanceDashboardViewModel();
  const rr = useRangeReportViewModel();

  const cashInHand = data?.accounts?.find((a) => a.type === 'CASH')?.balance || 0;

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

      {/* ── Range Report ── */}
      <div>
        <h2 className="mb-4 text-base font-bold text-slate-950">Business Performance Report</h2>

        {/* Date range filter */}
        <div className="surface mb-6 grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] items-end">
          <div>
            <label className="label">From</label>
            <DatePickerField value={rr.dateFrom} onChange={rr.setDateFrom} />
          </div>
          <div>
            <label className="label">To</label>
            <DatePickerField value={rr.dateTo} onChange={rr.setDateTo} />
          </div>
          <button type="button" className="btn-primary" onClick={rr.applyRange} disabled={rr.loading}>
            {rr.loading ? 'Loading…' : 'Generate Report'}
          </button>
        </div>

        {rr.error ? (
          <Alert type="error">{rr.error}</Alert>
        ) : rr.loading ? (
          <LoadingState title="Loading report…" description="Calculating profit, costs and balances." compact />
        ) : rr.data ? (
          <div className="space-y-6">
            {/* Key metrics */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard title="Total Revenue" value={formatCurrency(rr.data.revenue)} icon={TrendingUp} tone="blue" />
              <StatCard title="Cost of Goods" value={formatCurrency(rr.data.cogs)} icon={CircleDollarSign} tone="amber" />
              <StatCard title="Total Expenses" value={formatCurrency(rr.data.totalExpenses)} icon={CircleDollarSign} tone="slate" />
              <StatCard title="Gross Profit" value={formatCurrency(rr.data.grossProfit)} helper="Revenue − Cost of Goods" icon={TrendingUp} tone="emerald" />
              <StatCard
                title="Net Profit"
                value={formatCurrency(rr.data.netProfit)}
                helper="After all expenses"
                icon={rr.data.netProfit >= 0 ? TrendingUp : TrendingDown}
                tone={rr.data.netProfit >= 0 ? 'emerald' : 'rose'}
              />
            </div>

            {/* Breakdown panels */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Profit breakdown */}
              <div className="surface overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h3 className="text-sm font-bold text-slate-950">Profit Breakdown</h3>
                </div>
                <BreakdownList items={[
                  { label: 'Revenue', value: rr.data.revenue, valueClass: 'text-blue-600' },
                  { label: 'Cost of Goods', value: rr.data.cogs, valueClass: 'text-amber-600' },
                  { label: 'Gross Profit', value: rr.data.grossProfit, valueClass: rr.data.grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600', bold: true },
                  { label: 'Operating Expenses', value: rr.data.totalExpenses, valueClass: 'text-slate-600' },
                  { label: 'Net Profit', value: rr.data.netProfit, valueClass: rr.data.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600', bold: true },
                ]} />
              </div>

              {/* Expense breakdown */}
              <div className="surface overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h3 className="text-sm font-bold text-slate-950">Expense Breakdown</h3>
                </div>
                {rr.data.expenseBreakdown.length === 0 ? (
                  <div className="p-5">
                    <p className="text-sm text-slate-400">No expenses in this period.</p>
                  </div>
                ) : (
                  <BreakdownList items={[
                    ...rr.data.expenseBreakdown.map((item) => ({ label: item.category, value: item.amount })),
                    { label: 'Total', value: rr.data.totalExpenses, bold: true },
                  ]} />
                )}
              </div>

              {/* Outstanding balances */}
              <div className="surface overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h3 className="text-sm font-bold text-slate-950">Outstanding Balances</h3>
                  <p className="mt-0.5 text-xs text-slate-400">Current balances as of today</p>
                </div>
                <BreakdownList items={[
                  { label: 'Due from DSRs', value: rr.data.totalDsrDue, valueClass: 'text-amber-600' },
                  { label: 'Due from Customers', value: rr.data.totalCustomerDue, valueClass: 'text-amber-600' },
                  { label: 'Owe to Suppliers', value: rr.data.totalSupplierDue, valueClass: 'text-rose-600' },
                  { label: 'Net Receivable', value: netReceivable, valueClass: netReceivable >= 0 ? 'text-emerald-600' : 'text-rose-600', bold: true },
                ]} />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <Alert type="error">{error}</Alert>
      ) : (
        <>
          {/* Balance & Receivables */}
          <div>
            <h2 className="mb-4 text-base font-bold text-slate-950">{t('financeDashboard.balanceTitle') || 'Balances & Receivables'}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard title={t('financeDashboard.cashInHand')} value={formatCurrency(cashInHand)} icon={Wallet} tone="emerald" />
              <StatCard title={t('financeDashboard.dsrReceivables')} value={formatCurrency(data.totalDsrDue)} helper={t('financeDashboard.dsrReceivablesHelper')} icon={HandCoins} tone="amber" />
              <StatCard title={t('financeDashboard.customerReceivables')} value={formatCurrency(data.totalCustomerDue)} helper={t('financeDashboard.customerReceivablesHelper')} icon={Store} tone="amber" />
              <StatCard title={t('financeDashboard.supplierPayables')} value={formatCurrency(data.totalSupplierDue)} helper={t('financeDashboard.supplierPayablesHelper')} icon={Building2} tone="rose" />
              <StatCard title={t('financeDashboard.monthlyExpenses')} value={formatCurrency(data.monthlyExpenses)} helper={t('financeDashboard.monthlyExpensesHelper')} icon={CircleDollarSign} tone="rose" />
              <StatCard title={t('financeDashboard.monthlyProfit')} value={formatCurrency(data.monthlyProfit)} helper={t('financeDashboard.monthlyProfitHelper')} icon={TrendingUp} tone="emerald" />
              <StatCard title={t('financeDashboard.netPosition')} value={formatCurrency(data.netPosition)} helper={t('financeDashboard.netPositionHelper')} icon={Scale} tone="slate" />
            </div>
          </div>

          {/* Operations This Month */}
          <div>
            <h2 className="mb-4 text-base font-bold text-slate-950">{t('financeDashboard.operationsTitle')}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                title={t('financeDashboard.settlementCollected')}
                value={formatCurrency(data.monthlySettlementCollected)}
                helper={`${data.monthlySettlementCount} ${t('financeDashboard.settlementCollectedHelper')}`}
                icon={RotateCcw}
                tone="emerald"
              />
              <StatCard
                title={t('financeDashboard.settlementDue')}
                value={formatCurrency(data.monthlySettlementDue)}
                helper={t('financeDashboard.settlementDueHelper')}
                icon={HandCoins}
                tone="rose"
              />
              <StatCard
                title={t('financeDashboard.monthlySales')}
                value={formatCurrency(data.monthlySalesAmount)}
                helper={`${data.monthlySalesCount} invoices · ${t('financeDashboard.monthlySalesHelper')}`}
                icon={ShoppingBag}
                tone="blue"
              />
            </div>
          </div>

          {/* Monthly Cash Flow */}
          <div>
            <h2 className="mb-4 text-base font-bold text-slate-950">{t('financeDashboard.cashFlowTitle')}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard title={t('financeDashboard.monthlyInflow')} value={formatCurrency(data.monthlyInflow)} helper={t('financeDashboard.monthlyInflowHelper')} icon={TrendingUp} tone="emerald" />
              <StatCard title={t('financeDashboard.monthlyOutflow')} value={formatCurrency(data.monthlyOutflow)} helper={t('financeDashboard.monthlyOutflowHelper')} icon={TrendingDown} tone="rose" />
            </div>
          </div>

          {/* Recent Evening Settlements */}
          <div>
            <h2 className="mb-4 text-base font-bold text-slate-950">{t('financeDashboard.recentSettlementsTitle')}</h2>
            {!data.recentSettlements?.length ? (
              <p className="text-sm text-slate-500">{t('financeDashboard.noRecentSettlements')}</p>
            ) : (
              <div className="surface overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">{t('financeAccounts.date')}</th>
                      <th className="px-4 py-3">{t('common.dsr')}</th>
                      <th className="px-4 py-3 text-right">{t('financeDashboard.totalPayable')}</th>
                      <th className="px-4 py-3 text-right">{t('financeDashboard.amountPaid')}</th>
                      <th className="px-4 py-3 text-right">{t('financeDashboard.due')}</th>
                      <th className="px-4 py-3">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recentSettlements.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">{formatDate(s.date)}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{s.dsrName}</p>
                          {s.area ? <p className="text-xs text-slate-400">{s.area}</p> : null}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-slate-600">{formatCurrency(s.totalPayable)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-emerald-600">{formatCurrency(s.amountPaid)}</td>
                        <td className={`whitespace-nowrap px-4 py-3 text-right font-bold ${s.dueAmount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                          {s.dueAmount > 0 ? formatCurrency(s.dueAmount) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.dueAmount > 0 ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                            {s.dueAmount > 0 ? t('financeDashboard.partial') : t('financeDashboard.settled')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Finance Transactions */}
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
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">{formatDate(tx.transactionDate)}</td>
                          <td className="px-4 py-3 text-slate-600">{tx.accountName}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.className}`}>
                              {style.label}
                            </span>
                          </td>
                          <td className={`whitespace-nowrap px-4 py-3 text-right ${transactionAmountClass(tx)}`}>
                            {formatCurrency(transactionAmount(tx))}
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
