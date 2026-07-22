import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { Alert, Badge, EmptyState, MobileCardList, MobileListCard, Pagination, SectionHeader, cx } from '../../../components/ui.jsx';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { formatDate, formatNumber } from '../../../utils/calculations.js';
import { useExpiryAlertsViewModel } from '../viewmodels/useExpiryAlertsViewModel.js';
import { AlertTriangle } from 'lucide-react';

const EXPIRY_ALERTS_TABLE_ID = 'expiry-alerts-table';

function daysUntilExpiry(expiryDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${expiryDate}T00:00:00`);
  return Math.round((target - today) / 86400000);
}

export default function ExpiryAlertsPage() {
  const { t, language } = useInventoryApp();
  const vm = useExpiryAlertsViewModel();

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t('pharmacy.expiryAlerts')}
        description={t('pharmacy.expiryAlertsDescription')}
        compact
        action={<span className="text-sm font-semibold text-slate-500">{vm.total} {t('common.results')}</span>}
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="label mb-0">{t('pharmacy.withinDays')}</span>
        {vm.windowOptions.map((days) => {
          const selected = vm.withinDays === days;
          return (
            <button
              key={days}
              type="button"
              className={cx(
                'rounded-full border px-3 py-1.5 text-xs font-bold transition',
                selected ? 'border-indigo-300 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-100' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700',
              )}
              aria-pressed={selected}
              onClick={() => vm.changeWindow(days)}
            >
              {days} {t('pharmacy.days')}
            </button>
          );
        })}
      </div>

      {vm.error && <Alert type="error">{vm.error}</Alert>}

      <div id={EXPIRY_ALERTS_TABLE_ID} className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-end gap-3 border-b border-slate-100 px-5 py-3 no-print">
          <TableReportActions targetId={EXPIRY_ALERTS_TABLE_ID} title={t('pharmacy.expiryAlerts')} fileName="expiry-alerts" entityType="expiry_alerts" t={t} />
        </div>

        {vm.loading ? (
          <p className="px-4 py-8 text-center text-slate-500">{t('common.loading')}</p>
        ) : vm.rows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title={t('pharmacy.expiryAlertsEmptyTitle')}
              description={t('pharmacy.expiryAlertsEmptyDescription')}
              icon={AlertTriangle}
            />
          </div>
        ) : (
          <>
            <MobileCardList>
              {vm.rows.map((row) => {
                const expired = daysUntilExpiry(row.expiryDate) < 0;
                return (
                  <MobileListCard
                    key={row.id}
                    title={row.productName}
                    badge={<Badge tone={expired ? 'rose' : 'amber'}>{expired ? t('pharmacy.expired') : t('pharmacy.expiringSoon')}</Badge>}
                    subtitle={row.batchNumber ? `${t('pharmacy.batchNumber')}: ${row.batchNumber}` : null}
                    value={formatDate(row.expiryDate, language)}
                    valueSub={`${t('pharmacy.quantityRemaining')}: ${formatNumber(row.quantityRemaining, language)}`}
                  />
                );
              })}
            </MobileCardList>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">{t('products.product')}</th>
                    <th className="px-4 py-3">{t('pharmacy.batchNumber')}</th>
                    <th className="px-4 py-3">{t('pharmacy.lotNumber')}</th>
                    <th className="px-4 py-3">{t('pharmacy.expiryDate')}</th>
                    <th className="px-4 py-3 text-right">{t('pharmacy.quantityRemaining')}</th>
                    <th className="px-4 py-3">{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vm.rows.map((row) => {
                    const expired = daysUntilExpiry(row.expiryDate) < 0;
                    return (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="table-cell font-medium text-slate-900">{row.productName}</td>
                        <td className="table-cell">
                          {row.batchNumber
                            ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800">{row.batchNumber}</span>
                            : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="table-cell text-slate-600">{row.lotNumber || '—'}</td>
                        <td className="table-cell">
                          <span className={cx('text-xs font-semibold', expired ? 'text-rose-600' : 'text-amber-600')}>
                            {formatDate(row.expiryDate, language)}
                          </span>
                        </td>
                        <td className="table-cell text-right font-semibold text-slate-800">{formatNumber(row.quantityRemaining, language)}</td>
                        <td className="table-cell">
                          <Badge tone={expired ? 'rose' : 'amber'}>{expired ? t('pharmacy.expired') : t('pharmacy.expiringSoon')}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {vm.totalPages > 1 && (
        <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
      )}
    </div>
  );
}
