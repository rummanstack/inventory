import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, HandCoins, Plus } from 'lucide-react';
import { Alert, Badge, EmptyState, MobileCardList, MobileListCard, Pagination, SectionHeader, TableSkeleton, Select } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, formatDate } from '../../../utils/calculations.js';
import { useInstallmentPlansViewModel } from '../viewmodels/useInstallmentPlansViewModel.js';
import CreatePlanModal from '../components/CreatePlanModal.jsx';
import CollectPaymentModal from '../components/CollectPaymentModal.jsx';

const STATUSES = ['ACTIVE', 'COMPLETED', 'CANCELLED', 'DEFAULTED', 'WRITTEN_OFF'];
const INSTALLMENT_PLANS_ADD_SHORTCUT = { alt: true, key: 'a', label: 'Alt+A' };

function matchesShortcut(event, shortcut) {
  return (
    event.key.toLowerCase() === shortcut.key &&
    Boolean(event.altKey) === Boolean(shortcut.alt) &&
    Boolean(event.shiftKey) === Boolean(shortcut.shift) &&
    Boolean(event.ctrlKey || event.metaKey) === Boolean(shortcut.ctrlOrMeta)
  );
}

const STATUS_TONES = {
  ACTIVE: 'blue',
  COMPLETED: 'emerald',
  CANCELLED: 'slate',
  DEFAULTED: 'rose',
  WRITTEN_OFF: 'rose',
};

export default function InstallmentPlansPage() {
  const { t, language, can, retailCustomerDirectory, createInstallmentPlan, collectInstallmentPayment } = useInventoryApp();
  const navigate = useNavigate();
  const vm = useInstallmentPlansViewModel();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState(null);
  const canManage = can('manage_installment_plans');
  const canCollect = can('collect_installment_payment');

  useEffect(() => {
    function handleKeyDown(event) {
      if (matchesShortcut(event, INSTALLMENT_PLANS_ADD_SHORTCUT) && canManage && !createModalOpen && !paymentPlan) {
        event.preventDefault();
        setCreateModalOpen(true);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canManage, createModalOpen, paymentPlan]);

  return (
    <div>
      <SectionHeader
        title={t('installments.plans.title')}
        compact
        action={canManage ? (
          <button type="button" className="btn-primary" onClick={() => setCreateModalOpen(true)}>
            <Plus size={18} />
            {t('installments.plans.add')}
            <kbd className="ml-1 rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200">Alt+A</kbd>
          </button>
        ) : null}
      />

      <div className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <Select className="input w-full sm:w-56" value={vm.customerId} onChange={(event) => vm.setCustomerId(event.target.value)}>
            <option value="">{t('installments.plans.allCustomers')}</option>
            {retailCustomerDirectory.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.name}</option>
            ))}
          </Select>
          <Select className="input w-full sm:w-48" value={vm.status} onChange={(event) => vm.setStatus(event.target.value)}>
            <option value="">{t('installments.plans.allStatuses')}</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>{t(`installments.plans.status.${value}`)}</option>
            ))}
          </Select>
        </div>

        {vm.loading ? (
          <div className="p-5">
            <TableSkeleton columns={7} showHeader={false} />
          </div>
        ) : vm.error ? (
          <div className="p-5">
            <Alert type="error">{vm.error}</Alert>
          </div>
        ) : (
          <>
            <MobileCardList>
              {vm.items.map((plan) => (
                <MobileListCard
                  key={plan.id}
                  onClick={() => navigate(`/installment-sales/${plan.id}`)}
                  title={plan.planNumber}
                  badge={<Badge tone={STATUS_TONES[plan.status] || 'slate'}>{t(`installments.plans.status.${plan.status}`)}</Badge>}
                  subtitle={plan.customerName || '-'}
                  value={formatCurrency(plan.outstandingAmount, language)}
                  valueClass={plan.outstandingAmount > 0 ? 'text-rose-700' : 'text-emerald-600'}
                />
              ))}
            </MobileCardList>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">{t('installments.plans.planNumber')}</th>
                    <th className="px-4 py-3">{t('installments.plans.customer')}</th>
                    <th className="px-4 py-3">{t('installments.plans.saleDate')}</th>
                    <th className="px-4 py-3 text-right">{t('installments.plans.finalPayableAmount')}</th>
                    <th className="px-4 py-3 text-right">{t('installments.plans.outstandingAmount')}</th>
                    <th className="px-4 py-3">{t('installments.plans.statusLabel')}</th>
                    <th className="px-4 py-3 text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vm.items.map((plan) => (
                    <tr key={plan.id} className="hover:bg-slate-50">
                      <td className="table-cell font-semibold text-slate-950">
                        <button type="button" className="hover:underline" onClick={() => navigate(`/installment-sales/${plan.id}`)}>
                          {plan.planNumber}
                        </button>
                      </td>
                      <td className="table-cell">{plan.customerName || '-'}</td>
                      <td className="table-cell">{formatDate(plan.saleDate, language)}</td>
                      <td className="table-cell text-right font-semibold text-slate-950">{formatCurrency(plan.finalPayableAmount, language)}</td>
                      <td className="table-cell text-right">
                        <span className={`font-bold ${plan.outstandingAmount > 0 ? 'text-rose-700' : 'text-emerald-600'}`}>
                          {formatCurrency(plan.outstandingAmount, language)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <Badge tone={STATUS_TONES[plan.status] || 'slate'}>{t(`installments.plans.status.${plan.status}`)}</Badge>
                      </td>
                      <td className="table-cell">
                        <div className="row-actions flex justify-end gap-2">
                          <button type="button" className="icon-btn" title={t('installments.plans.viewDetails')} onClick={() => navigate(`/installment-sales/${plan.id}`)}>
                            <CreditCard size={16} />
                          </button>
                          {canCollect && plan.status === 'ACTIVE' ? (
                            <button type="button" className="icon-btn" title={t('installments.plans.collectPayment')} onClick={() => setPaymentPlan(plan)}>
                              <HandCoins size={16} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!vm.loading && !vm.error && !vm.items.length ? (
          <div className="p-5">
            <EmptyState title={t('installments.plans.emptyTitle')} description={t('installments.plans.emptyDescription')} icon={CreditCard} />
          </div>
        ) : null}
        {!vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {createModalOpen ? (
        <CreatePlanModal
          onClose={() => setCreateModalOpen(false)}
          onSave={async (payload) => {
            const result = await createInstallmentPlan(payload);
            if (result.ok) {
              setCreateModalOpen(false);
              vm.reload();
            }
            return result;
          }}
        />
      ) : null}

      {paymentPlan ? (
        <CollectPaymentModal
          plan={paymentPlan}
          onClose={() => setPaymentPlan(null)}
          onSave={async (payload) => {
            const result = await collectInstallmentPayment(payload);
            if (result.ok) {
              setPaymentPlan(null);
              vm.reload();
            }
            return result;
          }}
        />
      ) : null}
    </div>
  );
}
