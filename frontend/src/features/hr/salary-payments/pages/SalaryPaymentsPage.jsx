import { useState } from 'react';
import { Banknote, ChevronDown, ChevronRight } from 'lucide-react';
import { Alert, SectionHeader, TableSkeleton } from '../../../../components/ui.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { formatCurrency } from '../../../../utils/calculations.js';
import { useSalaryPaymentsViewModel } from '../viewmodels/useSalaryPaymentsViewModel.js';
import RecordPaymentModal from '../components/RecordPaymentModal.jsx';

function monthLabel(month) {
  if (!month) return '';
  const [y, m] = month.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}

function prevMonth(month) {
  const d = new Date(`${month}-01`);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}

function nextMonth(month) {
  const d = new Date(`${month}-01`);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 7);
}

export default function SalaryPaymentsPage() {
  const { t, can, language } = useInventoryApp();
  const vm = useSalaryPaymentsViewModel();
  const [payModal, setPayModal] = useState(null);
  const [expanded, setExpanded] = useState({});

  const canManage = can('manage_payroll');
  const employees = vm.data?.employees || [];

  function toggleExpand(id) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div>
      <SectionHeader
        eyebrow={t('salary.eyebrow')}
        title={t('salary.title')}
        description={t('salary.description')}
      />

      <div className="surface overflow-hidden">
        {/* Month navigator */}
        <div className="border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <button type="button" className="btn-secondary py-1.5 px-3 text-xs" onClick={() => vm.setMonth(prevMonth(vm.month))}>‹</button>
            <span className="font-semibold text-slate-800 min-w-[140px] text-center">{monthLabel(vm.month)}</span>
            <button type="button" className="btn-secondary py-1.5 px-3 text-xs" onClick={() => vm.setMonth(nextMonth(vm.month))}>›</button>
            <input
              type="month"
              className="input w-auto py-1.5 text-xs ml-2"
              value={vm.month}
              onChange={(e) => vm.setMonth(e.target.value)}
            />
          </div>

          {vm.data && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{t('salary.totalEmployees')}</p>
                <p className="text-xl font-bold text-slate-800">{employees.length}</p>
              </div>
              <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-indigo-400">{t('salary.monthlyBudget')}</p>
                <p className="text-xl font-bold text-indigo-700">{formatCurrency(vm.data.totalBudget, language)}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-emerald-400">{t('salary.totalPaidOut')}</p>
                <p className="text-xl font-bold text-emerald-700">{formatCurrency(vm.data.totalPaid, language)}</p>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-amber-400">{t('salary.totalRemaining')}</p>
                <p className="text-xl font-bold text-amber-700">{formatCurrency(Math.max(0, vm.data.totalBudget - vm.data.totalPaid), language)}</p>
              </div>
            </div>
          )}
        </div>

        {vm.loading ? (
          <div className="p-5"><TableSkeleton columns={5} /></div>
        ) : vm.error ? (
          <div className="p-5"><Alert type="error">{vm.error}</Alert></div>
        ) : employees.length === 0 ? (
          <div className="p-10 text-center">
            <Banknote size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-500">{t('salary.noEmployees')}</p>
            <p className="text-sm text-slate-400 mt-1">{t('salary.noEmployeesHint')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {employees.map((emp) => {
              const isExpanded = expanded[emp.employeeId];
              const remaining = emp.remaining;
              const overpaid = remaining !== null && remaining < 0;
              const paid = emp.totalPaid;

              return (
                <div key={emp.employeeId}>
                  {/* Employee row */}
                  <div className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50">
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-700"
                      onClick={() => toggleExpand(emp.employeeId)}
                      aria-label="expand"
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm">{emp.employeeName}</p>
                      {emp.department && <p className="text-xs text-slate-400">{emp.department}</p>}
                    </div>

                    <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
                      {t(`salary.payType.${emp.payType}`)}
                    </div>

                    <div className="text-right min-w-[90px]">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">{t('salary.salary')}</p>
                      <p className="text-sm font-semibold text-slate-700">{formatCurrency(emp.salaryAmount, language)}</p>
                    </div>

                    <div className="text-right min-w-[90px]">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">{t('salary.paid')}</p>
                      <p className="text-sm font-semibold text-emerald-700">{formatCurrency(paid, language)}</p>
                    </div>

                    {remaining !== null ? (
                      <div className="text-right min-w-[90px]">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">{t('salary.balance')}</p>
                        <p className={`text-sm font-bold ${overpaid ? 'text-amber-600' : 'text-indigo-700'}`}>
                          {overpaid ? '-' : ''}{formatCurrency(Math.abs(remaining), language)}
                        </p>
                      </div>
                    ) : (
                      <div className="min-w-[90px]" />
                    )}

                    {canManage && (
                      <button
                        type="button"
                        className="btn-primary py-1.5 text-xs shrink-0"
                        onClick={() => setPayModal(emp)}
                      >
                        {t('salary.pay')}
                      </button>
                    )}
                  </div>

                  {/* Payment history (expandable) */}
                  {isExpanded && (
                    <div className="bg-slate-50 border-t border-slate-100 px-8 pb-3">
                      {emp.payments.length === 0 ? (
                        <p className="py-3 text-xs text-slate-400">{t('salary.noPaymentsThisMonth')}</p>
                      ) : (
                        <table className="w-full text-xs mt-2">
                          <thead>
                            <tr className="text-left text-[10px] font-black uppercase tracking-wide text-slate-400">
                              <th className="pb-1 pr-4">{t('salary.date')}</th>
                              <th className="pb-1 pr-4">{t('salary.amount')}</th>
                              <th className="pb-1 pr-4">{t('salary.paymentMethod')}</th>
                              <th className="pb-1 pr-4">{t('salary.note')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {emp.payments.map((p) => (
                              <tr key={p.id} className="hover:bg-white">
                                <td className="py-1.5 pr-4 text-slate-600">{String(p.paymentDate || '').slice(0, 10)}</td>
                                <td className="py-1.5 pr-4 font-semibold text-emerald-700">{formatCurrency(p.amount, language)}</td>
                                <td className="py-1.5 pr-4 text-slate-500">{t(`common.${p.paymentMethod.toLowerCase()}`)}</td>
                                <td className="py-1.5 pr-4 text-slate-400">{p.note || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {payModal && (
        <RecordPaymentModal
          employee={payModal}
          onClose={() => setPayModal(null)}
          onSaved={() => { setPayModal(null); vm.reload(); }}
        />
      )}
    </div>
  );
}
