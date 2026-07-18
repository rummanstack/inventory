import { useEffect, useMemo, useState } from 'react';
import { Boxes, Download, FileSpreadsheet, ImageOff, LayoutGrid, List, ListTree, Loader2, PackagePlus, Pencil, Plus, Printer, Search, Trash2 } from 'lucide-react';
import { Alert, Badge, EmptyState, MobileCardList, MobileListCard, Pagination, SectionHeader, TableSkeleton, cx, Select } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCasePiece, formatCurrency, formatNumber } from '../../../utils/calculations.js';
import ProductFormModal from '../components/ProductFormModal';
import StockUpdateModal from '../components/StockUpdateModal';
import StockLedgerPanel from '../components/StockLedgerPanel';
import ProductsPrintSheet from '../components/ProductsPrintSheet';
import CategoriesManagerModal from '../components/CategoriesManagerModal';
import BrandsManagerModal from '../components/BrandsManagerModal';
import ManufacturersManagerModal from '../components/ManufacturersManagerModal';
import GenericMedicinesManagerModal from '../components/GenericMedicinesManagerModal';
import { useProductsViewModel } from '../viewmodels/useProductsViewModel';
import { downloadSheetPdf, printElementById } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';

const PRODUCTS_PRINT_ID = 'products-report-print';
const VIEW_MODE_STORAGE_KEY = 'products-view-mode';

export default function ProductsPage() {
  const { productDirectory, saveProduct, deleteProduct, addStock, setOpeningStock, t, can, tenant, language } = useInventoryApp();
  const vm = useProductsViewModel({ tenantId: tenant?.id });
  const [productModal, setProductModal] = useState(null);
  const [stockModalProduct, setStockModalProduct] = useState(null);
  const [stockModalMode, setStockModalMode] = useState('add');
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showBrandsModal, setShowBrandsModal] = useState(false);
  const [showManufacturersModal, setShowManufacturersModal] = useState(false);
  const [showGenericMedicinesModal, setShowGenericMedicinesModal] = useState(false);
  const [ledgerRefreshKey, setLedgerRefreshKey] = useState(0);
  const [downloadingPdf, downloadPdf] = useAsyncAction();
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window === 'undefined') return 'grid';
    return window.localStorage.getItem(VIEW_MODE_STORAGE_KEY) === 'list' ? 'list' : 'grid';
  });

  useEffect(() => {
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);
  const canManageProducts = can('manage_products');
  const isElectronics = (tenant?.businessType || 'ELECTRONICS') === 'ELECTRONICS';
  const isPharmacy = tenant?.businessType === 'DRUG_PHARMACY';
  const outOfStockCount = productDirectory.filter((product) => product.stockPieces === 0).length;
  const businessName = tenant?.name || '';
  const categoryOptions = useMemo(() => {
    const map = new Map();
    productDirectory.forEach((product) => {
      if (product.categoryId && !map.has(product.categoryId)) {
        map.set(product.categoryId, product.category);
      }
    });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [productDirectory]);

  async function handleDownloadPdf() {
    await downloadPdf(async () => {
      await inventoryApi.recordPrint({ entityType: 'products_report', entityId: 'all', label: t('products.reportPdfLabel') });
      await downloadSheetPdf(PRODUCTS_PRINT_ID, 'products-report.pdf');
    });
  }

  async function handleExportExcel() {
    const columns = [
      { label: '#', value: (_, i) => i + 1, width: 6 },
      { label: t('products.product'), value: (p) => p.name, width: 28 },
      { label: t('products.category'), value: (p) => p.category || '', width: 20 },
      ...(isElectronics ? [] : [{ label: t('products.caseSize'), value: (p) => p.piecesPerCase, width: 12 }]),
      { label: t('products.purchasePrice'), value: (p) => Number(p.purchasePrice), width: 16 },
      { label: t('products.wholesalePrice'), value: (p) => Number(p.wholesalePrice), width: 16 },
      { label: t('products.retailPrice'), value: (p) => Number(p.retailPrice), width: 16 },
      { label: `${t('products.stock')} (${t('common.pcs')})`, value: (p) => p.stockPieces, width: 14 },
      { label: `${t('products.damaged')} (${t('common.pcs')})`, value: (p) => p.damagedPieces, width: 14 },
    ];
    const rows = productDirectory.map((p, i) => columns.map((col) => col.value(p, i)));
    const header = columns.map((col) => col.label);
    const { utils, writeFile } = await import('xlsx');
    const worksheet = utils.aoa_to_sheet([header, ...rows]);
    worksheet['!cols'] = columns.map((col) => ({ wch: col.width }));
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, t('products.sheetName'));
    writeFile(workbook, 'products-report.xlsx');
  }

  async function handlePrint() {
    await inventoryApi.recordPrint({ entityType: 'products_report', entityId: 'all', label: t('products.reportPrintLabel') });
    printElementById(PRODUCTS_PRINT_ID);
  }
  useEffect(() => {
    function handleKeyDown(event) {
      const key = event.key.toLowerCase();
      const isShortcut = event.altKey && !event.ctrlKey && !event.metaKey;
      if (!isShortcut || productModal || stockModalProduct || showCategoriesModal || showBrandsModal || showManufacturersModal || showGenericMedicinesModal) {
        return;
      }

      if (key === 'a' && canManageProducts) {
        event.preventDefault();
        setProductModal({ mode: 'add' });
      } else if (key === 'd') {
        event.preventDefault();
        handleDownloadPdf();
      } else if (key === 'e') {
        event.preventDefault();
        handleExportExcel();
      } else if (key === 'p') {
        event.preventDefault();
        handlePrint();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canManageProducts, downloadingPdf, productDirectory, productModal, stockModalProduct, showCategoriesModal, showBrandsModal, showManufacturersModal, showGenericMedicinesModal, t]);

  return (
    <div>
      <SectionHeader
        eyebrow={t('products.eyebrow')}
        title={t('products.title')}
        compact
        action={(
          <div className="flex flex-wrap gap-2">
            {canManageProducts ? (
              <>
                {isElectronics ? (
                  <button type="button" className="btn-secondary" onClick={() => setShowBrandsModal(true)}>
                    <ListTree size={18} />
                    {t('brands.manage')}
                  </button>
                ) : null}
                <button type="button" className="btn-secondary" onClick={() => setShowCategoriesModal(true)}>
                  <ListTree size={18} />
                  {t('categories.manage')}
                </button>
                {isPharmacy ? (
                  <>
                    <button type="button" className="btn-secondary" onClick={() => setShowManufacturersModal(true)}>
                      <ListTree size={18} />
                      {t('pharmacy.manufacturers')}
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => setShowGenericMedicinesModal(true)}>
                      <ListTree size={18} />
                      {t('genericMedicines.manage')}
                    </button>
                  </>
                ) : null}
                <button type="button" className="btn-primary" onClick={() => setProductModal({ mode: 'add' })}>
                  <Plus size={18} />
                  {t('products.add')}
                  <kbd className="ml-1 rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200">Alt+A</kbd>
                </button>
              </>
            ) : null}
          </div>
        )}
      />

      <div className="surface overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5">
          {outOfStockCount ? (
            <div className="grid gap-3 lg:grid-cols-2">
              <Alert type="error">{t('products.noStockAlert', { count: formatNumber(outOfStockCount, language) })}</Alert>
            </div>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className="input pl-10" value={vm.search} onChange={(event) => vm.setSearch(event.target.value)} placeholder={t('products.searchPlaceholder')} />
            </div>
            <Select className="input sm:w-48" value={vm.categoryId} onChange={(event) => vm.setCategoryId(event.target.value)}>
              <option value="">{t('categories.allCategories')}</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </Select>
            <div className="no-print flex h-10 shrink-0 items-center gap-1 self-start rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                className={cx('icon-btn h-8 w-8', viewMode === 'list' && 'bg-slate-100 text-slate-950')}
                title={t('products.viewList')}
                aria-pressed={viewMode === 'list'}
                onClick={() => setViewMode('list')}
              >
                <List size={16} />
              </button>
              <button
                type="button"
                className={cx('icon-btn h-8 w-8', viewMode === 'grid' && 'bg-slate-100 text-slate-950')}
                title={t('products.viewGrid')}
                aria-pressed={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid size={16} />
              </button>
            </div>
            <div className="no-print flex flex-wrap gap-2 sm:ml-auto">
              <button type="button" className="btn-secondary h-10 gap-1.5 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60" onClick={handleDownloadPdf} disabled={downloadingPdf}>
                {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {t('purchaseReceive.downloadPdf')}
                <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-black text-slate-500">Alt+D</kbd>
              </button>
              <button type="button" className="btn-secondary h-10 gap-1.5 px-3 text-xs" onClick={handleExportExcel}>
                <FileSpreadsheet size={14} />
                {t('common.exportExcel')}
                <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-black text-slate-500">Alt+E</kbd>
              </button>
              <button type="button" className="btn-secondary h-10 gap-1.5 px-3 text-xs" onClick={handlePrint}>
                <Printer size={14} />
                {t('common.print')}
                <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-black text-slate-500">Alt+P</kbd>
              </button>
            </div>
          </div>
        </div>
        {vm.loading ? (
          <div className="p-5">
            <TableSkeleton columns={7} showHeader={false} />
          </div>
        ) : vm.error ? (
          <div className="p-5">
            <Alert type="error">{vm.error}</Alert>
          </div>
        ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:gap-5 sm:p-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {vm.items.map((product) => {
            const isOut = product.stockPieces === 0;
            const isLow = product.stockPieces > 0 && product.stockPieces <= product.piecesPerCase;
            return (
            <div
              key={product.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 ease-out hover:-translate-y-1 hover:border-[var(--brand)]/30 hover:shadow-[0_16px_32px_rgba(15,23,42,0.10)]"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.06]"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-slate-300">
                    <ImageOff size={26} strokeWidth={1.5} />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('products.noImage')}</span>
                  </div>
                )}
                {isOut || isLow ? (
                  <div className="absolute inset-x-0 top-0 flex justify-between gap-1 bg-gradient-to-b from-black/35 to-transparent p-2">
                    <div className="flex flex-col gap-1">
                      {isOut ? <Badge tone="rose">{t('products.outShort')}</Badge> : null}
                      {isLow ? <Badge tone="amber">{t('products.lowShort')}</Badge> : null}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-2.5 p-3.5">
                <div>
                  <p className="line-clamp-2 text-[13.5px] font-bold leading-snug text-slate-950" title={product.name}>{product.name}</p>
                  <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400">{product.category}</p>
                </div>
                <div className="mt-auto space-y-1.5 border-t border-slate-100 pt-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">{t('products.retailPrice')}</span>
                    <span className="text-[15px] font-black text-slate-950">{formatCurrency(product.retailPrice, language)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">{t('products.stock')}</span>
                    <span className={cx('font-bold', isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-950')}>
                      {isElectronics ? `${formatNumber(product.stockPieces, language)} ${t('common.pcs')}` : formatCasePiece(product.stockPieces, product.piecesPerCase, language)}
                    </span>
                  </div>
                </div>
                {canManageProducts ? (
                  <div className="flex items-center gap-1.5 border-t border-slate-100 pt-2.5">
                    {product.serialRequired ? (
                      <span className="flex h-8 flex-1 items-center justify-center rounded-lg bg-slate-100 px-2 text-xs font-semibold text-slate-400" title={t('products.viaPurchaseOnlyTooltip')}>
                        {t('products.viaPurchaseOnly')}
                      </span>
                    ) : (
                      <button type="button" className="btn-secondary h-8 flex-1 px-2 text-xs" onClick={() => { setStockModalMode('add'); setStockModalProduct(product); }}>
                        <PackagePlus size={14} />
                        {t('products.stockActions')}
                      </button>
                    )}
                    <button type="button" className="icon-btn h-8 w-8" title={t('common.edit')} onClick={() => setProductModal({ mode: 'edit', product })}>
                      <Pencil size={14} />
                    </button>
                    <button type="button" className="icon-btn h-8 w-8 text-rose-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700" title={t('common.delete')} onClick={async () => { const r = await deleteProduct(product); if (r.ok) vm.reload(); }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
            );
          })}
        </div>
        ) : (
        <>
        <MobileCardList>
          {vm.items.map((product) => (
            <MobileListCard
              key={product.id}
              onClick={canManageProducts ? () => setProductModal({ mode: 'edit', product }) : undefined}
              leading={
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageOff size={16} className="text-slate-300" />
                  )}
                </div>
              }
              title={product.name}
              badge={
                product.stockPieces === 0 ? (
                  <Badge tone="rose">{t('products.outShort')}</Badge>
                ) : product.stockPieces <= product.piecesPerCase ? (
                  <Badge tone="amber">{t('products.lowShort')}</Badge>
                ) : null
              }
              subtitle={product.category}
              value={isElectronics
                ? `${formatNumber(product.stockPieces, language)} ${t('common.pcs')}`
                : formatCasePiece(product.stockPieces, product.piecesPerCase, language)}
              valueClass={product.stockPieces === 0 ? 'text-rose-600' : undefined}
              valueSub={formatCurrency(product.retailPrice, language)}
              action={canManageProducts && !product.serialRequired ? (
                <button
                  type="button"
                  className="icon-btn"
                  title={t('products.stockActions')}
                  onClick={() => { setStockModalMode('add'); setStockModalProduct(product); }}
                >
                  <PackagePlus size={18} />
                </button>
              ) : null}
            />
          ))}
        </MobileCardList>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">{t('products.product')}</th>
                {isPharmacy ? <th className="px-4 py-3">{t('products.genericName')}</th> : null}
                {!isElectronics && !isPharmacy ? <th className="px-4 py-3 text-right">{t('products.caseSize')}</th> : null}
                <th className="px-4 py-3 text-right">{t('products.purchase')}</th>
                <th className="px-4 py-3 text-right">{t('products.wholesalePrice')}</th>
                <th className="px-4 py-3 text-right">{t('products.retailPrice')}</th>
                <th className="px-4 py-3 text-right">{t('products.stock')}</th>
                <th className="px-4 py-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vm.items.map((product, index) => (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="table-cell font-medium text-slate-400">{(vm.page - 1) * vm.pageSize + index + 1}</td>
                  <td className="table-cell">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <ImageOff size={16} className="text-slate-300" />
                        )}
                      </div>
                      <div className="flex items-start gap-2">
                        <div>
                          <p className="font-semibold text-slate-950">{product.name}</p>
                          <p className="text-xs text-slate-500">{product.category}</p>
                        </div>
                        <Badge tone={product.refundable === false ? 'rose' : 'emerald'}>
                          {product.refundable === false ? t('products.nonRefundable') : t('products.refundable')}
                        </Badge>
                        {isPharmacy && product.controlledSubstance ? <Badge tone="amber">Controlled</Badge> : null}
                        {product.stockPieces === 0 ? <Badge tone="rose">{t('products.outShort')}</Badge> : null}
                        {product.stockPieces > 0 && product.stockPieces <= product.piecesPerCase ? <Badge tone="amber">{t('products.lowShort')}</Badge> : null}
                      </div>
                    </div>
                  </td>
                  {isPharmacy ? <td className="table-cell text-slate-700">{product.genericName || '-'}</td> : null}
                  {!isElectronics && !isPharmacy ? <td className="table-cell text-right">{formatNumber(product.piecesPerCase, language)} {t('common.pcsPerCase')}</td> : null}
                  <td className="table-cell text-right">{formatCurrency(product.purchasePrice, language)}</td>
                  <td className="table-cell text-right">{formatCurrency(product.wholesalePrice, language)}</td>
                  <td className="table-cell text-right">{formatCurrency(product.retailPrice, language)}</td>
                  <td className="table-cell text-right">
                    {isElectronics ? (
                      <p className="font-semibold text-slate-950">{formatNumber(product.stockPieces, language)} {t('common.pcs')}</p>
                    ) : (
                      <>
                        <p className="font-semibold text-slate-950">{formatCasePiece(product.stockPieces, product.piecesPerCase, language)}</p>
                        <p className="text-xs text-slate-500">{formatNumber(product.stockPieces, language)} {t('products.pcsTotal')}</p>
                      </>
                    )}
                    {product.damagedPieces > 0 ? (
                      <p className="text-xs text-rose-500">{formatNumber(product.damagedPieces, language)} {t('products.pcsDamaged')}</p>
                    ) : null}
                  </td>
                  <td className="table-cell">
                    <div className="row-actions flex justify-end gap-2">
                      {canManageProducts ? (
                        <>
                          {!product.serialRequired && (
                            <button type="button" className="btn-secondary h-9 px-3" onClick={() => { setStockModalMode('add'); setStockModalProduct(product); }}>
                              <PackagePlus size={16} />
                              {t('products.stockActions')}
                            </button>
                          )}
                          <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setProductModal({ mode: 'edit', product })}>
                            <Pencil size={16} />
                          </button>
                          <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={async () => { const r = await deleteProduct(product); if (r.ok) vm.reload(); }}>
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">-</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
        )}
        {!vm.loading && !vm.error && !vm.items.length ? (
          <div className="p-5">
            <EmptyState title={t('products.noMatchTitle')} description={t('products.noMatchDescription')} icon={Boxes} />
          </div>
        ) : null}
        {!vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      <StockLedgerPanel products={productDirectory} t={t} refreshKey={ledgerRefreshKey} sectionDescription="" shortcuts />

      {productModal ? <ProductFormModal product={productModal.product} onClose={() => setProductModal(null)} onSave={async (value) => {
        const wasNewProduct = !productModal.product;
        const result = await saveProduct(value);
        if (result.ok) {
          setProductModal(null);
          vm.reload();
          if (wasNewProduct && result.product) {
            setStockModalMode('opening');
            setStockModalProduct(result.product);
          }
        }
        return result;
      }} /> : null}
      {stockModalProduct ? <StockUpdateModal product={stockModalProduct} mode={stockModalMode} onClose={() => setStockModalProduct(null)} onSave={async (productId, addPieces, reason) => {
        const result = stockModalMode === 'opening'
          ? await setOpeningStock(productId, addPieces, reason)
          : await addStock(productId, addPieces, reason);
        if (result.ok) {
          setStockModalProduct(null);
          vm.reload();
          setLedgerRefreshKey((key) => key + 1);
        }
        return result;
      }} /> : null}
      {showCategoriesModal ? (
        <CategoriesManagerModal onClose={() => setShowCategoriesModal(false)} onChanged={() => vm.reload()} />
      ) : null}
      {showBrandsModal && isElectronics ? (
        <BrandsManagerModal onClose={() => setShowBrandsModal(false)} onChanged={() => vm.reload()} />
      ) : null}
      {showManufacturersModal && isPharmacy ? (
        <ManufacturersManagerModal onClose={() => setShowManufacturersModal(false)} onChanged={() => vm.reload()} />
      ) : null}
      {showGenericMedicinesModal && isPharmacy ? (
        <GenericMedicinesManagerModal onClose={() => setShowGenericMedicinesModal(false)} onChanged={() => vm.reload()} />
      ) : null}

      <div className="absolute -left-[10000px] top-0">
        <ProductsPrintSheet
          products={productDirectory}
          businessName={businessName}
          printTarget
          targetId={PRODUCTS_PRINT_ID}
          t={t}
          language={language}
          isElectronics={isElectronics}
        />
      </div>
    </div>
  );
}





