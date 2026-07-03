import { useState, useRef } from 'react';
import { Banknote, ChevronDown, ChevronRight, Trash2, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { Alert, SectionHeader, TableSkeleton } from '../../../../components/ui.jsx';
import TableReportActions from '../../../../components/TableReportActions.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { formatCurrency, formatDate } from '../../../../utils/calculations.js';
import { inventoryApi } from '../../../../services/inventoryApi.js';
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

const SALARY_PAYMENTS_REPORT_ID = 'salary-payments-report';

function PaymentStatusBadge({ emp, t }) {
  const earned = emp.earnedAmount;
  const paid = emp.totalPaid;
  if (earned === null) return null;
  if (paid >= earned && earned > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
        <CheckCircle2 size={10} /> {t('salary.paidBadge')}
      </span>
    );
  }
  if (paid > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
        <Clock size={10} /> {t('salary.partialBadge')}
      </span>
    );
  }
  return null;
}

function ActiveDaysInput({ emp, month, onSaved, canManage, t }) {
  const [value, setValue] = useState(emp.activeDays !== null ? String(emp.activeDays) : '');
  const [saving, setSaving] = useState(false);
  const prevValue = useRef(value);

  async function save() {
    const num = value === '' ? null : Number(value);
    if (num !== null && (isNaN(num) || num < 0)) return;
    if (String(num ?? '') === String(emp.activeDays ?? '')) return;
    if (num !== null && num > emp.daysInMonth) return;
    setSaving(true);
    try {
      await inventoryApi.setSalaryActiveDays(emp.employeeId, month, num ?? 0);
      prevValue.current = value;
      onSaved();
    } catch {
      setValue(prevValue.current);
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') { e.target.blur(); }
    if (e.key === 'Escape') { setValue(prevValue.current); e.target.blur(); }
  }

  if (!canManage) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
        <Calendar size={12} className="text-slate-400" />
        {emp.activeDays !== null ? `${emp.activeDays} / ${emp.daysInMonth}` : `— / ${emp.daysInMonth}`}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <Calendar size={12} className="text-slate-400" />
      <input
        type="number"
        min="0"
        max={emp.daysInMonth}
        step="1"
        className={`h-7 w-12 rounded-lg border px-2 text-center text-sm font-semibold outline-none transition-colors focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300 ${saving ? 'opacity-50' : 'border-slate-300 bg-white'}`}
        value={value}
        placeholder="—"
        disabled={saving}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        title={t('salary.activeDaysColumn')}
      />
      <span className="text-xs text-slate-400">/ {emp.daysInMonth}</span>
    </span>
  );
}

export default function SalaryPaymentsPage() {
  const { t, can, language, confirm, pushToast } = useInventoryApp();
  const vm = useSalaryPaymentsViewModel();
  const [payModal, setPayModal] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [deletingId, setDeletingId] = useState(null);

  const canManage = can('manage_payroll');
  const employees = vm.data?.employees || [];

  function toggleExpand(id) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleDeletePayment(payment) {
    const { confirmed } = await confirm({
      title: t('salary.deleteTitle'),
      description: t('salary.deleteDescription', { amount: formatCurrency(payment.amount, language) }),
      confirmLabel: t('common.delete'),
      variant: 'danger',
    });
    if (!confirmed) return;
    setDeletingId(payment.id);
    try {
      await inventoryApi.deleteSalaryPayment(payment.id);
      pushToast('success', t('salary.deletedToast'), t('salary.deletedToastDescription'));
      vm.reload();
    } catch (err) {
      pushToast('error', t('salary.deleteFailedToast'), err?.message || t('salary.deleteFailedToastDescription'));
    } finally {
      setDeletingId(null);
    }
  }

  const totalEarned = vm.data?.totalBudget ?? 0;
  const totalPaid = vm.data?.totalPaid ?? 0;
  const paidPercent = totalEarned > 0 ? Math.min(100, Math.round((totalPaid / totalEarned) * 100)) : 0;

  return (
    <div>
      <SectionHeader
        eyebrow={t('salary.eyebrow')}
        title={t('salary.title')}
        description={t('salary.description')}
      />

      {/* Month navigator */}
      <div className="surface mb-5 flex flex-wrap items-center gap-3 px-5 py-4">
        <button type="button" className="icon-btn" onClick={() => vm.setMonth(prevMonth(vm.month))} aria-label={t('salary.previousMonthAria')}>
          <ChevronRight size={18} className="rotate-180" />
        </button>
        <span className="min-w-[160px] text-center text-base font-semibold text-slate-900">{monthLabel(vm.month)}</span>
        <button type="button" className="icon-btn" onClick={() => vm.setMonth(nextMonth(vm.month))} aria-label={t('salary.nextMonthAria')}>
          <ChevronRight size={18} />
        </button>
        <input
          type="month"
          className="input ml-2 w-auto py-1.5 text-sm"
          value={vm.month}
          onChange={(e) => vm.setMonth(e.target.value)}
        />
        {vm.data && (
          <span className="ml-auto text-xs text-slate-400">
            {t('salary.daysInMonthLabel', { count: vm.data.daysInMonth })}
          </span>
        )}
      </div>

      {/* Summary cards */}
      {vm.data && (
        <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="surface px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('salary.totalEmployees')}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{employees.length}</p>
          </div>
          <div className="surface px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t('salary.totalEarned')}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{formatCurrency(totalEarned, language)}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">{t('salary.totalEarnedHelper')}</p>
          </div>
          <div className="surface px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-500">{t('salary.totalPaidOut')}</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-700">{formatCurrency(totalPaid, language)}</p>
            {totalEarned > 0 && (
              <div className="mt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${paidPercent}%` }} />
                </div>
                <p className="mt-0.5 text-[10px] text-slate-400">{paidPercent}% paid</p>
              </div>
            )}
          </div>
          <div className="surface px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-500">{t('salary.totalRemaining')}</p>
            <p className="mt-1 text-2xl font-semibold text-amber-700">
              {formatCurrency(Math.max(0, totalEarned - totalPaid), language)}
            </p>
          </div>
        </div>
      )}

      {/* Employee list */}
      <div id={SALARY_PAYMENTS_REPORT_ID} className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 no-print">
          <span className="text-sm font-bold text-slate-700">{t('salary.title')}</span>
          <TableReportActions targetId={SALARY_PAYMENTS_REPORT_ID} title={t('salary.title')} fileName={`salary-payments-${vm.month}`} entityType="salary_payments" t={t} />
        </div>
        {vm.loading ? (
          <div className="p-5"><TableSkeleton columns={5} /></div>
        ) : vm.error ? (
          <div className="p-5"><Alert type="error">{vm.error}</Alert></div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Banknote size={44} className="mb-4 text-slate-200" />
            <p className="font-semibold text-slate-500">{t('salary.noEmployees')}</p>
            <p className="mt-1 text-sm text-slate-400">{t('salary.noEmployeesHint')}</p>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="hidden grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-4 border-b border-slate-100 px-5 py-2.5 sm:grid">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('employees.name')}</p>
              <p className="w-32 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 text-center">{t('salary.activeDaysColumn')}</p>
              <p className="w-28 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 text-right">{t('salary.earnedColumn')}</p>
              <p className="w-24 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 text-right">{t('salary.paid')}</p>
              <p className="w-24 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 text-right">{t('salary.balance')}</p>
              <p className="w-20" />
            </div>

            <div className="divide-y divide-slate-100">
              {employees.map((emp) => {
                const isExpanded = expanded[emp.employeeId];
                const earned = emp.earnedAmount;
                const remaining = emp.remaining;
                const fullyPaid = remaining !== null && remaining <= 0 && earned > 0;
                const overpaid = remaining !== null && remaining < 0;

                return (
                  <div key={emp.employeeId}>
                    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50">
                      {/* Expand icon — only this triggers expand */}
                      <button
                        type="button"
                        className="icon-btn shrink-0 text-slate-400 hover:text-slate-700"
                        onClick={() => toggleExpand(emp.employeeId)}
                        aria-label={t('salary.togglePaymentHistoryAria')}
                      >
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>

                      {/* Name + badges */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900">{emp.employeeName}</span>
                          <PaymentStatusBadge emp={emp} t={t} />
                          <span className="muted-chip hidden sm:inline-flex">{t(`salary.payType.${emp.payType}`)}</span>
                        </div>
                        {emp.department && <div className="mt-0.5 text-xs text-slate-400">{emp.department}</div>}
                      </div>

                      {/* Active days input */}
                      <div className="hidden w-32 justify-center sm:flex">
                        <ActiveDaysInput
                          emp={emp}
                          month={vm.month}
                          onSaved={vm.reload}
                          canManage={canManage}
                          t={t}
                        />
                      </div>

                      {/* Earned */}
                      <div className="hidden w-28 text-right sm:block">
                        {earned !== null ? (
                          <>
                            <span className="block text-sm font-semibold text-slate-800">{formatCurrency(earned, language)}</span>
                            {emp.activeDays !== null && emp.payType === 'MONTHLY' && (
                              <span className="block text-[10px] text-slate-400">
                                {t('salary.ofSalaryAmount', { amount: formatCurrency(emp.salaryAmount, language) })}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">{t('salary.setDaysArrow')}</span>
                        )}
                      </div>

                      {/* Paid */}
                      <div className="hidden w-24 text-right sm:block">
                        <span className={`block text-sm font-semibold ${emp.totalPaid > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {formatCurrency(emp.totalPaid, language)}
                        </span>
                      </div>

                      {/* Balance */}
                      {remaining !== null ? (
                        <div className="hidden w-24 text-right sm:block">
                          <span className={`block text-sm font-bold ${overpaid ? 'text-rose-600' : fullyPaid ? 'text-emerald-600' : 'text-slate-700'}`}>
                            {overpaid ? '−' : ''}{formatCurrency(Math.abs(remaining), language)}
                          </span>
                        </div>
                      ) : (
                        <div className="hidden w-24 sm:block" />
                      )}

                      {/* Pay button */}
                      {canManage && (
                        <div className="w-20 shrink-0 text-right">
                          <button
                            type="button"
                            className={`btn-primary py-1.5 text-xs ${fullyPaid ? 'opacity-50' : ''}`}
                            onClick={() => setPayModal(emp)}
                            disabled={fullyPaid}
                            title={fullyPaid ? t('salary.fullyPaidTooltip') : undefined}
                          >
                            {fullyPaid ? t('salary.paidBadge') : t('salary.pay')}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Payment history */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/70 px-5 pb-4 pt-3">
                        {/* Mobile active days */}
                        <div className="mb-3 flex items-center gap-2 sm:hidden">
                          <span className="text-xs font-semibold text-slate-500">{t('salary.activeDaysMobileLabel')}</span>
                          <ActiveDaysInput emp={emp} month={vm.month} onSaved={vm.reload} canManage={canManage} t={t} />
                        </div>

                        {/* Salary breakdown for this employee */}
                        {earned !== null && emp.activeDays !== null && (
                          <div className="mb-3 flex flex-wrap gap-3 text-xs text-slate-500">
                            <span>
                              {emp.payType === 'MONTHLY'
                                ? `${formatCurrency(emp.salaryAmount, language)} ÷ ${emp.daysInMonth} days × ${emp.activeDays} active days`
                                : `${formatCurrency(emp.salaryAmount, language)}/day × ${emp.activeDays} days`}
                              {' = '}
                              <strong className="text-slate-800">{formatCurrency(earned, language)}</strong>
                            </span>
                          </div>
                        )}

                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('salary.paymentHistoryTitle')}</p>
                        {emp.payments.length === 0 ? (
                          <p className="py-2 text-xs italic text-slate-400">{t('salary.noPaymentsThisMonth')}</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left">
                                  <th className="pb-2 pr-4 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('salary.date')}</th>
                                  <th className="pb-2 pr-4 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('salary.amount')}</th>
                                  <th className="pb-2 pr-4 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('salary.paymentMethod')}</th>
                                  <th className="pb-2 pr-4 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('salary.note')}</th>
                                  {canManage && <th className="pb-2 w-8" />}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {emp.payments.map((p) => (
                                  <tr key={p.id} className="group">
                                    <td className="py-2 pr-4 text-slate-600">{formatDate(p.paymentDate, language)}</td>
                                    <td className="py-2 pr-4 text-right font-semibold text-emerald-700">{formatCurrency(p.amount, language)}</td>
                                    <td className="py-2 pr-4">
                                      <span className="muted-chip">{p.paymentMethod === 'BANK' ? t('common.bank') : t('common.cash')}</span>
                                    </td>
                                    <td className="py-2 pr-4 text-xs text-slate-400">{p.note || '—'}</td>
                                    {canManage && (
                                      <td className="py-2">
                                        <button
                                          type="button"
                                          className="icon-btn text-rose-500 opacity-0 transition-opacity group-hover:opacity-100"
                                          disabled={deletingId === p.id}
                                          onClick={() => handleDeletePayment(p)}
                                          title={t('salary.deletePayment')}
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
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
