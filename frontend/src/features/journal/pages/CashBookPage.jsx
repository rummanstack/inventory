import { useState } from 'react';
import { at } from '../../accounting-foundation/accountingTranslations.js';
import { Wallet } from 'lucide-react';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { Alert, CopyableText, EmptyState, MobileCardList, MobileListCard, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, formatDate } from '../../../utils/calculations.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useReportReferenceData } from '../hooks/useReportReferenceData.js';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

function CashOrBankBookPage({ title, kind, reportId }) {
  const { language } = useInventoryApp();
  const { accounts, loading: refLoading, error: refError } = useReportReferenceData();
  const filteredAccounts = accounts.filter((account) => (kind === 'BANK' ? account.isBankAccount : account.isCashAccount));
  const [filters, setFilters] = useState({ accountCode: '', dateFrom: '', dateTo: '', voucherNumber: '', reference: '' });
  const query = useTenantReportQuery({
    scope: `accounting-${kind.toLowerCase()}-book`,
    params: filters,
    keepPrevious: true,
    queryFn: () => kind === 'BANK' ? inventoryApi.getBankBook(filters) : inventoryApi.getCashBook(filters),
  });
  const data = query.data || null;
  const loading = query.isPending;
  const error = query.error?.message || '';

  return (
    <div>
      <SectionHeader eyebrow={at('Accounting')} title={title} description={`${title} generated from cash and bank journal activity with running balance.`} />
      <div className="surface overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 p-5 no-print">
          <div className="grid flex-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <select className="input" value={filters.accountCode} onChange={(event) => setFilters((current) => ({ ...current, accountCode: event.target.value }))}>
              <option value="">{kind === 'BANK' ? 'All bank accounts' : 'All cash accounts'}</option>
              {filteredAccounts.map((account) => <option key={account.code} value={account.code}>{account.code} - {account.name}</option>)}
            </select>
            <DatePickerField value={filters.dateFrom} onChange={(value) => setFilters((current) => ({ ...current, dateFrom: value }))} placeholder={at('Date from')} />
            <DatePickerField value={filters.dateTo} onChange={(value) => setFilters((current) => ({ ...current, dateTo: value }))} placeholder={at('Date to')} min={filters.dateFrom || null} />
            <input className="input" placeholder={at('Voucher')} value={filters.voucherNumber} onChange={(event) => setFilters((current) => ({ ...current, voucherNumber: event.target.value }))} />
            <input className="input" placeholder={at('Reference')} value={filters.reference} onChange={(event) => setFilters((current) => ({ ...current, reference: event.target.value }))} />
          </div>
          <TableReportActions targetId={reportId} title={title} fileName={reportId} entityType={reportId} t={(key) => key} />
        </div>
        {refError ? <div className="p-5"><Alert type="error">{refError}</Alert></div> : null}
        {error ? <div className="p-5"><Alert type="error">{error}</Alert></div> : null}
        {loading || refLoading ? <div className="p-5"><TableSkeleton columns={8} /></div> : null}
        {!loading && !refLoading && data && data.lines.length === 0 ? (
          <div className="p-10">
            <EmptyState icon={Wallet} title={`No ${title.toLowerCase()} entries`} description={at('Adjust the filters or wait for posted journal activity in the selected accounts.')} />
          </div>
        ) : null}
        {!loading && !refLoading && data && data.lines.length > 0 ? (
          <div id={reportId} className="overflow-x-auto">
            <div className="grid gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4 md:grid-cols-3">
              <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{at('Opening Balance')}</div><div className="mt-1 text-lg font-semibold text-slate-950">{formatCurrency(data.openingBalance || 0, language)}</div></div>
              <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{at('Closing Balance')}</div><div className="mt-1 text-lg font-semibold text-slate-950">{formatCurrency(data.closingBalance || 0, language)}</div></div>
            </div>
            <MobileCardList>
              {data.lines.map((line) => (
                <MobileListCard
                  key={line.id}
                  title={line.accountName || line.accountCode}
                  subtitle={`${formatDate(line.entryDate, language)} · ${line.voucherNumber || line.documentNumber || line.voucherType}`}
                  value={line.debit ? formatCurrency(line.debit, language) : line.credit ? `- ${formatCurrency(line.credit, language)}` : '-'}
                  valueClass={line.debit ? 'text-emerald-700' : line.credit ? 'text-rose-600' : undefined}
                  valueSub={formatCurrency(line.runningBalance, language)}
                />
              ))}
            </MobileCardList>
            <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1280px]">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3 text-left">{at('Date')}</th>
                  <th className="px-4 py-3 text-left">{at('Voucher')}</th>
                  <th className="px-4 py-3 text-left">{at('Type')}</th>
                  <th className="px-4 py-3 text-left">{at('Account')}</th>
                  <th className="px-4 py-3 text-left">{at('Reference')}</th>
                  <th className="px-4 py-3 text-right">{at('Debit')}</th>
                  <th className="px-4 py-3 text-right">{at('Credit')}</th>
                  <th className="px-4 py-3 text-right">{at('Balance')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.lines.map((line) => (
                  <tr key={line.id} className="hover:bg-slate-50">
                    <td className="table-cell">{formatDate(line.entryDate, language)}</td>
                    <td className="table-cell"><CopyableText value={line.voucherNumber || line.documentNumber || line.sourceId} displayValue={line.voucherNumber || line.documentNumber || String(line.sourceId).slice(0, 12)} copyLabel="voucher number" textClassName="font-semibold text-slate-950" /></td>
                    <td className="table-cell text-slate-500">{line.voucherType}</td>
                    <td className="table-cell"><div className="font-semibold text-slate-950">{line.accountCode}</div><div className="text-xs text-slate-500">{line.accountName}</div></td>
                    <td className="table-cell text-sm text-slate-600">{line.referenceNumber || line.referenceName || line.memo || '-'}</td>
                    <td className="table-cell text-right">{line.debit ? formatCurrency(line.debit, language) : '-'}</td>
                    <td className="table-cell text-right">{line.credit ? formatCurrency(line.credit, language) : '-'}</td>
                    <td className="table-cell text-right font-semibold text-slate-950">{formatCurrency(line.runningBalance, language)}</td>
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

export default function CashBookPage() {
  return <CashOrBankBookPage title={at('Cash Book')} kind="CASH" reportId="cash-book-report" />;
}

export function BankBookPage() {
  return <CashOrBankBookPage title={at('Bank Book')} kind="BANK" reportId="bank-book-report" />;
}
