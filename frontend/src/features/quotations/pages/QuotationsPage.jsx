import { useState } from 'react';
import { Download, Eye, FileSpreadsheet, Pencil, Plus, Printer, Search, Tag, Trash2 } from 'lucide-react';
import { Alert, Badge, EmptyState, Pagination, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { downloadSheetPdf } from '../../../services/printService.js';
import { quotationStatusTone } from '../../../models/inventoryViewData.js';
import QuotationFormModal from '../components/QuotationFormModal';
import QuotationViewModal from '../components/QuotationViewModal';
import { useQuotationsViewModel } from '../viewmodels/useQuotationsViewModel';
import { formatCurrency, formatNumber, formatDateHuman } from '../../../utils/calculations.js';

const QUOTATION_STATUS_VALUES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED'];
const QUOTATIONS_PRINT_ID = 'quotations-print';

export default function QuotationsPage() {
  const { saveQuotation, deleteQuotation, t, can, language } = useInventoryApp();
  const vm = useQuotationsViewModel();
  const [formModal, setFormModal] = useState(null);
  const [viewModal, setViewModal] = useState(null);
  const canManage = can('manage_quotations');

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
      const detail = await inventoryApi.getQuotation(id);
      setViewModal(detail);
    } catch {
      // ignore
    }
  }

  const items = vm.items || [];

  return (
    <div>
      <SectionHeader
        eyebrow={t('quotations.eyebrow')}
        title={t('quotations.title')}
        description={t('quotations.description')}
        action={canManage ? (
          <button type="button" className="btn-primary" onClick={() => setFormModal({ isNew: true })}>
            <Plus size={18} />
            {t('quotations.add')}
          </button>
        ) : null}
      />

      <div id={QUOTATIONS_PRINT_ID} className="surface overflow-hidden print-target">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{t('quotations.eyebrow')}</p>
              <p className="text-sm font-medium text-slate-500">{t('quotations.description')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
              <span className="muted-chip">{formatNumber(vm.total ?? 0)} {t('quotations.quoteCount')}</span>
              <button
                type="button"
                className="btn-secondary no-print py-1.5 text-xs"
                onClick={() => { inventoryApi.recordPrint({ entityType: 'quotations', entityId: null, label: 'pdf' }).catch(() => {}); downloadSheetPdf(QUOTATIONS_PRINT_ID, `${t('quotations.sheetName')}.pdf`); }}
              >
                <Download size={14} />
                {t('purchaseReceive.downloadPdf')}
              </button>
              <button type="button" className="btn-secondary no-print py-1.5 text-xs" onClick={handleExportExcel}>
                <FileSpreadsheet size={14} />
                {t('common.exportExcel')}
              </button>
              <button
                type="button"
                className="btn-secondary no-print py-1.5 text-xs"
                onClick={() => { inventoryApi.recordPrint({ entityType: 'quotations', entityId: null, label: 'print' }).catch(() => {}); window.print(); }}
              >
                <Printer size={14} />
                {t('common.print')}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="input pl-10"
                placeholder={t('quotations.searchPlaceholder')}
                value={vm.search}
                onChange={(e) => vm.setSearch(e.target.value)}
              />
            </div>
            <select
              className="input"
              value={vm.status}
              onChange={(e) => vm.setStatus(e.target.value)}
            >
              <option value="">{t('quotations.allStatuses')}</option>
              {QUOTATION_STATUS_VALUES.map((s) => (
                <option key={s} value={s}>{t(`quotations.statuses.${s}`)}</option>
              ))}
            </select>
            <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} placeholder={t('purchaseReceive.dateFrom')} />
            <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} placeholder={t('purchaseReceive.dateTo')} min={vm.dateFrom} />
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
                  <th className="px-4 py-3">{t('quotations.quoteNumberLabel')}</th>
                  <th className="px-4 py-3">{t('quotations.customerLabel')}</th>
                  <th className="hidden px-4 py-3 sm:table-cell">{t('quotations.quoteDateLabel')}</th>
                  <th className="hidden px-4 py-3 md:table-cell">{t('quotations.validUntilLabel')}</th>
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
                    <td className="hidden table-cell text-slate-600 sm:table-cell">{formatDateHuman(quotation.quoteDate, language)}</td>
                    <td className="hidden table-cell text-slate-600 md:table-cell">{formatDateHuman(quotation.validUntil, language)}</td>
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
        )}

        {!vm.loading && !vm.error && items.length === 0 ? (
          <div className="p-5">
            <EmptyState title={t('quotations.noMatchTitle')} description={t('quotations.noMatchDescription')} icon={Tag} />
          </div>
        ) : null}

        {!vm.loading && !vm.error && items.length > 0 ? (
          <div className="border-t border-slate-100 px-5 py-4">
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
