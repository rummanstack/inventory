import { useState } from 'react';
import { CheckCircle2, Loader2, Plus, Save, Trash2 } from 'lucide-react';
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

function SummaryCard({ label, value, tone }) {
  const styles = {
    emerald: 'bg-emerald-50 border-emerald-200',
    indigo: 'bg-indigo-50 border-indigo-200',
    slate: 'bg-slate-50 border-slate-200',
    amber: 'bg-amber-50 border-amber-200',
  };
  const textStyles = {
    emerald: { label: 'text-emerald-500', value: 'text-emerald-700' },
    indigo: { label: 'text-indigo-500', value: 'text-indigo-700' },
    slate: { label: 'text-slate-500', value: 'text-slate-950' },
    amber: { label: 'text-amber-500', value: 'text-amber-700' },
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-center ${styles[tone]}`}>
      <p className={`text-[11px] font-black uppercase tracking-[0.14em] ${textStyles[tone].label}`}>{label}</p>
      <p className={`mt-1 text-lg font-black ${textStyles[tone].value}`}>{value}</p>
    </div>
  );
}

function TradeInReceipt({ receipt, onClose }) {
  const totalTradeIn = receipt.receivedItems.reduce((s, i) => s + Number(i.tradeInValue || 0), 0);
  const totalSale = receipt.soldItems.reduce((s, i) => s + (Number(i.quantity) || 1) * (Number(i.unitPrice) || 0), 0);
  const net = totalSale - totalTradeIn;

  return (
    <div className="space-y-5">
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

      <div>
        <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">Devices Taken In</p>
        <div className="overflow-hidden rounded-xl border border-emerald-200">
          <table className="w-full text-sm">
            <thead className="bg-emerald-50">
              <tr className="text-left text-[11px] font-black uppercase tracking-[0.12em] text-emerald-600">
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

      <div>
        <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">Devices Sold</p>
        <div className="overflow-hidden rounded-xl border border-indigo-200">
          <table className="w-full text-sm">
            <thead className="bg-indigo-50">
              <tr className="text-left text-[11px] font-black uppercase tracking-[0.12em] text-indigo-600">
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

      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Trade-In Credit" value={formatCurrency(totalTradeIn)} tone="emerald" />
        <SummaryCard label="Sale Total" value={formatCurrency(totalSale)} tone="indigo" />
        <SummaryCard label={net >= 0 ? 'Customer Pays' : 'Shop Pays'} value={formatCurrency(Math.abs(net))} tone={net >= 0 ? 'slate' : 'amber'} />
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
  const { t, productDirectory, language } = useInventoryApp();
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
            <div>
              <label className="label">{t('tradeIns.tradeInDateLabel')}</label>
              <DatePickerField
                value={form.tradeInDate}
                onChange={(v) => updateField('tradeInDate', v)}
              />
            </div>
          </div>

          {/* Received items */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{t('tradeIns.receivedSectionLabel')}</p>
                <p className="text-xs text-slate-400">Devices the shop is taking in — adds to stock if product selected</p>
              </div>
              <button type="button" className="btn-secondary py-1 text-xs" onClick={() => setReceivedItems((p) => [...p, emptyReceived()])}>
                <Plus size={14} />
                {t('tradeIns.addReceivedItem')}
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/40">
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
                        {!item.productId ? (
                          <input
                            className="input py-1 text-sm mt-1"
                            placeholder="Device name / model"
                            value={item.productName}
                            onChange={(e) => updateReceived(i, 'productName', e.target.value)}
                          />
                        ) : null}
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
                        {receivedItems.length > 1 ? (
                          <button
                            type="button"
                            className="text-slate-300 hover:text-rose-500 transition-colors"
                            onClick={() => setReceivedItems((p) => p.filter((_, idx) => idx !== i))}
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

          {/* Sold items */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{t('tradeIns.soldSectionLabel')}</p>
                <p className="text-xs text-slate-400">Devices the shop is selling — deducts from stock if product selected</p>
              </div>
              <button type="button" className="btn-secondary py-1 text-xs" onClick={() => setSoldItems((p) => [...p, emptySold()])}>
                <Plus size={14} />
                {t('tradeIns.addSoldItem')}
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-indigo-200 bg-indigo-50/40">
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
                          {!item.productId ? (
                            <input
                              className="input py-1 text-sm mt-1"
                              placeholder="Device name / model"
                              value={item.productName}
                              onChange={(e) => updateSold(i, 'productName', e.target.value)}
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
                        <td className="px-2 py-1.5 text-right font-semibold text-slate-900">
                          {formatCurrency(lineTotal, language)}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {soldItems.length > 1 ? (
                            <button
                              type="button"
                              className="text-slate-300 hover:text-rose-500 transition-colors"
                              onClick={() => setSoldItems((p) => p.filter((_, idx) => idx !== i))}
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : null}
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
            <SummaryCard label={t('tradeIns.totalTradeInValueLabel')} value={formatCurrency(totalTradeInValue, language)} tone="emerald" />
            <SummaryCard label={t('tradeIns.totalSaleAmountLabel')} value={formatCurrency(totalSaleAmount, language)} tone="indigo" />
            <SummaryCard
              label={`${t('tradeIns.paymentAmountLabel')}${paymentAmount < 0 ? ' (shop pays)' : ''}`}
              value={formatCurrency(Math.abs(paymentAmount), language)}
              tone={paymentAmount < 0 ? 'amber' : 'slate'}
            />
          </div>

          {/* Payment method + notes */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">{t('tradeIns.paymentMethodLabel')}</label>
              <select className="input" value={form.paymentMethod} onChange={(e) => updateField('paymentMethod', e.target.value)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
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
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? t('common.saving') : t('tradeIns.save')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
