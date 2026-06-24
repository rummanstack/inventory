import { useState } from 'react';
import { Save, Search } from 'lucide-react';
import { Alert, Modal } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { useFormState } from '../../../hooks/useFormState';
import { inventoryApi } from '../../../services/inventoryApi';
import { formatDate } from '../../../utils/calculations.js';

const STATUS_VALUES = ['RECEIVED', 'SENT_TO_SUPPLIER', 'REPAIRED', 'REPLACED', 'REJECTED', 'DELIVERED'];
const SUPPLIER_STATUSES = new Set(['SENT_TO_SUPPLIER', 'REPAIRED', 'REPLACED', 'REJECTED', 'DELIVERED']);

export default function WarrantyClaimFormModal({ claim, onClose, onSave, prefillRepairJobId, prefillRepairJobNumber }) {
  const { t, productDirectory, supplierDirectory } = useInventoryApp();
  const isEdit = Boolean(claim);
  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    productId: claim?.productId || '',
    productSerialId: claim?.productSerialId || '',
    customerId: claim?.customerId || '',
    salesInvoiceId: claim?.salesInvoiceId || '',
    salesInvoiceItemId: claim?.salesInvoiceItemId || '',
    invoiceNumber: claim?.invoiceNumber || '',
    problemNote: claim?.problemNote || '',
    receivedDate: claim?.receivedDate || new Date().toISOString().slice(0, 10),
    status: claim?.status || 'RECEIVED',
    supplierId: claim?.supplierId || '',
    resolutionNote: claim?.resolutionNote || '',
    rmaNumber: claim?.rmaNumber || '',
    sentToSupplierDate: claim?.sentToSupplierDate || '',
    receivedFromSupplierDate: claim?.receivedFromSupplierDate || '',
  });
  const [serialQuery, setSerialQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');

  async function runSerialSearch() {
    if (!serialQuery.trim()) {
      return;
    }
    setSearching(true);
    setSearchError('');
    try {
      const result = await inventoryApi.searchWarrantyClaimSerial(serialQuery.trim());
      if (!result.serial) {
        setSearchResult(null);
        setSearchError(t('warrantyClaims.serialNotFound'));
        return;
      }
      setSearchResult(result.serial);
      updateField('productId', result.serial.productId);
      updateField('productSerialId', result.serial.id);
      updateField('customerId', result.serial.customerId || '');
      updateField('salesInvoiceId', result.serial.salesInvoiceId || '');
      updateField('salesInvoiceItemId', result.serial.salesInvoiceItemId || '');
      updateField('invoiceNumber', result.serial.invoiceNumber || '');
    } catch (requestError) {
      setSearchResult(null);
      setSearchError(requestError.message || t('warrantyClaims.serialNotFound'));
    } finally {
      setSearching(false);
    }
  }

  async function submitForm(event) {
    event.preventDefault();

    if (!form.productId) {
      setError(t('warrantyClaims.productRequired'));
      return;
    }
    if (!form.receivedDate) {
      setError(t('warrantyClaims.receivedDateRequired'));
      return;
    }

    const payload = isEdit
      ? {
          id: claim.id,
          status: form.status,
          supplierId: form.supplierId || null,
          resolutionNote: form.resolutionNote.trim(),
          problemNote: form.problemNote.trim(),
          rmaNumber: form.rmaNumber.trim(),
          sentToSupplierDate: form.sentToSupplierDate || null,
          receivedFromSupplierDate: form.receivedFromSupplierDate || null,
        }
      : {
          productId: form.productId,
          productSerialId: form.productSerialId || null,
          customerId: form.customerId || null,
          salesInvoiceId: form.salesInvoiceId || null,
          salesInvoiceItemId: form.salesInvoiceItemId || null,
          problemNote: form.problemNote.trim(),
          receivedDate: form.receivedDate,
          supplierId: form.supplierId || null,
          repairJobId: prefillRepairJobId || null,
        };

    setSaving(true);
    setError('');
    const result = await onSave(payload);
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || t('warrantyClaims.saveFailed'));
    }
  }

  const showRmaSection = isEdit && SUPPLIER_STATUSES.has(form.status);
  const linkedRepairJob = isEdit ? (claim.repairJobNumber || null) : (prefillRepairJobNumber || null);

  return (
    <Modal title={isEdit ? t('warrantyClaims.editTitle') : t('warrantyClaims.addTitle')} description={t('warrantyClaims.modalDescription')} onClose={onClose} width="max-w-2xl">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}

        {isEdit ? (
          <div className="grid gap-4 sm:grid-cols-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{t('warrantyClaims.claimNumberLabel')}</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{claim.claimNumber}</p>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{t('products.product')}</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{claim.productName}</p>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{t('warrantyClaims.serialLabel')}</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{claim.serialNumber || claim.imei1 || claim.imei2 || '-'}</p>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{t('retailer.shared.invoiceNumberLabel')}</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{claim.invoiceNumber || '-'}</p>
            </div>
            {linkedRepairJob ? (
              <div className="sm:col-span-2">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{t('warrantyClaims.linkedRepairJobLabel')}</p>
                <p className="mt-1 text-sm font-semibold text-indigo-700">{linkedRepairJob}</p>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            {prefillRepairJobId ? (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 px-4 py-3 flex items-center gap-3">
                <span className="text-xs font-black uppercase tracking-widest text-indigo-500">{t('warrantyClaims.linkedRepairJobLabel')}</span>
                <span className="text-sm font-bold text-indigo-900">{prefillRepairJobNumber}</span>
              </div>
            ) : null}
            <div className="rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/60 p-4">
              <label className="label">{t('warrantyClaims.findSerialLabel')}</label>
              <div className="flex gap-2">
                <input
                  className="input"
                  value={serialQuery}
                  onChange={(event) => setSerialQuery(event.target.value)}
                  placeholder={t('warrantyClaims.findSerialPlaceholder')}
                  onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); runSerialSearch(); } }}
                />
                <button type="button" className="btn-secondary shrink-0" onClick={runSerialSearch} disabled={searching}>
                  <Search size={16} />
                  {searching ? t('common.loading') : t('common.search')}
                </button>
              </div>
              {searchError ? <p className="mt-2 text-xs font-semibold text-rose-600">{searchError}</p> : null}
              {searchResult ? (
                <div className="mt-3 space-y-1 rounded-xl border border-slate-200 bg-white p-3 text-sm">
                  <p className="font-bold text-slate-950">{searchResult.productName}</p>
                  {searchResult.invoiceNumber ? <p className="text-slate-600">{t('retailer.shared.invoiceNumberLabel')}: {searchResult.invoiceNumber}</p> : null}
                  {searchResult.customerName ? <p className="text-slate-600">{t('retailer.shared.customerLabel')}: {searchResult.customerName}</p> : null}
                  {searchResult.warrantyEndDate ? (
                    <p className="text-slate-600">{t('productSerials.warrantyEndLabel')}: {formatDate(searchResult.warrantyEndDate)}</p>
                  ) : null}
                </div>
              ) : null}
              <p className="mt-2 text-xs font-medium text-slate-500">{t('warrantyClaims.manualProductHint')}</p>
              <select className="input mt-2" value={form.productId} onChange={(event) => { updateField('productId', event.target.value); updateField('productSerialId', ''); }}>
                <option value="">{t('warrantyClaims.selectProduct')}</option>
                {productDirectory.filter((product) => !product.serialRequired).map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {!isEdit ? (
            <div>
              <label className="label">{t('warrantyClaims.receivedDateLabel')}</label>
              <DatePickerField value={form.receivedDate} onChange={(value) => updateField('receivedDate', value)} />
            </div>
          ) : (
            <div>
              <label className="label">{t('warrantyClaims.statusLabel')}</label>
              <select className="input" value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                {STATUS_VALUES.map((value) => (
                  <option key={value} value={value}>{t(`warrantyClaims.statuses.${value}`)}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">{t('warrantyClaims.supplierLabel')}</label>
            <select className="input" value={form.supplierId} onChange={(event) => updateField('supplierId', event.target.value)}>
              <option value="">{t('warrantyClaims.noSupplier')}</option>
              {supplierDirectory.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">{t('warrantyClaims.problemNoteLabel')}</label>
            <textarea className="input min-h-[80px]" value={form.problemNote} onChange={(event) => updateField('problemNote', event.target.value)} />
          </div>
          {isEdit ? (
            <div className="sm:col-span-2">
              <label className="label">{t('warrantyClaims.resolutionNoteLabel')}</label>
              <textarea className="input min-h-[80px]" value={form.resolutionNote} onChange={(event) => updateField('resolutionNote', event.target.value)} />
            </div>
          ) : null}
        </div>

        {showRmaSection ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">{t('warrantyClaims.rmaSection')}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">{t('warrantyClaims.rmaNumberLabel')}</label>
                <input
                  className="input"
                  value={form.rmaNumber}
                  onChange={(event) => updateField('rmaNumber', event.target.value)}
                  placeholder={t('warrantyClaims.rmaNumberPlaceholder')}
                />
              </div>
              <div>
                <label className="label">{t('warrantyClaims.sentToSupplierDateLabel')}</label>
                <DatePickerField value={form.sentToSupplierDate} onChange={(value) => updateField('sentToSupplierDate', value)} />
              </div>
              <div>
                <label className="label">{t('warrantyClaims.receivedFromSupplierDateLabel')}</label>
                <DatePickerField value={form.receivedFromSupplierDate} onChange={(value) => updateField('receivedFromSupplierDate', value)} />
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? t('common.saving') : t('warrantyClaims.saveClaim')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
