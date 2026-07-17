import { useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { Alert, Badge, EmptyState, MobileCardList, MobileListCard, Pagination, SectionHeader, TableSkeleton, Select, cx } from '../../../../components/ui.jsx';
import TableReportActions from '../../../../components/TableReportActions.jsx';
import { DateRangePickerField } from '../../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { formatCurrency, formatDate, formatNumber } from '../../../../utils/calculations.js';
import { useTradePromotionReportsViewModel } from '../viewmodels/useTradePromotionReportsViewModel.js';

const TABS = ['pending', 'settled', 'supplier', 'product', 'dateWise'];
const TAB_SHORTCUTS = ['Alt+1', 'Alt+2', 'Alt+3', 'Alt+4', 'Alt+5'];
const STATUS_TONES = { PENDING: 'amber', PARTIALLY_SETTLED: 'blue', SETTLED: 'emerald', REVERSED: 'rose' };
const TRADE_PROMOTION_REPORTS_ID = 'trade-promotion-reports';
const TRADE_PROMOTION_REPORTS_SHORTCUTS = {
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  csv: { alt: true, key: 'c', label: 'Alt+C' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

export default function TradePromotionReportsPage() {
  const { t, supplierDirectory, productDirectory } = useInventoryApp();
  const vm = useTradePromotionReportsViewModel();
  const isSummaryTab = vm.tab === 'supplier' || vm.tab === 'product' || vm.tab === 'dateWise';

  useEffect(() => {
    function handleKeyDown(event) {
      const isShortcut = event.altKey && !event.ctrlKey && !event.metaKey;
      if (!isShortcut) return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < TABS.length) {
        event.preventDefault();
        vm.setTab(TABS[index]);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [vm.setTab]);

  return (
    <div>
      <SectionHeader title={t('tradePromotions.reports.title')} compact />

      <div className="no-print mb-4 overflow-x-auto">
        <div className="inline-flex min-w-full gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:min-w-0">
          {TABS.map((value, index) => {
            const selected = vm.tab === value;
            return (
              <button
                key={value}
                type="button"
                className={cx(
                  'flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-bold transition sm:flex-none',
                  selected ? 'border border-indigo-200 bg-indigo-50 text-indigo-800 shadow-sm ring-2 ring-indigo-100' : 'border border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800',
                )}
                aria-pressed={selected}
                onClick={() => vm.setTab(value)}
              >
                {t(`tradePromotions.reports.tabs.${value}`)}
                <kbd className={cx('rounded border px-1.5 py-0.5 text-[10px] font-black', selected ? 'border-indigo-200 bg-white text-indigo-700' : 'border-slate-200 bg-white text-slate-400')}>{TAB_SHORTCUTS[index]}</kbd>
              </button>
            );
          })}
        </div>
      </div>

      <div id={TRADE_PROMOTION_REPORTS_ID} className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <TableReportActions targetId={TRADE_PROMOTION_REPORTS_ID} title={t('tradePromotions.reports.title')} fileName="trade-promotion-reports" entityType="trade_promotion_reports" t={t} shortcuts={TRADE_PROMOTION_REPORTS_SHORTCUTS} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select className="input" value={vm.supplierId} onChange={(event) => vm.setSupplierId(event.target.value)} disabled={vm.tab === 'supplier'}>
              <option value="">{t('tradePromotions.rules.allSuppliers')}</option>
              {supplierDirectory.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </Select>
            <Select className="input" value={vm.productId} onChange={(event) => vm.setProductId(event.target.value)} disabled={vm.tab === 'product'}>
              <option value="">{t('productSerials.allProducts')}</option>
              {productDirectory.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </Select>
            <DateRangePickerField
              className="sm:col-span-2"
              from={vm.dateFrom}
              to={vm.dateTo}
              onChange={(from, to) => { vm.setDateFrom(from); vm.setDateTo(to); }}
              placeholder={`${t('purchaseReceive.dateFrom')} - ${t('purchaseReceive.dateTo')}`}
            />
          </div>
        </div>

        {vm.loading ? (
          <div className="p-5">
            <TableSkeleton columns={6} showHeader={false} />
          </div>
        ) : vm.error ? (
          <div className="p-5">
            <Alert type="error">{vm.error}</Alert>
          </div>
        ) : (
          <>
          <MobileCardList>
            {isSummaryTab ? (
              vm.items.map((row, index) => (
                <MobileListCard
                  key={row.supplierId || row.productId || row.date || index}
                  title={vm.tab === 'supplier' ? (row.supplierName || t('tradePromotions.reports.unknown')) : vm.tab === 'product' ? row.productName : formatDate(row.date)}
                  subtitle={`${formatNumber(row.earningCount)} ${t('tradePromotions.reports.earningCount')}`}
                  value={formatCurrency(row.totalEarnedAmount)}
                  valueSub={formatCurrency(row.totalSettledAmount)}
                />
              ))
            ) : (
              vm.items.map((earning) => (
                <MobileListCard
                  key={earning.id}
                  title={earning.purchaseNumber || '-'}
                  badge={<Badge tone={STATUS_TONES[earning.status] || 'slate'}>{t(`tradePromotions.earnings.statuses.${earning.status}`)}</Badge>}
                  subtitle={`${earning.supplierName || '-'} · ${earning.productName || t('tradePromotions.rules.targetTypes.ALL')}`}
                  value={earning.rewardKind === 'QUANTITY'
                    ? `${formatNumber(earning.earnedQuantityPieces)} ${t('tradePromotions.rules.units.PIECE')}`
                    : formatCurrency(earning.earnedAmount)}
                  valueSub={earning.rewardKind === 'QUANTITY'
                    ? `${formatNumber(earning.remainingQuantityPieces)} ${t('tradePromotions.rules.units.PIECE')}`
                    : formatCurrency(earning.remainingAmount)}
                />
              ))
            )}
          </MobileCardList>
          <div className="hidden overflow-x-auto md:block">
            {isSummaryTab ? (
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">
                      {vm.tab === 'supplier' ? t('tradePromotions.rules.supplier') : vm.tab === 'product' ? t('products.product') : t('tradePromotions.reports.date')}
                    </th>
                    <th className="px-4 py-3">{t('tradePromotions.reports.earningCount')}</th>
                    <th className="px-4 py-3">{t('tradePromotions.reports.totalEarnedAmount')}</th>
                    <th className="px-4 py-3">{t('tradePromotions.reports.totalEarnedQuantity')}</th>
                    <th className="px-4 py-3">{t('tradePromotions.reports.totalSettledAmount')}</th>
                    <th className="px-4 py-3">{t('tradePromotions.reports.totalSettledQuantity')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vm.items.map((row, index) => (
                    <tr key={row.supplierId || row.productId || row.date || index} className="hover:bg-slate-50">
                      <td className="table-cell font-semibold text-slate-950">
                        {vm.tab === 'supplier' ? (row.supplierName || t('tradePromotions.reports.unknown')) : vm.tab === 'product' ? row.productName : formatDate(row.date)}
                      </td>
                      <td className="table-cell">{formatNumber(row.earningCount)}</td>
                      <td className="table-cell">{formatCurrency(row.totalEarnedAmount)}</td>
                      <td className="table-cell">{formatNumber(row.totalEarnedQuantity)}</td>
                      <td className="table-cell">{formatCurrency(row.totalSettledAmount)}</td>
                      <td className="table-cell">{formatNumber(row.totalSettledQuantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">{t('purchaseReceive.title')}</th>
                    <th className="px-4 py-3">{t('tradePromotions.rules.supplier')}</th>
                    <th className="px-4 py-3">{t('products.product')}</th>
                    <th className="px-4 py-3">{t('tradePromotions.earnings.earned')}</th>
                    <th className="px-4 py-3">{t('tradePromotions.earnings.remaining')}</th>
                    <th className="px-4 py-3">{t('tradePromotions.earnings.statusLabel')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vm.items.map((earning) => (
                    <tr key={earning.id} className="hover:bg-slate-50">
                      <td className="table-cell">
                        <p className="font-semibold text-slate-950">{earning.purchaseNumber || '-'}</p>
                        <p className="text-xs text-slate-500">{formatDate(earning.earnedDate)}</p>
                      </td>
                      <td className="table-cell">{earning.supplierName || '-'}</td>
                      <td className="table-cell">{earning.productName || t('tradePromotions.rules.targetTypes.ALL')}</td>
                      <td className="table-cell font-semibold text-slate-950">
                        {earning.rewardKind === 'QUANTITY'
                          ? `${formatNumber(earning.earnedQuantityPieces)} ${t('tradePromotions.rules.units.PIECE')}`
                          : formatCurrency(earning.earnedAmount)}
                      </td>
                      <td className="table-cell text-sm text-slate-600">
                        {earning.rewardKind === 'QUANTITY'
                          ? `${formatNumber(earning.remainingQuantityPieces)} ${t('tradePromotions.rules.units.PIECE')}`
                          : formatCurrency(earning.remainingAmount)}
                      </td>
                      <td className="table-cell">
                        <Badge tone={STATUS_TONES[earning.status] || 'slate'}>{t(`tradePromotions.earnings.statuses.${earning.status}`)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          </>
        )}

        {!vm.loading && !vm.error && !vm.items.length ? (
          <div className="p-5">
            <EmptyState title={t('tradePromotions.reports.emptyTitle')} description={t('tradePromotions.reports.emptyDescription')} icon={BarChart3} />
          </div>
        ) : null}
        {!vm.loading && !vm.error && vm.isPaged && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
