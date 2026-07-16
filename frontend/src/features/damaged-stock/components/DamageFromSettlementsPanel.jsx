import { useEffect, useState } from 'react';
import { PackageX, RefreshCw } from 'lucide-react';
import { Alert, EmptyState, MobileCardList, MobileListCard, Pagination, TableSkeleton, Select } from '../../../components/ui.jsx';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatDate, formatDateTime, formatNumber, todayISO } from '../../../utils/calculations.js';
import { usePagination } from '../../../hooks/usePagination.js';
import { useStockMovementsQuery } from '../../products/queries/useStockMovementsQuery.js';

const PAGE_SIZE = 15;
const SETTLEMENT_DAMAGE_REPORT_ID = 'settlement-damage-report';
const DAMAGE_INFLOW_REPORT_SHORTCUTS = {
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  csv: { alt: true, key: 'c', label: 'Alt+C' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

function subtractDays(dateISO, days) {
  const date = new Date(`${dateISO}T00:00:00`);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export default function DamageFromSettlementsPanel({ products, flushTop = false }) {
  const { t, language } = useInventoryApp();
  const today = todayISO();
  const [productId, setProductId] = useState('');
  const [dateFrom, setDateFrom] = useState(subtractDays(today, 29));
  const [dateTo, setDateTo] = useState(today);
  const { page, setPage, resetPage } = usePagination({ pageSize: PAGE_SIZE });
  const movementsQuery = useStockMovementsQuery({
    page,
    pageSize: PAGE_SIZE,
    productId,
    type: 'DAMAGE',
    referenceType: 'settlement',
    dateFrom,
    dateTo,
  });
  const movementResult = movementsQuery.data || {};
  const records = movementResult.items || [];
  const total = movementResult.total || 0;
  const totalPages = movementResult.totalPages || 0;
  const loading = movementsQuery.isPending;
  const error = movementsQuery.error?.message || '';

  useEffect(() => {
    resetPage();
  }, [productId, dateFrom, dateTo, resetPage]);

  useEffect(() => {
    function handleKeyDown(event) {
      const key = event.key.toLowerCase();
      const isShortcut = event.altKey && !event.ctrlKey && !event.metaKey;
      if (!isShortcut) {
        return;
      }

      if (key === 'r') {
        event.preventDefault();
        movementsQuery.refetch();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <section id={SETTLEMENT_DAMAGE_REPORT_ID} className={`surface overflow-hidden ${flushTop ? '' : 'mt-6'}`}>
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-700">{t('damagedStock.inflowTab')}</h2>
          </div>
          <div className="flex flex-wrap justify-end gap-2 no-print">
            <TableReportActions targetId={SETTLEMENT_DAMAGE_REPORT_ID} title={t('damagedStock.inflowTab')} fileName="settlement-damage-history" entityType="settlement_damage_history" t={t} shortcuts={DAMAGE_INFLOW_REPORT_SHORTCUTS} />
            <button type="button" className="btn-secondary shrink-0" onClick={() => movementsQuery.refetch()}>
              <RefreshCw size={16} />
              {t('stockLedger.refresh')}
              <kbd className="ml-1 rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500">Alt+R</kbd>
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

      {loading ? null : (
        <MobileCardList>
          {records.map((record) => (
            <MobileListCard
              key={record.id}
              title={record.productName}
              subtitle={record.businessDate ? formatDate(record.businessDate, language) : formatDateTime(record.createdAt, language)}
              value={formatNumber(record.quantityOut, language)}
              valueClass="text-rose-600"
              valueSub={record.note || null}
            />
          ))}
        </MobileCardList>
      )}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3 text-left">{t('damagedStock.settlementDamageDate')}</th>
              <th className="px-4 py-3 text-left">{t('damagedStock.settlementDamageProduct')}</th>
              <th className="px-4 py-3 text-right">{t('damagedStock.settlementDamagePieces')}</th>
              <th className="px-4 py-3 text-left">{t('damagedStock.settlementDamageSource')}</th>
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
                  <td className="max-w-xs truncate px-4 py-3 text-slate-500">
                    {record.note || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>
      {loading ? (
        <div className="p-5"><TableSkeleton columns={4} showHeader={false} /></div>
      ) : null}

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
        <div className="flex flex-col items-center gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-center">
          <span className="muted-chip">{formatNumber(total, language)} {t('common.records')}</span>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      ) : null}
    </section>
  );
}

