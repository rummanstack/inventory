import { useState } from 'react';
import { Eye, FileSpreadsheet, Plus, Printer, Search, Trash2 } from 'lucide-react';
import { EmptyState, Pagination, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { downloadSheetPdf } from '../../../services/printService.js';
import TradeInFormModal from '../components/TradeInFormModal';
import TradeInViewModal from '../components/TradeInViewModal';
import { useTradeInsViewModel } from '../viewmodels/useTradeInsViewModel';

const TRADEIN_PRINT_ID = 'trade-ins-print';

export default function TradeInsPage() {
  const { saveTradeIn, deleteTradeIn, t, can } = useInventoryApp();
  const vm = useTradeInsViewModel();
  const [showForm, setShowForm] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const canManage = can('manage_trade_ins');

  async function handleExportExcel() {
    const result = await inventoryApi.listTradeIns({
      page: 1,
      pageSize: 10000,
      search: vm.search || undefined,
      dateFrom: vm.dateFrom || undefined,
      dateTo: vm.dateTo || undefined,
    });
    const all = result.items || [];
    const { utils, writeFile } = await import('xlsx');
    const header = [
      t('tradeIns.tradeInNumberLabel'),
      t('tradeIns.customerLabel'),
      t('tradeIns.customerPhoneLabel'),
      t('tradeIns.tradeInDateLabel'),
      t('tradeIns.totalTradeInValueLabel'),
      t('tradeIns.totalSaleAmountLabel'),
      t('tradeIns.paymentAmountLabel'),
      t('tradeIns.paymentMethodLabel'),
    ];
    const rows = all.map((tr) => [
      tr.tradeInNumber,
      tr.customerName || '—',
      tr.customerPhone || '—',
      String(tr.tradeInDate || '').slice(0, 10),
      tr.totalTradeInValue,
      tr.totalSaleAmount,
      tr.paymentAmount,
      tr.paymentMethod,
    ]);
    const wb = utils.book_new();
    const ws = utils.aoa_to_sheet([header, ...rows]);
    utils.book_append_sheet(wb, ws, t('tradeIns.sheetName'));
    writeFile(wb, `${t('tradeIns.sheetName')}.xlsx`);
  }

  async function handleExportPdf() {
    const result = await inventoryApi.listTradeIns({
      page: 1,
      pageSize: 10000,
      search: vm.search || undefined,
      dateFrom: vm.dateFrom || undefined,
      dateTo: vm.dateTo || undefined,
    });
    const all = result.items || [];
    await downloadSheetPdf({
      title: t('tradeIns.title'),
      header: [
        t('tradeIns.tradeInNumberLabel'),
        t('tradeIns.customerLabel'),
        t('tradeIns.tradeInDateLabel'),
        t('tradeIns.totalTradeInValueLabel'),
        t('tradeIns.totalSaleAmountLabel'),
        t('tradeIns.paymentAmountLabel'),
      ],
      rows: all.map((tr) => [
        tr.tradeInNumber,
        tr.customerName || '—',
        String(tr.tradeInDate || '').slice(0, 10),
        Number(tr.totalTradeInValue).toLocaleString(),
        Number(tr.totalSaleAmount).toLocaleString(),
        Number(tr.paymentAmount).toLocaleString(),
      ]),
      filename: `${t('tradeIns.sheetName')}.pdf`,
    });
  }

  function handlePrint() {
    const el = document.getElementById(TRADEIN_PRINT_ID);
    if (!el) return;
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>${t('tradeIns.title')}</title></head><body>${el.outerHTML}</body></html>`);
    w.document.close();
    w.print();
  }

  async function handleSave(payload) {
    const result = await saveTradeIn(payload);
    if (result.ok) {
      vm.reload?.();
      setShowForm(false);
    }
    return result;
  }

  async function handleDelete(tradeIn) {
    const result = await deleteTradeIn(tradeIn);
    if (result.ok) vm.reload?.();
  }

  async function openView(id) {
    try {
      const detail = await inventoryApi.getTradeIn(id);
      setViewModal(detail);
    } catch {
      // ignore
    }
  }

  const items = vm.items || [];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={t('tradeIns.eyebrow')}
        title={t('tradeIns.title')}
        description={t('tradeIns.description')}
        actions={
          canManage
            ? (
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" />
                {t('tradeIns.add')}
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
            placeholder={t('tradeIns.searchPlaceholder')}
            value={vm.search}
            onChange={(e) => vm.setSearch(e.target.value)}
          />
        </div>
        <DatePickerField label={t('common.dateFrom')} value={vm.dateFrom} onChange={vm.setDateFrom} />
        <DatePickerField label={t('common.dateTo')} value={vm.dateTo} onChange={vm.setDateTo} />
      </div>

      {/* Export row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{vm.total ?? 0} {t('tradeIns.tradeInCount')}</p>
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
      <div id={TRADEIN_PRINT_ID}>
        {vm.loading ? (
          <TableSkeleton columns={7} rows={8} />
        ) : items.length === 0 ? (
          <EmptyState
            title={t('tradeIns.noMatchTitle')}
            description={t('tradeIns.noMatchDescription')}
          />
        ) : (
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">{t('tradeIns.tradeInNumberLabel')}</th>
                  <th className="px-4 py-3">{t('tradeIns.customerLabel')}</th>
                  <th className="px-4 py-3">{t('tradeIns.tradeInDateLabel')}</th>
                  <th className="px-4 py-3 text-right">{t('tradeIns.totalTradeInValueLabel')}</th>
                  <th className="px-4 py-3 text-right">{t('tradeIns.totalSaleAmountLabel')}</th>
                  <th className="px-4 py-3 text-right">{t('tradeIns.paymentAmountLabel')}</th>
                  <th className="px-4 py-3 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((tradeIn) => {
                  const payment = Number(tradeIn.paymentAmount);
                  return (
                    <tr key={tradeIn.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors text-left"
                          onClick={() => openView(tradeIn.id)}
                        >
                          {tradeIn.tradeInNumber}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{tradeIn.customerName || '—'}</p>
                        {tradeIn.customerPhone && (
                          <p className="text-xs text-slate-400">{tradeIn.customerPhone}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{String(tradeIn.tradeInDate || '').slice(0, 10)}</td>
                      <td className="px-4 py-3 text-right text-emerald-700 font-medium">
                        {Number(tradeIn.totalTradeInValue).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-indigo-700 font-medium">
                        {Number(tradeIn.totalSaleAmount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${payment < 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                          {payment < 0 ? '←' : ''} {Math.abs(payment).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="icon-btn text-slate-400 hover:text-indigo-600"
                            title={t('common.view')}
                            onClick={() => openView(tradeIn.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {canManage && (
                            <button
                              className="icon-btn text-slate-400 hover:text-rose-500"
                              title={t('common.delete')}
                              onClick={() => handleDelete(tradeIn)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />

      {showForm && (
        <TradeInFormModal
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}

      {viewModal && (
        <TradeInViewModal
          tradeIn={viewModal}
          onClose={() => setViewModal(null)}
        />
      )}
    </div>
  );
}
