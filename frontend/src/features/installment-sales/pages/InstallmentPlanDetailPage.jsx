import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, HandCoins, Loader2, Plus } from 'lucide-react';
import { Alert, Badge, PageLoadingState, SectionHeader, cx } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';
import { useInstallmentPlanDetailViewModel } from '../viewmodels/useInstallmentPlanDetailViewModel.js';
import PlanOverviewPanel from '../components/PlanOverviewPanel.jsx';
import PlanScheduleTable from '../components/PlanScheduleTable.jsx';
import PlanPaymentsTable from '../components/PlanPaymentsTable.jsx';
import GuarantorsList from '../components/GuarantorsList.jsx';
import GuarantorFormModal from '../components/GuarantorFormModal.jsx';
import DocumentsList from '../components/DocumentsList.jsx';
import DocumentFormModal from '../components/DocumentFormModal.jsx';
import CollectPaymentModal from '../components/CollectPaymentModal.jsx';
import RescheduleModal from '../components/RescheduleModal.jsx';
import SettleModal from '../components/SettleModal.jsx';

const STATUS_TONES = {
  ACTIVE: 'blue',
  COMPLETED: 'emerald',
  CANCELLED: 'slate',
  DEFAULTED: 'rose',
  WRITTEN_OFF: 'rose',
};

const TABS = ['overview', 'schedule', 'payments', 'guarantors', 'documents'];
const TAB_SHORTCUTS = ['Alt+1', 'Alt+2', 'Alt+3', 'Alt+4', 'Alt+5'];
const COLLECT_PAYMENT_SHORTCUT = { alt: true, key: 'a', label: 'Alt+A' };
const DOWNLOAD_AGREEMENT_SHORTCUT = { alt: true, key: 'd', label: 'Alt+D' };

function matchesShortcut(event, shortcut) {
  return (
    event.key.toLowerCase() === shortcut.key &&
    Boolean(event.altKey) === Boolean(shortcut.alt) &&
    Boolean(event.shiftKey) === Boolean(shortcut.shift) &&
    Boolean(event.ctrlKey || event.metaKey) === Boolean(shortcut.ctrlOrMeta)
  );
}

export default function InstallmentPlanDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    t, can,
    collectInstallmentPayment, rescheduleInstallmentPlan, settleInstallmentPlan,
    writeOffInstallmentPlan, cancelInstallmentPlan,
    addInstallmentGuarantor, addInstallmentDocument, downloadInstallmentAgreementPdf,
  } = useInventoryApp();
  const { data, loading, error, refresh } = useInstallmentPlanDetailViewModel(id);
  const [activeTab, setActiveTab] = useState('overview');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [guarantorModalOpen, setGuarantorModalOpen] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [downloadingPdf, downloadPdf] = useAsyncAction();

  const canManage = can('manage_installment_plans');
  const canCollect = can('collect_installment_payment');
  const canReschedule = can('reschedule_installment_plan');
  const canCancel = can('cancel_installment_plan');
  const canWriteOff = can('write_off_installment_plan');
  const planIsActive = data?.plan?.status === 'ACTIVE';

  useEffect(() => {
    function handleKeyDown(event) {
      const isTabShortcut = event.altKey && !event.ctrlKey && !event.metaKey;
      const index = isTabShortcut ? Number(event.key) - 1 : -1;
      if (isTabShortcut && index >= 0 && index < TABS.length) {
        event.preventDefault();
        setActiveTab(TABS[index]);
        return;
      }
      if (matchesShortcut(event, COLLECT_PAYMENT_SHORTCUT) && canCollect && planIsActive && !paymentModalOpen) {
        event.preventDefault();
        setPaymentModalOpen(true);
      } else if (matchesShortcut(event, DOWNLOAD_AGREEMENT_SHORTCUT) && !downloadingPdf && data?.plan) {
        event.preventDefault();
        downloadPdf(() => downloadInstallmentAgreementPdf(data.plan.id));
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canCollect, planIsActive, paymentModalOpen, downloadingPdf, data, downloadPdf, downloadInstallmentAgreementPdf]);

  if (loading) {
    return <PageLoadingState title={t('installments.detail.loading')} />;
  }
  if (error || !data) {
    return <Alert type="error">{error || t('installments.detail.notFound')}</Alert>;
  }

  const { plan, schedule, payments, rescheduleLog, guarantors, documents } = data;
  const isActive = plan.status === 'ACTIVE';

  return (
    <div>
      <button type="button" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800" onClick={() => navigate('/installment-sales')}>
        <ArrowLeft size={16} />
        {t('installments.plans.title')}
      </button>

      <SectionHeader
        compact
        title={(
          <span className="inline-flex flex-wrap items-center gap-2">
            {plan.planNumber}
            {plan.customerName ? <span className="font-medium text-slate-400">· {plan.customerName}</span> : null}
            <Badge tone={STATUS_TONES[plan.status] || 'slate'}>{t(`installments.plans.status.${plan.status}`)}</Badge>
          </span>
        )}
        action={(
          <div className="flex flex-wrap gap-2">
            {canCollect && isActive ? (
              <button type="button" className="btn-primary" onClick={() => setPaymentModalOpen(true)}>
                <HandCoins size={16} />
                {t('installments.plans.collectPayment')}
                <kbd className="ml-1 rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200">Alt+A</kbd>
              </button>
            ) : null}
            {canReschedule && isActive ? (
              <button type="button" className="btn-secondary" onClick={() => setRescheduleModalOpen(true)}>
                {t('installments.detail.reschedule')}
              </button>
            ) : null}
            {canManage && isActive ? (
              <button type="button" className="btn-secondary" onClick={() => setSettleModalOpen(true)}>
                {t('installments.detail.settle')}
              </button>
            ) : null}
            {canWriteOff && isActive ? (
              <button type="button" className="btn-secondary text-rose-600" onClick={async () => { const result = await writeOffInstallmentPlan(plan); if (result?.ok) refresh(); }}>
                {t('installments.detail.writeOff')}
              </button>
            ) : null}
            {canCancel && isActive ? (
              <button type="button" className="btn-secondary text-rose-600" onClick={async () => { const result = await cancelInstallmentPlan(plan); if (result?.ok) refresh(); }}>
                {t('installments.detail.cancel')}
              </button>
            ) : null}
            <button
              type="button"
              className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => downloadPdf(() => downloadInstallmentAgreementPdf(plan.id))}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {t('installments.detail.downloadAgreement')}
              <kbd className="ml-1 rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500">Alt+D</kbd>
            </button>
          </div>
        )}
      />

      <div className="no-print mb-4 overflow-x-auto">
        <div className="inline-flex min-w-full gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:min-w-0">
          {TABS.map((tab, index) => {
            const selected = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                className={cx(
                  'flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-bold transition sm:flex-none',
                  selected ? 'border border-indigo-200 bg-indigo-50 text-indigo-800 shadow-sm ring-2 ring-indigo-100' : 'border border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800',
                )}
                aria-pressed={selected}
                onClick={() => setActiveTab(tab)}
              >
                {t(`installments.detail.tabs.${tab}`)}
                <kbd className={cx('rounded border px-1.5 py-0.5 text-[10px] font-black', selected ? 'border-indigo-200 bg-white text-indigo-700' : 'border-slate-200 bg-white text-slate-400')}>{TAB_SHORTCUTS[index]}</kbd>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'overview' ? (
        <PlanOverviewPanel plan={plan} rescheduleLog={rescheduleLog} onCreditSettingsChanged={refresh} />
      ) : null}

      {activeTab === 'schedule' ? (
        <div className="surface overflow-hidden">
          <PlanScheduleTable schedule={schedule} />
        </div>
      ) : null}

      {activeTab === 'payments' ? (
        <div className="surface overflow-hidden">
          <PlanPaymentsTable payments={payments} />
        </div>
      ) : null}

      {activeTab === 'guarantors' ? (
        <div className="surface overflow-hidden p-5">
          {canManage ? (
            <div className="mb-4 flex justify-end">
              <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => setGuarantorModalOpen(true)}>
                <Plus size={14} />
                {t('installments.guarantors.add')}
              </button>
            </div>
          ) : null}
          <GuarantorsList planId={plan.id} guarantors={guarantors} canManage={canManage} onChanged={refresh} />
        </div>
      ) : null}

      {activeTab === 'documents' ? (
        <div className="surface overflow-hidden p-5">
          {canManage ? (
            <div className="mb-4 flex justify-end">
              <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => setDocumentModalOpen(true)}>
                <Plus size={14} />
                {t('installments.documents.add')}
              </button>
            </div>
          ) : null}
          <DocumentsList planId={plan.id} documents={documents} canManage={canManage} onChanged={refresh} />
        </div>
      ) : null}

      {paymentModalOpen ? (
        <CollectPaymentModal
          plan={plan}
          onClose={() => setPaymentModalOpen(false)}
          onSave={async (payload) => {
            const result = await collectInstallmentPayment(payload);
            if (result.ok) {
              setPaymentModalOpen(false);
              refresh();
            }
            return result;
          }}
        />
      ) : null}

      {rescheduleModalOpen ? (
        <RescheduleModal
          plan={plan}
          onClose={() => setRescheduleModalOpen(false)}
          onSave={async (payload) => {
            const result = await rescheduleInstallmentPlan(plan.id, payload);
            if (result.ok) {
              setRescheduleModalOpen(false);
              refresh();
            }
            return result;
          }}
        />
      ) : null}

      {settleModalOpen ? (
        <SettleModal
          plan={plan}
          onClose={() => setSettleModalOpen(false)}
          onSave={async (payload) => {
            const result = await settleInstallmentPlan(plan.id, payload);
            if (result.ok) {
              setSettleModalOpen(false);
              refresh();
            }
            return result;
          }}
        />
      ) : null}

      {guarantorModalOpen ? (
        <GuarantorFormModal
          onClose={() => setGuarantorModalOpen(false)}
          onSave={async (payload) => {
            const result = await addInstallmentGuarantor(plan.id, payload);
            if (result.ok) {
              setGuarantorModalOpen(false);
              refresh();
            }
            return result;
          }}
        />
      ) : null}

      {documentModalOpen ? (
        <DocumentFormModal
          onClose={() => setDocumentModalOpen(false)}
          onSave={async (payload) => {
            const result = await addInstallmentDocument(plan.id, payload);
            if (result.ok) {
              setDocumentModalOpen(false);
              refresh();
            }
            return result;
          }}
        />
      ) : null}
    </div>
  );
}
