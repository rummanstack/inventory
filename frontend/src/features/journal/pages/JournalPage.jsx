import { BookOpen, Scale, Landmark, TrendingUp } from 'lucide-react';
import { Alert, Badge, EmptyState, SectionHeader, TableSkeleton, Select, cx } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, formatDateTime } from '../../../utils/calculations.js';
import { useJournalViewModel } from '../viewmodels/useJournalViewModel';

const TABS = [
  { id: 'trial-balance', labelKey: 'journal.tabTrialBalance', icon: Scale },
  { id: 'general-ledger', labelKey: 'journal.tabGeneralLedger', icon: BookOpen },
  { id: 'balance-sheet', labelKey: 'journal.tabBalanceSheet', icon: Landmark },
  { id: 'profit-and-loss', labelKey: 'journal.tabProfitAndLoss', icon: TrendingUp },
];

function BalanceSheetGroup({ title, rows, total, language, t }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <div className="mt-3 space-y-2">
        {rows.length ? rows.map((row) => (
          <div key={row.code} className="flex items-center justify-between text-sm">
            <span className="text-slate-600">{row.name}</span>
            <span className="font-semibold text-slate-950">{formatCurrency(row.closingBalance, language)}</span>
          </div>
        )) : (
          <p className="text-sm text-slate-400">-</p>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-bold">
        <span>{t('common.total')}</span>
        <span>{formatCurrency(total, language)}</span>
      </div>
    </div>
  );
}

function PnlLine({ label, value, language, bold, indent }) {
  return (
    <div className={cx('flex items-center justify-between py-1.5', bold && 'border-t border-slate-200 pt-2.5 font-bold')}>
      <span className={cx(indent && 'pl-4', bold ? 'text-slate-950' : 'text-slate-600')}>{label}</span>
      <span className={cx('font-semibold', value < 0 ? 'text-rose-600' : 'text-slate-950')}>{formatCurrency(value, language)}</span>
    </div>
  );
}

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
            {TABS.map(({ id, labelKey, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={cx('btn-secondary h-9 gap-1.5', vm.tab === id && 'btn-primary')}
                onClick={() => vm.setTab(id)}
              >
                <Icon size={16} />
                {t(labelKey)}
              </button>
            ))}
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
        ) : null}

        {vm.tab === 'general-ledger' ? (
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
        ) : null}

        {vm.tab === 'balance-sheet' ? (
          <>
            <div className="border-b border-slate-100 p-5">
              <div className="max-w-xs">
                <label className="label">{t('journal.asOfDate')}</label>
                <DatePickerField value={vm.asOfDate} onChange={vm.setAsOfDate} />
              </div>
            </div>
            {vm.balanceSheetLoading ? (
              <div className="p-5"><TableSkeleton columns={3} /></div>
            ) : vm.balanceSheetError ? (
              <div className="p-5"><Alert type="error">{vm.balanceSheetError}</Alert></div>
            ) : vm.balanceSheet ? (
              <div className="p-5 space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <BalanceSheetGroup
                    title={t('journal.assets')}
                    rows={vm.balanceSheet.assets}
                    total={vm.balanceSheet.totalAssets}
                    language={language}
                    t={t}
                  />
                  <div className="space-y-4">
                    <BalanceSheetGroup
                      title={t('journal.liabilities')}
                      rows={vm.balanceSheet.liabilities}
                      total={vm.balanceSheet.totalLiabilities}
                      language={language}
                      t={t}
                    />
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('journal.equity')}</p>
                      <div className="mt-3 space-y-2">
                        {vm.balanceSheet.equity.map((row) => (
                          <div key={row.code} className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">{row.name}</span>
                            <span className="font-semibold text-slate-950">{formatCurrency(row.closingBalance, language)}</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">{t('journal.retainedEarnings')}</span>
                          <span className={cx('font-semibold', vm.balanceSheet.retainedEarnings < 0 ? 'text-rose-600' : 'text-slate-950')}>
                            {formatCurrency(vm.balanceSheet.retainedEarnings, language)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-bold">
                        <span>{t('journal.totalEquity')}</span>
                        <span>{formatCurrency(vm.balanceSheet.totalEquity, language)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border-2 border-slate-300 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t('journal.balanceSheetIdentity')}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        {formatCurrency(vm.balanceSheet.totalAssets, language)} = {formatCurrency(vm.balanceSheet.totalLiabilities, language)} + {formatCurrency(vm.balanceSheet.totalEquity, language)}
                      </p>
                    </div>
                    {vm.balanceSheet.balanced ? (
                      <Badge tone="emerald">{t('journal.balanced')}</Badge>
                    ) : (
                      <Badge tone="rose">{t('journal.outOfBalance')}</Badge>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {vm.tab === 'profit-and-loss' ? (
          <>
            <div className="border-b border-slate-100 p-5">
              <div className="grid gap-3 sm:grid-cols-2 max-w-lg">
                <DatePickerField value={vm.plDateFrom} onChange={vm.setPlDateFrom} placeholder={t('journal.dateFrom')} />
                <DatePickerField value={vm.plDateTo} onChange={vm.setPlDateTo} placeholder={t('journal.dateTo')} min={vm.plDateFrom} />
              </div>
            </div>
            {vm.profitAndLossLoading ? (
              <div className="p-5"><TableSkeleton columns={2} /></div>
            ) : vm.profitAndLossError ? (
              <div className="p-5"><Alert type="error">{vm.profitAndLossError}</Alert></div>
            ) : vm.profitAndLoss ? (
              <div className="p-5">
                <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 p-5">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('journal.revenue')}</p>
                  <PnlLine label={t('journal.salesRevenue')} value={vm.profitAndLoss.revenue.salesRevenue} language={language} indent />
                  <PnlLine label={t('journal.salesReturns')} value={-vm.profitAndLoss.revenue.salesReturns} language={language} indent />
                  <PnlLine label={t('journal.discountsGiven')} value={-vm.profitAndLoss.revenue.discountsGiven} language={language} indent />
                  <PnlLine label={t('journal.netRevenue')} value={vm.profitAndLoss.revenue.netRevenue} language={language} bold />

                  <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('journal.costOfGoodsSold')}</p>
                  <PnlLine label={t('journal.costOfGoodsSold')} value={vm.profitAndLoss.costOfGoodsSold.costOfGoodsSold} language={language} indent />
                  <PnlLine label={t('journal.purchaseReturns')} value={-vm.profitAndLoss.costOfGoodsSold.purchaseReturns} language={language} indent />
                  <PnlLine label={t('journal.netCostOfGoodsSold')} value={vm.profitAndLoss.costOfGoodsSold.netCostOfGoodsSold} language={language} bold />

                  <PnlLine label={t('journal.grossProfit')} value={vm.profitAndLoss.grossProfit} language={language} bold />

                  <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('journal.expenses')}</p>
                  <PnlLine label={t('journal.operatingExpenses')} value={vm.profitAndLoss.expenses.operatingExpenses} language={language} indent />
                  <PnlLine label={t('journal.salaryExpense')} value={vm.profitAndLoss.expenses.salaryExpense} language={language} indent />
                  <PnlLine label={t('journal.stockAdjustment')} value={vm.profitAndLoss.expenses.stockAdjustment} language={language} indent />
                  <PnlLine label={t('journal.totalExpenses')} value={vm.profitAndLoss.expenses.totalOperatingExpenses} language={language} bold />

                  <div className="mt-4 flex items-center justify-between rounded-xl border-2 border-slate-300 bg-white px-4 py-3">
                    <span className="text-base font-semibold uppercase tracking-[0.08em] text-slate-950">
                      {vm.profitAndLoss.netProfit < 0 ? t('journal.netLoss') : t('journal.netProfit')}
                    </span>
                    <span className={cx('text-lg font-bold', vm.profitAndLoss.netProfit < 0 ? 'text-rose-600' : 'text-emerald-700')}>
                      {formatCurrency(Math.abs(vm.profitAndLoss.netProfit), language)}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
