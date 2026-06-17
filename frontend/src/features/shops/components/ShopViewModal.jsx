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

export default function ShopViewModal({ shop, onClose }) {
  const { t } = useInventoryApp();

  return (
    <Modal title={shop.shopName} description={t('shops.viewDescription')} onClose={onClose} width="max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('shops.shopNameLabel')} value={shop.shopName} />
        <Field label={t('shops.ownerNameLabel')} value={shop.ownerName} />
        <Field label={t('shops.phoneLabel')} value={shop.phone} />
        <Field label={t('shops.marketLabel')} value={shop.market} />
        <div className="sm:col-span-2">
          <Field label={t('shops.addressLabel')} value={shop.address} />
        </div>
        <Field label={t('shops.assignedDsrLabel')} value={shop.assignedDsrName || t('shops.unassigned')} />
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{t('shops.status')}</p>
          <p className="mt-1"><Badge tone={statusTone(shop.status === 'ACTIVE' ? 'Active' : 'Inactive')}>{shop.status === 'ACTIVE' ? t('shops.statusActive') : t('shops.statusInactive')}</Badge></p>
        </div>
        <Field label={t('shops.openingDueLabel')} value={formatCurrency(shop.openingDue)} />
        <Field label={t('shops.currentDueLabel')} value={formatCurrency(shop.currentDue)} />
        <div className="sm:col-span-2">
          <Field label={t('shops.noteLabel')} value={shop.note} />
        </div>
      </div>
    </Modal>
  );
}
