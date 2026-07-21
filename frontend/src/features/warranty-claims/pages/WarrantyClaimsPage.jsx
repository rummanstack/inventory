import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Columns3, Download, FileSpreadsheet, GripVertical, Loader2, List, Pencil, Plus, Printer, Receipt, RotateCcw, Search, ShieldCheck, Trash2, Wrench } from 'lucide-react';
import { Alert, Badge, CopyableText, EmptyState, MobileCardList, MobileListCard, Pagination, SectionHeader, TableSkeleton, Select, cx } from '../../../components/ui.jsx';
import { DateRangePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { downloadSheetPdf } from '../../../services/printService.js';
import { formatDate, todayISO } from '../../../utils/calculations.js';
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

function WarrantyKanban({ items, loading, error, canManage, t, onEdit, onMove }) {
  if (loading) return <div className="p-5"><TableSkeleton columns={4} showHeader={false} /></div>;
  if (error) return <div className="p-5"><Alert type="error">{error}</Alert></div>;

  return (
    <div className="overflow-x-auto bg-slate-50/60 p-4">
      <div className="flex min-w-max items-start gap-4">
        {STATUS_VALUES.map((status) => {
          const claims = items.filter((claim) => claim.status === status);
          return (
            <section
              key={status}
              className="w-[300px] shrink-0 rounded-card border border-slate-200 bg-slate-100/80 p-3"
              onDragOver={(event) => { if (canManage) event.preventDefault(); }}
              onDrop={(event) => {
                if (!canManage) return;
                event.preventDefault();
                const claimId = event.dataTransfer.getData('text/warranty-claim');
                if (claimId) onMove(claimId, status);
              }}
            >
              <div className="mb-3 flex items-center justify-between gap-2 px-1">
                <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-700">{t(`warrantyClaims.statuses.${status}`)}</h3>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-slate-500 ring-1 ring-slate-200">{claims.length}</span>
              </div>
              <div className="space-y-2.5">
                {claims.map((claim) => (
                  <article
                    key={claim.id}
                    draggable={canManage}
                    onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/warranty-claim', String(claim.id)); }}
                    className={cx('rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition', canManage && 'cursor-grab hover:border-indigo-200 hover:shadow-card active:cursor-grabbing')}
                  >
                    <button type="button" className="w-full text-left disabled:cursor-default" disabled={!canManage} onClick={() => onEdit(claim)}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-black text-slate-950">{claim.claimNumber}</p>
                        {canManage ? <GripVertical size={15} className="mt-0.5 shrink-0 text-slate-400" /> : null}
                      </div>
                      <p className="mt-2 truncate text-sm font-bold text-slate-700">{claim.productName || '-'}</p>
                      <p className="mt-1 truncate text-xs font-medium text-slate-500">{claim.customerName || '-'} · {formatDate(claim.receivedDate)}</p>
                      {claim.problemNote ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{claim.problemNote}</p> : null}
                    </button>
                    {canManage ? (
                      <select className="input mt-3 h-9 py-1 text-xs font-bold" value={claim.status} onChange={(event) => onMove(String(claim.id), event.target.value)}>
                        {STATUS_VALUES.map((value) => <option key={value} value={value}>{t(`warrantyClaims.statuses.${value}`)}</option>)}
                      </select>
                    ) : null}
                  </article>
                ))}
                {!claims.length ? <div className="rounded-xl border border-dashed border-slate-300 px-3 py-8 text-center text-xs font-bold text-slate-400">{t('warrantyClaims.dropHere')}</div> : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default function WarrantyClaimsPage() {
  const { saveWarrantyClaim, deleteWarrantyClaim, t, can, productDirectory, supplierDirectory } = useInventoryApp();
  const navigate = useNavigate();
  const vm = useWarrantyClaimsViewModel();
  const [formModal, setFormModal] = useState(null);
  const [view, setView] = useState('table');
  const [boardItems, setBoardItems] = useState([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardError, setBoardError] = useState('');
  const canManage = can('manage_warranty_claims');
  const [downloadingPdf, downloadPdf] = useAsyncAction();
  const [exportingExcel, exportExcel] = useAsyncAction();
  const hasFilters = Boolean(vm.search || vm.status || vm.productId || vm.supplierId || vm.dateFrom || vm.dateTo);

  useEffect(() => {
    if (view !== 'board') return undefined;
    let active = true;
    setBoardLoading(true);
    setBoardError('');
    inventoryApi.listWarrantyClaims({
      page: 1,
      pageSize: 10000,
      search: vm.search || undefined,
      supplierId: vm.supplierId || undefined,
      productId: vm.productId || undefined,
      dateFrom: vm.dateFrom || undefined,
      dateTo: vm.dateTo || undefined,
    }).then((result) => {
      if (active) setBoardItems(result.items || []);
    }).catch((requestError) => {
      if (active) setBoardError(requestError.message || t('warrantyClaims.boardLoadFailed'));
    }).finally(() => {
      if (active) setBoardLoading(false);
    });
    return () => { active = false; };
  }, [view, vm.search, vm.supplierId, vm.productId, vm.dateFrom, vm.dateTo, t]);

  async function moveClaimToStatus(claimId, status) {
    const claim = boardItems.find((item) => String(item.id) === String(claimId));
    if (!claim || claim.status === status) return;
    const previousStatus = claim.status;
    setBoardItems((items) => items.map((item) => String(item.id) === String(claimId) ? { ...item, status } : item));
    const result = await saveWarrantyClaim({ ...claim, status });
    if (!result.ok) {
      setBoardItems((items) => items.map((item) => String(item.id) === String(claimId) ? { ...item, status: previousStatus } : item));
      return;
    }
    vm.reload();
  }

  async function handleExportExcel() {
    await exportExcel(async () => {
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
    });
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
      } else if (matchesShortcut(event, WARRANTY_CLAIMS_SHORTCUTS.excel) && !exportingExcel) {
        event.preventDefault();
        handleExportExcel();
      } else if (matchesShortcut(event, WARRANTY_CLAIMS_SHORTCUTS.print)) {
        event.preventDefault();
        handlePrint();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [downloadingPdf, exportingExcel, canManage, formModal, vm.search, vm.status, vm.productId, vm.supplierId, vm.dateFrom, vm.dateTo, t]);

  return (
    <div>
      <SectionHeader
        title={t('warrantyClaims.title')}
        compact
        action={(
          <>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button type="button" className={view === 'table' ? 'inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-black text-indigo-800 shadow-sm' : 'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold text-slate-500'} onClick={() => setView('table')}><List size={15} />{t('warrantyClaims.tableView')}</button>
              <button type="button" className={view === 'board' ? 'inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-black text-indigo-800 shadow-sm' : 'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold text-slate-500'} onClick={() => { vm.setStatus(''); setView('board'); }}><Columns3 size={15} />{t('warrantyClaims.boardView')}</button>
            </div>
            {canManage ? (
              <button type="button" className="btn-primary" onClick={() => setFormModal({ mode: 'add' })}>
                <Plus size={18} />
                {t('warrantyClaims.add')}
                <kbd className="ml-1 rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200">Alt+A</kbd>
              </button>
            ) : null}
          </>
        )}
      />

      {view === 'table' ? (
      <section className="surface no-print mb-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-700"><ShieldCheck size={20} /></span>
            <div>
              <h2 className="section-title">{t('warrantyClaims.workflowTitle')}</h2>
            </div>
          </div>
          <span className="muted-chip">{vm.total} {t('warrantyClaims.claimCount')}</span>
        </div>
        <div className="flex gap-2 overflow-x-auto p-3">
          <button
            type="button"
            className={vm.status ? 'min-h-10 shrink-0 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700' : 'min-h-10 shrink-0 rounded-full border border-indigo-300 bg-indigo-50 px-4 text-sm font-black text-indigo-800 ring-2 ring-indigo-100'}
            onClick={() => vm.setStatus('')}
          >
            {t('warrantyClaims.allStatuses')}
          </button>
          {STATUS_VALUES.map((status) => {
            const selected = vm.status === status;
            return (
              <button
                key={status}
                type="button"
                className={selected ? 'min-h-10 shrink-0 rounded-full border border-indigo-300 bg-indigo-50 px-4 text-sm font-black text-indigo-800 ring-2 ring-indigo-100' : 'min-h-10 shrink-0 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700'}
                onClick={() => vm.setStatus(status)}
              >
                {t(`warrantyClaims.statuses.${status}`)}
              </button>
            );
          })}
        </div>
      </section>
      ) : null}

      <div id={WARRANTY_CLAIMS_PRINT_ID} className="surface overflow-hidden print-target">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="section-title">{t(view === 'board' ? 'warrantyClaims.boardTitle' : 'warrantyClaims.registerTitle')}</h2>
          </div>
          <span className="muted-chip">{vm.total} {t('common.records')}</span>
        </div>
        <div className="no-print flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 p-4 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full flex-1 sm:min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input className="input pl-10" value={vm.search} onChange={(event) => vm.setSearch(event.target.value)} placeholder={t('warrantyClaims.searchPlaceholder')} />
          </div>
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
            max={todayISO()}
            onChange={(from, to) => { vm.setDateFrom(from); vm.setDateTo(to); }}
            placeholder={`${t('purchaseReceive.dateFrom')} - ${t('purchaseReceive.dateTo')}`}
            className="w-full min-w-[260px] sm:w-auto"
          />
          <button
            type="button"
            className="btn-secondary h-10 gap-1.5 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!hasFilters}
            onClick={vm.resetFilters}
          >
            <RotateCcw size={14} />
            {t('warrantyClaims.resetFilters')}
          </button>
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
        {view === 'board' ? (
          <WarrantyKanban
            items={boardItems}
            loading={boardLoading}
            error={boardError}
            canManage={canManage}
            t={t}
            onEdit={(claim) => setFormModal({ mode: 'edit', claim })}
            onMove={moveClaimToStatus}
          />
        ) : vm.loading ? (
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
              subtitle={(claim.productName || '-') + ' · ' + (claim.customerName || '-')}
              value={formatDate(claim.receivedDate)}
              valueSub={claim.serialNumber || claim.imei1 || claim.imei2 || null}
              action={(
                <>
                  {claim.invoiceNumber ? (
                    <button type="button" className="icon-btn" title={claim.invoiceNumber} onClick={() => navigate(`/retailer/sales-invoices?invoiceNumber=${encodeURIComponent(claim.invoiceNumber)}`)}><Receipt size={16} /></button>
                  ) : null}
                  {canManage ? (
                    <>
                      <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setFormModal({ mode: 'edit', claim })}><Pencil size={16} /></button>
                      <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={async () => { const result = await deleteWarrantyClaim(claim); if (result.ok) vm.reload(); }}><Trash2 size={16} /></button>
                    </>
                  ) : null}
                </>
              )}
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
                    {claim.problemNote ? <p className="mt-1 max-w-52 truncate text-xs font-medium text-slate-500">{claim.problemNote}</p> : null}
                    {claim.rmaNumber ? <div className="text-xs text-amber-700 font-medium"><CopyableText value={claim.rmaNumber} copyLabel={t('warrantyClaims.rmaNumberLabel')} displayValue={claim.rmaNumber} textClassName="font-medium text-amber-700" buttonClassName="h-5 w-5" /></div> : null}
                  </td>
                  <td className="table-cell">{claim.productName || '-'}</td>
                  <td className="table-cell"><CopyableText value={claim.serialNumber || claim.imei1 || claim.imei2} copyLabel={t('warrantyClaims.serialLabel')} displayValue={claim.serialNumber || claim.imei1 || claim.imei2} /></td>
                  <td className="table-cell">{claim.customerName || '-'}</td>
                  <td className="table-cell">{formatDate(claim.receivedDate)}</td>
                  <td className="table-cell">
                    <Badge tone={warrantyClaimStatusTone(claim.status)}>{t(`warrantyClaims.statuses.${claim.status}`)}</Badge>
                    {claim.supplierName ? <p className="mt-1 text-xs font-medium text-slate-500">{claim.supplierName}</p> : null}
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
        {view === 'table' && !vm.loading && !vm.error && !vm.items.length ? (
          <div className="p-5">
            <EmptyState title={t('warrantyClaims.noMatchTitle')} description={t('warrantyClaims.noMatchDescription')} icon={Wrench} />
          </div>
        ) : null}
        {view === 'table' && !vm.loading && !vm.error && vm.items.length ? (
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

