import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Plus } from 'lucide-react';
import { Alert, EmptyState, SectionHeader, Select, TableSkeleton } from '../../../../components/ui.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../../services/inventoryApi.js';

const currentMonth = () => new Date().toISOString().slice(0, 7);
const money = (value) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(value || 0));

export default function PayrollPage() {
  const { can, pushToast, t } = useInventoryApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState([]);
  const [structures, setStructures] = useState([]);
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [month, setMonth] = useState(currentMonth());
  const [structureForm, setStructureForm] = useState({ employeeId: '', basicSalary: 0, allowances: 0, deductions: 0, grossSalary: 0 });
  const canGenerate = can('payroll.generate');
  const canApprove = can('payroll.approve');

  const selectedEmployee = useMemo(() => employees.find((employee) => employee.id === structureForm.employeeId), [employees, structureForm.employeeId]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [employeeRows, structureResult, runResult] = await Promise.all([
        inventoryApi.getActiveEmployees(),
        inventoryApi.listSalaryStructures(),
        inventoryApi.listPayrollRuns(),
      ]);
      setEmployees(Array.isArray(employeeRows) ? employeeRows : []);
      setStructures(structureResult.items || []);
      setRuns(runResult.items || []);
      if (!selectedRun && runResult.items?.[0]) loadRun(runResult.items[0].id);
    } catch (err) {
      setError(err?.message || 'Failed to load payroll data.');
    } finally {
      setLoading(false);
    }
  }

  async function loadRun(id) {
    try {
      setSelectedRun(await inventoryApi.getPayrollRun(id));
    } catch (err) {
      pushToast('error', 'Payroll', err?.message || t('alerts.requestFailed'));
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selectedEmployee || Number(structureForm.grossSalary || 0) > 0) return;
    const salary = Number(selectedEmployee.salaryAmount || selectedEmployee.salary_amount || 0);
    setStructureForm((form) => ({ ...form, basicSalary: salary, grossSalary: salary }));
  }, [selectedEmployee]);

  async function saveStructure(event) {
    event.preventDefault();
    try {
      await inventoryApi.saveSalaryStructure(structureForm);
      setStructureForm({ employeeId: '', basicSalary: 0, allowances: 0, deductions: 0, grossSalary: 0 });
      pushToast('success', 'Payroll', 'Salary structure saved.');
      load();
    } catch (err) {
      pushToast('error', 'Payroll', err?.message || t('alerts.requestFailed'));
    }
  }

  async function generate(event) {
    event.preventDefault();
    try {
      const result = await inventoryApi.generatePayroll({ month });
      pushToast('success', 'Payroll', 'Payroll generated.');
      await load();
      await loadRun(result.run.id);
    } catch (err) {
      pushToast('error', 'Payroll', err?.message || t('alerts.requestFailed'));
    }
  }

  async function approve(id) {
    try {
      await inventoryApi.approvePayrollRun(id);
      pushToast('success', 'Payroll', 'Payroll approved and journal posted.');
      await load();
      await loadRun(id);
    } catch (err) {
      pushToast('error', 'Payroll', err?.message || t('alerts.requestFailed'));
    }
  }

  return (
    <div>
      <SectionHeader eyebrow="HR" title="Payroll" description="Manage salary structures, monthly payroll runs, approvals, and payslip data." />
      {error ? <Alert type="error">{error}</Alert> : null}

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        {canGenerate ? (
          <form className="surface p-5" onSubmit={saveStructure}>
            <h2 className="section-title mb-4">Salary Structure</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select className="input sm:col-span-2" value={structureForm.employeeId} onChange={(e) => setStructureForm({ ...structureForm, employeeId: e.target.value, grossSalary: 0 })}>
                <option value="">Employee</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
              </Select>
              <input className="input" type="number" min="0" placeholder="Basic" value={structureForm.basicSalary} onChange={(e) => setStructureForm({ ...structureForm, basicSalary: e.target.value })} />
              <input className="input" type="number" min="0" placeholder="Allowances" value={structureForm.allowances} onChange={(e) => setStructureForm({ ...structureForm, allowances: e.target.value })} />
              <input className="input" type="number" min="0" placeholder="Deductions" value={structureForm.deductions} onChange={(e) => setStructureForm({ ...structureForm, deductions: e.target.value })} />
              <input className="input" type="number" min="0" placeholder="Gross" value={structureForm.grossSalary} onChange={(e) => setStructureForm({ ...structureForm, grossSalary: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary mt-4"><Plus size={16} /> Save Structure</button>
          </form>
        ) : null}

        {canGenerate ? (
          <form className="surface p-5" onSubmit={generate}>
            <h2 className="section-title mb-4">Generate Monthly Payroll</h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              <button type="submit" className="btn-primary"><Plus size={16} /> Generate</button>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-slate-400">Structures</p><p className="font-semibold">{structures.length}</p></div>
              <div><p className="text-slate-400">Runs</p><p className="font-semibold">{runs.length}</p></div>
              <div><p className="text-slate-400">Approved</p><p className="font-semibold">{runs.filter((run) => run.status === 'APPROVED').length}</p></div>
            </div>
          </form>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="surface overflow-hidden">
          <div className="border-b border-slate-100 p-5"><h2 className="section-title">Payroll Runs</h2></div>
          {loading ? <div className="p-5"><TableSkeleton columns={4} /></div> : runs.length === 0 ? (
            <div className="p-5"><EmptyState title="No payroll runs" description="Generate a monthly payroll run to begin." /></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {runs.map((run) => (
                <button key={run.id} type="button" className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50" onClick={() => loadRun(run.id)}>
                  <span><span className="block font-semibold">{run.payrollMonth}</span><span className="text-xs text-slate-400">{run.totalEmployees} employees</span></span>
                  <span className="text-right"><span className="block font-semibold">{money(run.netTotal)}</span><span className="muted-chip">{run.status}</span></span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="surface overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
            <h2 className="section-title">{selectedRun?.run ? `Run ${selectedRun.run.payrollMonth}` : 'Payroll Details'}</h2>
            {selectedRun?.run?.status === 'DRAFT' && canApprove ? (
              <button type="button" className="btn-primary" onClick={() => approve(selectedRun.run.id)}><CheckCircle2 size={16} /> Approve</button>
            ) : null}
          </div>
          {!selectedRun ? (
            <div className="p-5"><EmptyState title="Select a payroll run" description="Run details and payslip rows will appear here." /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-head"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3 text-right">Gross</th><th className="px-4 py-3 text-right">Attendance</th><th className="px-4 py-3 text-right">Advance</th><th className="px-4 py-3 text-right">Loan</th><th className="px-4 py-3 text-right">Net</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedRun.items.map((item) => (
                    <tr key={item.id}>
                      <td className="table-cell font-semibold">{item.employeeName}</td>
                      <td className="table-cell text-right">{money(item.grossSalary)}</td>
                      <td className="table-cell text-right">{money(item.attendanceDeduction)}</td>
                      <td className="table-cell text-right">{money(item.advanceRecovery)}</td>
                      <td className="table-cell text-right">{money(item.loanRecovery)}</td>
                      <td className="table-cell text-right font-semibold">{money(item.netPay)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
