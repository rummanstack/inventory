import { AlertTriangle, CheckCircle2, ClipboardList, Download, Loader2, Plus, Printer, Trash2 } from 'lucide-react';
import PrintableSheet from '../../../components/PrintableSheet.jsx';
import { Alert, Badge, EmptyState, MobileCardList, SectionHeader, TableSkeleton, cx, Select } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import AuditHistory from '../../../components/AuditHistory.jsx';
import { buildPdfFileName, downloadSheetPdf, printElementById } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';
import { formatCasePiece, formatCurrency, formatNumber, toPieces } from '../../../utils/calculations.js';
import { useSettlementViewModel } from '../viewmodels/useSettlementViewModel';
import { useEffect } from 'react';

export default function EveningSettlementPage() {
  const { productDirectory, dsrDirectory, srDirectory, shopDirectory, supplierDirectory, today, saveSettlement, t, can, tenant, language } = useInventoryApp();
  const vm = useSettlementViewModel({ products: productDirectory, dsrs: dsrDirectory, today, saveSettlementAction: saveSettlement, t, tenantName: tenant?.name });
  const canCreateSettlement = can('create_settlements');
  const canUpdateSettlement = can('update_settlements');
  // Completed settlements can only be edited on the day they were made — backend enforces the same rule.
  const canEditSettlement = vm.completedSettlement ? (canUpdateSettlement && vm.date === today) : canCreateSettlement;
  const [downloadingPdf, downloadPdf] = useAsyncAction();
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

  function handleDownloadPdf() {
    return downloadPdf(async () => {
      recordSettlementPrint('pdf');
      await downloadSheetPdf('settlement-print-sheet', buildPdfFileName(vm.sheet));
    });
  }

  function handlePrintSheet() {
    recordSettlementPrint('print');
    printElementById('settlement-print-sheet');
  }

  function getExtraReturnOptions(rowId) {
    const issuedProductIds = new Set(vm.displayRows.map((row) => row.productId));
    const selectedProductIds = new Set(vm.extraReturns.filter((row) => row.id !== rowId).map((row) => row.productId));
    return productDirectory.filter((product) => !issuedProductIds.has(product.id) && !selectedProductIds.has(product.id));
  }

  useEffect(() => {
    function handleKeyDown(event) {
      const key = event.key.toLowerCase();
      const isSaveShortcut = event.ctrlKey || event.metaKey;
      const isReportShortcut = event.altKey && !event.ctrlKey && !event.metaKey;
      if (key === 's' && isSaveShortcut && canEditSettlement && !vm.saving && !vm.hasErrors) {
        event.preventDefault();
        vm.completeSettlement();
      } else if (key === 'd' && isReportShortcut && vm.completedSettlement && canUpdateSettlement && !downloadingPdf) {
        event.preventDefault();
        handleDownloadPdf();
      } else if (key === 'p' && isReportShortcut && vm.completedSettlement && canUpdateSettlement) {
        event.preventDefault();
        handlePrintSheet();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canEditSettlement, canUpdateSettlement, downloadingPdf, vm.saving, vm.hasErrors, vm.completeSettlement, vm.completedSettlement, vm.sheet]);

  return (
    <div className={vm.displayRows.length && canEditSettlement ? 'max-lg:pb-24' : undefined}>
      <SectionHeader eyebrow={t('nav.eveningSettlement')} title={t('nav.eveningSettlement')} description={t('settlement.description')} />

      <div className="surface p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="label">{t('common.date')}</label>
            <DatePickerField value={vm.date} onChange={vm.setDate} max={new Date().toISOString().slice(0, 10)} />
          </div>
          <div>
            <label className="label">{t('dsr.title')}</label>
            <Select className="input" value={vm.dsrId} onChange={(event) => vm.setDsrId(event.target.value)}>
              {vm.activeDsrs.map((dsr) => (
                <option key={dsr.id} value={dsr.id}>
                  {dsr.name} - {dsr.area}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">{t('settlement.totalPayable')}</label>
            <input className="input" disabled readOnly value={formatCurrency(vm.totalPayable)} />
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

          </div>
          <div className="flex flex-wrap items-center gap-2">
            {vm.completedSettlement ? <Badge tone="emerald">{t('settlement.editingCompleted')}</Badge> : null}
            <Badge tone="slate">{formatNumber(vm.displayRows.length)} {t('common.records')}</Badge>
          </div>
        </div>

        {vm.displayRows.length ? (
          <>
            <MobileCardList>
              {vm.displayRows.map((row) => (
                <div key={row.key || `${row.productId}-${row.rate}`} className={cx('px-4 py-3', row.invalid && 'bg-rose-50')}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-950">{row.productName}</p>
                      <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                        {t('settlement.issued')} {formatCasePiece(row.issuedPieces, row.piecesPerCase)} · {formatCurrency(row.rate)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold tabular-nums text-slate-950">{formatCurrency(row.payable)}</p>
                      <p className="mt-0.5 text-xs font-medium tabular-nums text-slate-500">{formatCasePiece(row.soldPieces, row.piecesPerCase)} {t('settlement.sold')}</p>
                    </div>
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('settlement.returnCase')}</label>
                      <input className="input" type="number" inputMode="decimal" min="0" value={vm.returns[row.key]?.caseQty || ''} onChange={(event) => vm.updateReturn(row.key, 'caseQty', event.target.value)} disabled={vm.saving} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('settlement.returnPiece')}</label>
                      <input className="input" type="number" inputMode="decimal" min="0" value={vm.returns[row.key]?.pieceQty || ''} onChange={(event) => vm.updateReturn(row.key, 'pieceQty', event.target.value)} disabled={vm.saving} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('settlement.damagedCase')}</label>
                      <input className="input" type="number" inputMode="decimal" min="0" value={vm.returns[row.key]?.damagedCaseQty || ''} onChange={(event) => vm.updateReturn(row.key, 'damagedCaseQty', event.target.value)} disabled={vm.saving} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('settlement.damagedPiece')}</label>
                      <input className="input" type="number" inputMode="decimal" min="0" value={vm.returns[row.key]?.damagedPieceQty || ''} onChange={(event) => vm.updateReturn(row.key, 'damagedPieceQty', event.target.value)} disabled={vm.saving} />
                    </div>
                  </div>
                </div>
              ))}
            </MobileCardList>
            <div className="hidden overflow-x-auto md:block">
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
                        <input className="input h-9 w-24" type="number" inputMode="decimal" min="0" value={vm.returns[row.key]?.caseQty || ''} onChange={(event) => vm.updateReturn(row.key, 'caseQty', event.target.value)} disabled={vm.saving} />
                      </td>
                      <td className="table-cell">
                        <input className="input h-9 w-24" type="number" inputMode="decimal" min="0" value={vm.returns[row.key]?.pieceQty || ''} onChange={(event) => vm.updateReturn(row.key, 'pieceQty', event.target.value)} disabled={vm.saving} />
                      </td>
                      <td className="table-cell">
                        <input className="input h-9 w-24" type="number" inputMode="decimal" min="0" value={vm.returns[row.key]?.damagedCaseQty || ''} onChange={(event) => vm.updateReturn(row.key, 'damagedCaseQty', event.target.value)} disabled={vm.saving} />
                      </td>
                      <td className="table-cell">
                        <input className="input h-9 w-24" type="number" inputMode="decimal" min="0" value={vm.returns[row.key]?.damagedPieceQty || ''} onChange={(event) => vm.updateReturn(row.key, 'damagedPieceQty', event.target.value)} disabled={vm.saving} />
                      </td>
                      <td className="table-cell font-semibold">{formatCasePiece(row.soldPieces, row.piecesPerCase)}</td>
                      <td className="table-cell">{formatCurrency(row.rate)}</td>
                      <td className="table-cell font-bold">{formatCurrency(row.payable)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-100 px-5 py-4">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t('settlement.extraReturnsTitle')}</h3>
                <div className="flex items-center gap-3">
                  <Badge tone="amber">{t('settlement.extraReturnTotal', { pieces: vm.totalExtraReturnedPieces })}</Badge>
                  <button type="button" className="btn-secondary h-8 gap-1.5 px-3 py-1.5 text-xs" onClick={vm.addExtraReturn} disabled={!getExtraReturnOptions('').length}>
                    <Plus size={14} />
                    {t('settlement.addExtraReturn')}
                  </button>
                </div>
              </div>

              {vm.extraReturns.length ? (
                <div className="space-y-3">
                  {vm.extraReturns.map((row) => {
                    const availableProducts = getExtraReturnOptions(row.id);
                    const product = productDirectory.find((p) => p.id === row.productId);
                    const rate = Number(product?.wholesalePrice || 0);
                    const rowValue = (toPieces(row.caseQty, row.pieceQty, row.piecesPerCase) + toPieces(row.damagedCaseQty, row.damagedPieceQty, row.piecesPerCase)) * rate;
                    return (
                      <div key={row.id} className="grid gap-3 rounded-[22px] border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(120px,0.5fr)_minmax(120px,0.5fr)_minmax(120px,0.5fr)_minmax(120px,0.5fr)_minmax(120px,0.5fr)_auto]">
                        <div>
                          <label className="label">{t('settlement.extraReturnProduct')}</label>
                          <Select
                            className="input"
                            value={row.productId}
                            onChange={(event) => vm.updateExtraReturn(row.id, 'productId', event.target.value)}
                          >
                            {availableProducts.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} - {product.category}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div>
                          <label className="label">{t('settlement.returnCase')}</label>
                          <input className="input" type="number" inputMode="decimal" min="0" value={row.caseQty} onChange={(event) => vm.updateExtraReturn(row.id, 'caseQty', event.target.value)} />
                        </div>
                        <div>
                          <label className="label">{t('settlement.returnPiece')}</label>
                          <input className="input" type="number" inputMode="decimal" min="0" value={row.pieceQty} onChange={(event) => vm.updateExtraReturn(row.id, 'pieceQty', event.target.value)} />
                        </div>
                        <div>
                          <label className="label">{t('settlement.damagedCase')}</label>
                          <input className="input" type="number" inputMode="decimal" min="0" value={row.damagedCaseQty} onChange={(event) => vm.updateExtraReturn(row.id, 'damagedCaseQty', event.target.value)} />
                        </div>
                        <div>
                          <label className="label">{t('settlement.damagedPiece')}</label>
                          <input className="input" type="number" inputMode="decimal" min="0" value={row.damagedPieceQty} onChange={(event) => vm.updateExtraReturn(row.id, 'damagedPieceQty', event.target.value)} />
                        </div>
                        <div>
                          <label className="label">{t('settlement.extraReturnRowValue')}</label>
                          <div className="input flex cursor-default select-none items-center bg-slate-100/80 font-semibold text-slate-700">{formatCurrency(rowValue, language)}</div>
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
                <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  {t('settlement.noExtraReturns')}
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 px-5 py-4">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t('settlement.shopDueCollectionsTitle')}</h3>
                <button type="button" className="btn-secondary h-8 gap-1.5 px-3 py-1.5 text-xs" onClick={vm.addShopCollection}>
                  <Plus size={14} />
                  {t('settlement.addShopCollection')}
                </button>
              </div>
              {vm.shopCollections.length ? (
                <div className="mb-4 space-y-3">
                  {vm.shopCollections.map((sc) => (
                    <div key={sc.id} className="grid gap-3 rounded-[22px] border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.5fr)_auto]">
                      <div>
                        <label className="label">{t('settlement.shopDueShop')}</label>
                        <Select className="input" value={sc.shopId} onChange={(e) => vm.updateShopCollection(sc.id, 'shopId', e.target.value)} disabled={vm.saving}>
                          <option value="">{t('settlement.shopDueSelectShop')}</option>
                          {shopDirectory.map((shop) => (
                            <option key={shop.id} value={shop.id}>{shop.shopName || shop.name}</option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <label className="label">{t('settlement.shopDueAmount')}</label>
                        <input className="input" type="number" inputMode="decimal" min="0" step="0.0001" value={sc.amount} onChange={(e) => vm.updateShopCollection(sc.id, 'amount', e.target.value)} disabled={vm.saving} />
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

            <div className="border-t border-slate-100 px-5 py-4">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t('settlement.srHandoverTitle')}</h3>
                <button type="button" className="btn-secondary h-8 gap-1.5 px-3 py-1.5 text-xs" onClick={vm.addSrHandover}>
                  <Plus size={14} />
                  {t('settlement.addSrHandover')}
                </button>
              </div>
              {vm.srHandovers.length ? (
                <div className="mb-4 space-y-3">
                  {vm.srHandovers.map((h) => (
                    <div key={h.id} className="grid gap-3 rounded-[22px] border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.5fr)_auto]">
                      <div>
                        <label className="label">{t('settlement.srHandoverSr')}</label>
                        <Select
                          className="input"
                          value={h.srId}
                          onChange={(e) => {
                            const selected = srDirectory.find((s) => s.id === e.target.value);
                            vm.updateSrHandover(h.id, 'srId', e.target.value);
                            vm.updateSrHandover(h.id, 'srName', selected?.name || '');
                          }}
                          disabled={vm.saving}
                        >
                          <option value="">{t('settlement.srHandoverSelectSr')}</option>
                          {srDirectory.map((sr) => (
                            <option key={sr.id} value={sr.id}>{sr.name}</option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <label className="label">{t('settlement.srHandoverAmount')}</label>
                        <input className="input" type="number" inputMode="decimal" min="0" step="0.0001" value={h.amount} onChange={(e) => vm.updateSrHandover(h.id, 'amount', e.target.value)} disabled={vm.saving} />
                      </div>
                      <div>
                        <label className="label">{t('settlement.srHandoverNote')}</label>
                        <input className="input" type="text" value={h.note} onChange={(e) => vm.updateSrHandover(h.id, 'note', e.target.value)} placeholder={t('settlement.srHandoverNotePlaceholder')} disabled={vm.saving} />
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
                  {t('settlement.noSrHandovers')}
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
                  <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-700">{t('settlement.summaryTitle')}</h3>
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
                          <dd className="font-semibold text-rose-600">− {formatCurrency(vm.totalReturnValue, language)}</dd>
                        </div>
                        <div className="flex items-center justify-between border-t border-dashed border-slate-200 py-1.5">
                          <dt className="font-bold text-slate-700">{t('settlement.todaySales')}</dt>
                          <dd className="font-semibold text-slate-950">{formatCurrency(vm.totalPayable - vm.extraReturnValue, language)}</dd>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-between py-1.5">
                        <dt className="font-bold text-slate-700">{t('settlement.todaySales')}</dt>
                        <dd className="font-semibold text-slate-950">{formatCurrency(vm.totalPayable - vm.extraReturnValue, language)}</dd>
                      </div>
                    )}

                    {/* Discount */}
                    <div className="flex items-center justify-between gap-3 py-1.5">
                      <dt className="font-semibold text-slate-500">{t('settlement.discount')}</dt>
                      <dd className="flex items-center gap-1.5">
                        <span className="font-bold text-rose-600">−</span>
                        <input className="input h-9 w-28 text-right" type="number" inputMode="decimal" min="0" step="0.0001" value={vm.discountInput} onChange={(event) => vm.setDiscountInput(event.target.value)} disabled={vm.saving} />
                      </dd>
                    </div>
                    {vm.discount > 0 ? (
                      <div className="flex items-center justify-between gap-3 py-1.5">
                        <dt className="text-sm font-medium text-slate-400">Supplier (discount from)</dt>
                        <dd className="w-52 max-w-[60vw] shrink-0">
                          <Select
                            className="input h-9 w-full text-sm"
                            value={vm.discountSupplierId}
                            onChange={(e) => vm.setDiscountSupplierId(e.target.value)}
                            disabled={vm.saving}
                          >
                            <option value="">— select supplier —</option>
                            {supplierDirectory.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </Select>
                        </dd>
                      </div>
                    ) : null}
                    {vm.totalSrHandovers > 0 ? (
                      <div className="flex items-center justify-between py-1.5">
                        <dt className="font-semibold text-slate-500">SR Handover</dt>
                        <dd className="font-semibold text-rose-600">− {formatCurrency(vm.totalSrHandovers, language)}</dd>
                      </div>
                    ) : null}

                    {/* Today Payable = today's sales − discount − sr handovers */}
                    <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 pb-1.5 mt-1">
                      <dt className="font-semibold text-slate-800">Today Payable</dt>
                      <dd className="font-semibold text-slate-950">{formatCurrency(vm.todayDue + vm.amountPaid, language)}</dd>
                    </div>

                    {/* Previous Due */}
                    {vm.previousDue > 0 ? (
                      <div className="flex items-center justify-between py-1.5">
                        <dt className="font-semibold text-slate-500">{t('settlement.previousDue')}</dt>
                        <dd className="font-semibold text-amber-700">+ {formatCurrency(vm.previousDue, language)}</dd>
                      </div>
                    ) : null}

                    {/* Total Receivable */}
                    <div className="flex items-center justify-between border-t-2 border-slate-300 pt-2.5 pb-1.5 mt-1">
                      <dt className="font-semibold text-slate-800">{t('settlement.totalReceivable')}</dt>
                      <dd className="font-semibold text-slate-950">{formatCurrency(vm.receivableTotal, language)}</dd>
                    </div>

                    {/* Cash Received */}
                    <div className="flex items-center justify-between gap-3 py-1.5">
                      <dt className="font-semibold text-slate-500">{t('settlement.cashReceived')}</dt>
                      <dd className="flex items-center gap-1.5">
                        <span className="font-bold text-emerald-600">−</span>
                        <input className="input h-9 w-28 text-right" type="number" inputMode="decimal" min="0" step="0.0001" value={vm.amountPaidInput} onChange={(event) => vm.setAmountPaidInput(event.target.value)} disabled={vm.saving} />
                      </dd>
                    </div>

                    {/* New Due */}
                    <div className="flex items-center justify-between rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 mt-1">
                      <dt className="text-base font-semibold uppercase tracking-[0.1em] text-slate-950">{t('settlement.newDue')}</dt>
                      <dd className={cx('text-lg font-semibold', vm.dueAmount > 0 ? 'text-rose-700' : 'text-emerald-700')}>
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
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Today's Outstanding</p>
                    <p className={cx('mt-1 text-lg font-semibold', vm.todayDue > 0 ? 'text-rose-700' : 'text-emerald-700')}>{formatCurrency(Math.max(0, vm.todayDue), language)}</p>
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
                      <button type="button" className="btn-secondary justify-center" onClick={handlePrintSheet}>
                        <Printer size={18} />
                        {t('settlement.printSheet')}
                        <kbd className="ml-1 rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500">Alt+P</kbd>
                      </button>
                    ) : null}
                    {canEditSettlement ? (
                      <button type="button" className="btn-primary max-lg:hidden justify-center" onClick={vm.completeSettlement} disabled={vm.saving || vm.hasErrors}>
                        <CheckCircle2 size={18} />
                        {vm.saving ? t('common.saving') : vm.completedSettlement ? t('settlement.updateSettlement') : t('settlement.completeSettlement')}
                        <kbd className="ml-1 rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200">Ctrl+S</kbd>
                      </button>
                    ) : null}
                  </div>
                  {!vm.hasInvalidReturns && !vm.discountTooHigh && !vm.amountPaidTooHigh ? (
                    <p className="mt-2 block text-sm font-semibold text-slate-600">{t('settlement.returnHint')}</p>
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
                  <button
                    type="button"
                    className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                  >
                    {downloadingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                    {t('settlement.downloadPdf')}
                    <kbd className="ml-1 rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500">Alt+D</kbd>
                  </button>
                  <button type="button" className="btn-secondary" onClick={handlePrintSheet}>
                    <Printer size={18} />
                    {t('settlement.printSheet')}
                    <kbd className="ml-1 rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500">Alt+P</kbd>
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

      {!vm.loading && vm.displayRows.length && canEditSettlement ? (
        <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-[rgb(var(--white))] px-4 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{t('settlement.newDue')}</p>
              <p className={cx('text-lg font-bold tabular-nums', vm.dueAmount > 0 ? 'text-rose-700' : 'text-emerald-700')}>
                {formatCurrency(Math.max(0, vm.dueAmount), language)}
              </p>
            </div>
            <button type="button" className="btn-primary shrink-0" onClick={vm.completeSettlement} disabled={vm.saving || vm.hasErrors}>
              <CheckCircle2 size={18} />
              {vm.saving ? t('common.saving') : vm.completedSettlement ? t('settlement.updateSettlement') : t('settlement.completeSettlement')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}




