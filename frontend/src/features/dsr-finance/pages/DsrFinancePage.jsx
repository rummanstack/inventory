import { useState } from 'react';
import { Download, HandCoins, Printer, RefreshCw, Wallet } from 'lucide-react';
import { Alert, Badge, EmptyState, SectionHeader, StatCard, TableSkeleton, Select } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, formatDateTime } from '../../../utils/calculations.js';
import { useDsrDueStatementViewModel } from '../viewmodels/useDsrDueStatementViewModel';
import SettleDueModal from '../components/SettleDueModal';

function ledgerTone(type) {
  if (type === 'COLLECTION' || type === 'ADVANCE_ADJUSTMENT') return 'emerald';
  if (type === 'SALE_DUE') return 'rose';
  if (type === 'OPENING') return 'blue';
  return 'slate';
}

function formatReference(entry) {
  if (!entry.referenceType && !entry.referenceId) return '-';
  const shortId = entry.referenceId ? String(entry.referenceId).slice(0, 18) : '-';
  return `${entry.referenceType || 'reference'} / ${shortId}`;
}

export default function DsrFinancePage() {
  const { t, dsrDirectory, pushToast } = useInventoryApp();
  const dueVm = useDsrDueStatementViewModel({ dsrs: dsrDirectory });
  const [showSettleModal, setShowSettleModal] = useState(false);

  async function handleSettleDue(payload) {
    const result = await dueVm.settleDue(payload);
    if (result.ok) {
      setShowSettleModal(false);
      pushToast('success', t('dsrDueLedger.settleDue'), t('dsrDueLedger.settleSuccess'));
    }
    return result;
  }

  const dueEntries = dueVm.statement?.entries || [];

  return (
    <div>
      <SectionHeader
        eyebrow={t('nav.dsrFinance')}
        title={t('dsrFinance.title')}
        description={t('dsrFinance.description')}
        action={
          <button type="button" className="btn-primary" disabled={!dueVm.dsrId} onClick={() => setShowSettleModal(true)}>
            <HandCoins size={18} />
            {t('dsrDueLedger.settleDue')}
          </button>
        }
      />

      {dueVm.error ? (
        <div className="mb-6">
          <Alert type="error">{dueVm.error}</Alert>
        </div>
      ) : null}

      <div className="surface mb-6 p-5">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
          <div>
            <label className="label">{t('dsrDueLedger.dsr')}</label>
            <Select className="input" value={dueVm.dsrId} onChange={(event) => dueVm.setDsrId(event.target.value)}>
              {dsrDirectory.map((dsr) => (
                <option key={dsr.id} value={dsr.id}>
                  {dsr.name} - {dsr.area}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">{t('dsrDueLedger.dateFrom')}</label>
            <DatePickerField value={dueVm.dateFrom} onChange={dueVm.setDateFrom} />
          </div>
          <div>
            <label className="label">{t('dsrDueLedger.dateTo')}</label>
            <DatePickerField value={dueVm.dateTo} onChange={dueVm.setDateTo} min={dueVm.dateFrom} />
          </div>
          <div className="flex items-end gap-2">
            <button type="button" className="btn-secondary" onClick={dueVm.refresh}>
              <RefreshCw size={16} />
              {t('dsrDueLedger.refresh')}
            </button>
            {dueVm.statement ? (
              <div className="flex items-center gap-2 no-print">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { inventoryApi.recordPrint({ entityType: 'dsr_due_statement', entityId: dueVm.dsrId, label: 'pdf' }).catch(() => {}); downloadSheetPdf('dsr-due-statement-print', `dsr-due-statement.pdf`); }}
                >
                  <Download size={16} />
                  {t('purchaseReceive.downloadPdf')}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { inventoryApi.recordPrint({ entityType: 'dsr_due_statement', entityId: dueVm.dsrId, label: 'print' }).catch(() => {}); window.print(); }}
                >
                  <Printer size={16} />
                  {t('purchaseReceive.printSheet')}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {dueVm.loading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title={t('dsrDueLedger.openingBalance')} value={formatCurrency(dueVm.statement?.openingBalance || 0)} icon={Wallet} tone="slate" />
            <StatCard title={t('dsrDueLedger.totalDebit')} value={formatCurrency(dueVm.statement?.totalDebit || 0)} icon={Wallet} tone="rose" />
            <StatCard title={t('dsrDueLedger.totalCredit')} value={formatCurrency(dueVm.statement?.totalCredit || 0)} icon={Wallet} tone="emerald" />
            <StatCard title={t('dsrDueLedger.closingBalance')} value={formatCurrency(dueVm.currentBalance ?? dueVm.statement?.closingBalance ?? 0)} icon={Wallet} tone="blue" />
          </div>

          <div id="dsr-due-statement-print" className="surface mt-6 overflow-hidden print-target">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">{t('dsrDueLedger.entriesTitle')}</h2>
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
                    <th className="px-4 py-3">{t('dsrDueLedger.reference')}</th>
                    <th className="hidden px-4 py-3 xl:table-cell">{t('dsrDueLedger.createdBy')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dueEntries.map((entry) => (
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
            {!dueEntries.length ? (
              <div className="p-5">
                <EmptyState title={t('dsrDueLedger.emptyTitle')} description={t('dsrDueLedger.emptyDescription')} icon={Wallet} />
              </div>
            ) : null}
          </div>
        </>
      )}

      {showSettleModal ? (
        <SettleDueModal
          dsr={dueVm.statement?.dsr}
          balance={dueVm.currentBalance}
          onClose={() => setShowSettleModal(false)}
          onSave={handleSettleDue}
        />
      ) : null}
    </div>
  );
}

