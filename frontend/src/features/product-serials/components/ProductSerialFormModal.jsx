import { useState } from 'react';
import { Camera, Save } from 'lucide-react';
import { Alert, BarcodeScannerModal, Modal, Select } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { useFormState } from '../../../hooks/useFormState';

const STATUS_VALUES = ['IN_STOCK', 'SOLD', 'RETURNED', 'DAMAGED', 'WARRANTY', 'DELETED'];

export default function ProductSerialFormModal({ serial, onClose, onSave }) {
  const { t, productDirectory } = useInventoryApp();
  const isEdit = Boolean(serial);
  const serialRequiredProducts = productDirectory.filter(
    (product) => product.serialRequired || product.id === serial?.productId,
  );
  const [showScanner, setShowScanner] = useState(false);
  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    productId: serial?.productId || serialRequiredProducts[0]?.id || '',
    serialNumber: serial?.serialNumber || '',
    imei1: serial?.imei1 || '',
    imei2: serial?.imei2 || '',
    barcode: serial?.barcode || '',
    purchasePrice: serial?.purchasePrice ?? '',
    salePrice: serial?.salePrice ?? '',
    status: serial?.status || 'IN_STOCK',
  });

  async function submitForm(event) {
    event.preventDefault();

    if (!form.productId) {
      setError(t('productSerials.productRequired'));
      return;
    }
    if (!form.serialNumber.trim() && !form.imei1.trim() && !form.imei2.trim()) {
      setError(t('productSerials.valueRequired'));
      return;
    }

    const payload = {
      id: serial?.id,
      productId: form.productId,
      serialNumber: form.serialNumber.trim(),
      imei1: form.imei1.trim(),
      imei2: form.imei2.trim(),
      barcode: form.barcode.trim(),
      purchasePrice: form.purchasePrice === '' ? null : form.purchasePrice,
      salePrice: form.salePrice === '' ? null : form.salePrice,
      status: form.status,
      // Pass through link/warranty fields untouched so editing serial/IMEI text or status
      // doesn't wipe out the sale link this serial already carries.
      salesInvoiceId: serial?.salesInvoiceId || null,
      salesInvoiceItemId: serial?.salesInvoiceItemId || null,
      warrantyStartDate: serial?.warrantyStartDate || null,
      warrantyEndDate: serial?.warrantyEndDate || null,
    };

    setSaving(true);
    setError('');
    const result = await onSave(payload);
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || t('productSerials.saveFailed'));
    }
  }

  return (
    <Modal title={isEdit ? t('productSerials.editTitle') : t('productSerials.addTitle')} description={t('productSerials.modalDescription')} onClose={onClose}>
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">{t('products.product')}</label>
            <Select className="input" value={form.productId} onChange={(event) => updateField('productId', event.target.value)} disabled={isEdit}>
              <option value="">{t('productSerials.selectProduct')}</option>
              {serialRequiredProducts.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </Select>
            {!serialRequiredProducts.length ? (
              <p className="mt-1 text-xs font-semibold text-rose-600">{t('productSerials.noSerialProducts')}</p>
            ) : null}
          </div>
          <div>
            <label className="label">{t('productSerials.serialNumberLabel')}</label>
            <input className="input" value={form.serialNumber} onChange={(event) => updateField('serialNumber', event.target.value)} />
          </div>
          <div>
            <label className="label">{t('productSerials.imei1Label')}</label>
            <input className="input" value={form.imei1} onChange={(event) => updateField('imei1', event.target.value)} />
          </div>
          <div>
            <label className="label">{t('productSerials.imei2Label')}</label>
            <input className="input" value={form.imei2} onChange={(event) => updateField('imei2', event.target.value)} />
          </div>
          <div>
            <label className="label">{t('productSerials.barcodeLabel')}</label>
            <div className="flex gap-2">
              <input className="input" value={form.barcode} onChange={(event) => updateField('barcode', event.target.value)} placeholder={isEdit ? '' : t('productSerials.barcodeAutoHint')} />
              <button type="button" className="icon-btn shrink-0" title={t('common.scan')} onClick={() => setShowScanner(true)}>
                <Camera size={16} />
              </button>
            </div>
          </div>
          <div>
            <label className="label">{t('productSerials.purchasePriceLabel')}</label>
            <input className="input" type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(event) => updateField('purchasePrice', event.target.value)} />
          </div>
          <div>
            <label className="label">{t('productSerials.salePriceLabel')}</label>
            <input className="input" type="number" min="0" step="0.01" value={form.salePrice} onChange={(event) => updateField('salePrice', event.target.value)} />
          </div>
          <div>
            <label className="label">{t('productSerials.statusLabel')}</label>
            <Select className="input" value={form.status} onChange={(event) => updateField('status', event.target.value)}>
              {STATUS_VALUES.map((value) => (
                <option key={value} value={value}>{t(`productSerials.statuses.${value}`)}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? t('common.saving') : t('productSerials.saveSerial')}
          </button>
        </div>
      </form>

      {showScanner && (
        <BarcodeScannerModal
          onClose={() => setShowScanner(false)}
          onDetected={(code) => {
            updateField('barcode', code);
            setShowScanner(false);
          }}
        />
      )}
    </Modal>
  );
}

