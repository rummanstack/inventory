import { useEffect, useState } from 'react';
import { vt } from '../voucherTranslations.js';
import { BookOpen } from 'lucide-react';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { Alert, CopyableText, EmptyState, MobileCardList, MobileListCard, SectionHeader, TableSkeleton } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, formatDate } from '../../../utils/calculations.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

export default function JournalRegisterPage() {
  const { language } = useInventoryApp();
  const [filters, setFilters] = useState({ voucherType: '', dateFrom: '', dateTo: '' });
  const registerQuery = useTenantReportQuery({
    scope: 'journal-register',
    params: filters,
    queryFn: () => inventoryApi.getJournalRegister(filters),
    keepPrevious: true,
  });
  const rows = registerQuery.data?.rows || [];
  const loading = registerQuery.isPending;
  const error = registerQuery.error?.message || '';

  return (
    <div>
      <SectionHeader eyebrow={vt(language, 'Accounting')} title={vt(language, 'Journal Register')} description={vt(language, 'Posted vouchers mapped to their resulting journal entries.')} />
      <div className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 no-print">
          <div className="grid flex-1 gap-3 md:grid-cols-3">
            <select className="input" value={filters.voucherType} onChange={(event) => setFilters((current) => ({ ...current, voucherType: event.target.value }))}>
              <option value="">{vt(language, 'All voucher types')}</option>
              <option value="JOURNAL">{vt(language, 'Journal')}</option>
              <option value="RECEIPT">{vt(language, 'Receipt')}</option>
              <option value="PAYMENT">{vt(language, 'Payment')}</option>
              <option value="CONTRA">{vt(language, 'Contra')}</option>
            </select>
            <DatePickerField value={filters.dateFrom} onChange={(value) => setFilters((current) => ({ ...current, dateFrom: value }))} placeholder={vt(language, 'Date from')} />
            <DatePickerField value={filters.dateTo} onChange={(value) => setFilters((current) => ({ ...current, dateTo: value }))} placeholder={vt(language, 'Date to')} min={filters.dateFrom || null} />
          </div>
          <TableReportActions targetId="journal-register-report" title={vt(language, 'Journal Register')} fileName="journal-register" entityType="journal_register" t={(key) => key} />
        </div>
        {loading ? <div className="p-5"><TableSkeleton columns={7} /></div> : null}
        {error ? <div className="p-5"><Alert type="error">{error}</Alert></div> : null}
        {!loading && !error ? (
          rows.length ? (
            <div id="journal-register-report">
              <MobileCardList>
                {rows.map((row) => (
                  <MobileListCard
                    key={`${row.voucherNumber}-${row.journalEntryId}`}
                    title={row.voucherNumber}
                    subtitle={`${vt(language, row.voucherType)} · ${formatDate(row.voucherDate, language)}`}
                    value={formatCurrency(row.totalDebit, language)}
                    valueClass="text-emerald-700"
                    valueSub={formatCurrency(row.totalCredit, language)}
                  />
                ))}
              </MobileCardList>
              <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1080px]">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3 text-left">{vt(language, 'Voucher')}</th>
                    <th className="px-4 py-3 text-left">{vt(language, 'Journal Entry')}</th>
                    <th className="px-4 py-3 text-left">{vt(language, 'Date')}</th>
                    <th className="px-4 py-3 text-left">{vt(language, 'Type')}</th>
                    <th className="px-4 py-3 text-left">{vt(language, 'Memo')}</th>
                    <th className="px-4 py-3 text-right">{vt(language, 'Debit')}</th>
                    <th className="px-4 py-3 text-right">{vt(language, 'Credit')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={`${row.voucherNumber}-${row.journalEntryId}`} className="hover:bg-slate-50">
                      <td className="table-cell">
                        <div className="font-semibold text-slate-950">{row.voucherNumber}</div>
                        <div className="text-xs text-slate-500">{vt(language, row.voucherType)}</div>
                      </td>
                      <td className="table-cell"><CopyableText value={row.journalEntryId} displayValue={row.journalEntryId} copyLabel="journal entry id" textClassName="font-mono text-xs text-slate-950" /></td>
                      <td className="table-cell">{formatDate(row.voucherDate, language)}</td>
                      <td className="table-cell">{row.sourceType}</td>
                      <td className="table-cell text-sm text-slate-600">{row.memo || row.narration || '-'}</td>
                      <td className="table-cell text-right font-semibold text-slate-950">{formatCurrency(row.totalDebit, language)}</td>
                      <td className="table-cell text-right font-semibold text-slate-950">{formatCurrency(row.totalCredit, language)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          ) : (
            <div className="p-10"><EmptyState icon={BookOpen} title={vt(language, 'No posted vouchers yet')} description={vt(language, 'Journal register rows appear after vouchers are posted.')} /></div>
          )
        ) : null}
      </div>
    </div>
  );
}
