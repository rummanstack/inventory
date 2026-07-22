import { useEffect, useState } from 'react';
import { HandCoins, Pencil, Phone, Plus, Search, Trash2, Users } from 'lucide-react';
import { Alert, Badge, EmptyState, MobileCardList, MobileListCard, Modal, Pagination, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { statusTone } from '../../../models/inventoryViewData.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency } from '../../../utils/calculations.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import SrFormModal from '../components/SrFormModal';
import { useSrViewModel } from '../viewmodels/useSrViewModel';
import { useMutation } from '@tanstack/react-query';

const SRS_REPORT_ID = 'srs-report';
const SRS_REPORT_SHORTCUTS = {
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  csv: { alt: true, key: 'c', label: 'Alt+C' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};
const SRS_ADD_SHORTCUT = { alt: true, key: 'a', label: 'Alt+A' };

function matchesShortcut(event, shortcut) {
  return (
    event.key.toLowerCase() === shortcut.key &&
    Boolean(event.altKey) === Boolean(shortcut.alt) &&
    Boolean(event.shiftKey) === Boolean(shortcut.shift) &&
    Boolean(event.ctrlKey || event.metaKey) === Boolean(shortcut.ctrlOrMeta)
  );
}

function CollectDueModal({ sr, onClose, onSave, t }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [businessDate, setBusinessDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const amountValue = Number(amount);
    if (!(amountValue > 0)) {
      setError(t('srs.amountRequired'));
      return;
    }
    setSaving(true);
    setError('');
    const result = await onSave({ amount: amountValue, note: note.trim(), businessDate });
    setSaving(false);
    if (!result?.ok) setError(result?.error || t('srs.collectFailed'));
  }

  return (
    <Modal title={t('srs.collectModalTitle')} description={sr.name} onClose={onClose} width="max-w-lg">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase text-slate-500">{t('srs.currentBalance')}</p>
          <p className="mt-1 text-lg font-bold text-slate-950">{formatCurrency(sr.currentDue || 0)}</p>
        </div>
        <div>
          <label className="label">{t('srs.dateLabel')}</label>
          <DatePickerField value={businessDate} onChange={setBusinessDate} max={new Date().toISOString().slice(0, 10)} />
        </div>
        <div>
          <label className="label">{t('srs.amountCollectedLabel')}</label>
          <input className="input" type="number" inputMode="decimal" min="0" step="0.0001" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <label className="label">{t('srs.noteLabel')}</label>
          <textarea className="input min-h-20" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('srs.notePlaceholder')} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <HandCoins size={18} />
            {saving ? t('common.saving') : t('srs.collect')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function SrPage() {
  const { saveSr, deleteSr, can, t } = useInventoryApp();
  const vm = useSrViewModel();
  const collectionMutation = useMutation({
    mutationFn: (payload) => inventoryApi.collectSrDue(payload),
  });
  const [srModal, setSrModal] = useState(null);
  const [collectModal, setCollectModal] = useState(null);
  const canManageSrs = can('manage_srs');

  useEffect(() => {
    function handleKeyDown(event) {
      if (matchesShortcut(event, SRS_ADD_SHORTCUT) && canManageSrs && !srModal && !collectModal) {
        event.preventDefault();
        setSrModal({ mode: 'add' });
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canManageSrs, srModal, collectModal]);

  return (
    <div>
      <SectionHeader
        title={t('srs.title')}
        compact
        action={canManageSrs ? (
          <button type="button" className="btn-primary" onClick={() => setSrModal({ mode: 'add' })}>
            <Plus size={18} />
            {t('srs.add')}
            <kbd className="ml-1 rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200">Alt+A</kbd>
          </button>
        ) : null}
      />

      <div id={SRS_REPORT_ID} className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="input pl-10"
                value={vm.search}
                onChange={(e) => vm.setSearch(e.target.value)}
                placeholder={t('srs.searchPlaceholder')}
              />
            </div>
            <TableReportActions targetId={SRS_REPORT_ID} title={t('srs.title')} fileName="srs" entityType="srs" t={t} shortcuts={SRS_REPORT_SHORTCUTS} />
          </div>
        </div>

        {vm.loading ? (
          <div className="p-5">
            <TableSkeleton columns={5} showHeader={false} />
          </div>
        ) : vm.error ? (
          <div className="p-5">
            <Alert type="error">{vm.error}</Alert>
          </div>
        ) : (
          <>
          <MobileCardList>
            {vm.items.map((sr) => (
              <MobileListCard
                key={sr.id}
                title={sr.name}
                badge={<Badge tone={statusTone(sr.status)}>{t(sr.status === 'Active' ? 'srs.statusActive' : 'srs.statusInactive')}</Badge>}
                subtitle={sr.phone}
                value={formatCurrency(sr.currentDue || 0)}
                valueClass={Number(sr.currentDue) > 0 ? 'text-rose-700' : undefined}
                action={canManageSrs ? (
                  <>
                    {Number(sr.currentDue) > 0 ? (
                      <button type="button" className="icon-btn" title={t('srs.collectDue')} onClick={() => setCollectModal(sr)}>
                        <HandCoins size={16} />
                      </button>
                    ) : null}
                    <button type="button" className="icon-btn" title={t('srs.edit')} onClick={() => setSrModal({ mode: 'edit', sr })}>
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn text-rose-600 hover:text-rose-700"
                      title={t('srs.delete')}
                      onClick={async () => {
                        const r = await deleteSr(sr);
                        if (r.ok) vm.reload();
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : null}
              />
            ))}
          </MobileCardList>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">{t('srs.name')}</th>
                  <th className="px-4 py-3">{t('srs.phone')}</th>
                  <th className="px-4 py-3">{t('srs.status')}</th>
                  <th className="px-4 py-3 text-right">{t('srs.currentDue')}</th>
                  <th className="px-4 py-3 text-right no-print">{t('srs.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vm.items.map((sr, index) => (
                  <tr key={sr.id} className="hover:bg-slate-50">
                    <td className="table-cell font-semibold text-slate-400">{(vm.page - 1) * vm.pageSize + index + 1}</td>
                    <td className="table-cell font-semibold text-slate-950">{sr.name}</td>
                    <td className="table-cell">
                      <span className="inline-flex items-center gap-2">
                        <Phone size={15} className="text-slate-400" />
                        {sr.phone}
                      </span>
                    </td>
                    <td className="table-cell no-print">
                      <Badge tone={statusTone(sr.status)}>{t(sr.status === 'Active' ? 'srs.statusActive' : 'srs.statusInactive')}</Badge>
                    </td>
                    <td className="table-cell text-right">
                      <span className={`font-bold ${Number(sr.currentDue) > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                        {formatCurrency(sr.currentDue || 0)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="row-actions flex justify-end gap-2">
                        {canManageSrs ? (
                          <>
                            {Number(sr.currentDue) > 0 ? (
                              <button type="button" className="btn-secondary h-8 px-3 text-xs" title={t('srs.collectDue')} onClick={() => setCollectModal(sr)}>
                                <HandCoins size={15} />
                                {t('srs.collect')}
                              </button>
                            ) : null}
                            <button type="button" className="icon-btn" title={t('srs.edit')} onClick={() => setSrModal({ mode: 'edit', sr })}>
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn text-rose-600 hover:text-rose-700"
                              title={t('srs.delete')}
                              onClick={async () => {
                                const r = await deleteSr(sr);
                                if (r.ok) vm.reload();
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}

        {!vm.loading && !vm.error && !vm.items.length ? (
          <div className="p-5">
            <EmptyState title={t('srs.noneTitle')} description={t('srs.noneDescription')} icon={Users} />
          </div>
        ) : null}

        {!vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {srModal ? (
        <SrFormModal
          sr={srModal.sr}
          onClose={() => setSrModal(null)}
          onSave={async (value) => {
            const result = await saveSr(value);
            if (result.ok) {
              setSrModal(null);
              vm.reload();
            }
            return result;
          }}
        />
      ) : null}

      {collectModal ? (
        <CollectDueModal
          sr={collectModal}
          t={t}
          onClose={() => setCollectModal(null)}
          onSave={async (payload) => {
            try {
              await collectionMutation.mutateAsync({ srId: collectModal.id, ...payload });
              setCollectModal(null);
              vm.reload();
              return { ok: true };
            } catch (err) {
              return { ok: false, error: err.message };
            }
          }}
        />
      ) : null}
    </div>
  );
}
