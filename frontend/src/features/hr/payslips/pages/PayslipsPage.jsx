import { useEffect, useState } from 'react';
import { FileText, Printer } from 'lucide-react';
import { Alert, EmptyState, Modal, SectionHeader, TableSkeleton } from '../../../../components/ui.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { formatCurrency, formatDate } from '../../../../utils/calculations.js';

export default function PayslipsPage() {
  const { t, can, language } = useInventoryApp();
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedPayroll, setSelectedPayroll] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [payslip, setPayslip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [listLoading, setListLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      inventoryApi.listPayrolls({ pageSize: 100 }).then((r) => setPayrolls(r.items || [])),
      inventoryApi.getActiveEmployees().then((d) => setEmployees(d || [])),
    ]).finally(() => setListLoading(false));
  }, []);

  async function loadPayslip() {
    if (!selectedPayroll || !selectedEmployee) return;
    setLoading(true);
    setError('');
    setPayslip(null);
    try {
      const data = await inventoryApi.getPayslip(selectedPayroll, selectedEmployee);
      setPayslip(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedPayroll && selectedEmployee) loadPayslip();
  }, [selectedPayroll, selectedEmployee]);

  return (
    <div>
      <SectionHeader
        eyebrow={t('payslips.eyebrow')}
        title={t('payslips.title')}
        description={t('payslips.description')}
      />

      <div className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{t('payslips.eyebrow')}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">{t('payroll.title')}</label>
              {listLoading ? (
                <div className="input bg-slate-50 text-slate-400">{t('common.loading')}</div>
              ) : (
                <select className="input" value={selectedPayroll} onChange={(e) => setSelectedPayroll(e.target.value)}>
                  <option value="">{t('payslips.selectPayroll')}</option>
                  {payrolls.map((p) => (
                    <option key={p.id} value={p.id}>{p.payrollNumber} — {p.month} ({p.status})</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="label">{t('employees.name')}</label>
              {listLoading ? (
                <div className="input bg-slate-50 text-slate-400">{t('common.loading')}</div>
              ) : (
                <select className="input" value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
                  <option value="">{t('payslips.selectEmployee')}</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        <div className="p-5">
          {loading ? <TableSkeleton columns={2} /> : error ? <Alert type="error">{error}</Alert> : null}

          {payslip ? (
            <div id="payslip-print" className="print-target mx-auto max-w-2xl">
              <div className="mb-4 flex items-start justify-between no-print">
                <div />
                <button
                  type="button"
                  className="btn-secondary gap-2 text-sm"
                  onClick={() => window.print()}
                >
                  <Printer size={16} />
                  {t('common.print')}
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 p-6">
                <div className="mb-6 border-b border-slate-200 pb-4">
                  <h2 className="text-lg font-black text-slate-900">{t('payslips.payslip')}</h2>
                  <p className="text-sm text-slate-500">{payslip.payroll.payrollNumber} · {payslip.payroll.month}</p>
                </div>

                <div className="mb-5 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-500">{t('employees.name')}:</span>{' '}
                    <span className="font-semibold">{payslip.item.employeeName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">{t('employees.designation')}:</span>{' '}
                    <span className="font-semibold">{payslip.item.designation || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">{t('employees.department')}:</span>{' '}
                    <span className="font-semibold">{payslip.item.department || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">{t('payroll.status')}:</span>{' '}
                    <span className="font-semibold">{payslip.payroll.status}</span>
                  </div>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-2 text-left font-semibold text-slate-600">{t('payslips.component')}</th>
                      <th className="py-2 text-right font-semibold text-slate-600">{t('payslips.amount')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2">{t('salaryStructure.basicPay')}</td>
                      <td className="py-2 text-right">{formatCurrency(payslip.item.basicPay, language)}</td>
                    </tr>
                    {(payslip.item.allowances || []).map((a, i) => (
                      <tr key={i}>
                        <td className="py-2 text-emerald-700">+ {a.label}</td>
                        <td className="py-2 text-right text-emerald-700">{formatCurrency(a.amount, language)}</td>
                      </tr>
                    ))}
                    {payslip.item.absentDeduction > 0 ? (
                      <tr>
                        <td className="py-2 text-rose-600">− {t('payroll.absentDeduction')} ({payslip.item.daysAbsent} {t('payroll.days')})</td>
                        <td className="py-2 text-right text-rose-600">{formatCurrency(payslip.item.absentDeduction, language)}</td>
                      </tr>
                    ) : null}
                    {(payslip.item.deductions || []).map((d, i) => (
                      <tr key={i}>
                        <td className="py-2 text-rose-600">− {d.label}</td>
                        <td className="py-2 text-right text-rose-600">{formatCurrency(d.amount, language)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300">
                      <td className="py-3 font-black text-slate-900">{t('payroll.netPay')}</td>
                      <td className="py-3 text-right text-xl font-black text-emerald-700">
                        {formatCurrency(payslip.item.netPay, language)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {payslip.payroll.paidAt ? (
                  <p className="mt-4 text-xs text-slate-400">
                    {t('payroll.paidOn')} {formatDate(payslip.payroll.paidAt, language)}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {!loading && !error && !payslip && selectedPayroll && selectedEmployee ? (
            <EmptyState title={t('payslips.notFound')} description={t('payslips.notFoundDesc')} icon={FileText} />
          ) : null}

          {!loading && !error && !payslip && (!selectedPayroll || !selectedEmployee) ? (
            <EmptyState title={t('payslips.selectPrompt')} description={t('payslips.selectPromptDesc')} icon={FileText} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
