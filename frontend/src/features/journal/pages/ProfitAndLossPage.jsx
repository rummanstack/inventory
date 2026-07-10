import { useEffect, useState } from 'react';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { Alert, SectionHeader, TableSkeleton, cx } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency } from '../../../utils/calculations.js';
import { inventoryApi } from '../../../services/inventoryApi.js';

function PnlLine({ label, value, language, bold, indent }) {
  return (
    <div className={cx('flex items-center justify-between py-1.5', bold && 'border-t border-slate-200 pt-2.5 font-bold')}>
      <span className={cx(indent && 'pl-4', bold ? 'text-slate-950' : 'text-slate-600')}>{label}</span>
      <span className={cx('font-semibold', value < 0 ? 'text-rose-600' : 'text-slate-950')}>{formatCurrency(value, language)}</span>
    </div>
  );
}

export default function ProfitAndLossPage() {
  const { language } = useInventoryApp();
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', comparisonDateFrom: '', comparisonDateTo: '', showZeroAccounts: false });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const result = await inventoryApi.getProfitAndLoss({
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
          comparisonDateFrom: filters.comparisonDateFrom || undefined,
          comparisonDateTo: filters.comparisonDateTo || undefined,
          showZeroAccounts: filters.showZeroAccounts,
        });
        if (!cancelled) {
          setData(result);
          setError('');
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError?.message || 'Failed to load profit and loss.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [filters.dateFrom, filters.dateTo, filters.comparisonDateFrom, filters.comparisonDateTo, filters.showZeroAccounts]);

  return (
    <div>
      <SectionHeader eyebrow="Accounting" title="Profit & Loss" description="Revenue and expense performance calculated directly from journal postings." />

      <div className="surface overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 p-5 no-print">
          <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <DatePickerField value={filters.dateFrom} onChange={(value) => setFilters((current) => ({ ...current, dateFrom: value }))} placeholder="Date from" />
            <DatePickerField value={filters.dateTo} onChange={(value) => setFilters((current) => ({ ...current, dateTo: value }))} placeholder="Date to" min={filters.dateFrom || null} />
            <DatePickerField value={filters.comparisonDateFrom} onChange={(value) => setFilters((current) => ({ ...current, comparisonDateFrom: value }))} placeholder="Comparison from" />
            <DatePickerField value={filters.comparisonDateTo} onChange={(value) => setFilters((current) => ({ ...current, comparisonDateTo: value }))} placeholder="Comparison to" min={filters.comparisonDateFrom || null} />
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" checked={filters.showZeroAccounts} onChange={(event) => setFilters((current) => ({ ...current, showZeroAccounts: event.target.checked }))} /> Show zero accounts</label>
          </div>
          <TableReportActions targetId="profit-and-loss-report" title="Profit & Loss" fileName="profit-and-loss" entityType="profit_and_loss_report" t={(key) => key} />
        </div>
        {loading ? (
          <div className="p-5"><TableSkeleton columns={2} /></div>
        ) : error ? (
          <div className="p-5"><Alert type="error">{error}</Alert></div>
        ) : data ? (
          <div id="profit-and-loss-report" className="p-5">
            <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 p-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Revenue</p>
              {(data.current?.revenue?.rows || []).map((row) => <PnlLine key={row.code} label={row.name} value={row.amount} language={language} indent />)}
              <PnlLine label="Revenue Total" value={data.current?.revenue?.total || 0} language={language} bold />

              <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Cost of Goods Sold</p>
              {(data.current?.costOfGoodsSold?.rows || []).map((row) => <PnlLine key={row.code} label={row.name} value={row.amount} language={language} indent />)}
              <PnlLine label="COGS Total" value={data.current?.costOfGoodsSold?.total || 0} language={language} bold />

              <PnlLine label="Gross Profit" value={data.current?.grossProfit || 0} language={language} bold />

              <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Operating Expenses</p>
              {(data.current?.operatingExpenses?.rows || []).map((row) => <PnlLine key={row.code} label={row.name} value={row.amount} language={language} indent />)}
              <PnlLine label="Operating Expenses Total" value={data.current?.operatingExpenses?.total || 0} language={language} bold />

              <PnlLine label="Operating Profit" value={data.current?.operatingProfit || 0} language={language} bold />

              <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Other Income</p>
              {(data.current?.otherIncome?.rows || []).map((row) => <PnlLine key={row.code} label={row.name} value={row.amount} language={language} indent />)}
              <PnlLine label="Other Income Total" value={data.current?.otherIncome?.total || 0} language={language} bold />

              <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Other Expenses</p>
              {(data.current?.otherExpenses?.rows || []).map((row) => <PnlLine key={row.code} label={row.name} value={row.amount} language={language} indent />)}
              <PnlLine label="Other Expenses Total" value={data.current?.otherExpenses?.total || 0} language={language} bold />

              <div className="mt-4 flex items-center justify-between rounded-xl border-2 border-slate-300 bg-white px-4 py-3">
                <span className="text-base font-semibold uppercase tracking-[0.08em] text-slate-950">
                  {(data.current?.netProfit || 0) < 0 ? 'Net Loss' : 'Net Profit'}
                </span>
                <span className={cx('text-lg font-bold', (data.current?.netProfit || 0) < 0 ? 'text-rose-600' : 'text-emerald-700')}>
                  {formatCurrency(Math.abs(data.current?.netProfit || 0), language)}
                </span>
              </div>

              {data.comparison ? (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Comparison Period</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Net Profit</div><div className={cx('mt-1 text-base font-semibold', (data.current?.netProfit || 0) < 0 ? 'text-rose-600' : 'text-slate-950')}>{formatCurrency(data.current?.netProfit || 0, language)}</div></div>
                    <div><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Comparison Net Profit</div><div className={cx('mt-1 text-base font-semibold', (data.comparison?.netProfit || 0) < 0 ? 'text-rose-600' : 'text-slate-950')}>{formatCurrency(data.comparison?.netProfit || 0, language)}</div></div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
