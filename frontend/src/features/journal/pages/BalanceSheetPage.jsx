import { Alert, Badge, SectionHeader, TableSkeleton, cx } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency } from '../../../utils/calculations.js';
import { useBalanceSheetViewModel } from '../viewmodels/useBalanceSheetViewModel';

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

export default function BalanceSheetPage() {
  const { t, language } = useInventoryApp();
  const vm = useBalanceSheetViewModel();

  return (
    <div>
      <SectionHeader eyebrow={t('journal.eyebrow')} title={t('journal.tabBalanceSheet')} description={t('journal.description')} />

      <div className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="max-w-xs">
            <label className="label">{t('journal.asOfDate')}</label>
            <DatePickerField value={vm.asOfDate} onChange={vm.setAsOfDate} />
          </div>
        </div>
        {vm.loading ? (
          <div className="p-5"><TableSkeleton columns={3} /></div>
        ) : vm.error ? (
          <div className="p-5"><Alert type="error">{vm.error}</Alert></div>
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
      </div>
    </div>
  );
}
