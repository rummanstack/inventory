import { useEffect, useState } from 'react';
import { ClipboardList, Download, FileSpreadsheet, Loader2, Printer, RefreshCw } from 'lucide-react';
import { Alert, Badge, CopyableText, EmptyState, MobileCardList, MobileListCard, Pagination, TableSkeleton, Select } from '../../../components/ui.jsx';
import { DateRangePickerField } from '../../../components/DatePicker.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { downloadSheetPdf } from '../../../services/printService.js';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';
import { formatDateTime, formatNumber, todayISO } from '../../../utils/calculations.js';
import { usePagination } from '../../../hooks/usePagination.js';
import { useStockMovementsQuery } from '../queries/useStockMovementsQuery.js';

const LEDGER_PAGE_SIZE = 10;
const STOCK_LEDGER_PRINT_ID = 'stock-ledger-panel-print';

function subtractDays(dateISO, days) {
  const date = new Date(`${dateISO}T00:00:00`);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function movementTone(type) {
  if (type === 'MORNING_ISSUE' || type === 'DAMAGE') {
    return 'rose';
  }
  if (type === 'SETTLEMENT_RETURN' || type === 'EXTRA_RETURN') {
    return 'emerald';
  }
  if (type === 'MANUAL_ADJUSTMENT' || type === 'OPENING') {
    return 'blue';
  }
  return 'slate';
}

function formatReference(movement) {
  if (!movement.referenceType && !movement.referenceId) {
    return '-';
  }

  const shortId = movement.referenceId ? String(movement.referenceId).slice(0, 18) : '-';
  return `${movement.referenceType || 'reference'} / ${shortId}`;
}

export default function StockLedgerPanel({ products, t, refreshKey = 0, fixedType, sectionTitle, sectionDescription, printTarget = false, hideHeader = false, shortcuts = false, shortcutKeys = {} }) {
  const today = todayISO();
  const [productId, setProductId] = useState('');
  const [dateFrom, setDateFrom] = useState(subtractDays(today, 29));
  const [dateTo, setDateTo] = useState(today);
  const { page, setPage, resetPage } = usePagination({ pageSize: LEDGER_PAGE_SIZE });
  const movementsQuery = useStockMovementsQuery({
    page,
    pageSize: LEDGER_PAGE_SIZE,
    productId,
    type: fixedType,
    dateFrom,
    dateTo,
  }, { refreshKey });
  const movementResult = movementsQuery.data || {};
  const movements = movementResult.items || [];
  const total = movementResult.total || 0;
  const totalPages = movementResult.totalPages || 0;
  const loading = movementsQuery.isPending;
  const error = movementsQuery.error?.message || '';
  const [downloadingPdf, downloadPdf] = useAsyncAction();
  const exportShortcutKey = shortcutKeys.exportExcel || 'l';
  const refreshShortcutKey = shortcutKeys.refresh || 'r';
  const downloadPdfShortcutKey = shortcutKeys.downloadPdf || 'd';
  const printShortcutKey = shortcutKeys.print || 'p';

  useEffect(() => {
    resetPage();
  }, [productId, dateFrom, dateTo, resetPage]);

  function handleRefresh() {
    movementsQuery.refetch();
  }

  function handleDownloadPdf() {
    downloadPdf(async () => {
      await inventoryApi.recordPrint({ entityType: 'stock_ledger', entityId: null, label: 'pdf' }).catch(() => {});
      await downloadSheetPdf(STOCK_LEDGER_PRINT_ID, `stock-ledger-${dateFrom}-${dateTo}.pdf`);
    });
  }

  function handlePrint() {
    inventoryApi.recordPrint({ entityType: 'stock_ledger', entityId: null, label: 'print' }).catch(() => {});
    window.print();
  }

  async function handleExportExcel() {
    const result = await inventoryApi.listStockMovements({
      page: 1,
      pageSize: 10000,
      productId,
      type: fixedType,
      dateFrom,
      dateTo,
    });
    const all = result.items || [];
    const { utils, writeFile } = await import('xlsx');
    const header = ['Date', 'Product', 'Category', 'Type', 'Qty In', 'Qty Out', 'Balance After', 'Note', 'Created By', 'Role'];
    const data = all.map((m) => [m.createdAt, m.productName || '', m.productCategory || '', m.type, m.quantityIn || 0, m.quantityOut || 0, m.balanceAfter, m.note || '', m.createdByName || '', m.createdByRole || '']);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 20 }, { wch: 24 }, { wch: 16 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 24 }, { wch: 18 }, { wch: 14 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Stock Movements');
    writeFile(wb, `stock-ledger-${dateFrom}-${dateTo}.xlsx`);
  }

  useEffect(() => {
    if (!shortcuts) {
      return undefined;
    }

    function handleKeyDown(event) {
      const key = event.key.toLowerCase();
      const isShortcut = event.altKey && !event.ctrlKey && !event.metaKey;
      if (!isShortcut) {
        return;
      }
      if (printTarget && key === downloadPdfShortcutKey) {
        event.preventDefault();
        handleDownloadPdf();
      } else if (key === exportShortcutKey) {
        event.preventDefault();
        handleExportExcel();
      } else if (printTarget && key === printShortcutKey) {
        event.preventDefault();
        handlePrint();
      } else if (key === refreshShortcutKey) {
        event.preventDefault();
        handleRefresh();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, printTarget, productId, fixedType, dateFrom, dateTo, exportShortcutKey, refreshShortcutKey, downloadPdfShortcutKey, printShortcutKey]);

  return (
    <section id={printTarget ? STOCK_LEDGER_PRINT_ID : undefined} className={`surface mt-6 overflow-hidden ${printTarget ? 'print-target' : ''}`}>
      <div className={`border-b border-slate-100 px-5 py-4 ${printTarget ? 'no-print' : ''}`}>
        {hideHeader ? null : (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              {sectionDescription !== '' ? <p className="brand-chip">{t('stockLedger.eyebrow')}</p> : null}
              <h2 className={sectionDescription !== '' ? "mt-3 text-lg font-bold tracking-tight text-slate-950" : "text-lg font-bold tracking-tight text-slate-950"}>{sectionTitle || t('stockLedger.title')}</h2>
              {sectionDescription !== '' ? (
                <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-500">{sectionDescription ?? t('stockLedger.description')}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {printTarget ? (
                <button
                  type="button"
                  className="btn-secondary h-10 gap-1.5 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                >
                  {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  {t('purchaseReceive.downloadPdf')}
                  {shortcuts ? <kbd className="ml-1 rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500">Alt+{downloadPdfShortcutKey.toUpperCase()}</kbd> : null}
                </button>
              ) : null}
              <button type="button" className="btn-secondary h-10 gap-1.5 px-3 text-xs" onClick={handleExportExcel}>
                <FileSpreadsheet size={14} />
                {t('common.exportExcel')}
                {shortcuts ? <kbd className="ml-1 rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500">Alt+{exportShortcutKey.toUpperCase()}</kbd> : null}
              </button>
              {printTarget ? (
                <button
                  type="button"
                  className="btn-secondary h-10 gap-1.5 px-3 text-xs"
                  onClick={handlePrint}
                >
                  <Printer size={14} />
                  {t('common.print')}
                  {shortcuts ? <kbd className="ml-1 rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500">Alt+{printShortcutKey.toUpperCase()}</kbd> : null}
                </button>
              ) : null}
              <button type="button" className="btn-secondary" onClick={handleRefresh}>
                <RefreshCw size={16} />
                {t('stockLedger.refresh')}
                {shortcuts ? <kbd className="ml-1 rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500">Alt+{refreshShortcutKey.toUpperCase()}</kbd> : null}
              </button>
            </div>
          </div>
        )}

        <div className={hideHeader ? 'grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-12' : 'mt-5 flex flex-col gap-4 lg:flex-row lg:items-end'}>
          <div className={hideHeader ? 'contents' : 'grid flex-1 gap-4 sm:grid-cols-2'}>
            <div className={hideHeader ? 'sm:col-span-2 xl:col-span-2' : ''}>
              <label className="label">{t('stockLedger.product')}</label>
              <Select className="input w-full" value={productId} onChange={(event) => setProductId(event.target.value)}>
                <option value="">{t('stockLedger.allProducts')}</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className={hideHeader ? 'sm:col-span-2 xl:col-span-2' : ''}>
              <label className="label">{t('stockLedger.dateFrom')} - {t('stockLedger.dateTo')}</label>
              <DateRangePickerField from={dateFrom} to={dateTo} onChange={(from, to) => { setDateFrom(from); setDateTo(to); }} />
            </div>
          </div>
          {hideHeader ? (
            <div className="flex flex-wrap gap-2 sm:col-span-2 sm:justify-self-end xl:col-span-8">
              {printTarget ? (
                <button
                  type="button"
                  className="btn-secondary h-10 gap-1.5 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                >
                  {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  {t('purchaseReceive.downloadPdf')}
                  {shortcuts ? <kbd className="ml-1 rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500">Alt+{downloadPdfShortcutKey.toUpperCase()}</kbd> : null}
                </button>
              ) : null}
              <button type="button" className="btn-secondary h-10 gap-1.5 px-3 text-xs" onClick={handleExportExcel}>
                <FileSpreadsheet size={14} />
                {t('common.exportExcel')}
                {shortcuts ? <kbd className="ml-1 rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500">Alt+{exportShortcutKey.toUpperCase()}</kbd> : null}
              </button>
              {printTarget ? (
                <button
                  type="button"
                  className="btn-secondary h-10 gap-1.5 px-3 text-xs"
                  onClick={handlePrint}
                >
                  <Printer size={14} />
                  {t('common.print')}
                  {shortcuts ? <kbd className="ml-1 rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500">Alt+{printShortcutKey.toUpperCase()}</kbd> : null}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="p-5">
          <Alert type="error">{error}</Alert>
        </div>
      ) : null}

      {!loading && !error ? (
        <MobileCardList>
          {movements.map((movement) => (
            <MobileListCard
              key={movement.id}
              title={movement.productName || movement.productId}
              badge={<Badge tone={movementTone(movement.type)}>{t(`stockLedger.types.${movement.type}`)}</Badge>}
              subtitle={formatDateTime(movement.createdAt)}
              value={movement.quantityIn
                ? `+${formatNumber(movement.quantityIn)}`
                : movement.quantityOut
                  ? `-${formatNumber(movement.quantityOut)}`
                  : '-'}
              valueClass={movement.quantityIn ? 'text-emerald-700' : movement.quantityOut ? 'text-rose-700' : undefined}
              valueSub={`= ${formatNumber(movement.balanceAfter)}`}
            />
          ))}
        </MobileCardList>
      ) : null}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">{t('stockLedger.when')}</th>
              <th className="px-4 py-3">{t('stockLedger.product')}</th>
              <th className="px-4 py-3">{t('stockLedger.type')}</th>
              <th className="px-4 py-3 text-right">{t('stockLedger.quantityIn')}</th>
              <th className="px-4 py-3 text-right">{t('stockLedger.quantityOut')}</th>
              <th className="px-4 py-3 text-right">{t('stockLedger.balanceAfter')}</th>
              <th className="px-4 py-3">{t('stockLedger.reference')}</th>
              <th className="px-4 py-3">{t('stockLedger.createdBy')}</th>
            </tr>
          </thead>
          {loading ? null : (
            <tbody className="divide-y divide-slate-100">
              {movements.map((movement) => (
                <tr key={movement.id} className="hover:bg-slate-50">
                  <td className="table-cell whitespace-nowrap text-sm font-semibold text-slate-700">
                    {formatDateTime(movement.createdAt)}
                  </td>
                  <td className="table-cell">
                    <p className="font-semibold text-slate-950">{movement.productName || movement.productId}</p>
                    <p className="text-xs text-slate-500">{movement.productCategory || movement.productId}</p>
                  </td>
                  <td className="table-cell">
                    <Badge tone={movementTone(movement.type)}>{t(`stockLedger.types.${movement.type}`)}</Badge>
                    {movement.note ? <p className="mt-1 max-w-56 truncate text-xs text-slate-500">{movement.note}</p> : null}
                  </td>
                  <td className="table-cell text-right font-semibold text-emerald-700">
                    {movement.quantityIn ? `+${formatNumber(movement.quantityIn)}` : '-'}
                  </td>
                  <td className="table-cell text-right font-semibold text-rose-700">
                    {movement.quantityOut ? `-${formatNumber(movement.quantityOut)}` : '-'}
                  </td>
                  <td className="table-cell text-right font-semibold text-slate-950">{formatNumber(movement.balanceAfter)}</td>
                  <td className="table-cell">
                    <CopyableText value={movement.referenceId ? `${movement.referenceType || 'reference'} / ${movement.referenceId}` : ''} copyLabel={t('stockLedger.reference')} displayValue={formatReference(movement)} textClassName="max-w-52 text-xs font-semibold text-slate-600" buttonClassName="h-5 w-5" />
                  </td>
                  <td className="table-cell">
                    <p className="font-semibold text-slate-950">{movement.createdByName || '-'}</p>
                    <p className="text-xs text-slate-500">{movement.createdByRole || ''}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>
      {loading ? (
        <div className="p-5">
          <TableSkeleton columns={8} showHeader={false} />
        </div>
      ) : null}

      {!loading && !error && !movements.length ? (
        <div className="p-5">
          <EmptyState title={t('stockLedger.emptyTitle')} description={t('stockLedger.emptyDescription')} icon={ClipboardList} />
        </div>
      ) : null}

      {!loading && !error && movements.length ? (
        <div className="flex flex-col items-center gap-3 border-t border-slate-100 px-5 py-4 no-print sm:flex-row sm:justify-center">
          <span className="muted-chip">{formatNumber(total)} {t('common.records')}</span>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      ) : null}
    </section>
  );
}






