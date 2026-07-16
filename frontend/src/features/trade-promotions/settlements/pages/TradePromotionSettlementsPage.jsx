import { CircleDollarSign, Trash2 } from 'lucide-react';
import { Alert, Badge, EmptyState, Pagination, SectionHeader, TableSkeleton, Select } from '../../../../components/ui.jsx';
import TableReportActions from '../../../../components/TableReportActions.jsx';
import { DatePickerField } from '../../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { formatCurrency, formatDate, formatNumber } from '../../../../utils/calculations.js';
import { useTradePromotionSettlementsViewModel } from '../viewmodels/useTradePromotionSettlementsViewModel.js';

const METHODS = ['CASH', 'STOCK', 'CREDIT_NOTE'];
const METHOD_TONES = { CASH: 'emerald', STOCK: 'blue', CREDIT_NOTE: 'purple' };
const TRADE_PROMOTION_SETTLEMENTS_REPORT_ID = 'trade-promotion-settlements-report';
const TRADE_PROMOTION_SETTLEMENTS_REPORT_SHORTCUTS = {
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  csv: { alt: true, key: 'c', label: 'Alt+C' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

export default function TradePromotionSettlementsPage() {
  const { deleteTradePromotionSettlement, t, can } = useInventoryApp();
  const vm = useTradePromotionSettlementsViewModel();
  const canManage = can('manage_trade_promotion_settlements');

  return (
    <div>
      <SectionHeader
        eyebrow={t('tradePromotions.settlements.eyebrow')}
        title={t('tradePromotions.settlements.title')}
        description={t('tradePromotions.settlements.description')}
      />

      <div id={TRADE_PROMOTION_SETTLEMENTS_REPORT_ID} className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t('tradePromotions.settlements.eyebrow')}</p>
            <div className="flex flex-wrap items-center justify-end gap-2 text-sm font-bold">
              <span className="muted-chip">{formatNumber(vm.total)} {t('tradePromotions.settlements.count')}</span>
              <TableReportActions targetId={TRADE_PROMOTION_SETTLEMENTS_REPORT_ID} title={t('tradePromotions.settlements.title')} fileName="trade-promotion-settlements" entityType="trade_promotion_settlements" t={t} shortcuts={TRADE_PROMOTION_SETTLEMENTS_REPORT_SHORTCUTS} />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Select className="input" value={vm.method} onChange={(event) => vm.setMethod(event.target.value)}>
              <option value="">{t('tradePromotions.settlements.allMethods')}</option>
              {METHODS.map((value) => (
                <option key={value} value={value}>{t(`tradePromotions.settlements.methods.${value}`)}</option>
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
            <TableSkeleton columns={7} showHeader={false} />
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
                  <th className="px-4 py-3">{t('tradePromotions.settlements.settlementDate')}</th>
                  <th className="px-4 py-3">{t('tradePromotions.rules.supplier')}</th>
                  <th className="px-4 py-3">{t('products.product')}</th>
                  <th className="px-4 py-3">{t('tradePromotions.settlements.method')}</th>
                  <th className="px-4 py-3">{t('tradePromotions.settlements.value')}</th>
                  <th className="px-4 py-3">{t('tradePromotions.settlements.note')}</th>
                  <th className="px-4 py-3 text-right no-print">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vm.items.map((settlement) => (
                  <tr key={settlement.id} className="hover:bg-slate-50">
                    <td className="table-cell">{formatDate(settlement.settlementDate)}</td>
                    <td className="table-cell">{settlement.supplierName || '-'}</td>
                    <td className="table-cell">{settlement.productName || t('tradePromotions.rules.targetTypes.ALL')}</td>
                    <td className="table-cell">
                      <Badge tone={METHOD_TONES[settlement.method] || 'slate'}>{t(`tradePromotions.settlements.methods.${settlement.method}`)}</Badge>
                    </td>
                    <td className="table-cell font-semibold text-slate-950">
                      {settlement.method === 'STOCK'
                        ? `${formatNumber(settlement.quantityPieces)} ${t('tradePromotions.rules.units.PIECE')}`
                        : formatCurrency(settlement.amount)}
                    </td>
                    <td className="table-cell text-sm text-slate-600">{settlement.note || '-'}</td>
                    <td className="table-cell no-print">
                      <div className="row-actions flex justify-end gap-2">
                        {canManage ? (
                          <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('tradePromotions.settlements.void')} onClick={async () => { const result = await deleteTradePromotionSettlement(settlement); if (result?.ok) vm.reload(); }}>
                            <Trash2 size={16} />
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
            <EmptyState title={t('tradePromotions.settlements.emptyTitle')} description={t('tradePromotions.settlements.emptyDescription')} icon={CircleDollarSign} />
          </div>
        ) : null}
        {!vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
