import { Alert, SectionHeader, TableSkeleton, cx } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency } from '../../../utils/calculations.js';
import { useProfitAndLossViewModel } from '../viewmodels/useProfitAndLossViewModel';

function PnlLine({ label, value, language, bold, indent }) {
  return (
    <div className={cx('flex items-center justify-between py-1.5', bold && 'border-t border-slate-200 pt-2.5 font-bold')}>
      <span className={cx(indent && 'pl-4', bold ? 'text-slate-950' : 'text-slate-600')}>{label}</span>
      <span className={cx('font-semibold', value < 0 ? 'text-rose-600' : 'text-slate-950')}>{formatCurrency(value, language)}</span>
    </div>
  );
}

export default function ProfitAndLossPage() {
  const { t, language } = useInventoryApp();
  const vm = useProfitAndLossViewModel();

  return (
    <div>
      <SectionHeader eyebrow={t('journal.eyebrow')} title={t('journal.tabProfitAndLoss')} description={t('journal.description')} />

      <div className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="grid gap-3 sm:grid-cols-2 max-w-lg">
            <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} placeholder={t('journal.dateFrom')} />
            <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} placeholder={t('journal.dateTo')} min={vm.dateFrom} />
          </div>
        </div>
        {vm.loading ? (
          <div className="p-5"><TableSkeleton columns={2} /></div>
        ) : vm.error ? (
          <div className="p-5"><Alert type="error">{vm.error}</Alert></div>
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
      </div>
    </div>
  );
}
