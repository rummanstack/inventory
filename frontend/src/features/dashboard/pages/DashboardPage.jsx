import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  Building2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  HandCoins,
  Landmark,
  PackageCheck,
  Receipt,
  RefreshCw,
  ShoppingBag,
  Store,
  TrendingDown,
  TrendingUp,
  Truck,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  ChartPanel,
  EmptyState,
  HorizontalBarChart,
  SectionHeader,
  TrendChart,
  cx,
} from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, formatNumber } from '../../../utils/calculations.js';
import { getCssVar } from '../../../utils/theme.js';
import { ActivityCalendar } from '../components/ActivityCalendar.jsx';
import DashboardSkeleton from '../components/DashboardSkeleton.jsx';
import { useDashboardViewModel } from '../viewmodels/useDashboardViewModel.js';

const KPI_STYLES = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  rose: 'bg-rose-50 text-rose-700 ring-rose-100',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
};

function formatDelta(value, t) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return t('dashboard.noComparison');
  const absolute = Math.abs(Number(value)).toFixed(1);
  if (Number(value) === 0) return t('dashboard.noChange');
  return Number(value) > 0
    ? t('dashboard.comparisonUp', { value: absolute })
    : t('dashboard.comparisonDown', { value: absolute });
}

function KpiCard({ label, value, helper, delta, icon: Icon, tone = 'slate' }) {
  const positive = Number(delta) >= 0;
  return (
    <div className="group relative overflow-hidden rounded-card bg-white p-5 shadow-card ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className={cx('rounded-xl p-2.5 ring-1', KPI_STYLES[tone])}><Icon size={18} /></div>
        {delta !== undefined ? (
          <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold', positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
            {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{helper}
          </span>
        ) : null}
      </div>
      <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-[clamp(1.35rem,2vw,1.8rem)] font-semibold tabular-nums tracking-tight text-slate-950">{value}</p>
      {delta === undefined && helper ? <p className="mt-2 text-xs font-medium text-slate-500">{helper}</p> : null}
      <div className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-[var(--brand)] transition group-hover:scale-x-100" />
    </div>
  );
}

function SurfaceHeader({ eyebrow, title, description, icon: Icon }) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-xl bg-[var(--secondary-soft)] p-2.5 text-[var(--secondary-strong)]"><Icon size={17} /></div>
      <div>
        {eyebrow ? <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p> : null}
        <h2 className="text-base font-bold tracking-tight text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{description}</p> : null}
      </div>
    </div>
  );
}

function ActionCenter({ actions, t, onOpen }) {
  const severityClass = {
    critical: 'bg-rose-50 text-rose-700 ring-rose-100',
    warning: 'bg-amber-50 text-amber-700 ring-amber-100',
    info: 'bg-blue-50 text-blue-700 ring-blue-100',
  };
  return (
    <div className="surface h-full p-5">
      <SurfaceHeader icon={AlertTriangle} eyebrow={t('dashboard.liveBriefing')} title={t('dashboard.actionCenter')} description={t('dashboard.actionCenterDescription')} />
      <div className="mt-5 space-y-2.5">
        {actions.length ? actions.map((action) => (
          <button key={action.type} type="button" onClick={() => onOpen(action.route)} className="flex w-full items-center gap-3 rounded-xl bg-white px-3.5 py-3 text-left ring-1 ring-slate-200/70 transition hover:bg-slate-50">
            <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ring-1', severityClass[action.severity] || severityClass.info)}>
              {action.count || '!'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-slate-800">{t(`dashboard.actionTypes.${action.type}`)}</span>
              <span className="mt-0.5 block text-xs font-medium text-slate-500">
                {action.value !== undefined ? formatCurrency(action.value) : t(`dashboard.actionDescriptions.${action.type}`, { count: action.count || 0 })}
              </span>
            </span>
            <ArrowUpRight size={15} className="shrink-0 text-slate-400" />
          </button>
        )) : (
          <EmptyState title={t('dashboard.allClear')} description={t('dashboard.allClearDescription')} icon={PackageCheck} />
        )}
      </div>
    </div>
  );
}

function FinancialHealth({ financial, language, t }) {
  const rows = [
    { label: t('dashboard.cashInHand'), value: financial.cashInHand, color: 'bg-emerald-500' },
    { label: t('dashboard.cashInBank'), value: financial.cashInBank, color: 'bg-indigo-500' },
    { label: t('dashboard.receivables'), value: financial.receivables, color: 'bg-sky-500' },
    { label: t('dashboard.supplierDueTotal'), value: -financial.supplierPayables, color: 'bg-rose-500' },
  ];
  const scale = Math.max(...rows.map((row) => Math.abs(row.value)), 1);
  return (
    <div className="surface h-full p-5">
      <SurfaceHeader icon={Landmark} eyebrow={t('dashboard.financialHealth')} title={t('dashboard.liquidityPosition')} description={t('dashboard.financialHealthDescription')} />
      <div className="mt-5 space-y-3">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-slate-600">{row.label}</span>
              <span className={cx('font-bold tabular-nums', row.value < 0 ? 'text-rose-700' : 'text-slate-900')}>{formatCurrency(Math.abs(row.value), language)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={cx('h-full rounded-full', row.color)} style={{ width: `${Math.max(4, Math.abs(row.value) / scale * 100)}%` }} /></div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-950 px-4 py-3 text-white">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">{t('dashboard.netPosition')}</span>
        <span className="text-lg font-semibold tabular-nums">{formatCurrency(financial.netPosition, language)}</span>
      </div>
    </div>
  );
}

function DealerOperations({ operations, language, t }) {
  const maxCollected = Math.max(...operations.leaderboard.map((row) => row.collected), 1);
  return (
    <>
      <div className="surface p-5 xl:col-span-2">
        <SurfaceHeader icon={Truck} eyebrow={t('dashboard.dealerOperations')} title={t('dashboard.distributionPipeline')} description={t('dashboard.distributionPipelineDescription')} />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {operations.pipeline.map((stage, index) => (
            <div key={stage.key} className="relative rounded-card bg-slate-50 px-4 py-4 ring-1 ring-slate-200/70">
              <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{t(`dashboard.pipeline.${stage.key}`)}</span><span className="text-xs font-bold text-slate-300">0{index + 1}</span></div>
              <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-950">{stage.monetary ? formatCurrency(stage.value, language) : formatNumber(stage.value, language)}</p>
              {index < operations.pipeline.length - 1 ? <ArrowUpRight size={15} className="absolute -right-2.5 top-1/2 z-10 hidden rounded-full bg-white p-0.5 text-slate-400 ring-1 ring-slate-200 xl:block" /> : null}
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <KpiCard label={t('dashboard.issuedToday')} value={formatNumber(operations.today.issuedPieces, language)} helper={t('dashboard.issuedTodayHelper')} icon={Boxes} tone="indigo" />
          <KpiCard label={t('dashboard.soldToday')} value={formatNumber(operations.today.soldPieces, language)} helper={t('dashboard.soldTodayHelper')} icon={ShoppingBag} tone="emerald" />
          <KpiCard label={t('dashboard.pendingSettlement')} value={formatNumber(operations.today.pendingSettlements, language)} helper={t('dashboard.pendingSettlementHelper')} icon={Clock3} tone={operations.today.pendingSettlements ? 'amber' : 'slate'} />
        </div>
      </div>

      <div className="surface overflow-hidden p-5 xl:col-span-2">
        <SurfaceHeader icon={HandCoins} eyebrow={t('dashboard.performance')} title={t('dashboard.dsrLeaderboard')} description={t('dashboard.dsrLeaderboardDescription')} />
        <div className="mt-5 overflow-x-auto">
          {operations.leaderboard.length ? (
            <table className="w-full min-w-[680px] text-left">
              <thead><tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400"><th className="pb-3">{t('common.dsr')}</th><th className="pb-3 text-right">{t('dashboard.salesSeriesLabel')}</th><th className="pb-3 text-right">{t('dashboard.collected')}</th><th className="pb-3 text-right">{t('dashboard.collectionEfficiency')}</th><th className="pb-3 text-right">{t('dashboard.dsrDueTotal')}</th></tr></thead>
              <tbody>{operations.leaderboard.map((row, index) => (
                <tr key={row.dsrId} className="border-b border-slate-100 last:border-0">
                  <td className="py-3.5"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-500">{index + 1}</span><div><p className="text-sm font-bold text-slate-800">{row.name}</p><p className="text-[11px] font-medium text-slate-400">{row.area}</p></div></div></td>
                  <td className="py-3.5 text-right text-sm font-semibold tabular-nums text-slate-700">{formatCurrency(row.sales, language)}</td>
                  <td className="py-3.5 text-right"><p className="text-sm font-bold tabular-nums text-emerald-700">{formatCurrency(row.collected, language)}</p><div className="ml-auto mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${row.collected / maxCollected * 100}%` }} /></div></td>
                  <td className="py-3.5 text-right text-sm font-bold tabular-nums text-slate-700">{numberPercent(row.collectionEfficiency)}</td>
                  <td className="py-3.5 text-right text-sm font-semibold tabular-nums text-rose-600">{formatCurrency(row.due, language)}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <EmptyState title={t('dashboard.noDsrCashToday')} description={t('dashboard.noDsrCashTodayDescription')} icon={HandCoins} />}
        </div>
      </div>
    </>
  );
}

function numberPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function RetailOperations({ operations, language, t }) {
  const hourlyMax = Math.max(...operations.hourlySales.map((row) => row.revenue), 1);
  const paymentTotal = operations.paymentMix.reduce((total, row) => total + Number(row.value || 0), 0) || 1;
  const paymentColors = ['bg-emerald-500', 'bg-indigo-500', 'bg-amber-500', 'bg-sky-500', 'bg-rose-500'];
  return (
    <>
      <div className="surface p-5 xl:col-span-2">
        <SurfaceHeader icon={Store} eyebrow={t('dashboard.retailOperations')} title={t('dashboard.retailPosToday')} description={t('dashboard.retailPosTodayDescription')} />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label={t('dashboard.netSales')} value={formatCurrency(operations.today.netSales, language)} helper={t('dashboard.today')} icon={ShoppingBag} tone="emerald" />
          <KpiCard label={t('dashboard.retailInvoices')} value={formatNumber(operations.today.invoiceCount, language)} helper={t('dashboard.retailInvoicesHelper')} icon={Receipt} tone="indigo" />
          <KpiCard label={t('dashboard.retailAvgBasket')} value={formatCurrency(operations.today.averageBasket, language)} helper={t('dashboard.retailAvgBasketHelper')} icon={Wallet} tone="amber" />
          <KpiCard label={t('dashboard.customerDueTotal')} value={formatCurrency(operations.customerDues.outstanding, language)} helper={t('dashboard.customerDueTotalHelper')} icon={UserCheck} tone="rose" />
        </div>
      </div>

      <div className="surface p-5">
        <SurfaceHeader icon={Clock3} title={t('dashboard.hourlySales')} description={t('dashboard.hourlySalesDescription')} />
        <div className="mt-5 flex h-48 items-end gap-1 rounded-xl bg-slate-50 px-3 pb-3 pt-6 ring-1 ring-slate-100">
          {operations.hourlySales.map((row) => (
            <div key={row.hour} className="group relative flex h-full min-w-0 flex-1 items-end">
              <div className="w-full rounded-t-sm bg-[var(--secondary)] opacity-70 transition hover:opacity-100" style={{ height: `${Math.max(row.revenue ? 5 : 1, row.revenue / hourlyMax * 100)}%` }} title={`${String(row.hour).padStart(2, '0')}:00 · ${formatCurrency(row.revenue, language)}`} />
              {row.hour % 4 === 0 ? <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] font-semibold text-slate-400">{String(row.hour).padStart(2, '0')}</span> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="surface p-5">
        <SurfaceHeader icon={CreditCard} title={t('dashboard.paymentMix')} description={t('dashboard.paymentMixDescription')} />
        <div className="mt-6 flex h-4 overflow-hidden rounded-full bg-slate-100">
          {operations.paymentMix.map((row, index) => <div key={row.method} className={paymentColors[index % paymentColors.length]} style={{ width: `${row.value / paymentTotal * 100}%` }} title={`${row.method}: ${formatCurrency(row.value, language)}`} />)}
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {operations.paymentMix.map((row, index) => (
            <div key={row.method} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span className="flex items-center gap-2 text-xs font-bold text-slate-600"><span className={cx('h-2 w-2 rounded-full', paymentColors[index % paymentColors.length])} />{t(`dashboard.paymentMethods.${row.method}`)}</span>
              <span className="text-xs font-bold tabular-nums text-slate-900">{formatCurrency(row.value, language)}</span>
            </div>
          ))}
        </div>
        <div className={cx('mt-5 rounded-xl px-4 py-3 ring-1', operations.cashSession ? 'bg-emerald-50 text-emerald-800 ring-emerald-100' : 'bg-amber-50 text-amber-800 ring-amber-100')}>
          <div className="flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase tracking-[0.12em]">{t('dashboard.cashSession')}</span><span className="text-sm font-bold">{operations.cashSession ? t('common.open') : t('common.closed')}</span></div>
          {operations.cashSession ? <p className="mt-2 text-xs font-medium">{t('dashboard.expectedCash')}: {formatCurrency(operations.cashSession.expectedCash, language)}</p> : null}
        </div>
      </div>
    </>
  );
}

function ProductPerformance({ rows, language, t }) {
  return (
    <div className="surface p-5">
      <SurfaceHeader icon={ShoppingBag} title={t('dashboard.productPerformance')} description={t('dashboard.productPerformanceDescription')} />
      <div className="mt-5 space-y-2.5">
        {rows.length ? rows.slice(0, 6).map((row, index) => (
          <div key={row.productId} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-xs font-bold text-slate-500 ring-1 ring-slate-200">{index + 1}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{row.name}</p><p className="mt-0.5 text-[11px] font-medium text-slate-400">{formatNumber(row.quantity, language)} {t('common.pcs')} · {numberPercent(row.margin)} {t('dashboard.margin')}</p></div>
            <div className="text-right"><p className="text-sm font-bold tabular-nums text-slate-950">{formatCurrency(row.revenue, language)}</p><p className="text-[11px] font-semibold tabular-nums text-emerald-700">{formatCurrency(row.profit, language)}</p></div>
          </div>
        )) : <EmptyState title={t('dashboard.topSellingEmpty')} description={t('dashboard.topSellingEmptyDesc')} icon={ShoppingBag} />}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { today, t, language, tenant } = useInventoryApp();
  const navigate = useNavigate();
  const vm = useDashboardViewModel({ today });

  if (vm.loading) return <div><SectionHeader title={t('dashboard.title')} compact /><DashboardSkeleton /></div>;
  if (vm.error || !vm.data) return <div><SectionHeader title={t('dashboard.title')} compact /><Alert type="error">{vm.error || t('dashboard.financeUnavailable')}</Alert></div>;

  const { meta, shared, operations, actions } = vm.data;
  const months = t('common.monthsShort');
  const monthlyTrend = shared.monthlyTrend.map((row) => ({
    ...row,
    label: months[Number(row.month?.slice(5, 7)) - 1] || row.month,
    sales: row.totalSales,
    profit: row.totalProfit,
  }));
  const isDealer = meta.profile === 'DEALER';
  const generatedTime = new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date(meta.generatedAt));

  const kpis = [
    { label: t('dashboard.monthlySalesChart'), value: formatCurrency(shared.kpis.monthlySales, language), delta: shared.comparisons.salesVsLastMonth, icon: TrendingUp, tone: 'emerald' },
    { label: t('dashboard.monthlyProfit'), value: formatCurrency(shared.kpis.monthlyProfit, language), delta: shared.comparisons.profitVsLastMonth, icon: CircleDollarSign, tone: shared.kpis.monthlyProfit >= 0 ? 'indigo' : 'rose' },
    { label: t('dashboard.totalCashBalance'), value: formatCurrency(shared.kpis.cashAvailable, language), helper: t('dashboard.totalCashBalanceHelper'), icon: Landmark, tone: 'slate' },
    { label: isDealer ? t('dashboard.dsrDueTotal') : t('dashboard.customerDueTotal'), value: formatCurrency(shared.kpis.receivables, language), helper: t('dashboard.receivables'), icon: HandCoins, tone: 'amber' },
    { label: t('dashboard.inventoryRisk'), value: formatNumber(shared.inventory.lowStockCount, language), helper: t('dashboard.inventoryRiskHelper', { count: shared.inventory.outOfStockCount }), icon: Boxes, tone: shared.inventory.outOfStockCount ? 'rose' : 'emerald' },
  ];

  return (
    <div className="flex flex-col gap-6 pb-8 max-lg:gap-4">
      <SectionHeader
        title={t('dashboard.title')}
        description={t(isDealer ? 'dashboard.dealerDashboardDescription' : 'dashboard.retailerDashboardDescription')}
        compact
        action={(
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-[var(--secondary-soft)] px-3 py-1.5 text-xs font-bold text-[var(--secondary-strong)] sm:inline-flex">{t(isDealer ? 'dashboard.dealerProfile' : 'dashboard.retailerProfile')}</span>
            <button type="button" className="btn-secondary" disabled={vm.refreshing} onClick={() => vm.refresh()}><RefreshCw size={15} className={vm.refreshing ? 'animate-spin' : ''} />{t('common.reload')}</button>
          </div>
        )}
      />

      <div className="relative overflow-hidden rounded-[1.35rem] bg-slate-950 px-6 py-5 text-white shadow-xl sm:px-7">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[var(--brand)]/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{t('dashboard.commandCenter')}</p><h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{tenant?.name || t('dashboard.title')}</h1><p className="mt-1 text-sm font-medium text-slate-400">{t('dashboard.executiveBriefing')}</p></div>
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10"><Activity size={16} className="text-emerald-400" /><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{t('dashboard.lastUpdated')}</p><p className="text-sm font-bold">{generatedTime}</p></div></div>
        </div>
      </div>

      <div className="grid gap-3 max-sm:flex max-sm:snap-x max-sm:snap-mandatory max-sm:overflow-x-auto max-sm:pb-2 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((item) => <div key={item.label} className="max-sm:min-w-[78%] max-sm:snap-start"><KpiCard {...item} helper={item.delta !== undefined ? formatDelta(item.delta, t) : item.helper} /></div>)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <ActionCenter actions={actions} t={t} onOpen={navigate} />
        <FinancialHealth financial={shared.financial} language={language} t={t} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartPanel title={t('dashboard.monthlySalesChart')} description={t('dashboard.monthlySalesChartDescription')}><TrendChart data={monthlyTrend} valueFormatter={(value) => formatCurrency(value, language)} series={[{ key: 'sales', label: t('dashboard.salesSeriesLabel'), color: getCssVar('--secondary', '#5e5b8e'), fill: true }]} height={250} /></ChartPanel>
        <ChartPanel title={t('dashboard.monthlyProfitChart')} description={t('dashboard.monthlyProfitChartDescription')}><TrendChart data={monthlyTrend} valueFormatter={(value) => formatCurrency(value, language)} series={[{ key: 'profit', label: t('dashboard.profitSeriesLabel'), color: getCssVar('--success', '#37a864'), fill: true }]} height={250} /></ChartPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartPanel title={t('dashboard.inventoryByCategory')} description={t('dashboard.inventoryByCategoryDescription')}>
          {shared.inventory.byCategory.length ? <HorizontalBarChart data={shared.inventory.byCategory.slice(0, 8)} valueFormatter={(value) => formatCurrency(value, language)} /> : <EmptyState title={t('dashboard.noInventoryTitle')} description={t('dashboard.noInventoryDescription')} icon={Boxes} />}
        </ChartPanel>
        <div className="surface p-5">
          <SurfaceHeader icon={AlertTriangle} title={t('dashboard.inventoryIntelligence')} description={t('dashboard.inventoryIntelligenceDescription')} />
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[{ label: t('dashboard.valueInInventory'), value: formatCurrency(shared.inventory.inventoryValue, language), icon: Boxes }, { label: t('dashboard.lowStock'), value: formatNumber(shared.inventory.lowStockCount, language), icon: AlertTriangle }, { label: t('dashboard.outOfStock'), value: formatNumber(shared.inventory.outOfStockCount, language), icon: PackageCheck }, { label: t('dashboard.valueInDamaged'), value: formatCurrency(shared.inventory.damagedValue, language), icon: Building2 }].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-100"><Icon size={15} className="text-slate-400" /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p><p className="mt-1.5 text-sm font-bold tabular-nums text-slate-900">{value}</p></div>)}
          </div>
          <div className="mt-4 space-y-2">{shared.inventory.lowStock.slice(0, 4).map((item) => <button type="button" key={item.id} onClick={() => navigate('/low-stock-alerts')} className="flex w-full items-center justify-between rounded-xl bg-white px-3.5 py-2.5 text-left ring-1 ring-slate-200/70 hover:bg-slate-50"><span><span className="block text-sm font-bold text-slate-800">{item.name}</span><span className="text-[11px] font-medium text-slate-400">{item.category}</span></span><span className="text-xs font-bold tabular-nums text-rose-600">{formatNumber(item.stockPieces, language)} / {formatNumber(item.threshold, language)}</span></button>)}</div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {isDealer ? <DealerOperations operations={operations} language={language} t={t} /> : <RetailOperations operations={operations} language={language} t={t} />}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <ProductPerformance rows={operations.topProducts || []} language={language} t={t} />
        <ChartPanel title={t('dashboard.activityHeatmap')} description={t('dashboard.activityHeatmapDescription')}><ActivityCalendar cells={shared.activity} today={meta.date} language={language} t={t} /></ChartPanel>
      </div>
    </div>
  );
}
