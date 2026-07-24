import { useEffect, useState } from 'react';
import { Download, Eye, FileSpreadsheet, Loader2, Pencil, Plus, Printer, Search, Tag, Trash2 } from 'lucide-react';
import { Alert, Badge, EmptyState, MobileCardList, MobileListCard, Pagination, SectionHeader, TableSkeleton, Select } from '../../../components/ui.jsx';
import { DateRangePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { downloadSheetPdf } from '../../../services/printService.js';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';
import { quotationStatusTone } from '../../../models/inventoryViewData.js';
import QuotationFormModal from '../components/QuotationFormModal';
import QuotationViewModal from '../components/QuotationViewModal';
import { useQuotationsViewModel } from '../viewmodels/useQuotationsViewModel';
import { formatCurrency, formatDateHuman } from '../../../utils/calculations.js';
import { useQueryClient } from '@tanstack/react-query';
import { getActiveTenantId } from '../../../services/api/client.js';
import { transactionKeys } from '../../transactions/queries/transactionQueries.js';

const QUOTATION_STATUS_VALUES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED'];
const QUOTATIONS_PRINT_ID = 'quotations-print';
const QUOTATIONS_SHORTCUTS = {
  add: { alt: true, key: 'a', label: 'Alt+A' },
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

export default function QuotationsPage() {
  const queryClient = useQueryClient();
  const { saveQuotation, deleteQuotation, t, can, language } = useInventoryApp();
  const vm = useQuotationsViewModel();
  const [formModal, setFormModal] = useState(null);
  const [viewModal, setViewModal] = useState(null);
  const canManage = can('manage_quotations');
  const [downloadingPdf, downloadPdf] = useAsyncAction();

  async function handleExportExcel() {
    const result = await inventoryApi.listQuotations({
      page: 1,
      pageSize: 10000,
      search: vm.search || undefined,
      status: vm.status || undefined,
      dateFrom: vm.dateFrom || undefined,
      dateTo: vm.dateTo || undefined,
    });
    const all = result.items || [];
    const { utils, writeFile } = await import('xlsx');
    const header = [
      t('quotations.quoteNumberLabel'),
      t('quotations.customerLabel'),
      t('quotations.customerPhoneLabel'),
      t('quotations.quoteDateLabel'),
      t('quotations.validUntilLabel'),
      t('quotations.statusLabel'),
      t('quotations.subtotalLabel'),
      t('quotations.discountLabel'),
      t('quotations.taxAmountLabel'),
      t('quotations.totalLabel'),
    ];
    const rows = all.map((q) => [
      q.quoteNumber,
      q.customerName || '—',
      q.customerPhone || '—',
      String(q.quoteDate || '').slice(0, 10),
      String(q.validUntil || '').slice(0, 10),
      q.status,
      q.subtotal,
      q.discountAmount,
      q.taxAmount,
      q.totalAmount,
    ]);
    const wb = utils.book_new();
    const ws = utils.aoa_to_sheet([header, ...rows]);
    utils.book_append_sheet(wb, ws, t('quotations.sheetName'));
    writeFile(wb, `${t('quotations.sheetName')}.xlsx`);
  }

  async function handleSave(payload) {
    const result = await saveQuotation(payload);
    if (result.ok) {
      vm.reload?.();
      setFormModal(null);
    }
    return result;
  }

  async function handleDelete(quotation) {
    const result = await deleteQuotation(quotation);
    if (result.ok) {
      vm.reload?.();
    }
  }

  async function openViewForId(id) {
    try {
      const tenantId = getActiveTenantId() || 'session-tenant';
      const detail = await queryClient.fetchQuery({
        queryKey: transactionKeys.detail(tenantId, 'quotation', id),
        queryFn: () => inventoryApi.getQuotation(id),
        staleTime: 30_000,
      });
      setViewModal(detail);
    } catch {
      // ignore
    }
  }

  async function handleDownloadPdf() {
    await downloadPdf(async () => {
      await inventoryApi.recordPrint({ entityType: 'quotations', entityId: null, label: 'pdf' }).catch(() => {});
      await downloadSheetPdf(QUOTATIONS_PRINT_ID, `${t('quotations.sheetName')}.pdf`);
    });
  }

  function handlePrint() {
    inventoryApi.recordPrint({ entityType: 'quotations', entityId: null, label: 'print' }).catch(() => {});
    window.print();
  }

  function shortcutBadge(shortcut) {
    return <kbd className="ml-1 hidden rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500 2xl:inline-flex">{shortcut.label}</kbd>;
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
      if (matchesShortcut(event, QUOTATIONS_SHORTCUTS.add) && canManage && !formModal && !viewModal) {
        event.preventDefault();
        setFormModal({ isNew: true });
      } else if (matchesShortcut(event, QUOTATIONS_SHORTCUTS.pdf) && !downloadingPdf) {
        event.preventDefault();
        handleDownloadPdf();
      } else if (matchesShortcut(event, QUOTATIONS_SHORTCUTS.excel)) {
        event.preventDefault();
        handleExportExcel();
      } else if (matchesShortcut(event, QUOTATIONS_SHORTCUTS.print)) {
        event.preventDefault();
        handlePrint();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [downloadingPdf, canManage, formModal, viewModal, vm.search, vm.status, vm.dateFrom, vm.dateTo, t]);

  const items = vm.items || [];

  return (
    <div>
      <SectionHeader
        title={t('quotations.title')}
        compact
        action={canManage ? (
          <button type="button" className="btn-primary" onClick={() => setFormModal({ isNew: true })}>
            <Plus size={18} />
            {t('quotations.add')}
            <kbd className="ml-1 hidden rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200 sm:inline-flex">Alt+A</kbd>
          </button>
        ) : null}
      />

      <div id={QUOTATIONS_PRINT_ID} className="surface overflow-hidden print-target">
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 xl:grid-cols-12">
          <div className="relative w-full sm:col-span-2 xl:col-span-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="input pl-10"
              placeholder={t('quotations.searchPlaceholder')}
              value={vm.search}
              onChange={(e) => vm.setSearch(e.target.value)}
            />
          </div>
          <div className="xl:col-span-2">
            <Select className="input w-full" value={vm.status} onChange={(e) => vm.setStatus(e.target.value)}>
              <option value="">{t('quotations.allStatuses')}</option>
              {QUOTATION_STATUS_VALUES.map((s) => (
                <option key={s} value={s}>{t(`quotations.statuses.${s}`)}</option>
              ))}
            </Select>
          </div>
          <DateRangePickerField
            from={vm.dateFrom}
            to={vm.dateTo}
            onChange={(from, to) => { vm.setDateFrom(from); vm.setDateTo(to); }}
            placeholder={`${t('purchaseReceive.dateFrom')} - ${t('purchaseReceive.dateTo')}`}
            className="w-full sm:col-span-2 xl:col-span-2"
          />
          <div className="grid grid-cols-1 gap-2 sm:col-span-2 sm:w-fit sm:grid-cols-3 sm:justify-self-end xl:col-span-12">
            <button
              type="button"
              className="btn-secondary no-print h-10 w-full justify-center gap-1.5 px-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {t('purchaseReceive.downloadPdf')}
              {shortcutBadge(QUOTATIONS_SHORTCUTS.pdf)}
            </button>
            <button type="button" className="btn-secondary no-print h-10 w-full justify-center gap-1.5 px-2 text-xs" onClick={handleExportExcel}>
              <FileSpreadsheet size={14} />
              {t('common.exportExcel')}
              {shortcutBadge(QUOTATIONS_SHORTCUTS.excel)}
            </button>
            <button type="button" className="btn-secondary no-print h-10 w-full justify-center gap-1.5 px-2 text-xs" onClick={handlePrint}>
              <Printer size={14} />
              {t('common.print')}
              {shortcutBadge(QUOTATIONS_SHORTCUTS.print)}
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
            {items.map((quotation) => (
              <MobileListCard
                key={quotation.id}
                onClick={() => openViewForId(quotation.id)}
                title={quotation.quoteNumber}
                badge={<Badge tone={quotationStatusTone(quotation.status)}>{t(`quotations.statuses.${quotation.status}`)}</Badge>}
                subtitle={`${quotation.customerName || '-'} - ${formatDateHuman(quotation.quoteDate, language)}`}
                value={formatCurrency(quotation.totalAmount, language)}
                action={(
                  <>
                    {canManage && quotation.status !== 'CONVERTED' ? (
                      <button type="button" className="icon-btn" title={t('quotations.editTitle')} onClick={() => setFormModal(quotation)}>
                        <Pencil size={16} />
                      </button>
                    ) : null}
                    {canManage ? (
                      <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={() => handleDelete(quotation)}>
                        <Trash2 size={16} />
                      </button>
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
                  <th className="px-4 py-3">{t('quotations.quoteNumberLabel')}</th>
                  <th className="px-4 py-3">{t('quotations.customerLabel')}</th>
                  <th className="px-4 py-3">{t('quotations.quoteDateLabel')}</th>
                  <th className="px-4 py-3">{t('quotations.validUntilLabel')}</th>
                  <th className="px-4 py-3">{t('quotations.statusLabel')}</th>
                  <th className="px-4 py-3 text-right">{t('quotations.totalLabel')}</th>
                  <th className="px-4 py-3 text-right no-print">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((quotation) => (
                  <tr key={quotation.id} className="hover:bg-slate-50">
                    <td className="table-cell">
                      <button
                        type="button"
                        className="font-semibold text-slate-950 hover:text-[var(--secondary-strong)] transition-colors text-left"
                        onClick={() => openViewForId(quotation.id)}
                      >
                        {quotation.quoteNumber}
                      </button>
                    </td>
                    <td className="table-cell">
                      <p className="font-medium text-slate-900">{quotation.customerName || '—'}</p>
                      {quotation.customerPhone ? (
                        <p className="text-xs text-slate-400">{quotation.customerPhone}</p>
                      ) : null}
                    </td>
                    <td className="table-cell text-slate-600">{formatDateHuman(quotation.quoteDate, language)}</td>
                    <td className="table-cell text-slate-600">{formatDateHuman(quotation.validUntil, language)}</td>
                    <td className="table-cell">
                      <Badge tone={quotationStatusTone(quotation.status)}>
                        {t(`quotations.statuses.${quotation.status}`)}
                      </Badge>
                    </td>
                    <td className="table-cell text-right font-bold text-slate-950">
                      {formatCurrency(quotation.totalAmount, language)}
                    </td>
                    <td className="table-cell no-print">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          className="icon-btn"
                          title={t('quotations.viewTitle')}
                          onClick={() => openViewForId(quotation.id)}
                        >
                          <Eye size={16} />
                        </button>
                        {canManage && quotation.status !== 'CONVERTED' ? (
                          <button
                            type="button"
                            className="icon-btn"
                            title={t('quotations.editTitle')}
                            onClick={() => setFormModal(quotation)}
                          >
                            <Pencil size={16} />
                          </button>
                        ) : null}
                        {canManage ? (
                          <button
                            type="button"
                            className="icon-btn text-rose-600 hover:text-rose-700"
                            title={t('common.delete')}
                            onClick={() => handleDelete(quotation)}
                          >
                            <Trash2 size={16} />
                          </button>
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

        {!vm.loading && !vm.error && items.length === 0 ? (
          <div className="p-5">
            <EmptyState title={t('quotations.noMatchTitle')} description={t('quotations.noMatchDescription')} icon={Tag} />
          </div>
        ) : null}

        {!vm.loading && !vm.error && items.length > 0 ? (
          <div className="border-t border-slate-100 px-5 py-4 no-print">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {formModal ? (
        <QuotationFormModal
          quotation={formModal?.isNew ? null : formModal}
          onClose={() => setFormModal(null)}
          onSave={handleSave}
        />
      ) : null}

      {viewModal ? (
        <QuotationViewModal
          quotation={viewModal}
          onClose={() => setViewModal(null)}
          onConverted={() => { vm.reload?.(); }}
        />
      ) : null}
    </div>
  );
}

