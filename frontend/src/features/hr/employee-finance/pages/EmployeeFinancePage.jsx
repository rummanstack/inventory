import { useEffect, useMemo, useState } from 'react';
import { Check, HandCoins, Plus, X } from 'lucide-react';
import { Alert, EmptyState, SectionHeader, Select, TableSkeleton } from '../../../../components/ui.jsx';
import TableReportActions from '../../../../components/TableReportActions.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../../services/inventoryApi.js';

const today = () => new Date().toISOString().slice(0, 10);
const money = (value) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(value || 0));
const EMPLOYEE_FINANCE_REPORT_SHORTCUTS = {
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  csv: { alt: true, key: 'c', label: 'Alt+C' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

export default function EmployeeFinancePage({ mode = 'advances' }) {
  const isLoan = mode === 'loans';
  const { can, pushToast, t } = useInventoryApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState([]);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({ employeeId: '', requestDate: today(), amount: 0, principalAmount: 0, monthlyRecovery: 0, installmentAmount: 0, reason: '' });
  const permission = isLoan ? 'loan.manage' : 'advance.manage';
  const canManage = can(permission);
  const title = isLoan ? t('employeeFinance.loansTitle') : t('employeeFinance.advancesTitle');
  const description = isLoan ? t('employeeFinance.loansDescription') : t('employeeFinance.advancesDescription');
  const reportId = isLoan ? 'employee-loans-report' : 'employee-advances-report';

  const totals = useMemo(() => items.reduce((acc, item) => ({
    requested: acc.requested + (isLoan ? item.principalAmount : item.amount),
    outstanding: acc.outstanding + item.outstandingAmount,
  }), { requested: 0, outstanding: 0 }), [items, isLoan]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [employeeRows, result] = await Promise.all([
        inventoryApi.getActiveEmployees(),
        isLoan ? inventoryApi.listEmployeeLoans({ status }) : inventoryApi.listEmployeeAdvances({ status }),
      ]);
      setEmployees(Array.isArray(employeeRows) ? employeeRows : []);
      setItems(result.items || []);
    } catch (err) {
      setError(err?.message || (isLoan ? t('employeeFinance.loadFailedLoans') : t('employeeFinance.loadFailedAdvances')));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [mode, status]);

  async function submit(event) {
    event.preventDefault();
    try {
      if (isLoan) {
        await inventoryApi.requestEmployeeLoan({
          employeeId: form.employeeId,
          requestDate: form.requestDate,
          principalAmount: form.principalAmount,
          installmentAmount: form.installmentAmount,
          reason: form.reason,
        });
      } else {
        await inventoryApi.requestEmployeeAdvance({
          employeeId: form.employeeId,
          requestDate: form.requestDate,
          amount: form.amount,
          monthlyRecovery: form.monthlyRecovery,
          reason: form.reason,
        });
      }
      setForm({ employeeId: '', requestDate: today(), amount: 0, principalAmount: 0, monthlyRecovery: 0, installmentAmount: 0, reason: '' });
      pushToast('success', title, t('employeeFinance.createdToast'));
      load();
    } catch (err) {
      pushToast('error', title, err?.message || t('alerts.requestFailed'));
    }
  }

  async function decide(id, approved) {
    try {
      if (isLoan) {
        if (approved) await inventoryApi.approveEmployeeLoan(id);
        else await inventoryApi.rejectEmployeeLoan(id);
      } else if (approved) {
        await inventoryApi.approveEmployeeAdvance(id);
      } else {
        await inventoryApi.rejectEmployeeAdvance(id);
      }
      pushToast('success', title, approved ? t('employeeFinance.approvedToast') : t('employeeFinance.rejectedToast'));
      load();
    } catch (err) {
      pushToast('error', title, err?.message || t('alerts.requestFailed'));
    }
  }

  return (
    <div>
      <SectionHeader eyebrow={t('employeeFinance.eyebrowAdvances')} title={title} description={description} />
      {error ? <Alert type="error">{error}</Alert> : null}

      {canManage ? (
        <form className="surface mb-5 p-5" onSubmit={submit}>
          <div className="grid gap-3 md:grid-cols-3">
            <Select className="input" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
              <option value="">{t('employeeFinance.employeeLabel')}</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
            </Select>
            <input className="input" type="date" value={form.requestDate} onChange={(e) => setForm({ ...form, requestDate: e.target.value })} />
            {isLoan ? (
              <>
                <input className="input" type="number" min="0" placeholder={t('employeeFinance.loanAmountLabel')} value={form.principalAmount} onChange={(e) => setForm({ ...form, principalAmount: e.target.value })} />
                <input className="input" type="number" min="0" placeholder={t('employeeFinance.installmentAmountLabel')} value={form.installmentAmount} onChange={(e) => setForm({ ...form, installmentAmount: e.target.value })} />
              </>
            ) : (
              <>
                <input className="input" type="number" min="0" placeholder={t('employeeFinance.advanceAmountLabel')} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                <input className="input" type="number" min="0" placeholder={t('employeeFinance.monthlyRecoveryLabel')} value={form.monthlyRecovery} onChange={(e) => setForm({ ...form, monthlyRecovery: e.target.value })} />
              </>
            )}
            <input className="input md:col-span-2" placeholder={t('employeeFinance.reasonLabel')} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            <button type="submit" className="btn-primary"><Plus size={16} /> {t('employeeFinance.request')}</button>
          </div>
        </form>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="surface p-4"><p className="text-xs font-semibold uppercase text-slate-400">{t('employeeFinance.records')}</p><p className="mt-1 text-2xl font-semibold">{items.length}</p></div>
        <div className="surface p-4"><p className="text-xs font-semibold uppercase text-slate-400">{t('employeeFinance.requested')}</p><p className="mt-1 text-2xl font-semibold">{money(totals.requested)}</p></div>
        <div className="surface p-4"><p className="text-xs font-semibold uppercase text-slate-400">{t('employeeFinance.outstanding')}</p><p className="mt-1 text-2xl font-semibold">{money(totals.outstanding)}</p></div>
      </div>

      <div id={reportId} className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="section-title">{title}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <TableReportActions targetId={reportId} title={title} fileName={reportId} entityType={reportId.replace(/-/g, '_')} t={t} shortcuts={EMPLOYEE_FINANCE_REPORT_SHORTCUTS} />
            <Select className="input w-full sm:w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">{t('employeeFinance.allStatuses')}</option>
              <option value="PENDING">{t('employeeFinance.statusPending')}</option>
              <option value="APPROVED">{t('employeeFinance.statusApproved')}</option>
              <option value="SETTLED">{t('employeeFinance.statusSettled')}</option>
              <option value="REJECTED">{t('employeeFinance.statusRejected')}</option>
            </Select>
          </div>
        </div>
        {loading ? <div className="p-5"><TableSkeleton columns={7} /></div> : items.length === 0 ? (
          <div className="p-5"><EmptyState title={isLoan ? t('employeeFinance.noLoansTitle') : t('employeeFinance.noAdvancesTitle')} description={t('employeeFinance.noRecordsDesc')} icon={HandCoins} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">{t('employeeFinance.columnEmployee')}</th>
                  <th className="px-4 py-3">{t('employeeFinance.columnDate')}</th>
                  <th className="px-4 py-3 text-right">{t('employeeFinance.columnAmount')}</th>
                  <th className="px-4 py-3 text-right">{t('employeeFinance.columnRecovered')}</th>
                  <th className="px-4 py-3 text-right">{t('employeeFinance.columnOutstanding')}</th>
                  <th className="px-4 py-3">{t('employeeFinance.columnStatus')}</th>
                  {canManage ? <th className="px-4 py-3 text-right no-print">{t('common.actions')}</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="table-cell font-semibold">{item.employeeName}</td>
                    <td className="table-cell">{item.requestDate}</td>
                    <td className="table-cell text-right">{money(isLoan ? item.principalAmount : item.amount)}</td>
                    <td className="table-cell text-right">{money(item.recoveredAmount)}</td>
                    <td className="table-cell text-right">{money(item.outstandingAmount)}</td>
                    <td className="table-cell"><span className="muted-chip">{item.status}</span></td>
                    {canManage ? (
                      <td className="table-cell no-print">
                        {item.status === 'PENDING' ? (
                          <div className="flex justify-end gap-2">
                            <button type="button" className="icon-btn text-emerald-600" onClick={() => decide(item.id, true)} title={t('employeeFinance.approve')}><Check size={16} /></button>
                            <button type="button" className="icon-btn text-rose-600" onClick={() => decide(item.id, false)} title={t('employeeFinance.reject')}><X size={16} /></button>
                          </div>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
