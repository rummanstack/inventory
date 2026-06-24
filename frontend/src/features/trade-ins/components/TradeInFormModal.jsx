import { useState } from 'react';
import { CheckCircle2, Plus, Save, Trash2 } from 'lucide-react';
import { Alert, Modal } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { useFormState } from '../../../hooks/useFormState';
import { formatCurrency, formatDate } from '../../../utils/calculations.js';

const CONDITIONS = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'];
const PAYMENT_METHODS = ['CASH', 'CARD', 'MOBILE_BANKING', 'BANK_TRANSFER', 'CREDIT'];

function emptyReceived() {
  return { _key: Math.random(), productId: '', productName: '', serialNumber: '', condition: 'GOOD', quantity: 1, tradeInValue: 0 };
}

function emptySold() {
  return { _key: Math.random(), productId: '', productName: '', quantity: 1, unitPrice: 0 };
}

function TradeInReceipt({ receipt, onClose }) {
  const totalTradeIn = receipt.receivedItems.reduce((s, i) => s + Number(i.tradeInValue || 0), 0);
  const totalSale = receipt.soldItems.reduce((s, i) => s + (Number(i.quantity) || 1) * (Number(i.unitPrice) || 0), 0);
  const net = totalSale - totalTradeIn;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
        <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={22} />
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">Trade-In Saved</p>
          <p className="mt-0.5 text-xl font-black text-emerald-900">{receipt.tradeInNumber}</p>
          <p className="mt-1 text-sm text-emerald-700">
            {receipt.customerName ? <strong>{receipt.customerName}</strong> : 'Walk-in customer'}
            {receipt.customerPhone ? <span className="ml-2 font-normal text-emerald-600">{receipt.customerPhone}</span> : null}
          </p>
          <p className="mt-0.5 text-xs text-emerald-600">{formatDate(receipt.tradeInDate)}</p>
        </div>
      </div>

      {/* Devices taken in */}
      <div>
        <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">Devices Taken In</p>
        <div className="rounded-xl border border-emerald-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-emerald-50">
              <tr className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-600 text-left">
                <th className="px-3 py-2">Device</th>
                <th className="px-3 py-2">Serial</th>
                <th className="px-3 py-2">Condition</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100">
              {receipt.receivedItems.map((item, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 font-medium text-slate-900">{item.productName || item.productId || '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{item.serialNumber || '—'}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{item.condition}</td>
                  <td className="px-3 py-2 text-right">{item.quantity}</td>
                  <td className="px-3 py-2 text-right font-semibold text-emerald-700">{formatCurrency(Number(item.tradeInValue || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Devices sold */}
      <div>
        <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">Devices Sold</p>
        <div className="rounded-xl border border-indigo-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-indigo-50">
              <tr className="text-[11px] font-black uppercase tracking-[0.12em] text-indigo-600 text-left">
                <th className="px-3 py-2">Device</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Unit Price</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-100">
              {receipt.soldItems.map((item, i) => {
                const lineTotal = (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0);
                return (
                  <tr key={i}>
                    <td className="px-3 py-2 font-medium text-slate-900">{item.productName || item.productId || '—'}</td>
                    <td className="px-3 py-2 text-right">{item.quantity}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{formatCurrency(Number(item.unitPrice || 0))}</td>
                    <td className="px-3 py-2 text-right font-semibold text-indigo-700">{formatCurrency(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-500">Trade-In Credit</p>
          <p className="mt-1 text-lg font-black text-emerald-700">{formatCurrency(totalTradeIn)}</p>
        </div>
        <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-indigo-500">Sale Total</p>
          <p className="mt-1 text-lg font-black text-indigo-700">{formatCurrency(totalSale)}</p>
        </div>
        <div className={`rounded-xl border px-4 py-3 text-center ${net >= 0 ? 'bg-slate-900 border-slate-900' : 'bg-amber-50 border-amber-200'}`}>
          <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${net >= 0 ? 'text-slate-400' : 'text-amber-500'}`}>
            {net >= 0 ? 'Customer Pays' : 'Shop Pays'}
          </p>
          <p className={`mt-1 text-lg font-black ${net >= 0 ? 'text-white' : 'text-amber-700'}`}>{formatCurrency(Math.abs(net))}</p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Payment Method</span>
        <span className="text-sm font-bold text-slate-900">{(receipt.paymentMethod || '').replace('_', ' ')}</span>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

export default function TradeInFormModal({ onClose, onSave }) {
  const { t, productDirectory } = useInventoryApp();
  const today = new Date().toISOString().slice(0, 10);

  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    customerName: '',
    customerPhone: '',
    tradeInDate: today,
    paymentMethod: 'CASH',
    notes: '',
  });

  const [receivedItems, setReceivedItems] = useState([emptyReceived()]);
  const [soldItems, setSoldItems] = useState([emptySold()]);
  const [savedReceipt, setSavedReceipt] = useState(null);

  function updateReceived(index, field, value) {
    setReceivedItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === 'productId' && value) {
        const p = productDirectory.find((x) => x.id === value);
        if (p) next[index].productName = p.name;
      }
      return next;
    });
  }

  function updateSold(index, field, value) {
    setSoldItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === 'productId' && value) {
        const p = productDirectory.find((x) => x.id === value);
        if (p) {
          next[index].productName = p.name;
          next[index].unitPrice = p.salePrice ?? p.price ?? 0;
        }
      }
      return next;
    });
  }

  const totalTradeInValue = receivedItems.reduce((sum, item) => sum + Math.max(0, Number(item.tradeInValue) || 0), 0);
  const totalSaleAmount = soldItems.reduce((sum, item) => {
    const qty = Math.max(0.001, Number(item.quantity) || 1);
    const price = Math.max(0, Number(item.unitPrice) || 0);
    return sum + qty * price;
  }, 0);
  const paymentAmount = totalSaleAmount - totalTradeInValue;

  async function submitForm(event) {
    event.preventDefault();

    const validReceived = receivedItems.filter((i) => (i.productId || i.productName?.trim()) && Number(i.tradeInValue) >= 0);
    const validSold = soldItems.filter((i) => i.productId || i.productName?.trim());

    if (validReceived.length === 0) {
      setError(t('tradeIns.receivedSectionLabel') + ': at least one device with a name is required.');
      return;
    }
    if (validSold.length === 0) {
      setError(t('tradeIns.soldSectionLabel') + ': at least one device is required.');
      return;
    }

    const payload = {
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      tradeInDate: form.tradeInDate,
      paymentMethod: form.paymentMethod,
      notes: form.notes.trim(),
      receivedItems: validReceived.map((item) => ({
        productId: item.productId || null,
        productName: (item.productName || '').trim() || 'Device',
        serialNumber: (item.serialNumber || '').trim(),
        condition: item.condition || 'GOOD',
        quantity: Math.max(0.001, Number(item.quantity) || 1),
        tradeInValue: Math.max(0, Number(item.tradeInValue) || 0),
      })),
      soldItems: validSold.map((item) => ({
        productId: item.productId || null,
        productName: (item.productName || '').trim() || 'Device',
        quantity: Math.max(0.001, Number(item.quantity) || 1),
        unitPrice: Math.max(0, Number(item.unitPrice) || 0),
      })),
    };

    setSaving(true);
    setError('');
    const result = await onSave(payload);
    setSaving(false);

    if (result?.ok) {
      const tradeInNumber = result.tradeIn?.tradeInNumber || result.tradeIn?.trade_in_number || '—';
      setSavedReceipt({
        tradeInNumber,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        tradeInDate: payload.tradeInDate,
        paymentMethod: payload.paymentMethod,
        receivedItems: payload.receivedItems,
        soldItems: payload.soldItems,
      });
    } else {
      setError(result?.message || t('tradeIns.saveFailed'));
    }
  }

  return (
    <Modal
      title={savedReceipt ? `Trade-In ${savedReceipt.tradeInNumber}` : t('tradeIns.addTitle')}
      description={savedReceipt ? null : t('tradeIns.modalDescription')}
      onClose={onClose}
      width="max-w-4xl"
    >
      {savedReceipt ? (
        <TradeInReceipt receipt={savedReceipt} onClose={onClose} />
      ) : (
        <form className="space-y-6" onSubmit={submitForm}>
          {error ? <Alert type="error">{error}</Alert> : null}

          {/* Customer + date */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="label">{t('tradeIns.customerNameLabel')}</label>
              <input
                className="input"
                value={form.customerName}
                onChange={(e) => updateField('customerName', e.target.value)}
                placeholder={t('tradeIns.customerNamePlaceholder')}
              />
            </div>
            <div>
              <label className="label">{t('tradeIns.customerPhoneLabel')}</label>
              <input
                className="input"
                value={form.customerPhone}
                onChange={(e) => updateField('customerPhone', e.target.value)}
                placeholder="+880..."
              />
            </div>
            <DatePickerField
              label={t('tradeIns.tradeInDateLabel')}
              value={form.tradeInDate}
              onChange={(v) => updateField('tradeInDate', v)}
            />
          </div>

          {/* Received items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">{t('tradeIns.receivedSectionLabel')}</p>
                <p className="text-xs text-slate-400">Devices the shop is taking in — adds to stock if product selected</p>
              </div>
              <button type="button" className="btn btn-ghost text-xs" onClick={() => setReceivedItems((p) => [...p, emptyReceived()])}>
                <Plus className="h-3.5 w-3.5" /> {t('tradeIns.addReceivedItem')}
              </button>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-emerald-50 text-left text-[11px] font-black uppercase tracking-[0.14em] text-emerald-600">
                  <tr>
                    <th className="px-3 py-2 w-[28%]">{t('tradeIns.productLabel')}</th>
                    <th className="px-3 py-2 w-[18%]">{t('tradeIns.serialLabel')}</th>
                    <th className="px-3 py-2 w-[14%]">{t('tradeIns.conditionLabel')}</th>
                    <th className="px-3 py-2 w-[10%] text-right">{t('tradeIns.qtyLabel')}</th>
                    <th className="px-3 py-2 w-[20%] text-right">{t('tradeIns.tradeInValueLabel')}</th>
                    <th className="px-3 py-2 w-[10%]" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-100">
                  {receivedItems.map((item, i) => (
                    <tr key={item._key}>
                      <td className="px-2 py-1.5">
                        <select
                          className="input py-1 text-sm"
                          value={item.productId}
                          onChange={(e) => updateReceived(i, 'productId', e.target.value)}
                        >
                          <option value="">— {t('tradeIns.productPlaceholder')} —</option>
                          {productDirectory.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        {!item.productId && (
                          <input
                            className="input py-1 text-sm mt-1"
                            placeholder="Device name / model"
                            value={item.productName}
                            onChange={(e) => updateReceived(i, 'productName', e.target.value)}
                          />
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          className="input py-1 text-sm"
                          placeholder="IMEI / Serial"
                          value={item.serialNumber}
                          onChange={(e) => updateReceived(i, 'serialNumber', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          className="input py-1 text-sm"
                          value={item.condition}
                          onChange={(e) => updateReceived(i, 'condition', e.target.value)}
                        >
                          {CONDITIONS.map((c) => (
                            <option key={c} value={c}>{t(`tradeIns.conditions.${c}`)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          className="input py-1 text-sm text-right"
                          type="number"
                          min="0.001"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => updateReceived(i, 'quantity', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          className="input py-1 text-sm text-right"
                          type="number"
                          min="0"
                          step="any"
                          value={item.tradeInValue}
                          onChange={(e) => updateReceived(i, 'tradeInValue', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {receivedItems.length > 1 && (
                          <button
                            type="button"
                            className="text-slate-300 hover:text-rose-500 transition-colors"
                            onClick={() => setReceivedItems((p) => p.filter((_, idx) => idx !== i))}
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

          {/* Sold items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">{t('tradeIns.soldSectionLabel')}</p>
                <p className="text-xs text-slate-400">Devices the shop is selling — deducts from stock if product selected</p>
              </div>
              <button type="button" className="btn btn-ghost text-xs" onClick={() => setSoldItems((p) => [...p, emptySold()])}>
                <Plus className="h-3.5 w-3.5" /> {t('tradeIns.addSoldItem')}
              </button>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-indigo-50 text-left text-[11px] font-black uppercase tracking-[0.14em] text-indigo-600">
                  <tr>
                    <th className="px-3 py-2 w-[40%]">{t('tradeIns.productLabel')}</th>
                    <th className="px-3 py-2 w-[15%] text-right">{t('tradeIns.qtyLabel')}</th>
                    <th className="px-3 py-2 w-[25%] text-right">{t('tradeIns.unitPriceLabel')}</th>
                    <th className="px-3 py-2 w-[15%] text-right">{t('tradeIns.lineTotalLabel')}</th>
                    <th className="px-3 py-2 w-[5%]" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-100">
                  {soldItems.map((item, i) => {
                    const lineTotal = Math.max(0, (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0));
                    return (
                      <tr key={item._key}>
                        <td className="px-2 py-1.5">
                          <select
                            className="input py-1 text-sm"
                            value={item.productId}
                            onChange={(e) => updateSold(i, 'productId', e.target.value)}
                          >
                            <option value="">— {t('tradeIns.productPlaceholder')} —</option>
                            {productDirectory.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          {!item.productId && (
                            <input
                              className="input py-1 text-sm mt-1"
                              placeholder="Device name / model"
                              value={item.productName}
                              onChange={(e) => updateSold(i, 'productName', e.target.value)}
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
                            onChange={(e) => updateSold(i, 'quantity', e.target.value)}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            className="input py-1 text-sm text-right"
                            type="number"
                            min="0"
                            step="any"
                            value={item.unitPrice}
                            onChange={(e) => updateSold(i, 'unitPrice', e.target.value)}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right font-medium text-slate-900">
                          {lineTotal.toLocaleString()}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {soldItems.length > 1 && (
                            <button
                              type="button"
                              className="text-slate-300 hover:text-rose-500 transition-colors"
                              onClick={() => setSoldItems((p) => p.filter((_, idx) => idx !== i))}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-500">{t('tradeIns.totalTradeInValueLabel')}</p>
              <p className="text-lg font-bold text-emerald-700">{totalTradeInValue.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-indigo-500">{t('tradeIns.totalSaleAmountLabel')}</p>
              <p className="text-lg font-bold text-indigo-700">{totalSaleAmount.toLocaleString()}</p>
            </div>
            <div className={`rounded-xl border px-4 py-3 text-center ${paymentAmount >= 0 ? 'bg-slate-900 border-slate-900' : 'bg-amber-50 border-amber-200'}`}>
              <p className={`text-[11px] font-black uppercase tracking-[0.14em] ${paymentAmount >= 0 ? 'text-slate-400' : 'text-amber-500'}`}>{t('tradeIns.paymentAmountLabel')}</p>
              <p className={`text-lg font-bold ${paymentAmount >= 0 ? 'text-white' : 'text-amber-700'}`}>{Math.abs(paymentAmount).toLocaleString()}{paymentAmount < 0 ? ' ← shop pays' : ''}</p>
            </div>
          </div>

          {/* Payment method + notes */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">{t('tradeIns.paymentMethodLabel')}</label>
              <select className="input" value={form.paymentMethod} onChange={(e) => updateField('paymentMethod', e.target.value)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('tradeIns.notesLabel')}</label>
              <input
                className="input"
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder={t('tradeIns.notesPlaceholder')}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? t('common.saving') : t('tradeIns.save')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
