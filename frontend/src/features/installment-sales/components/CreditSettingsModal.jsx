import { useEffect, useState } from 'react';
import { Alert, Modal } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import CreditCheckPanel from './CreditCheckPanel.jsx';

export default function CreditSettingsModal({ customerId, onClose, onSaved }) {
  const { t, updateInstallmentCreditSettings } = useInventoryApp();
  const [creditCheck, setCreditCheck] = useState(null);
  const [creditLimit, setCreditLimit] = useState(0);
  const [isCreditBlocked, setIsCreditBlocked] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    inventoryApi.getInstallmentCreditCheck({ customerId })
      .then((result) => {
        if (cancelled) return;
        setCreditCheck(result);
        setCreditLimit(result.creditLimit || 0);
        setIsCreditBlocked(Boolean(result.isBlocked));
      })
      .catch((requestError) => { if (!cancelled) setError(requestError.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [customerId]);

  async function submitForm(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    const result = await updateInstallmentCreditSettings(customerId, {
      creditLimit: Number(creditLimit || 0),
      isCreditBlocked: Boolean(isCreditBlocked),
    });
    setSaving(false);
    if (result?.ok) {
      onSaved();
    } else {
      setError(result?.message || t('installments.creditSettings.saveFailed'));
    }
  }

  return (
    <Modal title={t('installments.creditSettings.title')} onClose={onClose} width="max-w-lg">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        {!loading ? <CreditCheckPanel creditCheck={creditCheck} /> : null}
        <div>
          <label className="label">{t('installments.creditSettings.creditLimit')}</label>
          <input className="input" type="number" min="0" step="0.01" value={creditLimit} onChange={(event) => setCreditLimit(event.target.value)} />
        </div>
        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <input
            className="mt-1 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
            type="checkbox"
            checked={isCreditBlocked}
            onChange={(event) => setIsCreditBlocked(event.target.checked)}
          />
          <span className="text-sm font-semibold text-slate-950">{t('installments.creditSettings.isCreditBlocked')}</span>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</button>
        </div>
      </form>
    </Modal>
  );
}
