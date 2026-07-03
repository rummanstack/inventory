import { useState } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { Alert, Modal, Select } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { useFormState } from '../../../hooks/useFormState';
import { formatCurrency } from '../../../utils/calculations.js';

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
  const { t, productDirectory, language } = useInventoryApp();
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
          <div>
            <label className="label">{t('quotations.quoteDateLabel')}</label>
            <DatePickerField
              value={form.quoteDate}
              onChange={(v) => updateField('quoteDate', v)}
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>
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
          {isEdit ? (
            <div>
              <label className="label">{t('quotations.statusLabel')}</label>
              <Select className="input" value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                {QUOTATION_STATUS_VALUES.map((s) => (
                  <option key={s} value={s}>{t(`quotations.statuses.${s}`)}</option>
                ))}
              </Select>
            </div>
          ) : null}
        </div>

        {/* Items table */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="label mb-0">{t('quotations.itemsLabel')}</label>
            <button type="button" className="btn-secondary py-1 text-xs" onClick={addItem}>
              <Plus size={14} />
              {t('quotations.addItem')}
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-3 py-2 w-[35%] text-left">{t('quotations.itemProductLabel')}</th>
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
                      <Select
                        className="input py-1 text-sm"
                        value={item.productId}
                        onChange={(e) => updateItem(i, 'productId', e.target.value)}
                      >
                        <option value="">— {t('quotations.itemProductPlaceholder')} —</option>
                        {productDirectory.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </Select>
                      {!item.productId ? (
                        <input
                          className="input py-1 text-sm mt-1"
                          placeholder={t('quotations.customItemNamePlaceholder')}
                          value={item.productName}
                          onChange={(e) => updateItem(i, 'productName', e.target.value)}
                        />
                      ) : null}
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
                    <td className="px-2 py-1.5 text-right font-semibold text-slate-900">
                      {formatCurrency(itemTotal(item), language)}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {items.length > 1 ? (
                        <button
                          type="button"
                          className="text-slate-300 hover:text-rose-500 transition-colors"
                          onClick={() => removeItem(i)}
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Discount / Tax / Total summary */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 min-w-[220px]">
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between gap-8">
                <span className="text-slate-500">{t('quotations.subtotalLabel')}</span>
                <span className="font-semibold text-slate-800">{formatCurrency(subtotal, language)}</span>
              </div>
              {discount > 0 ? (
                <div className="flex items-center justify-between gap-8">
                  <span className="text-slate-500">{t('quotations.discountLabel')}</span>
                  <span className="font-semibold text-rose-600">- {formatCurrency(discount, language)}</span>
                </div>
              ) : null}
              {taxAmount > 0 ? (
                <div className="flex items-center justify-between gap-8">
                  <span className="text-slate-500">{t('quotations.taxRateLabel')} ({taxRate}%)</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(taxAmount, language)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-8 border-t border-slate-200 pt-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{t('quotations.totalLabel')}</span>
                <span className="text-lg font-semibold text-slate-950">{formatCurrency(totalAmount, language)}</span>
              </div>
            </div>
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
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? t('common.saving') : t('quotations.saveQuotation')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

