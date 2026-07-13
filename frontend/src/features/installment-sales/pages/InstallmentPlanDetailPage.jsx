import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, HandCoins, Loader2, Plus } from 'lucide-react';
import { Alert, Badge, PageLoadingState, SectionHeader } from '../../../components/ui.jsx';
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
        eyebrow={t('installments.plans.eyebrow')}
        title={(
          <span className="inline-flex items-center gap-2">
            {plan.planNumber}
            <Badge tone={STATUS_TONES[plan.status] || 'slate'}>{t(`installments.plans.status.${plan.status}`)}</Badge>
          </span>
        )}
        description={plan.customerName}
        action={(
          <div className="flex flex-wrap gap-2">
            {canCollect && isActive ? (
              <button type="button" className="btn-primary" onClick={() => setPaymentModalOpen(true)}>
                <HandCoins size={16} />
                {t('installments.plans.collectPayment')}
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
            </button>
          </div>
        )}
      />

      <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-100">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`border-b-2 px-3 py-2 text-sm font-semibold transition ${activeTab === tab ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            onClick={() => setActiveTab(tab)}
          >
            {t(`installments.detail.tabs.${tab}`)}
          </button>
        ))}
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
