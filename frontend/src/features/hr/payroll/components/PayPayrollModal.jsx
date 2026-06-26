import { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { Alert, Modal } from '../../../../components/ui.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { formatCurrency } from '../../../../utils/calculations.js';

export default function PayPayrollModal({ payroll, onClose, onPaid }) {
  const { t, language } = useInventoryApp();
  const [accounts, setAccounts] = useState([]);
  const [financeAccountId, setFinanceAccountId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    inventoryApi.listFinanceAccounts().then((data) => {
      const list = data || [];
      setAccounts(list);
      if (list.length) setFinanceAccountId(list[0].id);
    }).catch(() => {});
  }, []);

  async function handlePay() {
    if (!financeAccountId) { setError(t('payroll.accountRequired')); return; }
    setSaving(true);
    setError('');
    try {
      await inventoryApi.payPayroll(payroll.id, { financeAccountId });
      onPaid();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={t('payroll.payTitle')} description={`${payroll.payrollNumber} — ${payroll.month}`} onClose={onClose} width="max-w-sm">
      <div className="space-y-4">
        {error ? <Alert type="error">{error}</Alert> : null}

        <div className="rounded-lg bg-slate-50 p-4 text-center">
          <p className="text-xs text-slate-500">{t('payroll.totalNetPay')}</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{formatCurrency(payroll.totalNetPay, language)}</p>
        </div>

        <div>
          <label className="label">{t('payroll.payFromAccount')}</label>
          <select className="input" value={financeAccountId} onChange={(e) => setFinanceAccountId(e.target.value)}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name} — {formatCurrency(a.balance, language)}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="button" className="btn-primary" onClick={handlePay} disabled={saving}>
            <CreditCard size={18} />
            {saving ? t('common.saving') : t('payroll.pay')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
