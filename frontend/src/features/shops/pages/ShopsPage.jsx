import { useState } from 'react';
import { Eye, Pencil, Phone, Plus, Search, Store, Trash2 } from 'lucide-react';
import { Alert, Badge, EmptyState, Pagination, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import { statusTone } from '../../../models/inventoryViewData.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, formatNumber } from '../../../utils/calculations.js';
import ShopFormModal from '../components/ShopFormModal';
import ShopViewModal from '../components/ShopViewModal';
import { useShopsViewModel } from '../viewmodels/useShopsViewModel';

export default function ShopsPage() {
  const { saveShop, deleteShop, t, can } = useInventoryApp();
  const vm = useShopsViewModel();
  const [formModal, setFormModal] = useState(null);
  const [viewShop, setViewShop] = useState(null);
  const canManageShops = can('manage_customers');

  return (
    <div>
      <SectionHeader
        eyebrow={t('shops.eyebrow')}
        title={t('shops.title')}
        description={t('shops.description')}
        action={canManageShops ? (
          <button type="button" className="btn-primary" onClick={() => setFormModal({ mode: 'add' })}>
            <Plus size={18} />
            {t('shops.add')}
          </button>
        ) : null}
      />

      <div className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{t('shops.eyebrow')}</p>
              <p className="text-sm font-medium text-slate-500">{t('shops.description')}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm font-bold">
              <span className="muted-chip">{formatNumber(vm.total)} {t('shops.shopCount')}</span>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className="input pl-10" value={vm.search} onChange={(event) => vm.setSearch(event.target.value)} placeholder={t('shops.searchPlaceholder')} />
            </div>
            <select className="input sm:w-48" value={vm.status} onChange={(event) => vm.setStatus(event.target.value)}>
              <option value="">{t('shops.allStatuses')}</option>
              <option value="ACTIVE">{t('shops.statusActive')}</option>
              <option value="INACTIVE">{t('shops.statusInactive')}</option>
            </select>
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
                <th className="px-4 py-3">{t('shops.shopName')}</th>
                <th className="hidden px-4 py-3 sm:table-cell">{t('shops.phone')}</th>
                <th className="hidden px-4 py-3 md:table-cell">{t('shops.market')}</th>
                <th className="hidden px-4 py-3 md:table-cell">{t('shops.assignedDsr')}</th>
                <th className="px-4 py-3 text-right">{t('shops.currentDue')}</th>
                <th className="px-4 py-3">{t('shops.status')}</th>
                <th className="px-4 py-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vm.items.map((shop, index) => (
                <tr key={shop.id} className="hover:bg-slate-50">
                  <td className="table-cell font-black text-slate-400">{(vm.page - 1) * vm.pageSize + index + 1}</td>
                  <td className="table-cell font-semibold text-slate-950">
                    <div>
                      <p>{shop.shopName}</p>
                      {shop.ownerName ? <p className="text-xs font-medium text-slate-500">{shop.ownerName}</p> : null}
                    </div>
                  </td>
                  <td className="hidden table-cell sm:table-cell">
                    <span className="inline-flex items-center gap-2">
                      <Phone size={15} className="text-slate-400" />
                      {shop.phone || '-'}
                    </span>
                  </td>
                  <td className="hidden table-cell md:table-cell">{shop.market || '-'}</td>
                  <td className="hidden table-cell md:table-cell">{shop.assignedDsrName || t('shops.unassigned')}</td>
                  <td className="table-cell text-right font-bold">{formatCurrency(shop.currentDue)}</td>
                  <td className="table-cell">
                    <Badge tone={statusTone(shop.status === 'ACTIVE' ? 'Active' : 'Inactive')}>
                      {shop.status === 'ACTIVE' ? t('shops.statusActive') : t('shops.statusInactive')}
                    </Badge>
                  </td>
                  <td className="table-cell">
                    <div className="flex justify-end gap-2">
                      <button type="button" className="icon-btn" title={t('common.view')} onClick={() => setViewShop(shop)}>
                        <Eye size={16} />
                      </button>
                      {canManageShops ? (
                        <>
                          <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setFormModal({ mode: 'edit', shop })}>
                            <Pencil size={16} />
                          </button>
                          <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={async () => { const r = await deleteShop(shop); if (r.ok) vm.reload(); }}>
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
            <EmptyState title={t('shops.noMatchTitle')} description={t('shops.noMatchDescription')} icon={Store} />
          </div>
        ) : null}
        {!vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {formModal ? <ShopFormModal shop={formModal.shop} onClose={() => setFormModal(null)} onSave={async (value) => {
        const result = await saveShop(value);
        if (result.ok) {
          setFormModal(null);
          vm.reload();
        }
        return result;
      }} /> : null}

      {viewShop ? <ShopViewModal shop={viewShop} onClose={() => setViewShop(null)} /> : null}
    </div>
  );
}
