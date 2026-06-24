import { useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { Alert, Modal } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { useFormState } from '../../../hooks/useFormState';

const QUOTATION_STATUS_VALUES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'];

function emptyItem() {
  return { _key: Math.random(), productId: '', productName: '', quantity: 1, unitPrice: 0, discountAmount: 0 };
}

function itemTotal(item) {
  const qty = Math.max(0.001, Number(item.quantity) || 0);
  const price = Math.max(0, Number(item.unitPrice) || 0);
  const disc = Math.max(0, Number(item.discountAmount) || 0);
  return Math.max(0, qty * price - disc);
}

export default function QuotationFormModal({ quotation, onClose, onSave }) {
  const { t, productDirectory } = useInventoryApp();
  const isEdit = Boolean(quotation);
  const today = new Date().toISOString().slice(0, 10);

  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    customerName: quotation?.customerName || '',
    customerPhone: quotation?.customerPhone || '',
    customerEmail: quotation?.customerEmail || '',
    quoteDate: quotation?.quoteDate ? String(quotation.quoteDate).slice(0, 10) : today,
    validityDays: quotation?.validityDays ?? 7,
    status: quotation?.status || 'DRAFT',
    discountAmount: quotation?.discountAmount ?? 0,
    taxRate: quotation?.taxRate ?? 0,
    notes: quotation?.notes || '',
  });

  const [items, setItems] = useState(() => {
    if (quotation?.items?.length) {
      return quotation.items.map((item) => ({
        _key: Math.random(),
        productId: item.productId || '',
        productName: item.productName || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount || 0,
      }));
    }
    return [emptyItem()];
  });

  function updateItem(index, field, value) {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === 'productId' && value) {
        const product = productDirectory.find((p) => p.id === value);
        if (product) {
          next[index].productName = product.name;
          next[index].unitPrice = product.salePrice ?? product.price ?? 0;
        }
      }
      return next;
    });
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const subtotal = items.reduce((sum, item) => sum + itemTotal(item), 0);
  const discount = Math.max(0, Number(form.discountAmount) || 0);
  const taxRate = Math.max(0, Number(form.taxRate) || 0);
  const afterDiscount = Math.max(0, subtotal - discount);
  const taxAmount = Math.round(afterDiscount * taxRate / 100 * 100) / 100;
  const totalAmount = afterDiscount + taxAmount;

  async function submitForm(event) {
    event.preventDefault();

    const validItems = items.filter((item) => item.productName?.trim() || item.productId);
    if (validItems.length === 0) {
      setError(t('quotations.itemsLabel') + ': at least one item required');
      return;
    }

    const payload = {
      ...(isEdit ? { id: quotation.id } : {}),
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      customerEmail: form.customerEmail.trim(),
      quoteDate: form.quoteDate,
      validityDays: Number(form.validityDays) || 7,
      status: isEdit ? form.status : 'DRAFT',
      discountAmount: Number(form.discountAmount) || 0,
      taxRate: Number(form.taxRate) || 0,
      notes: form.notes.trim(),
      items: validItems.map((item) => ({
        id: item.id || undefined,
        productId: item.productId || null,
        productName: (item.productName || item.productId || '').trim() || 'Item',
        quantity: Math.max(0.001, Number(item.quantity) || 1),
        unitPrice: Math.max(0, Number(item.unitPrice) || 0),
        discountAmount: Math.max(0, Number(item.discountAmount) || 0),
      })),
    };

    setSaving(true);
    setError('');
    const result = await onSave(payload);
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || t('quotations.saveFailed'));
    }
  }

  return (
    <Modal
      title={isEdit ? t('quotations.editTitle') : t('quotations.addTitle')}
      description={t('quotations.modalDescription')}
      onClose={onClose}
      width="max-w-3xl"
    >
      <form className="space-y-5" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}

        {/* Customer info */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">{t('quotations.customerNameLabel')}</label>
            <input
              className="input"
              value={form.customerName}
              onChange={(e) => updateField('customerName', e.target.value)}
              placeholder={t('quotations.customerNamePlaceholder')}
            />
          </div>
          <div>
            <label className="label">{t('quotations.customerPhoneLabel')}</label>
            <input
              className="input"
              value={form.customerPhone}
              onChange={(e) => updateField('customerPhone', e.target.value)}
              placeholder="+880..."
            />
          </div>
          <div>
            <label className="label">{t('quotations.customerEmailLabel')}</label>
            <input
              className="input"
              type="email"
              value={form.customerEmail}
              onChange={(e) => updateField('customerEmail', e.target.value)}
              placeholder="customer@email.com"
            />
          </div>
        </div>

        {/* Date + validity + status */}
        <div className="grid gap-4 sm:grid-cols-3">
          <DatePickerField
            label={t('quotations.quoteDateLabel')}
            value={form.quoteDate}
            onChange={(v) => updateField('quoteDate', v)}
          />
          <div>
            <label className="label">{t('quotations.validityDaysLabel')}</label>
            <input
              className="input"
              type="number"
              min="1"
              value={form.validityDays}
              onChange={(e) => updateField('validityDays', e.target.value)}
            />
          </div>
          {isEdit && (
            <div>
              <label className="label">{t('quotations.statusLabel')}</label>
              <select className="input" value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                {QUOTATION_STATUS_VALUES.map((s) => (
                  <option key={s} value={s}>{t(`quotations.statuses.${s}`)}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Items table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">{t('quotations.itemsLabel')}</label>
            <button type="button" className="btn btn-ghost text-xs" onClick={addItem}>
              <Plus className="h-3.5 w-3.5" /> {t('quotations.addItem')}
            </button>
          </div>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                <tr>
                  <th className="px-3 py-2 w-[35%]">{t('quotations.itemProductLabel')}</th>
                  <th className="px-3 py-2 w-[12%] text-right">{t('quotations.itemQtyLabel')}</th>
                  <th className="px-3 py-2 w-[18%] text-right">{t('quotations.itemPriceLabel')}</th>
                  <th className="px-3 py-2 w-[18%] text-right">{t('quotations.itemDiscountLabel')}</th>
                  <th className="px-3 py-2 w-[14%] text-right">{t('quotations.itemTotalLabel')}</th>
                  <th className="px-3 py-2 w-[3%]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, i) => (
                  <tr key={item._key}>
                    <td className="px-2 py-1.5">
                      <select
                        className="input py-1 text-sm"
                        value={item.productId}
                        onChange={(e) => updateItem(i, 'productId', e.target.value)}
                      >
                        <option value="">— {t('quotations.itemProductPlaceholder')} —</option>
                        {productDirectory.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      {!item.productId && (
                        <input
                          className="input py-1 text-sm mt-1"
                          placeholder="Custom item name"
                          value={item.productName}
                          onChange={(e) => updateItem(i, 'productName', e.target.value)}
                        />
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        className="input py-1 text-sm text-right"
                        type="number"
                        min="0.001"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        className="input py-1 text-sm text-right"
                        type="number"
                        min="0"
                        step="any"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(i, 'unitPrice', e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        className="input py-1 text-sm text-right"
                        type="number"
                        min="0"
                        step="any"
                        value={item.discountAmount}
                        onChange={(e) => updateItem(i, 'discountAmount', e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right text-slate-900 font-medium">
                      {itemTotal(item).toLocaleString()}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(i)}
                          className="text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Discount / Tax / Total */}
        <div className="grid gap-4 sm:grid-cols-3 items-end">
          <div>
            <label className="label">{t('quotations.discountLabel')}</label>
            <input
              className="input"
              type="number"
              min="0"
              step="any"
              value={form.discountAmount}
              onChange={(e) => updateField('discountAmount', e.target.value)}
            />
          </div>
          <div>
            <label className="label">{t('quotations.taxRateLabel')}</label>
            <input
              className="input"
              type="number"
              min="0"
              step="any"
              value={form.taxRate}
              onChange={(e) => updateField('taxRate', e.target.value)}
            />
          </div>
          <div className="rounded-xl bg-slate-900 text-white px-4 py-3 text-right">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{t('quotations.totalLabel')}</p>
            <p className="text-xl font-bold">{totalAmount.toLocaleString()}</p>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="label">{t('quotations.notesLabel')}</label>
          <textarea
            className="input min-h-[72px]"
            value={form.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder={t('quotations.notesPlaceholder')}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? t('common.saving') : t('quotations.saveQuotation')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
