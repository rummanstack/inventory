import { useEffect, useState } from 'react';
import { Pencil, Plus, Banknote } from 'lucide-react';
import { Alert, EmptyState, SectionHeader, TableSkeleton } from '../../../../components/ui.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { formatCurrency } from '../../../../utils/calculations.js';
import { useSalaryStructureViewModel } from '../viewmodels/useSalaryStructureViewModel.js';
import SalaryStructureModal from '../components/SalaryStructureModal.jsx';

function netPay(ss) {
  if (!ss) return null;
  const allowanceTotal = (ss.allowances || []).reduce((s, a) => s + Number(a.amount || 0), 0);
  const deductionTotal = (ss.deductions || []).reduce((s, d) => s + Number(d.amount || 0), 0);
  return Number(ss.basicPay || 0) + allowanceTotal - deductionTotal;
}

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

  const configuredCount = employees.filter((e) => structureMap[e.id]).length;

  return (
    <div>
      <SectionHeader
        eyebrow={t('salaryStructure.eyebrow')}
        title={t('salaryStructure.title')}
        description={t('salaryStructure.description')}
      />

      {/* Summary strip */}
      {!vm.loading && employees.length > 0 && (
        <div className="mb-5 grid grid-cols-3 gap-4">
          <div className="surface px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Total Employees</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{employees.length}</p>
          </div>
          <div className="surface px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-500">Configured</p>
            <p className="mt-1 text-2xl font-black text-emerald-700">{configuredCount}</p>
          </div>
          <div className="surface px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-500">Not Set</p>
            <p className="mt-1 text-2xl font-black text-amber-700">{employees.length - configuredCount}</p>
          </div>
        </div>
      )}

      <div className="surface overflow-hidden">
        {vm.loading ? (
          <div className="p-5"><TableSkeleton columns={6} /></div>
        ) : vm.error ? (
          <div className="p-5"><Alert type="error">{vm.error}</Alert></div>
        ) : employees.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title={t('salaryStructure.noEmployees')}
              description={t('salaryStructure.noEmployeesDesc')}
              icon={Banknote}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">{t('employees.name')}</th>
                  <th className="px-4 py-3">{t('salaryStructure.payType')}</th>
                  <th className="px-4 py-3 text-right">{t('salaryStructure.basicPay')}</th>
                  <th className="px-4 py-3 text-right">Allowances / Deductions</th>
                  <th className="px-4 py-3 text-right">Net Pay</th>
                  <th className="px-4 py-3 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp, idx) => {
                  const ss = structureMap[emp.id];
                  const net = netPay(ss);
                  const allowanceTotal = ss ? (ss.allowances || []).reduce((s, a) => s + Number(a.amount || 0), 0) : 0;
                  const deductionTotal = ss ? (ss.deductions || []).reduce((s, d) => s + Number(d.amount || 0), 0) : 0;

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50">
                      <td className="table-cell font-black text-slate-400 text-sm">{idx + 1}</td>
                      <td className="table-cell">
                        <div className="font-semibold text-slate-950">{emp.name}</div>
                        {emp.designation && <div className="text-xs text-slate-400">{emp.designation}</div>}
                      </td>
                      <td className="table-cell">
                        {ss ? (
                          <span className={`muted-chip ${ss.payType === 'MONTHLY' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                            {ss.payType === 'MONTHLY' ? t('salaryStructure.monthly') : t('salaryStructure.daily')}
                          </span>
                        ) : (
                          <span className="text-xs italic text-slate-400">{t('salaryStructure.notSet')}</span>
                        )}
                      </td>
                      <td className="table-cell text-right font-semibold text-slate-800">
                        {ss ? formatCurrency(ss.basicPay, language) : '—'}
                      </td>
                      <td className="table-cell text-right">
                        {ss ? (
                          <div className="flex items-center justify-end gap-2">
                            {allowanceTotal > 0 && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                +{formatCurrency(allowanceTotal, language)}
                              </span>
                            )}
                            {deductionTotal > 0 && (
                              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                                −{formatCurrency(deductionTotal, language)}
                              </span>
                            )}
                            {!allowanceTotal && !deductionTotal && (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="table-cell text-right">
                        {net !== null ? (
                          <span className="font-black text-slate-950">{formatCurrency(net, language)}</span>
                        ) : '—'}
                      </td>
                      <td className="table-cell">
                        <div className="flex justify-end">
                          {canManage && (
                            ss ? (
                              <button type="button" className="icon-btn" title="Edit structure" onClick={() => openModal(emp)}>
                                <Pencil size={15} />
                              </button>
                            ) : (
                              <button type="button" className="btn-secondary h-7 gap-1 px-2.5 text-xs" onClick={() => openModal(emp)}>
                                <Plus size={12} /> Set
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
