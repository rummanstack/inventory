import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Alert, EmptyState, Pagination, SectionHeader, TableSkeleton, Select } from '../../../../components/ui.jsx';
import TableReportActions from '../../../../components/TableReportActions.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { formatDate } from '../../../../utils/calculations.js';
import { useEmployeesViewModel } from '../viewmodels/useEmployeesViewModel.js';
import EmployeeFormModal from '../components/EmployeeFormModal.jsx';

const EMPLOYEES_REPORT_ID = 'employees-report';

export default function EmployeesPage() {
  const { t, can, language, confirm, pushToast } = useInventoryApp();
  const vm = useEmployeesViewModel();
  const [formModal, setFormModal] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const canManage = can('manage_employees');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      inventoryApi.getActiveDepartments().catch(() => ({ items: [] })),
      inventoryApi.getActiveDesignations().catch(() => ({ items: [] })),
    ]).then(([departmentResult, designationResult]) => {
      if (cancelled) return;
      setDepartments(Array.isArray(departmentResult.items) ? departmentResult.items : []);
      setDesignations(Array.isArray(designationResult.items) ? designationResult.items : []);
    });
    return () => { cancelled = true; };
  }, []);

  async function handleDelete(emp) {
    const { confirmed, reason } = await confirm({
      title: t('employees.deleteTitle'),
      description: `${t('employees.deleteConfirm')} "${emp.name}"?`,
      confirmLabel: t('common.delete'),
      tone: 'rose',
      requireReason: true,
      reasonLabel: t('common.deleteReasonLabel'),
      reasonPlaceholder: t('common.deleteReasonPlaceholder'),
    });
    if (!confirmed) return;
    try {
      await inventoryApi.deleteEmployee(emp.id, reason);
      pushToast('success', t('employees.title'), t('alerts.deleted'));
      vm.reload();
    } catch (err) {
      pushToast('error', t('alerts.deleteFailed'), err?.message || t('alerts.requestFailed'));
    }
  }

  async function handleSave(data) {
    try {
      if (data.id) {
        await inventoryApi.updateEmployee(data);
      } else {
        await inventoryApi.createEmployee(data);
      }
      setFormModal(null);
      vm.reload();
      pushToast('success', t('employees.title'), data.id ? t('alerts.updated') : t('alerts.created'));
    } catch (err) {
      return { error: err.message };
    }
    return { ok: true };
  }

  return (
    <div>
      <SectionHeader
        eyebrow={t('employees.eyebrow')}
        title={t('employees.title')}
        description={t('employees.description')}
        action={canManage ? (
          <button type="button" className="btn-primary" onClick={() => setFormModal({ mode: 'add' })}>
            <Plus size={18} />
            {t('employees.add')}
          </button>
        ) : null}
      />

      <div id={EMPLOYEES_REPORT_ID} className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t('employees.eyebrow')}</p>
            <div className="flex flex-1 flex-wrap gap-2 xl:justify-end">
              <TableReportActions targetId={EMPLOYEES_REPORT_ID} title={t('employees.title')} fileName="employees" entityType="employees" t={t} />
              <input className="input w-full sm:w-56" placeholder={t('common.search')} value={vm.search} onChange={(e) => vm.setSearch(e.target.value)} />
              <Select className="input w-full sm:w-40" value={vm.status} onChange={(e) => vm.setStatus(e.target.value)}>
                <option value="">{t('employees.allStatuses')}</option>
                <option value="ACTIVE">{t('employees.active')}</option>
                <option value="INACTIVE">{t('employees.inactive')}</option>
              </Select>
              <Select className="input w-full sm:w-48" value={vm.departmentId} onChange={(e) => vm.setDepartmentId(e.target.value)}>
                <option value="">{t('employees.allDepartments')}</option>
                {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </Select>
              <Select className="input w-full sm:w-48" value={vm.designationId} onChange={(e) => vm.setDesignationId(e.target.value)}>
                <option value="">{t('employees.allDesignations')}</option>
                {designations.map((designation) => <option key={designation.id} value={designation.id}>{designation.name}</option>)}
              </Select>
            </div>
          </div>
        </div>

        {vm.loading ? (
          <div className="p-5"><TableSkeleton columns={8} /></div>
        ) : vm.error ? (
          <div className="p-5"><Alert type="error">{vm.error}</Alert></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">{t('employees.number')}</th>
                  <th className="px-4 py-3">{t('employees.name')}</th>
                  <th className="px-4 py-3">{t('employees.department')}</th>
                  <th className="px-4 py-3">{t('employees.designation')}</th>
                  <th className="px-4 py-3">{t('employees.phone')}</th>
                  <th className="px-4 py-3">{t('employees.joinDate')}</th>
                  <th className="px-4 py-3">{t('employees.status')}</th>
                  {canManage ? <th className="px-4 py-3 text-right no-print">{t('common.actions')}</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vm.items.map((emp, idx) => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="table-cell font-semibold text-slate-400">{(vm.page - 1) * vm.pageSize + idx + 1}</td>
                    <td className="table-cell font-mono text-xs text-slate-500">{emp.employeeNumber}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                          {emp.photoUrl ? <img src={emp.photoUrl} alt="" className="h-full w-full object-cover" /> : emp.name?.slice(0, 1)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-950">{emp.name}</p>
                          <p className="text-xs text-slate-500">{emp.email || emp.nationalId || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">{emp.departmentName || emp.department || '-'}</td>
                    <td className="table-cell">{emp.designationName || emp.designation || '-'}</td>
                    <td className="table-cell">{emp.phone || '-'}</td>
                    <td className="table-cell">{emp.joinDate ? formatDate(emp.joinDate, language) : '-'}</td>
                    <td className="table-cell">
                      <span className={`muted-chip ${emp.status === 'ACTIVE' ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {emp.status === 'ACTIVE' ? t('employees.active') : t('employees.inactive')}
                      </span>
                    </td>
                    {canManage ? (
                      <td className="table-cell no-print">
                        <div className="row-actions flex justify-end gap-2">
                          <button type="button" className="icon-btn" onClick={() => setFormModal({ mode: 'edit', employee: emp })} title={t('common.edit')}>
                            <Pencil size={16} />
                          </button>
                          <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" onClick={() => handleDelete(emp)} title={t('common.delete')}>
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
            <EmptyState title={t('employees.noEmployees')} description={t('employees.noEmployeesDesc')} icon={Users} />
          </div>
        ) : null}

        {!vm.loading && !vm.error && vm.items.length > 0 ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {formModal ? (
        <EmployeeFormModal
          employee={formModal.employee}
          departments={departments}
          designations={designations}
          onClose={() => setFormModal(null)}
          onSave={handleSave}
        />
      ) : null}
    </div>
  );
}
