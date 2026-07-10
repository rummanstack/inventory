import { useEffect, useState } from 'react';
import { BriefcaseBusiness, Building2, Landmark, PiggyBank, Receipt, Scale, Wallet, TrendingUp } from 'lucide-react';
import { Alert, SectionHeader, StatCard } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency } from '../../../utils/calculations.js';

export default function AccountingDashboardPage() {
  const { language } = useInventoryApp();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    inventoryApi.getAccountingDashboard()
      .then((result) => { if (!cancelled) setData(result); })
      .catch((err) => { if (!cancelled) setError(err?.message || 'Failed to load accounting dashboard.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const title = language === 'bn' ? '???????????? ??????????' : 'Accounting Dashboard';
  const description = language === 'bn'
    ? '??????? ???? ???? ?????, ???, ??????, ?? ? ?????? ??????? ??????'
    : 'Current asset, liability, equity, income, and expense totals computed from journal data.';

  return (
    <div>
      <SectionHeader eyebrow="Accounting" title={title} description={description} />
      {error ? <Alert type="error">{error}</Alert> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title={language === 'bn' ? '??? ?????' : 'Total Assets'} rawValue={data?.totalAssets || 0} value={loading ? '...' : formatCurrency(data?.totalAssets || 0, language)} formatter={(v) => formatCurrency(v, language)} icon={Landmark} tone="indigo" />
        <StatCard title={language === 'bn' ? '??? ???' : 'Total Liabilities'} rawValue={data?.totalLiabilities || 0} value={loading ? '...' : formatCurrency(data?.totalLiabilities || 0, language)} formatter={(v) => formatCurrency(v, language)} icon={BriefcaseBusiness} tone="rose" />
        <StatCard title={language === 'bn' ? '??????' : 'Equity'} rawValue={data?.equity || 0} value={loading ? '...' : formatCurrency(data?.equity || 0, language)} formatter={(v) => formatCurrency(v, language)} icon={Scale} tone="emerald" />
        <StatCard title={language === 'bn' ? '??' : 'Income'} rawValue={data?.income || 0} value={loading ? '...' : formatCurrency(data?.income || 0, language)} formatter={(v) => formatCurrency(v, language)} icon={TrendingUp} tone="blue" />
        <StatCard title={language === 'bn' ? '????' : 'Expenses'} rawValue={data?.expenses || 0} value={loading ? '...' : formatCurrency(data?.expenses || 0, language)} formatter={(v) => formatCurrency(v, language)} icon={Receipt} tone="amber" />
        <StatCard title={language === 'bn' ? '????? ?????????' : 'Current Cash'} rawValue={data?.currentCash || 0} value={loading ? '...' : formatCurrency(data?.currentCash || 0, language)} formatter={(v) => formatCurrency(v, language)} icon={Wallet} tone="slate" />
        <StatCard title={language === 'bn' ? '?????? ?????????' : 'Current Bank Balance'} rawValue={data?.currentBankBalance || 0} value={loading ? '...' : formatCurrency(data?.currentBankBalance || 0, language)} formatter={(v) => formatCurrency(v, language)} icon={Building2} tone="indigo" />
        <StatCard title={language === 'bn' ? '???????? / ??????' : 'Receivable / Payable'} value={loading ? '...' : `${formatCurrency(data?.currentReceivable || 0, language)} / ${formatCurrency(data?.currentPayable || 0, language)}`} icon={PiggyBank} tone="slate" />
      </div>
    </div>
  );
}
