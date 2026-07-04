import { useState } from 'react';
import { HandCoins } from 'lucide-react';
import { Alert, Modal } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency } from '../../../utils/calculations.js';

export default function SettleDueModal({ dsr, balance, onClose, onSave }) {
  const { t } = useInventoryApp();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submitForm(event) {
    event.preventDefault();
    const amountValue = Number(amount);
    if (!(amountValue > 0)) {
      setError(t('dsrDueLedger.settleAmountRequired'));
      return;
    }

    setSaving(true);
    setError('');
    const result = await onSave({ amount: amountValue, note: note.trim() });
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || t('dsrDueLedger.settleFailed'));
    }
  }

  return (
    <Modal title={t('dsrDueLedger.settleDue')} description={dsr?.name} onClose={onClose} width="max-w-lg">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase text-slate-500">{t('dsrDueLedger.closingBalance')}</p>
          <p className="mt-1 text-lg font-bold text-slate-950">{formatCurrency(balance || 0)}</p>
        </div>
        <div>
          <label className="label">{t('dsrDueLedger.settleAmount')}</label>
          <input className="input" type="number" min="0" step="0.0001" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </div>
        <div>
          <label className="label">{t('dsrDueLedger.settleNoteLabel')}</label>
          <textarea className="input min-h-20" value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('dsrDueLedger.settleNotePlaceholder')} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <HandCoins size={18} />
            {saving ? t('common.saving') : t('dsrDueLedger.settleDue')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
