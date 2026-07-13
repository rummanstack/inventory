import { Ban, CheckCircle2, CreditCard, Gauge, HandCoins, PiggyBank, ShieldAlert, TrendingUp, Wallet } from 'lucide-react';
import { Alert, SectionHeader, StatCard, StatCardSkeleton } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency } from '../../../utils/calculations.js';
import { useInstallmentDashboardViewModel } from '../viewmodels/useInstallmentDashboardViewModel.js';

export default function InstallmentDashboardPage() {
  const { t, language } = useInventoryApp();
  const { data, loading, error } = useInstallmentDashboardViewModel();

  return (
    <div>
      <SectionHeader eyebrow={t('installments.dashboard.eyebrow')} title={t('installments.dashboard.title')} />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <Alert type="error">{error}</Alert>
      ) : data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard title={t('installments.dashboard.todaysDue')} value={formatCurrency(data.todaysDue, language)} icon={Wallet} tone="blue" />
          <StatCard title={t('installments.dashboard.todaysCollections')} value={formatCurrency(data.todaysCollections, language)} icon={HandCoins} tone="emerald" />
          <StatCard title={t('installments.dashboard.overdueAmount')} value={formatCurrency(data.overdueAmount, language)} icon={ShieldAlert} tone="rose" />
          <StatCard title={t('installments.dashboard.upcomingDue')} value={formatCurrency(data.upcomingDue, language)} icon={CreditCard} tone="amber" />
          <StatCard title={t('installments.dashboard.outstandingReceivable')} value={formatCurrency(data.outstandingReceivable, language)} icon={PiggyBank} tone="indigo" />
          <StatCard title={t('installments.dashboard.expectedMonthlyCollection')} value={formatCurrency(data.expectedMonthlyCollection, language)} icon={TrendingUp} tone="blue" />
          <StatCard title={t('installments.dashboard.monthToDateCollection')} value={formatCurrency(data.monthToDateCollection, language)} icon={HandCoins} tone="emerald" />
          <StatCard title={t('installments.dashboard.collectionPerformance')} value={`${data.collectionPerformance}%`} icon={Gauge} tone="slate" />
          <StatCard title={t('installments.dashboard.defaultRate')} value={`${data.defaultRate}%`} icon={Ban} tone="rose" />
          <StatCard title={t('installments.dashboard.activePlans')} value={data.activePlans} icon={CreditCard} tone="blue" />
          <StatCard title={t('installments.dashboard.completedPlans')} value={data.completedPlans} icon={CheckCircle2} tone="emerald" />
          <StatCard title={t('installments.dashboard.writtenOffPlans')} value={data.writtenOffPlans} icon={Ban} tone="rose" />
          <StatCard title={t('installments.dashboard.cancelledPlans')} value={data.cancelledPlans} icon={Ban} tone="slate" />
        </div>
      ) : null}
    </div>
  );
}
