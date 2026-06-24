import { AlertTriangle, Boxes, CalendarDays, CheckCircle2, CircleDollarSign, HandCoins, Landmark, PackageCheck, RotateCcw, ShoppingCart, Store, TrendingDown, TrendingUp, Truck, Trophy, UserCheck, Wallet } from 'lucide-react';
import { ActivityHeatmap, Alert, ChartPanel, DonutChart, EmptyState, HorizontalBarChart, RadialProgressChart, SectionHeader, StackedBarChart, StatCard, TrendChart, cx } from '../../../components/ui.jsx';
import { formatCurrency, formatDate, formatNumber } from '../../../utils/calculations.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import InsightLine from '../components/InsightLine';
import DashboardSkeleton from '../components/DashboardSkeleton';
import { useDashboardViewModel } from '../viewmodels/useDashboardViewModel';
import { getCssVar } from '../../../utils/theme.js';

function DeltaBadge({ delta, language }) {
  if (delta.pct === null) {
    return <span className="text-xs font-medium text-slate-400">—</span>;
  }
  const Icon = delta.up ? TrendingUp : TrendingDown;
  return (
    <span className={cx('inline-flex items-center gap-1 text-xs font-bold', delta.up ? 'text-emerald-600' : 'text-rose-600')}>
      <Icon size={12} />
      {delta.pct}% vs yesterday
    </span>
  );
}

export default function DashboardPage() {
  const { productDirectory, dsrDirectory, today, t, language, tenant } = useInventoryApp();
  const isElectronics = (tenant?.businessType || 'ELECTRONICS') === 'ELECTRONICS';
  const vm = useDashboardViewModel({ products: productDirectory, dsrs: dsrDirectory, today, t, language });

  if (vm.loading) {
    return (
      <div>
        <SectionHeader eyebrow={t('dashboard.eyebrow')} title={t('dashboard.title')} description={t('dashboard.description')} />
        <DashboardSkeleton />
      </div>
    );
  }

  if (vm.error) {
    return (
      <div>
        <SectionHeader eyebrow={t('dashboard.eyebrow')} title={t('dashboard.title')} description={t('dashboard.description')} />
        <Alert type="error">{vm.error}</Alert>
      </div>
    );
  }

  const taskIcons = {
    morningStarted: Truck,
    morningPending: Truck,
    returnPending: RotateCcw,
    returnClear: RotateCcw,
    stockAttention: AlertTriangle,
    stockHealthy: AlertTriangle,
    cashVisible: CircleDollarSign,
    cashEmpty: CircleDollarSign,
  };

  const { yesterdayDeltas, retailPos, retailCashSession, financeDashboard, dsrLeaderboard } = vm;

  return (
    <div>
      <SectionHeader eyebrow={t('dashboard.eyebrow')} title={t('dashboard.title')} description={t('dashboard.description')} />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <ChartPanel title={t('dashboard.tradingTrend')} description={t('dashboard.tradingTrendDescription')}>
          <TrendChart
            data={vm.tradingTrend}
            valueFormatter={(value) => formatCurrency(value, language)}
            series={[
              { key: 'paid', label: t('dashboard.payableToday'), color: getCssVar('--success', '#37a864'), fill: true },
              { key: 'issued', label: t('reports.issued'), color: getCssVar('--secondary', '#5e5b8e') },
              { key: 'sold', label: t('reports.sold'), color: getCssVar('--accent-orange', '#f5820f') },
            ]}
          />
        </ChartPanel>

        <ChartPanel title={t('dashboard.settlementMix')} description={t('dashboard.settlementMixDescription')}>
          <DonutChart data={vm.settlementMix} centerLabel={t('dashboard.activeRoutes')} centerValue={formatNumber(vm.activeDsrs, language)} valueFormatter={(value) => `${formatNumber(value, language)} ${t('common.dsr')}`} />
        </ChartPanel>
      </div>

      <div className="mt-6">
        <ChartPanel title={t('dashboard.activityHeatmap')} description={t('dashboard.activityHeatmapDescription')}>
          <ActivityHeatmap cells={vm.activityHeatmap} color={getCssVar('--secondary', '#5e5b8e')} t={t} language={language} />
        </ChartPanel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <ChartPanel title={t('dashboard.inventoryByCategory')} description={t('dashboard.inventoryByCategoryDescription')}>
          {vm.inventoryByCategory.length ? <HorizontalBarChart data={vm.inventoryByCategory.slice(0, 6)} valueFormatter={(value) => formatCurrency(value, language)} /> : <EmptyState title={t('dashboard.noInventoryTitle')} description={t('dashboard.noInventoryDescription')} icon={Boxes} />}
        </ChartPanel>

        <ChartPanel title={t('dashboard.routePerformance')} description={t('dashboard.routePerformanceDescription')}>
          {vm.routePerformance.length ? (
            <StackedBarChart
              data={vm.routePerformance}
              segments={[
                { key: 'issued', label: t('reports.issued'), color: getCssVar('--issued-soft', '#bfbdd2') },
              { key: 'returned', label: t('reports.returned'), color: getCssVar('--returned', '#f8aa17') },
              { key: 'sold', label: t('reports.sold'), color: getCssVar('--success', '#37a864') },
              ]}
              totalFormatter={(value) => `${formatNumber(value, language)} ${t('common.pcs')}`}
            />
          ) : (
            <EmptyState title={t('dashboard.noRouteMovementTitle')} description={t('dashboard.noRouteMovementDescription')} icon={Truck} />
          )}
        </ChartPanel>

        <ChartPanel title={t('dashboard.topProductsByCash')} description={t('dashboard.topProductsByCashDescription')}>
          {vm.topPayableProducts.length ? <HorizontalBarChart data={vm.topPayableProducts} valueFormatter={(value) => formatCurrency(value, language)} trackClassName="bg-emerald-50" /> : <EmptyState title={t('dashboard.noSoldProductsTitle')} description={t('dashboard.noSoldProductsDescription')} icon={PackageCheck} />}
        </ChartPanel>
      </div>

      <div className="mt-6 overflow-hidden rounded-[34px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(var(--white),0.98),rgba(244,247,251,0.96))] shadow-[0_24px_60px_rgba(var(--slate-900),0.08)]">
        <div className="grid gap-8 p-5 text-slate-950 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
          <div className="flex flex-col justify-between gap-7">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--secondary-soft)] bg-[var(--secondary-soft)] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[var(--secondary-strong)]">
                <CheckCircle2 size={14} />
                {t('dashboard.liveTrading')}
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{t('dashboard.heroTitle')}</h2>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-500">{t('dashboard.heroDescription')}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="flex flex-col items-center justify-center rounded-[26px] border border-slate-200 bg-white/85 px-4 py-4 text-center shadow-[0_12px_26px_rgba(var(--slate-900),0.05)]">
                <RadialProgressChart value={vm.completionRate} label={t('dashboard.collectionFlow')} color={getCssVar('--secondary', '#5e5b8e')} size={132} />
                <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{t('dashboard.collectionFlowDesc')}</p>
              </div>
              {vm.operationalPulse.slice(1).map((item) => (
                <div key={item.title} className="rounded-[26px] border border-slate-200 bg-white/85 px-4 py-4 shadow-[0_12px_26px_rgba(var(--slate-900),0.05)]">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{item.title}</p>
                  <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{item.value}</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{item.subtitle}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-bold">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-[0_1px_0_rgba(var(--slate-900),0.03)]">
                <CalendarDays size={16} />
                {formatDate(today, language)}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-[0_1px_0_rgba(var(--slate-900),0.03)]">
                <UserCheck size={16} />
                {t('dashboard.activeDsrs', { count: formatNumber(vm.activeDsrs, language) })}
              </span>
            </div>
          </div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-[0_12px_26px_rgba(var(--slate-900),0.05)]">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t('dashboard.payableToday')}</p>
              <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{formatCurrency(vm.payableToday, language)}</p>
              <p className="mt-2 text-sm font-medium text-slate-500">{t('dashboard.payableTodayDesc')}</p>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-[0_12px_26px_rgba(var(--slate-900),0.05)]">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t('dashboard.stockValue')}</p>
              <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{formatCurrency(vm.stockValue, language)}</p>
              <p className="mt-2 text-sm font-medium text-slate-500">{t('dashboard.stockValueDesc')}</p>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-[0_12px_26px_rgba(var(--slate-900),0.05)]">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t('dashboard.unitsInStock')}</p>
              <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{formatNumber(vm.stockUnits, language)}</p>
              <p className="mt-2 text-sm font-medium text-slate-500">{t('dashboard.unitsInStockDesc')}</p>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-[0_12px_26px_rgba(var(--slate-900),0.05)]">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t('dashboard.possibleProfit')}</p>
              <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{formatCurrency(vm.expectedStockProfit, language)}</p>
              <p className="mt-2 text-sm font-medium text-slate-500">{t('dashboard.possibleProfitDesc')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title={t('dashboard.products')} value={formatNumber(productDirectory.length, language)} helper={t('dashboard.productsHelper')} icon={Boxes} tone="blue" />
        <StatCard title={t('dashboard.salesValueInStock')} value={formatCurrency(vm.stockSellingValue, language)} helper={t('dashboard.salesValueInStockHelper')} icon={CircleDollarSign} tone="emerald" />
        <StatCard title={t('dashboard.issuedToday')} value={`${formatNumber(vm.totalIssuedToday, language)} ${t('common.pcs')}`} helper={t('dashboard.issuedTodayHelper')} icon={Truck} tone="amber" trend={vm.tradingTrend.map((day) => day.issued)} />
        <StatCard title={t('dashboard.returnedToday')} value={`${formatNumber(vm.totalReturnedToday, language)} ${t('common.pcs')}`} helper={t('dashboard.returnedTodayHelper')} icon={RotateCcw} tone="slate" />
        <StatCard title={t('dashboard.soldToday')} value={`${formatNumber(vm.totalSoldToday, language)} ${t('common.pcs')}`} helper={t('dashboard.soldTodayHelper')} icon={PackageCheck} tone="emerald" trend={vm.tradingTrend.map((day) => day.sold)} />
        <StatCard title={t('dashboard.pendingReturn')} value={`${formatNumber(vm.pendingRows.length, language)} ${t('common.dsr')}`} helper={t('dashboard.pendingReturnHelper')} icon={AlertTriangle} tone={vm.pendingRows.length ? 'amber' : 'emerald'} />
        <StatCard title={t('dashboard.completedSettlement')} value={`${formatNumber(vm.completedRows.length, language)} ${t('common.dsr')}`} helper={t('dashboard.completedSettlementHelper', { percent: vm.completionRate })} icon={CheckCircle2} tone="blue" />
        <StatCard title={t('dashboard.lowStock')} value={formatNumber(vm.lowStockAll.length, language)} helper={t('dashboard.lowStockHelper', { count: vm.outOfStockCount })} icon={AlertTriangle} tone={vm.lowStockAll.length ? 'rose' : 'emerald'} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-4">
        {vm.ownerTasks.map((task) => {
          const Icon = taskIcons[task.iconKey] || AlertTriangle;
          return (
            <div key={task.title} className="surface rounded-[28px] p-5">
              <div className="flex items-start gap-3">
                <div className={cx('rounded-2xl p-2.5', task.tone === 'emerald' && 'bg-emerald-50 text-emerald-700', task.tone === 'amber' && 'bg-amber-50 text-amber-700', task.tone === 'rose' && 'bg-rose-50 text-rose-700', task.tone === 'blue' && 'bg-[var(--secondary-soft)] text-[var(--secondary-strong)]', task.tone === 'slate' && 'bg-slate-100 text-slate-700')}>
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-950">{task.title}</h3>
                  <p className="mt-1 text-sm font-medium leading-5 text-slate-500">{task.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <ChartPanel title={t('dashboard.friendlySummary')} description={t('dashboard.friendlySummaryDescription')}>
          <div className="grid gap-3 md:grid-cols-2">
            {vm.summaryLines.map((item) => (
              <InsightLine key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
        </ChartPanel>

        <ChartPanel title={t('dashboard.actionQueue')} description={t('dashboard.actionQueueDescription')}>
          <div className="space-y-3">
            {vm.actionQueue.pendingRows.length
              ? vm.actionQueue.pendingRows.slice(0, 4).map((row) => <InsightLine key={row.dsrId} label={`${row.dsrName} - ${row.area}`} value={`${formatNumber(row.issuedPieces, language)} ${t('common.pcs')} ${t('dashboard.pending')}`} />)
              : <div className="rounded-2xl bg-emerald-50 px-4 py-4 text-sm font-bold text-emerald-700">{t('dashboard.noPendingReturn')}</div>}
            {vm.actionQueue.lowStockProducts.length
              ? vm.actionQueue.lowStockProducts.slice(0, 3).map((product) => <InsightLine key={product.id} label={product.name} value={isElectronics ? `${formatNumber(product.stockPieces, language)} ${t('common.pcs')}` : vm.actionQueue.formatCasePiece(product.stockPieces, product.piecesPerCase)} />)
              : <div className="rounded-2xl bg-sky-50 px-4 py-4 text-sm font-bold text-sky-700">{t('dashboard.stockHealthy')}</div>}
          </div>
        </ChartPanel>
      </div>

      {/* Day-over-day comparison */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          {
            title: t('dashboard.issuedVsYesterday'),
            today: `${formatNumber(yesterdayDeltas.issuedToday, language)} ${t('common.pcs')}`,
            yesterday: `${formatNumber(yesterdayDeltas.issuedYesterday, language)} ${t('common.pcs')} yesterday`,
            delta: yesterdayDeltas.issued,
            icon: Truck,
            accent: 'bg-[var(--secondary-soft)] text-[var(--secondary-strong)]',
          },
          {
            title: t('dashboard.soldVsYesterday'),
            today: `${formatNumber(yesterdayDeltas.soldToday, language)} ${t('common.pcs')}`,
            yesterday: `${formatNumber(yesterdayDeltas.soldYesterday, language)} ${t('common.pcs')} yesterday`,
            delta: yesterdayDeltas.sold,
            icon: PackageCheck,
            accent: 'bg-emerald-50 text-emerald-700',
          },
          {
            title: t('dashboard.collectedVsYesterday'),
            today: formatCurrency(yesterdayDeltas.collectedToday, language),
            yesterday: `${formatCurrency(yesterdayDeltas.collectedYesterday, language)} yesterday`,
            delta: yesterdayDeltas.collected,
            icon: HandCoins,
            accent: 'bg-amber-50 text-amber-700',
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="surface rounded-[28px] p-5">
              <div className="flex items-center gap-3">
                <div className={cx('rounded-2xl p-2.5', item.accent)}>
                  <Icon size={20} />
                </div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{item.title}</p>
              </div>
              <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">{item.today}</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs font-medium text-slate-400">{item.yesterday}</p>
                <DeltaBadge delta={item.delta} language={language} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Retail POS Today + DSR Cash Leaderboard */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ChartPanel title={t('dashboard.retailPosToday')} description={t('dashboard.retailPosTodayDescription')}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] bg-slate-50 p-4">
              <div className="mb-2 rounded-xl bg-white p-2 shadow-sm w-fit">
                <Store size={18} className="text-[var(--secondary-strong)]" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{t('dashboard.retailRevenue')}</p>
              <p className="mt-1 text-xl font-black tracking-tight text-slate-950">{formatCurrency(retailPos.revenue, language)}</p>
              <p className="mt-1 text-xs font-medium text-slate-400">{t('dashboard.retailRevenueHelper')}</p>
            </div>
            <div className="rounded-[22px] bg-slate-50 p-4">
              <div className="mb-2 rounded-xl bg-white p-2 shadow-sm w-fit">
                <ShoppingCart size={18} className="text-emerald-600" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{t('dashboard.retailInvoices')}</p>
              <p className="mt-1 text-xl font-black tracking-tight text-slate-950">{formatNumber(retailPos.invoiceCount, language)}</p>
              <p className="mt-1 text-xs font-medium text-slate-400">{t('dashboard.retailInvoicesHelper')}</p>
            </div>
            <div className="rounded-[22px] bg-slate-50 p-4">
              <div className="mb-2 rounded-xl bg-white p-2 shadow-sm w-fit">
                <Wallet size={18} className="text-amber-600" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{t('dashboard.retailAvgBasket')}</p>
              <p className="mt-1 text-xl font-black tracking-tight text-slate-950">{formatCurrency(retailPos.avgBasket, language)}</p>
              <p className="mt-1 text-xs font-medium text-slate-400">{t('dashboard.retailAvgBasketHelper')}</p>
            </div>
          </div>
          {retailCashSession !== undefined && (
            <div className={cx('mt-3 flex items-center gap-3 rounded-[22px] px-4 py-3', retailCashSession ? 'bg-emerald-50' : 'bg-slate-50')}>
              <div className={cx('rounded-xl p-2', retailCashSession ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500')}>
                <Landmark size={16} />
              </div>
              <div>
                <p className={cx('text-sm font-bold', retailCashSession ? 'text-emerald-800' : 'text-slate-700')}>
                  {retailCashSession ? t('dashboard.cashSessionOpen') : t('dashboard.cashSessionClosed')}
                </p>
                <p className="text-xs font-medium text-slate-500">
                  {retailCashSession ? t('dashboard.cashSessionOpenDetail') : t('dashboard.cashSessionClosedDetail')}
                </p>
              </div>
            </div>
          )}
        </ChartPanel>

        <ChartPanel title={t('dashboard.dsrLeaderboard')} description={t('dashboard.dsrLeaderboardDescription')}>
          {dsrLeaderboard.length ? (
            <div className="space-y-2">
              {dsrLeaderboard.map((dsr, index) => (
                <div key={dsr.label} className="flex items-center gap-3">
                  <div className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black', index === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500')}>
                    {index === 0 ? <Trophy size={13} /> : index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-slate-800">{dsr.label}</p>
                      <p className="shrink-0 text-sm font-black text-slate-950">{formatCurrency(dsr.value, language)}</p>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[var(--secondary)]"
                        style={{ width: `${dsrLeaderboard[0].value > 0 ? Math.round((dsr.value / dsrLeaderboard[0].value) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title={t('dashboard.noDsrCashToday')} description={t('dashboard.noDsrCashTodayDescription')} icon={HandCoins} />
          )}
        </ChartPanel>
      </div>

      {/* Financial Health + Receivables & Payables */}
      {financeDashboard && (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <ChartPanel title={t('dashboard.financialHealth')} description={t('dashboard.financialHealthDescription')}>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] bg-slate-50 p-4">
                <div className="mb-2 rounded-xl bg-white p-2 shadow-sm w-fit">
                  <Landmark size={18} className="text-[var(--secondary-strong)]" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{t('dashboard.totalCashBalance')}</p>
                <p className="mt-1 text-xl font-black tracking-tight text-slate-950">{formatCurrency(financeDashboard.totalCashBalance, language)}</p>
                <p className="mt-1 text-xs font-medium text-slate-400">{t('dashboard.totalCashBalanceHelper')}</p>
              </div>
              <div className="rounded-[22px] bg-slate-50 p-4">
                <div className="mb-2 rounded-xl bg-white p-2 shadow-sm w-fit">
                  <TrendingUp size={18} className={financeDashboard.monthlyProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'} />
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{t('dashboard.monthlyProfit')}</p>
                <p className={cx('mt-1 text-xl font-black tracking-tight', financeDashboard.monthlyProfit >= 0 ? 'text-emerald-700' : 'text-rose-700')}>{formatCurrency(financeDashboard.monthlyProfit, language)}</p>
                <p className="mt-1 text-xs font-medium text-slate-400">{t('dashboard.monthlyProfitHelper')}</p>
              </div>
              <div className="rounded-[22px] bg-slate-50 p-4">
                <div className="mb-2 rounded-xl bg-white p-2 shadow-sm w-fit">
                  <CircleDollarSign size={18} className={financeDashboard.netPosition >= 0 ? 'text-emerald-600' : 'text-rose-600'} />
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{t('dashboard.netPosition')}</p>
                <p className={cx('mt-1 text-xl font-black tracking-tight', financeDashboard.netPosition >= 0 ? 'text-emerald-700' : 'text-rose-700')}>{formatCurrency(financeDashboard.netPosition, language)}</p>
                <p className="mt-1 text-xs font-medium text-slate-400">{t('dashboard.netPositionHelper')}</p>
              </div>
            </div>
            {financeDashboard.monthlySalesAmount > 0 && (
              <div className="mt-3 flex items-center justify-between rounded-[22px] bg-indigo-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={15} className="text-indigo-600" />
                  <p className="text-sm font-bold text-indigo-800">{t('dashboard.monthlySalesAmount')}</p>
                </div>
                <p className="text-sm font-black text-indigo-900">{formatCurrency(financeDashboard.monthlySalesAmount, language)}</p>
              </div>
            )}
          </ChartPanel>

          <ChartPanel title={t('dashboard.receivablesPayables')} description={t('dashboard.receivablesPayablesDescription')}>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-[22px] bg-slate-50 px-4 py-3">
                <div className="rounded-xl bg-[var(--secondary-soft)] p-2 text-[var(--secondary-strong)]">
                  <Truck size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t('dashboard.dsrDueTotal')}</p>
                  <p className="text-sm font-medium text-slate-400">{t('dashboard.dsrDueTotalHelper')}</p>
                </div>
                <p className="text-base font-black text-slate-950">{formatCurrency(financeDashboard.totalDsrDue, language)}</p>
              </div>
              <div className="flex items-center gap-3 rounded-[22px] bg-slate-50 px-4 py-3">
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                  <UserCheck size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t('dashboard.customerDueTotal')}</p>
                  <p className="text-sm font-medium text-slate-400">{t('dashboard.customerDueTotalHelper')}</p>
                </div>
                <p className="text-base font-black text-slate-950">{formatCurrency(financeDashboard.totalCustomerDue, language)}</p>
              </div>
              <div className="flex items-center gap-3 rounded-[22px] bg-slate-50 px-4 py-3">
                <div className="rounded-xl bg-rose-50 p-2 text-rose-700">
                  <HandCoins size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t('dashboard.supplierDueTotal')}</p>
                  <p className="text-sm font-medium text-slate-400">{t('dashboard.supplierDueTotalHelper')}</p>
                </div>
                <p className="text-base font-black text-rose-700">{formatCurrency(financeDashboard.totalSupplierDue, language)}</p>
              </div>
            </div>
          </ChartPanel>
        </div>
      )}
    </div>
  );
}
