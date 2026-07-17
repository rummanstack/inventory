import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Plus } from 'lucide-react';
import { Alert, EmptyState, MobileCardList, MobileListCard, SectionHeader, Select, TableSkeleton } from '../../../../components/ui.jsx';
import TableReportActions from '../../../../components/TableReportActions.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantApiQuery } from '../../../../queries/useTenantApiQuery.js';
import { transactionKeys } from '../../../transactions/queries/transactionQueries.js';
import { getActiveTenantId } from '../../../../services/api/client.js';

const currentMonth = () => new Date().toISOString().slice(0, 7);
const money = (value) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(value || 0));
const PAYROLL_RUNS_REPORT_ID = 'payroll-runs-report';
const PAYROLL_DETAILS_REPORT_ID = 'payroll-run-details-report';
const PAYROLL_REPORT_SHORTCUTS = {
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  csv: { alt: true, key: 'c', label: 'Alt+C' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

export default function PayrollPage() {
  const queryClient = useQueryClient();
  const { can, pushToast, t } = useInventoryApp();
  const [selectedRun, setSelectedRun] = useState(null);
  const [month, setMonth] = useState(currentMonth());
  const [structureForm, setStructureForm] = useState({ employeeId: '', basicSalary: 0, allowances: 0, deductions: 0, grossSalary: 0 });
  const canGenerate = can('payroll.generate');
  const canApprove = can('payroll.approve');

  const selectedEmployee = useMemo(() => employees.find((employee) => employee.id === structureForm.employeeId), [employees, structureForm.employeeId]);

  const payrollQuery = useTenantApiQuery({
    scope: 'payroll',
    queryFn: async () => {
      const [employees, structures, runs] = await Promise.all([
        inventoryApi.getActiveEmployees(),
        inventoryApi.listSalaryStructures(),
        inventoryApi.listPayrollRuns(),
      ]);
      return { employees, structures: structures.items || [], runs: runs.items || [] };
    },
  });
  const payrollMutation = useMutation({
    mutationKey: transactionKeys.mutation(getActiveTenantId(), 'payroll-action'),
    mutationFn: ({ action, id, payload }) => {
      if (action === 'structure') return inventoryApi.saveSalaryStructure(payload);
      if (action === 'generate') return inventoryApi.generatePayroll(payload);
      if (action === 'approve') return inventoryApi.approvePayrollRun(id);
      return inventoryApi.payPayrollRun(id, payload);
    },
  });
  const employees = Array.isArray(payrollQuery.data?.employees) ? payrollQuery.data.employees : [];
  const structures = payrollQuery.data?.structures || [];
  const runs = payrollQuery.data?.runs || [];
  const loading = payrollQuery.isPending;
  const error = payrollQuery.error?.message || '';
  const load = payrollQuery.refetch;

  async function loadRun(id) {
    try {
      const result = await queryClient.fetchQuery({
        queryKey: transactionKeys.detail(getActiveTenantId(), 'payroll-run', id),
        queryFn: () => inventoryApi.getPayrollRun(id),
        staleTime: 30_000,
      });
      setSelectedRun(result);
    } catch (err) {
      pushToast('error', t('payroll.title'), err?.message || t('alerts.requestFailed'));
    }
  }

  useEffect(() => {
    if (!selectedRun && runs[0]) loadRun(runs[0].id);
  }, [runs, selectedRun]);

  useEffect(() => {
    if (!selectedEmployee || Number(structureForm.grossSalary || 0) > 0) return;
    const salary = Number(selectedEmployee.salaryAmount || selectedEmployee.salary_amount || 0);
    setStructureForm((form) => ({ ...form, basicSalary: salary, grossSalary: salary }));
  }, [selectedEmployee]);

  async function saveStructure(event) {
    event.preventDefault();
    try {
      await payrollMutation.mutateAsync({ action: 'structure', payload: structureForm });
      setStructureForm({ employeeId: '', basicSalary: 0, allowances: 0, deductions: 0, grossSalary: 0 });
      pushToast('success', t('payroll.title'), t('payroll.structureSaved'));
      load();
    } catch (err) {
      pushToast('error', t('payroll.title'), err?.message || t('alerts.requestFailed'));
    }
  }

  async function generate(event) {
    event.preventDefault();
    try {
      const result = await payrollMutation.mutateAsync({ action: 'generate', payload: { month } });
      pushToast('success', t('payroll.title'), t('payroll.generated'));
      await load();
      await loadRun(result.run.id);
    } catch (err) {
      pushToast('error', t('payroll.title'), err?.message || t('alerts.requestFailed'));
    }
  }

  async function approve(id) {
    try {
      await payrollMutation.mutateAsync({ action: 'approve', id });
      pushToast('success', t('payroll.title'), t('payroll.approvedToast'));
      await load();
      await loadRun(id);
    } catch (err) {
      pushToast('error', t('payroll.title'), err?.message || t('alerts.requestFailed'));
    }
  }

  async function pay(id, paymentMethod = 'CASH') {
    try {
      await payrollMutation.mutateAsync({ action: 'pay', id, payload: { paymentMethod } });
      pushToast('success', t('payroll.title'), t('payroll.paidToast'));
      await load();
      await loadRun(id);
    } catch (err) {
      pushToast('error', t('payroll.title'), err?.message || t('alerts.requestFailed'));
    }
  }

  return (
    <div>
      <SectionHeader title={t('payroll.title')} compact />
      {error ? <Alert type="error">{error}</Alert> : null}

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        {canGenerate ? (
          <form className="surface p-5" onSubmit={saveStructure}>
            <h2 className="section-title mb-4">{t('payroll.structureTitle')}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select className="input sm:col-span-2" value={structureForm.employeeId} onChange={(e) => setStructureForm({ ...structureForm, employeeId: e.target.value, grossSalary: 0 })}>
                <option value="">{t('payroll.employeeLabel')}</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
              </Select>
              <input className="input" type="number" min="0" placeholder={t('payroll.basicLabel')} value={structureForm.basicSalary} onChange={(e) => setStructureForm({ ...structureForm, basicSalary: e.target.value })} />
              <input className="input" type="number" min="0" placeholder={t('payroll.allowancesLabel')} value={structureForm.allowances} onChange={(e) => setStructureForm({ ...structureForm, allowances: e.target.value })} />
              <input className="input" type="number" min="0" placeholder={t('payroll.deductionsLabel')} value={structureForm.deductions} onChange={(e) => setStructureForm({ ...structureForm, deductions: e.target.value })} />
              <input className="input" type="number" min="0" placeholder={t('payroll.grossLabel')} value={structureForm.grossSalary} onChange={(e) => setStructureForm({ ...structureForm, grossSalary: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary mt-4"><Plus size={16} /> {t('payroll.saveStructure')}</button>
          </form>
        ) : null}

        {canGenerate ? (
          <form className="surface p-5" onSubmit={generate}>
            <h2 className="section-title mb-4">{t('payroll.generateTitle')}</h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              <button type="submit" className="btn-primary"><Plus size={16} /> {t('payroll.generate')}</button>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-slate-400">{t('payroll.structures')}</p><p className="font-semibold">{structures.length}</p></div>
              <div><p className="text-slate-400">{t('payroll.runs')}</p><p className="font-semibold">{runs.length}</p></div>
              <div><p className="text-slate-400">{t('payroll.approved')}</p><p className="font-semibold">{runs.filter((run) => run.status === 'APPROVED').length}</p></div>
            </div>
          </form>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div id={PAYROLL_RUNS_REPORT_ID} className="surface overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
            <h2 className="section-title">{t('payroll.runsTitle')}</h2>
            <TableReportActions targetId={PAYROLL_RUNS_REPORT_ID} title={t('payroll.runsTitle')} fileName="payroll-runs" entityType="payroll_runs" t={t} shortcuts={PAYROLL_REPORT_SHORTCUTS} />
          </div>
          {loading ? <div className="p-5"><TableSkeleton columns={4} /></div> : runs.length === 0 ? (
            <div className="p-5"><EmptyState title={t('payroll.noRunsTitle')} description={t('payroll.noRunsDesc')} /></div>
          ) : (
            <div className="divide-y divide-slate-100 no-print">
              {runs.map((run) => (
                <button key={run.id} type="button" className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50" onClick={() => loadRun(run.id)}>
                  <span><span className="block font-semibold">{run.payrollMonth}</span><span className="text-xs text-slate-400">{t('payroll.employeesCount', { count: run.totalEmployees })}</span></span>
                  <span className="text-right"><span className="block font-semibold">{money(run.netTotal)}</span><span className="muted-chip">{run.status}</span></span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div id={PAYROLL_DETAILS_REPORT_ID} className="surface overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
            <h2 className="section-title">{selectedRun?.run ? t('payroll.runLabel', { month: selectedRun.run.payrollMonth }) : t('payroll.runDetailsTitle')}</h2>
            <div className="flex flex-wrap items-center gap-2 no-print">
              <TableReportActions targetId={PAYROLL_DETAILS_REPORT_ID} title={t('payroll.runDetailsTitle')} fileName="payroll-run-details" entityType="payroll_run_details" t={t} shortcuts={PAYROLL_REPORT_SHORTCUTS} />
              {selectedRun?.run?.status === 'DRAFT' && canApprove ? (
                <button type="button" className="btn-primary" onClick={() => approve(selectedRun.run.id)}><CheckCircle2 size={16} /> {t('payroll.approveAction')}</button>
              ) : null}
              {selectedRun?.run?.status === 'APPROVED' && selectedRun?.run?.paymentStatus !== 'PAID' && canApprove ? (
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary" onClick={() => pay(selectedRun.run.id, 'CASH')}>{t('payroll.payCash')}</button>
                  <button type="button" className="btn-primary" onClick={() => pay(selectedRun.run.id, 'BANK')}>{t('payroll.payBank')}</button>
                </div>
              ) : null}
            </div>
          </div>
          {!selectedRun ? (
            <div className="p-5"><EmptyState title={t('payroll.selectRunTitle')} description={t('payroll.selectRunDesc')} /></div>
          ) : (
            <>
            <MobileCardList>
              {selectedRun.items.map((item) => (
                <MobileListCard
                  key={item.id}
                  title={item.employeeName}
                  value={money(item.netPay)}
                  valueSub={money(item.grossSalary)}
                />
              ))}
            </MobileCardList>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="table-head"><tr><th className="px-4 py-3">{t('payroll.columnEmployee')}</th><th className="px-4 py-3 text-right">{t('payroll.columnGross')}</th><th className="px-4 py-3 text-right">{t('payroll.columnAttendance')}</th><th className="px-4 py-3 text-right">{t('payroll.columnAdvance')}</th><th className="px-4 py-3 text-right">{t('payroll.columnLoan')}</th><th className="px-4 py-3 text-right">{t('payroll.columnNet')}</th></tr></thead>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
