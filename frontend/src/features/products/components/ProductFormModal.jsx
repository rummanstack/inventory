import { Save } from 'lucide-react';
import { Alert, Modal } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { cleanNumber } from '../../../utils/calculations.js';
import { useFormState } from '../../../hooks/useFormState';

export default function ProductFormModal({ product, onClose, onSave }) {
  const { t, pushToast } = useInventoryApp();
  const isEdit = Boolean(product);
  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    name: product?.name || '',
    category: product?.category || '',
    piecesPerCase: product?.piecesPerCase || 24,
    purchasePrice: product?.purchasePrice || '',
    sellingPrice: product?.sellingPrice || '',
    orderIndex: product?.orderIndex != null ? product.orderIndex : '',
  });

  async function submitForm(event) {
    event.preventDefault();
    const piecesPerCase = cleanNumber(form.piecesPerCase);
    const purchasePrice = Number(form.purchasePrice);
    const sellingPrice = Number(form.sellingPrice);

    if (!form.name.trim() || !form.category.trim()) {
      setError(t('products.productNameCategoryRequired'));
      return;
    }
    if (piecesPerCase <= 0 || purchasePrice <= 0 || sellingPrice <= 0) {
      setError(t('products.caseSizePriceRequired'));
      return;
    }

    const payload = {
      id: product?.id,
      name: form.name.trim(),
      category: form.category.trim(),
      piecesPerCase,
      purchasePrice,
      sellingPrice,
      orderIndex: form.orderIndex === '' ? null : Number(form.orderIndex),
    };

    if (isEdit) {
      const unchanged =
        payload.name === product.name &&
        payload.category === product.category &&
        payload.piecesPerCase === product.piecesPerCase &&
        payload.purchasePrice === product.purchasePrice &&
        payload.sellingPrice === product.sellingPrice &&
        payload.orderIndex === (product.orderIndex ?? null);
      if (unchanged) {
        pushToast('info', t('products.editTitle'), t('alerts.noChanges'));
        return;
      }
    }

    setSaving(true);
    setError('');
    const result = await onSave(payload);
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || t('products.saveFailed'));
    }
  }

  return (
    <Modal title={isEdit ? t('products.editTitle') : t('products.addTitle')} description={t('products.modalDescription')} onClose={onClose}>
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t('products.productName')}</label>
            <input className="input" value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Enter product name" />
          </div>
          <div>
            <label className="label">{t('products.category')}</label>
            <input className="input" value={form.category} onChange={(event) => updateField('category', event.target.value)} placeholder="Enter category" />
          </div>
          <div>
            <label className="label">{t('products.piecesPerCase')}</label>
            <input className="input" type="number" min="1" value={form.piecesPerCase} onChange={(event) => updateField('piecesPerCase', event.target.value)} />
          </div>
          <div>
            <label className="label">{t('products.purchasePrice')}</label>
            <input className="input" type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(event) => updateField('purchasePrice', event.target.value)} />
          </div>
          <div>
            <label className="label">{t('products.sellingPrice')}</label>
            <input className="input" type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(event) => updateField('sellingPrice', event.target.value)} />
          </div>
          <div>
            <label className="label">{t('products.orderIndex')}</label>
            <input className="input" type="number" min="0" step="1" value={form.orderIndex} onChange={(event) => updateField('orderIndex', event.target.value)} placeholder="0" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? t('common.saving') : t('products.saveProduct')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
