import { useEffect, useState } from 'react';
import { Download, Eye, FileSpreadsheet, Loader2, Pencil, Phone, Plus, Printer, Search, Store, Trash2 } from 'lucide-react';
import { Alert, Badge, EmptyState, MobileCardList, MobileListCard, Pagination, SectionHeader, TableSkeleton, Select } from '../../../components/ui.jsx';
import { statusTone } from '../../../models/inventoryViewData.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';
import { formatCurrency, formatNumber } from '../../../utils/calculations.js';
import ShopFormModal from '../components/ShopFormModal';
import ShopViewModal from '../components/ShopViewModal';
import { useShopsViewModel } from '../viewmodels/useShopsViewModel';

const SHOPS_PRINT_ID = 'shops-print';
const SHOPS_REPORT_SHORTCUTS = {
  add: { alt: true, key: 'a', label: 'Alt+A' },
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

export default function ShopsPage() {
  const { saveShop, deleteShop, t, can } = useInventoryApp();
  const vm = useShopsViewModel();
  const [formModal, setFormModal] = useState(null);
  const [viewShop, setViewShop] = useState(null);
  const canManageShops = can('manage_customers');
  const [downloadingPdf, downloadPdf] = useAsyncAction();

  async function handleExportExcel() {
    const result = await inventoryApi.listCustomers({ search: vm.search || undefined, status: vm.status || undefined, page: 1, pageSize: 10000 });
    const all = result.items || [];
    const { utils, writeFile } = await import('xlsx');
    const header = ['#', t('shops.shopName'), t('shops.phone'), t('shops.market'), t('shops.assignedDsr'), t('shops.currentDue'), t('shops.status')];
    const data = all.map((shop, i) => [
      i + 1,
      shop.shopName,
      shop.phone || '',
      shop.market || '',
      shop.assignedDsrName || t('shops.unassigned'),
      Number(shop.currentDue || 0),
      shop.status === 'ACTIVE' ? t('shops.statusActive') : t('shops.statusInactive'),
    ]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 6 }, { wch: 24 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 12 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('shops.sheetName'));
    writeFile(wb, 'shops.xlsx');
  }

  async function handleDownloadPdf() {
    await downloadPdf(async () => {
      await inventoryApi.recordPrint({ entityType: 'shops', entityId: null, label: 'pdf' }).catch(() => {});
      await downloadSheetPdf(SHOPS_PRINT_ID, 'shops.pdf');
    });
  }

  function handlePrint() {
    inventoryApi.recordPrint({ entityType: 'shops', entityId: null, label: 'print' }).catch(() => {});
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
      if (matchesShortcut(event, SHOPS_REPORT_SHORTCUTS.add) && canManageShops && !formModal && !viewShop) {
        event.preventDefault();
        setFormModal({ mode: 'add' });
      } else if (matchesShortcut(event, SHOPS_REPORT_SHORTCUTS.pdf) && !downloadingPdf) {
        event.preventDefault();
        handleDownloadPdf();
      } else if (matchesShortcut(event, SHOPS_REPORT_SHORTCUTS.excel)) {
        event.preventDefault();
        handleExportExcel();
      } else if (matchesShortcut(event, SHOPS_REPORT_SHORTCUTS.print)) {
        event.preventDefault();
        handlePrint();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [downloadingPdf, vm.search, vm.status, canManageShops, formModal, viewShop, t]);

  return (
    <div>
      <SectionHeader
        title={t('shops.title')}
        compact
        action={canManageShops ? (
          <button type="button" className="btn-primary" onClick={() => setFormModal({ mode: 'add' })}>
            <Plus size={18} />
            {t('shops.add')}
            <kbd className="ml-1 rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200">Alt+A</kbd>
          </button>
        ) : null}
      />

      <div id={SHOPS_PRINT_ID} className="surface overflow-hidden print-target">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input className="input pl-10" value={vm.search} onChange={(event) => vm.setSearch(event.target.value)} placeholder={t('shops.searchPlaceholder')} />
          </div>
          <Select className="input sm:w-48" value={vm.status} onChange={(event) => vm.setStatus(event.target.value)}>
            <option value="">{t('shops.allStatuses')}</option>
            <option value="ACTIVE">{t('shops.statusActive')}</option>
            <option value="INACTIVE">{t('shops.statusInactive')}</option>
          </Select>
          <div className="flex flex-wrap items-center gap-2 text-sm font-bold sm:ml-auto">
            <span className="muted-chip">{formatNumber(vm.total)} {t('shops.shopCount')}</span>
            <button
              type="button"
              className="btn-secondary no-print h-10 gap-1.5 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {t('purchaseReceive.downloadPdf')}
              {shortcutBadge(SHOPS_REPORT_SHORTCUTS.pdf)}
            </button>
            <button type="button" className="btn-secondary no-print h-10 gap-1.5 px-3 text-xs" onClick={handleExportExcel}>
              <FileSpreadsheet size={14} />
              {t('common.exportExcel')}
              {shortcutBadge(SHOPS_REPORT_SHORTCUTS.excel)}
            </button>
            <button
              type="button"
              className="btn-secondary no-print h-10 gap-1.5 px-3 text-xs"
              onClick={handlePrint}
            >
              <Printer size={14} />
              {t('common.print')}
              {shortcutBadge(SHOPS_REPORT_SHORTCUTS.print)}
            </button>
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
        <>
        <MobileCardList>
          {vm.items.map((shop) => (
            <MobileListCard
              key={shop.id}
              onClick={() => setViewShop(shop)}
              title={shop.shopName}
              badge={shop.status !== 'ACTIVE' ? (
                <Badge tone={statusTone('Inactive')}>{t('shops.statusInactive')}</Badge>
              ) : null}
              subtitle={[shop.phone, shop.market].filter(Boolean).join(' · ') || shop.ownerName}
              value={formatCurrency(shop.currentDue)}
              valueClass={Number(shop.currentDue) > 0 ? 'text-rose-700' : undefined}
              valueSub={shop.assignedDsrName || t('shops.unassigned')}
              action={canManageShops ? (
                <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setFormModal({ mode: 'edit', shop })}>
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
                <th className="px-4 py-3">{t('shops.shopName')}</th>
                <th className="px-4 py-3">{t('shops.phone')}</th>
                <th className="px-4 py-3">{t('shops.market')}</th>
                <th className="px-4 py-3">{t('shops.assignedDsr')}</th>
                <th className="px-4 py-3 text-right">{t('shops.currentDue')}</th>
                <th className="px-4 py-3">{t('shops.status')}</th>
                <th className="px-4 py-3 text-right no-print">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vm.items.map((shop, index) => (
                <tr key={shop.id} className="hover:bg-slate-50">
                  <td className="table-cell font-semibold text-slate-400">{(vm.page - 1) * vm.pageSize + index + 1}</td>
                  <td className="table-cell font-semibold text-slate-950">
                    <div>
                      <p>{shop.shopName}</p>
                      {shop.ownerName ? <p className="text-xs font-medium text-slate-500">{shop.ownerName}</p> : null}
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className="inline-flex items-center gap-2">
                      <Phone size={15} className="text-slate-400" />
                      {shop.phone || '-'}
                    </span>
                  </td>
                  <td className="table-cell">{shop.market || '-'}</td>
                  <td className="table-cell">{shop.assignedDsrName || t('shops.unassigned')}</td>
                  <td className="table-cell text-right font-bold">{formatCurrency(shop.currentDue)}</td>
                  <td className="table-cell">
                    <Badge tone={statusTone(shop.status === 'ACTIVE' ? 'Active' : 'Inactive')}>
                      {shop.status === 'ACTIVE' ? t('shops.statusActive') : t('shops.statusInactive')}
                    </Badge>
                  </td>
                  <td className="table-cell no-print">
                    <div className="row-actions flex justify-end gap-2">
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
        </>
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

