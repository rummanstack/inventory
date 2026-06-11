import { Badge, Modal } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency } from '../../../utils/calculations.js';
import { statusTone } from '../../../models/inventoryViewData.js';

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value || '-'}</p>
    </div>
  );
}

export default function CustomerViewModal({ customer, onClose }) {
  const { t } = useInventoryApp();

  return (
    <Modal title={customer.shopName} description={t('customers.viewDescription')} onClose={onClose} width="max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('customers.shopNameLabel')} value={customer.shopName} />
        <Field label={t('customers.ownerNameLabel')} value={customer.ownerName} />
        <Field label={t('customers.phoneLabel')} value={customer.phone} />
        <Field label={t('customers.marketLabel')} value={customer.market} />
        <div className="sm:col-span-2">
          <Field label={t('customers.addressLabel')} value={customer.address} />
        </div>
        <Field label={t('customers.assignedDsrLabel')} value={customer.assignedDsrName || t('customers.unassigned')} />
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{t('customers.status')}</p>
          <p className="mt-1"><Badge tone={statusTone(customer.status === 'ACTIVE' ? 'Active' : 'Inactive')}>{customer.status === 'ACTIVE' ? t('customers.statusActive') : t('customers.statusInactive')}</Badge></p>
        </div>
        <Field label={t('customers.openingDueLabel')} value={formatCurrency(customer.openingDue)} />
        <Field label={t('customers.currentDueLabel')} value={formatCurrency(customer.currentDue)} />
        <div className="sm:col-span-2">
          <Field label={t('customers.noteLabel')} value={customer.note} />
        </div>
      </div>
    </Modal>
  );
}
