import { useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { Alert, CopyableText, EmptyState, MobileCardList, MobileListCard, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, formatDate } from '../../../utils/calculations.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useReportReferenceData } from '../hooks/useReportReferenceData.js';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

function LedgerPage({ title, endpoint }) {
  const { language } = useInventoryApp();
  const { accounts, customers, suppliers, loading: refLoading, error: refError } = useReportReferenceData();
  const [filters, setFilters] = useState({ accountCode: '', dateFrom: '', dateTo: '', voucherNumber: '', reference: '', customerId: '', supplierId: '' });
  const requiresAccount = endpoint === 'account';
  const query = useTenantReportQuery({
    scope: `accounting-${endpoint}-ledger`,
    params: filters,
    enabled: !requiresAccount || Boolean(filters.accountCode),
    keepPrevious: true,
    queryFn: () => requiresAccount ? inventoryApi.getAccountLedger(filters) : inventoryApi.getGeneralLedger(filters),
  });
  const data = requiresAccount && !filters.accountCode ? null : (query.data || null);
  const loading = query.isPending && (!requiresAccount || Boolean(filters.accountCode));
  const error = query.error?.message || '';

  const emptyTitle = requiresAccount ? 'Select an account' : 'No ledger entries';
  const emptyDescription = requiresAccount
    ? 'The account ledger will load once an account is selected.'
    : 'No journal lines matched the current filters.';

  return (
    <div>
      <SectionHeader eyebrow="Accounting" title={title} description="Journal-driven ledger with opening balance, transaction flow, and running balance." />
      <div className="surface overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 p-5 no-print">
          <div className="grid flex-1 gap-3 md:grid-cols-3 xl:grid-cols-7">
            <select className="input" value={filters.accountCode} onChange={(event) => setFilters((current) => ({ ...current, accountCode: event.target.value }))}>
              <option value="">{requiresAccount ? 'Select account' : 'All accounts'}</option>
              {accounts.map((account) => <option key={account.code} value={account.code}>{account.code} - {account.name}</option>)}
            </select>
            <DatePickerField value={filters.dateFrom} onChange={(value) => setFilters((current) => ({ ...current, dateFrom: value }))} placeholder="Date from" />
            <DatePickerField value={filters.dateTo} onChange={(value) => setFilters((current) => ({ ...current, dateTo: value }))} placeholder="Date to" min={filters.dateFrom || null} />
            <input className="input" placeholder="Voucher" value={filters.voucherNumber} onChange={(event) => setFilters((current) => ({ ...current, voucherNumber: event.target.value }))} />
            <input className="input" placeholder="Reference" value={filters.reference} onChange={(event) => setFilters((current) => ({ ...current, reference: event.target.value }))} />
            <select className="input" value={filters.customerId} onChange={(event) => setFilters((current) => ({ ...current, customerId: event.target.value }))}>
              <option value="">All customers</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
            </select>
            <select className="input" value={filters.supplierId} onChange={(event) => setFilters((current) => ({ ...current, supplierId: event.target.value }))}>
              <option value="">All suppliers</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </div>
          <TableReportActions targetId={`${endpoint}-ledger-report`} title={title} fileName={title.toLowerCase().replace(/\s+/g, '-')} entityType={`${endpoint}_ledger_report`} t={(key) => key} />
        </div>
        {refError ? <div className="p-5"><Alert type="error">{refError}</Alert></div> : null}
        {error ? <div className="p-5"><Alert type="error">{error}</Alert></div> : null}
        {loading || refLoading ? <div className="p-5"><TableSkeleton columns={9} /></div> : null}
        {!loading && !refLoading && !data ? <div className="p-10"><EmptyState icon={BookOpen} title={emptyTitle} description={emptyDescription} /></div> : null}
        {!loading && !refLoading && data ? (
          <div id={`${endpoint}-ledger-report`} className="overflow-x-auto">
            {data.openingBalance !== null && data.openingBalance !== undefined ? (
              <div className="grid gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4 md:grid-cols-3">
                <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Opening Balance</div><div className="mt-1 text-lg font-semibold text-slate-950">{formatCurrency(data.openingBalance || 0, language)}</div></div>
                {data.closingBalance !== null && data.closingBalance !== undefined ? <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Closing Balance</div><div className="mt-1 text-lg font-semibold text-slate-950">{formatCurrency(data.closingBalance || 0, language)}</div></div> : <div />}
              </div>
            ) : null}
            <MobileCardList>
              {data.lines.map((line) => (
                <MobileListCard
                  key={line.id}
                  title={line.accountName || line.accountCode}
                  subtitle={`${formatDate(line.entryDate, language)} · ${line.voucherNumber || line.documentNumber || line.voucherType}`}
                  value={line.debit ? formatCurrency(line.debit, language) : line.credit ? `- ${formatCurrency(line.credit, language)}` : '-'}
                  valueClass={line.debit ? 'text-emerald-700' : line.credit ? 'text-rose-600' : undefined}
                  valueSub={line.runningBalance !== undefined ? formatCurrency(line.runningBalance, language) : null}
                />
              ))}
            </MobileCardList>
            <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1320px]">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Voucher</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Account</th>
                  <th className="px-4 py-3 text-left">Reference</th>
                  <th className="px-4 py-3 text-left">Narration</th>
                  <th className="px-4 py-3 text-right">Debit</th>
                  <th className="px-4 py-3 text-right">Credit</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.lines.map((line) => (
                  <tr key={line.id} className="hover:bg-slate-50">
                    <td className="table-cell">{formatDate(line.entryDate, language)}</td>
                    <td className="table-cell"><CopyableText value={line.voucherNumber || line.documentNumber || line.sourceId} displayValue={line.voucherNumber || line.documentNumber || String(line.sourceId).slice(0, 12)} copyLabel="voucher number" textClassName="font-semibold text-slate-950" /></td>
                    <td className="table-cell text-slate-500">{line.voucherType}</td>
                    <td className="table-cell"><div className="font-semibold text-slate-950">{line.accountCode}</div><div className="text-xs text-slate-500">{line.accountName}</div></td>
                    <td className="table-cell text-sm text-slate-600">{line.referenceNumber || line.referenceName || line.partyName || '-'}</td>
                    <td className="table-cell text-sm text-slate-600">{line.memo || '-'}</td>
                    <td className="table-cell text-right">{line.debit ? formatCurrency(line.debit, language) : '-'}</td>
                    <td className="table-cell text-right">{line.credit ? formatCurrency(line.credit, language) : '-'}</td>
                    <td className="table-cell text-right font-semibold text-slate-950">{line.runningBalance !== undefined ? formatCurrency(line.runningBalance, language) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function GeneralLedgerPage() {
  return <LedgerPage title="General Ledger" endpoint="general" />;
}

export function AccountLedgerPage() {
  return <LedgerPage title="Account Ledger" endpoint="account" />;
}
