import { Banknote, Building2, CircleDollarSign, HandCoins, Landmark, Scale, Store, TrendingUp, Wallet } from 'lucide-react';
import { Alert, LoadingState, SectionHeader, StatCard } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency } from '../../../utils/calculations.js';
import { useFinanceDashboardViewModel } from '../viewmodels/useFinanceDashboardViewModel';

export default function FinanceDashboardPage() {
  const { t } = useInventoryApp();
  const { data, loading, error } = useFinanceDashboardViewModel();

  const cashInHand = data?.accounts?.find((account) => account.type === 'CASH')?.balance || 0;
  const bankBalance = data?.accounts?.find((account) => account.type === 'BANK')?.balance || 0;

  return (
    <div>
      <SectionHeader
        eyebrow={t('financeDashboard.eyebrow')}
        title={t('financeDashboard.title')}
        description={t('financeDashboard.description')}
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <Alert type="error">{error}</Alert>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title={t('financeDashboard.cashInHand')}
            value={formatCurrency(cashInHand)}
            icon={Wallet}
            tone="emerald"
          />
          <StatCard
            title={t('financeDashboard.bankBalance')}
            value={formatCurrency(bankBalance)}
            icon={Landmark}
            tone="blue"
          />
          <StatCard
            title={t('financeDashboard.totalCash')}
            value={formatCurrency(data.totalCashBalance)}
            helper={t('financeDashboard.totalCashHelper')}
            icon={Banknote}
            tone="indigo"
          />
          <StatCard
            title={t('financeDashboard.dsrReceivables')}
            value={formatCurrency(data.totalDsrDue)}
            helper={t('financeDashboard.dsrReceivablesHelper')}
            icon={HandCoins}
            tone="amber"
          />
          <StatCard
            title={t('financeDashboard.customerReceivables')}
            value={formatCurrency(data.totalCustomerDue)}
            helper={t('financeDashboard.customerReceivablesHelper')}
            icon={Store}
            tone="amber"
          />
          <StatCard
            title={t('financeDashboard.supplierPayables')}
            value={formatCurrency(data.totalSupplierDue)}
            helper={t('financeDashboard.supplierPayablesHelper')}
            icon={Building2}
            tone="rose"
          />
          <StatCard
            title={t('financeDashboard.monthlyExpenses')}
            value={formatCurrency(data.monthlyExpenses)}
            helper={t('financeDashboard.monthlyExpensesHelper')}
            icon={CircleDollarSign}
            tone="rose"
          />
          <StatCard
            title={t('financeDashboard.monthlyProfit')}
            value={formatCurrency(data.monthlyProfit)}
            helper={t('financeDashboard.monthlyProfitHelper')}
            icon={TrendingUp}
            tone="emerald"
          />
          <StatCard
            title={t('financeDashboard.netPosition')}
            value={formatCurrency(data.netPosition)}
            helper={t('financeDashboard.netPositionHelper')}
            icon={Scale}
            tone="slate"
          />
        </div>
      )}
    </div>
  );
}
