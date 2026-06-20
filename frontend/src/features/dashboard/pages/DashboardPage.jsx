import { AlertTriangle, Boxes, CalendarDays, CheckCircle2, CircleDollarSign, PackageCheck, RotateCcw, Truck, UserCheck } from 'lucide-react';
import { ActivityHeatmap, Alert, ChartPanel, DonutChart, EmptyState, HorizontalBarChart, RadialProgressChart, SectionHeader, StackedBarChart, StatCard, TrendChart, cx } from '../../../components/ui.jsx';
import { formatCurrency, formatDate, formatNumber } from '../../../utils/calculations.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import InsightLine from '../components/InsightLine';
import DashboardSkeleton from '../components/DashboardSkeleton';
import { useDashboardViewModel } from '../viewmodels/useDashboardViewModel';
import { getCssVar } from '../../../utils/theme.js';

export default function DashboardPage() {
  const { productDirectory, dsrDirectory, today, t, language } = useInventoryApp();
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

  return (
    <div>
      <SectionHeader eyebrow={t('dashboard.eyebrow')} title={t('dashboard.title')} description={t('dashboard.description')} />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <ChartPanel title={t('dashboard.tradingTrend')} description={t('dashboard.tradingTrendDescription')}>
          <TrendChart
            data={vm.tradingTrend}
            valueFormatter={(value) => formatCurrency(value, language)}
            series={[
              { key: 'paid', label: t('dashboard.payableToday'), color: getCssVar('--success', '#0f766e'), fill: true },
              { key: 'issued', label: t('reports.issued'), color: getCssVar('--secondary', '#2563eb') },
              { key: 'sold', label: t('reports.sold'), color: getCssVar('--accent-orange', '#f97316') },
            ]}
          />
        </ChartPanel>

        <ChartPanel title={t('dashboard.settlementMix')} description={t('dashboard.settlementMixDescription')}>
          <DonutChart data={vm.settlementMix} centerLabel={t('dashboard.activeRoutes')} centerValue={formatNumber(vm.activeDsrs, language)} valueFormatter={(value) => `${formatNumber(value, language)} ${t('common.dsr')}`} />
        </ChartPanel>
      </div>

      <div className="mt-6">
        <ChartPanel title={t('dashboard.activityHeatmap')} description={t('dashboard.activityHeatmapDescription')}>
          <ActivityHeatmap cells={vm.activityHeatmap} color={getCssVar('--secondary', '#2563eb')} t={t} language={language} />
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
                { key: 'issued', label: t('reports.issued'), color: getCssVar('--issued-soft', '#bfdbfe') },
              { key: 'returned', label: t('reports.returned'), color: getCssVar('--returned', '#fdba74') },
              { key: 'sold', label: t('reports.sold'), color: getCssVar('--success', '#0f766e') },
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
                <RadialProgressChart value={vm.completionRate} label={t('dashboard.collectionFlow')} color={getCssVar('--secondary', '#2563eb')} size={132} />
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
              ? vm.actionQueue.lowStockProducts.slice(0, 3).map((product) => <InsightLine key={product.id} label={product.name} value={vm.actionQueue.formatCasePiece(product.stockPieces, product.piecesPerCase)} />)
              : <div className="rounded-2xl bg-sky-50 px-4 py-4 text-sm font-bold text-sky-700">{t('dashboard.stockHealthy')}</div>}
          </div>
        </ChartPanel>
      </div>
    </div>
  );
}
