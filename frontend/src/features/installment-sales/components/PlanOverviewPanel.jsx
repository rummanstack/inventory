import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, formatDate, formatDateTime } from '../../../utils/calculations.js';
import CreditCheckPanel from './CreditCheckPanel.jsx';
import CreditSettingsModal from './CreditSettingsModal.jsx';

function SummaryItem({ label, value, valueClass }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`text-sm font-bold ${valueClass || 'text-slate-950'}`}>{value}</p>
    </div>
  );
}

export default function PlanOverviewPanel({ plan, rescheduleLog = [], onCreditSettingsChanged }) {
  const { t, language, can } = useInventoryApp();
  const canManageCredit = can('manage_installment_credit_settings');
  const [creditCheck, setCreditCheck] = useState(null);
  const [creditModalOpen, setCreditModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    inventoryApi.getInstallmentCreditCheck({ customerId: plan.customerId })
      .then((result) => { if (!cancelled) setCreditCheck(result); })
      .catch(() => { if (!cancelled) setCreditCheck(null); });
    return () => { cancelled = true; };
  }, [plan.customerId]);

  return (
    <div className="space-y-6">
      <div className="surface overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-950">{t('installments.detail.tabs.overview')}</h3>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryItem label={t('installments.plans.customer')} value={plan.customerName || '-'} />
          <SummaryItem label={t('installments.payment.method')} value={plan.customerPhone || '-'} />
          <SummaryItem label={t('installments.plans.saleDate')} value={formatDate(plan.saleDate, language)} />
          <SummaryItem label={t('installments.plans.statusLabel')} value={t(`installments.plans.status.${plan.status}`)} />
          <SummaryItem label={t('installments.plans.productTotal')} value={formatCurrency(plan.productTotal, language)} />
          <SummaryItem label={t('installments.plans.discount')} value={formatCurrency(plan.discountAmount, language)} />
          <SummaryItem label={t('installments.plans.downPayment')} value={formatCurrency(plan.downPayment, language)} />
          <SummaryItem label={t('installments.plans.financeAmount')} value={formatCurrency(plan.financeAmount, language)} />
          <SummaryItem label={t('installments.plans.markupValue')} value={`${plan.markupValue} (${t(`installments.plans.markupTypes.${plan.markupType}`)})`} />
          <SummaryItem label={t('installments.plans.finalPayableAmount')} value={formatCurrency(plan.finalPayableAmount, language)} />
          <SummaryItem label={t('installments.detail.totalPaid')} value={formatCurrency(plan.totalPaid, language)} valueClass="text-emerald-600" />
          <SummaryItem label={t('installments.plans.outstandingAmount')} value={formatCurrency(plan.outstandingAmount, language)} valueClass={plan.outstandingAmount > 0 ? 'text-rose-600' : 'text-emerald-600'} />
        </div>
        {plan.cancelReason ? (
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-rose-600">
            {t('installments.detail.cancelReasonLabel')}: {plan.cancelReason}
          </div>
        ) : null}
        {plan.writeOffReason ? (
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-rose-600">
            {t('installments.detail.writeOffReasonLabel')}: {plan.writeOffReason}
          </div>
        ) : null}
      </div>

      <div className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-950">{t('installments.creditSettings.title')}</h3>
          {canManageCredit ? (
            <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setCreditModalOpen(true)}>
              <Pencil size={16} />
            </button>
          ) : null}
        </div>
        <div className="p-5">
          <CreditCheckPanel creditCheck={creditCheck} />
        </div>
      </div>

      {rescheduleLog.length ? (
        <div className="surface overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-950">{t('installments.detail.rescheduleHistory')}</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {rescheduleLog.map((entry) => (
              <div key={entry.id} className="px-5 py-3">
                <p className="text-sm font-semibold text-slate-950">{entry.reason}</p>
                <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(entry.createdAt, language)}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {creditModalOpen ? (
        <CreditSettingsModal
          customerId={plan.customerId}
          onClose={() => setCreditModalOpen(false)}
          onSaved={() => {
            setCreditModalOpen(false);
            inventoryApi.getInstallmentCreditCheck({ customerId: plan.customerId }).then(setCreditCheck).catch(() => {});
            onCreditSettingsChanged?.();
          }}
        />
      ) : null}
    </div>
  );
}
