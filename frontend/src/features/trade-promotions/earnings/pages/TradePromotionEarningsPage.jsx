import { useState } from 'react';
import { Gift, HandCoins, Search } from 'lucide-react';
import { Alert, Badge, EmptyState, Pagination, SectionHeader, TableSkeleton, Select } from '../../../../components/ui.jsx';
import TableReportActions from '../../../../components/TableReportActions.jsx';
import { DatePickerField } from '../../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { formatCurrency, formatDate, formatNumber } from '../../../../utils/calculations.js';
import TradePromotionSettleModal from '../components/TradePromotionSettleModal.jsx';
import { useTradePromotionEarningsViewModel } from '../viewmodels/useTradePromotionEarningsViewModel.js';

const STATUS_VALUES = ['PENDING', 'PARTIALLY_SETTLED', 'SETTLED', 'REVERSED'];
const STATUS_TONES = { PENDING: 'amber', PARTIALLY_SETTLED: 'blue', SETTLED: 'emerald', REVERSED: 'rose' };
const TRADE_PROMOTION_EARNINGS_REPORT_ID = 'trade-promotion-earnings-report';
const TRADE_PROMOTION_EARNINGS_REPORT_SHORTCUTS = {
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  csv: { alt: true, key: 'c', label: 'Alt+C' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

export default function TradePromotionEarningsPage() {
  const { createTradePromotionSettlement, t, can, supplierDirectory, productDirectory } = useInventoryApp();
  const vm = useTradePromotionEarningsViewModel();
  const [settleModal, setSettleModal] = useState(null);
  const canSettle = can('manage_trade_promotion_settlements');

  return (
    <div>
      <SectionHeader
        eyebrow={t('tradePromotions.earnings.eyebrow')}
        title={t('tradePromotions.earnings.title')}
        description={t('tradePromotions.earnings.description')}
      />

      <div id={TRADE_PROMOTION_EARNINGS_REPORT_ID} className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t('tradePromotions.earnings.eyebrow')}</p>
            <div className="flex flex-wrap items-center justify-end gap-2 text-sm font-bold">
              <span className="muted-chip">{formatNumber(vm.total)} {t('tradePromotions.earnings.count')}</span>
              <TableReportActions targetId={TRADE_PROMOTION_EARNINGS_REPORT_ID} title={t('tradePromotions.earnings.title')} fileName="trade-promotion-earnings" entityType="trade_promotion_earnings" t={t} shortcuts={TRADE_PROMOTION_EARNINGS_REPORT_SHORTCUTS} />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="relative lg:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className="input pl-10" value={vm.search} onChange={(event) => vm.setSearch(event.target.value)} placeholder={t('tradePromotions.earnings.searchPlaceholder')} />
            </div>
            <Select className="input" value={vm.status} onChange={(event) => vm.setStatus(event.target.value)}>
              <option value="">{t('tradePromotions.earnings.allStatuses')}</option>
              {STATUS_VALUES.map((value) => (
                <option key={value} value={value}>{t(`tradePromotions.earnings.statuses.${value}`)}</option>
              ))}
            </Select>
            <Select className="input" value={vm.supplierId} onChange={(event) => vm.setSupplierId(event.target.value)}>
              <option value="">{t('tradePromotions.rules.allSuppliers')}</option>
              {supplierDirectory.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </Select>
            <Select className="input" value={vm.productId} onChange={(event) => vm.setProductId(event.target.value)}>
              <option value="">{t('productSerials.allProducts')}</option>
              {productDirectory.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} placeholder={t('purchaseReceive.dateFrom')} />
              <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} placeholder={t('purchaseReceive.dateTo')} min={vm.dateFrom} />
            </div>
          </div>
        </div>

        {vm.loading ? (
          <div className="p-5">
            <TableSkeleton columns={8} showHeader={false} />
          </div>
        ) : vm.error ? (
          <div className="p-5">
            <Alert type="error">{vm.error}</Alert>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">{t('purchaseReceive.title')}</th>
                  <th className="px-4 py-3">{t('tradePromotions.rules.supplier')}</th>
                  <th className="px-4 py-3">{t('products.product')}</th>
                  <th className="px-4 py-3">{t('tradePromotions.rules.title')}</th>
                  <th className="px-4 py-3">{t('tradePromotions.earnings.earned')}</th>
                  <th className="px-4 py-3">{t('tradePromotions.earnings.remaining')}</th>
                  <th className="px-4 py-3">{t('tradePromotions.earnings.statusLabel')}</th>
                  <th className="px-4 py-3 text-right no-print">{t('common.actions')}</th>
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
                    <td className="table-cell">{earning.ruleName || '-'}</td>
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
                    <td className="table-cell no-print">
                      <div className="row-actions flex justify-end gap-2">
                        {canSettle && (earning.status === 'PENDING' || earning.status === 'PARTIALLY_SETTLED') ? (
                          <button type="button" className="icon-btn" title={t('tradePromotions.earnings.settle.title')} onClick={() => setSettleModal({ earning })}>
                            <HandCoins size={16} />
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!vm.loading && !vm.error && !vm.items.length ? (
          <div className="p-5">
            <EmptyState title={t('tradePromotions.earnings.emptyTitle')} description={t('tradePromotions.earnings.emptyDescription')} icon={Gift} />
          </div>
        ) : null}
        {!vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {settleModal ? (
        <TradePromotionSettleModal
          earning={settleModal.earning}
          onClose={() => setSettleModal(null)}
          onSettle={async (payload) => {
            const result = await createTradePromotionSettlement(payload);
            if (result.ok) {
              setSettleModal(null);
              vm.reload();
            }
            return result;
          }}
        />
      ) : null}
    </div>
  );
}
