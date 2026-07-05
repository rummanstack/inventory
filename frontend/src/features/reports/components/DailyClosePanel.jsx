import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, CheckCircle2, ClipboardCheck, PackageSearch, TrendingUp, Wallet } from 'lucide-react';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { formatCurrency, formatDate, formatNumber } from '../../../utils/calculations.js';

function Line({ label, value, tone = 'slate', strong = false }) {
  const toneClass = {
    slate: 'text-slate-950',
    emerald: 'text-emerald-600',
    rose: 'text-rose-600',
    amber: 'text-amber-600',
  }[tone];
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className={`text-sm ${strong ? 'font-bold text-slate-950' : 'font-medium text-slate-500'}`}>{label}</span>
      <span className={`text-right text-sm tabular-nums ${strong ? 'font-black' : 'font-semibold'} ${toneClass}`}>{value}</span>
    </div>
  );
}

function TotalRow({ label, value, positive, icon = true }) {
  return (
    <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
      <span className="flex items-center gap-2 text-sm font-bold text-slate-950">
        {icon ? (
          positive ? <ArrowUpCircle size={16} className="text-emerald-600" /> : <ArrowDownCircle size={16} className="text-rose-600" />
        ) : null}
        {label}
      </span>
      <span className={`text-base font-black tabular-nums ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>{value}</span>
    </div>
  );
}

function CloseBox({ icon: Icon, title, children }) {
  return (
    <div className="surface overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
        <Icon size={16} className="text-[var(--brand-strong)]" />
        <h3 className="section-title">{title}</h3>
      </div>
      <div className="divide-y divide-slate-100 px-5 py-3">{children}</div>
    </div>
  );
}

export default function DailyClosePanel({ close, totals, profitTotals, date, t, language }) {
  const flags = [];
  if (close.unsettledDsrs.length > 0) {
    const names = close.unsettledDsrs.slice(0, 3).map((d) => d.dsrName).join(', ');
    const extra = close.unsettledDsrs.length > 3 ? ` +${close.unsettledDsrs.length - 3}` : '';
    flags.push(t('reports.close.flagUnsettled', { count: formatNumber(close.unsettledDsrs.length, language), names: `${names}${extra}` }));
  }
  if (close.settlementsWithDue > 0) {
    flags.push(t('reports.close.flagNewDue', { count: formatNumber(close.settlementsWithDue, language) }));
  }
  if (totals.damagedPieces > 0) {
    flags.push(t('reports.close.flagDamaged', { count: formatNumber(totals.damagedPieces, language) }));
  }

  return (
    <div id="daily-close-report">
      {/* Section heading + export actions */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="section-title">{t('reports.close.title', { date: formatDate(date, language) })}</h2>
          <p className="mt-0.5 text-xs text-slate-400">{t('reports.close.description')}</p>
        </div>
        <TableReportActions
          targetId="daily-close-report"
          title={t('reports.close.title', { date: formatDate(date, language) })}
          subtitle={date}
          fileName={`daily-close-${date}`}
          entityType="daily_close"
          t={t}
          className="flex flex-wrap gap-2 no-print"
        />
      </div>

      {/* Close-out checklist */}
      <div className={`surface mb-4 p-5 ${flags.length === 0 ? '' : 'space-y-2.5'}`}>
        {flags.length === 0 ? (
          <div className="flex items-center gap-3">
            <CheckCircle2 size={17} className="shrink-0 text-[var(--success)]" />
            <p className="text-sm font-semibold text-[var(--success-strong)]">{t('reports.close.allClear')}</p>
          </div>
        ) : (
          flags.map((flag) => (
            <div key={flag} className="flex items-center gap-3 rounded-xl bg-[var(--warning-soft)] px-3 py-2.5">
              <AlertTriangle size={17} className="shrink-0 text-[var(--warning)]" />
              <p className="text-sm font-semibold text-[var(--warning-strong)]">{flag}</p>
            </div>
          ))
        )}
      </div>

      {/* Four separate boxes */}
      <div className="grid gap-4 lg:grid-cols-2">
        <CloseBox icon={Wallet} title={t('reports.close.cashTitle')}>
          <Line label={t('reports.close.settlementCash')} value={formatCurrency(close.settlementCash, language)} tone="emerald" />
          <Line label={t('reports.close.dueCollected')} value={formatCurrency(close.dueCollected, language)} tone="emerald" />
          <Line label={t('reports.close.srCollected')} value={formatCurrency(close.srCollected, language)} tone="emerald" />
          <Line label={t('reports.close.cashIn')} value={formatCurrency(close.cashIn, language)} strong />
          <Line label={t('reports.close.expenses')} value={`- ${formatCurrency(close.expensesTotal, language)}`} tone="rose" />
          <Line label={t('reports.close.salaries')} value={`- ${formatCurrency(close.salaryTotal, language)}`} tone="rose" />
          <Line label={t('reports.close.purchasesPaid')} value={`- ${formatCurrency(close.purchasesPaid, language)}`} tone="rose" />
          <TotalRow label={t('reports.close.netCash')} value={formatCurrency(close.netCash, language)} positive={close.netCash >= 0} />
        </CloseBox>

        <CloseBox icon={ClipboardCheck} title={t('reports.close.duesTitle')}>
          <Line label={t('reports.close.newDue')} value={formatCurrency(close.newDue, language)} tone={close.newDue > 0 ? 'rose' : 'slate'} />
          <Line label={t('reports.close.collectedToday')} value={formatCurrency(close.dueCollected, language)} tone="emerald" />
          <Line label={t('reports.close.outstandingDue')} value={formatCurrency(close.outstandingDue, language)} tone="rose" strong />
          <TotalRow
            label={t('reports.close.netDueChange')}
            value={formatCurrency(close.newDue - close.dueCollected, language)}
            positive={close.newDue - close.dueCollected <= 0}
          />
          <p className="pt-2 text-xs font-medium text-slate-400">{t('reports.close.outstandingNote')}</p>
        </CloseBox>

        <CloseBox icon={PackageSearch} title={t('reports.close.stockTitle')}>
          <Line
            label={t('reports.close.stockOut')}
            value={`${formatNumber(totals.issuedPieces, language)} ${t('common.pcs')} · ${formatCurrency(totals.issuedValue, language)}`}
          />
          <Line label={t('reports.close.stockReturned')} value={`${formatNumber(totals.returnedPieces, language)} ${t('common.pcs')}`} />
          <Line
            label={t('reports.close.damagedToday')}
            value={`${formatNumber(totals.damagedPieces, language)} ${t('common.pcs')}`}
            tone={totals.damagedPieces > 0 ? 'amber' : 'slate'}
          />
          <Line label={t('reports.close.purchasesToday')} value={formatCurrency(close.purchasesTotal, language)} />
          <Line
            label={t('reports.close.currentStock')}
            value={`${formatNumber(close.stockPiecesNow, language)} ${t('common.pcs')} · ${formatCurrency(close.stockValueNow, language)}`}
            strong
          />
        </CloseBox>

        <CloseBox icon={TrendingUp} title={t('reports.close.plTitle')}>
          {profitTotals ? (
            <>
              <Line label={t('reports.close.revenue')} value={formatCurrency(profitTotals.revenue, language)} />
              <Line label={t('reports.close.grossProfit')} value={formatCurrency(profitTotals.grossProfit, language)} tone="emerald" />
              <Line label={t('reports.close.expenses')} value={`- ${formatCurrency(profitTotals.expenses, language)}`} tone="rose" />
              <TotalRow label={t('reports.close.netProfit')} value={formatCurrency(profitTotals.profit, language)} positive={profitTotals.profit >= 0} />
            </>
          ) : (
            <p className="py-3 text-sm font-medium text-slate-400">{t('reports.close.noProfitData')}</p>
          )}
        </CloseBox>
      </div>
    </div>
  );
}
