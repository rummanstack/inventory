import { useEffect, useState } from 'react';
import { Download, Eye, FileSpreadsheet, Fingerprint, Loader2, Pencil, Plus, Printer, Search, Trash2, Upload } from 'lucide-react';
import { Alert, Badge, CopyableText, EmptyState, MobileCardList, MobileListCard, Pagination, SectionHeader, TableSkeleton, Select } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { downloadSheetPdf } from '../../../services/printService.js';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';
import { productSerialStatusTone } from '../../../models/inventoryViewData.js';
import ProductSerialFormModal from '../components/ProductSerialFormModal';
import ProductSerialViewModal from '../components/ProductSerialViewModal';
import ProductSerialImportModal from '../components/ProductSerialImportModal';
import { useProductSerialsViewModel } from '../viewmodels/useProductSerialsViewModel';

const STATUS_VALUES = ['IN_STOCK', 'SOLD', 'RETURNED', 'DAMAGED', 'WARRANTY', 'DELETED'];
const PRODUCT_SERIALS_PRINT_ID = 'product-serials-print';
const PRODUCT_SERIALS_SHORTCUTS = {
  add: { alt: true, key: 'a', label: 'Alt+A' },
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

export default function ProductSerialsPage() {
  const { saveProductSerial, deleteProductSerial, t, can, productDirectory } = useInventoryApp();
  const vm = useProductSerialsViewModel();
  const [formModal, setFormModal] = useState(null);
  const [viewSerial, setViewSerial] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const canManage = can('manage_product_serials');
  const [downloadingPdf, downloadPdf] = useAsyncAction();

  async function handleExportExcel() {
    const result = await inventoryApi.listProductSerials({
      page: 1,
      pageSize: 10000,
      search: vm.search || undefined,
      productId: vm.productId || undefined,
      status: vm.status || undefined,
    });
    const all = result.items || [];
    const { utils, writeFile } = await import('xlsx');
    const header = [t('products.product'), t('productSerials.serialNumberLabel'), t('productSerials.imei1Label'), t('productSerials.imei2Label'), t('productSerials.barcodeLabel'), t('productSerials.statusLabel'), t('productSerials.linkedInvoiceLabel')];
    const data = all.map((serial) => [
      serial.productName || '',
      serial.serialNumber || '',
      serial.imei1 || '',
      serial.imei2 || '',
      serial.barcode || '',
      t(`productSerials.statuses.${serial.status}`),
      serial.invoiceNumber || '',
    ]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 24 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 20 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('productSerials.sheetName'));
    writeFile(wb, 'product-serials.xlsx');
  }

  async function handleDownloadPdf() {
    await downloadPdf(async () => {
      await inventoryApi.recordPrint({ entityType: 'product_serials', entityId: null, label: 'pdf' }).catch(() => {});
      await downloadSheetPdf(PRODUCT_SERIALS_PRINT_ID, 'product-serials.pdf');
    });
  }

  function handlePrint() {
    inventoryApi.recordPrint({ entityType: 'product_serials', entityId: null, label: 'print' }).catch(() => {});
    window.print();
  }

  function shortcutBadge(shortcut) {
    return <kbd className="ml-1 rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500">{shortcut.label}</kbd>;
  }

  function matchesShortcut(event, shortcut) {
    return (
      event.key.toLowerCase() === shortcut.key &&
      Boolean(event.altKey) === Boolean(shortcut.alt) &&
      Boolean(event.shiftKey) === Boolean(shortcut.shift) &&
      Boolean(event.ctrlKey || event.metaKey) === Boolean(shortcut.ctrlOrMeta)
    );
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (matchesShortcut(event, PRODUCT_SERIALS_SHORTCUTS.add) && canManage && !formModal && !viewSerial) {
        event.preventDefault();
        setFormModal({ mode: 'add' });
      } else if (matchesShortcut(event, PRODUCT_SERIALS_SHORTCUTS.pdf) && !downloadingPdf) {
        event.preventDefault();
        handleDownloadPdf();
      } else if (matchesShortcut(event, PRODUCT_SERIALS_SHORTCUTS.excel)) {
        event.preventDefault();
        handleExportExcel();
      } else if (matchesShortcut(event, PRODUCT_SERIALS_SHORTCUTS.print)) {
        event.preventDefault();
        handlePrint();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [downloadingPdf, canManage, formModal, viewSerial, vm.search, vm.productId, vm.status, t]);

  return (
    <div>
      <SectionHeader
        title={t('productSerials.title')}
        compact
        action={canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-secondary" onClick={() => setImportModalOpen(true)}>
              <Upload size={18} />
              {t('productSerials.importCsv')}
            </button>
            <button type="button" className="btn-primary" onClick={() => setFormModal({ mode: 'add' })}>
              <Plus size={18} />
              {t('productSerials.add')}
              <kbd className="ml-1 rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200">Alt+A</kbd>
            </button>
          </div>
        ) : null}
      />

      <div id={PRODUCT_SERIALS_PRINT_ID} className="surface overflow-hidden print-target">
        <div className="grid items-center gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 xl:grid-cols-12">
          <div className="relative w-full sm:col-span-2 xl:col-span-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input className="input pl-10" value={vm.search} onChange={(event) => vm.setSearch(event.target.value)} placeholder={t('productSerials.searchPlaceholder')} />
          </div>
          <div className="xl:col-span-2">
            <Select className="input w-full" value={vm.productId} onChange={(event) => vm.setProductId(event.target.value)}>
              <option value="">{t('productSerials.allProducts')}</option>
              {productDirectory.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </Select>
          </div>
          <div className="xl:col-span-2">
            <Select className="input w-full" value={vm.status} onChange={(event) => vm.setStatus(event.target.value)}>
              <option value="">{t('productSerials.allStatuses')}</option>
              {STATUS_VALUES.map((value) => (
                <option key={value} value={value}>{t(`productSerials.statuses.${value}`)}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm font-bold sm:col-span-2 sm:justify-self-end xl:col-span-5">
            <button
              type="button"
              className="btn-secondary no-print h-10 gap-1.5 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {t('purchaseReceive.downloadPdf')}
              {shortcutBadge(PRODUCT_SERIALS_SHORTCUTS.pdf)}
            </button>
            <button type="button" className="btn-secondary no-print h-10 gap-1.5 px-3 text-xs" onClick={handleExportExcel}>
              <FileSpreadsheet size={14} />
              {t('common.exportExcel')}
              {shortcutBadge(PRODUCT_SERIALS_SHORTCUTS.excel)}
            </button>
            <button type="button" className="btn-secondary no-print h-10 gap-1.5 px-3 text-xs" onClick={handlePrint}>
              <Printer size={14} />
              {t('common.print')}
              {shortcutBadge(PRODUCT_SERIALS_SHORTCUTS.print)}
            </button>
          </div>
        </div>
        {vm.productId ? (() => {
          const selectedProduct = productDirectory.find((product) => product.id === vm.productId);
          if (!selectedProduct) return null;
          return (
            <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 bg-slate-50/60 px-5 py-3 text-sm font-semibold text-slate-600 no-print">
              <span>{t('productSerials.productStockLabel')}: <span className="text-slate-950">{selectedProduct.stockPieces}</span></span>
              <span>{t('productSerials.serialCount')}: <span className="text-slate-950">{vm.total}</span></span>
            </div>
          );
        })() : null}
        {vm.loading ? (
          <div className="p-5">
            <TableSkeleton columns={6} showHeader={false} />
          </div>
        ) : vm.error ? (
          <div className="p-5">
            <Alert type="error">{vm.error}</Alert>
          </div>
        ) : (
        <>
        <MobileCardList>
          {vm.items.map((serial) => (
            <MobileListCard
              key={serial.id}
              onClick={() => setViewSerial(serial)}
              title={serial.productName || '-'}
              badge={<Badge tone={productSerialStatusTone(serial.status)}>{t(`productSerials.statuses.${serial.status}`)}</Badge>}
              subtitle={`${serial.serialNumber || ''}${serial.barcode ? ` · ${serial.barcode}` : ''}`}
              value={serial.invoiceNumber || '-'}
            />
          ))}
        </MobileCardList>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">{t('products.product')}</th>
                <th className="px-4 py-3">{t('productSerials.serialNumberLabel')}</th>
                <th className="px-4 py-3">{t('productSerials.imei1Label')}</th>
                <th className="px-4 py-3">{t('productSerials.barcodeLabel')}</th>
                <th className="px-4 py-3">{t('productSerials.statusLabel')}</th>
                <th className="px-4 py-3">{t('productSerials.linkedInvoiceLabel')}</th>
                <th className="px-4 py-3 text-right no-print">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vm.items.map((serial, index) => (
                <tr key={serial.id} className="hover:bg-slate-50">
                  <td className="table-cell font-semibold text-slate-400">{(vm.page - 1) * vm.pageSize + index + 1}</td>
                  <td className="table-cell font-semibold text-slate-950">{serial.productName || '-'}</td>
                  <td className="table-cell"><CopyableText value={serial.serialNumber} copyLabel={t('productSerials.serialNumberLabel')} displayValue={serial.serialNumber} /></td>
                  <td className="table-cell"><CopyableText value={serial.imei1} copyLabel={t('productSerials.imei1Label')} displayValue={serial.imei1} /></td>
                  <td className="table-cell"><CopyableText value={serial.barcode} copyLabel={t('productSerials.barcodeLabel')} displayValue={serial.barcode} /></td>
                  <td className="table-cell">
                    <Badge tone={productSerialStatusTone(serial.status)}>{t(`productSerials.statuses.${serial.status}`)}</Badge>
                  </td>
                  <td className="table-cell"><CopyableText value={serial.invoiceNumber} copyLabel={t('productSerials.linkedInvoiceLabel')} displayValue={serial.invoiceNumber} /></td>
                  <td className="table-cell no-print">
                    <div className="row-actions flex justify-end gap-2">
                      <button type="button" className="icon-btn" title={t('common.view')} onClick={() => setViewSerial(serial)}>
                        <Eye size={16} />
                      </button>
                      {canManage ? (
                        <>
                          <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setFormModal({ mode: 'edit', serial })}>
                            <Pencil size={16} />
                          </button>
                          <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={async () => { const r = await deleteProductSerial(serial); if (r.ok) vm.reload(); }}>
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : null}
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
            <EmptyState title={t('productSerials.noMatchTitle')} description={t('productSerials.noMatchDescription')} icon={Fingerprint} />
          </div>
        ) : null}
        {!vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4 no-print">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {formModal ? (
        <ProductSerialFormModal
          serial={formModal.serial}
          onClose={() => setFormModal(null)}
          onSave={async (value) => {
            const result = await saveProductSerial(value);
            if (result.ok) {
              setFormModal(null);
              vm.reload();
            }
            return result;
          }}
        />
      ) : null}

      {viewSerial ? <ProductSerialViewModal serial={viewSerial} onClose={() => setViewSerial(null)} /> : null}

      {importModalOpen ? (
        <ProductSerialImportModal
          onClose={() => setImportModalOpen(false)}
          onImported={() => {
            setImportModalOpen(false);
            vm.reload();
          }}
        />
      ) : null}
    </div>
  );
}

