import { useEffect, useState } from 'react';
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Alert, EmptyState, Pagination, SectionHeader, Select, TableSkeleton } from '../../../../components/ui.jsx';
import TableReportActions from '../../../../components/TableReportActions.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { useDepartmentsViewModel } from '../viewmodels/useDepartmentsViewModel.js';
import DepartmentFormModal from '../components/DepartmentFormModal.jsx';

const DEPARTMENTS_REPORT_ID = 'departments-report';

export default function DepartmentsPage() {
  const { t, can, confirm, pushToast } = useInventoryApp();
  const vm = useDepartmentsViewModel();
  const [formModal, setFormModal] = useState(null);
  const [employees, setEmployees] = useState([]);
  const canManage = can('manage_departments');

  useEffect(() => {
    let cancelled = false;
    inventoryApi.getActiveEmployees()
      .then((items) => {
        if (!cancelled) setEmployees(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (!cancelled) setEmployees([]);
      });
    return () => { cancelled = true; };
  }, []);

  async function handleSave(data) {
    try {
      if (data.id) {
        await inventoryApi.updateDepartment(data);
      } else {
        await inventoryApi.createDepartment(data);
      }
      setFormModal(null);
      vm.reload();
      pushToast('success', t('departments.title'), data.id ? t('alerts.updated') : t('alerts.created'));
      return { ok: true };
    } catch (error) {
      return { error: error?.message || t('alerts.requestFailed') };
    }
  }

  async function handleDelete(department) {
    const { confirmed, reason } = await confirm({
      title: t('departments.deleteTitle'),
      description: t('departments.deleteConfirm', { name: department.name }),
      confirmLabel: t('common.delete'),
      tone: 'rose',
      requireReason: true,
      reasonLabel: t('common.deleteReasonLabel'),
      reasonPlaceholder: t('common.deleteReasonPlaceholder'),
    });
    if (!confirmed) return;

    try {
      await inventoryApi.deleteDepartment(department.id, reason);
      pushToast('success', t('common.delete'), `${department.name} ${t('alerts.deleted')}`);
      vm.reload();
    } catch (error) {
      pushToast('error', t('alerts.deleteFailed'), error?.message || t('alerts.requestFailed'));
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow={t('departments.eyebrow')}
        title={t('departments.title')}
        description={t('departments.description')}
        action={canManage ? (
          <button type="button" className="btn-primary" onClick={() => setFormModal({ mode: 'add' })}>
            <Plus size={18} />
            {t('departments.add')}
          </button>
        ) : null}
      />

      <div id={DEPARTMENTS_REPORT_ID} className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t('departments.eyebrow')}</p>
            <div className="flex flex-1 flex-wrap gap-2 sm:justify-end">
              <TableReportActions targetId={DEPARTMENTS_REPORT_ID} title={t('departments.title')} fileName="departments" entityType="departments" t={t} />
              <input className="input w-full sm:w-56" placeholder={t('common.search')} value={vm.search} onChange={(e) => vm.setSearch(e.target.value)} />
              <Select className="input w-full sm:w-40" value={vm.status} onChange={(e) => vm.setStatus(e.target.value)}>
                <option value="">{t('departments.allStatuses')}</option>
                <option value="ACTIVE">{t('departments.active')}</option>
                <option value="INACTIVE">{t('departments.inactive')}</option>
              </Select>
            </div>
          </div>
        </div>

        {vm.loading ? (
          <div className="p-5"><TableSkeleton columns={6} /></div>
        ) : vm.error ? (
          <div className="p-5"><Alert type="error">{vm.error}</Alert></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">{t('departments.name')}</th>
                  <th className="px-4 py-3">{t('departments.code')}</th>
                  <th className="px-4 py-3">{t('departments.head')}</th>
                  <th className="px-4 py-3">{t('departments.employees')}</th>
                  <th className="px-4 py-3">{t('departments.status')}</th>
                  {canManage ? <th className="px-4 py-3 text-right no-print">{t('common.actions')}</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vm.items.map((department, index) => (
                  <tr key={department.id} className="hover:bg-slate-50">
                    <td className="table-cell font-semibold text-slate-400">{(vm.page - 1) * vm.pageSize + index + 1}</td>
                    <td className="table-cell font-semibold text-slate-950">{department.name}</td>
                    <td className="table-cell font-mono text-xs text-slate-500">{department.code || '-'}</td>
                    <td className="table-cell">{department.headEmployeeName || '-'}</td>
                    <td className="table-cell">{department.employeeCount}</td>
                    <td className="table-cell">
                      <span className={`muted-chip ${department.status === 'ACTIVE' ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {department.status === 'ACTIVE' ? t('departments.active') : t('departments.inactive')}
                      </span>
                    </td>
                    {canManage ? (
                      <td className="table-cell no-print">
                        <div className="row-actions flex justify-end gap-2">
                          <button type="button" className="icon-btn" onClick={() => setFormModal({ mode: 'edit', department })} title={t('common.edit')}>
                            <Pencil size={16} />
                          </button>
                          <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" onClick={() => handleDelete(department)} title={t('common.delete')}>
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
        )}

        {!vm.loading && !vm.error && !vm.items.length ? (
          <div className="p-5">
            <EmptyState title={t('departments.noDepartments')} description={t('departments.noDepartmentsDesc')} icon={Building2} />
          </div>
        ) : null}

        {!vm.loading && !vm.error && vm.items.length > 0 ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {formModal ? (
        <DepartmentFormModal
          department={formModal.department}
          employees={employees}
          onClose={() => setFormModal(null)}
          onSave={handleSave}
        />
      ) : null}
    </div>
  );
}
