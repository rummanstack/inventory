import { useState } from 'react';
import { ArrowLeftRight, Download, Eye, FileSpreadsheet, Loader2, Plus, Printer, Search, Trash2 } from 'lucide-react';
import { Alert, EmptyState, MobileCardList, MobileListCard, Pagination, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { downloadSheetPdf } from '../../../services/printService.js';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';
import TradeInFormModal from '../components/TradeInFormModal';
import TradeInViewModal from '../components/TradeInViewModal';
import { useTradeInsViewModel } from '../viewmodels/useTradeInsViewModel';
import { formatCurrency, formatDateHuman, formatNumber } from '../../../utils/calculations.js';

const TRADEIN_PRINT_ID = 'trade-ins-print';

export default function TradeInsPage() {
  const { saveTradeIn, deleteTradeIn, t, can, language } = useInventoryApp();
  const vm = useTradeInsViewModel();
  const [showForm, setShowForm] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const canManage = can('manage_trade_ins');
  const [downloadingPdf, downloadPdf] = useAsyncAction();

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

  async function handleSave(payload) {
    const result = await saveTradeIn(payload);
    if (result.ok) {
      vm.reload?.();
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
    <div>
      <SectionHeader
        eyebrow={t('tradeIns.eyebrow')}
        title={t('tradeIns.title')}
        description={t('tradeIns.description')}
        action={canManage ? (
          <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={18} />
            {t('tradeIns.add')}
          </button>
        ) : null}
      />

      <div id={TRADEIN_PRINT_ID} className="surface overflow-hidden print-target">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t('tradeIns.eyebrow')}</p>
              <p className="text-xs font-medium text-slate-400">{t('tradeIns.description')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
              <span className="muted-chip">{formatNumber(vm.total ?? 0)} {t('tradeIns.tradeInCount')}</span>
              <button
                type="button"
                className="btn-secondary no-print py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => downloadPdf(async () => { await inventoryApi.recordPrint({ entityType: 'trade_ins', entityId: null, label: 'pdf' }).catch(() => {}); await downloadSheetPdf(TRADEIN_PRINT_ID, `${t('tradeIns.sheetName')}.pdf`); })}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {t('purchaseReceive.downloadPdf')}
              </button>
              <button type="button" className="btn-secondary no-print py-1.5 text-xs" onClick={handleExportExcel}>
                <FileSpreadsheet size={14} />
                {t('common.exportExcel')}
              </button>
              <button
                type="button"
                className="btn-secondary no-print py-1.5 text-xs"
                onClick={() => { inventoryApi.recordPrint({ entityType: 'trade_ins', entityId: null, label: 'print' }).catch(() => {}); window.print(); }}
              >
                <Printer size={14} />
                {t('common.print')}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="input pl-10"
                placeholder={t('tradeIns.searchPlaceholder')}
                value={vm.search}
                onChange={(e) => vm.setSearch(e.target.value)}
              />
            </div>
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
          <>
          <MobileCardList>
            {items.map((tradeIn) => {
              const payment = Number(tradeIn.paymentAmount);
              return (
                <MobileListCard
                  key={tradeIn.id}
                  onClick={() => openView(tradeIn.id)}
                  title={tradeIn.tradeInNumber}
                  subtitle={`${tradeIn.customerName || '—'} · ${formatDateHuman(tradeIn.tradeInDate, language)}`}
                  value={formatCurrency(tradeIn.totalTradeInValue, language)}
                  valueClass="text-emerald-700"
                  valueSub={`${payment < 0 ? '← ' : ''}${formatCurrency(Math.abs(payment), language)}`}
                  action={canManage ? (
                    <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={() => handleDelete(tradeIn)}>
                      <Trash2 size={16} />
                    </button>
                  ) : null}
                />
              );
            })}
          </MobileCardList>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">{t('tradeIns.tradeInNumberLabel')}</th>
                  <th className="px-4 py-3">{t('tradeIns.customerLabel')}</th>
                  <th className="px-4 py-3">{t('tradeIns.tradeInDateLabel')}</th>
                  <th className="px-4 py-3 text-right">{t('tradeIns.totalTradeInValueLabel')}</th>
                  <th className="px-4 py-3 text-right">{t('tradeIns.totalSaleAmountLabel')}</th>
                  <th className="px-4 py-3 text-right">{t('tradeIns.paymentAmountLabel')}</th>
                  <th className="px-4 py-3 text-right no-print">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((tradeIn) => {
                  const payment = Number(tradeIn.paymentAmount);
                  return (
                    <tr key={tradeIn.id} className="hover:bg-slate-50">
                      <td className="table-cell">
                        <button
                          type="button"
                          className="font-semibold text-slate-950 hover:text-[var(--secondary-strong)] transition-colors text-left"
                          onClick={() => openView(tradeIn.id)}
                        >
                          {tradeIn.tradeInNumber}
                        </button>
                      </td>
                      <td className="table-cell">
                        <p className="font-medium text-slate-900">{tradeIn.customerName || '—'}</p>
                        {tradeIn.customerPhone ? (
                          <p className="text-xs text-slate-400">{tradeIn.customerPhone}</p>
                        ) : null}
                      </td>
                      <td className="table-cell text-slate-600">{formatDateHuman(tradeIn.tradeInDate, language)}</td>
                      <td className="table-cell text-right font-semibold text-emerald-700">
                        {formatCurrency(tradeIn.totalTradeInValue, language)}
                      </td>
                      <td className="table-cell text-right font-semibold text-slate-700">
                        {formatCurrency(tradeIn.totalSaleAmount, language)}
                      </td>
                      <td className="table-cell text-right">
                        <span className={`font-bold ${payment < 0 ? 'text-amber-600' : 'text-slate-950'}`}>
                          {payment < 0 ? '← ' : ''}{formatCurrency(Math.abs(payment), language)}
                        </span>
                      </td>
                      <td className="table-cell no-print">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="icon-btn"
                            title={t('common.view')}
                            onClick={() => openView(tradeIn.id)}
                          >
                            <Eye size={16} />
                          </button>
                          {canManage ? (
                            <button
                              type="button"
                              className="icon-btn text-rose-600 hover:text-rose-700"
                              title={t('common.delete')}
                              onClick={() => handleDelete(tradeIn)}
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}

        {!vm.loading && !vm.error && items.length === 0 ? (
          <div className="p-5">
            <EmptyState title={t('tradeIns.noMatchTitle')} description={t('tradeIns.noMatchDescription')} icon={ArrowLeftRight} />
          </div>
        ) : null}

        {!vm.loading && !vm.error && items.length > 0 ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {showForm ? (
        <TradeInFormModal
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      ) : null}

      {viewModal ? (
        <TradeInViewModal
          tradeIn={viewModal}
          onClose={() => setViewModal(null)}
        />
      ) : null}
    </div>
  );
}
