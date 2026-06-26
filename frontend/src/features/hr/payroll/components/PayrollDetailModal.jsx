import { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Alert, Modal, TableSkeleton } from '../../../../components/ui.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { formatCurrency } from '../../../../utils/calculations.js';

export default function PayrollDetailModal({ payrollSummary, onClose, onChanged, canManage }) {
  const { t, language } = useInventoryApp();
  const [payroll, setPayroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [absentValue, setAbsentValue] = useState(0);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.getPayroll(payrollSummary.id);
      setPayroll(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [payrollSummary.id]);

  useEffect(() => { load(); }, [load]);

  async function saveAbsent(item) {
    setSaving(true);
    try {
      await inventoryApi.updatePayrollItem(payroll.id, item.id, { daysAbsent: absentValue });
      await load();
      onChanged();
      setEditingItem(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`${t('payroll.detail')} — ${payrollSummary.payrollNumber}`}
      description={`${payrollSummary.month} · ${payrollSummary.status}`}
      onClose={onClose}
      width="max-w-4xl"
    >
      {loading ? (
        <TableSkeleton columns={6} />
      ) : error ? (
        <Alert type="error">{error}</Alert>
      ) : payroll ? (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-3 py-2">{t('employees.name')}</th>
                  <th className="px-3 py-2 text-center">{t('payroll.workingDays')}</th>
                  <th className="px-3 py-2 text-center">{t('payroll.daysAbsent')}</th>
                  <th className="px-3 py-2 text-right">{t('payroll.grossPay')}</th>
                  <th className="px-3 py-2 text-right">{t('payroll.deduction')}</th>
                  <th className="px-3 py-2 text-right">{t('payroll.netPay')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(payroll.items || []).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <div className="font-semibold text-slate-900">{item.employeeName}</div>
                      {item.designation ? <div className="text-xs text-slate-400">{item.designation}</div> : null}
                    </td>
                    <td className="px-3 py-2 text-center">{item.workingDays}</td>
                    <td className="px-3 py-2 text-center">
                      {canManage && payroll.status === 'DRAFT' ? (
                        editingItem === item.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              className="input w-16 py-0.5 text-center text-sm"
                              type="number"
                              min="0"
                              max={item.workingDays}
                              value={absentValue}
                              onChange={(e) => setAbsentValue(Number(e.target.value))}
                            />
                            <button type="button" className="icon-btn text-emerald-700" disabled={saving}
                              onClick={() => saveAbsent(item)}>
                              <Check size={14} />
                            </button>
                            <button type="button" className="icon-btn" onClick={() => setEditingItem(null)}>
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="rounded px-2 py-0.5 text-sm font-semibold hover:bg-slate-100"
                            onClick={() => { setEditingItem(item.id); setAbsentValue(item.daysAbsent); }}
                          >
                            {item.daysAbsent}
                          </button>
                        )
                      ) : item.daysAbsent}
                    </td>
                    <td className="px-3 py-2 text-right">{formatCurrency(item.grossPay, language)}</td>
                    <td className="px-3 py-2 text-right text-rose-600">{formatCurrency(item.absentDeduction + item.totalDeductions, language)}</td>
                    <td className="px-3 py-2 text-right font-bold text-emerald-700">{formatCurrency(item.netPay, language)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td className="px-3 py-2 font-black text-slate-700" colSpan={5}>{t('payroll.totalNetPay')}</td>
                  <td className="px-3 py-2 text-right text-lg font-black text-emerald-700">
                    {formatCurrency(payroll.totalNetPay, language)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="flex justify-end">
            <button type="button" className="btn-secondary" onClick={onClose}>{t('common.close')}</button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
