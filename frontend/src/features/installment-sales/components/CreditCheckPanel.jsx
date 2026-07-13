import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { Alert, Badge } from '../../../components/ui.jsx';
import { formatCurrency } from '../../../utils/calculations.js';

export default function CreditCheckPanel({ creditCheck }) {
  const { t, language } = useInventoryApp();

  if (!creditCheck) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-950">{t('installments.createPlan.creditCheck.title')}</p>
        {creditCheck.isBlocked ? (
          <Badge tone="rose">{t('installments.createPlan.creditCheck.blocked')}</Badge>
        ) : creditCheck.overLimit ? (
          <Badge tone="amber">{t('installments.createPlan.creditCheck.overLimit')}</Badge>
        ) : (
          <Badge tone="emerald">{t('installments.createPlan.creditCheck.ok')}</Badge>
        )}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs font-medium text-slate-500">{t('installments.creditSettings.creditLimit')}</p>
          <p className="text-sm font-bold text-slate-950">{formatCurrency(creditCheck.creditLimit || 0, language)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">{t('installments.creditSettings.currentExposure')}</p>
          <p className="text-sm font-bold text-slate-950">{formatCurrency(creditCheck.totalExposure || 0, language)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">{t('installments.createPlan.creditCheck.overdueAmount')}</p>
          <p className="text-sm font-bold text-rose-600">{formatCurrency(creditCheck.overdueAmount || 0, language)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">{t('installments.createPlan.creditCheck.priorDefaults')}</p>
          <p className="text-sm font-bold text-slate-950">{creditCheck.priorDefaults || 0}</p>
        </div>
      </div>
      {creditCheck.isBlocked ? (
        <Alert type="error" className="mt-3">{t('installments.createPlan.creditCheck.blockedHelp')}</Alert>
      ) : creditCheck.overLimit ? (
        <Alert type="warning" className="mt-3">{t('installments.createPlan.creditCheck.overLimitHelp')}</Alert>
      ) : null}
    </div>
  );
}
