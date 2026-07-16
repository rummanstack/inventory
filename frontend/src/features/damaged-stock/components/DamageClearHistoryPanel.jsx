import { useEffect, useState } from 'react';
import { Download, Loader2, PackageX, RefreshCw } from 'lucide-react';
import { Alert, EmptyState, Pagination, TableSkeleton, Select } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatDate, formatDateTime, formatNumber, todayISO } from '../../../utils/calculations.js';
import { usePagination } from '../../../hooks/usePagination.js';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';
import { useStockMovementsQuery } from '../../products/queries/useStockMovementsQuery.js';

const PAGE_SIZE = 15;

function subtractDays(dateISO, days) {
  const date = new Date(`${dateISO}T00:00:00`);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export default function DamageClearHistoryPanel({ products, refreshKey = 0, flushTop = false }) {
  const { t } = useInventoryApp();
  const today = todayISO();
  const [productId, setProductId] = useState('');
  const [dateFrom, setDateFrom] = useState(subtractDays(today, 29));
  const [dateTo, setDateTo] = useState(today);
  const { page, setPage, resetPage } = usePagination({ pageSize: PAGE_SIZE });
  const movementsQuery = useStockMovementsQuery({
    page,
    pageSize: PAGE_SIZE,
    productId,
    type: 'DAMAGE_CLEAR',
    dateFrom,
    dateTo,
  }, { refreshKey });
  const movementResult = movementsQuery.data || {};
  const records = movementResult.items || [];
  const total = movementResult.total || 0;
  const totalPages = movementResult.totalPages || 0;
  const loading = movementsQuery.isPending;
  const error = movementsQuery.error?.message || '';
  const [downloadingPdf, downloadPdf] = useAsyncAction();

  useEffect(() => {
    resetPage();
  }, [productId, dateFrom, dateTo, resetPage]);

  function handleRefresh() {
    movementsQuery.refetch();
  }

  function handleDownloadPdf() {
    downloadPdf(async () => {
      await inventoryApi.recordPrint({ entityType: 'damage_clear_history', entityId: null, label: 'pdf' }).catch(() => {});
      await downloadSheetPdf('damage-clear-history-print', `damage-clear-history-${dateFrom}-${dateTo}.pdf`);
    });
  }

  useEffect(() => {
    function handleKeyDown(event) {
      const key = event.key.toLowerCase();
      const isShortcut = event.altKey && !event.ctrlKey && !event.metaKey;
      if (!isShortcut) {
        return;
      }

      if (key === 'r') {
        event.preventDefault();
        handleRefresh();
      } else if (key === 'd' && !downloadingPdf) {
        event.preventDefault();
        handleDownloadPdf();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [downloadingPdf, dateFrom, dateTo]);

  return (
    <section id="damage-clear-history-print" className={`surface overflow-hidden ${flushTop ? '' : 'mt-6'}`}>
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-700">{t('damagedStock.historyTab')}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleRefresh}
            >
              <RefreshCw size={16} />
              {t('stockLedger.refresh')}
              <kbd className="ml-1 rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500">Alt+R</kbd>
            </button>
            <button
              type="button"
              className="btn-secondary no-print disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {t('purchaseReceive.downloadPdf')}
              <kbd className="ml-1 rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500">Alt+D</kbd>
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div>
            <label className="label">{t('stockLedger.product')}</label>
            <Select className="input" value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">{t('stockLedger.allProducts')}</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">{t('stockLedger.dateFrom')}</label>
            <DatePickerField value={dateFrom} onChange={setDateFrom} />
          </div>
          <div>
            <label className="label">{t('stockLedger.dateTo')}</label>
            <DatePickerField value={dateTo} onChange={setDateTo} min={dateFrom} />
          </div>
        </div>
      </div>

      {error ? (
        <div className="p-5"><Alert type="error">{error}</Alert></div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">{t('damagedStock.clearDate')}</th>
              <th className="px-4 py-3">{t('damagedStock.product')}</th>
              <th className="px-4 py-3">{t('damagedStock.category')}</th>
              <th className="px-4 py-3 text-right">{t('damagedStock.qtyCleared')}</th>
              <th className="px-4 py-3">{t('damagedStock.clearNoteLabel')}</th>
              <th className="px-4 py-3">{t('damagedStock.clearedBy')}</th>
            </tr>
          </thead>
          {loading ? null : (
            <tbody className="divide-y divide-slate-100">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50">
                  <td className="table-cell whitespace-nowrap text-sm font-semibold text-slate-700">
                    {formatDateTime(record.createdAt)}
                  </td>
                  <td className="table-cell">
                    <p className="font-semibold text-slate-950">{record.productName}</p>
                  </td>
                  <td className="table-cell text-slate-500">{record.productCategory || '-'}</td>
                  <td className="table-cell text-right font-semibold text-emerald-700">
                    {formatNumber(record.quantityIn || record.quantityOut || 0)}
                  </td>
                  <td className="table-cell">
                    <p className="max-w-56 truncate text-sm text-slate-600">{record.note || '-'}</p>
                  </td>
                  <td className="table-cell">
                    <p className="font-semibold text-slate-950">{record.createdByName || '-'}</p>
                    <p className="text-xs text-slate-500">{record.createdByRole || ''}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          )}
        </table>
        {loading ? (
          <div className="p-5"><TableSkeleton columns={6} showHeader={false} /></div>
        ) : null}
      </div>

      {!loading && !error && !records.length ? (
        <div className="p-5">
          <EmptyState title={t('damagedStock.clearHistoryEmptyTitle')} description={t('damagedStock.clearHistoryEmptyDescription')} icon={PackageX} />
        </div>
      ) : null}

      {!loading && !error && records.length ? (
        <div className="flex flex-col items-center gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-center">
          <span className="muted-chip">{formatNumber(total)} {t('common.records')}</span>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      ) : null}
    </section>
  );
}

