import { Badge, Modal } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency } from '../../../utils/calculations.js';
import { statusTone } from '../../../models/inventoryViewData.js';

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value || '-'}</p>
    </div>
  );
}

export default function SupplierViewModal({ supplier, onClose }) {
  const { t } = useInventoryApp();

  return (
    <Modal title={supplier.name} description={t('suppliers.viewDescription')} onClose={onClose} width="max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('suppliers.nameLabel')} value={supplier.name} />
        <Field label={t('suppliers.phoneLabel')} value={supplier.phone} />
        <div className="sm:col-span-2">
          <Field label={t('suppliers.addressLabel')} value={supplier.address} />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('suppliers.status')}</p>
          <p className="mt-1"><Badge tone={statusTone(supplier.status === 'ACTIVE' ? 'Active' : 'Inactive')}>{supplier.status === 'ACTIVE' ? t('suppliers.statusActive') : t('suppliers.statusInactive')}</Badge></p>
        </div>
        <Field label={t('suppliers.openingDueLabel')} value={formatCurrency(supplier.openingDue)} />
        <Field label={t('suppliers.currentDueLabel')} value={formatCurrency(supplier.currentDue)} />
        <div className="sm:col-span-2">
          <Field label={t('suppliers.noteLabel')} value={supplier.note} />
        </div>
      </div>
    </Modal>
  );
}
