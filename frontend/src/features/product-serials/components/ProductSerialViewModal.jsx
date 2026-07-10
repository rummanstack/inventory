import { useNavigate } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { Badge, CopyableText, Modal } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatDate } from '../../../utils/calculations.js';
import { productSerialStatusTone } from '../../../models/inventoryViewData.js';

function Field({ label, value, copyValue }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <div className="mt-1"><CopyableText value={copyValue ?? value} copyLabel={label} displayValue={value} textClassName="text-sm font-semibold text-slate-950" /></div>
    </div>
  );
}

export default function ProductSerialViewModal({ serial, onClose }) {
  const { t } = useInventoryApp();
  const navigate = useNavigate();

  return (
    <Modal title={serial.serialNumber || serial.imei1 || serial.imei2} description={t('productSerials.viewDescription')} onClose={onClose} width="max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('products.product')} value={serial.productName} />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('productSerials.statusLabel')}</p>
          <p className="mt-1"><Badge tone={productSerialStatusTone(serial.status)}>{t(`productSerials.statuses.${serial.status}`)}</Badge></p>
        </div>
        <Field label={t('productSerials.serialNumberLabel')} value={serial.serialNumber} />
        <Field label={t('productSerials.imei1Label')} value={serial.imei1} />
        <Field label={t('productSerials.imei2Label')} value={serial.imei2} />
        <Field label="Serial ID" value={serial.id} />
        <Field label={t('productSerials.warrantyStartLabel')} value={formatDate(serial.warrantyStartDate)} />
        <Field label={t('productSerials.warrantyEndLabel')} value={formatDate(serial.warrantyEndDate)} />
        <div className="sm:col-span-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('productSerials.linkedInvoiceLabel')}</p>
          {serial.invoiceNumber ? (
            <button
              type="button"
              className="btn-secondary mt-1 h-9 px-3"
              onClick={() => {
                onClose();
                navigate(`/retailer/sales-invoices?invoiceNumber=${encodeURIComponent(serial.invoiceNumber)}`);
              }}
            >
              <Receipt size={15} />
              {serial.invoiceNumber}
            </button>
          ) : (
            <p className="mt-1 text-sm font-semibold text-slate-950">{t('productSerials.noLinkedInvoice')}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
