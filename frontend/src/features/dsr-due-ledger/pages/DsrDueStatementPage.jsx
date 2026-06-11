import { RefreshCw, Wallet } from 'lucide-react';
import { Alert, Badge, EmptyState, SectionHeader, StatCard, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/date-picker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, formatDateTime } from '../../../utils/calculations.js';
import { useDsrDueStatementViewModel } from '../viewmodels/useDsrDueStatementViewModel';

function ledgerTone(type) {
  if (type === 'COLLECTION' || type === 'ADVANCE_ADJUSTMENT') {
    return 'emerald';
  }
  if (type === 'SALE_DUE') {
    return 'rose';
  }
  if (type === 'OPENING') {
    return 'blue';
  }
  return 'slate';
}

function formatReference(entry) {
  if (!entry.referenceType && !entry.referenceId) {
    return '-';
  }

  const shortId = entry.referenceId ? String(entry.referenceId).slice(0, 18) : '-';
  return `${entry.referenceType || 'reference'} / ${shortId}`;
}

export default function DsrDueStatementPage() {
  const { dsrDirectory, t } = useInventoryApp();
  const vm = useDsrDueStatementViewModel({ dsrs: dsrDirectory });
  const entries = vm.statement?.entries || [];

  return (
    <div>
      <SectionHeader
        eyebrow={t('dsrDueLedger.eyebrow')}
        title={t('dsrDueLedger.title')}
        description={t('dsrDueLedger.description')}
      />

      <div className="surface p-5">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
          <div>
            <label className="label">{t('dsrDueLedger.dsr')}</label>
            <select className="input" value={vm.dsrId} onChange={(event) => vm.setDsrId(event.target.value)}>
              {dsrDirectory.map((dsr) => (
                <option key={dsr.id} value={dsr.id}>
                  {dsr.name} - {dsr.area}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('dsrDueLedger.dateFrom')}</label>
            <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} />
          </div>
          <div>
            <label className="label">{t('dsrDueLedger.dateTo')}</label>
            <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} />
          </div>
          <div className="flex items-end">
            <button type="button" className="btn-secondary" onClick={vm.refresh}>
              <RefreshCw size={16} />
              {t('dsrDueLedger.refresh')}
            </button>
          </div>
        </div>
      </div>

      {vm.error ? (
        <div className="mt-4">
          <Alert type="error">{vm.error}</Alert>
        </div>
      ) : null}

      {vm.loading ? (
        <div className="mt-6">
          <TableSkeleton rows={6} columns={6} />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title={t('dsrDueLedger.openingBalance')} value={formatCurrency(vm.statement?.openingBalance || 0)} icon={Wallet} tone="slate" />
            <StatCard title={t('dsrDueLedger.totalDebit')} value={formatCurrency(vm.statement?.totalDebit || 0)} icon={Wallet} tone="rose" />
            <StatCard title={t('dsrDueLedger.totalCredit')} value={formatCurrency(vm.statement?.totalCredit || 0)} icon={Wallet} tone="emerald" />
            <StatCard title={t('dsrDueLedger.closingBalance')} value={formatCurrency(vm.statement?.closingBalance || 0)} icon={Wallet} tone="blue" />
          </div>

          <div className="surface mt-6 overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-slate-950">{t('dsrDueLedger.entriesTitle')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">{t('dsrDueLedger.when')}</th>
                    <th className="px-4 py-3">{t('dsrDueLedger.type')}</th>
                    <th className="px-4 py-3 text-right">{t('dsrDueLedger.debit')}</th>
                    <th className="px-4 py-3 text-right">{t('dsrDueLedger.credit')}</th>
                    <th className="px-4 py-3 text-right">{t('dsrDueLedger.balanceAfter')}</th>
                    <th className="hidden px-4 py-3 lg:table-cell">{t('dsrDueLedger.reference')}</th>
                    <th className="hidden px-4 py-3 xl:table-cell">{t('dsrDueLedger.createdBy')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="table-cell whitespace-nowrap text-sm font-semibold text-slate-700">{formatDateTime(entry.createdAt)}</td>
                      <td className="table-cell">
                        <Badge tone={ledgerTone(entry.type)}>{t(`dsrDueLedger.types.${entry.type}`)}</Badge>
                        {entry.note ? <p className="mt-1 max-w-56 truncate text-xs text-slate-500">{entry.note}</p> : null}
                      </td>
                      <td className="table-cell text-right font-black text-rose-700">{entry.debit ? formatCurrency(entry.debit) : '-'}</td>
                      <td className="table-cell text-right font-black text-emerald-700">{entry.credit ? formatCurrency(entry.credit) : '-'}</td>
                      <td className="table-cell text-right font-black text-slate-950">{formatCurrency(entry.balanceAfter)}</td>
                      <td className="hidden table-cell lg:table-cell">
                        <p className="max-w-52 truncate text-xs font-semibold text-slate-600">{formatReference(entry)}</p>
                      </td>
                      <td className="hidden table-cell xl:table-cell">
                        <p className="font-semibold text-slate-950">{entry.createdByName || '-'}</p>
                        <p className="text-xs text-slate-500">{entry.createdByRole || ''}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!entries.length ? (
              <div className="p-5">
                <EmptyState title={t('dsrDueLedger.emptyTitle')} description={t('dsrDueLedger.emptyDescription')} icon={Wallet} />
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
