import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Activity, Box, ClipboardList, ExternalLink, Search, Truck, RotateCcw, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuditHistory from '../../../components/AuditHistory.jsx';
import { Alert, Badge, EmptyState, SectionHeader, StatCard, StatCardSkeleton, TableSkeleton, cx } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatDateTime, formatNumber } from '../../../utils/calculations.js';
import { actionTone } from '../../../models/inventoryViewData.js';
import { useDashboardViewModel } from '../../dashboard/viewmodels/useDashboardViewModel.js';
import { useActivityLogsViewModel } from '../../activity-logs/viewmodels/useActivityLogsViewModel.js';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useTenantApiQuery } from '../../../queries/useTenantApiQuery.js';

function getIssueRoute(log) {
  const entityType = String(log?.entityType || '').toLowerCase();

  switch (entityType) {
    case 'product':
    case 'products':
      return { path: '/products', labelKey: 'nav.products' };
    case 'settlement':
    case 'settlements':
      return { path: '/settlements', labelKey: 'nav.eveningSettlement' };
    case 'morning_issue':
    case 'issue':
    case 'issues':
      return { path: '/morning-issue', labelKey: 'nav.morningIssue' };
    case 'sales_invoice':
    case 'sales-invoice':
      return { path: '/retailer/sales-invoices', labelKey: 'nav.retailerSalesInvoices' };
    case 'purchase_receipt':
    case 'purchase-receipt':
      return { path: '/purchase-receive', labelKey: 'nav.purchaseReceive' };
    case 'customer_payment':
    case 'due_collection':
      return { path: '/retailer/due-collection', labelKey: 'nav.retailerDueCollection' };
    case 'supplier_payment':
      return { path: '/supplier-payments', labelKey: 'nav.supplierPayments' };
    case 'expense':
      return { path: '/expenses', labelKey: 'nav.expenses' };
    case 'retail_customer':
      return { path: '/retail-customers', labelKey: 'nav.retailCustomers' };
    case 'customer':
      return { path: '/customers', labelKey: 'nav.customers' };
    case 'dsr':
      return { path: '/dsrs', labelKey: 'nav.dsrs' };
    case 'report':
      return { path: '/reports', labelKey: 'nav.reports' };
    default:
      return { path: '/activity-logs', labelKey: 'nav.activityLogs' };
  }
}

function isFixLog(log) {
  const action = String(log?.actionType || '').toLowerCase();
  const description = String(log?.description || '').toLowerCase();
  return /(update|delete|restore|adjust|reverse|correction|repair|fix)/.test(action)
    || /(update|delete|restore|adjust|reverse|correction|repair|fix)/.test(description);
}

function groupInvoicesByPotentialDuplicate(invoices = []) {
  const groups = new Map();

  invoices.forEach((invoice) => {
    const key = [
      invoice.customerId || invoice.customerName || 'walk-in',
      invoice.saleType || 'UNKNOWN',
      Number(invoice.totalAmount || 0).toFixed(4),
      Number(invoice.paidAmount || 0).toFixed(4),
      invoice.invoiceDate || '',
      Array.isArray(invoice.items) ? invoice.items.length : 0,
    ].join('|');
    const current = groups.get(key) || [];
    current.push(invoice);
    groups.set(key, current);
  });

  return Array.from(groups.values()).filter((group) => group.length > 1);
}

function IssueCard({ title, value, helper, icon: Icon, tone }) {
  return <StatCard title={title} value={value} helper={helper} icon={Icon} tone={tone} />;
}

export default function IssueCenterPage() {
  const { productDirectory, dsrDirectory, today, t, language, hasFeature } = useInventoryApp();
  const navigate = useNavigate();
  const dashboardVm = useDashboardViewModel({ products: productDirectory, dsrs: dsrDirectory, today, t, language });
  const logsVm = useActivityLogsViewModel();
  const canOpenActivityLogs = hasFeature('activity-logs');
  const [selectedLog, setSelectedLog] = useState(null);
  const [activeTab, setActiveTab] = useState('alerts');
  const smartAlertsQuery = useTenantApiQuery({
    scope: 'issue-center-smart-alerts',
    params: { today },
    queryFn: async () => {
      const [cashSessionResult, invoiceResult] = await Promise.all([
        inventoryApi.getCurrentRetailCashSession(),
        inventoryApi.listSalesInvoices({ dateFrom: today, dateTo: today, pageSize: 100 }),
      ]);
      return {
        currentCashSession: cashSessionResult || { session: null },
        duplicateInvoiceGroups: groupInvoicesByPotentialDuplicate(invoiceResult.items || []),
      };
    },
  });
  const currentCashSession = smartAlertsQuery.data?.currentCashSession || { session: null };
  const duplicateInvoiceGroups = smartAlertsQuery.data?.duplicateInvoiceGroups || [];
  const smartAlertsLoading = smartAlertsQuery.isLoading || smartAlertsQuery.isFetching;
  const smartAlertsError = smartAlertsQuery.error?.message || '';

  const lowStockProducts = useMemo(
    () => [...(dashboardVm.lowStockAll || [])].sort((left, right) => left.stockPieces - right.stockPieces).slice(0, 5),
    [dashboardVm.lowStockAll],
  );

  const pendingDsrs = useMemo(
    () => (dashboardVm.pendingRows || []).slice(0, 5),
    [dashboardVm.pendingRows],
  );

  const recentFixes = useMemo(
    () => (logsVm.logs || []).filter(isFixLog).slice(0, 8),
    [logsVm.logs],
  );

  const settlementMismatchRows = useMemo(() => {
    return (dashboardVm.completedRows || []).filter((row) => {
      const expectedDue = Math.max(0, Number(row.totalPayable || 0) - Number(row.previousDue || 0) - Number(row.amountPaid || 0));
      return Math.abs(expectedDue - Number(row.dueAmount || 0)) > 0.004;
    });
  }, [dashboardVm.completedRows]);

  const cashSessionOpen = Boolean(currentCashSession?.session?.isOpen);
  const cashSessionVariance = Number(currentCashSession?.session?.variance || 0);
  const issueTabs = [
    {
      id: 'alerts',
      label: t('issueCenter.smartAlertsTitle'),
      icon: AlertTriangle,
      count: duplicateInvoiceGroups.length + settlementMismatchRows.length + (cashSessionOpen ? 1 : 0),
    },
    {
      id: 'critical',
      label: t('issueCenter.criticalTitle'),
      icon: Box,
      count: lowStockProducts.length + pendingDsrs.length,
    },
    {
      id: 'fixes',
      label: t('issueCenter.recentFixes'),
      icon: Sparkles,
      count: recentFixes.length,
    },
  ];

  useEffect(() => {
    if (!selectedLog && recentFixes.length) {
      setSelectedLog(recentFixes[0]);
    }
  }, [selectedLog, recentFixes]);

  function openIssueRoute(log) {
    const { path } = getIssueRoute(log);
    if (!canOpenActivityLogs && path === '/activity-logs') {
      return;
    }
    navigate(path);
  }

  if (dashboardVm.loading && !dashboardVm.error) {
    return (
      <div>
        <SectionHeader title={t('issueCenter.title')} compact />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <StatCardSkeleton key={index} />)}
        </div>
        <div className="mt-6">
          <TableSkeleton rows={6} columns={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader title={t('issueCenter.title')} compact />

      {dashboardVm.error ? (
        <Alert type="error">{dashboardVm.error}</Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <IssueCard
          title={t('issueCenter.outOfStock')}
          value={formatNumber(dashboardVm.outOfStockCount || 0, language)}
          helper={t('issueCenter.criticalDescription')}
          icon={AlertTriangle}
          tone="rose"
        />
        <IssueCard
          title={t('issueCenter.lowStock')}
          value={formatNumber(lowStockProducts.length, language)}
          helper={t('issueCenter.criticalDescription')}
          icon={Box}
          tone="amber"
        />
        <IssueCard
          title={t('issueCenter.pendingDsrs')}
          value={formatNumber(pendingDsrs.length, language)}
          helper={t('issueCenter.criticalDescription')}
          icon={Truck}
          tone="blue"
        />
        <IssueCard
          title={t('issueCenter.recentFixes')}
          value={formatNumber(recentFixes.length, language)}
          helper={t('issueCenter.recentFixesDescription')}
          icon={Sparkles}
          tone="emerald"
        />
      </div>

      <div className="no-print overflow-x-auto">
        <div className="inline-flex min-w-full gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:min-w-0">
          {issueTabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={cx(
                  'flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-bold transition sm:flex-none',
                  selected
                    ? 'border border-indigo-200 bg-indigo-50 text-indigo-800 shadow-sm ring-2 ring-indigo-100'
                    : 'border border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800',
                )}
                aria-pressed={selected}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} />
                {tab.label}
                <span className={cx(
                  'rounded-full px-2 py-0.5 text-xs font-black',
                  selected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600',
                )}>
                  {formatNumber(tab.count, language)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'alerts' ? (
      <div className="surface overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="section-title">{t('issueCenter.smartAlertsTitle')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('issueCenter.smartAlertsDescription')}</p>
        </div>
        {smartAlertsError ? <div className="p-5"><Alert type="error">{smartAlertsError}</Alert></div> : null}
        <div className="grid gap-4 p-5 lg:grid-cols-3">
          <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-950">{t('issueCenter.cashSessionAlert')}</h3>
              <Badge tone={cashSessionOpen ? 'amber' : 'emerald'}>{cashSessionOpen ? t('common.open') : t('common.closed')}</Badge>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {smartAlertsLoading ? (
                <div className="h-20 animate-pulse rounded-2xl bg-slate-200" />
              ) : cashSessionOpen ? (
                <>
                  <p className="font-semibold text-slate-600">{t('issueCenter.cashSessionOpenMessage')}</p>
                  <p className="font-bold text-slate-950">{t('issueCenter.cashSessionExpected')}: {formatNumber(Number(currentCashSession?.session?.expectedCash || 0), language)}</p>
                  <p className={cashSessionVariance === 0 ? 'font-bold text-emerald-700' : 'font-bold text-rose-700'}>
                    {t('issueCenter.cashSessionVariance')}: {formatNumber(cashSessionVariance, language)}
                  </p>
                </>
              ) : (
                <EmptyState title={t('issueCenter.cashSessionNone')} description="" icon={RotateCcw} />
              )}
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-950">{t('issueCenter.duplicateInvoiceAlert')}</h3>
              <Badge tone={duplicateInvoiceGroups.length ? 'rose' : 'emerald'}>{formatNumber(duplicateInvoiceGroups.length, language)}</Badge>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {smartAlertsLoading ? (
                <div className="h-20 animate-pulse rounded-2xl bg-slate-200" />
              ) : duplicateInvoiceGroups.length ? (
                duplicateInvoiceGroups.slice(0, 3).map((group, index) => (
                  <div key={`${group[0]?.invoiceNumber || 'group'}-${index}`} className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                    <p className="font-semibold text-slate-950">{t('issueCenter.possibleDuplicate')}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {group.map((invoice) => invoice.invoiceNumber).join(', ')}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState title={t('issueCenter.noDuplicateInvoices')} description="" icon={ClipboardList} />
              )}
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-950">{t('issueCenter.settlementMismatchAlert')}</h3>
              <Badge tone={settlementMismatchRows.length ? 'rose' : 'emerald'}>{formatNumber(settlementMismatchRows.length, language)}</Badge>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {smartAlertsLoading ? (
                <div className="h-20 animate-pulse rounded-2xl bg-slate-200" />
              ) : settlementMismatchRows.length ? (
                settlementMismatchRows.slice(0, 3).map((row) => (
                  <button
                    key={row.dsrId}
                    type="button"
                    className="w-full rounded-2xl bg-white p-3 text-left ring-1 ring-slate-200"
                    onClick={() => navigate('/settlements')}
                  >
                    <p className="font-semibold text-slate-950">{row.dsrName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {t('issueCenter.mismatchDetected')}: {formatNumber(Number(row.dueAmount || 0), language)}
                    </p>
                  </button>
                ))
              ) : (
                <EmptyState title={t('issueCenter.noSettlementMismatch')} description="" icon={AlertTriangle} />
              )}
            </div>
          </div>
        </div>
      </div>
      ) : null}

      {activeTab !== 'alerts' ? (
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          {activeTab === 'critical' ? (
          <div className="surface overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="section-title">{t('issueCenter.criticalTitle')}</h2>
                  <p className="mt-1 text-sm text-slate-500">{t('issueCenter.criticalDescription')}</p>
                </div>
                <button type="button" className="btn-secondary h-9 px-3" onClick={() => navigate('/products')}>
                  <ExternalLink size={16} />
                  {t('issueCenter.openProducts')}
                </button>
              </div>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-slate-950">{t('issueCenter.lowStock')}</h3>
                  <Badge tone="amber">{formatNumber(lowStockProducts.length, language)}</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {lowStockProducts.length ? lowStockProducts.map((product) => (
                    <div key={product.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">{product.name}</p>
                          <p className="text-xs text-slate-500">{product.category || t('common.archived')}</p>
                        </div>
                        <Badge tone={product.stockPieces === 0 ? 'rose' : 'amber'}>{formatNumber(product.stockPieces, language)} {t('common.pcs')}</Badge>
                      </div>
                    </div>
                  )) : (
                    <EmptyState title={t('issueCenter.noLowStock')} description="" icon={Box} />
                  )}
                </div>
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-slate-950">{t('issueCenter.pendingDsrs')}</h3>
                  <Badge tone="blue">{formatNumber(pendingDsrs.length, language)}</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {pendingDsrs.length ? pendingDsrs.map((row) => (
                    <div key={row.dsrId} className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">{row.dsrName}</p>
                          <p className="text-xs text-slate-500">{row.area}</p>
                        </div>
                        <button type="button" className="btn-secondary h-8 px-3 text-xs" onClick={() => navigate('/morning-issue')}>
                          {t('issueCenter.openMorningIssue')}
                        </button>
                      </div>
                    </div>
                  )) : (
                    <EmptyState title={t('issueCenter.noPendingDsrs')} description="" icon={Truck} />
                  )}
                </div>
              </div>
            </div>
          </div>
          ) : null}

          {activeTab === 'fixes' ? (
          <div className="surface overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="section-title">{t('issueCenter.recentFixes')}</h2>
                  <p className="mt-1 text-sm text-slate-500">{t('issueCenter.recentFixesDescription')}</p>
                </div>
                {canOpenActivityLogs ? (
                  <button type="button" className="btn-secondary h-9 px-3" onClick={() => navigate('/activity-logs')}>
                    <ExternalLink size={16} />
                    {t('issueCenter.openActivityLogs')}
                  </button>
                ) : null}
              </div>
            </div>

            {logsVm.loading ? (
              <div className="p-5">
                <TableSkeleton rows={6} columns={4} />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentFixes.length ? recentFixes.map((log) => {
                  const route = getIssueRoute(log);
                  const isActive = selectedLog?.id === log.id;

                  return (
                    <button
                      key={log.id}
                      type="button"
                      className={`w-full px-5 py-4 text-left transition hover:bg-slate-50 ${isActive ? 'bg-slate-50' : ''}`}
                      onClick={() => setSelectedLog(log)}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Badge tone={actionTone(log.actionType)}>{log.actionType}</Badge>
                          <span className="text-sm font-semibold text-slate-950">{log.entityType || '-'}</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">{formatDateTime(log.createdAt, language)}</span>
                      </div>
                      <p className="mt-2 max-h-10 overflow-hidden text-sm text-slate-600">{log.description || '-'}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">{log.userName || '-'}</span>
                        <span className="text-xs text-slate-300">|</span>
                        <span className="text-xs font-semibold text-slate-500">{t(route.labelKey)}</span>
                      </div>
                    </button>
                  );
                }) : (
                  <div className="p-5">
                    <EmptyState title={t('issueCenter.noRecentFixes')} description="" icon={Activity} />
                  </div>
                )}
              </div>
            )}
          </div>
          ) : null}
        </div>

        <div className="space-y-6">
          {activeTab === 'critical' ? (
          <div className="surface overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">{t('issueCenter.quickActions')}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('issueCenter.quickActionsDescription')}</p>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <button type="button" className="btn-secondary justify-center" onClick={() => navigate('/products')}>
                <Box size={16} />
                {t('issueCenter.openProducts')}
              </button>
              <button type="button" className="btn-secondary justify-center" onClick={() => navigate('/morning-issue')}>
                <Truck size={16} />
                {t('issueCenter.openMorningIssue')}
              </button>
              <button type="button" className="btn-secondary justify-center" onClick={() => navigate('/settlements')}>
                <RotateCcw size={16} />
                {t('issueCenter.openSettlements')}
              </button>
              {canOpenActivityLogs ? (
                <button type="button" className="btn-secondary justify-center" onClick={() => navigate('/activity-logs')}>
                  <ClipboardList size={16} />
                  {t('issueCenter.openActivityLogs')}
                </button>
              ) : null}
            </div>
          </div>
          ) : null}

          {activeTab === 'fixes' ? (
          <div className="surface overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">{t('issueCenter.selectedTitle')}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('issueCenter.selectedDescription')}</p>
            </div>
            <div className="p-5">
              {selectedLog ? (
                <div className="space-y-4">
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Badge tone={actionTone(selectedLog.actionType)}>{selectedLog.actionType}</Badge>
                      <span className="text-xs font-semibold text-slate-500">{formatDateTime(selectedLog.createdAt, language)}</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-slate-600">{t('issueCenter.sourceRecord')}</span>
                        <span className="font-bold text-slate-950">{selectedLog.entityId || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-slate-600">{t('issueCenter.sourceType')}</span>
                        <span className="font-bold text-slate-950">{selectedLog.entityType || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-slate-600">{t('issueCenter.sourceAction')}</span>
                        <span className="font-bold text-slate-950">{selectedLog.actionType || '-'}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" className="btn-primary h-9 px-3" onClick={() => openIssueRoute(selectedLog)}>
                        <ExternalLink size={16} />
                        {t('common.view')}
                      </button>
                      {canOpenActivityLogs ? (
                        <button type="button" className="btn-secondary h-9 px-3" onClick={() => navigate('/activity-logs')}>
                          {t('issueCenter.inspect')}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <AuditHistory entityType={selectedLog.entityType} entityId={selectedLog.entityId} />
                </div>
              ) : (
                <EmptyState title={t('issueCenter.selectedDescription')} description="" icon={Search} />
              )}
            </div>
          </div>
          ) : null}
        </div>
      </div>
      ) : null}
    </div>
  );
}
