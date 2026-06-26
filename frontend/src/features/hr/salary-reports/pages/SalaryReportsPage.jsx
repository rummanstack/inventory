import { BarChart3 } from 'lucide-react';
import { Alert, EmptyState, SectionHeader, TableSkeleton } from '../../../../components/ui.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { formatCurrency } from '../../../../utils/calculations.js';
import { useSalaryReportsViewModel } from '../viewmodels/useSalaryReportsViewModel.js';

export default function SalaryReportsPage() {
  const { t, language } = useInventoryApp();
  const vm = useSalaryReportsViewModel();

  const items = vm.payroll?.items || [];
  const totals = items.reduce(
    (acc, i) => ({
      grossPay: acc.grossPay + i.grossPay,
      allowances: acc.allowances + i.totalAllowances,
      deductions: acc.deductions + i.totalDeductions + i.absentDeduction,
      netPay: acc.netPay + i.netPay,
    }),
    { grossPay: 0, allowances: 0, deductions: 0, netPay: 0 },
  );

  return (
    <div>
      <SectionHeader
        eyebrow={t('salaryReports.eyebrow')}
        title={t('salaryReports.title')}
        description={t('salaryReports.description')}
      />

      <div className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="flex items-center gap-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{t('salaryReports.eyebrow')}</p>
            <select className="input ml-auto w-64" value={vm.selected} onChange={(e) => vm.setSelected(e.target.value)}>
              <option value="">{t('salaryReports.selectPayroll')}</option>
              {vm.payrolls.map((p) => (
                <option key={p.id} value={p.id}>{p.payrollNumber} — {p.month}</option>
              ))}
            </select>
          </div>
        </div>

        {vm.loading || vm.detailLoading ? (
          <div className="p-5"><TableSkeleton columns={5} /></div>
        ) : vm.error ? (
          <div className="p-5"><Alert type="error">{vm.error}</Alert></div>
        ) : !vm.payroll ? (
          <div className="p-5">
            <EmptyState title={t('salaryReports.noReports')} description={t('salaryReports.noReportsDesc')} icon={BarChart3} />
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
              {[
                { label: t('payroll.grossPay'), value: totals.grossPay, color: 'text-slate-900' },
                { label: t('salaryStructure.allowances'), value: totals.allowances, color: 'text-emerald-700' },
                { label: t('salaryStructure.deductions'), value: totals.deductions, color: 'text-rose-600' },
                { label: t('payroll.netPay'), value: totals.netPay, color: 'text-emerald-800' },
              ].map((c) => (
                <div key={c.label} className="rounded-lg bg-slate-50 p-4 text-center">
                  <p className="text-xs text-slate-500">{c.label}</p>
                  <p className={`mt-1 text-lg font-black ${c.color}`}>{formatCurrency(c.value, language)}</p>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">{t('employees.name')}</th>
                    <th className="px-4 py-3">{t('employees.department')}</th>
                    <th className="px-4 py-3 text-center">{t('payroll.daysAbsent')}</th>
                    <th className="px-4 py-3 text-right">{t('payroll.grossPay')}</th>
                    <th className="px-4 py-3 text-right">{t('payroll.deduction')}</th>
                    <th className="px-4 py-3 text-right">{t('payroll.netPay')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="table-cell font-semibold text-slate-950">{item.employeeName}</td>
                      <td className="table-cell text-slate-500">{item.department || '—'}</td>
                      <td className="table-cell text-center">{item.daysAbsent}</td>
                      <td className="table-cell text-right">{formatCurrency(item.grossPay, language)}</td>
                      <td className="table-cell text-right text-rose-600">{formatCurrency(item.absentDeduction + item.totalDeductions, language)}</td>
                      <td className="table-cell text-right font-bold text-emerald-700">{formatCurrency(item.netPay, language)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50 font-black">
                    <td className="px-4 py-3 text-slate-700" colSpan={3}>{t('common.total')}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(totals.grossPay, language)}</td>
                    <td className="px-4 py-3 text-right text-rose-600">{formatCurrency(totals.deductions, language)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700">{formatCurrency(totals.netPay, language)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
