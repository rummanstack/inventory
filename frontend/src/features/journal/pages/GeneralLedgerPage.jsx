import { BookOpen } from 'lucide-react';
import { Alert, EmptyState, SectionHeader, TableSkeleton, Select, cx } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, formatDateTime } from '../../../utils/calculations.js';
import { useGeneralLedgerViewModel } from '../viewmodels/useGeneralLedgerViewModel';

export default function GeneralLedgerPage() {
  const { t, language } = useInventoryApp();
  const vm = useGeneralLedgerViewModel();

  const selectedAccount = vm.accounts.find((account) => account.code === vm.accountCode) || null;
  let runningBalance = 0;

  return (
    <div>
      <SectionHeader eyebrow={t('journal.eyebrow')} title={t('journal.tabGeneralLedger')} description={t('journal.description')} />

      <div className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select className="input" value={vm.accountCode} onChange={(event) => vm.setAccountCode(event.target.value)}>
              <option value="">{t('journal.allAccounts')}</option>
              {vm.accounts.map((account) => (
                <option key={account.code} value={account.code}>{account.code} — {account.name}</option>
              ))}
            </Select>
            <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} placeholder={t('journal.dateFrom')} />
            <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} placeholder={t('journal.dateTo')} min={vm.dateFrom} />
          </div>
        </div>
        {vm.loading ? (
          <div className="p-5"><TableSkeleton columns={6} /></div>
        ) : vm.error ? (
          <div className="p-5"><Alert type="error">{vm.error}</Alert></div>
        ) : vm.ledgerLines.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">{t('journal.date')}</th>
                  {vm.accountCode ? null : <th className="px-4 py-3">{t('journal.account')}</th>}
                  <th className="px-4 py-3">{t('journal.source')}</th>
                  <th className="px-4 py-3">{t('journal.memo')}</th>
                  <th className="px-4 py-3 text-right">{t('journal.debit')}</th>
                  <th className="px-4 py-3 text-right">{t('journal.credit')}</th>
                  {vm.accountCode ? <th className="px-4 py-3 text-right">{t('journal.balance')}</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vm.ledgerLines.map((line) => {
                  if (vm.accountCode && selectedAccount) {
                    runningBalance += selectedAccount.normalBalance === 'DEBIT'
                      ? line.debit - line.credit
                      : line.credit - line.debit;
                  }
                  return (
                    <tr key={line.id} className="hover:bg-slate-50">
                      <td className="table-cell">{formatDateTime(line.entryDate)}</td>
                      {vm.accountCode ? null : <td className="table-cell font-semibold text-slate-950">{line.accountCode} — {line.accountName}</td>}
                      <td className="table-cell text-slate-500">{line.sourceType}</td>
                      <td className="table-cell">{line.memo || '-'}</td>
                      <td className="table-cell text-right">{line.debit ? formatCurrency(line.debit, language) : '-'}</td>
                      <td className="table-cell text-right">{line.credit ? formatCurrency(line.credit, language) : '-'}</td>
                      {vm.accountCode ? (
                        <td className={cx('table-cell text-right font-bold', runningBalance < 0 ? 'text-rose-600' : 'text-slate-950')}>
                          {formatCurrency(runningBalance, language)}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5">
            <EmptyState title={t('journal.noEntriesTitle')} description={t('journal.noEntriesDescription')} icon={BookOpen} />
          </div>
        )}
      </div>
    </div>
  );
}
