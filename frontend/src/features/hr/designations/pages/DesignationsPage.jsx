import { BriefcaseBusiness, Pencil, Plus, Trash2 } from 'lucide-react';
import { Alert, EmptyState, MobileCardList, MobileListCard, Pagination, SectionHeader, Select, TableSkeleton } from '../../../../components/ui.jsx';
import TableReportActions from '../../../../components/TableReportActions.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { useMutation } from '@tanstack/react-query';
import { useDesignationsViewModel } from '../viewmodels/useDesignationsViewModel.js';
import DesignationFormModal from '../components/DesignationFormModal.jsx';
import { useEffect, useState } from 'react';

const DESIGNATIONS_REPORT_ID = 'designations-report';
const DESIGNATIONS_ADD_SHORTCUT = { alt: true, key: 'a', label: 'Alt+A' };
const DESIGNATIONS_REPORT_SHORTCUTS = {
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  csv: { alt: true, key: 'c', label: 'Alt+C' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

function matchesShortcut(event, shortcut) {
  return (
    event.key.toLowerCase() === shortcut.key &&
    Boolean(event.altKey) === Boolean(shortcut.alt) &&
    Boolean(event.shiftKey) === Boolean(shortcut.shift) &&
    Boolean(event.ctrlKey || event.metaKey) === Boolean(shortcut.ctrlOrMeta)
  );
}

export default function DesignationsPage() {
  const { t, can, confirm, pushToast } = useInventoryApp();
  const vm = useDesignationsViewModel();
  const [formModal, setFormModal] = useState(null);
  const canManage = can('manage_designations');
  const designationMutation = useMutation({
    mutationFn: ({ action, data, reason }) => {
      if (action === 'update') return inventoryApi.updateDesignation(data);
      if (action === 'create') return inventoryApi.createDesignation(data);
      return inventoryApi.deleteDesignation(data.id, reason);
    },
  });

  useEffect(() => {
    function handleKeyDown(event) {
      if (matchesShortcut(event, DESIGNATIONS_ADD_SHORTCUT) && canManage && !formModal) {
        event.preventDefault();
        setFormModal({ mode: 'add' });
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canManage, formModal]);

  async function handleSave(data) {
    try {
      if (data.id) {
        await designationMutation.mutateAsync({ action: 'update', data });
      } else {
        await designationMutation.mutateAsync({ action: 'create', data });
      }
      setFormModal(null);
      vm.reload();
      pushToast('success', t('designations.title'), data.id ? t('alerts.updated') : t('alerts.created'));
      return { ok: true };
    } catch (error) {
      return { error: error?.message || t('alerts.requestFailed') };
    }
  }

  async function handleDelete(designation) {
    const { confirmed, reason } = await confirm({
      title: t('designations.deleteTitle'),
      description: t('designations.deleteConfirm', { name: designation.name }),
      confirmLabel: t('common.delete'),
      tone: 'rose',
      requireReason: true,
      reasonLabel: t('common.deleteReasonLabel'),
      reasonPlaceholder: t('common.deleteReasonPlaceholder'),
    });
    if (!confirmed) return;

    try {
      await designationMutation.mutateAsync({ action: 'delete', data: designation, reason });
      pushToast('success', t('common.delete'), `${designation.name} ${t('alerts.deleted')}`);
      vm.reload();
    } catch (error) {
      pushToast('error', t('alerts.deleteFailed'), error?.message || t('alerts.requestFailed'));
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow={t('designations.eyebrow')}
        title={t('designations.title')}
        description={t('designations.description')}
        action={canManage ? (
          <button type="button" className="btn-primary" onClick={() => setFormModal({ mode: 'add' })}>
            <Plus size={18} />
            {t('designations.add')}
            <kbd className="ml-1 rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200">Alt+A</kbd>
          </button>
        ) : null}
      />

      <div id={DESIGNATIONS_REPORT_ID} className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t('designations.eyebrow')}</p>
            <div className="flex flex-1 flex-wrap gap-2 sm:justify-end">
              <TableReportActions targetId={DESIGNATIONS_REPORT_ID} title={t('designations.title')} fileName="designations" entityType="designations" t={t} shortcuts={DESIGNATIONS_REPORT_SHORTCUTS} />
              <input className="input w-full sm:w-56" placeholder={t('common.search')} value={vm.search} onChange={(e) => vm.setSearch(e.target.value)} />
              <Select className="input w-full sm:w-40" value={vm.status} onChange={(e) => vm.setStatus(e.target.value)}>
                <option value="">{t('designations.allStatuses')}</option>
                <option value="ACTIVE">{t('designations.active')}</option>
                <option value="INACTIVE">{t('designations.inactive')}</option>
              </Select>
            </div>
          </div>
        </div>

        {vm.loading ? (
          <div className="p-5"><TableSkeleton columns={5} /></div>
        ) : vm.error ? (
          <div className="p-5"><Alert type="error">{vm.error}</Alert></div>
        ) : (
          <>
          <MobileCardList>
            {vm.items.map((designation) => (
              <MobileListCard
                key={designation.id}
                title={designation.name}
                badge={
                  <span className={`muted-chip ${designation.status === 'ACTIVE' ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {designation.status === 'ACTIVE' ? t('designations.active') : t('designations.inactive')}
                  </span>
                }
                subtitle={designation.code || '-'}
                value={designation.employeeCount}
                action={canManage ? (
                  <>
                    <button type="button" className="icon-btn" onClick={() => setFormModal({ mode: 'edit', designation })} title={t('common.edit')}>
                      <Pencil size={16} />
                    </button>
                    <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" onClick={() => handleDelete(designation)} title={t('common.delete')}>
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
                  <th className="px-4 py-3">{t('designations.name')}</th>
                  <th className="px-4 py-3">{t('designations.code')}</th>
                  <th className="px-4 py-3">{t('designations.employees')}</th>
                  <th className="px-4 py-3">{t('designations.status')}</th>
                  {canManage ? <th className="px-4 py-3 text-right no-print">{t('common.actions')}</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vm.items.map((designation, index) => (
                  <tr key={designation.id} className="hover:bg-slate-50">
                    <td className="table-cell font-semibold text-slate-400">{(vm.page - 1) * vm.pageSize + index + 1}</td>
                    <td className="table-cell font-semibold text-slate-950">{designation.name}</td>
                    <td className="table-cell font-mono text-xs text-slate-500">{designation.code || '-'}</td>
                    <td className="table-cell">{designation.employeeCount}</td>
                    <td className="table-cell">
                      <span className={`muted-chip ${designation.status === 'ACTIVE' ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {designation.status === 'ACTIVE' ? t('designations.active') : t('designations.inactive')}
                      </span>
                    </td>
                    {canManage ? (
                      <td className="table-cell no-print">
                        <div className="row-actions flex justify-end gap-2">
                          <button type="button" className="icon-btn" onClick={() => setFormModal({ mode: 'edit', designation })} title={t('common.edit')}>
                            <Pencil size={16} />
                          </button>
                          <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" onClick={() => handleDelete(designation)} title={t('common.delete')}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}

        {!vm.loading && !vm.error && !vm.items.length ? (
          <div className="p-5">
            <EmptyState title={t('designations.noDesignations')} description={t('designations.noDesignationsDesc')} icon={BriefcaseBusiness} />
          </div>
        ) : null}

        {!vm.loading && !vm.error && vm.items.length > 0 ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {formModal ? (
        <DesignationFormModal
          designation={formModal.designation}
          onClose={() => setFormModal(null)}
          onSave={handleSave}
        />
      ) : null}
    </div>
  );
}
