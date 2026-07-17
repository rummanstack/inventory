import { useEffect, useRef, useState } from 'react';
import { Download, FileSpreadsheet, HandCoins, Loader2, Printer, Wallet } from 'lucide-react';
import { Alert, Badge, EmptyState, MobileCardList, MobileListCard, Modal, SectionHeader, StatCard, StatCardSkeleton, TableSkeleton, Select } from '../../../components/ui.jsx';
import { DatePickerField, DateRangePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';
import { formatCurrency, formatDate, formatDateTime } from '../../../utils/calculations.js';
import { useSrDueStatementViewModel } from '../viewmodels/useSrDueStatementViewModel.js';

const PRINT_ID = 'sr-due-statement-print';
const SR_DUE_LEDGER_SHORTCUTS = {
  collect: { alt: true, key: 's', label: 'Alt+S' },
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

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
  const formRef = useRef(null);

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

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key.toLowerCase() === 's' && (event.ctrlKey || event.metaKey) && !saving) {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [saving]);

  return (
    <Modal title={t('srDueLedgerPage.collectModal.title')} description={srName} onClose={onClose} width="max-w-lg">
      <form ref={formRef} className="space-y-4" onSubmit={submitForm}>
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
          <input className="input" type="number" inputMode="decimal" min="0" step="0.0001" value={amount} onChange={(e) => setAmount(e.target.value)} />
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
            <kbd className="ml-1 rounded border border-white/40 bg-white/20 px-1 py-0.5 font-mono text-[10px] text-white">Ctrl+S</kbd>
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
  const [downloadingPdf, downloadPdf] = useAsyncAction();

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

  async function handleDownloadPdf() {
    await downloadPdf(async () => {
      await inventoryApi.recordPrint({ entityType: 'sr_due_statement', entityId: vm.srId, label: 'pdf' }).catch(() => {});
      await downloadSheetPdf(PRINT_ID, `sr-due-${selectedSr?.name || vm.srId}.pdf`);
    });
  }

  function handlePrint() {
    inventoryApi.recordPrint({ entityType: 'sr_due_statement', entityId: vm.srId, label: 'print' }).catch(() => {});
    window.print();
  }

  function shortcutBadge(shortcut) {
    return <kbd className="ml-1 rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500">{shortcut.label}</kbd>;
  }

  function matchesShortcut(event, shortcut) {
    return (
      event.key.toLowerCase() === shortcut.key &&
      Boolean(event.altKey) === Boolean(shortcut.alt) &&
      Boolean(event.shiftKey) === Boolean(shortcut.shift) &&
      Boolean(event.ctrlKey || event.metaKey) === Boolean(shortcut.ctrlOrMeta)
    );
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (matchesShortcut(event, SR_DUE_LEDGER_SHORTCUTS.collect) && canManage && vm.srId && vm.statement && !showCollect) {
        event.preventDefault();
        setShowCollect(true);
        return;
      }
      if (!vm.statement) return;
      if (matchesShortcut(event, SR_DUE_LEDGER_SHORTCUTS.pdf) && !downloadingPdf) {
        event.preventDefault();
        handleDownloadPdf();
      } else if (matchesShortcut(event, SR_DUE_LEDGER_SHORTCUTS.excel)) {
        event.preventDefault();
        handleExportExcel();
      } else if (matchesShortcut(event, SR_DUE_LEDGER_SHORTCUTS.print)) {
        event.preventDefault();
        handlePrint();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [downloadingPdf, vm.statement, vm.srId, vm.refresh, canManage, showCollect, entries, t]);

  return (
    <div>
      <SectionHeader
        title={t('srDueLedgerPage.title')}
        compact
        action={canManage && vm.srId && vm.statement ? (
          <button type="button" className="btn-primary" onClick={() => setShowCollect(true)}>
            <HandCoins size={18} />
            {t('srDueLedgerPage.collectDue')}
            <kbd className="ml-1 rounded border border-white/40 bg-white/20 px-1 py-0.5 font-mono text-[10px] text-white">Alt+S</kbd>
          </button>
        ) : null}
      />

      <div className="surface p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-72">
            <label className="label">{t('srDueLedgerPage.srNameLabel')}</label>
            <Select
              className="input"
              value={vm.srId}
              onChange={(e) => vm.setSrId(e.target.value)}
            >
              <option value="">{t('srDueLedgerPage.selectSrPlaceholder')}</option>
              {srDirectory.map((sr) => (
                <option key={sr.id} value={sr.id}>{sr.name}</option>
              ))}
            </Select>
          </div>
          <div className="min-w-[280px]">
            <label className="label">{t('srDueLedgerPage.dateRangeLabel')}</label>
            <DateRangePickerField
              from={vm.dateFrom}
              to={vm.dateTo}
              onChange={(from, to) => { vm.setDateFrom(from); vm.setDateTo(to); }}
              placeholder={`${t('srDueLedgerPage.dateFromPlaceholder')} - ${t('srDueLedgerPage.dateToPlaceholder')}`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {vm.statement ? (
              <>
                <button
                  type="button"
                  className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                >
                  {downloadingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  {t('srDueLedgerPage.downloadPdf')}
                  {shortcutBadge(SR_DUE_LEDGER_SHORTCUTS.pdf)}
                </button>
                <button type="button" className="btn-secondary" onClick={handleExportExcel}>
                  <FileSpreadsheet size={18} />
                  {t('srDueLedgerPage.exportExcel')}
                  {shortcutBadge(SR_DUE_LEDGER_SHORTCUTS.excel)}
                </button>
                <button type="button" className="btn-secondary" onClick={handlePrint}>
                  <Printer size={18} />
                  {t('srDueLedgerPage.print')}
                  {shortcutBadge(SR_DUE_LEDGER_SHORTCUTS.print)}
                </button>
              </>
            ) : null}
          </div>
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

          <div id={PRINT_ID} className="surface mt-6 overflow-hidden print-target">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">{t('srDueLedgerPage.entriesTitle')}</h2>
            </div>
            <MobileCardList>
              {(entries || []).map((entry) => (
                <MobileListCard
                  key={entry.id}
                  title={entry.businessDate ? formatDate(entry.businessDate) : formatDateTime(entry.createdAt, language)}
                  badge={<Badge tone={ledgerTone(entry.type)}>{ledgerLabel(entry.type, t)}</Badge>}
                  subtitle={entry.note || null}
                  value={entry.debit ? formatCurrency(entry.debit, language) : entry.credit ? formatCurrency(entry.credit, language) : '-'}
                  valueClass={entry.debit ? 'text-rose-700' : entry.credit ? 'text-emerald-700' : undefined}
                  valueSub={formatCurrency(entry.balanceAfter, language)}
                />
              ))}
            </MobileCardList>
            <div className="hidden overflow-x-auto md:block">
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
                      <td className="table-cell max-w-52">
                        <p className="truncate text-sm text-slate-600">{entry.note || '-'}</p>
                      </td>
                      <td className="table-cell">
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

