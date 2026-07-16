import { Link } from 'react-router-dom';
import { BriefcaseBusiness, Building2, CalendarRange, Landmark, Lock, PiggyBank, Receipt, Scale, Wallet, TrendingUp } from 'lucide-react';
import { Alert, Badge, MobileCardList, MobileListCard, SectionHeader, StatCard } from '../../../components/ui.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency } from '../../../utils/calculations.js';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

export default function AccountingDashboardPage() {
  const query = useTenantReportQuery({
    scope: 'accounting-dashboard',
    queryFn: () => inventoryApi.getAccountingDashboard(),
  });
  const data = query.data || null;
  const error = query.error?.message || '';
  const loading = query.isPending;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Accounting"
        title="Accounting Dashboard"
        description="Journal-driven financial totals, posting window status, and close-control visibility for accountants."
      />
      {error ? <Alert type="error">{error}</Alert> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Assets" rawValue={data?.totalAssets || 0} value={loading ? '...' : formatCurrency(data?.totalAssets || 0)} formatter={(v) => formatCurrency(v)} icon={Landmark} tone="indigo" />
        <StatCard title="Total Liabilities" rawValue={data?.totalLiabilities || 0} value={loading ? '...' : formatCurrency(data?.totalLiabilities || 0)} formatter={(v) => formatCurrency(v)} icon={BriefcaseBusiness} tone="rose" />
        <StatCard title="Equity" rawValue={data?.equity || 0} value={loading ? '...' : formatCurrency(data?.equity || 0)} formatter={(v) => formatCurrency(v)} icon={Scale} tone="emerald" />
        <StatCard title="Income" rawValue={data?.income || 0} value={loading ? '...' : formatCurrency(data?.income || 0)} formatter={(v) => formatCurrency(v)} icon={TrendingUp} tone="blue" />
        <StatCard title="Expenses" rawValue={data?.expenses || 0} value={loading ? '...' : formatCurrency(data?.expenses || 0)} formatter={(v) => formatCurrency(v)} icon={Receipt} tone="amber" />
        <StatCard title="Current Cash" rawValue={data?.currentCash || 0} value={loading ? '...' : formatCurrency(data?.currentCash || 0)} formatter={(v) => formatCurrency(v)} icon={Wallet} tone="slate" />
        <StatCard title="Current Bank Balance" rawValue={data?.currentBankBalance || 0} value={loading ? '...' : formatCurrency(data?.currentBankBalance || 0)} formatter={(v) => formatCurrency(v)} icon={Building2} tone="indigo" />
        <StatCard title="Receivable / Payable" value={loading ? '...' : `${formatCurrency(data?.currentReceivable || 0)} / ${formatCurrency(data?.currentPayable || 0)}`} icon={PiggyBank} tone="slate" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <section className="surface px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Posting Window</h2>
              <p className="text-sm text-slate-500">Current fiscal year, current period, and queue status.</p>
            </div>
            <CalendarRange className="h-5 w-5 text-slate-400" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Fiscal Year</div>
              <div className="mt-1 text-sm font-semibold text-slate-950">{data?.currentFiscalYear?.name || '-'}</div>
              <div className="mt-2"><Badge tone={data?.currentFiscalYear?.status === 'CLOSED' ? 'rose' : 'emerald'}>{data?.currentFiscalYear?.status || 'Unknown'}</Badge></div>
            </div>
            <div className="rounded-lg border border-slate-200 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Accounting Period</div>
              <div className="mt-1 text-sm font-semibold text-slate-950">{data?.currentAccountingPeriod?.name || '-'}</div>
              <div className="mt-2 flex gap-2">
                <Badge tone={data?.currentAccountingPeriod?.status === 'CLOSED' ? 'rose' : 'blue'}>{data?.currentAccountingPeriod?.status || 'Unknown'}</Badge>
                {data?.currentAccountingPeriod?.locked ? <Badge tone="amber">Locked</Badge> : <Badge tone="emerald">Unlocked</Badge>}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Open Periods</div>
              <div className="mt-1 text-2xl font-semibold text-slate-950">{loading ? '...' : data?.openPeriods ?? 0}</div>
            </div>
            <div className="rounded-lg border border-slate-200 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Locked Periods</div>
              <div className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-950"><Lock className="h-4 w-4 text-slate-400" />{loading ? '...' : data?.lockedPeriods ?? 0}</div>
            </div>
            <div className="rounded-lg border border-slate-200 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Draft Journals</div>
              <div className="mt-1 text-2xl font-semibold text-slate-950">{loading ? '...' : data?.draftJournals ?? 0}</div>
            </div>
            <div className="rounded-lg border border-slate-200 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Pending Approvals</div>
              <div className="mt-1 text-2xl font-semibold text-slate-950">{loading ? '...' : data?.pendingApprovals ?? 0}</div>
            </div>
          </div>
        </section>

        <section className="surface px-5 py-5">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Quick Links</h2>
            <p className="text-sm text-slate-500">Common accounting control entry points.</p>
          </div>
          <div className="mt-4 grid gap-2">
            {(data?.quickLinks || []).map((item) => (
              <Link key={item.route} to={item.route} className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                {item.label}
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="surface px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Recent Accounting Activity</h2>
            <p className="text-sm text-slate-500">Recent period, fiscal year, opening balance, voucher, and report actions.</p>
          </div>
        </div>
        <div className="mt-4">
          <MobileCardList>
            {(data?.recentActivities || []).map((item) => (
              <MobileListCard
                key={item.id}
                title={item.description || item.actionType}
                subtitle={`${item.entityType || '-'} · ${formatDateTime(item.createdAt)}`}
              />
            ))}
          </MobileCardList>
          {!loading && !(data?.recentActivities || []).length ? (
            <p className="px-1 py-3 text-sm text-slate-500 md:hidden">No recent accounting activity.</p>
          ) : null}
          <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.recentActivities || []).map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="table-cell text-slate-950">{item.description || item.actionType}</td>
                  <td className="table-cell text-slate-600">{item.entityType || '-'}</td>
                  <td className="table-cell text-slate-600">{formatDateTime(item.createdAt)}</td>
                </tr>
              ))}
              {!loading && !(data?.recentActivities || []).length ? (
                <tr>
                  <td className="table-cell text-slate-500" colSpan={3}>No recent accounting activity.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
          </div>
        </div>
      </section>
    </div>
  );
}
