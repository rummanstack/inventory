import { useState } from 'react';
import { Gift, Pencil, Plus } from 'lucide-react';
import { Alert, Badge, EmptyState, MobileCardList, MobileListCard, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency } from '../../../utils/calculations.js';
import { useLateFeeRulesViewModel } from '../viewmodels/useLateFeeRulesViewModel.js';
import LateFeeRuleFormModal from '../components/LateFeeRuleFormModal.jsx';

function feeValueSummary(rule, t, language) {
  if (rule.feeType === 'PERCENT') return `${rule.feeValue}%`;
  return formatCurrency(rule.feeValue, language);
}

export default function LateFeeRulesPage() {
  const { t, language, can, saveInstallmentLateFeeRule } = useInventoryApp();
  const vm = useLateFeeRulesViewModel();
  const [ruleModal, setRuleModal] = useState(null);
  const canManage = can('manage_installment_plans');

  return (
    <div>
      <SectionHeader
        eyebrow={t('installments.lateFeeRules.eyebrow')}
        title={t('installments.lateFeeRules.title')}
        description={t('installments.lateFeeRules.description')}
        action={canManage ? (
          <button type="button" className="btn-primary" onClick={() => setRuleModal({ mode: 'add' })}>
            <Plus size={18} />
            {t('installments.lateFeeRules.add')}
          </button>
        ) : null}
      />

      <div className="surface overflow-hidden">
        {vm.loading ? (
          <div className="p-5">
            <TableSkeleton columns={5} showHeader={false} />
          </div>
        ) : vm.error ? (
          <div className="p-5">
            <Alert type="error">{vm.error}</Alert>
          </div>
        ) : !vm.rules.length ? (
          <div className="p-5">
            <EmptyState title={t('installments.lateFeeRules.emptyTitle')} icon={Gift} />
          </div>
        ) : (
          <>
          <MobileCardList>
            {vm.rules.map((rule) => (
              <MobileListCard
                key={rule.id}
                title={t(`installments.lateFeeRules.feeTypes.${rule.feeType}`)}
                badge={<Badge tone={rule.active ? 'emerald' : 'slate'}>{rule.active ? t('installments.lateFeeRules.activeYes') : t('installments.lateFeeRules.activeNo')}</Badge>}
                subtitle={`${t('installments.lateFeeRules.gracePeriodDays')}: ${rule.gracePeriodDays}`}
                value={feeValueSummary(rule, t, language)}
                valueSub={rule.maxPenaltyAmount > 0 ? formatCurrency(rule.maxPenaltyAmount, language) : null}
                action={canManage ? (
                  <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setRuleModal({ mode: 'edit', rule })}>
                    <Pencil size={16} />
                  </button>
                ) : null}
              />
            ))}
          </MobileCardList>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">{t('installments.lateFeeRules.feeType')}</th>
                  <th className="px-4 py-3 text-right">{t('installments.lateFeeRules.feeValue')}</th>
                  <th className="px-4 py-3 text-right">{t('installments.lateFeeRules.gracePeriodDays')}</th>
                  <th className="px-4 py-3 text-right">{t('installments.lateFeeRules.maxPenaltyAmount')}</th>
                  <th className="px-4 py-3">{t('installments.lateFeeRules.active')}</th>
                  {canManage ? <th className="px-4 py-3 text-right">{t('common.actions')}</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vm.rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50">
                    <td className="table-cell font-semibold text-slate-950">{t(`installments.lateFeeRules.feeTypes.${rule.feeType}`)}</td>
                    <td className="table-cell text-right">{feeValueSummary(rule, t, language)}</td>
                    <td className="table-cell text-right">{rule.gracePeriodDays}</td>
                    <td className="table-cell text-right">{rule.maxPenaltyAmount > 0 ? formatCurrency(rule.maxPenaltyAmount, language) : '-'}</td>
                    <td className="table-cell">
                      <Badge tone={rule.active ? 'emerald' : 'slate'}>
                        {rule.active ? t('installments.lateFeeRules.activeYes') : t('installments.lateFeeRules.activeNo')}
                      </Badge>
                    </td>
                    {canManage ? (
                      <td className="table-cell">
                        <div className="row-actions flex justify-end gap-2">
                          <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setRuleModal({ mode: 'edit', rule })}>
                            <Pencil size={16} />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {ruleModal ? (
        <LateFeeRuleFormModal
          rule={ruleModal.rule}
          onClose={() => setRuleModal(null)}
          onSave={async (value) => {
            const result = await saveInstallmentLateFeeRule(value);
            if (result.ok) {
              setRuleModal(null);
              vm.reload();
            }
            return result;
          }}
        />
      ) : null}
    </div>
  );
}
