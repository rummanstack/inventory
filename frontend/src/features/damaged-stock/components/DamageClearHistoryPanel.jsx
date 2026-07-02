import { useEffect, useState } from 'react';
import { Download, PackageX, RefreshCw } from 'lucide-react';
import { Alert, EmptyState, Pagination, TableSkeleton, Select } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatDate, formatDateTime, formatNumber, todayISO } from '../../../utils/calculations.js';
import { usePagination } from '../../../hooks/usePagination.js';

const PAGE_SIZE = 15;

function subtractDays(dateISO, days) {
  const date = new Date(`${dateISO}T00:00:00`);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export default function DamageClearHistoryPanel({ products, refreshKey = 0 }) {
  const { t } = useInventoryApp();
  const today = todayISO();
  const [productId, setProductId] = useState('');
  const [dateFrom, setDateFrom] = useState(subtractDays(today, 29));
  const [dateTo, setDateTo] = useState(today);
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const { page, setPage, resetPage } = usePagination({ pageSize: PAGE_SIZE });

  useEffect(() => {
    resetPage();
  }, [productId, dateFrom, dateTo, resetPage]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError('');
        const result = await inventoryApi.listStockMovements({
          page,
          pageSize: PAGE_SIZE,
          productId,
          type: 'DAMAGE_CLEAR',
          dateFrom,
          dateTo,
        });
        if (!cancelled) {
          setRecords(result.items || []);
          setTotal(result.total || 0);
          setTotalPages(result.totalPages || 0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setRecords([]);
          setTotal(0);
          setTotalPages(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [page, productId, dateFrom, dateTo, version, refreshKey]);

  return (
    <section id="damage-clear-history-print" className="surface mt-6 overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="brand-chip">{t('damagedStock.eyebrow')}</p>
            <h2 className="mt-3 text-lg font-semibold text-slate-950">{t('damagedStock.clearHistoryTitle')}</h2>
            <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-500">{t('damagedStock.clearHistoryDescription')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setVersion((v) => v + 1)}
            >
              <RefreshCw size={16} />
              {t('stockLedger.refresh')}
            </button>
            <button
              type="button"
              className="btn-secondary no-print"
              onClick={() => {
                inventoryApi.recordPrint({ entityType: 'damage_clear_history', entityId: null, label: 'pdf' }).catch(() => {});
                downloadSheetPdf('damage-clear-history-print', `damage-clear-history-${dateFrom}-${dateTo}.pdf`);
              }}
            >
              <Download size={16} />
              {t('purchaseReceive.downloadPdf')}
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
                  <td className="hidden table-cell md:table-cell">
                    <p className="max-w-56 truncate text-sm text-slate-600">{record.note || '-'}</p>
                  </td>
                  <td className="hidden table-cell lg:table-cell">
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
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="muted-chip">{formatNumber(total)} {t('common.records')}</span>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      ) : null}
    </section>
  );
}

