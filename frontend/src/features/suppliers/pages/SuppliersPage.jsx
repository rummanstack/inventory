import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Eye, FileSpreadsheet, FileText, Loader2, Pencil, Phone, Plus, Printer, Search, Truck, Trash2 } from 'lucide-react';
import { Alert, Badge, EmptyState, MobileCardList, MobileListCard, Pagination, SectionHeader, TableSkeleton, Select } from '../../../components/ui.jsx';
import { statusTone } from '../../../models/inventoryViewData.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { downloadSheetPdf } from '../../../services/printService.js';
import { formatCurrency, formatNumber } from '../../../utils/calculations.js';
import SupplierFormModal from '../components/SupplierFormModal';
import SupplierViewModal from '../components/SupplierViewModal';
import { useSuppliersViewModel } from '../viewmodels/useSuppliersViewModel';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';

const SUPPLIERS_PRINT_ID = 'suppliers-print';
const SUPPLIERS_SHORTCUTS = {
  add: { alt: true, key: 'a', label: 'Alt+A' },
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

export default function SuppliersPage() {
  const { saveSupplier, deleteSupplier, t, can } = useInventoryApp();
  const navigate = useNavigate();
  const vm = useSuppliersViewModel();
  const [formModal, setFormModal] = useState(null);
  const [viewSupplier, setViewSupplier] = useState(null);
  const canManageSuppliers = can('manage_suppliers');
  const [downloadingPdf, downloadPdf] = useAsyncAction();

  async function handleExportExcel() {
    const result = await inventoryApi.listSuppliers({ page: 1, pageSize: 10000, search: vm.search || undefined, status: vm.status || undefined });
    const all = result.items || [];
    const { utils, writeFile } = await import('xlsx');
    const header = [t('suppliers.nameLabel'), t('suppliers.phoneLabel'), t('suppliers.addressLabel'), t('suppliers.openingDueLabel'), t('suppliers.currentDueLabel'), t('suppliers.status')];
    const data = all.map((supplier) => [
      supplier.name,
      supplier.phone || '',
      supplier.address || '',
      Number(supplier.openingDue || 0),
      Number(supplier.currentDue || 0),
      supplier.status === 'ACTIVE' ? t('suppliers.statusActive') : t('suppliers.statusInactive'),
    ]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 26 }, { wch: 16 }, { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 12 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('suppliers.sheetName'));
    writeFile(wb, 'suppliers.xlsx');
  }

  async function handleDownloadPdf() {
    await downloadPdf(async () => {
      await inventoryApi.recordPrint({ entityType: 'suppliers', entityId: null, label: 'pdf' }).catch(() => {});
      await downloadSheetPdf(SUPPLIERS_PRINT_ID, 'suppliers.pdf');
    });
  }

  function handlePrint() {
    inventoryApi.recordPrint({ entityType: 'suppliers', entityId: null, label: 'print' }).catch(() => {});
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
      if (matchesShortcut(event, SUPPLIERS_SHORTCUTS.add) && canManageSuppliers && !formModal && !viewSupplier) {
        event.preventDefault();
        setFormModal({ mode: 'add' });
      } else if (matchesShortcut(event, SUPPLIERS_SHORTCUTS.pdf) && !downloadingPdf) {
        event.preventDefault();
        handleDownloadPdf();
      } else if (matchesShortcut(event, SUPPLIERS_SHORTCUTS.excel)) {
        event.preventDefault();
        handleExportExcel();
      } else if (matchesShortcut(event, SUPPLIERS_SHORTCUTS.print)) {
        event.preventDefault();
        handlePrint();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [downloadingPdf, canManageSuppliers, formModal, viewSupplier, vm.search, vm.status, t]);

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
            <kbd className="ml-1 rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200">Alt+A</kbd>
          </button>
        ) : null}
      />

      <div id={SUPPLIERS_PRINT_ID} className="surface overflow-hidden print-target">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t('suppliers.eyebrow')}</p>
            <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
              <span className="muted-chip">{formatNumber(vm.total)} {t('suppliers.supplierCount')}</span>
              <button
                type="button"
                className="btn-secondary no-print py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {t('purchaseReceive.downloadPdf')}
                {shortcutBadge(SUPPLIERS_SHORTCUTS.pdf)}
              </button>
              <button type="button" className="btn-secondary no-print py-1.5 text-xs" onClick={handleExportExcel}>
                <FileSpreadsheet size={14} />
                {t('common.exportExcel')}
                {shortcutBadge(SUPPLIERS_SHORTCUTS.excel)}
              </button>
              <button
                type="button"
                className="btn-secondary no-print py-1.5 text-xs"
                onClick={handlePrint}
              >
                <Printer size={14} />
                {t('common.print')}
                {shortcutBadge(SUPPLIERS_SHORTCUTS.print)}
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className="input pl-10" value={vm.search} onChange={(event) => vm.setSearch(event.target.value)} placeholder={t('suppliers.searchPlaceholder')} />
            </div>
            <Select className="input w-full sm:w-48" value={vm.status} onChange={(event) => vm.setStatus(event.target.value)}>
              <option value="">{t('suppliers.allStatuses')}</option>
              <option value="ACTIVE">{t('suppliers.statusActive')}</option>
              <option value="INACTIVE">{t('suppliers.statusInactive')}</option>
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
        <>
        <MobileCardList>
          {vm.items.map((supplier) => (
            <MobileListCard
              key={supplier.id}
              onClick={() => setViewSupplier(supplier)}
              title={supplier.name}
              badge={supplier.status !== 'ACTIVE' ? (
                <Badge tone={statusTone('Inactive')}>{t('suppliers.statusInactive')}</Badge>
              ) : null}
              subtitle={[supplier.phone, supplier.address].filter(Boolean).join(' · ') || '-'}
              value={formatCurrency(supplier.currentDue)}
              valueClass={Number(supplier.currentDue) > 0 ? 'text-rose-700' : undefined}
              action={canManageSuppliers ? (
                <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setFormModal({ mode: 'edit', supplier })}>
                  <Pencil size={18} />
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
                <th className="px-4 py-3">{t('suppliers.nameLabel')}</th>
                <th className="px-4 py-3">{t('suppliers.phoneLabel')}</th>
                <th className="px-4 py-3">{t('suppliers.addressLabel')}</th>
                <th className="px-4 py-3 text-right">{t('suppliers.openingDueLabel')}</th>
                <th className="px-4 py-3 text-right">{t('suppliers.currentDueLabel')}</th>
                <th className="px-4 py-3">{t('suppliers.status')}</th>
                <th className="px-4 py-3 text-right no-print">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vm.items.map((supplier, index) => (
                <tr key={supplier.id} className="hover:bg-slate-50">
                  <td className="table-cell font-semibold text-slate-400">{(vm.page - 1) * vm.pageSize + index + 1}</td>
                  <td className="table-cell font-semibold text-slate-950">{supplier.name}</td>
                  <td className="table-cell">
                    <span className="inline-flex items-center gap-2">
                      <Phone size={15} className="text-slate-400" />
                      {supplier.phone || '-'}
                    </span>
                  </td>
                  <td className="table-cell">{supplier.address || '-'}</td>
                  <td className="table-cell text-right font-bold">{formatCurrency(supplier.openingDue)}</td>
                  <td className="table-cell text-right font-bold">{formatCurrency(supplier.currentDue)}</td>
                  <td className="table-cell">
                    <Badge tone={statusTone(supplier.status === 'ACTIVE' ? 'Active' : 'Inactive')}>
                      {supplier.status === 'ACTIVE' ? t('suppliers.statusActive') : t('suppliers.statusInactive')}
                    </Badge>
                  </td>
                  <td className="table-cell no-print">
                    <div className="row-actions flex justify-end gap-2">
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
        </>
        )}
        {!vm.loading && !vm.error && !vm.items.length ? (
          <div className="p-5">
            <EmptyState title={t('suppliers.noMatchTitle')} description={t('suppliers.noMatchDescription')} icon={Truck} />
          </div>
        ) : null}
        {!vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4 no-print">
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

