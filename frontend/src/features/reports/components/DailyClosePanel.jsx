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
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className={`text-sm ${strong ? 'font-bold text-slate-950' : 'font-medium text-slate-500'}`}>{label}</span>
      <span className={`text-sm tabular-nums ${strong ? 'font-black' : 'font-semibold'} ${toneClass}`}>{value}</span>
    </div>
  );
}

function CloseCard({ icon: Icon, title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-strong)]">
          <Icon size={16} />
        </span>
        <h3 className="text-sm font-bold text-slate-950">{title}</h3>
      </div>
      {children}
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
    <div id="daily-close-report" className="surface mb-6 overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
      </div>

      <div className="p-5">
        {/* Close-out checklist */}
        {flags.length === 0 ? (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[var(--success-line)] bg-[var(--success-soft)] px-4 py-3">
            <CheckCircle2 size={18} className="shrink-0 text-[var(--success)]" />
            <p className="text-sm font-semibold text-[var(--success-strong)]">{t('reports.close.allClear')}</p>
          </div>
        ) : (
          <div className="mb-4 space-y-2">
            {flags.map((flag) => (
              <div key={flag} className="flex items-center gap-3 rounded-2xl border border-[var(--warning-line)] bg-[var(--warning-soft)] px-4 py-3">
                <AlertTriangle size={18} className="shrink-0 text-[var(--warning)]" />
                <p className="text-sm font-semibold text-[var(--warning-strong)]">{flag}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Cash reconciliation */}
          <CloseCard icon={Wallet} title={t('reports.close.cashTitle')}>
            <Line label={t('reports.close.settlementCash')} value={formatCurrency(close.settlementCash, language)} tone="emerald" />
            <Line label={t('reports.close.dueCollected')} value={formatCurrency(close.dueCollected, language)} tone="emerald" />
            <Line label={t('reports.close.srCollected')} value={formatCurrency(close.srCollected, language)} tone="emerald" />
            <div className="my-1 border-t border-slate-100" />
            <Line label={t('reports.close.cashIn')} value={formatCurrency(close.cashIn, language)} strong />
            <Line label={t('reports.close.expenses')} value={`- ${formatCurrency(close.expensesTotal, language)}`} tone="rose" />
            <Line label={t('reports.close.salaries')} value={`- ${formatCurrency(close.salaryTotal, language)}`} tone="rose" />
            <Line label={t('reports.close.purchasesPaid')} value={`- ${formatCurrency(close.purchasesPaid, language)}`} tone="rose" />
            <div className="my-1 border-t border-slate-100" />
            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
              <span className="flex items-center gap-2 text-sm font-bold text-slate-950">
                {close.netCash >= 0 ? <ArrowUpCircle size={16} className="text-emerald-600" /> : <ArrowDownCircle size={16} className="text-rose-600" />}
                {t('reports.close.netCash')}
              </span>
              <span className={`text-lg font-black tabular-nums ${close.netCash >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(close.netCash, language)}
              </span>
            </div>
          </CloseCard>

          {/* Dues movement */}
          <CloseCard icon={ClipboardCheck} title={t('reports.close.duesTitle')}>
            <Line label={t('reports.close.newDue')} value={formatCurrency(close.newDue, language)} tone={close.newDue > 0 ? 'rose' : 'slate'} />
            <Line label={t('reports.close.collectedToday')} value={formatCurrency(close.dueCollected, language)} tone="emerald" />
            <Line
              label={t('reports.close.netDueChange')}
              value={formatCurrency(close.newDue - close.dueCollected, language)}
              tone={close.newDue - close.dueCollected > 0 ? 'rose' : 'emerald'}
              strong
            />
            <div className="my-1 border-t border-slate-100" />
            <Line label={t('reports.close.outstandingDue')} value={formatCurrency(close.outstandingDue, language)} tone="rose" strong />
            <p className="mt-2 text-xs font-medium text-slate-400">{t('reports.close.outstandingNote')}</p>
          </CloseCard>

          {/* Stock position */}
          <CloseCard icon={PackageSearch} title={t('reports.close.stockTitle')}>
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
            <div className="my-1 border-t border-slate-100" />
            <Line
              label={t('reports.close.currentStock')}
              value={`${formatNumber(close.stockPiecesNow, language)} ${t('common.pcs')} · ${formatCurrency(close.stockValueNow, language)}`}
              strong
            />
          </CloseCard>

          {/* Day P&L */}
          <CloseCard icon={TrendingUp} title={t('reports.close.plTitle')}>
            {profitTotals ? (
              <>
                <Line label={t('reports.close.revenue')} value={formatCurrency(profitTotals.revenue, language)} />
                <Line label={t('reports.close.grossProfit')} value={formatCurrency(profitTotals.grossProfit, language)} tone="emerald" />
                <Line label={t('reports.close.expenses')} value={`- ${formatCurrency(profitTotals.expenses, language)}`} tone="rose" />
                <div className="my-1 border-t border-slate-100" />
                <Line
                  label={t('reports.close.netProfit')}
                  value={formatCurrency(profitTotals.profit, language)}
                  tone={profitTotals.profit >= 0 ? 'emerald' : 'rose'}
                  strong
                />
              </>
            ) : (
              <p className="py-4 text-sm font-medium text-slate-400">{t('reports.close.noProfitData')}</p>
            )}
          </CloseCard>
        </div>
      </div>
    </div>
  );
}
