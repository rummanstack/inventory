import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Download, FileSpreadsheet, Printer, RefreshCw, Sparkles, TrendingUp, Users, UserRound } from 'lucide-react';
import { Alert, Badge, EmptyState, SectionHeader, StatCard, StatCardSkeleton, TableSkeleton, Select } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { downloadSheetPdf } from '../../../services/printService.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, formatDate, formatNumber } from '../../../utils/calculations.js';

const RETENTION_PRINT_ID = 'retail-customer-retention-print';

function formatDays(value, t, language) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return t('retailCustomers.retention.notAvailable');
  }

  return `${formatNumber(value, language)} ${t('retailCustomers.retention.days')}`;
}

function retentionTone(customer) {
  if (customer.customerTier === 'VIP') return 'emerald';
  if (customer.customerTier === 'LOYAL') return 'blue';
  if (customer.customerTier === 'REPEAT') return 'amber';
  return 'slate';
}

function useRetentionSelection(rows, selectedId, setSelectedId) {
  useEffect(() => {
    if (!rows.length) {
      setSelectedId('');
      return;
    }
    if (!selectedId || !rows.some((row) => row.id === selectedId)) {
      setSelectedId(rows[0].id);
    }
  }, [rows, selectedId, setSelectedId]);
}

export default function RetailCustomerRetentionPage() {
  const { t, language } = useInventoryApp();
  const [inactiveWindowDays, setInactiveWindowDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [response, setResponse] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  const customers = response?.customers || [];
  const repeatCustomers = response?.repeatCustomers || [];
  const inactiveCustomers = response?.inactiveCustomers || [];
  const rewardCandidates = response?.rewardCandidates || [];
  const summary = response?.summary || {};

  useRetentionSelection(repeatCustomers.length ? repeatCustomers : customers, selectedCustomerId, setSelectedCustomerId);

  const selectedCustomer = useMemo(() => {
    const allRows = [...repeatCustomers, ...inactiveCustomers, ...rewardCandidates, ...customers];
    return allRows.find((row) => row.id === selectedCustomerId) || repeatCustomers[0] || customers[0] || null;
  }, [repeatCustomers, inactiveCustomers, rewardCandidates, customers, selectedCustomerId]);

  function selectedFollowUpKey(customer) {
    if (!customer) return 'retailCustomers.retention.followUpHealthy';
    if (!customer.hasPurchaseHistory) return 'retailCustomers.retention.followUpNew';
    if (customer.daysSinceLastPurchase !== null && customer.daysSinceLastPurchase >= inactiveWindowDays) {
      return 'retailCustomers.retention.followUpInactive';
    }
    if (customer.pointsToNextReward > 0 && customer.pointsToNextReward <= 20) {
      return 'retailCustomers.retention.followUpReward';
    }
    return 'retailCustomers.retention.followUpHealthy';
  }

  async function loadRetention() {
    try {
      setLoading(true);
      setError('');
      const result = await inventoryApi.getRetailCustomerRetentionInsights({ inactiveWindowDays });
      setResponse(result);
    } catch (requestError) {
      setError(requestError?.message || t('alerts.requestFailed'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRetention();
  }, [inactiveWindowDays, t]);

  async function handleExportExcel() {
    const { utils, writeFile } = await import('xlsx');
    const wb = utils.book_new();

    const repeatHeader = [t('retailCustomers.name'), t('retailCustomers.phone'), t('retailCustomers.retention.purchases'), t('retailCustomers.retention.spent'), t('retailCustomers.retention.lastPurchase'), t('retailCustomers.loyaltyPoints'), t('retailCustomers.retention.tier')];
    const repeatData = repeatCustomers.map((customer) => [
      customer.name,
      customer.phone || '',
      Number(customer.purchaseCount || 0),
      Number(customer.totalSpent || 0),
      customer.lastPurchaseAt ? formatDate(customer.lastPurchaseAt) : '',
      Number(customer.pointsBalance || 0),
      t(`retailCustomers.retention.tiers.${customer.customerTier}`),
    ]);
    const repeatWs = utils.aoa_to_sheet([repeatHeader, ...repeatData]);
    repeatWs['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }];
    utils.book_append_sheet(wb, repeatWs, t('retailCustomers.retention.repeatTitle'));

    const inactiveHeader = [t('retailCustomers.name'), t('retailCustomers.phone'), t('retailCustomers.retention.daysIdle'), t('retailCustomers.retention.lastPurchase'), t('retailCustomers.loyaltyPoints')];
    const inactiveData = inactiveCustomers.map((customer) => [
      customer.name,
      customer.phone || '',
      customer.daysSinceLastPurchase ?? '',
      customer.lastPurchaseAt ? formatDate(customer.lastPurchaseAt) : '',
      Number(customer.pointsBalance || 0),
    ]);
    const inactiveWs = utils.aoa_to_sheet([inactiveHeader, ...inactiveData]);
    inactiveWs['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
    utils.book_append_sheet(wb, inactiveWs, t('retailCustomers.retention.inactiveTitle'));

    const rewardHeader = [t('retailCustomers.name'), t('retailCustomers.phone'), t('retailCustomers.loyaltyPoints'), t('retailCustomers.retention.nextReward')];
    const rewardData = rewardCandidates.map((customer) => [
      customer.name,
      customer.phone || '',
      Number(customer.pointsBalance || 0),
      customer.pointsToNextReward === 0 ? t('retailCustomers.retention.rewardReady') : Number(customer.pointsToNextReward || 0),
    ]);
    const rewardWs = utils.aoa_to_sheet([rewardHeader, ...rewardData]);
    rewardWs['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 16 }];
    utils.book_append_sheet(wb, rewardWs, t('retailCustomers.retention.rewardTitle'));

    writeFile(wb, 'retail-customer-retention.xlsx');
  }

  if (loading && !response) {
    return (
      <div className="space-y-6">
        <SectionHeader eyebrow={t('nav.retailCustomerRetention')} title={t('retailCustomers.retention.title')} description={t('retailCustomers.retention.description')} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => <StatCardSkeleton key={index} />)}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-6">
            <div className="surface overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="h-4 w-48 animate-pulse rounded-full bg-slate-200" />
              </div>
              <TableSkeleton rows={6} columns={6} />
            </div>
            <div className="surface overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="h-4 w-44 animate-pulse rounded-full bg-slate-200" />
              </div>
              <TableSkeleton rows={6} columns={6} />
            </div>
          </div>
          <div className="space-y-6">
            <div className="surface overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200" />
              </div>
              <div className="p-5">
                <div className="h-40 animate-pulse rounded-[22px] bg-slate-100" />
              </div>
            </div>
            <div className="surface overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="h-4 w-44 animate-pulse rounded-full bg-slate-200" />
              </div>
              <TableSkeleton rows={4} columns={5} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={t('nav.retailCustomerRetention')}
        title={t('retailCustomers.retention.title')}
        description={t('retailCustomers.retention.description')}
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <Select className="input h-10 w-36" value={inactiveWindowDays} onChange={(event) => setInactiveWindowDays(Number(event.target.value))}>
              <option value={30}>{t('retailCustomers.retention.inactiveDaysOption', { count: 30 })}</option>
              <option value={60}>{t('retailCustomers.retention.inactiveDaysOption', { count: 60 })}</option>
              <option value={90}>{t('retailCustomers.retention.inactiveDaysOption', { count: 90 })}</option>
            </Select>
            <button type="button" className="btn-secondary" onClick={loadRetention} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              {t('common.reload')}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { inventoryApi.recordPrint({ entityType: 'retail_customer_retention', entityId: null, label: 'pdf' }).catch(() => {}); downloadSheetPdf(RETENTION_PRINT_ID, 'retail-customer-retention.pdf'); }}
            >
              <Download size={16} />
              {t('purchaseReceive.downloadPdf')}
            </button>
            <button type="button" className="btn-secondary" onClick={handleExportExcel}>
              <FileSpreadsheet size={16} />
              {t('common.exportExcel')}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { inventoryApi.recordPrint({ entityType: 'retail_customer_retention', entityId: null, label: 'print' }).catch(() => {}); window.print(); }}
            >
              <Printer size={16} />
              {t('common.print')}
            </button>
          </div>
        )}
      />

      {error ? <Alert type="error">{error}</Alert> : null}
      {response && !summary.totalCustomers ? (
        <EmptyState title={t('retailCustomers.retention.emptyTitle')} description={t('retailCustomers.retention.emptyDescription')} icon={Users} />
      ) : null}

      <div id={RETENTION_PRINT_ID} className="print-target space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title={t('retailCustomers.retention.totalCustomers')} value={formatNumber(summary.totalCustomers || 0, language)} icon={Users} tone="slate" />
        <StatCard title={t('retailCustomers.retention.purchasedCustomers')} value={formatNumber(summary.purchasedCustomers || 0, language)} icon={TrendingUp} tone="blue" />
        <StatCard title={t('retailCustomers.retention.repeatCustomers')} value={formatNumber(summary.repeatCustomers || 0, language)} icon={Sparkles} tone="emerald" />
        <StatCard title={t('retailCustomers.retention.inactiveCustomers')} value={formatNumber(summary.inactiveCustomers || 0, language)} icon={UserRound} tone="amber" />
        <StatCard title={t('retailCustomers.retention.nearRewardCustomers')} value={formatNumber(summary.nearRewardCustomers || 0, language)} icon={ArrowRight} tone="rose" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-6">
          <div className="surface overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="section-title">{t('retailCustomers.retention.repeatTitle')}</h2>
                  <p className="mt-1 text-sm text-slate-500">{t('retailCustomers.retention.repeatDescription')}</p>
                </div>
                <Badge tone="emerald">{formatNumber(summary.repeatPurchaseRate || 0, language)}%</Badge>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">{t('retailCustomers.name')}</th>
                    <th className="px-4 py-3 text-right">{t('retailCustomers.retention.purchases')}</th>
                    <th className="px-4 py-3 text-right">{t('retailCustomers.retention.spent')}</th>
                    <th className="px-4 py-3">{t('retailCustomers.retention.lastPurchase')}</th>
                    <th className="px-4 py-3 text-right">{t('retailCustomers.loyaltyPoints')}</th>
                    <th className="px-4 py-3">{t('retailCustomers.retention.tier')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {repeatCustomers.map((customer) => (
                    <tr key={customer.id} className={`cursor-pointer hover:bg-slate-50 ${selectedCustomer?.id === customer.id ? 'bg-slate-50' : ''}`} onClick={() => setSelectedCustomerId(customer.id)}>
                      <td className="table-cell">
                        <p className="font-semibold text-slate-950">{customer.name}</p>
                        <p className="text-xs text-slate-500">{customer.phone || '-'}</p>
                      </td>
                      <td className="table-cell text-right font-semibold text-slate-950">{formatNumber(customer.purchaseCount || 0, language)}</td>
                      <td className="table-cell text-right font-semibold text-slate-950">{formatCurrency(customer.totalSpent || 0, language)}</td>
                      <td className="table-cell text-sm font-semibold text-slate-700">{customer.lastPurchaseAt ? formatDate(customer.lastPurchaseAt, language) : t('retailCustomers.retention.neverPurchased')}</td>
                      <td className="table-cell text-right font-semibold text-emerald-700">{formatNumber(customer.pointsBalance || 0, language)}</td>
                      <td className="table-cell">
                        <Badge tone={retentionTone(customer)}>{t(`retailCustomers.retention.tiers.${customer.customerTier}`)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!repeatCustomers.length ? (
              <div className="p-5">
                <EmptyState title={t('retailCustomers.retention.noRepeatTitle')} description={t('retailCustomers.retention.noRepeatDescription')} icon={Sparkles} />
              </div>
            ) : null}
          </div>

          <div className="surface overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">{t('retailCustomers.retention.inactiveTitle')}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('retailCustomers.retention.inactiveDescription', { count: inactiveWindowDays })}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">{t('retailCustomers.name')}</th>
                    <th className="px-4 py-3 text-right">{t('retailCustomers.retention.daysIdle')}</th>
                    <th className="px-4 py-3">{t('retailCustomers.retention.lastPurchase')}</th>
                    <th className="px-4 py-3 text-right">{t('retailCustomers.loyaltyPoints')}</th>
                    <th className="px-4 py-3">{t('retailCustomers.retention.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inactiveCustomers.map((customer) => (
                    <tr key={customer.id} className={`cursor-pointer hover:bg-slate-50 ${selectedCustomer?.id === customer.id ? 'bg-slate-50' : ''}`} onClick={() => setSelectedCustomerId(customer.id)}>
                      <td className="table-cell">
                        <p className="font-semibold text-slate-950">{customer.name}</p>
                        <p className="text-xs text-slate-500">{customer.phone || '-'}</p>
                      </td>
                      <td className="table-cell text-right font-semibold text-rose-700">{formatDays(customer.daysSinceLastPurchase, t, language)}</td>
                      <td className="table-cell text-sm font-semibold text-slate-700">{customer.lastPurchaseAt ? formatDate(customer.lastPurchaseAt, language) : t('retailCustomers.retention.neverPurchased')}</td>
                      <td className="table-cell text-right font-semibold text-slate-950">{formatNumber(customer.pointsBalance || 0, language)}</td>
                      <td className="table-cell text-sm font-semibold text-slate-600">{t(`retailCustomers.retention.actions.${selectedFollowUpKey(customer).split('.').pop()}`)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!inactiveCustomers.length ? (
              <div className="p-5">
                <EmptyState title={t('retailCustomers.retention.noInactiveTitle')} description={t('retailCustomers.retention.noInactiveDescription')} icon={UserRound} />
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="surface overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">{t('retailCustomers.retention.profileTitle')}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('retailCustomers.retention.profileDescription')}</p>
            </div>
            {selectedCustomer ? (
              <div className="p-5">
                <div className="rounded-card border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{selectedCustomer.name}</h3>
                      <p className="text-sm text-slate-500">{selectedCustomer.phone || t('retailCustomers.retention.noPhone')}</p>
                    </div>
                    <Badge tone={retentionTone(selectedCustomer)}>{t(`retailCustomers.retention.tiers.${selectedCustomer.customerTier}`)}</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-600">{t('retailCustomers.retention.purchaseCount')}</span>
                      <span className="font-semibold text-slate-950">{formatNumber(selectedCustomer.purchaseCount || 0, language)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-600">{t('retailCustomers.retention.firstPurchase')}</span>
                      <span className="font-semibold text-slate-950">{selectedCustomer.firstPurchaseAt ? formatDate(selectedCustomer.firstPurchaseAt, language) : t('retailCustomers.retention.neverPurchased')}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-600">{t('retailCustomers.retention.lastPurchase')}</span>
                      <span className="font-semibold text-slate-950">{selectedCustomer.lastPurchaseAt ? formatDate(selectedCustomer.lastPurchaseAt, language) : t('retailCustomers.retention.neverPurchased')}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-600">{t('retailCustomers.retention.totalSpent')}</span>
                      <span className="font-semibold text-slate-950">{formatCurrency(selectedCustomer.totalSpent || 0, language)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-600">{t('retailCustomers.loyaltyPoints')}</span>
                      <span className="font-semibold text-emerald-700">{formatNumber(selectedCustomer.pointsBalance || 0, language)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-600">{t('retailCustomers.retention.nextReward')}</span>
                      <span className="font-semibold text-slate-950">{selectedCustomer.pointsToNextReward === 0 ? t('retailCustomers.retention.rewardReady') : formatNumber(selectedCustomer.pointsToNextReward, language)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-600">{t('retailCustomers.retention.daysIdle')}</span>
                      <span className="font-semibold text-rose-700">{formatDays(selectedCustomer.daysSinceLastPurchase, t, language)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-600">{t('retailCustomers.retention.avgGap')}</span>
                      <span className="font-semibold text-slate-950">{formatDays(selectedCustomer.averageDaysBetweenPurchases, t, language)}</span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{t('retailCustomers.retention.followUpTitle')}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{t(selectedFollowUpKey(selectedCustomer), { count: inactiveWindowDays })}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5">
                <EmptyState title={t('retailCustomers.retention.profileEmptyTitle')} description={t('retailCustomers.retention.profileEmptyDescription')} icon={UserRound} />
              </div>
            )}
          </div>

          <div className="surface overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">{t('retailCustomers.retention.rewardTitle')}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('retailCustomers.retention.rewardDescription')}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">{t('retailCustomers.name')}</th>
                    <th className="px-4 py-3 text-right">{t('retailCustomers.loyaltyPoints')}</th>
                    <th className="px-4 py-3 text-right">{t('retailCustomers.retention.nextReward')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rewardCandidates.map((customer) => (
                    <tr key={customer.id} className={`cursor-pointer hover:bg-slate-50 ${selectedCustomer?.id === customer.id ? 'bg-slate-50' : ''}`} onClick={() => setSelectedCustomerId(customer.id)}>
                      <td className="table-cell">
                        <p className="font-semibold text-slate-950">{customer.name}</p>
                        <p className="text-xs text-slate-500">{customer.phone || '-'}</p>
                      </td>
                      <td className="table-cell text-right font-semibold text-emerald-700">{formatNumber(customer.pointsBalance || 0, language)}</td>
                      <td className="table-cell text-right font-semibold text-slate-950">{customer.pointsToNextReward === 0 ? t('retailCustomers.retention.rewardReady') : formatNumber(customer.pointsToNextReward, language)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!rewardCandidates.length ? (
              <div className="p-5">
                <EmptyState title={t('retailCustomers.retention.noRewardTitle')} description={t('retailCustomers.retention.noRewardDescription')} icon={TrendingUp} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

