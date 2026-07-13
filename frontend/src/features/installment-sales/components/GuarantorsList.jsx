import { Trash2, UserRound } from 'lucide-react';
import { EmptyState } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency } from '../../../utils/calculations.js';

export default function GuarantorsList({ planId, guarantors = [], canManage, onChanged }) {
  const { t, language, removeInstallmentGuarantor } = useInventoryApp();

  if (!guarantors.length) {
    return <EmptyState title={t('installments.guarantors.emptyTitle')} description={t('installments.guarantors.emptyDescription')} icon={UserRound} />;
  }

  async function handleRemove(guarantor) {
    const result = await removeInstallmentGuarantor(planId, guarantor);
    if (result?.ok) onChanged();
  }

  return (
    <div className="space-y-3">
      {guarantors.map((guarantor) => (
        <div key={guarantor.id} className="flex items-start justify-between rounded-2xl border border-slate-200 p-4">
          <div>
            <p className="font-semibold text-slate-950">{guarantor.name}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {guarantor.phone || '-'} · {guarantor.relationship || '-'}
            </p>
            {guarantor.address ? <p className="mt-1 text-xs text-slate-500">{guarantor.address}</p> : null}
            {guarantor.monthlyIncome ? (
              <p className="mt-1 text-xs font-semibold text-slate-600">
                {t('installments.guarantors.monthlyIncome')}: {formatCurrency(guarantor.monthlyIncome, language)}
              </p>
            ) : null}
          </div>
          {canManage ? (
            <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={() => handleRemove(guarantor)}>
              <Trash2 size={16} />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
