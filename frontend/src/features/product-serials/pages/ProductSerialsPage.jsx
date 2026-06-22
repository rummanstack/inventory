import { useState } from 'react';
import { Eye, Fingerprint, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Alert, Badge, EmptyState, Pagination, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatNumber } from '../../../utils/calculations.js';
import { productSerialStatusTone } from '../../../models/inventoryViewData.js';
import ProductSerialFormModal from '../components/ProductSerialFormModal';
import ProductSerialViewModal from '../components/ProductSerialViewModal';
import { useProductSerialsViewModel } from '../viewmodels/useProductSerialsViewModel';

const STATUS_VALUES = ['IN_STOCK', 'SOLD', 'RETURNED', 'DAMAGED', 'WARRANTY', 'DELETED'];

export default function ProductSerialsPage() {
  const { saveProductSerial, deleteProductSerial, t, can, productDirectory } = useInventoryApp();
  const vm = useProductSerialsViewModel();
  const [formModal, setFormModal] = useState(null);
  const [viewSerial, setViewSerial] = useState(null);
  const canManage = can('manage_product_serials');

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

      <div className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{t('productSerials.eyebrow')}</p>
              <p className="text-sm font-medium text-slate-500">{t('productSerials.description')}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm font-bold">
              <span className="muted-chip">{formatNumber(vm.total)} {t('productSerials.serialCount')}</span>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className="input pl-10" value={vm.search} onChange={(event) => vm.setSearch(event.target.value)} placeholder={t('productSerials.searchPlaceholder')} />
            </div>
            <select className="input" value={vm.productId} onChange={(event) => vm.setProductId(event.target.value)}>
              <option value="">{t('productSerials.allProducts')}</option>
              {productDirectory.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
            <select className="input" value={vm.status} onChange={(event) => vm.setStatus(event.target.value)}>
              <option value="">{t('productSerials.allStatuses')}</option>
              {STATUS_VALUES.map((value) => (
                <option key={value} value={value}>{t(`productSerials.statuses.${value}`)}</option>
              ))}
            </select>
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
                <th className="hidden px-4 py-3 sm:table-cell">{t('productSerials.imei1Label')}</th>
                <th className="px-4 py-3">{t('productSerials.statusLabel')}</th>
                <th className="hidden px-4 py-3 md:table-cell">{t('productSerials.linkedInvoiceLabel')}</th>
                <th className="px-4 py-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vm.items.map((serial, index) => (
                <tr key={serial.id} className="hover:bg-slate-50">
                  <td className="table-cell font-black text-slate-400">{(vm.page - 1) * vm.pageSize + index + 1}</td>
                  <td className="table-cell font-semibold text-slate-950">{serial.productName || '-'}</td>
                  <td className="table-cell">{serial.serialNumber || '-'}</td>
                  <td className="hidden table-cell sm:table-cell">{serial.imei1 || '-'}</td>
                  <td className="table-cell">
                    <Badge tone={productSerialStatusTone(serial.status)}>{t(`productSerials.statuses.${serial.status}`)}</Badge>
                  </td>
                  <td className="hidden table-cell md:table-cell">{serial.invoiceNumber || '-'}</td>
                  <td className="table-cell">
                    <div className="flex justify-end gap-2">
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
          <div className="border-t border-slate-100 px-5 py-4">
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
