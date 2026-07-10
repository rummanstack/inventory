import { useState } from 'react';
import { Download, Eye, FileSpreadsheet, Fingerprint, Loader2, Pencil, Plus, Printer, Search, Trash2 } from 'lucide-react';
import { Alert, Badge, EmptyState, Pagination, SectionHeader, TableSkeleton, Select } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { downloadSheetPdf } from '../../../services/printService.js';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';
import { formatNumber } from '../../../utils/calculations.js';
import { productSerialStatusTone } from '../../../models/inventoryViewData.js';
import ProductSerialFormModal from '../components/ProductSerialFormModal';
import ProductSerialViewModal from '../components/ProductSerialViewModal';
import { useProductSerialsViewModel } from '../viewmodels/useProductSerialsViewModel';

const STATUS_VALUES = ['IN_STOCK', 'SOLD', 'RETURNED', 'DAMAGED', 'WARRANTY', 'DELETED'];
const PRODUCT_SERIALS_PRINT_ID = 'product-serials-print';

export default function ProductSerialsPage() {
  const { saveProductSerial, deleteProductSerial, t, can, productDirectory } = useInventoryApp();
  const vm = useProductSerialsViewModel();
  const [formModal, setFormModal] = useState(null);
  const [viewSerial, setViewSerial] = useState(null);
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
    const header = [t('products.product'), t('productSerials.serialNumberLabel'), t('productSerials.imei1Label'), t('productSerials.imei2Label'), t('productSerials.statusLabel'), t('productSerials.linkedInvoiceLabel')];
    const data = all.map((serial) => [
      serial.productName || '',
      serial.serialNumber || '',
      serial.imei1 || '',
      serial.imei2 || '',
      t(`productSerials.statuses.${serial.status}`),
      serial.invoiceNumber || '',
    ]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 24 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 20 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('productSerials.sheetName'));
    writeFile(wb, 'product-serials.xlsx');
  }

  return (
    <div>
      <SectionHeader
        eyebrow={t('productSerials.eyebrow')}
        title={t('productSerials.title')}
        description={t('productSerials.description')}
        action={canManage ? (
          <button type="button" className="btn-primary" onClick={() => setFormModal({ mode: 'add' })}>
            <Plus size={18} />
            {t('productSerials.add')}
          </button>
        ) : null}
      />

      <div id={PRODUCT_SERIALS_PRINT_ID} className="surface overflow-hidden print-target">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 no-print">
          <span className="text-sm font-bold text-slate-700">{t('productSerials.title')}</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => downloadPdf(async () => { await inventoryApi.recordPrint({ entityType: 'product_serials', entityId: null, label: 'pdf' }).catch(() => {}); await downloadSheetPdf(PRODUCT_SERIALS_PRINT_ID, 'product-serials.pdf'); })}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {t('purchaseReceive.downloadPdf')}
            </button>
            <button type="button" className="btn-secondary py-1.5 text-xs" onClick={handleExportExcel}>
              <FileSpreadsheet size={14} />
              {t('common.exportExcel')}
            </button>
            <button
              type="button"
              className="btn-secondary py-1.5 text-xs"
              onClick={() => { inventoryApi.recordPrint({ entityType: 'product_serials', entityId: null, label: 'print' }).catch(() => {}); window.print(); }}
            >
              <Printer size={14} />
              {t('common.print')}
            </button>
          </div>
        </div>
        <div className="border-b border-slate-100 p-5 no-print">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t('productSerials.eyebrow')}</p>
            <div className="flex flex-wrap gap-2 text-sm font-bold">
              <span className="muted-chip">{formatNumber(vm.total)} {t('productSerials.serialCount')}</span>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className="input pl-10" value={vm.search} onChange={(event) => vm.setSearch(event.target.value)} placeholder={t('productSerials.searchPlaceholder')} />
            </div>
            <Select className="input" value={vm.productId} onChange={(event) => vm.setProductId(event.target.value)}>
              <option value="">{t('productSerials.allProducts')}</option>
              {productDirectory.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </Select>
            <Select className="input" value={vm.status} onChange={(event) => vm.setStatus(event.target.value)}>
              <option value="">{t('productSerials.allStatuses')}</option>
              {STATUS_VALUES.map((value) => (
                <option key={value} value={value}>{t(`productSerials.statuses.${value}`)}</option>
              ))}
            </Select>
          </div>
        </div>
        {vm.loading ? (
          <div className="p-5">
            <TableSkeleton columns={6} showHeader={false} />
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
                <th className="px-4 py-3">{t('productSerials.serialNumberLabel')}</th>
                <th className="px-4 py-3">{t('productSerials.imei1Label')}</th>
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
                  <td className="table-cell">{serial.serialNumber || '-'}</td>
                  <td className="hidden table-cell sm:table-cell">{serial.imei1 || '-'}</td>
                  <td className="table-cell">
                    <Badge tone={productSerialStatusTone(serial.status)}>{t(`productSerials.statuses.${serial.status}`)}</Badge>
                  </td>
                  <td className="hidden table-cell md:table-cell">{serial.invoiceNumber || '-'}</td>
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
    </div>
  );
}

