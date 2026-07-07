import { Alert, Badge, SectionHeader, TableSkeleton, cx } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency } from '../../../utils/calculations.js';
import { useTrialBalanceViewModel } from '../viewmodels/useTrialBalanceViewModel';

export default function TrialBalancePage() {
  const { t, language } = useInventoryApp();
  const vm = useTrialBalanceViewModel();

  return (
    <div>
      <SectionHeader eyebrow={t('journal.eyebrow')} title={t('journal.tabTrialBalance')} description={t('journal.description')} />

      <div className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="max-w-xs">
            <label className="label">{t('journal.asOfDate')}</label>
            <DatePickerField value={vm.asOfDate} onChange={vm.setAsOfDate} />
          </div>
        </div>
        {vm.loading ? (
          <div className="p-5"><TableSkeleton columns={5} /></div>
        ) : vm.error ? (
          <div className="p-5"><Alert type="error">{vm.error}</Alert></div>
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
      </div>
    </div>
  );
}
