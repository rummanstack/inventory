import TableReportActions from '../../../components/TableReportActions.jsx';
import { Alert, Badge, CopyableText, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency } from '../../../utils/calculations.js';
import { useMemo, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useReportReferenceData } from '../hooks/useReportReferenceData.js';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

export default function TrialBalancePage() {
  const { language } = useInventoryApp();
  const { accounts, fiscalYears, periods, loading: refLoading, error: refError } = useReportReferenceData();
  const [filters, setFilters] = useState({ fiscalYearId: '', accountingPeriodId: '', dateFrom: '', dateTo: '', accountCode: '', showZeroAccounts: false });
  const query = useTenantReportQuery({
    scope: 'accounting-trial-balance',
    params: filters,
    keepPrevious: true,
    queryFn: () => inventoryApi.getTrialBalance({
      fiscalYearId: filters.fiscalYearId || undefined,
      accountingPeriodId: filters.accountingPeriodId || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      accountCode: filters.accountCode || undefined,
      showZeroAccounts: filters.showZeroAccounts,
    }),
  });
  const data = query.data || null;
  const loading = query.isPending;
  const error = query.error?.message || '';

  const availablePeriods = useMemo(() => {
    if (!filters.fiscalYearId) return periods;
    return periods.filter((period) => period.fiscalYearId === filters.fiscalYearId);
  }, [filters.fiscalYearId, periods]);

  return (
    <div>
      <SectionHeader eyebrow="Accounting" title="Trial Balance" description="Opening, movement, and closing totals calculated directly from the journal engine." />
      <div className="surface overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 p-5 no-print">
          <div className="grid flex-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <select className="input" value={filters.fiscalYearId} onChange={(event) => setFilters((current) => ({ ...current, fiscalYearId: event.target.value, accountingPeriodId: '' }))}>
              <option value="">All fiscal years</option>
              {fiscalYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
            </select>
            <select className="input" value={filters.accountingPeriodId} onChange={(event) => setFilters((current) => ({ ...current, accountingPeriodId: event.target.value }))}>
              <option value="">All periods</option>
              {availablePeriods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}
            </select>
            <DatePickerField value={filters.dateFrom} onChange={(value) => setFilters((current) => ({ ...current, dateFrom: value }))} placeholder="Date from" />
            <DatePickerField value={filters.dateTo} onChange={(value) => setFilters((current) => ({ ...current, dateTo: value }))} placeholder="Date to" min={filters.dateFrom || null} />
            <select className="input" value={filters.accountCode} onChange={(event) => setFilters((current) => ({ ...current, accountCode: event.target.value }))}>
              <option value="">All accounts</option>
              {accounts.map((account) => <option key={account.code} value={account.code}>{account.code} - {account.name}</option>)}
            </select>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" checked={filters.showZeroAccounts} onChange={(event) => setFilters((current) => ({ ...current, showZeroAccounts: event.target.checked }))} /> Show zero accounts</label>
          </div>
          <TableReportActions targetId="trial-balance-report" title="Trial Balance" fileName="trial-balance" entityType="trial_balance_report" t={(key) => key} />
        </div>
        {refError ? <div className="p-5"><Alert type="error">{refError}</Alert></div> : null}
        {error ? <div className="p-5"><Alert type="error">{error}</Alert></div> : null}
        {loading || refLoading ? <div className="p-5"><TableSkeleton columns={8} /></div> : null}
        {!loading && !refLoading && data ? (
          <div id="trial-balance-report" className="overflow-x-auto">
            <table className="w-full min-w-[1320px]">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3 text-left">Account</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-right">Opening Dr</th>
                  <th className="px-4 py-3 text-right">Opening Cr</th>
                  <th className="px-4 py-3 text-right">Debit</th>
                  <th className="px-4 py-3 text-right">Credit</th>
                  <th className="px-4 py-3 text-right">Closing Dr</th>
                  <th className="px-4 py-3 text-right">Closing Cr</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows.map((row) => (
                  <tr key={row.code} className="hover:bg-slate-50">
                    <td className="table-cell"><CopyableText value={row.code} displayValue={`${row.code} - ${row.name}`} copyLabel="account code" textClassName="font-semibold text-slate-950" /></td>
                    <td className="table-cell text-slate-500">{row.type}</td>
                    <td className="table-cell text-right">{row.openingDebit ? formatCurrency(row.openingDebit, language) : '-'}</td>
                    <td className="table-cell text-right">{row.openingCredit ? formatCurrency(row.openingCredit, language) : '-'}</td>
                    <td className="table-cell text-right">{row.debit ? formatCurrency(row.debit, language) : '-'}</td>
                    <td className="table-cell text-right">{row.credit ? formatCurrency(row.credit, language) : '-'}</td>
                    <td className="table-cell text-right">{row.closingDebit ? formatCurrency(row.closingDebit, language) : '-'}</td>
                    <td className="table-cell text-right">{row.closingCredit ? formatCurrency(row.closingCredit, language) : '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 font-bold">
                  <td className="table-cell" colSpan={2}>{data.balanced ? <Badge tone="emerald">Balanced</Badge> : <Badge tone="rose">Out of Balance</Badge>}</td>
                  <td className="table-cell text-right">{formatCurrency(data.openingDebit, language)}</td>
                  <td className="table-cell text-right">{formatCurrency(data.openingCredit, language)}</td>
                  <td className="table-cell text-right">{formatCurrency(data.debit, language)}</td>
                  <td className="table-cell text-right">{formatCurrency(data.credit, language)}</td>
                  <td className="table-cell text-right">{formatCurrency(data.closingDebit, language)}</td>
                  <td className="table-cell text-right">{formatCurrency(data.closingCredit, language)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
