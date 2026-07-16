import { useState } from 'react';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { Alert, SectionHeader, TableSkeleton, cx } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency } from '../../../utils/calculations.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

const PROFIT_AND_LOSS_REPORT_ID = 'profit-and-loss-report';
const PROFIT_AND_LOSS_SHORTCUTS = {
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  csv: { alt: true, key: 'c', label: 'Alt+C' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

function PnlLine({ label, value, language, bold, indent }) {
  return (
    <div className={cx('flex items-center justify-between py-1.5', bold && 'border-t border-slate-200 pt-2.5 font-bold')}>
      <span className={cx(indent && 'pl-4', bold ? 'text-slate-950' : 'text-slate-600')}>{label}</span>
      <span className={cx('font-semibold', value < 0 ? 'text-rose-600' : 'text-slate-950')}>{formatCurrency(value, language)}</span>
    </div>
  );
}

export default function ProfitAndLossPage() {
  const { t, language } = useInventoryApp();
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', comparisonDateFrom: '', comparisonDateTo: '', showZeroAccounts: false });
  const query = useTenantReportQuery({
    scope: 'accounting-profit-and-loss',
    params: filters,
    keepPrevious: true,
    queryFn: () => inventoryApi.getProfitAndLoss({
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      comparisonDateFrom: filters.comparisonDateFrom || undefined,
      comparisonDateTo: filters.comparisonDateTo || undefined,
      showZeroAccounts: filters.showZeroAccounts,
    }),
  });
  const data = query.data || null;
  const loading = query.isPending;
  const error = query.error?.message || '';

  return (
    <div>
      <SectionHeader eyebrow={t('journal.eyebrow')} title={t('journal.profitAndLossTitle')} description={t('journal.profitAndLossDescription')} />

      <div className="surface overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 p-5 no-print">
          <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <DatePickerField value={filters.dateFrom} onChange={(value) => setFilters((current) => ({ ...current, dateFrom: value }))} placeholder={t('journal.dateFrom')} />
            <DatePickerField value={filters.dateTo} onChange={(value) => setFilters((current) => ({ ...current, dateTo: value }))} placeholder={t('journal.dateTo')} min={filters.dateFrom || null} />
            <DatePickerField value={filters.comparisonDateFrom} onChange={(value) => setFilters((current) => ({ ...current, comparisonDateFrom: value }))} placeholder={t('journal.comparisonDateFrom')} />
            <DatePickerField value={filters.comparisonDateTo} onChange={(value) => setFilters((current) => ({ ...current, comparisonDateTo: value }))} placeholder={t('journal.comparisonDateTo')} min={filters.comparisonDateFrom || null} />
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" checked={filters.showZeroAccounts} onChange={(event) => setFilters((current) => ({ ...current, showZeroAccounts: event.target.checked }))} /> {t('journal.showZeroAccounts')}</label>
          </div>
          <TableReportActions targetId={PROFIT_AND_LOSS_REPORT_ID} title={t('journal.profitAndLossTitle')} fileName="profit-and-loss" entityType="profit_and_loss_report" t={t} shortcuts={PROFIT_AND_LOSS_SHORTCUTS} />
        </div>
        {loading ? (
          <div className="p-5"><TableSkeleton columns={2} /></div>
        ) : error ? (
          <div className="p-5"><Alert type="error">{error}</Alert></div>
        ) : data ? (
          <div id={PROFIT_AND_LOSS_REPORT_ID} className="p-5">
            <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 p-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('journal.revenue')}</p>
              {(data.current?.revenue?.rows || []).map((row) => <PnlLine key={row.code} label={row.name} value={row.amount} language={language} indent />)}
              <PnlLine label={t('journal.revenueTotal')} value={data.current?.revenue?.total || 0} language={language} bold />

              <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('journal.costOfGoodsSold')}</p>
              {(data.current?.costOfGoodsSold?.rows || []).map((row) => <PnlLine key={row.code} label={row.name} value={row.amount} language={language} indent />)}
              <PnlLine label={t('journal.cogsTotal')} value={data.current?.costOfGoodsSold?.total || 0} language={language} bold />

              <PnlLine label={t('journal.grossProfit')} value={data.current?.grossProfit || 0} language={language} bold />

              <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('journal.operatingExpenses')}</p>
              {(data.current?.operatingExpenses?.rows || []).map((row) => <PnlLine key={row.code} label={row.name} value={row.amount} language={language} indent />)}
              <PnlLine label={t('journal.operatingExpensesTotal')} value={data.current?.operatingExpenses?.total || 0} language={language} bold />

              <PnlLine label={t('journal.operatingProfit')} value={data.current?.operatingProfit || 0} language={language} bold />

              <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('journal.otherIncome')}</p>
              {(data.current?.otherIncome?.rows || []).map((row) => <PnlLine key={row.code} label={row.name} value={row.amount} language={language} indent />)}
              <PnlLine label={t('journal.otherIncomeTotal')} value={data.current?.otherIncome?.total || 0} language={language} bold />

              <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('journal.otherExpenses')}</p>
              {(data.current?.otherExpenses?.rows || []).map((row) => <PnlLine key={row.code} label={row.name} value={row.amount} language={language} indent />)}
              <PnlLine label={t('journal.otherExpensesTotal')} value={data.current?.otherExpenses?.total || 0} language={language} bold />

              <div className="mt-4 flex items-center justify-between rounded-xl border-2 border-slate-300 bg-white px-4 py-3">
                <span className="text-base font-semibold uppercase tracking-[0.08em] text-slate-950">
                  {(data.current?.netProfit || 0) < 0 ? t('journal.netLoss') : t('journal.netProfit')}
                </span>
                <span className={cx('text-lg font-bold', (data.current?.netProfit || 0) < 0 ? 'text-rose-600' : 'text-emerald-700')}>
                  {formatCurrency(Math.abs(data.current?.netProfit || 0), language)}
                </span>
              </div>

              {data.comparison ? (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('journal.comparisonPeriod')}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{t('journal.netProfit')}</div><div className={cx('mt-1 text-base font-semibold', (data.current?.netProfit || 0) < 0 ? 'text-rose-600' : 'text-slate-950')}>{formatCurrency(data.current?.netProfit || 0, language)}</div></div>
                    <div><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{t('journal.comparisonNetProfitLabel')}</div><div className={cx('mt-1 text-base font-semibold', (data.comparison?.netProfit || 0) < 0 ? 'text-rose-600' : 'text-slate-950')}>{formatCurrency(data.comparison?.netProfit || 0, language)}</div></div>
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
