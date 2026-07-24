import { useEffect, useState } from 'react';
import { ArrowLeftRight, Download, Eye, FileSpreadsheet, Loader2, Plus, Printer, Search, Trash2 } from 'lucide-react';
import { Alert, EmptyState, MobileCardList, MobileListCard, Pagination, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import { DateRangePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { downloadSheetPdf } from '../../../services/printService.js';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';
import TradeInFormModal from '../components/TradeInFormModal';
import TradeInViewModal from '../components/TradeInViewModal';
import { useTradeInsViewModel } from '../viewmodels/useTradeInsViewModel';
import { formatCurrency, formatDateHuman } from '../../../utils/calculations.js';

const TRADEIN_PRINT_ID = 'trade-ins-print';
const TRADEINS_SHORTCUTS = {
  add: { alt: true, key: 'a', label: 'Alt+A' },
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

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

  async function handleDownloadPdf() {
    await downloadPdf(async () => {
      await inventoryApi.recordPrint({ entityType: 'trade_ins', entityId: null, label: 'pdf' }).catch(() => {});
      await downloadSheetPdf(TRADEIN_PRINT_ID, `${t('tradeIns.sheetName')}.pdf`);
    });
  }

  function handlePrint() {
    inventoryApi.recordPrint({ entityType: 'trade_ins', entityId: null, label: 'print' }).catch(() => {});
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
      if (matchesShortcut(event, TRADEINS_SHORTCUTS.add) && canManage && !showForm && !viewModal) {
        event.preventDefault();
        setShowForm(true);
      } else if (matchesShortcut(event, TRADEINS_SHORTCUTS.pdf) && !downloadingPdf) {
        event.preventDefault();
        handleDownloadPdf();
      } else if (matchesShortcut(event, TRADEINS_SHORTCUTS.excel)) {
        event.preventDefault();
        handleExportExcel();
      } else if (matchesShortcut(event, TRADEINS_SHORTCUTS.print)) {
        event.preventDefault();
        handlePrint();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [downloadingPdf, canManage, showForm, viewModal, vm.search, vm.dateFrom, vm.dateTo, t]);

  const items = vm.items || [];

  return (
    <div>
      <SectionHeader
        title={t('tradeIns.title')}
        compact
        action={canManage ? (
          <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={18} />
            {t('tradeIns.add')}
            <kbd className="ml-1 hidden rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200 sm:inline-flex">Alt+A</kbd>
          </button>
        ) : null}
      />

      <div id={TRADEIN_PRINT_ID} className="surface overflow-hidden print-target">
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 xl:grid-cols-12">
          <div className="relative w-full sm:col-span-2 xl:col-span-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="input pl-10"
              placeholder={t('tradeIns.searchPlaceholder')}
              value={vm.search}
              onChange={(e) => vm.setSearch(e.target.value)}
            />
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
              {shortcutBadge(TRADEINS_SHORTCUTS.pdf)}
            </button>
            <button type="button" className="btn-secondary no-print h-10 w-full justify-center gap-1.5 px-2 text-xs" onClick={handleExportExcel}>
              <FileSpreadsheet size={14} />
              {t('common.exportExcel')}
              {shortcutBadge(TRADEINS_SHORTCUTS.excel)}
            </button>
            <button type="button" className="btn-secondary no-print h-10 w-full justify-center gap-1.5 px-2 text-xs" onClick={handlePrint}>
              <Printer size={14} />
              {t('common.print')}
              {shortcutBadge(TRADEINS_SHORTCUTS.print)}
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
            {items.map((tradeIn) => {
              const payment = Number(tradeIn.paymentAmount);
              return (
                <MobileListCard
                  key={tradeIn.id}
                  onClick={() => openView(tradeIn.id)}
                  title={tradeIn.tradeInNumber}
                  subtitle={`${tradeIn.customerName || '-'} - ${formatDateHuman(tradeIn.tradeInDate, language)}`}
                  value={formatCurrency(tradeIn.totalTradeInValue, language)}
                  valueClass="text-emerald-700"
                  valueSub={`${payment < 0 ? '- ' : ''}${formatCurrency(Math.abs(payment), language)}`}
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
                        <p className="font-medium text-slate-900">{tradeIn.customerName || '-'}</p>
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
                          {payment < 0 ? '- ' : ''}{formatCurrency(Math.abs(payment), language)}
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
          <div className="border-t border-slate-100 px-5 py-4 no-print">
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
