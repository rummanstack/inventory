import { Save } from 'lucide-react';
import { Alert, Modal } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, todayISO } from '../../../utils/calculations.js';
import { useFormState } from '../../../hooks/useFormState';

export default function SupplierDiscountFormModal({ onClose, onSave }) {
  const { supplierDirectory } = useInventoryApp();
  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    supplierId: '',
    discountDate: todayISO(),
    amount: '',
    note: '',
  });

  const selectedSupplier = supplierDirectory.find((s) => s.id === form.supplierId) || null;
  const currentDue = Number(selectedSupplier?.currentDue || 0);
  const dueAfterDiscount = currentDue - (Number(form.amount) || 0);

  async function submitForm(event) {
    event.preventDefault();
    if (!form.supplierId) { setError('Supplier is required.'); return; }
    const amount = Number(form.amount);
    if (!(amount > 0)) { setError('Amount must be greater than zero.'); return; }
    setSaving(true);
    setError('');
    const result = await onSave({ supplierId: form.supplierId, discountDate: form.discountDate, amount, note: form.note.trim() });
    setSaving(false);
    if (!result?.ok) setError(result?.message || 'Failed to save discount.');
  }

  return (
    <Modal title="Record Supplier Discount" description="Discount reduces supplier due and adds to cash." onClose={onClose} width="max-w-lg">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Supplier</label>
            <select className="input" value={form.supplierId} onChange={(e) => updateField('supplierId', e.target.value)}>
              <option value="">Select supplier...</option>
              {supplierDirectory.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          {selectedSupplier ? (
            <div className="sm:col-span-2 grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Current Due</p>
                <p className="mt-1 text-lg font-black text-slate-950">{formatCurrency(currentDue)}</p>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Due After Discount</p>
                <p className={`mt-1 text-lg font-black ${dueAfterDiscount < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{formatCurrency(dueAfterDiscount)}</p>
              </div>
            </div>
          ) : null}
          <div>
            <label className="label">Date</label>
            <DatePickerField value={form.discountDate} onChange={(v) => updateField('discountDate', v)} max={todayISO()} />
          </div>
          <div>
            <label className="label">Amount</label>
            <input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => updateField('amount', e.target.value)} placeholder="0.00" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Note</label>
            <input className="input" value={form.note} onChange={(e) => updateField('note', e.target.value)} placeholder="e.g. Trade discount June 2026" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? 'Saving...' : 'Record Discount'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
