import { useState } from 'react';
import { FileText, RotateCcw, Search, Truck } from 'lucide-react';
import { Alert, Badge, EmptyState, Pagination, SectionHeader, StatCard, TableSkeleton } from '../../../components/ui.jsx';
import { statusTone } from '../../../models/inventoryViewData.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, formatDate, formatNumber } from '../../../utils/calculations.js';
import { useHistoryViewModel } from '../viewmodels/useHistoryViewModel';

const TABS = [
  { key: 'issues', labelKey: 'history.issuesTab', icon: Truck },
  { key: 'settlements', labelKey: 'history.settlementsTab', icon: RotateCcw },
];

export default function HistoryPage() {
  const { t } = useInventoryApp();
  const [activeTab, setActiveTab] = useState('issues');
  const issuesVm = useHistoryViewModel('issues');
  const settlementsVm = useHistoryViewModel('settlements');
  const vm = activeTab === 'issues' ? issuesVm : settlementsVm;

  return (
    <div>
      <SectionHeader eyebrow={t('nav.history')} title={t('nav.history')} description={t('history.description')} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard title={t('history.morningIssues')} value={formatNumber(issuesVm.total)} helper={t('history.morningHelper')} icon={Truck} tone="amber" />
        <StatCard title={t('history.settlements')} value={formatNumber(settlementsVm.total)} helper={t('history.settlementHelper')} icon={RotateCcw} tone="emerald" />
      </div>

      <div className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {TABS.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = tab.key === activeTab;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    className={isActive ? 'btn-primary' : 'btn-secondary'}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    <TabIcon size={16} />
                    {t(tab.labelKey)}
                  </button>
                );
              })}
            </div>
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className="input pl-10" value={vm.search} onChange={(event) => vm.setSearch(event.target.value)} placeholder={t('history.searchByDsrPlaceholder')} />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">{t('common.date')}</th>
                <th className="px-4 py-3">{t('history.type')}</th>
                <th className="px-4 py-3">{t('dsr.title')}</th>
                <th className="px-4 py-3">{t('history.qty')}</th>
                <th className="px-4 py-3">{t('history.amount')}</th>
                <th className="px-4 py-3">{t('history.paid')}</th>
                <th className="px-4 py-3">{t('history.due')}</th>
                <th className="px-4 py-3">{t('dsr.status')}</th>
              </tr>
            </thead>
            {vm.loading ? null : (
              <tbody className="divide-y divide-slate-100">
                {vm.rows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="table-cell font-black text-slate-400">{(vm.page - 1) * vm.pageSize + index + 1}</td>
                    <td className="table-cell font-semibold text-slate-950">{formatDate(row.date)}</td>
                    <td className="table-cell">
                      <Badge tone={row.type === 'Morning Issue' ? 'amber' : 'emerald'}>{row.type === 'Morning Issue' ? t('history.issueType') : t('history.settlementType')}</Badge>
                    </td>
                    <td className="table-cell">
                      <p className="font-semibold text-slate-950">{row.dsrName}</p>
                      <p className="text-xs text-slate-500">{row.area}</p>
                    </td>
                    <td className="table-cell">{formatNumber(row.pieces)} pcs</td>
                    <td className="table-cell font-bold">{formatCurrency(row.amount)}</td>
                    <td className="table-cell">{formatCurrency(row.amountPaid || 0)}</td>
                    <td className="table-cell">{formatCurrency(row.dueAmount || 0)}</td>
                    <td className="table-cell">
                      <Badge tone={statusTone(row.status)}>{row.status === 'Issued' ? t('history.issued') : t('history.completed')}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
          {vm.loading ? (
            <div className="p-5">
              <TableSkeleton columns={9} showHeader={false} />
            </div>
          ) : null}
        </div>
        {vm.error ? (
          <div className="p-5">
            <Alert type="error">{vm.error}</Alert>
          </div>
        ) : !vm.loading && !vm.rows.length ? (
          <div className="p-5">
            <EmptyState title={t('history.noMatchTitle')} description={t('history.noMatchDescription')} icon={FileText} />
          </div>
        ) : null}
        {!vm.loading && !vm.error && vm.rows.length ? (
          <div className="border-t border-slate-100 p-4">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
