import { useState } from 'react';
import { at } from '../../accounting-foundation/accountingTranslations.js';
import { Activity } from 'lucide-react';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { Alert, Badge, EmptyState, SectionHeader, TableSkeleton, cx } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency } from '../../../utils/calculations.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

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
        <span>{at('Total')}</span>
        <span>{formatCurrency(total, language)}</span>
      </div>
    </div>
  );
}

export default function CashFlowPage() {
  const { language } = useInventoryApp();
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '' });
  const enabled = Boolean(filters.dateFrom && filters.dateTo);
  const query = useTenantReportQuery({
    scope: 'accounting-cash-flow',
    params: filters,
    enabled,
    keepPrevious: true,
    queryFn: () => inventoryApi.getCashFlow(filters),
  });
  const data = enabled ? (query.data || null) : null;
  const loading = query.isPending && enabled;
  const error = query.error?.message || '';

  return (
    <div>
      <SectionHeader eyebrow={at('Accounting')} title={at('Cash Flow')} description={at('Indirect cash flow built dynamically from journal movement and profit activity.')} />
      <div className="surface overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 p-5 no-print">
          <div className="grid flex-1 gap-3 sm:max-w-lg sm:grid-cols-2">
            <DatePickerField value={filters.dateFrom} onChange={(value) => setFilters((current) => ({ ...current, dateFrom: value }))} placeholder={at('Date from')} />
            <DatePickerField value={filters.dateTo} onChange={(value) => setFilters((current) => ({ ...current, dateTo: value }))} placeholder={at('Date to')} min={filters.dateFrom || null} />
          </div>
          <TableReportActions targetId="cash-flow-report" title={at('Cash Flow')} fileName="cash-flow" entityType="cash_flow_report" t={(key) => key} />
        </div>
        {error ? <div className="p-5"><Alert type="error">{error}</Alert></div> : null}
        {loading ? <div className="p-5"><TableSkeleton columns={3} /></div> : null}
        {!loading && !data ? <div className="p-10"><EmptyState icon={Activity} title={at('Select a date range')} description={at('Cash flow requires both a start date and an end date.')} /></div> : null}
        {!loading && data ? (
          <div id="cash-flow-report" className="space-y-4 p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-4"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{at('Opening Cash')}</div><div className="mt-1 text-lg font-semibold text-slate-950">{formatCurrency(data.openingCash || 0, language)}</div></div>
              <div className="rounded-xl border border-slate-200 p-4"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{at('Net Cash Movement')}</div><div className={cx('mt-1 text-lg font-semibold', (data.netCashMovement || 0) < 0 ? 'text-rose-600' : 'text-slate-950')}>{formatCurrency(data.netCashMovement || 0, language)}</div></div>
              <div className="rounded-xl border border-slate-200 p-4"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{at('Closing Cash')}</div><div className="mt-1 text-lg font-semibold text-slate-950">{formatCurrency(data.closingCash || 0, language)}</div></div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <CashFlowSection title={at('Operating Activities')} rows={data.operatingActivities || []} total={data.operatingTotal || 0} language={language} />
              <CashFlowSection title={at('Investing Activities')} rows={data.investingActivities || []} total={data.investingTotal || 0} language={language} />
              <CashFlowSection title={at('Financing Activities')} rows={data.financingActivities || []} total={data.financingTotal || 0} language={language} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-slate-300 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{at('Cash Flow Check')}</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {formatCurrency(data.netCashMovement || 0, language)} vs {formatCurrency((data.operatingTotal || 0) + (data.investingTotal || 0) + (data.financingTotal || 0), language)}
                </p>
              </div>
              {data.balanced ? <Badge tone="emerald">{at('Balanced')}</Badge> : <Badge tone="amber">{at('Review')}</Badge>}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
