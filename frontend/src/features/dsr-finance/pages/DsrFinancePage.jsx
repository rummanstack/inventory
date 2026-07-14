import { useEffect, useState } from 'react';
import { Download, HandCoins, Loader2, Printer, RefreshCw, Wallet } from 'lucide-react';
import { Alert, Badge, CopyableText, EmptyState, SectionHeader, StatCard, TableSkeleton, Select } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, formatDateTime } from '../../../utils/calculations.js';
import { useDsrDueStatementViewModel } from '../viewmodels/useDsrDueStatementViewModel';
import SettleDueModal from '../components/SettleDueModal';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';

function ledgerTone(type) {
  if (type === 'COLLECTION') return 'emerald';
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
  const [downloadingPdf, downloadPdf] = useAsyncAction();

  async function handleSettleDue(payload) {
    const result = await dueVm.settleDue(payload);
    if (result.ok) {
      setShowSettleModal(false);
      pushToast('success', t('dsrDueLedger.settleDue'), t('dsrDueLedger.settleSuccess'));
    }
    return result;
  }

  const dueEntries = dueVm.statement?.entries || [];

  function handleDownloadPdf() {
    return downloadPdf(async () => {
      await inventoryApi.recordPrint({ entityType: 'dsr_due_statement', entityId: dueVm.dsrId, label: 'pdf' }).catch(() => {});
      await downloadSheetPdf('dsr-due-statement-print', `dsr-due-statement.pdf`);
    });
  }

  function handlePrintSheet() {
    inventoryApi.recordPrint({ entityType: 'dsr_due_statement', entityId: dueVm.dsrId, label: 'print' }).catch(() => {});
    window.print();
  }

  useEffect(() => {
    function handleKeyDown(event) {
      const key = event.key.toLowerCase();
      const isReportShortcut = event.altKey && !event.ctrlKey && !event.metaKey;
      if (!isReportShortcut) {
        return;
      }
      if (key === 's' && dueVm.dsrId) {
        event.preventDefault();
        setShowSettleModal(true);
      } else if (dueVm.statement && key === 'r') {
        event.preventDefault();
        dueVm.refresh();
      } else if (dueVm.statement && key === 'd' && !downloadingPdf) {
        event.preventDefault();
        handleDownloadPdf();
      } else if (dueVm.statement && key === 'p') {
        event.preventDefault();
        handlePrintSheet();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [downloadingPdf, dueVm.statement, dueVm.dsrId]);

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
            <kbd className="ml-1 rounded border border-white/40 bg-white/20 px-1 py-0.5 font-mono text-[10px] text-white">Alt+S</kbd>
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
              <kbd className="ml-1 rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500">Alt+R</kbd>
            </button>
            {dueVm.statement ? (
              <div className="flex items-center gap-2 no-print">
                <button
                  type="button"
                  className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleDownloadPdf}

                  disabled={downloadingPdf}
                >
                  {downloadingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  {t('purchaseReceive.downloadPdf')}
                  <kbd className="ml-1 rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500">Alt+D</kbd>
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handlePrintSheet}

                >
                  <Printer size={16} />
                  {t('purchaseReceive.printSheet')}
                  <kbd className="ml-1 rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500">Alt+P</kbd>
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
                    <th className="px-4 py-3">{t('dsrDueLedger.createdBy')}</th>
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
                      <td className="table-cell text-right font-semibold text-rose-700">{entry.debit ? formatCurrency(entry.debit) : '-'}</td>
                      <td className="table-cell text-right font-semibold text-emerald-700">{entry.credit ? formatCurrency(entry.credit) : '-'}</td>
                      <td className="table-cell text-right font-semibold text-slate-950">{formatCurrency(entry.balanceAfter)}</td>
                      <td className="table-cell">
                        <CopyableText value={entry.referenceId ? `${entry.referenceType || 'reference'} / ${entry.referenceId}` : ''} copyLabel={t('dsrDueLedger.reference')} displayValue={formatReference(entry)} textClassName="max-w-52 text-xs font-semibold text-slate-600" buttonClassName="h-5 w-5" />
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




