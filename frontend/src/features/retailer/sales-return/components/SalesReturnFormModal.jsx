import { useState } from 'react';
import { Save, Search } from 'lucide-react';
import { Alert, Modal } from '../../../../components/ui.jsx';
import { DatePickerField } from '../../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { formatCurrency } from '../../../../utils/calculations.js';
import { useSalesReturnFormViewModel } from '../viewmodels/useSalesReturnFormViewModel';

export default function SalesReturnFormModal({ onClose, onSave }) {
  const { t } = useInventoryApp();
  const vm = useSalesReturnFormViewModel();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submitForm(event) {
    event.preventDefault();

    if (!vm.hasValidItems) {
      setError(t('retailer.salesReturn.itemsRequired'));
      return;
    }

    setSaving(true);
    setError('');
    const result = await onSave(vm.buildPayload());
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || t('retailer.shared.saveFailed'));
    }
  }

  return (
    <Modal title={t('retailer.salesReturn.addTitle')} description={t('retailer.salesReturn.modalDescription')} onClose={onClose} width="max-w-3xl">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="label">{t('retailer.salesReturn.invoiceNumberLabel')}</label>
            <div className="flex gap-2">
              <input className="input" value={vm.invoiceNumberInput} onChange={(event) => vm.setInvoiceNumberInput(event.target.value)} placeholder={t('retailer.shared.invoiceNumberLabel')} disabled={saving} />
              <button type="button" className="btn-secondary" onClick={vm.loadInvoice} disabled={vm.loading || saving}>
                <Search size={16} />
                {vm.loading ? t('common.loading') : t('retailer.salesReturn.loadInvoice')}
              </button>
            </div>
            {vm.loadError === 'notFound' ? <p className="mt-1 text-xs font-bold text-rose-600">{t('retailer.salesReturn.invoiceNotFound')}</p> : null}
            {vm.loadError && vm.loadError !== 'notFound' ? <p className="mt-1 text-xs font-bold text-rose-600">{vm.loadError}</p> : null}
          </div>
          <div>
            <label className="label">{t('retailer.shared.invoiceDateLabel')}</label>
            <DatePickerField value={vm.returnDate} onChange={vm.setReturnDate} />
          </div>
        </div>

        {vm.salesInvoiceId ? (
          <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="font-bold text-slate-950">{vm.invoiceNumber}</p>
            <p className="text-slate-600">{vm.customerName || t('retailer.shared.customerTypes.WALK_IN')}</p>
          </div>
        ) : null}

        {vm.lineRows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-3 py-2 text-left">{t('products.product')}</th>
                  <th className="px-3 py-2 text-right">{t('retailer.salesReturn.soldQuantity')}</th>
                  <th className="px-3 py-2 text-right">{t('retailer.salesReturn.returnQuantity')}</th>
                  <th className="px-3 py-2 text-right">{t('retailer.shared.priceLabel')}</th>
                  <th className="px-3 py-2 text-right">{t('retailer.shared.totalAmount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vm.lineRows.map((row) => (
                  <tr key={row.rowId}>
                    <td className="px-3 py-2 font-semibold text-slate-950">{row.productName}</td>
                    <td className="px-3 py-2 text-right">{row.originalQuantity}</td>
                    <td className="px-3 py-2 text-right">
                      <input className="input h-9 w-24 text-right" type="number" min="0" max={row.originalQuantity} value={row.returnQuantity} onChange={(event) => vm.updateReturnQuantity(row.rowId, event.target.value)} disabled={saving} />
                    </td>
                    <td className="px-3 py-2 text-right">{formatCurrency(row.actualSalePrice)}</td>
                    <td className="px-3 py-2 text-right font-bold">{formatCurrency(row.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {vm.lineRows.length ? (
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2 text-sm">
              <div className="flex items-center justify-between border-t-2 border-slate-300 pt-2">
                <span className="text-base font-black uppercase tracking-[0.1em] text-slate-950">{t('retailer.shared.totalAmount')}</span>
                <span className="text-lg font-black text-slate-950">{formatCurrency(vm.totalAmount)}</span>
              </div>
            </div>
          </div>
        ) : null}

        <div>
          <label className="label">{t('purchaseReceive.noteLabel')}</label>
          <textarea className="input" rows={3} value={vm.note} onChange={(event) => vm.setNote(event.target.value)} placeholder={t('purchaseReceive.noteLabel')} disabled={saving} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? t('common.saving') : t('retailer.salesReturn.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
