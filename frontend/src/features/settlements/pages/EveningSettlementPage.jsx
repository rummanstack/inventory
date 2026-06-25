import { AlertTriangle, CheckCircle2, ClipboardList, Download, Plus, Printer, Trash2 } from 'lucide-react';
import PrintableSheet from '../../../components/PrintableSheet.jsx';
import { Alert, Badge, EmptyState, SectionHeader, TableSkeleton, cx } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import AuditHistory from '../../../components/AuditHistory.jsx';
import { buildPdfFileName, downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi';
import { formatCasePiece, formatCurrency, formatNumber } from '../../../utils/calculations.js';
import { useSettlementViewModel } from '../viewmodels/useSettlementViewModel';

export default function EveningSettlementPage() {
  const { productDirectory, dsrDirectory, srDirectory, shopDirectory, today, saveSettlement, t, can, tenant, language } = useInventoryApp();
  const vm = useSettlementViewModel({ products: productDirectory, dsrs: dsrDirectory, today, saveSettlementAction: saveSettlement, t, tenantName: tenant?.name });
  const canCreateSettlement = can('create_settlements');
  const canUpdateSettlement = can('update_settlements');
  const canEditSettlement = vm.completedSettlement ? canUpdateSettlement : canCreateSettlement;
  const issuedPiecesTotal = vm.displayRows.reduce((sum, row) => sum + Number(row.issuedPieces || 0), 0);
  const soldPiecesTotal = vm.displayRows.reduce((sum, row) => sum + Number(row.soldPieces || 0), 0);
  const returnedPiecesTotal = vm.displayRows.reduce((sum, row) => sum + Number(row.returnedPieces || 0), 0);
  const damagedPiecesTotal = vm.displayRows.reduce((sum, row) => sum + Number(row.damagedPieces || 0), 0);

  function recordSettlementPrint(label) {
    if (!vm.completedSettlement) {
      return;
    }
    inventoryApi.recordPrint({ entityType: 'settlement', entityId: vm.completedSettlement.id, label }).catch(() => {});
  }

  function getExtraReturnOptions(rowId) {
    const selectedProductIds = new Set(vm.extraReturns.filter((row) => row.id !== rowId).map((row) => row.productId));
    return productDirectory.filter((product) => !selectedProductIds.has(product.id) || vm.extraReturns.find((row) => row.id === rowId)?.productId === product.id);
  }

  return (
    <div>
      <SectionHeader eyebrow={t('nav.eveningSettlement')} title={t('nav.eveningSettlement')} description={t('settlement.description')} />

      <div className="surface p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="label">{t('common.date')}</label>
            <DatePickerField value={vm.date} onChange={vm.setDate} max={new Date().toISOString().slice(0, 10)} />
          </div>
          <div>
            <label className="label">{t('dsr.title')}</label>
            <select className="input" value={vm.dsrId} onChange={(event) => vm.setDsrId(event.target.value)}>
              {vm.activeDsrs.map((dsr) => (
                <option key={dsr.id} value={dsr.id}>
                  {dsr.name} - {dsr.area}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase text-slate-500">{t('settlement.totalPayable')}</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{formatCurrency(vm.totalPayable)}</p>
          </div>
        </div>
        {vm.message ? (
          <div className="mt-4">
            <Alert type={vm.message.type}>{vm.message.text}</Alert>
          </div>
        ) : null}
        {vm.completedSettlement ? (
          <div className="mt-4">
            <Alert type="info">{t('settlement.existingInfo')}</Alert>
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="muted-chip">{formatNumber(issuedPiecesTotal, language)} {t('settlement.issued')}</span>
          <span className="muted-chip">{formatNumber(soldPiecesTotal, language)} {t('settlement.sold')}</span>
          <span className="muted-chip">{formatNumber(returnedPiecesTotal, language)} {t('settlement.returned')}</span>
          <span className="muted-chip">{formatNumber(damagedPiecesTotal, language)} {t('settlement.damaged')}</span>
          {vm.totalReturnValue > 0 ? <span className="muted-chip">{formatCurrency(vm.grossIssueValue, language)} {t('settlement.productTotal')}</span> : null}
          <span className="muted-chip">{formatCurrency(vm.totalPayable, language)} {t('settlement.payable')}</span>
          {vm.totalReturnValue > 0 ? <span className="muted-chip">-{formatCurrency(vm.totalReturnValue, language)} {t('settlement.returnValueLabel')}</span> : null}
          {vm.discount > 0 ? <span className="muted-chip">-{formatCurrency(vm.discount, language)} {t('settlement.discount')}</span> : null}
        </div>
      </div>

      {vm.loading ? (
        <div className="mt-6">
          <TableSkeleton rows={6} columns={9} />
        </div>
      ) : (
      <div className="surface mt-6 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">{t('settlement.itemsTitle')}</h2>
            <p className="mt-1 text-sm text-slate-500">{vm.completedSettlement ? t('settlement.updateHint') : t('settlement.entryHint')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {vm.completedSettlement ? <Badge tone="emerald">{t('settlement.editingCompleted')}</Badge> : null}
            <Badge tone="slate">{formatNumber(vm.displayRows.length)} {t('common.records')}</Badge>
          </div>
        </div>

        {vm.displayRows.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">{t('products.product')}</th>
                    <th className="px-4 py-3">{t('settlement.issued')}</th>
                    <th className="px-4 py-3">{t('settlement.returnCase')}</th>
                    <th className="px-4 py-3">{t('settlement.returnPiece')}</th>
                    <th className="px-4 py-3">{t('settlement.damagedCase')}</th>
                    <th className="px-4 py-3">{t('settlement.damagedPiece')}</th>
                    <th className="px-4 py-3">{t('settlement.sold')}</th>
                    <th className="px-4 py-3">{t('settlement.rate')}</th>
                    <th className="px-4 py-3">{t('settlement.payable')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vm.displayRows.map((row) => (
                    <tr key={row.key || `${row.productId}-${row.rate}`} className={cx('hover:bg-slate-50', row.invalid && 'bg-rose-50')}>
                      <td className="table-cell font-semibold text-slate-950">{row.productName}</td>
                      <td className="table-cell">{formatCasePiece(row.issuedPieces, row.piecesPerCase)}</td>
                      <td className="table-cell">
                        <input className="input h-9 w-24" type="number" min="0" value={vm.returns[row.key]?.caseQty || ''} onChange={(event) => vm.updateReturn(row.key, 'caseQty', event.target.value)} disabled={vm.saving} />
                      </td>
                      <td className="table-cell">
                        <input className="input h-9 w-24" type="number" min="0" value={vm.returns[row.key]?.pieceQty || ''} onChange={(event) => vm.updateReturn(row.key, 'pieceQty', event.target.value)} disabled={vm.saving} />
                      </td>
                      <td className="table-cell">
                        <input className="input h-9 w-24" type="number" min="0" value={vm.returns[row.key]?.damagedCaseQty || ''} onChange={(event) => vm.updateReturn(row.key, 'damagedCaseQty', event.target.value)} disabled={vm.saving} />
                      </td>
                      <td className="table-cell">
                        <input className="input h-9 w-24" type="number" min="0" value={vm.returns[row.key]?.damagedPieceQty || ''} onChange={(event) => vm.updateReturn(row.key, 'damagedPieceQty', event.target.value)} disabled={vm.saving} />
                      </td>
                      <td className="table-cell font-semibold">{formatCasePiece(row.soldPieces, row.piecesPerCase)}</td>
                      <td className="table-cell">{formatCurrency(row.rate)}</td>
                      <td className="table-cell font-bold">{formatCurrency(row.payable)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-100 px-5 py-5">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-700">{t('settlement.extraReturnsTitle')}</h3>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone="amber">{t('settlement.extraReturnTotal', { pieces: vm.totalExtraReturnedPieces })}</Badge>
                  <button type="button" className="btn-secondary" onClick={vm.addExtraReturn} disabled={!productDirectory.length}>
                    <Plus size={18} />
                    {t('settlement.addExtraReturn')}
                  </button>
                </div>
              </div>

              {vm.extraReturns.length ? (
                <div className="space-y-3">
                  {vm.extraReturns.map((row) => {
                    const availableProducts = getExtraReturnOptions(row.id);
                    return (
                      <div key={row.id} className="grid gap-3 rounded-[22px] border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(120px,0.5fr)_minmax(120px,0.5fr)_minmax(120px,0.5fr)_minmax(120px,0.5fr)_auto]">
                        <div>
                          <label className="label">{t('settlement.extraReturnProduct')}</label>
                          <select
                            className="input"
                            value={row.productId}
                            onChange={(event) => vm.updateExtraReturn(row.id, 'productId', event.target.value)}
                          >
                            {availableProducts.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} - {product.category}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="label">{t('settlement.returnCase')}</label>
                          <input className="input" type="number" min="0" value={row.caseQty} onChange={(event) => vm.updateExtraReturn(row.id, 'caseQty', event.target.value)} />
                        </div>
                        <div>
                          <label className="label">{t('settlement.returnPiece')}</label>
                          <input className="input" type="number" min="0" value={row.pieceQty} onChange={(event) => vm.updateExtraReturn(row.id, 'pieceQty', event.target.value)} />
                        </div>
                        <div>
                          <label className="label">{t('settlement.damagedCase')}</label>
                          <input className="input" type="number" min="0" value={row.damagedCaseQty} onChange={(event) => vm.updateExtraReturn(row.id, 'damagedCaseQty', event.target.value)} />
                        </div>
                        <div>
                          <label className="label">{t('settlement.damagedPiece')}</label>
                          <input className="input" type="number" min="0" value={row.damagedPieceQty} onChange={(event) => vm.updateExtraReturn(row.id, 'damagedPieceQty', event.target.value)} />
                        </div>
                        <div className="flex items-end justify-start lg:justify-end">
                          <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={() => vm.removeExtraReturn(row.id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  {t('settlement.noExtraReturns')}
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 p-4">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-700">{t('settlement.shopDueCollectionsTitle')}</h3>
                <button type="button" className="btn-secondary" onClick={vm.addShopCollection}>
                  <Plus size={18} />
                  {t('settlement.addShopCollection')}
                </button>
              </div>
              {vm.shopCollections.length ? (
                <div className="mb-4 space-y-3">
                  {vm.shopCollections.map((sc) => (
                    <div key={sc.id} className="grid gap-3 rounded-[22px] border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.5fr)_auto]">
                      <div>
                        <label className="label">{t('settlement.shopDueShop')}</label>
                        <select className="input" value={sc.shopId} onChange={(e) => vm.updateShopCollection(sc.id, 'shopId', e.target.value)} disabled={vm.saving}>
                          <option value="">{t('settlement.shopDueSelectShop')}</option>
                          {shopDirectory.map((shop) => (
                            <option key={shop.id} value={shop.id}>{shop.shopName || shop.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">{t('settlement.shopDueAmount')}</label>
                        <input className="input" type="number" min="0" step="0.01" value={sc.amount} onChange={(e) => vm.updateShopCollection(sc.id, 'amount', e.target.value)} disabled={vm.saving} />
                      </div>
                      <div>
                        <label className="label">{t('settlement.shopDueNote')}</label>
                        <input className="input" type="text" value={sc.note} onChange={(e) => vm.updateShopCollection(sc.id, 'note', e.target.value)} placeholder={t('settlement.shopDueNotePlaceholder')} disabled={vm.saving} />
                      </div>
                      <div className="flex items-end">
                        <button type="button" className="btn-secondary text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => vm.removeShopCollection(sc.id)} disabled={vm.saving}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-4 rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  {t('settlement.noShopDueCollections')}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 p-4">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-700">SR Handover</h3>
                <button type="button" className="btn-secondary" onClick={vm.addSrHandover}>
                  <Plus size={18} />
                  Add SR Handover
                </button>
              </div>
              {vm.srHandovers.length ? (
                <div className="mb-4 space-y-3">
                  {vm.srHandovers.map((h) => (
                    <div key={h.id} className="grid gap-3 rounded-[22px] border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.5fr)_auto]">
                      <div>
                        <label className="label">SR</label>
                        <select
                          className="input"
                          value={h.srId}
                          onChange={(e) => {
                            const selected = srDirectory.find((s) => s.id === e.target.value);
                            vm.updateSrHandover(h.id, 'srId', e.target.value);
                            vm.updateSrHandover(h.id, 'srName', selected?.name || '');
                          }}
                          disabled={vm.saving}
                        >
                          <option value="">Select SR...</option>
                          {srDirectory.map((sr) => (
                            <option key={sr.id} value={sr.id}>{sr.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">Amount</label>
                        <input className="input" type="number" min="0" step="0.01" value={h.amount} onChange={(e) => vm.updateSrHandover(h.id, 'amount', e.target.value)} disabled={vm.saving} />
                      </div>
                      <div>
                        <label className="label">Note</label>
                        <input className="input" type="text" value={h.note} onChange={(e) => vm.updateSrHandover(h.id, 'note', e.target.value)} placeholder="Optional note" disabled={vm.saving} />
                      </div>
                      <div className="flex items-end">
                        <button type="button" className="btn-secondary text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => vm.removeSrHandover(h.id)} disabled={vm.saving}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-4 rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  No SR handovers — add one if DSR handed memo to an SR.
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 p-4">
              {vm.hasInvalidReturns ? (
                <div className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-rose-700">
                  <AlertTriangle size={17} />
                  {t('settlement.invalidReturns')}
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-700">{t('settlement.summaryTitle')}</h3>
                  <dl className="mt-3 space-y-0 text-sm">
                    {/* Today's Sales (with optional returns breakdown) */}
                    {vm.totalReturnValue > 0 ? (
                      <>
                        <div className="flex items-center justify-between py-1.5">
                          <dt className="font-semibold text-slate-500">{t('settlement.productTotal')}</dt>
                          <dd className="font-semibold text-slate-700">{formatCurrency(vm.grossIssueValue, language)}</dd>
                        </div>
                        <div className="flex items-center justify-between py-1.5">
                          <dt className="font-semibold text-slate-500">{t('settlement.damagedReturnedPrice')}</dt>
                          <dd className="font-black text-rose-600">− {formatCurrency(vm.totalReturnValue, language)}</dd>
                        </div>
                        <div className="flex items-center justify-between border-t border-dashed border-slate-200 py-1.5">
                          <dt className="font-bold text-slate-700">{t('settlement.todaySales')}</dt>
                          <dd className="font-black text-slate-950">{formatCurrency(vm.totalPayable - vm.extraReturnValue, language)}</dd>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-between py-1.5">
                        <dt className="font-bold text-slate-700">{t('settlement.todaySales')}</dt>
                        <dd className="font-black text-slate-950">{formatCurrency(vm.totalPayable - vm.extraReturnValue, language)}</dd>
                      </div>
                    )}

                    {/* Discount */}
                    <div className="flex items-center justify-between gap-3 py-1.5">
                      <dt className="font-semibold text-slate-500">{t('settlement.discount')}</dt>
                      <dd className="flex items-center gap-1.5">
                        <span className="font-bold text-rose-600">−</span>
                        <input className="input h-9 w-28 text-right" type="number" min="0" step="0.01" value={vm.discountInput} onChange={(event) => vm.setDiscountInput(event.target.value)} disabled={vm.saving} />
                      </dd>
                    </div>
                    {vm.totalSrHandovers > 0 ? (
                      <div className="flex items-center justify-between py-1.5">
                        <dt className="font-semibold text-slate-500">SR Handover</dt>
                        <dd className="font-black text-rose-600">− {formatCurrency(vm.totalSrHandovers, language)}</dd>
                      </div>
                    ) : null}

                    {/* Today Payable = today's sales − discount − sr handovers */}
                    <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 pb-1.5 mt-1">
                      <dt className="font-black text-slate-800">Today Payable</dt>
                      <dd className="font-black text-slate-950">{formatCurrency(vm.todayDue + vm.amountPaid, language)}</dd>
                    </div>

                    {/* Previous Due */}
                    {vm.previousDue > 0 ? (
                      <div className="flex items-center justify-between py-1.5">
                        <dt className="font-semibold text-slate-500">{t('settlement.previousDue')}</dt>
                        <dd className="font-black text-amber-700">+ {formatCurrency(vm.previousDue, language)}</dd>
                      </div>
                    ) : null}

                    {/* Total Receivable */}
                    <div className="flex items-center justify-between border-t-2 border-slate-300 pt-2.5 pb-1.5 mt-1">
                      <dt className="font-black text-slate-800">{t('settlement.totalReceivable')}</dt>
                      <dd className="font-black text-slate-950">{formatCurrency(vm.receivableTotal, language)}</dd>
                    </div>

                    {/* Cash Received */}
                    <div className="flex items-center justify-between gap-3 py-1.5">
                      <dt className="font-semibold text-slate-500">{t('settlement.cashReceived')}</dt>
                      <dd className="flex items-center gap-1.5">
                        <span className="font-bold text-emerald-600">−</span>
                        <input className="input h-9 w-28 text-right" type="number" min="0" step="0.01" value={vm.amountPaidInput} onChange={(event) => vm.setAmountPaidInput(event.target.value)} disabled={vm.saving} />
                      </dd>
                    </div>

                    {/* New Due */}
                    <div className="flex items-center justify-between rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 mt-1">
                      <dt className="text-base font-black uppercase tracking-[0.1em] text-slate-950">{t('settlement.newDue')}</dt>
                      <dd className={cx('text-lg font-black', vm.dueAmount > 0 ? 'text-rose-700' : 'text-emerald-700')}>
                        {formatCurrency(Math.max(0, vm.dueAmount), language)}
                      </dd>
                    </div>
                  </dl>
                  {vm.discountTooHigh ? (
                    <div className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-rose-700">
                      <AlertTriangle size={16} />
                      {t('settlement.discountTooHigh')}
                    </div>
                  ) : null}
                  {vm.amountPaidTooHigh ? (
                    <div className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-rose-700">
                      <AlertTriangle size={16} />
                      {t('settlement.amountPaidTooHigh')}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3">
                  <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Today's Outstanding</p>
                    <p className={cx('mt-1 text-lg font-black', vm.todayDue > 0 ? 'text-rose-700' : 'text-emerald-700')}>{formatCurrency(Math.max(0, vm.todayDue), language)}</p>
                    <p className="mt-1 text-xs font-medium text-slate-400">Today's sales − discount − cash received</p>
                  </div>
                  {vm.completedSettlement ? (
                    <div>
                      <label className="label">{t('settlement.editReasonLabel')}</label>
                      <textarea className="input min-h-20" value={vm.reasonInput} onChange={(event) => vm.setReasonInput(event.target.value)} placeholder={t('settlement.editReasonPlaceholder')} disabled={vm.saving} />
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                    {vm.completedSettlement && canUpdateSettlement ? (
                      <button type="button" className="btn-secondary justify-center" onClick={() => window.print()}>
                        <Printer size={18} />
                        {t('settlement.printSheet')}
                      </button>
                    ) : null}
                    {canEditSettlement ? (
                      <button type="button" className="btn-primary justify-center" onClick={vm.completeSettlement} disabled={vm.saving || vm.hasErrors}>
                        <CheckCircle2 size={18} />
                        {vm.saving ? t('common.saving') : vm.completedSettlement ? t('settlement.updateSettlement') : t('settlement.completeSettlement')}
                      </button>
                    ) : (
                      <span className="text-sm font-semibold text-slate-400">-</span>
                    )}
                  </div>
                  {!vm.hasInvalidReturns && !vm.discountTooHigh && !vm.amountPaidTooHigh ? (
                    <p className="text-sm font-semibold text-slate-600">{t('settlement.returnHint')}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="p-5">
            <EmptyState title={t('settlement.noIssueTitle')} description={t('settlement.noIssueDescription')} icon={ClipboardList} />
          </div>
        )}
      </div>
      )}

      {!vm.loading && vm.completedSettlement ? (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-end gap-2 no-print">
              {canUpdateSettlement ? (
                <>
                  <button type="button" className="btn-secondary" onClick={() => { recordSettlementPrint('pdf'); downloadSheetPdf('settlement-print-sheet', buildPdfFileName(vm.sheet)); }}>
                    <Download size={18} />
                    {t('settlement.downloadPdf')}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => { recordSettlementPrint('print'); window.print(); }}>
                    <Printer size={18} />
                    {t('settlement.printSheet')}
                  </button>
                </>
              ) : null}
          </div>
          <PrintableSheet sheet={vm.sheet} printTarget targetId="settlement-print-sheet" t={t} language={language} />
          <div className="surface mt-4 p-5">
            <AuditHistory entityType="settlement" entityId={vm.completedSettlement.id} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
