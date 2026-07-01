import { useEffect, useState } from 'react';
import { PackageX, RefreshCw } from 'lucide-react';
import { Alert, EmptyState, Pagination, TableSkeleton, Select } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatDate, formatDateTime, formatNumber, todayISO } from '../../../utils/calculations.js';
import { usePagination } from '../../../hooks/usePagination.js';

const PAGE_SIZE = 15;

function subtractDays(dateISO, days) {
  const date = new Date(`${dateISO}T00:00:00`);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export default function DamageFromSettlementsPanel({ products }) {
  const { t, language } = useInventoryApp();
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
          type: 'DAMAGE',
          referenceType: 'settlement',
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
  }, [page, productId, dateFrom, dateTo, version]);

  return (
    <section className="surface mt-6 overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="brand-chip">{t('damagedStock.eyebrow')}</p>
            <h2 className="mt-3 text-lg font-black text-slate-950">{t('damagedStock.settlementDamageHistoryTitle')}</h2>
            <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-500">{t('damagedStock.settlementDamageHistoryDescription')}</p>
          </div>
          <button type="button" className="btn-secondary shrink-0" onClick={() => setVersion((v) => v + 1)}>
            <RefreshCw size={16} />
            {t('stockLedger.refresh')}
          </button>
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
        <table className="w-full text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3 text-left">{t('damagedStock.settlementDamageDate')}</th>
              <th className="px-4 py-3 text-left">{t('damagedStock.settlementDamageProduct')}</th>
              <th className="px-4 py-3 text-right">{t('damagedStock.settlementDamagePieces')}</th>
              <th className="hidden px-4 py-3 text-left md:table-cell">{t('damagedStock.settlementDamageSource')}</th>
            </tr>
          </thead>
          {loading ? null : (
            <tbody className="divide-y divide-slate-100">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">
                    {record.businessDate ? formatDate(record.businessDate, language) : formatDateTime(record.createdAt, language)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-950">{record.productName}</td>
                  <td className="px-4 py-3 text-right font-semibold text-rose-600">
                    {formatNumber(record.quantityOut, language)}
                  </td>
                  <td className="hidden max-w-xs truncate px-4 py-3 text-slate-500 md:table-cell">
                    {record.note || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          )}
        </table>
        {loading ? (
          <div className="p-5"><TableSkeleton columns={4} showHeader={false} /></div>
        ) : null}
      </div>

      {!loading && !error && !records.length ? (
        <div className="p-5">
          <EmptyState
            title={t('damagedStock.settlementDamageEmptyTitle')}
            description={t('damagedStock.settlementDamageEmptyDescription')}
            icon={PackageX}
          />
        </div>
      ) : null}

      {!loading && !error && records.length ? (
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="muted-chip">{formatNumber(total, language)} {t('common.records')}</span>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      ) : null}
    </section>
  );
}

