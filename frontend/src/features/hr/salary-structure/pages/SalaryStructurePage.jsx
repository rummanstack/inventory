import { useEffect, useState } from 'react';
import { Pencil, Banknote } from 'lucide-react';
import { Alert, EmptyState, SectionHeader, TableSkeleton } from '../../../../components/ui.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { formatCurrency } from '../../../../utils/calculations.js';
import { useSalaryStructureViewModel } from '../viewmodels/useSalaryStructureViewModel.js';
import SalaryStructureModal from '../components/SalaryStructureModal.jsx';

export default function SalaryStructurePage() {
  const { t, can, language } = useInventoryApp();
  const vm = useSalaryStructureViewModel();
  const [employees, setEmployees] = useState([]);
  const [modal, setModal] = useState(null);
  const canManage = can('manage_employees');

  useEffect(() => {
    inventoryApi.getActiveEmployees().then((data) => setEmployees(data || []));
  }, []);

  const structureMap = Object.fromEntries(vm.items.map((s) => [s.employeeId, s]));

  async function openModal(emp) {
    let structure = structureMap[emp.id] || null;
    if (!structure) {
      try { structure = await inventoryApi.getSalaryStructure(emp.id); } catch { structure = null; }
    }
    setModal({ employee: emp, structure });
  }

  return (
    <div>
      <SectionHeader
        eyebrow={t('salaryStructure.eyebrow')}
        title={t('salaryStructure.title')}
        description={t('salaryStructure.description')}
      />

      <div className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{t('salaryStructure.eyebrow')}</p>
        </div>

        {vm.loading ? (
          <div className="p-5"><TableSkeleton columns={5} /></div>
        ) : vm.error ? (
          <div className="p-5"><Alert type="error">{vm.error}</Alert></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">{t('employees.name')}</th>
                  <th className="px-4 py-3">{t('salaryStructure.payType')}</th>
                  <th className="px-4 py-3 text-right">{t('salaryStructure.basicPay')}</th>
                  <th className="px-4 py-3">{t('salaryStructure.effectiveFrom')}</th>
                  {canManage ? <th className="px-4 py-3 text-right">{t('common.actions')}</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp, idx) => {
                  const ss = structureMap[emp.id];
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50">
                      <td className="table-cell font-black text-slate-400">{idx + 1}</td>
                      <td className="table-cell">
                        <div className="font-semibold text-slate-950">{emp.name}</div>
                        {emp.designation ? <div className="text-xs text-slate-400">{emp.designation}</div> : null}
                      </td>
                      <td className="table-cell">
                        {ss ? (
                          <span className="muted-chip">{ss.payType === 'MONTHLY' ? t('salaryStructure.monthly') : t('salaryStructure.daily')}</span>
                        ) : <span className="text-xs text-slate-400">{t('salaryStructure.notSet')}</span>}
                      </td>
                      <td className="table-cell text-right font-semibold">
                        {ss ? formatCurrency(ss.basicPay, language) : '—'}
                      </td>
                      <td className="table-cell text-sm text-slate-500">{ss?.effectiveFrom || '—'}</td>
                      {canManage ? (
                        <td className="table-cell">
                          <div className="flex justify-end">
                            <button type="button" className="icon-btn" onClick={() => openModal(emp)}>
                              <Pencil size={16} />
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!vm.loading && !vm.error && !employees.length ? (
          <div className="p-5">
            <EmptyState title={t('salaryStructure.noEmployees')} description={t('salaryStructure.noEmployeesDesc')} icon={Banknote} />
          </div>
        ) : null}
      </div>

      {modal ? (
        <SalaryStructureModal
          employee={modal.employee}
          structure={modal.structure}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); vm.reload(); }}
        />
      ) : null}
    </div>
  );
}
