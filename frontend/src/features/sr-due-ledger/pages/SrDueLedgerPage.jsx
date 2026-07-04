import { useState } from 'react';
import { Download, FileSpreadsheet, HandCoins, Printer, RefreshCw, Wallet } from 'lucide-react';
import { Alert, Badge, EmptyState, Modal, SectionHeader, StatCard, StatCardSkeleton, TableSkeleton, Select } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, formatDate, formatDateTime } from '../../../utils/calculations.js';
import { useSrDueStatementViewModel } from '../viewmodels/useSrDueStatementViewModel.js';

const PRINT_ID = 'sr-due-statement-print';

function ledgerTone(type) {
  if (type === 'COLLECTION') return 'emerald';
  if (type === 'HANDOVER') return 'rose';
  if (type === 'OPENING') return 'blue';
  if (type === 'MANUAL_ADJUSTMENT') return 'amber';
  return 'slate';
}

function ledgerLabel(type, t) {
  const labels = {
    COLLECTION: t('srDueLedgerPage.types.COLLECTION'),
    HANDOVER: t('srDueLedgerPage.types.HANDOVER'),
    OPENING: t('srDueLedgerPage.types.OPENING'),
    MANUAL_ADJUSTMENT: t('srDueLedgerPage.types.MANUAL_ADJUSTMENT'),
  };
  return labels[type] || type;
}

function CollectModal({ balance, srName, onClose, onSave, t }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [businessDate, setBusinessDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submitForm(event) {
    event.preventDefault();
    const amountValue = Number(amount);
    if (!(amountValue > 0)) {
      setError(t('srDueLedgerPage.collectModal.amountRequired'));
      return;
    }
    setSaving(true);
    setError('');
    const result = await onSave({ amount: amountValue, note: note.trim(), businessDate });
    setSaving(false);
    if (!result?.ok) {
      setError(result?.error || t('srDueLedgerPage.collectModal.collectFailed'));
    }
  }

  return (
    <Modal title={t('srDueLedgerPage.collectModal.title')} description={srName} onClose={onClose} width="max-w-lg">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase text-slate-500">{t('srDueLedgerPage.collectModal.dueAmount')}</p>
          <p className="mt-1 text-lg font-bold text-slate-950">{formatCurrency(balance || 0)}</p>
        </div>
        <div>
          <label className="label">{t('srDueLedgerPage.collectModal.dateLabel')}</label>
          <DatePickerField value={businessDate} onChange={setBusinessDate} max={new Date().toISOString().slice(0, 10)} />
        </div>
        <div>
          <label className="label">{t('srDueLedgerPage.collectModal.amountCollectedLabel')}</label>
          <input className="input" type="number" min="0" step="0.0001" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <label className="label">{t('srDueLedgerPage.collectModal.noteLabel')}</label>
          <textarea className="input min-h-20" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('srDueLedgerPage.collectModal.notePlaceholder')} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <HandCoins size={18} />
            {saving ? t('common.saving') : t('srDueLedgerPage.collectModal.collect')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function SrDueLedgerPage() {
  const { srDirectory, language, can, t } = useInventoryApp();
  const vm = useSrDueStatementViewModel({ srs: srDirectory });
  const entries = vm.statement?.entries || [];
  const [showCollect, setShowCollect] = useState(false);

  const selectedSr = srDirectory.find((s) => s.id === vm.srId);
  const canManage = can('manage_srs');

  async function handleExportExcel() {
    const { utils, writeFile } = await import('xlsx');
    const header = [
      t('srDueLedgerPage.date'),
      t('srDueLedgerPage.type'),
      t('srDueLedgerPage.debit'),
      t('srDueLedgerPage.credit'),
      t('srDueLedgerPage.balance'),
      t('srDueLedgerPage.note'),
      t('srDueLedgerPage.createdBy'),
    ];
    const data = (entries || []).map((e) => [
      e.businessDate || String(e.createdAt || '').slice(0, 10),
      e.type,
      Number(e.debit || 0),
      Number(e.credit || 0),
      Number(e.balanceAfter),
      e.note || '',
      e.createdByName || '',
    ]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 28 }, { wch: 18 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'SR Due Ledger');
    writeFile(wb, `sr-due-${selectedSr?.name || vm.srId}.xlsx`);
  }

  async function handleCollect(payload) {
    const result = await vm.collectDue(payload);
    if (result.ok) setShowCollect(false);
    return result;
  }

  return (
    <div>
      <SectionHeader
        eyebrow={t('srDueLedgerPage.eyebrow')}
        title={t('srDueLedgerPage.title')}
        description={t('srDueLedgerPage.description')}
        action={canManage && vm.srId && vm.statement ? (
          <button type="button" className="btn-primary" onClick={() => setShowCollect(true)}>
            <HandCoins size={18} />
            {t('srDueLedgerPage.collectDue')}
          </button>
        ) : null}
      />

      <div className="surface p-5">
        <div className="grid gap-3 sm:grid-cols-4">
          <Select
            className="input sm:col-span-2"
            value={vm.srId}
            onChange={(e) => vm.setSrId(e.target.value)}
          >
            <option value="">{t('srDueLedgerPage.selectSrPlaceholder')}</option>
            {srDirectory.map((sr) => (
              <option key={sr.id} value={sr.id}>{sr.name}</option>
            ))}
          </Select>
          <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} placeholder={t('srDueLedgerPage.dateFromPlaceholder')} />
          <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} placeholder={t('srDueLedgerPage.dateToPlaceholder')} min={vm.dateFrom} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={vm.refresh}>
            <RefreshCw size={18} />
            {t('srDueLedgerPage.refresh')}
          </button>
          {vm.statement ? (
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  inventoryApi.recordPrint({ entityType: 'sr_due_statement', entityId: vm.srId, label: 'pdf' }).catch(() => {});
                  downloadSheetPdf(PRINT_ID, `sr-due-${selectedSr?.name || vm.srId}.pdf`);
                }}
              >
                <Download size={18} />
                {t('srDueLedgerPage.downloadPdf')}
              </button>
              <button type="button" className="btn-secondary" onClick={handleExportExcel}>
                <FileSpreadsheet size={18} />
                {t('srDueLedgerPage.exportExcel')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  inventoryApi.recordPrint({ entityType: 'sr_due_statement', entityId: vm.srId, label: 'print' }).catch(() => {});
                  window.print();
                }}
              >
                <Printer size={18} />
                {t('srDueLedgerPage.print')}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {vm.loading ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
          <div className="surface mt-6 overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200" />
            </div>
            <TableSkeleton rows={6} columns={7} />
          </div>
        </>
      ) : vm.error ? (
        <div className="surface mt-6 p-5">
          <EmptyState title={t('srDueLedgerPage.errorTitle')} description={vm.error} icon={Wallet} />
        </div>
      ) : !vm.statement ? (
        <div className="surface mt-6 p-5">
          <EmptyState title={t('srDueLedgerPage.noSrSelectedTitle')} description={t('srDueLedgerPage.noSrSelectedDescription')} icon={Wallet} />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title={t('srDueLedgerPage.openingBalance')} value={formatCurrency(vm.statement.openingBalance, language)} icon={Wallet} tone="slate" />
            <StatCard title={t('srDueLedgerPage.totalDebit')} value={formatCurrency(vm.statement.totalDebit, language)} icon={Wallet} tone="rose" />
            <StatCard title={t('srDueLedgerPage.totalCredit')} value={formatCurrency(vm.statement.totalCredit, language)} icon={Wallet} tone="emerald" />
            <StatCard title={t('srDueLedgerPage.closingBalance')} value={formatCurrency(vm.statement.closingBalance, language)} icon={Wallet} tone="blue" />
          </div>

          {vm.statement.sr ? (
            <div className="surface mt-4 px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{t('srDueLedgerPage.srNameLabel')}</p>
                  <p className="mt-1 font-bold text-slate-950">{vm.statement.sr.name}</p>
                  <p className="text-sm text-slate-600">{vm.statement.sr.phone}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{t('srDueLedgerPage.statusLabel')}</p>
                  <p className="mt-1 font-semibold text-slate-700">{vm.statement.sr.status}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{t('srDueLedgerPage.currentDueLabel')}</p>
                  <p className={`mt-1 text-lg font-semibold ${Number(vm.statement.sr.currentDue) > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {formatCurrency(vm.statement.sr.currentDue, language)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div id={PRINT_ID} className="surface mt-6 overflow-hidden print-target">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">{t('srDueLedgerPage.entriesTitle')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">{t('srDueLedgerPage.date')}</th>
                    <th className="px-4 py-3">{t('srDueLedgerPage.type')}</th>
                    <th className="px-4 py-3 text-right">{t('srDueLedgerPage.debit')}</th>
                    <th className="px-4 py-3 text-right">{t('srDueLedgerPage.credit')}</th>
                    <th className="px-4 py-3 text-right">{t('srDueLedgerPage.balance')}</th>
                    <th className="px-4 py-3">{t('srDueLedgerPage.note')}</th>
                    <th className="px-4 py-3">{t('srDueLedgerPage.createdBy')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(entries || []).map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="table-cell whitespace-nowrap text-sm font-semibold text-slate-700">
                        {entry.businessDate ? formatDate(entry.businessDate) : formatDateTime(entry.createdAt, language)}
                      </td>
                      <td className="table-cell">
                        <Badge tone={ledgerTone(entry.type)}>{ledgerLabel(entry.type, t)}</Badge>
                      </td>
                      <td className="table-cell text-right font-semibold text-rose-700">
                        {entry.debit ? formatCurrency(entry.debit, language) : '-'}
                      </td>
                      <td className="table-cell text-right font-semibold text-emerald-700">
                        {entry.credit ? formatCurrency(entry.credit, language) : '-'}
                      </td>
                      <td className="table-cell text-right font-semibold text-slate-950">
                        {formatCurrency(entry.balanceAfter, language)}
                      </td>
                      <td className="hidden table-cell lg:table-cell max-w-52">
                        <p className="truncate text-sm text-slate-600">{entry.note || '-'}</p>
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
            {!entries?.length ? (
              <div className="p-5">
                <EmptyState title={t('srDueLedgerPage.noEntriesTitle')} description={t('srDueLedgerPage.noEntriesDescription')} icon={Wallet} />
              </div>
            ) : null}
          </div>
        </>
      )}

      {showCollect && vm.statement ? (
        <CollectModal
          balance={vm.statement.sr?.currentDue}
          srName={selectedSr?.name || ''}
          onClose={() => setShowCollect(false)}
          onSave={handleCollect}
          t={t}
        />
      ) : null}
    </div>
  );
}

