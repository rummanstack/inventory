import { CardSkeleton, ChartPanelSkeleton } from '../../../components/ui.jsx';

function PulseBlock({ className }) {
  return <div className={`skeleton rounded-card ${className}`} />;
}

function FinancialHealthSkeleton() {
  return (
    <div className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_24px_60px_rgba(0,0,0,0.06)]">
      {/* header */}
      <div className="px-7 pb-4 pt-6">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 skeleton rounded-lg" />
          <div className="h-3 w-32 skeleton rounded-full" />
        </div>
      </div>
      {/* row 1 — 4 white cells */}
      <div className="grid gap-px bg-slate-100/80 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white px-7 py-6">
            <div className="h-8 w-8 skeleton rounded-xl" />
            <div className="mt-4 h-2.5 w-24 skeleton rounded-full" />
            <div className="mt-3 h-7 w-32 skeleton rounded-full" />
            <div className="mt-2 h-2 w-28 skeleton rounded-full" />
          </div>
        ))}
      </div>
      {/* row 2 — 4 tinted cells */}
      <div className="grid gap-px bg-slate-100/80 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-slate-50/60 px-7 py-5">
            <div className="h-8 w-8 skeleton rounded-xl" />
            <div className="mt-4 h-2.5 w-24 skeleton rounded-full" />
            <div className="mt-3 h-7 w-32 skeleton rounded-full" />
            <div className="mt-2 h-2 w-28 skeleton rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Financial Health */}
      <FinancialHealthSkeleton />

      {/* Trading Trend + Receivables */}
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <ChartPanelSkeleton height="h-64" />
        <ChartPanelSkeleton height="h-64" />
      </div>

      {/* Retail POS + DSR Leaderboard */}
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartPanelSkeleton height="h-56" />
        <ChartPanelSkeleton height="h-56" />
      </div>

      {/* Inventory by Category + Top Products by Cash */}
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartPanelSkeleton height="h-56" />
        <ChartPanelSkeleton height="h-56" />
      </div>

      {/* Top Sells + Least Sells */}
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartPanelSkeleton height="h-56" />
        <ChartPanelSkeleton height="h-56" />
      </div>

      {/* Activity Heatmap */}
      <ChartPanelSkeleton height="h-40" />
    </div>
  );
}
