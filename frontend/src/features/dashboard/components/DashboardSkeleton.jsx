import { CardSkeleton, ChartPanelSkeleton, StatCardSkeleton } from '../../../components/ui.jsx';

export default function DashboardSkeleton() {
  return (
    <div>
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <ChartPanelSkeleton height="h-64" />
        <ChartPanelSkeleton height="h-64" />
      </div>

      <div className="mt-6">
        <ChartPanelSkeleton height="h-40" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <ChartPanelSkeleton />
        <ChartPanelSkeleton />
        <ChartPanelSkeleton />
      </div>

      <div className="mt-6">
        <CardSkeleton height="h-72" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <CardSkeleton key={index} height="h-28" />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <ChartPanelSkeleton height="h-48" />
        <ChartPanelSkeleton height="h-48" />
      </div>
    </div>
  );
}
