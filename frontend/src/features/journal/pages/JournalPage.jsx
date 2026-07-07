import { BookOpen, Scale } from 'lucide-react';
import { Alert, Badge, EmptyState, SectionHeader, TableSkeleton, Select, cx } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, formatDateTime } from '../../../utils/calculations.js';
import { useJournalViewModel } from '../viewmodels/useJournalViewModel';

export default function JournalPage() {
  const { t, language } = useInventoryApp();
  const vm = useJournalViewModel();

  const selectedAccount = vm.accounts.find((account) => account.code === vm.accountCode) || null;
  let runningBalance = 0;

  return (
    <div>
      <SectionHeader eyebrow={t('journal.eyebrow')} title={t('journal.title')} description={t('journal.description')} />

      <div className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-wrap gap-2 text-sm font-bold">
            <button
              type="button"
              className={cx('btn-secondary h-9 gap-1.5', vm.tab === 'trial-balance' && 'btn-primary')}
              onClick={() => vm.setTab('trial-balance')}
            >
              <Scale size={16} />
              {t('journal.tabTrialBalance')}
            </button>
            <button
              type="button"
              className={cx('btn-secondary h-9 gap-1.5', vm.tab === 'general-ledger' && 'btn-primary')}
              onClick={() => vm.setTab('general-ledger')}
            >
              <BookOpen size={16} />
              {t('journal.tabGeneralLedger')}
            </button>
          </div>
        </div>

        {vm.tab === 'trial-balance' ? (
          <>
            <div className="border-b border-slate-100 p-5">
              <div className="max-w-xs">
                <label className="label">{t('journal.asOfDate')}</label>
                <DatePickerField value={vm.asOfDate} onChange={vm.setAsOfDate} />
              </div>
            </div>
            {vm.trialBalanceLoading ? (
              <div className="p-5"><TableSkeleton columns={5} /></div>
            ) : vm.trialBalanceError ? (
              <div className="p-5"><Alert type="error">{vm.trialBalanceError}</Alert></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">{t('journal.account')}</th>
                      <th className="px-4 py-3">{t('journal.type')}</th>
                      <th className="px-4 py-3 text-right">{t('journal.debit')}</th>
                      <th className="px-4 py-3 text-right">{t('journal.credit')}</th>
                      <th className="px-4 py-3 text-right">{t('journal.balance')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(vm.trialBalance?.rows || []).map((row) => (
                      <tr key={row.code} className="hover:bg-slate-50">
                        <td className="table-cell font-semibold text-slate-950">{row.code} — {row.name}</td>
                        <td className="table-cell text-slate-500">{row.type}</td>
                        <td className="table-cell text-right">{row.totalDebit ? formatCurrency(row.totalDebit, language) : '-'}</td>
                        <td className="table-cell text-right">{row.totalCredit ? formatCurrency(row.totalCredit, language) : '-'}</td>
                        <td className={cx('table-cell text-right font-bold', row.closingBalance < 0 ? 'text-rose-600' : 'text-slate-950')}>
                          {formatCurrency(row.closingBalance, language)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 font-bold">
                      <td className="table-cell" colSpan={2}>
                        {vm.trialBalance?.balanced ? (
                          <Badge tone="emerald">{t('journal.balanced')}</Badge>
                        ) : (
                          <Badge tone="rose">{t('journal.outOfBalance')}</Badge>
                        )}
                      </td>
                      <td className="table-cell text-right">{formatCurrency(vm.trialBalance?.totalDebit || 0, language)}</td>
                      <td className="table-cell text-right">{formatCurrency(vm.trialBalance?.totalCredit || 0, language)}</td>
                      <td className="table-cell" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        ) : (
          <>
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
            {vm.ledgerLoading ? (
              <div className="p-5"><TableSkeleton columns={6} /></div>
            ) : vm.ledgerError ? (
              <div className="p-5"><Alert type="error">{vm.ledgerError}</Alert></div>
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
          </>
        )}
      </div>
    </div>
  );
}
