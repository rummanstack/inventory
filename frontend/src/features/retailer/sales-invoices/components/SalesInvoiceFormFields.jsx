import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { DatePickerField } from '../../../../components/DatePicker.jsx';
import { formatCurrency } from '../../../../utils/calculations.js';
import RetailCustomerFormModal from '../../../retail-customers/components/RetailCustomerFormModal.jsx';

export default function SalesInvoiceFormFields({ vm, t, productDirectory, retailCustomerDirectory, saving, saveRetailCustomer }) {
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  return (
    <>
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <label className="label">{t('retailer.shared.saleTypeLabel')}</label>
          <select className="input" value={vm.saleType} onChange={(event) => vm.setSaleType(event.target.value)} disabled={saving}>
            <option value="RETAIL">{t('retailer.shared.saleTypes.RETAIL')}</option>
            <option value="WHOLESALE">{t('retailer.shared.saleTypes.WHOLESALE')}</option>
            <option value="QUICK_SALE">{t('retailer.shared.saleTypes.QUICK_SALE')}</option>
          </select>
        </div>
        <div>
          <label className="label">{t('retailer.shared.invoiceDateLabel')}</label>
          <DatePickerField value={vm.invoiceDate} onChange={vm.setInvoiceDate} />
        </div>
        <div>
          <label className="label">{t('retailer.shared.customerTypeLabel')}</label>
          <select className="input" value={vm.customerType} onChange={(event) => vm.setCustomerType(event.target.value)} disabled={saving}>
            <option value="WALK_IN">{t('retailer.shared.customerTypes.WALK_IN')}</option>
            <option value="REGISTERED">{t('retailer.shared.customerTypes.REGISTERED')}</option>
          </select>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="label mb-0">{t('retailer.shared.customerLabel')}</label>
            {vm.customerType === 'REGISTERED' && !saving && (
              <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800" onClick={() => setShowAddCustomer(true)}>
                <Plus size={13} />
                {t('retailCustomers.addTitle')}
              </button>
            )}
          </div>
          <select className="input" value={vm.customerId} onChange={(event) => vm.setCustomerId(event.target.value)} disabled={saving || vm.customerType !== 'REGISTERED'}>
            <option value="">{t('retailer.shared.selectCustomer')}</option>
            {retailCustomerDirectory.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.name}</option>
            ))}
          </select>
          {vm.loyaltyEligible && vm.selectedCustomer ? (
            <p className="mt-1 text-xs font-semibold text-emerald-700">
              {t('retailer.shared.loyaltyBalance', { points: vm.loyaltyCustomerBalance })}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="label mb-0">{t('retailer.shared.itemsTitle')}</label>
          <button type="button" className="btn-secondary" onClick={vm.addItem} disabled={!productDirectory.length || saving}>
            <Plus size={16} />
            {t('retailer.shared.addItem')}
          </button>
        </div>
        {vm.lineRows.length ? (
          <div className="space-y-3">
            {vm.lineRows.map((row) => {
              const availableProducts = vm.getAvailableProducts(row.rowId);
              const overStock = row.quantityNumber > Number(row.availableStock || 0);
              return (
                <div key={row.rowId} className="grid gap-3 rounded-[22px] border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(110px,0.6fr)_minmax(110px,0.6fr)_minmax(110px,0.6fr)_minmax(110px,0.6fr)_auto]">
                  <div>
                    <label className="label">{t('products.product')}</label>
                    <select className="input" value={row.productId} onChange={(event) => vm.updateItem(row.rowId, 'productId', event.target.value)} disabled={saving}>
                      {availableProducts.map((product) => (
                        <option key={product.id} value={product.id}>{product.name}</option>
                      ))}
                    </select>
                    <p className={`mt-1 text-xs font-semibold ${overStock ? 'text-rose-600' : 'text-slate-500'}`}>
                      {t('retailer.shared.availableStock')}: {row.availableStock ?? 0}
                    </p>
                  </div>
                  <div>
                    <label className="label">{t('retailer.shared.quantityLabel')}</label>
                    <input className="input" type="number" min="0" value={row.quantityPieces} onChange={(event) => vm.updateItem(row.rowId, 'quantityPieces', event.target.value)} disabled={saving} />
                  </div>
                  <div>
                    <label className="label">{t('retailer.shared.priceLabel')}</label>
                    <input className="input" type="number" min="0" step="0.01" value={row.actualSalePrice} onChange={(event) => vm.updateItem(row.rowId, 'actualSalePrice', event.target.value)} disabled={saving} />
                  </div>
                  <div>
                    <label className="label">{t('retailer.shared.lineDiscountLabel')}</label>
                    <input className="input" type="number" min="0" step="0.01" value={row.lineDiscount} onChange={(event) => vm.updateItem(row.rowId, 'lineDiscount', event.target.value)} disabled={saving} />
                  </div>
                  <div className="flex items-end justify-between gap-2 lg:flex-col lg:items-end">
                    <p className="text-sm font-black text-slate-950">{formatCurrency(row.lineTotal)}</p>
                    <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={() => vm.removeItem(row.rowId)} disabled={saving}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            {t('retailer.shared.noItems')}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-700">{t('retailer.shared.summaryTitle')}</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="font-semibold text-slate-600">{t('retailer.shared.subtotal')}</dt>
              <dd className="font-black text-slate-950">{formatCurrency(vm.subtotal)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-semibold text-slate-600">{t('retailer.shared.lineDiscountTotal')}</dt>
              <dd className="font-black text-rose-700">- {formatCurrency(vm.lineDiscountTotal)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="font-semibold text-slate-600">{t('retailer.shared.discountLabel')}</dt>
              <dd className="flex items-center gap-2">
                <input className="input h-9 w-28 text-right" type="number" min="0" step="0.01" value={vm.discountInput} onChange={(event) => vm.setDiscountInput(event.target.value)} disabled={saving} />
              </dd>
            </div>
            {vm.loyaltyEligible ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-semibold text-slate-600">{t('retailer.shared.loyaltyRedeemPoints')}</dt>
                  <dd className="flex items-center gap-2">
                    <input
                      className="input h-9 w-28 text-right"
                      type="number"
                      min="0"
                      step="1"
                      value={vm.loyaltyRedeemPointsInput}
                      onChange={(event) => vm.setLoyaltyRedeemPointsInput(event.target.value)}
                      disabled={saving}
                    />
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="font-semibold text-slate-600">{t('retailer.shared.loyaltyRedeemAmount')}</dt>
                  <dd className="font-black text-rose-700">- {formatCurrency(vm.loyaltyRedeemAmount)}</dd>
                </div>
              </>
            ) : null}
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
              <dt className="font-black uppercase tracking-[0.1em] text-slate-700">{t('retailer.shared.totalAmount')}</dt>
              <dd className="font-black text-slate-950">{formatCurrency(vm.totalAmount)}</dd>
            </div>
            {vm.loyaltyEligible ? (
              <div className="flex items-center justify-between">
                <dt className="font-semibold text-slate-600">{t('retailer.shared.payableAfterLoyalty')}</dt>
                <dd className="font-black text-slate-950">{formatCurrency(vm.netTotalAfterLoyalty)}</dd>
              </div>
            ) : null}
            {vm.loyaltyEligible ? (
              <div className="flex items-center justify-between">
                <dt className="font-semibold text-slate-600">{t('retailer.shared.loyaltyPointsEarned')}</dt>
                <dd className="font-black text-emerald-700">{vm.loyaltyPointsEarned}</dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <dt className="font-semibold text-slate-600">{t('retailer.shared.paidAmountLabel')}</dt>
              <dd className="flex items-center gap-2">
                <input className="input h-9 w-28 text-right" type="number" min="0" step="0.01" value={vm.paidAmountInput} onChange={(event) => vm.setPaidAmountInput(event.target.value)} disabled={saving} />
                <button type="button" className="btn-secondary h-9 px-2 text-xs" onClick={vm.markFullyPaid} disabled={saving}>
                  {t('retailer.shared.markFullyPaid')}
                </button>
              </dd>
            </div>
            <div className="flex items-center justify-between border-t-2 border-slate-300 pt-2">
              <dt className="text-base font-black uppercase tracking-[0.1em] text-slate-950">{t('retailer.shared.dueAmount')}</dt>
              <dd className="text-lg font-black text-rose-700">{formatCurrency(vm.dueAmount)}</dd>
            </div>
          </dl>
          {vm.customerType === 'WALK_IN' && vm.dueAmount > 0 ? (
            <p className="mt-2 text-xs font-bold text-rose-600">{t('retailer.shared.walkInMustBePaid')}</p>
          ) : null}
          {vm.customerType === 'REGISTERED' && !vm.customerId && vm.dueAmount > 0 ? (
            <p className="mt-2 text-xs font-bold text-rose-600">{t('retailer.shared.dueRequiresCustomer')}</p>
          ) : null}
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">{t('purchaseReceive.paymentMethodLabel')}</label>
            <select className="input" value={vm.paymentMethod} onChange={(event) => vm.setPaymentMethod(event.target.value)} disabled={saving}>
              <option value="CASH">{t('purchaseReceive.paymentMethods.CASH')}</option>
              <option value="MOBILE_BANKING">{t('purchaseReceive.paymentMethods.MOBILE_BANKING')}</option>
              <option value="CHEQUE">{t('purchaseReceive.paymentMethods.CHEQUE')}</option>
            </select>
          </div>
          <div className="sm:col-span-4">
            <label className="label">{t('purchaseReceive.noteLabel')}</label>
            <textarea className="input min-h-28" value={vm.note} onChange={(event) => vm.setNote(event.target.value)} placeholder={t('purchaseReceive.noteLabel')} disabled={saving} />
          </div>
        </div>
      </div>
    </div>

    {showAddCustomer && (
      <RetailCustomerFormModal
        onClose={() => setShowAddCustomer(false)}
        onSave={async (payload) => {
          const result = await saveRetailCustomer(payload);
          if (result?.ok) {
            vm.setCustomerType('REGISTERED');
            vm.setCustomerId(result.retailCustomer.id);
            setShowAddCustomer(false);
          }
          return result;
        }}
      />
    )}
    </>
  );
}
