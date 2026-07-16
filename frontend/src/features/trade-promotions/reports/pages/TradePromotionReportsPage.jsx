import { BarChart3 } from 'lucide-react';
import { Alert, Badge, EmptyState, Pagination, SectionHeader, TableSkeleton, Select } from '../../../../components/ui.jsx';
import TableReportActions from '../../../../components/TableReportActions.jsx';
import { DatePickerField } from '../../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { formatCurrency, formatDate, formatNumber } from '../../../../utils/calculations.js';
import { useTradePromotionReportsViewModel } from '../viewmodels/useTradePromotionReportsViewModel.js';

const TABS = ['pending', 'settled', 'supplier', 'product', 'dateWise'];
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

  return (
    <div>
      <SectionHeader
        eyebrow={t('tradePromotions.reports.eyebrow')}
        title={t('tradePromotions.reports.title')}
        description={t('tradePromotions.reports.description')}
      />

      <div id={TRADE_PROMOTION_REPORTS_ID} className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {TABS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${vm.tab === value ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  onClick={() => vm.setTab(value)}
                >
                  {t(`tradePromotions.reports.tabs.${value}`)}
                </button>
              ))}
            </div>
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
            <div className="grid grid-cols-2 gap-2 sm:col-span-2">
              <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} placeholder={t('purchaseReceive.dateFrom')} />
              <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} placeholder={t('purchaseReceive.dateTo')} min={vm.dateFrom} />
            </div>
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
          <div className="overflow-x-auto">
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
