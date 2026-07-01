import { useState, useMemo } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Alert, Modal, Select } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency } from '../../../utils/calculations.js';
import AuditHistory from '../../../components/AuditHistory.jsx';
import { usePurchaseReceiptFormViewModel } from '../viewmodels/usePurchaseReceiptFormViewModel';
import SupplierFormModal from '../../suppliers/components/SupplierFormModal.jsx';

export default function PurchaseReceiveFormModal({ purchaseReceipt, onClose, onSave }) {
  const { t, supplierDirectory, productDirectory, saveSupplier, tenant } = useInventoryApp();
  const isElectronics = (tenant?.businessType || 'ELECTRONICS') === 'ELECTRONICS';
  const isPharmacy = tenant?.businessType === 'DRUG_PHARMACY';
  const [supplierId, setSupplierId] = useState(purchaseReceipt?.supplierId || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!supplierId) return productDirectory;
    const linked = productDirectory.filter((p) => Array.isArray(p.supplierIds) && p.supplierIds.includes(supplierId));
    return linked.length > 0 ? linked : productDirectory;
  }, [supplierId, productDirectory]);

  const vm = usePurchaseReceiptFormViewModel({
    purchaseReceipt,
    products: filteredProducts,
    defaultTaxRate: tenant?.taxRate || 0,
    supplierId,
  });

  async function submitForm(event) {
    event.preventDefault();
    if (!supplierId) {
      setError(t('purchaseReceive.supplierRequired'));
      return;
    }
    if (!vm.purchaseDate) {
      setError(t('purchaseReceive.dateRequired'));
      return;
    }
    if (!vm.hasValidItems || vm.hasInvalidItems) {
      setError(t('purchaseReceive.itemsRequired'));
      return;
    }
    if (vm.isEdit && !vm.reasonInput.trim()) {
      setError(t('common.editReasonRequired'));
      return;
    }

    setSaving(true);
    setError('');
    const result = await onSave(vm.buildPayload());
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || t('purchaseReceive.saveFailed'));
    }
  }

  return (
    <>
    <Modal title={vm.isEdit ? t('purchaseReceive.editTitle') : t('purchaseReceive.addTitle')} description={t('purchaseReceive.modalDescription')} onClose={onClose} width="max-w-4xl">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="label mb-0">{t('purchaseReceive.supplierLabel')}</label>
              {!vm.isEdit && (
                <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800" onClick={() => setShowAddSupplier(true)}>
                  <Plus size={13} />
                  {t('suppliers.addTitle')}
                </button>
              )}
            </div>
            <Select className="input" value={supplierId} onChange={(event) => setSupplierId(event.target.value)} disabled={vm.isEdit}>
              <option value="">{t('purchaseReceive.selectSupplier')}</option>
              {supplierDirectory.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">{t('purchaseReceive.purchaseDateLabel')}</label>
            <DatePickerField value={vm.purchaseDate} onChange={vm.setPurchaseDate} max={new Date().toISOString().slice(0, 10)} />
          </div>
          <div>
            <label className="label">{t('purchaseReceive.supplierInvoiceNoLabel')}</label>
            <input className="input" value={vm.supplierInvoiceNo} onChange={(event) => vm.setSupplierInvoiceNo(event.target.value)} placeholder={t('purchaseReceive.supplierInvoiceNoLabel')} />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="label mb-0">{t('purchaseReceive.itemsTitle')}</label>
            <button type="button" className="btn-secondary" onClick={vm.addItem} disabled={!vm.canAddItem}>
              <Plus size={16} />
              {t('purchaseReceive.addItem')}
            </button>
          </div>
          {vm.lineRows.length ? (
            <div className="space-y-3">
              {vm.lineRows.map((row) => {
                const availableProducts = vm.getAvailableProducts(row.rowId);
                return (
                  <div key={row.rowId} className="space-y-3 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                    <div className={isElectronics ? 'grid gap-3 lg:grid-cols-[minmax(0,1.8fr)_minmax(110px,0.6fr)_minmax(110px,0.6fr)_minmax(110px,0.6fr)_auto]' : 'grid gap-3 lg:grid-cols-[minmax(0,1.8fr)_minmax(110px,0.6fr)_minmax(110px,0.6fr)_minmax(110px,0.6fr)_minmax(110px,0.6fr)_auto]'}>
                      <div>
                        <label className="label">{t('products.product')}</label>
                        <Select className="input" value={row.productId} onChange={(event) => vm.updateItem(row.rowId, 'productId', event.target.value)}>
                          {availableProducts.map((product) => (
                            <option key={product.id} value={product.id}>{product.name}</option>
                          ))}
                        </Select>
                        {!isElectronics ? <p className="mt-1 text-xs font-semibold text-slate-500">{row.piecesPerCase} {t('common.pcsPerCase')}</p> : null}
                      </div>
                      {!isElectronics ? (
                        <div>
                          <label className="label">{t('common.case')}</label>
                          <input className="input" type="number" min="0" value={row.caseQty} onChange={(event) => vm.updateItem(row.rowId, 'caseQty', event.target.value)} />
                        </div>
                      ) : null}
                      <div>
                        <label className="label">{t('common.piece')}</label>
                        <input className="input" type="number" min="0" value={row.pieceQty} onChange={(event) => vm.updateItem(row.rowId, 'pieceQty', event.target.value)} />
                      </div>
                      <div>
                        <label className="label">{t('purchaseReceive.purchasePriceLabel')}</label>
                        <input className="input" type="number" min="0" step="0.01" value={row.purchasePrice} onChange={(event) => vm.updateItem(row.rowId, 'purchasePrice', event.target.value)} />
                      </div>
                      <div>
                        <label className="label">{t('purchaseReceive.lineDiscountLabel')}</label>
                        <input className="input" type="number" min="0" step="0.01" value={row.lineDiscount} onChange={(event) => vm.updateItem(row.rowId, 'lineDiscount', event.target.value)} />
                      </div>
                      <div className="flex items-end justify-between gap-2 lg:flex-col lg:items-end">
                        <p className="text-sm font-black text-slate-950">{formatCurrency(row.lineTotal)}</p>
                        <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={() => vm.removeItem(row.rowId)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    {row.serialRequired ? (
                      <div className="rounded-xl border border-dashed border-indigo-300 bg-indigo-50/60 p-3">
                        <label className="label">{t('purchaseReceive.serialsLabel')}</label>
                        <textarea
                          className="input min-h-[120px]"
                          value={row.serialsText}
                          onChange={(event) => vm.updateItem(row.rowId, 'serialsText', event.target.value)}
                          placeholder={t('purchaseReceive.serialsPlaceholder')}
                        />
                        <p className={`mt-1 text-xs font-semibold ${row.serialCountMismatch ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {t('purchaseReceive.serialsCount', { required: row.quantityNumber, entered: row.serials.length })}
                        </p>
                      </div>
                    ) : null}
                    {isPharmacy ? (
                      <div className="grid gap-3 sm:grid-cols-4 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 p-3">
                        <div>
                          <label className="label">{t('purchaseReceive.batchNumber')}</label>
                          <input className="input" value={row.batchNumber || ''} onChange={(e) => vm.updateItem(row.rowId, 'batchNumber', e.target.value)} placeholder="Batch No." />
                        </div>
                        <div>
                          <label className="label">{t('purchaseReceive.lotNumber')}</label>
                          <input className="input" value={row.lotNumber || ''} onChange={(e) => vm.updateItem(row.rowId, 'lotNumber', e.target.value)} placeholder="Lot No." />
                        </div>
                        <div>
                          <label className="label">{t('purchaseReceive.expiryDate')}</label>
                          <input className="input" type="date" value={row.expiryDate || ''} onChange={(e) => vm.updateItem(row.rowId, 'expiryDate', e.target.value)} />
                        </div>
                        <div>
                          <label className="label">{t('purchaseReceive.manufactureDate')}</label>
                          <input className="input" type="date" value={row.manufactureDate || ''} onChange={(e) => vm.updateItem(row.rowId, 'manufactureDate', e.target.value)} />
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              {t('purchaseReceive.noItems')}
            </div>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-700">{t('purchaseReceive.summaryTitle')}</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="font-semibold text-slate-600">{t('purchaseReceive.grossTotal')}</dt>
                <dd className="font-black text-slate-950">{formatCurrency(vm.grossTotal)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="font-semibold text-slate-600">{t('purchaseReceive.lineDiscountTotal')}</dt>
                <dd className="font-black text-rose-700">- {formatCurrency(vm.lineDiscountTotal)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="font-semibold text-slate-600">{t('purchaseReceive.discountLabel')}</dt>
                <dd className="flex items-center gap-2">
                  <input className="input h-9 w-28 text-right" type="number" min="0" step="0.01" value={vm.discountInput} onChange={(event) => vm.setDiscountInput(event.target.value)} disabled={saving} />
                </dd>
              </div>
              {vm.taxRate > 0 ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="font-semibold text-slate-600">{t('retailer.shared.taxRateLabel')}</dt>
                    <dd className="font-black text-slate-950">{vm.taxRate.toFixed(2)}%</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="font-semibold text-slate-600">{t('retailer.shared.taxAmountLabel')}</dt>
                    <dd className="font-black text-slate-950">{formatCurrency(vm.taxAmount)}</dd>
                  </div>
                </>
              ) : null}
              <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                <dt className="font-black uppercase tracking-[0.1em] text-slate-700">{t('purchaseReceive.totalAmount')}</dt>
                <dd className="font-black text-slate-950">{formatCurrency(vm.totalAmount)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="font-semibold text-slate-600">{t('purchaseReceive.paidAmountLabel')}</dt>
                <dd className="flex items-center gap-2">
                  <input className="input h-9 w-28 text-right" type="number" min="0" step="0.01" value={vm.paidAmountInput} onChange={(event) => vm.setPaidAmountInput(event.target.value)} disabled={saving} />
                </dd>
              </div>
              <div className="flex items-center justify-between border-t-2 border-slate-300 pt-2">
                <dt className="text-base font-black uppercase tracking-[0.1em] text-slate-950">{t('purchaseReceive.dueAmount')}</dt>
                <dd className="text-lg font-black text-rose-700">{formatCurrency(vm.dueAmount)}</dd>
              </div>
            </dl>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">{t('purchaseReceive.paymentMethodLabel')}</label>
              <Select className="input" value={vm.paymentMethod} onChange={(event) => vm.setPaymentMethod(event.target.value)}>
                <option value="CASH">{t('purchaseReceive.paymentMethods.CASH')}</option>
                <option value="MOBILE_BANKING">{t('purchaseReceive.paymentMethods.MOBILE_BANKING')}</option>
                <option value="CHEQUE">{t('purchaseReceive.paymentMethods.CHEQUE')}</option>
              </Select>
            </div>
            <div className="sm:col-span-3">
              <label className="label">{t('purchaseReceive.noteLabel')}</label>
              <textarea className="input min-h-28" value={vm.note} onChange={(event) => vm.setNote(event.target.value)} placeholder={t('purchaseReceive.noteLabel')} />
            </div>
            {vm.isEdit ? (
              <div>
                <label className="label">{t('common.editReasonLabel')}</label>
                <textarea className="input min-h-20" value={vm.reasonInput} onChange={(event) => vm.setReasonInput(event.target.value)} placeholder={t('common.editReasonPlaceholder')} disabled={saving} />
              </div>
            ) : null}
          </div>
        </div>

        {vm.isEdit ? <AuditHistory entityType="purchase_receipt" entityId={purchaseReceipt.id} /> : null}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? t('common.saving') : t('purchaseReceive.savePurchase')}
          </button>
        </div>
      </form>
    </Modal>

    {showAddSupplier && (
      <SupplierFormModal
        onClose={() => setShowAddSupplier(false)}
        onSave={async (payload) => {
          const result = await saveSupplier(payload);
          if (result?.ok) {
            setSupplierId(result.supplier.id);
            setShowAddSupplier(false);
          }
          return result;
        }}
      />
    )}
    </>
  );
}

