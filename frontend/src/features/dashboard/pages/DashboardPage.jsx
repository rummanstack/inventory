import {
  AlertTriangle,
  Boxes,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  HandCoins,
  Landmark,
  Lock,
  PackageCheck,
  PackageX,
  Receipt,
  ShoppingCart,
  Store,
  TrendingDown,
  TrendingUp,
  Truck,
  UserCheck,
  Wallet,
} from "lucide-react";
import {
  ActivityHeatmap,
  Alert,
  ChartPanel,
  EmptyState,
  HorizontalBarChart,
  SectionHeader,
  TrendChart,
  cx,
} from "../../../components/ui.jsx";
import { formatCurrency, formatNumber } from "../../../utils/calculations.js";
import { useState } from "react";
import { useInventoryApp } from "../../../app/useInventoryApp.jsx";
import DashboardSkeleton from "../components/DashboardSkeleton";
import { useDashboardViewModel } from "../viewmodels/useDashboardViewModel";
import { getCssVar } from "../../../utils/theme.js";

/* ─── small reusable pieces ─── */

function MetricPill({ label, value, sub, icon: Icon, iconClass = "bg-slate-100 text-slate-500" }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[22px] bg-white/60 px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] ring-1 ring-slate-200/60">
      <div className={cx("w-fit rounded-xl p-2", iconClass)}>
        <Icon size={15} />
      </div>
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">{label}</p>
      <p className="text-2xl font-black tracking-tight text-slate-950">{value}</p>
      {sub && <p className="text-xs font-medium text-slate-500">{sub}</p>}
    </div>
  );
}

function DueRow({ icon: Icon, iconClass, label, sub, value, valueClass = "text-slate-950" }) {
  return (
    <div className="flex items-center gap-4 rounded-[20px] bg-white/70 px-5 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] ring-1 ring-slate-200/50">
      <div className={cx("shrink-0 rounded-xl p-2.5", iconClass)}>
        <Icon size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-black uppercase tracking-[0.13em] text-slate-600">{label}</p>
        {sub && <p className="mt-0.5 text-xs font-medium text-slate-500">{sub}</p>}
      </div>
      <p className={cx("shrink-0 text-base font-black", valueClass)}>{value}</p>
    </div>
  );
}

/* ─── main page ─── */

export default function DashboardPage() {
  const { productDirectory, dsrDirectory, today, t, language } = useInventoryApp();
  const vm = useDashboardViewModel({ products: productDirectory, dsrs: dsrDirectory, today, t, language });
  const [noSalePage, setNoSalePage] = useState(1);
  const NO_SALE_PAGE_SIZE = 6;

  if (vm.loading) {
    return (
      <div>
        <SectionHeader
          eyebrow={t("dashboard.eyebrow")}
          title={t("dashboard.title")}
          description={t("dashboard.description")}
        />
        <DashboardSkeleton />
      </div>
    );
  }

  if (vm.error) {
    return (
      <div>
        <SectionHeader
          eyebrow={t("dashboard.eyebrow")}
          title={t("dashboard.title")}
          description={t("dashboard.description")}
        />
        <Alert type="error">{vm.error}</Alert>
      </div>
    );
  }

  const { financeDashboard, retailPos, retailCashSession, dsrLeaderboard, noSaleToday, todayPnl, monthlyTrend } = vm;
  const secondary = getCssVar("--secondary", "#5e5b8e");

  const cashInHand = financeDashboard?.accounts?.filter((a) => a.type === "CASH").reduce((s, a) => s + a.balance, 0) ?? 0;
  const cashInBank = financeDashboard?.accounts?.filter((a) => a.type === "BANK").reduce((s, a) => s + a.balance, 0) ?? 0;

  const inventoryValue = productDirectory.reduce((s, p) => s + p.stockPieces * Number(p.purchasePrice || 0), 0);
  const damagedValue = productDirectory.reduce((s, p) => s + Number(p.damagedPieces || 0) * Number(p.purchasePrice || 0), 0);
  const totalDue = (financeDashboard?.totalDsrDue ?? 0) + (financeDashboard?.totalCustomerDue ?? 0);
  const totalOwe = financeDashboard?.totalSupplierDue ?? 0;

  const todaySales = todayPnl.grossRevenue + retailPos.revenue;
  const todayDue = Math.max(0, todayPnl.grossRevenue - vm.payableToday) + retailPos.dueAmount;
  const todayProfit = todayPnl.netProfit + retailPos.profit;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={t("dashboard.eyebrow")}
        title={t("dashboard.title")}
        description={t("dashboard.description")}
      />

      {/* ── 1. FINANCIAL HEALTH ── */}
      {financeDashboard ? (
        <div className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_24px_60px_rgba(var(--slate-900),0.07)] ring-1 ring-[color-mix(in_srgb,var(--brand)_8%,transparent)]">
          <div className="px-7 pb-4 pt-6">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-[var(--secondary-soft)] p-1.5">
                <Landmark size={13} className="text-[var(--secondary-strong)]" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-600">
                {t("dashboard.financialHealth")}
              </p>
            </div>
          </div>

          <div className="grid gap-px bg-slate-100/80 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: t("dashboard.cashInHand"),
                value: formatCurrency(cashInHand, language),
                sub: t("dashboard.cashInHandHelper"),
                icon: Wallet,
                iconClass: "bg-emerald-50 text-emerald-700",
                valueClass: "text-slate-950",
              },
              {
                label: t("dashboard.cashInBank"),
                value: formatCurrency(cashInBank, language),
                sub: t("dashboard.cashInBankHelper"),
                icon: Landmark,
                iconClass: "bg-[var(--secondary-soft)] text-[var(--secondary-strong)]",
                valueClass: "text-slate-950",
              },
              {
                label: t("dashboard.monthlyProfit"),
                value: formatCurrency(financeDashboard.monthlyProfit, language),
                sub: t("dashboard.monthlyProfitHelper"),
                icon: financeDashboard.monthlyProfit >= 0 ? TrendingUp : TrendingDown,
                iconClass:
                  financeDashboard.monthlyProfit >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600",
                valueClass: financeDashboard.monthlyProfit >= 0 ? "text-emerald-700" : "text-rose-600",
              },
              {
                label: t("dashboard.netPosition"),
                value: formatCurrency(financeDashboard.netPosition, language),
                sub: t("dashboard.netPositionHelper"),
                icon: CircleDollarSign,
                iconClass:
                  financeDashboard.netPosition >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600",
                valueClass: financeDashboard.netPosition >= 0 ? "text-emerald-700" : "text-rose-600",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="bg-white px-7 py-6">
                  <div className={cx("w-fit rounded-xl p-2.5", item.iconClass)}>
                    <Icon size={16} />
                  </div>
                  <p className="mt-4 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">{item.label}</p>
                  <p
                    className={cx(
                      "mt-2 text-[clamp(1.4rem,2.5vw,1.875rem)] font-black tracking-tight leading-none",
                      item.valueClass,
                    )}
                  >
                    {item.value}
                  </p>
                  <p className="mt-2 text-xs font-medium text-slate-500">{item.sub}</p>
                </div>
              );
            })}
          </div>

          <div className="grid gap-px bg-slate-100/80 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Value in Inventory",
                value: formatCurrency(inventoryValue, language),
                sub: "Healthy stock at purchase cost",
                icon: Boxes,
                iconClass: "bg-indigo-50 text-indigo-700",
                valueClass: "text-slate-950",
              },
              {
                label: "Value in Damaged",
                value: formatCurrency(damagedValue, language),
                sub: "Damaged stock at purchase cost",
                icon: AlertTriangle,
                iconClass: "bg-amber-50 text-amber-700",
                valueClass: damagedValue > 0 ? "text-amber-700" : "text-slate-950",
              },
              {
                label: "Total Due",
                value: formatCurrency(totalDue, language),
                sub: "DSR + customer receivables",
                icon: TrendingUp,
                iconClass: "bg-emerald-50 text-emerald-700",
                valueClass: "text-emerald-700",
              },
              {
                label: "Total Owe",
                value: formatCurrency(totalOwe, language),
                sub: "Outstanding to suppliers",
                icon: TrendingDown,
                iconClass: "bg-rose-50 text-rose-600",
                valueClass: totalOwe > 0 ? "text-rose-600" : "text-slate-950",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="bg-slate-50/60 px-7 py-5">
                  <div className={cx("w-fit rounded-xl p-2.5", item.iconClass)}>
                    <Icon size={16} />
                  </div>
                  <p className="mt-4 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">{item.label}</p>
                  <p className={cx("mt-2 text-[clamp(1.4rem,2.5vw,1.875rem)] font-black tracking-tight leading-none", item.valueClass)}>
                    {item.value}
                  </p>
                  <p className="mt-2 text-xs font-medium text-slate-500">{item.sub}</p>
                </div>
              );
            })}
          </div>

        </div>
      ) : (
        <div className="flex items-center gap-4 rounded-[28px] border border-slate-200/80 bg-white/80 px-6 py-5 shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-400">
            <Lock size={18} />
          </div>
          <div>
            <p className="text-sm font-black text-slate-700">{t("dashboard.financialHealth")}</p>
            <p className="text-xs font-medium text-slate-500">
              Finance dashboard permission required to view financial data.
            </p>
          </div>
        </div>
      )}

      {/* ── 2. TODAY'S PROFIT REPORT ── */}
      <div className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_24px_60px_rgba(var(--slate-900),0.07)] ring-1 ring-[color-mix(in_srgb,var(--brand)_8%,transparent)]">
        <div className="px-7 pb-4 pt-6">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-50 p-1.5">
              <TrendingUp size={13} className="text-emerald-700" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-600">
              Today's Profit Report
            </p>
          </div>
        </div>

        <div className="grid gap-px bg-slate-100/80 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Today's Sales",
              value: formatCurrency(todaySales, language),
              sub: "DSR + retail + wholesale + dealer",
              icon: ShoppingCart,
              iconClass: "bg-blue-50 text-blue-700",
              valueClass: "text-slate-950",
            },
            {
              label: "Today's Due",
              value: formatCurrency(todayDue, language),
              sub: "Uncollected from all today's sales",
              icon: HandCoins,
              iconClass: todayDue > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700",
              valueClass: todayDue > 0 ? "text-amber-700" : "text-slate-950",
            },
            {
              label: "Today's Expense",
              value: formatCurrency(todayPnl.expenseTotal, language),
              sub: "Total expenses today",
              icon: Receipt,
              iconClass: todayPnl.expenseTotal > 0 ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-500",
              valueClass: todayPnl.expenseTotal > 0 ? "text-rose-600" : "text-slate-950",
            },
            {
              label: "Today's Profit",
              value: formatCurrency(todayProfit, language),
              sub: "All channels minus expenses",
              icon: todayProfit >= 0 ? TrendingUp : TrendingDown,
              iconClass: todayProfit >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600",
              valueClass: todayProfit >= 0 ? "text-emerald-700" : "text-rose-600",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="bg-white px-7 py-6">
                <div className={cx("w-fit rounded-xl p-2.5", item.iconClass)}>
                  <Icon size={16} />
                </div>
                <p className="mt-4 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">{item.label}</p>
                <p className={cx("mt-2 text-[clamp(1.4rem,2.5vw,1.875rem)] font-black tracking-tight leading-none", item.valueClass)}>
                  {item.value}
                </p>
                <p className="mt-2 text-xs font-medium text-slate-500">{item.sub}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. MONTHLY ANALYTICS ── */}
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartPanel
          title="Monthly Sales"
          description="Total revenue from all channels over the last 12 months."
        >
          <TrendChart
            data={monthlyTrend.length > 0 ? monthlyTrend : Array.from({ length: 12 }, (_, i) => ({ label: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i], sales: 0, profit: 0 }))}
            valueFormatter={(v) => formatCurrency(v, language)}
            series={[
              { key: 'sales', label: 'Sales', color: getCssVar('--secondary', '#5e5b8e'), fill: true },
            ]}
            height={220}
          />
        </ChartPanel>

        <ChartPanel
          title="Monthly Profit"
          description="Net profit from invoices over the last 12 months."
        >
          <TrendChart
            data={monthlyTrend.length > 0 ? monthlyTrend : Array.from({ length: 12 }, (_, i) => ({ label: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i], sales: 0, profit: 0 }))}
            valueFormatter={(v) => formatCurrency(v, language)}
            series={[
              { key: 'profit', label: 'Profit', color: getCssVar('--success', '#37a864'), fill: true },
            ]}
            height={220}
          />
        </ChartPanel>
      </div>

      {/* ── 4. INVENTORY BY CATEGORY + TOP PRODUCTS BY CASH ── */}
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartPanel
          title={t("dashboard.inventoryByCategory")}
          description={t("dashboard.inventoryByCategoryDescription")}
        >
          {vm.inventoryByCategory.length ? (
            <HorizontalBarChart
              data={vm.inventoryByCategory.slice(0, 6)}
              valueFormatter={(v) => formatCurrency(v, language)}
            />
          ) : (
            <EmptyState
              title={t("dashboard.noInventoryTitle")}
              description={t("dashboard.noInventoryDescription")}
              icon={Boxes}
            />
          )}
        </ChartPanel>

        <ChartPanel title={t("dashboard.topProductsByCash")} description={t("dashboard.topProductsByCashDescription")}>
          {vm.topPayableProducts.length ? (
            <HorizontalBarChart
              data={vm.topPayableProducts}
              valueFormatter={(v) => formatCurrency(v, language)}
              trackClassName="bg-emerald-50"
            />
          ) : (
            <EmptyState
              title={t("dashboard.noSoldProductsTitle")}
              description={t("dashboard.noSoldProductsDescription")}
              icon={PackageCheck}
            />
          )}
        </ChartPanel>
      </div>

      {/* ── 2. TRADING TREND + RECEIVABLES & PAYABLES ── */}
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <ChartPanel title={t("dashboard.tradingTrend")} description={t("dashboard.tradingTrendDescription")}>
          <TrendChart
            data={vm.tradingTrend}
            valueFormatter={(v) => formatCurrency(v, language)}
            series={[
              { key: "paid", label: t("dashboard.revenue"), color: getCssVar("--success", "#37a864"), fill: true },
              { key: "sold", label: t("dashboard.unitsSold"), color: getCssVar("--accent-orange", "#f5820f") },
            ]}
          />
        </ChartPanel>

        {financeDashboard ? (
          <div className="surface overflow-hidden p-5">
            <p className="px-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">
              {t("dashboard.receivablesPayables")}
            </p>
            <p className="mt-1 px-1 text-xs font-medium leading-5 text-slate-500">
              {t("dashboard.receivablesPayablesDescription")}
            </p>
            <div className="mt-4 space-y-2.5">
              <DueRow
                icon={Truck}
                iconClass="bg-[var(--secondary-soft)] text-[var(--secondary-strong)]"
                label={t("dashboard.dsrDueTotal")}
                sub={t("dashboard.dsrDueTotalHelper")}
                value={formatCurrency(financeDashboard.totalDsrDue, language)}
              />
              <DueRow
                icon={UserCheck}
                iconClass="bg-emerald-50 text-emerald-700"
                label={t("dashboard.customerDueTotal")}
                sub={t("dashboard.customerDueTotalHelper")}
                value={formatCurrency(financeDashboard.totalCustomerDue, language)}
              />
              <DueRow
                icon={HandCoins}
                iconClass="bg-rose-50 text-rose-600"
                label={t("dashboard.supplierDueTotal")}
                sub={t("dashboard.supplierDueTotalHelper")}
                value={formatCurrency(financeDashboard.totalSupplierDue, language)}
                valueClass="text-rose-600"
              />
            </div>
            <div className="mt-4 rounded-[18px] bg-slate-50 px-5 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-600">
                  {t("dashboard.netPosition")}
                </p>
                <p
                  className={cx(
                    "text-sm font-black",
                    financeDashboard.netPosition >= 0 ? "text-emerald-700" : "text-rose-600",
                  )}
                >
                  {formatCurrency(financeDashboard.netPosition, language)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="surface overflow-hidden p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">
              {t("dashboard.receivablesPayables")}
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-2 py-8 text-center">
              <Lock size={20} className="text-slate-300" />
              <p className="text-xs font-medium text-slate-500">{t('dashboard.financeUnavailable')}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. RETAIL POS TODAY + DSR CASH LEADERBOARD ── */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Retail POS Today */}
        <ChartPanel title={t("dashboard.retailPosToday")} description={t("dashboard.retailPosTodayDescription")}>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricPill
              label={t("dashboard.retailRevenue")}
              value={formatCurrency(retailPos.revenue, language)}
              sub={t("dashboard.retailRevenueHelper")}
              icon={Store}
              iconClass="bg-[var(--secondary-soft)] text-[var(--secondary-strong)]"
            />
            <MetricPill
              label={t("dashboard.retailInvoices")}
              value={formatNumber(retailPos.invoiceCount, language)}
              sub={t("dashboard.retailInvoicesHelper")}
              icon={ShoppingCart}
              iconClass="bg-emerald-50 text-emerald-700"
            />
            <MetricPill
              label={t("dashboard.retailAvgBasket")}
              value={formatCurrency(retailPos.avgBasket, language)}
              sub={t("dashboard.retailAvgBasketHelper")}
              icon={Wallet}
              iconClass="bg-amber-50 text-amber-700"
            />
          </div>

          {retailCashSession !== undefined && (
            <div
              className={cx(
                "mt-3 flex items-center gap-3 rounded-[20px] px-5 py-3.5 transition-colors",
                retailCashSession ? "bg-emerald-50 ring-1 ring-emerald-200/60" : "bg-slate-50 ring-1 ring-slate-200/50",
              )}
            >
              <div
                className={cx(
                  "rounded-xl p-2",
                  retailCashSession ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500",
                )}
              >
                <Landmark size={15} />
              </div>
              <div>
                <p className={cx("text-sm font-bold", retailCashSession ? "text-emerald-800" : "text-slate-700")}>
                  {retailCashSession ? t("dashboard.cashSessionOpen") : t("dashboard.cashSessionClosed")}
                </p>
                <p className="text-xs font-medium text-slate-500">
                  {retailCashSession ? t("dashboard.cashSessionOpenDetail") : t("dashboard.cashSessionClosedDetail")}
                </p>
              </div>
              <div
                className={cx(
                  "ml-auto h-2 w-2 shrink-0 rounded-full",
                  retailCashSession ? "bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.7)]" : "bg-slate-300",
                )}
              />
            </div>
          )}
        </ChartPanel>

        {/* DSR Cash Leaderboard */}
        <ChartPanel title={t("dashboard.dsrLeaderboard")} description={t("dashboard.dsrLeaderboardDescription")}>
          {dsrLeaderboard.length ? (
            <div className="space-y-2.5">
              {dsrLeaderboard.map((dsr, index) => {
                const pct = dsrLeaderboard[0].value > 0 ? Math.round((dsr.value / dsrLeaderboard[0].value) * 100) : 0;
                return (
                  <div
                    key={dsr.label}
                    className="flex items-center gap-3 rounded-[20px] bg-white/60 px-4 py-3.5 ring-1 ring-slate-200/50 transition-colors"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-500">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-bold text-slate-800">{dsr.label}</p>
                        <p className="shrink-0 text-sm font-black text-slate-950">{formatCurrency(dsr.value, language)}</p>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[var(--secondary)] transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title={t("dashboard.noDsrCashToday")}
              description={t("dashboard.noDsrCashTodayDescription")}
              icon={HandCoins}
            />
          )}
        </ChartPanel>
      </div>

      {/* ── 4b. CASH FLOW FORECAST + IDLE TODAY ── */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Cash Flow Forecast */}
        {financeDashboard ? (
          <ChartPanel title="Cash Flow Forecast" description="Available cash vs expected inflows and outflows this month.">
            {(() => {
              const available = cashInHand + cashInBank;
              const inflow = (financeDashboard.totalDsrDue ?? 0) + (financeDashboard.totalCustomerDue ?? 0);
              const outflow = financeDashboard.totalSupplierDue ?? 0;
              const net = available + inflow - outflow;
              const rows = [
                { label: 'Cash in Hand', value: cashInHand, icon: Wallet, cls: 'bg-slate-100 text-slate-600' },
                { label: 'Cash in Bank', value: cashInBank, icon: Landmark, cls: 'bg-blue-50 text-blue-700' },
                { label: 'Expected In (Dues)', value: inflow, icon: TrendingUp, cls: 'bg-emerald-50 text-emerald-700' },
                { label: 'Expected Out (Supplier)', value: outflow, icon: TrendingDown, cls: 'bg-rose-50 text-rose-600', negative: true },
              ];
              return (
                <div className="space-y-2.5">
                  {rows.map((r) => (
                    <div key={r.label} className="flex items-center gap-3 rounded-[18px] bg-slate-50/60 px-4 py-2.5 ring-1 ring-slate-200/40">
                      <div className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', r.cls)}>
                        <r.icon size={14} />
                      </div>
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{r.label}</p>
                      <p className={cx('shrink-0 text-sm font-black', r.negative ? 'text-rose-600' : 'text-slate-950')}>
                        {r.negative ? '− ' : ''}{formatCurrency(r.value, language)}
                      </p>
                    </div>
                  ))}
                  <div className="mt-2 flex items-center justify-between rounded-[18px] bg-slate-100 px-5 py-3">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Net Cash Position</p>
                    <p className={cx('text-sm font-black', net >= 0 ? 'text-emerald-600' : 'text-rose-500')}>
                      {formatCurrency(net, language)}
                    </p>
                  </div>
                </div>
              );
            })()}
          </ChartPanel>
        ) : null}

        {/* Idle Today */}
        {(() => {
          const totalPages = Math.max(1, Math.ceil(noSaleToday.length / NO_SALE_PAGE_SIZE));
          const safePage = Math.min(noSalePage, totalPages);
          const pageItems = noSaleToday.slice((safePage - 1) * NO_SALE_PAGE_SIZE, safePage * NO_SALE_PAGE_SIZE);
          return (
            <ChartPanel title="Idle Today" description={`${noSaleToday.length} in-stock product${noSaleToday.length === 1 ? '' : 's'} with no movement today.`}>
              {noSaleToday.length === 0 ? (
                <EmptyState title="All clear!" description="Every in-stock product moved today." icon={PackageCheck} />
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="space-y-1.5">
                    {pageItems.map((p) => (
                      <div key={p.id} className="flex items-center gap-2.5 rounded-[16px] bg-slate-50/70 px-3.5 py-2.5 ring-1 ring-slate-200/40">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-50">
                          <PackageX size={13} className="text-rose-400" />
                        </div>
                        <p className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800">{p.name}</p>
                      </div>
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 disabled:opacity-30"
                        disabled={safePage === 1}
                        onClick={() => setNoSalePage((p) => p - 1)}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <p className="text-[11px] font-medium text-slate-500">{safePage} / {totalPages}</p>
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 disabled:opacity-30"
                        disabled={safePage === totalPages}
                        onClick={() => setNoSalePage((p) => p + 1)}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </ChartPanel>
          );
        })()}

      </div>

      {/* ── 5. TOP SELLS + LEAST SELLS ── */}
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartPanel
          title={t('dashboard.topSellingTitle')}
          description={t('dashboard.topSellingDesc')}
        >
          {vm.topSellingProducts.length ? (
            <HorizontalBarChart
              data={vm.topSellingProducts}
              valueFormatter={(v) => `${formatNumber(v, language)} pcs`}
            />
          ) : (
            <EmptyState
              title={t('dashboard.topSellingEmpty')}
              description={t('dashboard.topSellingEmptyDesc')}
              icon={PackageCheck}
            />
          )}
        </ChartPanel>

        <ChartPanel
          title={t('dashboard.leastSellingTitle')}
          description={t('dashboard.leastSellingDesc')}
        >
          {vm.leastSellingProducts.length ? (
            <HorizontalBarChart
              data={vm.leastSellingProducts}
              valueFormatter={(v) => `${formatNumber(v, language)} pcs`}
              trackClassName="bg-rose-50"
            />
          ) : (
            <EmptyState
              title={t('dashboard.topSellingEmpty')}
              description={t('dashboard.topSellingEmptyDesc')}
              icon={Boxes}
            />
          )}
        </ChartPanel>
      </div>

      {/* ── 7. ACTIVITY HEATMAP ── */}
      <ChartPanel title={t("dashboard.activityHeatmap")} description={t("dashboard.activityHeatmapDescription")}>
        <ActivityHeatmap cells={vm.activityHeatmap} color={secondary} t={t} language={language} />
      </ChartPanel>
    </div>
  );
}
