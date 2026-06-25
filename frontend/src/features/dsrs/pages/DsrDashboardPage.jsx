import { HandCoins, RotateCcw, Store, Truck, TrendingUp, Wallet } from 'lucide-react';
import { Alert, SectionHeader, StatCard, StatCardSkeleton, TableSkeleton } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, formatDate, formatNumber } from '../../../utils/calculations.js';
import { useDsrDashboardViewModel } from '../viewmodels/useDsrDashboardViewModel.js';

function monthLabel(month) {
  if (!month) return '';
  const [year, m] = month.split('-');
  return new Date(Number(year), Number(m) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}

function collectionRate(paid, payable) {
  if (!payable || payable === 0) return null;
  return ((paid / payable) * 100).toFixed(1);
}

function StatusBadge({ status, t }) {
  if (status === 'SETTLED') {
    return <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">{t('dsrDashboard.settled')}</span>;
  }
  return <span className="inline-flex items-center rounded-full border border-amber-100 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">{t('dsrDashboard.pending')}</span>;
}

export default function DsrDashboardPage() {
  const { t, language } = useInventoryApp();
  const { data, loading, error } = useDsrDashboardViewModel();

  const rate = data ? collectionRate(data.monthlyCollections, data.monthlyTotalPayable) : null;

  return (
    <div className="space-y-10">
      <SectionHeader
        eyebrow={t('dsrDashboard.eyebrow')}
        description={data ? t('dsrDashboard.period', { month: monthLabel(data.month) }) : undefined}
      />

      {error ? (
        <Alert type="error">{error}</Alert>
      ) : loading ? (
        <div className="space-y-10">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
          <TableSkeleton rows={6} columns={3} />
          <TableSkeleton rows={6} columns={5} />
        </div>
      ) : data ? (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              title={t('dsrDashboard.monthlyIssues')}
              value={formatNumber(data.monthlyIssueCount, language)}
              helper={t('dsrDashboard.monthlyIssuesHelper')}
              icon={Truck}
              tone="blue"
            />
            <StatCard
              title={t('dsrDashboard.monthlyCollections')}
              value={formatCurrency(data.monthlyCollections, language)}
              helper={t('dsrDashboard.monthlyCollectionsHelper')}
              icon={HandCoins}
              tone="emerald"
            />
            <StatCard
              title={t('dsrDashboard.monthlyPayable')}
              value={formatCurrency(data.monthlyTotalPayable, language)}
              helper={t('dsrDashboard.monthlyPayableHelper', { count: formatNumber(data.monthlySettlementCount, language) })}
              icon={RotateCcw}
              tone="blue"
            />
            <StatCard
              title={t('dsrDashboard.collectionRate')}
              value={rate !== null ? `${rate}%` : '—'}
              helper={t('dsrDashboard.collectionRateHelper')}
              icon={TrendingUp}
              tone={rate !== null && Number(rate) >= 80 ? 'emerald' : rate !== null ? 'amber' : 'slate'}
            />
            <StatCard
              title={t('dsrDashboard.outstandingDue')}
              value={formatCurrency(data.outstandingDue, language)}
              helper={t('dsrDashboard.outstandingDueHelper')}
              icon={Wallet}
              tone={data.outstandingDue > 0 ? 'amber' : 'emerald'}
            />
            <StatCard
              title={t('dsrDashboard.activeShops')}
              value={formatNumber(data.activeShopCount, language)}
              helper={t('dsrDashboard.activeShopsHelper')}
              icon={Store}
              tone="indigo"
            />
          </div>

          {/* Per-DSR outstanding due */}
          <div>
            <h2 className="mb-4 text-base font-bold text-slate-950">{t('dsrDashboard.dsrBalancesTitle')}</h2>
            {data.dsrBalances.length === 0 ? (
              <p className="text-sm text-slate-500">{t('dsrDashboard.dsrBalancesEmpty')}</p>
            ) : (
              <div className="surface overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3 text-left">{t('dsrDashboard.dsr')}</th>
                      <th className="hidden px-4 py-3 text-left sm:table-cell">{t('dsrDashboard.area')}</th>
                      <th className="px-4 py-3 text-right">{t('dsrDashboard.balance')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.dsrBalances.map((dsr) => (
                      <tr key={dsr.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{dsr.dsrName}</td>
                        <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">{dsr.area || '—'}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${dsr.balance > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                          {formatCurrency(dsr.balance, language)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent settlements */}
          <div>
            <h2 className="mb-4 text-base font-bold text-slate-950">{t('dsrDashboard.recentSettlementsTitle')}</h2>
            {data.recentSettlements.length === 0 ? (
              <p className="text-sm text-slate-500">{t('dsrDashboard.recentSettlementsEmpty')}</p>
            ) : (
              <div className="surface overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3 text-left">{t('dsrDashboard.date')}</th>
                      <th className="px-4 py-3 text-left">{t('dsrDashboard.dsr')}</th>
                      <th className="hidden px-4 py-3 text-right sm:table-cell">{t('dsrDashboard.totalPayable')}</th>
                      <th className="px-4 py-3 text-right">{t('dsrDashboard.paid')}</th>
                      <th className="hidden px-4 py-3 text-right sm:table-cell">{t('dsrDashboard.due')}</th>
                      <th className="px-4 py-3 text-left">{t('dsrDashboard.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recentSettlements.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">{formatDate(s.date, language)}</td>
                        <td className="px-4 py-3 text-slate-700">
                          <div className="font-medium">{s.dsrName}</div>
                          {s.area ? <div className="text-xs text-slate-400">{s.area}</div> : null}
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-right text-slate-600 sm:table-cell">{formatCurrency(s.totalPayable, language)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-emerald-600">{formatCurrency(s.amountPaid, language)}</td>
                        <td className={`hidden whitespace-nowrap px-4 py-3 text-right sm:table-cell ${s.dueAmount > 0 ? 'font-semibold text-amber-600' : 'text-slate-400'}`}>{formatCurrency(s.dueAmount, language)}</td>
                        <td className="px-4 py-3"><StatusBadge status={s.status} t={t} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
