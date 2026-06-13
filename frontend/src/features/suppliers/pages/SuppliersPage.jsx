import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, FileText, Pencil, Phone, Plus, Search, Truck, Trash2 } from 'lucide-react';
import { Alert, Badge, EmptyState, Pagination, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import { statusTone } from '../../../models/inventoryViewData.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, formatNumber } from '../../../utils/calculations.js';
import SupplierFormModal from '../components/SupplierFormModal';
import SupplierViewModal from '../components/SupplierViewModal';
import { useSuppliersViewModel } from '../viewmodels/useSuppliersViewModel';

export default function SuppliersPage() {
  const { saveSupplier, deleteSupplier, t, can } = useInventoryApp();
  const navigate = useNavigate();
  const vm = useSuppliersViewModel();
  const [formModal, setFormModal] = useState(null);
  const [viewSupplier, setViewSupplier] = useState(null);
  const canManageSuppliers = can('manage_suppliers');

  return (
    <div>
      <SectionHeader
        eyebrow={t('suppliers.eyebrow')}
        title={t('suppliers.title')}
        description={t('suppliers.description')}
        action={canManageSuppliers ? (
          <button type="button" className="btn-primary" onClick={() => setFormModal({ mode: 'add' })}>
            <Plus size={18} />
            {t('suppliers.add')}
          </button>
        ) : null}
      />

      <div className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{t('suppliers.eyebrow')}</p>
              <p className="text-sm font-medium text-slate-500">{t('suppliers.description')}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm font-bold">
              <span className="muted-chip">{formatNumber(vm.total)} {t('suppliers.supplierCount')}</span>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className="input pl-10" value={vm.search} onChange={(event) => vm.setSearch(event.target.value)} placeholder={t('suppliers.searchPlaceholder')} />
            </div>
            <select className="input sm:w-48" value={vm.status} onChange={(event) => vm.setStatus(event.target.value)}>
              <option value="">{t('suppliers.allStatuses')}</option>
              <option value="ACTIVE">{t('suppliers.statusActive')}</option>
              <option value="INACTIVE">{t('suppliers.statusInactive')}</option>
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
                <th className="px-4 py-3">{t('suppliers.nameLabel')}</th>
                <th className="hidden px-4 py-3 sm:table-cell">{t('suppliers.phoneLabel')}</th>
                <th className="hidden px-4 py-3 md:table-cell">{t('suppliers.addressLabel')}</th>
                <th className="px-4 py-3 text-right">{t('suppliers.openingDueLabel')}</th>
                <th className="px-4 py-3 text-right">{t('suppliers.currentDueLabel')}</th>
                <th className="px-4 py-3">{t('suppliers.status')}</th>
                <th className="px-4 py-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vm.items.map((supplier, index) => (
                <tr key={supplier.id} className="hover:bg-slate-50">
                  <td className="table-cell font-black text-slate-400">{(vm.page - 1) * vm.pageSize + index + 1}</td>
                  <td className="table-cell font-semibold text-slate-950">{supplier.name}</td>
                  <td className="hidden table-cell sm:table-cell">
                    <span className="inline-flex items-center gap-2">
                      <Phone size={15} className="text-slate-400" />
                      {supplier.phone || '-'}
                    </span>
                  </td>
                  <td className="hidden table-cell md:table-cell">{supplier.address || '-'}</td>
                  <td className="table-cell text-right font-bold">{formatCurrency(supplier.openingDue)}</td>
                  <td className="table-cell text-right font-bold">{formatCurrency(supplier.currentDue)}</td>
                  <td className="table-cell">
                    <Badge tone={statusTone(supplier.status === 'ACTIVE' ? 'Active' : 'Inactive')}>
                      {supplier.status === 'ACTIVE' ? t('suppliers.statusActive') : t('suppliers.statusInactive')}
                    </Badge>
                  </td>
                  <td className="table-cell">
                    <div className="flex justify-end gap-2">
                      <button type="button" className="icon-btn" title={t('suppliers.viewStatement')} onClick={() => navigate(`/supplier-statement?supplierId=${supplier.id}`)}>
                        <FileText size={16} />
                      </button>
                      <button type="button" className="icon-btn" title={t('common.view')} onClick={() => setViewSupplier(supplier)}>
                        <Eye size={16} />
                      </button>
                      {canManageSuppliers ? (
                        <>
                          <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setFormModal({ mode: 'edit', supplier })}>
                            <Pencil size={16} />
                          </button>
                          <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={async () => { const r = await deleteSupplier(supplier); if (r.ok) vm.reload(); }}>
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
            <EmptyState title={t('suppliers.noMatchTitle')} description={t('suppliers.noMatchDescription')} icon={Truck} />
          </div>
        ) : null}
        {!vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {formModal ? <SupplierFormModal supplier={formModal.supplier} onClose={() => setFormModal(null)} onSave={async (value) => {
        const result = await saveSupplier(value);
        if (result.ok) {
          setFormModal(null);
          vm.reload();
        }
        return result;
      }} /> : null}

      {viewSupplier ? <SupplierViewModal supplier={viewSupplier} onClose={() => setViewSupplier(null)} /> : null}
    </div>
  );
}
