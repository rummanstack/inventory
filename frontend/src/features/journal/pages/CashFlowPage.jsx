import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { Alert, Badge, EmptyState, SectionHeader, TableSkeleton, cx } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency } from '../../../utils/calculations.js';
import { inventoryApi } from '../../../services/inventoryApi.js';

function CashFlowSection({ title, rows, total, language }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <div className="mt-3 space-y-2">
        {rows.length ? rows.map((row) => (
          <div key={`${title}-${row.label}`} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-600">{row.label}</span>
            <span className={cx('font-semibold', row.amount < 0 ? 'text-rose-600' : 'text-slate-950')}>{formatCurrency(row.amount, language)}</span>
          </div>
        )) : <p className="text-sm text-slate-400">-</p>}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-bold">
        <span>Total</span>
        <span>{formatCurrency(total, language)}</span>
      </div>
    </div>
  );
}

export default function CashFlowPage() {
  const { language } = useInventoryApp();
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!filters.dateFrom || !filters.dateTo) {
      setData(null);
      setError('');
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const result = await inventoryApi.getCashFlow({
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        });
        if (!cancelled) {
          setData(result);
          setError('');
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError?.message || 'Failed to load cash flow.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [filters.dateFrom, filters.dateTo]);

  return (
    <div>
      <SectionHeader eyebrow="Accounting" title="Cash Flow" description="Indirect cash flow built dynamically from journal movement and profit activity." />
      <div className="surface overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 p-5 no-print">
          <div className="grid flex-1 gap-3 sm:max-w-lg sm:grid-cols-2">
            <DatePickerField value={filters.dateFrom} onChange={(value) => setFilters((current) => ({ ...current, dateFrom: value }))} placeholder="Date from" />
            <DatePickerField value={filters.dateTo} onChange={(value) => setFilters((current) => ({ ...current, dateTo: value }))} placeholder="Date to" min={filters.dateFrom || null} />
          </div>
          <TableReportActions targetId="cash-flow-report" title="Cash Flow" fileName="cash-flow" entityType="cash_flow_report" t={(key) => key} />
        </div>
        {error ? <div className="p-5"><Alert type="error">{error}</Alert></div> : null}
        {loading ? <div className="p-5"><TableSkeleton columns={3} /></div> : null}
        {!loading && !data ? <div className="p-10"><EmptyState icon={Activity} title="Select a date range" description="Cash flow requires both a start date and an end date." /></div> : null}
        {!loading && data ? (
          <div id="cash-flow-report" className="space-y-4 p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-4"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Opening Cash</div><div className="mt-1 text-lg font-semibold text-slate-950">{formatCurrency(data.openingCash || 0, language)}</div></div>
              <div className="rounded-xl border border-slate-200 p-4"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Net Cash Movement</div><div className={cx('mt-1 text-lg font-semibold', (data.netCashMovement || 0) < 0 ? 'text-rose-600' : 'text-slate-950')}>{formatCurrency(data.netCashMovement || 0, language)}</div></div>
              <div className="rounded-xl border border-slate-200 p-4"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Closing Cash</div><div className="mt-1 text-lg font-semibold text-slate-950">{formatCurrency(data.closingCash || 0, language)}</div></div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <CashFlowSection title="Operating Activities" rows={data.operatingActivities || []} total={data.operatingTotal || 0} language={language} />
              <CashFlowSection title="Investing Activities" rows={data.investingActivities || []} total={data.investingTotal || 0} language={language} />
              <CashFlowSection title="Financing Activities" rows={data.financingActivities || []} total={data.financingTotal || 0} language={language} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-slate-300 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Cash Flow Check</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {formatCurrency(data.netCashMovement || 0, language)} vs {formatCurrency((data.operatingTotal || 0) + (data.investingTotal || 0) + (data.financingTotal || 0), language)}
                </p>
              </div>
              {data.balanced ? <Badge tone="emerald">Balanced</Badge> : <Badge tone="amber">Review</Badge>}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
