import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Alert, Modal } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { cleanNumber } from '../../../utils/calculations.js';
import { useFormState } from '../../../hooks/useFormState';
import PhotoUploadField from '../../../components/PhotoUploadField.jsx';

export default function ProductFormModal({ product, onClose, onSave }) {
  const { t, pushToast, tenant } = useInventoryApp();
  const isEdit = Boolean(product);
  const isElectronics = (tenant?.businessType || 'ELECTRONICS') === 'ELECTRONICS';
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    name: product?.name || '',
    categoryId: product?.categoryId || '',
    piecesPerCase: product?.piecesPerCase || (isElectronics ? 1 : 24),
    purchasePrice: product?.purchasePrice || '',
    wholesalePrice: product?.wholesalePrice || '',
    retailPrice: product?.retailPrice || '',
    refundable: product?.refundable !== false,
    taxRate: product?.taxRate != null ? product.taxRate : '',
    orderIndex: product?.orderIndex != null ? product.orderIndex : '',
    reorderLevel: product?.reorderLevel != null ? product.reorderLevel : '',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    brand: product?.brand || '',
    model: product?.model || '',
    serialRequired: product?.serialRequired === true,
    warrantyMonths: product?.warrantyMonths || '',
    status: product?.status || 'ACTIVE',
    description: product?.description || '',
    imageUrl: product?.imageUrl || '',
  });

  useEffect(() => {
    inventoryApi.listCategories().then((result) => setCategories(result.categories || [])).catch(() => setCategories([]));
    inventoryApi.listBrands().then((result) => setBrands(result.brands || [])).catch(() => setBrands([]));
  }, []);

  async function submitForm(event) {
    event.preventDefault();
    const piecesPerCase = cleanNumber(form.piecesPerCase);
    const purchasePrice = Number(form.purchasePrice);
    const wholesalePrice = form.wholesalePrice === '' ? 0 : Number(form.wholesalePrice);
    const retailPrice = form.retailPrice === '' ? 0 : Number(form.retailPrice);
    const taxRate = form.taxRate === '' ? 0 : Number(form.taxRate);

    if (!form.name.trim() || !form.categoryId) {
      setError(t('products.productNameCategoryRequired'));
      return;
    }
    if (piecesPerCase <= 0 || purchasePrice <= 0) {
      setError(t('products.caseSizePriceRequired'));
      return;
    }

    const payload = {
      id: product?.id,
      name: form.name.trim(),
      categoryId: form.categoryId,
      piecesPerCase,
      purchasePrice,
      wholesalePrice,
      retailPrice,
      refundable: Boolean(form.refundable),
      taxRate,
      orderIndex: form.orderIndex === '' ? null : Number(form.orderIndex),
      reorderLevel: form.reorderLevel === '' ? null : cleanNumber(form.reorderLevel),
      sku: form.sku.trim(),
      barcode: form.barcode.trim(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      serialRequired: Boolean(form.serialRequired),
      warrantyMonths: form.warrantyMonths === '' ? 0 : cleanNumber(form.warrantyMonths),
      status: form.status,
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim() || null,
    };

    if (isEdit) {
      const unchanged =
        payload.name === product.name &&
        payload.categoryId === product.categoryId &&
        payload.piecesPerCase === product.piecesPerCase &&
        payload.purchasePrice === product.purchasePrice &&
        payload.wholesalePrice === (product.wholesalePrice || 0) &&
        payload.retailPrice === (product.retailPrice || 0) &&
        payload.refundable === (product.refundable !== false) &&
        payload.taxRate === (product.taxRate || 0) &&
        payload.orderIndex === (product.orderIndex ?? null) &&
        payload.reorderLevel === (product.reorderLevel ?? null) &&
        payload.sku === (product.sku || '') &&
        payload.barcode === (product.barcode || '') &&
        payload.brand === (product.brand || '') &&
        payload.model === (product.model || '') &&
        payload.serialRequired === (product.serialRequired === true) &&
        payload.warrantyMonths === (product.warrantyMonths || 0) &&
        payload.status === (product.status || 'ACTIVE') &&
        payload.description === (product.description || '') &&
        payload.imageUrl === (product.imageUrl ?? null);
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
        <PhotoUploadField
          label={t('products.imageUrl')}
          value={form.imageUrl}
          onChange={(url) => updateField('imageUrl', url)}
          shape="square"
          disabled={saving}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t('products.productName')}</label>
            <input className="input" value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Enter product name" />
          </div>
          <div>
            <label className="label">{t('products.category')}</label>
            <select className="input" value={form.categoryId} onChange={(event) => updateField('categoryId', event.target.value)}>
              <option value="">{t('categories.selectCategory')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          {isElectronics ? (
            <>
              <div>
                <label className="label">{t('products.brand')}</label>
                <select className="input" value={form.brand} onChange={(event) => updateField('brand', event.target.value)}>
                  <option value="">{t('brands.selectBrand')}</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.name}>{brand.name}</option>
                  ))}
                  {form.brand && !brands.some((b) => b.name.toLowerCase() === form.brand.toLowerCase()) ? (
                    <option value={form.brand}>{form.brand}</option>
                  ) : null}
                </select>
              </div>
              <div>
                <label className="label">{t('products.model')}</label>
                <input className="input" value={form.model} onChange={(event) => updateField('model', event.target.value)} />
              </div>
            </>
          ) : null}
          <div>
            <label className="label">{t('products.sku')}</label>
            <input className="input" value={form.sku} onChange={(event) => updateField('sku', event.target.value)} />
          </div>
          <div>
            <label className="label">{t('products.barcode')}</label>
            <input className="input" value={form.barcode} onChange={(event) => updateField('barcode', event.target.value)} />
          </div>
          {!isElectronics ? (
            <div>
              <label className="label">{t('products.piecesPerCase')}</label>
              <input className="input" type="number" min="1" value={form.piecesPerCase} onChange={(event) => updateField('piecesPerCase', event.target.value)} />
            </div>
          ) : null}
          <div>
            <label className="label">{t('products.purchasePrice')}</label>
            <input className="input" type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(event) => updateField('purchasePrice', event.target.value)} />
          </div>
          <div>
            <label className="label">{t('products.wholesalePrice')}</label>
            <input className="input" type="number" min="0" step="0.01" value={form.wholesalePrice} onChange={(event) => updateField('wholesalePrice', event.target.value)} />
          </div>
          <div>
            <label className="label">{t('products.retailPrice')}</label>
            <input className="input" type="number" min="0" step="0.01" value={form.retailPrice} onChange={(event) => updateField('retailPrice', event.target.value)} />
          </div>
          <div>
            <label className="label">{t('retailer.shared.taxRateLabel')}</label>
            <input className="input" type="number" min="0" max="100" step="0.01" value={form.taxRate} onChange={(event) => updateField('taxRate', event.target.value)} />
            <p className="mt-1 text-xs text-slate-500">{t('products.taxRateHint')}</p>
          </div>
          {isElectronics ? (
            <div>
              <label className="label">{t('products.warrantyMonths')}</label>
              <input className="input" type="number" min="0" step="1" value={form.warrantyMonths} onChange={(event) => updateField('warrantyMonths', event.target.value)} placeholder="0" />
            </div>
          ) : null}
          <div>
            <label className="label">{t('products.status')}</label>
            <select className="input" value={form.status} onChange={(event) => updateField('status', event.target.value)}>
              <option value="ACTIVE">{t('products.statusActive')}</option>
              <option value="INACTIVE">{t('products.statusInactive')}</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input
                className="mt-1 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                type="checkbox"
                checked={Boolean(form.refundable)}
                onChange={(event) => updateField('refundable', event.target.checked)}
              />
              <span>
                <span className="block font-semibold text-slate-950">{t('products.refundable')}</span>
                <span className="mt-0.5 block text-xs font-medium text-slate-500">{t('products.refundableHint')}</span>
              </span>
            </label>
          </div>
          {isElectronics ? (
            <div className="sm:col-span-2">
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                  type="checkbox"
                  checked={Boolean(form.serialRequired)}
                  onChange={(event) => updateField('serialRequired', event.target.checked)}
                />
                <span>
                  <span className="block font-semibold text-slate-950">{t('products.serialRequired')}</span>
                  <span className="mt-0.5 block text-xs font-medium text-slate-500">{t('products.serialRequiredHint')}</span>
                </span>
              </label>
            </div>
          ) : null}
          <div>
            <label className="label">{t('products.orderIndex')}</label>
            <input className="input" type="number" min="0" step="1" value={form.orderIndex} onChange={(event) => updateField('orderIndex', event.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="label">{t('products.reorderLevel')}</label>
            <input className="input" type="number" min="0" step="1" value={form.reorderLevel} onChange={(event) => updateField('reorderLevel', event.target.value)} placeholder="auto" />
            <p className="mt-1 text-xs text-slate-500">{t('products.reorderLevelHint')}</p>
          </div>
          <div className="sm:col-span-2">
            <label className="label">{t('products.productDescription')}</label>
            <textarea
              className="input min-h-[80px]"
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
            />
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
