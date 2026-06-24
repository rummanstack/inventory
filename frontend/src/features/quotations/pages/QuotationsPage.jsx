import { useState } from 'react';
import { Eye, FileSpreadsheet, Pencil, Plus, Printer, Search, Trash2 } from 'lucide-react';
import { Badge, EmptyState, Pagination, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { downloadSheetPdf } from '../../../services/printService.js';
import { quotationStatusTone } from '../../../models/inventoryViewData.js';
import QuotationFormModal from '../components/QuotationFormModal';
import QuotationViewModal from '../components/QuotationViewModal';
import { useQuotationsViewModel } from '../viewmodels/useQuotationsViewModel';
import { formatCurrency, formatDateHuman } from '../../../utils/calculations.js';

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

  async function handleExportPdf() {
    const result = await inventoryApi.listQuotations({
      page: 1,
      pageSize: 10000,
      search: vm.search || undefined,
      status: vm.status || undefined,
      dateFrom: vm.dateFrom || undefined,
      dateTo: vm.dateTo || undefined,
    });
    const all = result.items || [];
    const header = [
      t('quotations.quoteNumberLabel'),
      t('quotations.customerLabel'),
      t('quotations.quoteDateLabel'),
      t('quotations.statusLabel'),
      t('quotations.totalLabel'),
    ];
    const rows = all.map((q) => [
      q.quoteNumber,
      q.customerName || '—',
      String(q.quoteDate || '').slice(0, 10),
      q.status,
      formatCurrency(q.totalAmount, language),
    ]);
    await downloadSheetPdf({
      title: t('quotations.title'),
      header,
      rows,
      filename: `${t('quotations.sheetName')}.pdf`,
    });
  }

  function handlePrint() {
    const el = document.getElementById(QUOTATIONS_PRINT_ID);
    if (!el) return;
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>${t('quotations.title')}</title></head><body>${el.outerHTML}</body></html>`);
    w.document.close();
    w.print();
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
    <div className="space-y-6">
      <SectionHeader
        eyebrow={t('quotations.eyebrow')}
        title={t('quotations.title')}
        description={t('quotations.description')}
        actions={
          canManage
            ? (
              <button className="btn btn-primary" onClick={() => setFormModal({ isNew: true })}>
                <Plus className="h-4 w-4" />
                {t('quotations.add')}
              </button>
            )
            : null
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder={t('quotations.searchPlaceholder')}
            value={vm.search}
            onChange={(e) => vm.setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-auto min-w-[140px]"
          value={vm.status}
          onChange={(e) => vm.setStatus(e.target.value)}
        >
          <option value="">{t('quotations.allStatuses')}</option>
          {QUOTATION_STATUS_VALUES.map((s) => (
            <option key={s} value={s}>{t(`quotations.statuses.${s}`)}</option>
          ))}
        </select>
        <DatePickerField label={t('common.dateFrom')} value={vm.dateFrom} onChange={vm.setDateFrom} />
        <DatePickerField label={t('common.dateTo')} value={vm.dateTo} onChange={vm.setDateTo} />
      </div>

      {/* Export row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {vm.total ?? 0} {t('quotations.quoteCount')}
        </p>
        <div className="flex gap-2">
          <button className="btn btn-ghost text-sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </button>
          <button className="btn btn-ghost text-sm" onClick={handleExportPdf}>
            <FileSpreadsheet className="h-4 w-4" /> PDF
          </button>
          <button className="btn btn-ghost text-sm" onClick={handlePrint}>
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>
      </div>

      {/* Table */}
      <div id={QUOTATIONS_PRINT_ID}>
        {vm.loading ? (
          <TableSkeleton columns={7} rows={8} />
        ) : items.length === 0 ? (
          <EmptyState
            title={t('quotations.noMatchTitle')}
            description={t('quotations.noMatchDescription')}
          />
        ) : (
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">{t('quotations.quoteNumberLabel')}</th>
                  <th className="px-4 py-3">{t('quotations.customerLabel')}</th>
                  <th className="px-4 py-3">{t('quotations.quoteDateLabel')}</th>
                  <th className="px-4 py-3">{t('quotations.validUntilLabel')}</th>
                  <th className="px-4 py-3">{t('quotations.statusLabel')}</th>
                  <th className="px-4 py-3 text-right">{t('quotations.totalLabel')}</th>
                  <th className="px-4 py-3 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((quotation) => (
                  <tr key={quotation.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors text-left"
                        onClick={() => openViewForId(quotation.id)}
                      >
                        {quotation.quoteNumber}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{quotation.customerName || '—'}</p>
                      {quotation.customerPhone && (
                        <p className="text-xs text-slate-400">{quotation.customerPhone}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDateHuman(quotation.quoteDate, language)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDateHuman(quotation.validUntil, language)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={quotationStatusTone(quotation.status)}>
                        {t(`quotations.statuses.${quotation.status}`)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatCurrency(quotation.totalAmount, language)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="icon-btn text-slate-400 hover:text-indigo-600"
                          title={t('quotations.viewTitle')}
                          onClick={() => openViewForId(quotation.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canManage && quotation.status !== 'CONVERTED' && (
                          <button
                            className="icon-btn text-slate-400 hover:text-indigo-600"
                            title={t('quotations.editTitle')}
                            onClick={() => setFormModal(quotation)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canManage && (
                          <button
                            className="icon-btn text-slate-400 hover:text-rose-500"
                            title={t('common.delete')}
                            onClick={() => handleDelete(quotation)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        page={vm.page}
        totalPages={vm.totalPages}
        onPageChange={vm.setPage}
      />

      {formModal && (
        <QuotationFormModal
          quotation={formModal?.isNew ? null : formModal}
          onClose={() => setFormModal(null)}
          onSave={handleSave}
        />
      )}

      {viewModal && (
        <QuotationViewModal
          quotation={viewModal}
          onClose={() => setViewModal(null)}
          onConverted={() => { vm.reload?.(); }}
        />
      )}
    </div>
  );
}
