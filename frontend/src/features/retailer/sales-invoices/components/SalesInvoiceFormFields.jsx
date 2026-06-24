import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { DatePickerField } from '../../../../components/DatePicker.jsx';
import { formatCurrency } from '../../../../utils/calculations.js';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import RetailCustomerFormModal from '../../../retail-customers/components/RetailCustomerFormModal.jsx';

function matchesProductQuery(product, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return (
    product.name.toLowerCase().includes(normalizedQuery) ||
    (product.barcode || '').toLowerCase().includes(normalizedQuery) ||
    (product.sku || '').toLowerCase().includes(normalizedQuery)
  );
}

const autoSelect = (e) => e.target.select();

function isLowStock(product) {
  const threshold = product.reorderLevel !== null && product.reorderLevel !== undefined
    ? product.reorderLevel
    : product.piecesPerCase * 4;
  return Number(product.stockPieces) > 0 && Number(product.stockPieces) <= threshold;
}

export default function SalesInvoiceFormFields({ vm, t, productDirectory, retailCustomerDirectory, saving, saveRetailCustomer }) {
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [availableSerialsByProduct, setAvailableSerialsByProduct] = useState({});
  const [productPickerRowId, setProductPickerRowId] = useState(null);
  const [productQueries, setProductQueries] = useState({});
  const [highlightedIndexes, setHighlightedIndexes] = useState({});
  const searchRefs = useRef({});
  const prevRowCount = useRef(0);

  // Auto-focus the product search when a new row is added
  useEffect(() => {
    if (vm.lineRows.length > prevRowCount.current) {
      const lastRow = vm.lineRows[vm.lineRows.length - 1];
      if (lastRow) {
        requestAnimationFrame(() => searchRefs.current[lastRow.rowId]?.focus());
      }
    }
    prevRowCount.current = vm.lineRows.length;
  }, [vm.lineRows.length]);

  useEffect(() => {
    const neededProductIds = [...new Set(
      vm.lineRows.filter((row) => row.serialRequired && row.productId).map((row) => row.productId),
    )];
    const missingProductIds = neededProductIds.filter((productId) => !(productId in availableSerialsByProduct));
    if (!missingProductIds.length) return;

    let cancelled = false;
    Promise.all(
      missingProductIds.map((productId) =>
        inventoryApi.listAvailableProductSerials(productId).then((result) => [productId, result.serials || []])),
    ).then((entries) => {
      if (cancelled) return;
      setAvailableSerialsByProduct((current) => {
        const next = { ...current };
        for (const [productId, serials] of entries) next[productId] = serials;
        return next;
      });
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [vm.lineRows, availableSerialsByProduct]);

  function handleProductKeyDown(event, row, filteredProducts) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndexes((c) => ({ ...c, [row.rowId]: Math.min((c[row.rowId] ?? -1) + 1, filteredProducts.length - 1) }));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndexes((c) => ({ ...c, [row.rowId]: Math.max((c[row.rowId] ?? 1) - 1, 0) }));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const hi = highlightedIndexes[row.rowId] ?? -1;
      const target = filteredProducts[hi] ?? filteredProducts[0];
      if (target) {
        vm.updateItem(row.rowId, 'productId', target.id);
        setProductPickerRowId(null);
      }
    } else if (event.key === 'Escape') {
      setProductPickerRowId(null);
    }
  }

  return (
    <>
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <label className="label">{t('retailer.shared.saleTypeLabel')}</label>
          <select className="input" value={vm.saleType} onChange={(event) => vm.setSaleType(event.target.value)} disabled={saving}>
            <option value="RETAIL">{t('retailer.shared.saleTypes.RETAIL')}</option>
            <option value="WHOLESALE">{t('retailer.shared.saleTypes.WHOLESALE')}</option>
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
          {vm.customerType === 'REGISTERED' && vm.selectedCustomer ? (() => {
            const due = Number(vm.selectedCustomer.totalSpent || 0) - Number(vm.selectedCustomer.totalPaid || 0);
            return due > 0
              ? <p className="mt-1 text-xs font-bold text-amber-600">{t('retailer.shared.outstandingDue')}: {formatCurrency(due)}</p>
              : <p className="mt-1 text-xs font-semibold text-emerald-600">{t('retailer.shared.noOutstandingDue')}</p>;
          })() : null}
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
              const availableSerials = availableSerialsByProduct[row.productId] || [];
              const pickerOpen = productPickerRowId === row.rowId;
              const productQuery = productQueries[row.rowId] || '';
              const filteredProducts = pickerOpen
                ? availableProducts.filter((product) => matchesProductQuery(product, productQuery))
                : [];
              const selectedProductName = availableProducts.find((product) => product.id === row.productId)?.name || row.productName || '';
              const highlightIndex = highlightedIndexes[row.rowId] ?? -1;

              return (
                <div key={row.rowId} className="space-y-3 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1.8fr)_minmax(110px,0.6fr)_minmax(110px,0.6fr)_minmax(110px,0.6fr)_minmax(110px,0.6fr)_auto]">
                    <div className="relative">
                      <label className="label">{t('products.product')}</label>
                      <input
                        ref={(el) => { searchRefs.current[row.rowId] = el; }}
                        data-role="product-search"
                        className="input"
                        value={pickerOpen ? productQuery : selectedProductName}
                        onFocus={() => {
                          setProductPickerRowId(row.rowId);
                          setProductQueries((c) => ({ ...c, [row.rowId]: '' }));
                          setHighlightedIndexes((c) => ({ ...c, [row.rowId]: -1 }));
                        }}
                        onChange={(event) => setProductQueries((c) => ({ ...c, [row.rowId]: event.target.value }))}
                        onBlur={() => setTimeout(() => setProductPickerRowId((c) => (c === row.rowId ? null : c)), 150)}
                        onKeyDown={(event) => handleProductKeyDown(event, row, filteredProducts)}
                        placeholder={t('retailer.shared.searchProductPlaceholder')}
                        disabled={saving}
                      />
                      {pickerOpen ? (
                        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                          {filteredProducts.length ? filteredProducts.map((product, index) => (
                            <button
                              key={product.id}
                              type="button"
                              className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm ${index === highlightIndex ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50'}`}
                              onMouseDown={() => { vm.updateItem(row.rowId, 'productId', product.id); setProductPickerRowId(null); }}
                              onMouseEnter={() => setHighlightedIndexes((c) => ({ ...c, [row.rowId]: index }))}
                            >
                              <span className="font-semibold">{product.name}</span>
                              {product.barcode || product.sku ? (
                                <span className="text-xs text-slate-500">
                                  {[product.sku && `SKU: ${product.sku}`, product.barcode && `Barcode: ${product.barcode}`].filter(Boolean).join(' · ')}
                                </span>
                              ) : null}
                              <span className={`text-xs font-semibold ${
                                Number(product.stockPieces) === 0 ? 'text-rose-500' :
                                isLowStock(product) ? 'text-amber-500' : 'text-slate-400'
                              }`}>
                                {Number(product.stockPieces) === 0
                                  ? '⚠ Out of stock'
                                  : isLowStock(product)
                                    ? `⚠ Low: ${product.stockPieces} left`
                                    : `${product.stockPieces} in stock`}
                              </span>
                            </button>
                          )) : (
                            <p className="px-3 py-2 text-sm text-slate-500">{t('retailer.shared.noProductsFound')}</p>
                          )}
                        </div>
                      ) : null}
                      {(() => {
                        const selectedProduct = row.productId ? productDirectory.find((p) => p.id === row.productId) : null;
                        const low = selectedProduct && isLowStock(selectedProduct);
                        return (
                          <p className={`mt-1 text-xs font-semibold ${overStock ? 'text-rose-600' : low ? 'text-amber-500' : 'text-slate-500'}`}>
                            {t('retailer.shared.availableStock')}: {row.availableStock ?? 0}
                            {overStock ? ' — exceeds available stock' : low ? ' — low stock' : ''}
                          </p>
                        );
                      })()}
                    </div>
                    <div>
                      <label className="label">{t('retailer.shared.quantityLabel')}</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        value={row.quantityPieces}
                        onFocus={autoSelect}
                        onChange={(event) => vm.updateItem(row.rowId, 'quantityPieces', event.target.value)}
                        disabled={saving || row.serialRequired}
                      />
                      {row.serialRequired ? <p className="mt-1 text-xs font-semibold text-slate-500">{t('retailer.shared.serialQuantityHint')}</p> : null}
                    </div>
                    <div>
                      <label className="label">{t('retailer.shared.priceLabel')}</label>
                      <input className="input" type="number" min="0" step="0.01" value={row.actualSalePrice} onFocus={autoSelect} onChange={(event) => vm.updateItem(row.rowId, 'actualSalePrice', event.target.value)} disabled={saving} />
                    </div>
                    <div>
                      <label className="label">{t('retailer.shared.lineDiscountLabel')}</label>
                      <input className="input" type="number" min="0" step="0.01" value={row.lineDiscount} onFocus={autoSelect} onChange={(event) => vm.updateItem(row.rowId, 'lineDiscount', event.target.value)} disabled={saving} />
                    </div>
                    <div className="flex items-end justify-between gap-2 lg:flex-col lg:items-end">
                      <p className="text-sm font-black text-slate-950">{formatCurrency(row.lineTotal)}</p>
                      <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={() => vm.removeItem(row.rowId)} disabled={saving}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {row.serialRequired ? (
                    <div className="rounded-xl border border-dashed border-indigo-300 bg-indigo-50/60 p-3">
                      <p className="label mb-2">
                        {t('retailer.shared.selectSerialsLabel')}
                        <span className={`ml-2 font-semibold ${row.serialIds.length ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {t('retailer.shared.serialsSelectedCount', { count: row.serialIds.length })}
                        </span>
                      </p>
                      {availableSerials.length ? (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {availableSerials.map((serial) => (
                            <label key={serial.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300"
                                checked={row.serialIds.includes(serial.id)}
                                onChange={() => vm.toggleItemSerial(row.rowId, serial.id)}
                                disabled={saving}
                              />
                              {serial.serialNumber || serial.imei1 || serial.imei2}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs font-semibold text-rose-600">{t('retailer.shared.noSerialsAvailable')}</p>
                      )}
                    </div>
                  ) : null}
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
                <input className="input h-9 w-28 text-right" type="number" min="0" step="0.01" value={vm.discountInput} onFocus={autoSelect} onChange={(event) => vm.setDiscountInput(event.target.value)} disabled={saving} />
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
                      onFocus={autoSelect}
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
                <input className="input h-9 w-28 text-right" type="number" min="0" step="0.01" value={vm.paidAmountInput} onFocus={autoSelect} onChange={(event) => vm.setPaidAmountInput(event.target.value)} disabled={saving} />
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
