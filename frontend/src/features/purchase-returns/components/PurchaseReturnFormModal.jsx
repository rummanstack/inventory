import { useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Alert, Modal, Select } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, formatNumber, todayISO } from '../../../utils/calculations.js';
import { useFormState } from '../../../hooks/useFormState';

function emptyItem() {
  return { key: Math.random().toString(36).slice(2), productId: '', quantityPieces: '', unitPrice: '' };
}

export default function PurchaseReturnFormModal({ onClose, onSave }) {
  const { t, supplierDirectory, productDirectory } = useInventoryApp();
  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    supplierId: '',
    returnDate: todayISO(),
    note: '',
  });
  const [items, setItems] = useState([emptyItem()]);

  const selectedSupplier = supplierDirectory.find((supplier) => supplier.id === form.supplierId) || null;
  const currentDue = Number(selectedSupplier?.currentDue || 0);
  const productById = new Map(productDirectory.map((product) => [product.id, product]));

  function updateItem(key, field, value) {
    setItems((current) => current.map((item) => {
      if (item.key !== key) return item;
      const next = { ...item, [field]: value };
      // Picking a product pre-fills the unit price from its purchase price
      if (field === 'productId') {
        const product = productById.get(value);
        next.unitPrice = product ? String(product.purchasePrice ?? '') : '';
      }
      return next;
    }));
  }

  function removeItem(key) {
    setItems((current) => (current.length > 1 ? current.filter((item) => item.key !== key) : current));
  }

  const lines = items
    .filter((item) => item.productId && Number(item.quantityPieces) > 0)
    .map((item) => ({
      productId: item.productId,
      quantityPieces: Number(item.quantityPieces),
      unitPrice: item.unitPrice === '' ? null : Number(item.unitPrice),
    }));
  const totalAmount = lines.reduce((sum, line) => {
    const product = productById.get(line.productId);
    const unitPrice = line.unitPrice ?? Number(product?.purchasePrice || 0);
    return sum + line.quantityPieces * unitPrice;
  }, 0);
  const dueAfterReturn = currentDue - totalAmount;

  async function submitForm(event) {
    event.preventDefault();

    if (!form.supplierId) {
      setError(t('purchaseReturns.supplierRequired'));
      return;
    }
    if (!lines.length) {
      setError(t('purchaseReturns.itemsRequired'));
      return;
    }
    for (const line of lines) {
      const product = productById.get(line.productId);
      const available = Number(product?.stockPieces || 0);
      if (line.quantityPieces > available) {
        setError(
          t('purchaseReturns.stockExceeded')
            .replace('{name}', product?.name || '')
            .replace('{available}', formatNumber(available)),
        );
        return;
      }
    }

    setSaving(true);
    setError('');
    const result = await onSave({
      supplierId: form.supplierId,
      returnDate: form.returnDate,
      items: lines,
      note: form.note.trim(),
    });
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || t('purchaseReturns.saveFailed'));
    }
  }

  return (
    <Modal title={t('purchaseReturns.addTitle')} description={t('purchaseReturns.modalDescription')} onClose={onClose} width="max-w-3xl">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t('purchaseReturns.supplierLabel')}</label>
            <Select className="input" value={form.supplierId} onChange={(event) => updateField('supplierId', event.target.value)}>
              <option value="">{t('purchaseReturns.selectSupplier')}</option>
              {supplierDirectory.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">{t('purchaseReturns.returnDateLabel')}</label>
            <DatePickerField value={form.returnDate} onChange={(value) => updateField('returnDate', value)} max={new Date().toISOString().slice(0, 10)} />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="label">{t('purchaseReturns.itemsLabel')}</label>
            <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => setItems((current) => [...current, emptyItem()])}>
              <Plus size={14} />
              {t('purchaseReturns.addItem')}
            </button>
          </div>
          <div className="space-y-2">
            {items.map((item) => {
              const product = productById.get(item.productId);
              return (
                <div key={item.key} className="grid gap-2 rounded-2xl border border-slate-200 p-3 sm:grid-cols-[1fr_110px_130px_130px_40px] sm:items-center">
                  <Select className="input" value={item.productId} onChange={(event) => updateItem(item.key, 'productId', event.target.value)}>
                    <option value="">{t('purchaseReturns.selectProduct')}</option>
                    {productDirectory.map((option) => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </Select>
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    placeholder={t('purchaseReturns.quantity')}
                    value={item.quantityPieces}
                    onChange={(event) => updateItem(item.key, 'quantityPieces', event.target.value)}
                  />
                  <input
                    className="input"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.0001"
                    placeholder={t('purchaseReturns.unitPrice')}
                    value={item.unitPrice}
                    onChange={(event) => updateItem(item.key, 'unitPrice', event.target.value)}
                  />
                  <div className="text-right text-sm font-semibold text-slate-700">
                    {product ? (
                      <span className="muted-chip" title={t('purchaseReturns.stockAvailable')}>
                        {formatNumber(product.stockPieces || 0)} {t('purchaseReturns.inStock')}
                      </span>
                    ) : null}
                  </div>
                  <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={() => removeItem(item.key)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {selectedSupplier ? (
          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('suppliers.currentDueLabel')}</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">{formatCurrency(currentDue)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('purchaseReturns.totalAmount')}</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">{formatCurrency(totalAmount)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('purchaseReturns.dueAfterReturnLabel')}</p>
              <p className={`mt-1 text-lg font-semibold ${dueAfterReturn < 0 ? 'text-blue-700' : 'text-emerald-700'}`}>
                {dueAfterReturn < 0
                  ? `${formatCurrency(Math.abs(dueAfterReturn))} ${t('purchaseReturns.advanceLabel')}`
                  : formatCurrency(dueAfterReturn)}
              </p>
            </div>
          </div>
        ) : null}

        <div>
          <label className="label">{t('purchaseReturns.noteLabel')}</label>
          <textarea className="input min-h-20" value={form.note} onChange={(event) => updateField('note', event.target.value)} placeholder={t('purchaseReturns.noteLabel')} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? t('common.saving') : t('purchaseReturns.saveReturn')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
