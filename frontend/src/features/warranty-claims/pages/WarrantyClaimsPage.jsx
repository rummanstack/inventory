import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, FileSpreadsheet, Loader2, Pencil, Plus, Printer, Receipt, Search, Trash2, Wrench } from 'lucide-react';
import { Alert, Badge, CopyableText, EmptyState, MobileCardList, MobileListCard, Pagination, SectionHeader, TableSkeleton, Select } from '../../../components/ui.jsx';
import { DateRangePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { downloadSheetPdf } from '../../../services/printService.js';
import { formatDateTime } from '../../../utils/calculations.js';
import { warrantyClaimStatusTone } from '../../../models/inventoryViewData.js';
import WarrantyClaimFormModal from '../components/WarrantyClaimFormModal';
import { useWarrantyClaimsViewModel } from '../viewmodels/useWarrantyClaimsViewModel';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';

const STATUS_VALUES = ['RECEIVED', 'SENT_TO_SUPPLIER', 'REPAIRED', 'REPLACED', 'REJECTED', 'DELIVERED'];
const WARRANTY_CLAIMS_PRINT_ID = 'warranty-claims-print';
const WARRANTY_CLAIMS_SHORTCUTS = {
  add: { alt: true, key: 'a', label: 'Alt+A' },
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

export default function WarrantyClaimsPage() {
  const { saveWarrantyClaim, deleteWarrantyClaim, t, can, productDirectory, supplierDirectory } = useInventoryApp();
  const navigate = useNavigate();
  const vm = useWarrantyClaimsViewModel();
  const [formModal, setFormModal] = useState(null);
  const canManage = can('manage_warranty_claims');
  const [downloadingPdf, downloadPdf] = useAsyncAction();

  async function handleExportExcel() {
    const result = await inventoryApi.listWarrantyClaims({
      page: 1,
      pageSize: 10000,
      search: vm.search || undefined,
      status: vm.status || undefined,
      supplierId: vm.supplierId || undefined,
      productId: vm.productId || undefined,
      dateFrom: vm.dateFrom || undefined,
      dateTo: vm.dateTo || undefined,
    });
    const all = result.items || [];
    const { utils, writeFile } = await import('xlsx');
    const header = [t('warrantyClaims.claimNumberLabel'), t('products.product'), t('warrantyClaims.serialLabel'), t('retailer.shared.customerLabel'), t('warrantyClaims.receivedDateLabel'), t('warrantyClaims.statusLabel')];
    const data = all.map((claim) => [
      claim.claimNumber,
      claim.productName || '',
      claim.serialNumber || claim.imei1 || claim.imei2 || '',
      claim.customerName || '',
      claim.receivedDate,
      t(`warrantyClaims.statuses.${claim.status}`),
    ]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 18 }, { wch: 24 }, { wch: 20 }, { wch: 22 }, { wch: 16 }, { wch: 16 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, t('warrantyClaims.sheetName'));
    writeFile(wb, 'warranty-claims.xlsx');
  }

  async function handleDownloadPdf() {
    await downloadPdf(async () => {
      await inventoryApi.recordPrint({ entityType: 'warranty_claims', entityId: null, label: 'pdf' }).catch(() => {});
      await downloadSheetPdf(WARRANTY_CLAIMS_PRINT_ID, 'warranty-claims.pdf');
    });
  }

  function handlePrint() {
    inventoryApi.recordPrint({ entityType: 'warranty_claims', entityId: null, label: 'print' }).catch(() => {});
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
      if (matchesShortcut(event, WARRANTY_CLAIMS_SHORTCUTS.add) && canManage && !formModal) {
        event.preventDefault();
        setFormModal({ mode: 'add' });
      } else if (matchesShortcut(event, WARRANTY_CLAIMS_SHORTCUTS.pdf) && !downloadingPdf) {
        event.preventDefault();
        handleDownloadPdf();
      } else if (matchesShortcut(event, WARRANTY_CLAIMS_SHORTCUTS.excel)) {
        event.preventDefault();
        handleExportExcel();
      } else if (matchesShortcut(event, WARRANTY_CLAIMS_SHORTCUTS.print)) {
        event.preventDefault();
        handlePrint();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [downloadingPdf, canManage, formModal, vm.search, vm.status, vm.productId, vm.supplierId, vm.dateFrom, vm.dateTo, t]);

  return (
    <div>
      <SectionHeader
        title={t('warrantyClaims.title')}
        compact
        action={canManage ? (
          <button type="button" className="btn-primary" onClick={() => setFormModal({ mode: 'add' })}>
            <Plus size={18} />
            {t('warrantyClaims.add')}
            <kbd className="ml-1 rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200">Alt+A</kbd>
          </button>
        ) : null}
      />

      <div id={WARRANTY_CLAIMS_PRINT_ID} className="surface overflow-hidden print-target">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full flex-1 sm:min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input className="input pl-10" value={vm.search} onChange={(event) => vm.setSearch(event.target.value)} placeholder={t('warrantyClaims.searchPlaceholder')} />
          </div>
          <Select className="input w-full sm:w-40" value={vm.status} onChange={(event) => vm.setStatus(event.target.value)}>
            <option value="">{t('warrantyClaims.allStatuses')}</option>
            {STATUS_VALUES.map((value) => (
              <option key={value} value={value}>{t(`warrantyClaims.statuses.${value}`)}</option>
            ))}
          </Select>
          <Select className="input w-full sm:w-44" value={vm.productId} onChange={(event) => vm.setProductId(event.target.value)}>
            <option value="">{t('productSerials.allProducts')}</option>
            {productDirectory.map((product) => (
              <option key={product.id} value={product.id}>{product.name}</option>
            ))}
          </Select>
          <Select className="input w-full sm:w-44" value={vm.supplierId} onChange={(event) => vm.setSupplierId(event.target.value)}>
            <option value="">{t('warrantyClaims.allSuppliers')}</option>
            {supplierDirectory.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
            ))}
          </Select>
          <DateRangePickerField
            from={vm.dateFrom}
            to={vm.dateTo}
            onChange={(from, to) => { vm.setDateFrom(from); vm.setDateTo(to); }}
            placeholder={`${t('purchaseReceive.dateFrom')} - ${t('purchaseReceive.dateTo')}`}
            className="w-full min-w-[260px] sm:w-auto"
          />
          <div className="flex flex-wrap items-center gap-2 text-sm font-bold sm:ml-auto">
            <button
              type="button"
              className="btn-secondary no-print h-10 gap-1.5 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {t('purchaseReceive.downloadPdf')}
              {shortcutBadge(WARRANTY_CLAIMS_SHORTCUTS.pdf)}
            </button>
            <button type="button" className="btn-secondary no-print h-10 gap-1.5 px-3 text-xs" onClick={handleExportExcel}>
              <FileSpreadsheet size={14} />
              {t('common.exportExcel')}
              {shortcutBadge(WARRANTY_CLAIMS_SHORTCUTS.excel)}
            </button>
            <button type="button" className="btn-secondary no-print h-10 gap-1.5 px-3 text-xs" onClick={handlePrint}>
              <Printer size={14} />
              {t('common.print')}
              {shortcutBadge(WARRANTY_CLAIMS_SHORTCUTS.print)}
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
          {vm.items.map((claim) => (
            <MobileListCard
              key={claim.id}
              onClick={canManage ? () => setFormModal({ mode: 'edit', claim }) : undefined}
              title={claim.claimNumber}
              badge={<Badge tone={warrantyClaimStatusTone(claim.status)}>{t(`warrantyClaims.statuses.${claim.status}`)}</Badge>}
              subtitle={`${claim.productName || '-'} · ${claim.customerName || '-'}`}
              value={formatDateTime(claim.receivedDate)}
              valueSub={claim.serialNumber || claim.imei1 || claim.imei2 || null}
            />
          ))}
        </MobileCardList>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">{t('warrantyClaims.claimNumberLabel')}</th>
                <th className="px-4 py-3">{t('products.product')}</th>
                <th className="px-4 py-3">{t('warrantyClaims.serialLabel')}</th>
                <th className="px-4 py-3">{t('retailer.shared.customerLabel')}</th>
                <th className="px-4 py-3">{t('warrantyClaims.receivedDateLabel')}</th>
                <th className="px-4 py-3">{t('warrantyClaims.statusLabel')}</th>
                <th className="px-4 py-3 text-right no-print">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vm.items.map((claim) => (
                <tr key={claim.id} className="hover:bg-slate-50">
                  <td className="table-cell">
                    <CopyableText value={claim.claimNumber} copyLabel={t('warrantyClaims.claimNumberLabel')} displayValue={claim.claimNumber} textClassName="font-semibold text-slate-950" />
                    {claim.rmaNumber ? <div className="text-xs text-amber-700 font-medium"><CopyableText value={claim.rmaNumber} copyLabel={t('warrantyClaims.rmaNumberLabel')} displayValue={claim.rmaNumber} textClassName="font-medium text-amber-700" buttonClassName="h-5 w-5" /></div> : null}
                  </td>
                  <td className="table-cell">{claim.productName || '-'}</td>
                  <td className="table-cell"><CopyableText value={claim.serialNumber || claim.imei1 || claim.imei2} copyLabel={t('warrantyClaims.serialLabel')} displayValue={claim.serialNumber || claim.imei1 || claim.imei2} /></td>
                  <td className="table-cell">{claim.customerName || '-'}</td>
                  <td className="table-cell">{formatDateTime(claim.receivedDate)}</td>
                  <td className="table-cell">
                    <Badge tone={warrantyClaimStatusTone(claim.status)}>{t(`warrantyClaims.statuses.${claim.status}`)}</Badge>
                  </td>
                  <td className="table-cell no-print">
                    <div className="row-actions flex justify-end gap-2">
                      {claim.invoiceNumber ? (
                        <button type="button" className="icon-btn" title={claim.invoiceNumber} onClick={() => navigate(`/retailer/sales-invoices?invoiceNumber=${encodeURIComponent(claim.invoiceNumber)}`)}>
                          <Receipt size={16} />
                        </button>
                      ) : null}
                      {canManage ? (
                        <>
                          <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setFormModal({ mode: 'edit', claim })}>
                            <Pencil size={16} />
                          </button>
                          <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={async () => { const r = await deleteWarrantyClaim(claim); if (r.ok) vm.reload(); }}>
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
            <EmptyState title={t('warrantyClaims.noMatchTitle')} description={t('warrantyClaims.noMatchDescription')} icon={Wrench} />
          </div>
        ) : null}
        {!vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4 no-print">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {formModal ? (
        <WarrantyClaimFormModal
          claim={formModal.claim}
          onClose={() => setFormModal(null)}
          onSave={async (value) => {
            const result = await saveWarrantyClaim(value);
            if (result.ok) {
              setFormModal(null);
              vm.reload();
            }
            return result;
          }}
        />
      ) : null}
    </div>
  );
}

