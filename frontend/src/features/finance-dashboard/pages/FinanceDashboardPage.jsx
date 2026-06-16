import { Banknote, Building2, CircleDollarSign, HandCoins, Landmark, RotateCcw, Scale, ShoppingBag, Store, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Alert, LoadingState, SectionHeader, StatCard } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, formatDate } from '../../../utils/calculations.js';
import { useFinanceDashboardViewModel } from '../viewmodels/useFinanceDashboardViewModel';

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

export default function FinanceDashboardPage() {
  const { t } = useInventoryApp();
  const { data, loading, error } = useFinanceDashboardViewModel();

  const cashInHand = data?.accounts?.find((a) => a.type === 'CASH')?.balance || 0;
  const bankBalance = data?.accounts?.find((a) => a.type === 'BANK')?.balance || 0;

  return (
    <div className="space-y-10">
      <SectionHeader
        eyebrow={t('financeDashboard.eyebrow')}
        title={t('financeDashboard.title')}
        description={t('financeDashboard.description')}
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <Alert type="error">{error}</Alert>
      ) : (
        <>
          {/* Balance & Receivables */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard title={t('financeDashboard.cashInHand')} value={formatCurrency(cashInHand)} icon={Wallet} tone="emerald" />
            <StatCard title={t('financeDashboard.bankBalance')} value={formatCurrency(bankBalance)} icon={Landmark} tone="blue" />
            <StatCard title={t('financeDashboard.totalCash')} value={formatCurrency(data.totalCashBalance)} helper={t('financeDashboard.totalCashHelper')} icon={Banknote} tone="indigo" />
            <StatCard title={t('financeDashboard.dsrReceivables')} value={formatCurrency(data.totalDsrDue)} helper={t('financeDashboard.dsrReceivablesHelper')} icon={HandCoins} tone="amber" />
            <StatCard title={t('financeDashboard.customerReceivables')} value={formatCurrency(data.totalCustomerDue)} helper={t('financeDashboard.customerReceivablesHelper')} icon={Store} tone="amber" />
            <StatCard title={t('financeDashboard.supplierPayables')} value={formatCurrency(data.totalSupplierDue)} helper={t('financeDashboard.supplierPayablesHelper')} icon={Building2} tone="rose" />
            <StatCard title={t('financeDashboard.monthlyExpenses')} value={formatCurrency(data.monthlyExpenses)} helper={t('financeDashboard.monthlyExpensesHelper')} icon={CircleDollarSign} tone="rose" />
            <StatCard title={t('financeDashboard.monthlyProfit')} value={formatCurrency(data.monthlyProfit)} helper={t('financeDashboard.monthlyProfitHelper')} icon={TrendingUp} tone="emerald" />
            <StatCard title={t('financeDashboard.netPosition')} value={formatCurrency(data.netPosition)} helper={t('financeDashboard.netPositionHelper')} icon={Scale} tone="slate" />
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
              <StatCard
                title={t('financeDashboard.monthlyCashReceipts')}
                value={formatCurrency(data.monthlyCashReceipts)}
                helper={t('financeDashboard.monthlyCashReceiptsHelper')}
                icon={HandCoins}
                tone="indigo"
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
              <div className="panel-strong overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
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
              <div className="panel-strong overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
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
