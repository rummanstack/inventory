import { useState } from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Alert, EmptyState, Pagination, SectionHeader, TableSkeleton, Select } from '../../../../components/ui.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { formatDate } from '../../../../utils/calculations.js';
import { useEmployeesViewModel } from '../viewmodels/useEmployeesViewModel.js';
import EmployeeFormModal from '../components/EmployeeFormModal.jsx';

export default function EmployeesPage() {
  const { t, can, language, confirm } = useInventoryApp();
  const vm = useEmployeesViewModel();
  const [formModal, setFormModal] = useState(null);
  const canManage = can('manage_employees');

  async function handleDelete(emp) {
    const { confirmed } = await confirm({
      title: t('employees.deleteTitle'),
      description: `${t('employees.deleteConfirm')} "${emp.name}"?`,
      confirmLabel: t('common.delete'),
      tone: 'rose',
    });
    if (!confirmed) return;
    try {
      await inventoryApi.deleteEmployee(emp.id, '');
      vm.reload();
    } catch (err) {
      alert(err.message);
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

      <div className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t('employees.eyebrow')}</p>
            <div className="flex flex-1 flex-wrap gap-2 sm:justify-end">
              <input
                className="input w-full sm:w-56"
                placeholder={t('common.search')}
                value={vm.search}
                onChange={(e) => vm.setSearch(e.target.value)}
              />
              <Select className="input w-full sm:w-40" value={vm.status} onChange={(e) => vm.setStatus(e.target.value)}>
                <option value="">{t('employees.allStatuses')}</option>
                <option value="ACTIVE">{t('employees.active')}</option>
                <option value="INACTIVE">{t('employees.inactive')}</option>
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
                  <th className="px-4 py-3">{t('employees.number')}</th>
                  <th className="px-4 py-3">{t('employees.name')}</th>
                  <th className="px-4 py-3">{t('employees.department')}</th>
                  <th className="px-4 py-3">{t('employees.designation')}</th>
                  <th className="px-4 py-3">{t('employees.joinDate')}</th>
                  <th className="px-4 py-3">{t('employees.status')}</th>
                  {canManage ? <th className="px-4 py-3 text-right">{t('common.actions')}</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vm.items.map((emp, idx) => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="table-cell font-semibold text-slate-400">{(vm.page - 1) * vm.pageSize + idx + 1}</td>
                    <td className="table-cell font-mono text-xs text-slate-500">{emp.employeeNumber}</td>
                    <td className="table-cell font-semibold text-slate-950">{emp.name}</td>
                    <td className="table-cell">{emp.department || '—'}</td>
                    <td className="table-cell">{emp.designation || '—'}</td>
                    <td className="table-cell">{emp.joinDate ? formatDate(emp.joinDate, language) : '—'}</td>
                    <td className="table-cell">
                      <span className={`muted-chip ${emp.status === 'ACTIVE' ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {emp.status === 'ACTIVE' ? t('employees.active') : t('employees.inactive')}
                      </span>
                    </td>
                    {canManage ? (
                      <td className="table-cell">
                        <div className="row-actions flex justify-end gap-2">
                          <button type="button" className="icon-btn" onClick={() => setFormModal({ mode: 'edit', employee: emp })}>
                            <Pencil size={16} />
                          </button>
                          <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" onClick={() => handleDelete(emp)}>
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
          onClose={() => setFormModal(null)}
          onSave={handleSave}
        />
      ) : null}
    </div>
  );
}

