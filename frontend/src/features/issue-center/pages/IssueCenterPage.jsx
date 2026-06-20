import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Activity, Box, ClipboardList, ExternalLink, Search, Truck, RotateCcw, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuditHistory from '../../../components/AuditHistory.jsx';
import { Alert, Badge, EmptyState, SectionHeader, StatCard, StatCardSkeleton, TableSkeleton } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatDateTime, formatNumber } from '../../../utils/calculations.js';
import { actionTone } from '../../../models/inventoryViewData.js';
import { useDashboardViewModel } from '../../dashboard/viewmodels/useDashboardViewModel.js';
import { useActivityLogsViewModel } from '../../activity-logs/viewmodels/useActivityLogsViewModel.js';

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

function IssueCard({ title, value, helper, icon: Icon, tone }) {
  return <StatCard title={title} value={value} helper={helper} icon={Icon} tone={tone} />;
}

export default function IssueCenterPage() {
  const { productDirectory, dsrDirectory, today, t, language } = useInventoryApp();
  const navigate = useNavigate();
  const dashboardVm = useDashboardViewModel({ products: productDirectory, dsrs: dsrDirectory, today, t, language });
  const logsVm = useActivityLogsViewModel();
  const [selectedLog, setSelectedLog] = useState(null);

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

  useEffect(() => {
    if (!selectedLog && recentFixes.length) {
      setSelectedLog(recentFixes[0]);
    }
  }, [selectedLog, recentFixes]);

  function openIssueRoute(log) {
    const { path } = getIssueRoute(log);
    navigate(path);
  }

  if (dashboardVm.loading && !dashboardVm.error) {
    return (
      <div>
        <SectionHeader eyebrow={t('nav.issueCenter')} title={t('issueCenter.title')} description={t('issueCenter.description')} />
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
      <SectionHeader eyebrow={t('nav.issueCenter')} title={t('issueCenter.title')} description={t('issueCenter.description')} />

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

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <div className="surface overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-950">{t('issueCenter.criticalTitle')}</h2>
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

          <div className="surface overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-950">{t('issueCenter.recentFixes')}</h2>
                  <p className="mt-1 text-sm text-slate-500">{t('issueCenter.recentFixesDescription')}</p>
                </div>
                <button type="button" className="btn-secondary h-9 px-3" onClick={() => navigate('/activity-logs')}>
                  <ExternalLink size={16} />
                  {t('issueCenter.openActivityLogs')}
                </button>
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
        </div>

        <div className="space-y-6">
          <div className="surface overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-slate-950">{t('issueCenter.quickActions')}</h2>
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
              <button type="button" className="btn-secondary justify-center" onClick={() => navigate('/activity-logs')}>
                <ClipboardList size={16} />
                {t('issueCenter.openActivityLogs')}
              </button>
            </div>
          </div>

          <div className="surface overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-slate-950">{t('issueCenter.selectedTitle')}</h2>
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
                      <button type="button" className="btn-secondary h-9 px-3" onClick={() => navigate('/activity-logs')}>
                        {t('issueCenter.inspect')}
                      </button>
                    </div>
                  </div>

                  <AuditHistory entityType={selectedLog.entityType} entityId={selectedLog.entityId} />
                </div>
              ) : (
                <EmptyState title={t('issueCenter.selectedDescription')} description="" icon={Search} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
