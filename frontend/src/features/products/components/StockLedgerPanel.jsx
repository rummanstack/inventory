import { useEffect, useState } from 'react';
import { ClipboardList, Download, FileSpreadsheet, Printer, RefreshCw } from 'lucide-react';
import { Alert, Badge, EmptyState, Pagination, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { downloadSheetPdf } from '../../../services/printService.js';
import { formatDateTime, formatNumber, todayISO } from '../../../utils/calculations.js';
import { usePagination } from '../../../hooks/usePagination.js';

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

export default function StockLedgerPanel({ products, t, refreshKey = 0, fixedType, sectionTitle, sectionDescription, printTarget = false }) {
  const today = todayISO();
  const [productId, setProductId] = useState('');
  const [dateFrom, setDateFrom] = useState(subtractDays(today, 29));
  const [dateTo, setDateTo] = useState(today);
  const [movements, setMovements] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const { page, setPage, resetPage } = usePagination({ pageSize: LEDGER_PAGE_SIZE });

  useEffect(() => {
    resetPage();
  }, [productId, dateFrom, dateTo, resetPage]);

  useEffect(() => {
    let cancelled = false;

    async function loadMovements() {
      try {
        setLoading(true);
        setError('');
        const result = await inventoryApi.listStockMovements({
          page,
          pageSize: LEDGER_PAGE_SIZE,
          productId,
          type: fixedType,
          dateFrom,
          dateTo,
        });

        if (!cancelled) {
          setMovements(result.items || []);
          setTotal(result.total || 0);
          setTotalPages(result.totalPages || 0);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message);
          setMovements([]);
          setTotal(0);
          setTotalPages(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMovements();
    return () => {
      cancelled = true;
    };
  }, [page, productId, dateFrom, dateTo, version, refreshKey, fixedType]);

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

  return (
    <section id={printTarget ? STOCK_LEDGER_PRINT_ID : undefined} className={`surface mt-6 overflow-hidden ${printTarget ? 'print-target' : ''}`}>
      <div className={`border-b border-slate-100 px-5 py-4 ${printTarget ? 'no-print' : ''}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="brand-chip">{t('stockLedger.eyebrow')}</p>
            <h2 className="mt-3 text-lg font-black text-slate-950">{sectionTitle || t('stockLedger.title')}</h2>
            <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-500">{sectionDescription || t('stockLedger.description')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {printTarget ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { inventoryApi.recordPrint({ entityType: 'stock_ledger', entityId: null, label: 'pdf' }).catch(() => {}); downloadSheetPdf(STOCK_LEDGER_PRINT_ID, `stock-ledger-${dateFrom}-${dateTo}.pdf`); }}
              >
                <Download size={16} />
                {t('purchaseReceive.downloadPdf')}
              </button>
            ) : null}
            <button type="button" className="btn-secondary" onClick={handleExportExcel}>
              <FileSpreadsheet size={16} />
              {t('common.exportExcel')}
            </button>
            {printTarget ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { inventoryApi.recordPrint({ entityType: 'stock_ledger', entityId: null, label: 'print' }).catch(() => {}); window.print(); }}
              >
                <Printer size={16} />
                {t('common.print')}
              </button>
            ) : null}
            <button type="button" className="btn-secondary" onClick={() => setVersion((value) => value + 1)}>
              <RefreshCw size={16} />
              {t('stockLedger.refresh')}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <label className="label">{t('stockLedger.product')}</label>
            <select className="input" value={productId} onChange={(event) => setProductId(event.target.value)}>
              <option value="">{t('stockLedger.allProducts')}</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('stockLedger.dateFrom')}</label>
            <DatePickerField value={dateFrom} onChange={setDateFrom} />
          </div>
          <div>
            <label className="label">{t('stockLedger.dateTo')}</label>
            <DatePickerField value={dateTo} onChange={setDateTo} />
          </div>
        </div>
      </div>

      {error ? (
        <div className="p-5">
          <Alert type="error">{error}</Alert>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">{t('stockLedger.when')}</th>
              <th className="px-4 py-3">{t('stockLedger.product')}</th>
              <th className="px-4 py-3">{t('stockLedger.type')}</th>
              <th className="px-4 py-3 text-right">{t('stockLedger.quantityIn')}</th>
              <th className="px-4 py-3 text-right">{t('stockLedger.quantityOut')}</th>
              <th className="px-4 py-3 text-right">{t('stockLedger.balanceAfter')}</th>
              <th className="hidden px-4 py-3 lg:table-cell">{t('stockLedger.reference')}</th>
              <th className="hidden px-4 py-3 xl:table-cell">{t('stockLedger.createdBy')}</th>
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
                  <td className="table-cell text-right font-black text-emerald-700">
                    {movement.quantityIn ? `+${formatNumber(movement.quantityIn)}` : '-'}
                  </td>
                  <td className="table-cell text-right font-black text-rose-700">
                    {movement.quantityOut ? `-${formatNumber(movement.quantityOut)}` : '-'}
                  </td>
                  <td className="table-cell text-right font-black text-slate-950">{formatNumber(movement.balanceAfter)}</td>
                  <td className="hidden table-cell lg:table-cell">
                    <p className="max-w-52 truncate text-xs font-semibold text-slate-600">{formatReference(movement)}</p>
                  </td>
                  <td className="hidden table-cell xl:table-cell">
                    <p className="font-semibold text-slate-950">{movement.createdByName || '-'}</p>
                    <p className="text-xs text-slate-500">{movement.createdByRole || ''}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          )}
        </table>
        {loading ? (
          <div className="p-5">
            <TableSkeleton columns={8} showHeader={false} />
          </div>
        ) : null}
      </div>

      {!loading && !error && !movements.length ? (
        <div className="p-5">
          <EmptyState title={t('stockLedger.emptyTitle')} description={t('stockLedger.emptyDescription')} icon={ClipboardList} />
        </div>
      ) : null}

      {!loading && !error && movements.length ? (
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 no-print sm:flex-row sm:items-center sm:justify-between">
          <span className="muted-chip">{formatNumber(total)} {t('common.records')}</span>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      ) : null}
    </section>
  );
}
