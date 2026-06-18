import { useState } from 'react';
import { Boxes, Download, FileSpreadsheet, ListTree, PackagePlus, Pencil, Plus, Printer, Search, Trash2 } from 'lucide-react';
import { Alert, Badge, EmptyState, Pagination, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCasePiece, formatCurrency, formatNumber } from '../../../utils/calculations.js';
import ProductFormModal from '../components/ProductFormModal';
import StockUpdateModal from '../components/StockUpdateModal';
import StockLedgerPanel from '../components/StockLedgerPanel';
import ProductsPrintSheet from '../components/ProductsPrintSheet';
import CategoriesManagerModal from '../components/CategoriesManagerModal';
import { useProductsViewModel } from '../viewmodels/useProductsViewModel';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';

const PRODUCTS_PRINT_ID = 'products-report-print';

export default function ProductsPage() {
  const { productDirectory, saveProduct, deleteProduct, addStock, t, can, tenant } = useInventoryApp();
  const vm = useProductsViewModel();
  const [productModal, setProductModal] = useState(null);
  const [stockModalProduct, setStockModalProduct] = useState(null);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [ledgerRefreshKey, setLedgerRefreshKey] = useState(0);
  const canManageProducts = can('manage_products');
  const outOfStockCount = productDirectory.filter((product) => product.stockPieces === 0).length;
  const veryLowCount = productDirectory.filter((product) => product.stockPieces > 0 && product.stockPieces <= product.piecesPerCase).length;
  const businessName = tenant?.name || '';

  async function handleDownloadPdf() {
    await inventoryApi.recordPrint({ entityType: 'products_report', entityId: 'all', label: 'Products Report PDF' });
    downloadSheetPdf(PRODUCTS_PRINT_ID, 'products-report.pdf');
  }

  async function handleExportExcel() {
    const columns = [
      { label: '#', value: (_, i) => i + 1, width: 6 },
      { label: 'Product', value: (p) => p.name, width: 28 },
      { label: 'Category', value: (p) => p.category || '', width: 20 },
      { label: 'Case Size', value: (p) => p.piecesPerCase, width: 12 },
      { label: 'Purchase Price', value: (p) => Number(p.purchasePrice), width: 16 },
      { label: 'Wholesale Price', value: (p) => Number(p.wholesalePrice), width: 16 },
      { label: 'Retail Price', value: (p) => Number(p.retailPrice), width: 16 },
      { label: 'Stock (pcs)', value: (p) => p.stockPieces, width: 14 },
      { label: 'Damaged (pcs)', value: (p) => p.damagedPieces, width: 14 },
    ];
    const rows = productDirectory.map((p, i) => columns.map((col) => col.value(p, i)));
    const header = columns.map((col) => col.label);
    const { utils, writeFile } = await import('xlsx');
    const worksheet = utils.aoa_to_sheet([header, ...rows]);
    worksheet['!cols'] = columns.map((col) => ({ wch: col.width }));
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Products');
    writeFile(workbook, 'products-report.xlsx');
  }

  async function handlePrint() {
    await inventoryApi.recordPrint({ entityType: 'products_report', entityId: 'all', label: 'Products Report Print' });
    window.print();
  }

  return (
    <div>
      <SectionHeader
        eyebrow={t('products.eyebrow')}
        title={t('products.title')}
        description={t('products.description', { count: productDirectory.length })}
        action={canManageProducts ? (
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={() => setShowCategoriesModal(true)}>
              <ListTree size={18} />
              {t('categories.manage')}
            </button>
            <button type="button" className="btn-primary" onClick={() => setProductModal({ mode: 'add' })}>
              <Plus size={18} />
              {t('products.add')}
            </button>
          </div>
        ) : null}
      />

      <div className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{t('products.eyebrow')}</p>
              <p className="text-sm font-medium text-slate-500">{t('products.description', { count: productDirectory.length })}</p>
            </div>
            <div className="no-print flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-2 text-sm font-bold">
                <span className="muted-chip">{formatNumber(productDirectory.length)} {t('products.product')}</span>
                <span className="muted-chip">{formatNumber(outOfStockCount)} out</span>
                <span className="muted-chip">{formatNumber(veryLowCount)} low</span>
              </div>
              <button type="button" className="btn-secondary h-8 gap-1.5 px-3 py-1.5 text-xs" onClick={handleDownloadPdf}>
                <Download size={14} />
                Download as PDF
              </button>
              <button type="button" className="btn-secondary h-8 gap-1.5 px-3 py-1.5 text-xs" onClick={handleExportExcel}>
                <FileSpreadsheet size={14} />
                Export as Excel
              </button>
              <button type="button" className="btn-secondary h-8 gap-1.5 px-3 py-1.5 text-xs" onClick={handlePrint}>
                <Printer size={14} />
                Print
              </button>
            </div>
          </div>
          {outOfStockCount || veryLowCount ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {outOfStockCount ? <Alert type="error">{`${outOfStockCount} product currently has no available stock.`}</Alert> : null}
              {veryLowCount ? <Alert type="warning">{`${veryLowCount} product is at a critically low stock level.`}</Alert> : null}
            </div>
          ) : null}
          <div className="relative mt-4 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input className="input pl-10" value={vm.search} onChange={(event) => vm.setSearch(event.target.value)} placeholder={t('products.searchPlaceholder')} />
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
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">{t('products.product')}</th>
                <th className="hidden px-4 py-3 sm:table-cell">{t('products.caseSize')}</th>
                <th className="hidden px-4 py-3 md:table-cell">{t('products.purchase')}</th>
                <th className="hidden px-4 py-3 md:table-cell">{t('products.wholesalePrice')}</th>
                <th className="hidden px-4 py-3 md:table-cell">{t('products.retailPrice')}</th>
                <th className="px-4 py-3">{t('products.stock')}</th>
                <th className="px-4 py-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vm.items.map((product, index) => (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="table-cell font-black text-slate-400">{(vm.page - 1) * vm.pageSize + index + 1}</td>
                  <td className="table-cell">
                    <div className="flex items-start gap-2">
                      <div>
                        <p className="font-semibold text-slate-950">{product.name}</p>
                        <p className="text-xs text-slate-500">{product.category}</p>
                      </div>
                      {product.stockPieces === 0 ? <Badge tone="rose">Out</Badge> : null}
                      {product.stockPieces > 0 && product.stockPieces <= product.piecesPerCase ? <Badge tone="amber">Low</Badge> : null}
                    </div>
                  </td>
                  <td className="hidden table-cell sm:table-cell">{product.piecesPerCase} pcs/case</td>
                  <td className="hidden table-cell md:table-cell">{formatCurrency(product.purchasePrice)}</td>
                  <td className="hidden table-cell md:table-cell">{formatCurrency(product.wholesalePrice)}</td>
                  <td className="hidden table-cell md:table-cell">{formatCurrency(product.retailPrice)}</td>
                  <td className="table-cell">
                    <p className="font-semibold text-slate-950">{formatCasePiece(product.stockPieces, product.piecesPerCase)}</p>
                    <p className="text-xs text-slate-500">{formatNumber(product.stockPieces)} pcs total</p>
                    {product.damagedPieces > 0 ? (
                      <p className="text-xs text-rose-500">{formatNumber(product.damagedPieces)} pcs damaged</p>
                    ) : null}
                  </td>
                  <td className="table-cell">
                    <div className="flex justify-end gap-2">
                      {canManageProducts ? (
                        <>
                          <button type="button" className="btn-secondary h-9 px-3" onClick={() => setStockModalProduct(product)}>
                            <PackagePlus size={16} />
                            {t('products.stockActions')}
                          </button>
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

      <StockLedgerPanel products={productDirectory} t={t} refreshKey={ledgerRefreshKey} />

      {productModal ? <ProductFormModal product={productModal.product} onClose={() => setProductModal(null)} onSave={async (value) => {
        const result = await saveProduct(value);
        if (result.ok) {
          setProductModal(null);
          vm.reload();
        }
        return result;
      }} /> : null}
      {stockModalProduct ? <StockUpdateModal product={stockModalProduct} onClose={() => setStockModalProduct(null)} onSave={async (productId, addPieces) => {
        const result = await addStock(productId, addPieces);
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

      <div className="hidden print:block">
        <ProductsPrintSheet
          products={productDirectory}
          businessName={businessName}
          printTarget
          targetId={PRODUCTS_PRINT_ID}
        />
      </div>
    </div>
  );
}
