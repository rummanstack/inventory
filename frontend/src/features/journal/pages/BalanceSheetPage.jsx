import { useState } from 'react';
import { at } from '../../accounting-foundation/accountingTranslations.js';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { Alert, Badge, SectionHeader, TableSkeleton, cx } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency } from '../../../utils/calculations.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

function BalanceSheetGroup({ title, rows, total, language }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <div className="mt-3 space-y-2">
        {rows.length ? rows.map((row) => (
          <div key={row.code} className="flex items-center justify-between text-sm">
            <span className="text-slate-600">{row.name}</span>
            <span className="font-semibold text-slate-950">{formatCurrency(row.balance, language)}</span>
          </div>
        )) : (
          <p className="text-sm text-slate-400">-</p>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-bold">
        <span>{at('Total')}</span>
        <span>{formatCurrency(total, language)}</span>
      </div>
    </div>
  );
}

export default function BalanceSheetPage() {
  const { language } = useInventoryApp();
  const [filters, setFilters] = useState({ asOfDate: '', showZeroAccounts: false });
  const query = useTenantReportQuery({
    scope: 'accounting-balance-sheet',
    params: filters,
    keepPrevious: true,
    queryFn: () => inventoryApi.getBalanceSheet({ asOfDate: filters.asOfDate || undefined, showZeroAccounts: filters.showZeroAccounts }),
  });
  const data = query.data || null;
  const loading = query.isPending;
  const error = query.error?.message || '';

  return (
    <div>
      <SectionHeader eyebrow={at('Accounting')} title={at('Balance Sheet')} description={at('Assets, liabilities, and equity calculated dynamically from journal balances.')} />

      <div className="surface overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 p-5 no-print">
          <div className="flex flex-1 flex-wrap gap-3">
            <div className="min-w-[220px] max-w-xs">
              <label className="label">{at('As of date')}</label>
              <DatePickerField value={filters.asOfDate} onChange={(value) => setFilters((current) => ({ ...current, asOfDate: value }))} />
            </div>
            <label className="mt-6 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <input type="checkbox" checked={filters.showZeroAccounts} onChange={(event) => setFilters((current) => ({ ...current, showZeroAccounts: event.target.checked }))} />
              Show zero accounts
            </label>
          </div>
          <TableReportActions targetId="balance-sheet-report" title={at('Balance Sheet')} fileName="balance-sheet" entityType="balance_sheet_report" t={(key) => key} />
        </div>
        {loading ? (
          <div className="p-5"><TableSkeleton columns={3} /></div>
        ) : error ? (
          <div className="p-5"><Alert type="error">{error}</Alert></div>
        ) : data ? (
          <div id="balance-sheet-report" className="p-5 space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <BalanceSheetGroup
                title={at('Assets')}
                rows={[...(data.assets?.currentAssets || []), ...(data.assets?.fixedAssets || [])]}
                total={data.totalAssets}
                language={language}
              />
              <div className="space-y-4">
                <BalanceSheetGroup
                  title={at('Liabilities')}
                  rows={[...(data.liabilities?.currentLiabilities || []), ...(data.liabilities?.longTermLiabilities || [])]}
                  total={data.totalLiabilities}
                  language={language}
                />
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{at('Equity')}</p>
                  <div className="mt-3 space-y-2">
                    {(data.equity?.rows || []).map((row) => (
                      <div key={row.code} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{row.name}</span>
                        <span className="font-semibold text-slate-950">{formatCurrency(row.balance, language)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{at('Retained Earnings')}</span>
                      <span className={cx('font-semibold', (data.equity?.retainedEarnings || 0) < 0 ? 'text-rose-600' : 'text-slate-950')}>
                        {formatCurrency(data.equity?.retainedEarnings || 0, language)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-bold">
                    <span>{at('Total Equity')}</span>
                    <span>{formatCurrency(data.totalEquity, language)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-slate-300 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{at('Balance Sheet Identity')}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    {formatCurrency(data.totalAssets, language)} = {formatCurrency(data.totalLiabilities, language)} + {formatCurrency(data.totalEquity, language)}
                  </p>
                </div>
                {data.balanced ? (
                  <Badge tone="emerald">{at('Balanced')}</Badge>
                ) : (
                  <Badge tone="rose">{at('Out of Balance')}</Badge>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
