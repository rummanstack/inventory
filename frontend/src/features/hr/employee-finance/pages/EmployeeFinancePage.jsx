import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { Alert, EmptyState, SectionHeader, Select, TableSkeleton } from '../../../../components/ui.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../../services/inventoryApi.js';

const today = () => new Date().toISOString().slice(0, 10);
const money = (value) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(value || 0));

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
  const title = isLoan ? 'Employee Loans' : 'Employee Advances';
  const description = isLoan ? 'Approve loans and recover installments through payroll.' : 'Approve salary advances and recover them through payroll.';

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
      setError(err?.message || `Failed to load ${title.toLowerCase()}.`);
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
      pushToast('success', title, t('alerts.created'));
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
      pushToast('success', title, approved ? 'Approved.' : 'Rejected.');
      load();
    } catch (err) {
      pushToast('error', title, err?.message || t('alerts.requestFailed'));
    }
  }

  return (
    <div>
      <SectionHeader eyebrow="HR" title={title} description={description} />
      {error ? <Alert type="error">{error}</Alert> : null}

      {canManage ? (
        <form className="surface mb-5 p-5" onSubmit={submit}>
          <div className="grid gap-3 md:grid-cols-3">
            <Select className="input" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
              <option value="">Employee</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
            </Select>
            <input className="input" type="date" value={form.requestDate} onChange={(e) => setForm({ ...form, requestDate: e.target.value })} />
            {isLoan ? (
              <>
                <input className="input" type="number" min="0" placeholder="Loan amount" value={form.principalAmount} onChange={(e) => setForm({ ...form, principalAmount: e.target.value })} />
                <input className="input" type="number" min="0" placeholder="Installment amount" value={form.installmentAmount} onChange={(e) => setForm({ ...form, installmentAmount: e.target.value })} />
              </>
            ) : (
              <>
                <input className="input" type="number" min="0" placeholder="Advance amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                <input className="input" type="number" min="0" placeholder="Monthly recovery" value={form.monthlyRecovery} onChange={(e) => setForm({ ...form, monthlyRecovery: e.target.value })} />
              </>
            )}
            <input className="input md:col-span-2" placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            <button type="submit" className="btn-primary"><Plus size={16} /> Request</button>
          </div>
        </form>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="surface p-4"><p className="text-xs font-semibold uppercase text-slate-400">Records</p><p className="mt-1 text-2xl font-semibold">{items.length}</p></div>
        <div className="surface p-4"><p className="text-xs font-semibold uppercase text-slate-400">Requested</p><p className="mt-1 text-2xl font-semibold">{money(totals.requested)}</p></div>
        <div className="surface p-4"><p className="text-xs font-semibold uppercase text-slate-400">Outstanding</p><p className="mt-1 text-2xl font-semibold">{money(totals.outstanding)}</p></div>
      </div>

      <div className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="section-title">{title}</h2>
          <Select className="input w-full sm:w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="SETTLED">Settled</option>
            <option value="REJECTED">Rejected</option>
          </Select>
        </div>
        {loading ? <div className="p-5"><TableSkeleton columns={7} /></div> : items.length === 0 ? (
          <div className="p-5"><EmptyState title={`No ${isLoan ? 'loans' : 'advances'}`} description="Requests will appear here." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-head"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Date</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-right">Recovered</th><th className="px-4 py-3 text-right">Outstanding</th><th className="px-4 py-3">Status</th>{canManage ? <th className="px-4 py-3 text-right">Actions</th> : null}</tr></thead>
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
                      <td className="table-cell">
                        {item.status === 'PENDING' ? (
                          <div className="flex justify-end gap-2">
                            <button type="button" className="icon-btn text-emerald-600" onClick={() => decide(item.id, true)} title="Approve"><Check size={16} /></button>
                            <button type="button" className="icon-btn text-rose-600" onClick={() => decide(item.id, false)} title="Reject"><X size={16} /></button>
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
